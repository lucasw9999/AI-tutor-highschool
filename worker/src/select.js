// What to ask next, and why.
//
// The selector is deterministic on purpose. Given the same history it makes the
// same choice — including when the bank arrives in a different order — so a
// disputed question can be replayed and explained. Every return value carries a
// `reason`, which the status view shows verbatim — the student should never
// wonder why he is being asked something, and the reason must never claim more
// than the evidence supports.
//
// Priority order, highest first:
//   1. Re-test a taught gap cold. A gap closes only on an unaided correct answer.
//   2. Fill a coverage hole. A topic with no attempts is not a topic he knows.
//   3. Shore up the weakest topic, weighted by how much the exam cares.
//   4. Spaced review of something previously missed and now due.
//   5. Anything unseen, so the bank keeps moving.
//
// Each of those branches asks for a specific topic, and each draws from that
// topic's OWN pool: its never-asked items first, then its items whose reuse
// window has passed. A topic that has been used up must not fall through to a
// lower priority just because some other topic still has unseen items.
//
// Inside a proctored sitting (`sampling: 'mock'`) that order does not apply.
// Priorities 1, 3 and 4 are all remediation — they aim the paper at what he is
// worst at — and the exam he is preparing for is aimed at nothing. A sitting is
// sampled for breadth in proportion to exam weight instead, because the composite
// it produces is the only number that can move readiness.
//
// The bank is FINITE, and that is a supply constraint, not an edge case. 218 CSA
// items at the ~50 answers a day db.js sizes itself for is four days of unique
// questions; a scored sitting needs 38 of them at once and readiness asks for six
// sittings. So this module has to answer "what do I serve when everything has been
// seen recently?", and the answer cannot be "nothing": refusing to serve turns
// into a 409 on every drill and every mock, i.e. the tutor stops working entirely
// for weeks. It serves the least-recently-seen item instead and SAYS, in the same
// `reason` the student reads, that this is a question he has already answered and
// therefore a memory check rather than fresh evidence. Two rules keep that honest:
// an item inside the window is never preferred over one outside it, and no item
// may appear twice on the SAME paper — the same question twice is not two
// questions of evidence, whatever the bank is short of.

import { isServerGraded } from './grade.js'

const DAY_MS = 86400000

/**
 * Fallback no-repeat window, in days, when the subject's config names none.
 *
 * The right value is a property of the BANK, not of this code — roughly how long
 * the bank lasts at the volume the student actually drills at (218 items at 10 a
 * day is three weeks) — so it belongs in worker/config/<subject>.json under
 * readiness.reuse_days, where it can be sized to the bank it governs. This
 * constant only covers a config that has not said. tools/build/validate.js
 * re-states it, and a test fails if the two ever disagree.
 */
export const DEFAULT_REUSE_DAYS = 56

/** Days from `then` to `now`, positive when `then` is in the past. */
function ageDays(then, now) {
  return (new Date(now).getTime() - new Date(then).getTime()) / DAY_MS
}

/** Expanding review intervals, in days, indexed by consecutive correct answers. */
const REVIEW_INTERVALS = [1, 3, 7, 16, 35]

export function reviewInterval(streak) {
  return REVIEW_INTERVALS[Math.min(streak, REVIEW_INTERVALS.length - 1)]
}

/**
 * Per-topic history: how many attempts, how many right, when it was last seen,
 * and the current run of consecutive correct answers.
 */
export function topicStats(attempts) {
  const stats = new Map()
  // Only graded attempts carry a percentage or a streak; an ungraded one has no
  // verdict to record.
  const ordered = [...attempts].filter(isServerGraded).sort((a, b) => new Date(a.ts) - new Date(b.ts))
  for (const a of ordered) {
    if (a.topic == null) continue
    if (!stats.has(a.topic)) stats.set(a.topic, { n: 0, correct: 0, streak: 0, last_ts: null, misses: 0 })
    const s = stats.get(a.topic)
    s.n++
    if (a.correct) {
      s.correct++
      s.streak++
    } else {
      s.streak = 0
      s.misses++
    }
    s.last_ts = a.ts
  }
  for (const s of stats.values()) s.pct = (s.correct / s.n) * 100
  return stats
}

/** Mean of a topic's [low, high] exam weight range, as a tie-breaker. */
function examWeight(topic, topicMeta) {
  const meta = topicMeta.get(topic)
  if (!meta) return 0
  const lo = meta.exam_weight_low ?? 0
  const hi = meta.exam_weight_high ?? lo
  return (lo + hi) / 2
}

/**
 * Choose the next item.
 *
 * @param {'mock'|null} sampling  'mock' samples a proctored sitting instead of
 *        teaching: the remediation priorities (1, 3, 4) are skipped and breadth
 *        is drawn in proportion to exam weight. `mockId` says which sitting, so
 *        the balance is measured over THIS paper rather than his whole history.
 * @param {number|null} reuseDays  Overrides readiness.reuse_days, for tests.
 * @returns {{item: object, reason: string, priority: string, conditions: string,
 *          repeat?: true}|null}
 *          `repeat: true` marks a question he has answered inside the no-repeat
 *          window, served because the bank had nothing fresher; the `reason` says
 *          so in words too. null only when there is no item left that this paper
 *          has not already asked — i.e. the bank is smaller than one sitting,
 *          which tools/build/validate.js fails the build over.
 */
export function pickNext({
  items, attempts = [], gaps = [], topicMeta = new Map(), config, now, reuseDays = null,
  sampling = null, mockId = null,
}) {
  const inMock = sampling === 'mock'
  const reuseWindow = reuseDays ?? config?.readiness?.reuse_days ?? DEFAULT_REUSE_DAYS
  const stats = topicStats(attempts)
  // Coverage asks "has he tried this?", which an ungraded attempt still answers.
  const attempted = new Set(attempts.map((a) => a.topic))

  // An item answered recently is not evidence — he may just remember it.
  const lastSeen = new Map()
  for (const a of attempts) {
    const prev = lastSeen.get(a.item_id)
    if (!prev || new Date(a.ts) > new Date(prev)) lastSeen.set(a.item_id, a.ts)
  }
  /** When this item was last answered, as a number; -Infinity if never. */
  const seenAt = (it) => {
    const seen = lastSeen.get(it.id)
    return seen ? new Date(seen).getTime() : -Infinity
  }
  /**
   * Most-forgotten first, then exam weight, then id.
   *
   * Never-asked items sort ahead of every answered one, and among items that are
   * equally unseen this reduces to the exam-weight-then-id order the selector has
   * always used. It only starts to bite on a pool of reuse candidates, where the
   * question he is least likely to still remember is the only one that tells
   * anybody anything.
   */
  const byMostForgotten = (a, b) => seenAt(a) - seenAt(b)
    || examWeight(b.topic, topicMeta) - examWeight(a.topic, topicMeta)
    || a.id.localeCompare(b.id)

  // A question already on THIS paper is not servable at any price, however short
  // the bank is: asking it twice does not make it two questions of evidence, and
  // the composite this sitting produces is the only number that moves readiness.
  const thisPaper = new Set(
    inMock && mockId != null
      ? attempts.filter((a) => Number(a.mock_id) === Number(mockId)).map((a) => a.item_id)
      : [],
  )
  const servableAtAll = items.filter((it) => !thisPaper.has(it.id))
  const outsideWindow = servableAtAll.filter((it) => {
    const seen = lastSeen.get(it.id)
    return !seen || ageDays(seen, now) >= reuseWindow
  })

  // The bank is worked through: nothing is outside the window. Serving a repeat
  // and labelling it beats serving nothing — a student who has answered
  // everything recently still needs practice, and a 409 gives him none. Note this
  // is decided GLOBALLY, never per topic: while any item anywhere is outside the
  // window, a within-window item stays unservable, so a repeat can never displace
  // a fresh question.
  const repeating = !outsideWindow.length
  const servable = repeating ? servableAtAll : outsideWindow
  if (!servable.length) return null

  const unseen = servable.filter((it) => !lastSeen.has(it.id))
  const testedTopics = new Set(
    [...topicMeta.entries()].filter(([, m]) => m.tested_on_exam !== 0).map(([id]) => id),
  )
  const isTested = (topic) => testedTopics.size === 0 || testedTopics.has(topic)
  const onExam = (it) => isTested(it.topic)

  /**
   * A choice, with the truth about reuse attached.
   *
   * Every return goes through here, so no branch can hand back a remembered
   * question dressed up as fresh evidence. The sentence lands in the `reason` the
   * status view and /next both show verbatim.
   */
  const serve = (choice) => {
    if (!repeating) return choice
    const seen = lastSeen.get(choice.item.id)
    const days = seen ? ageDays(seen, now) : null
    const when = days == null ? '' : ` — you answered it ${days < 1 ? 'today' : `${days.toFixed(0)} days ago`}`
    return {
      ...choice,
      repeat: true,
      reason: `${choice.reason} You have answered this exact question before${when}, and the bank has nothing left ` +
        `that you have not already seen, so getting it right here is a memory check rather than fresh evidence.`,
    }
  }

  /**
   * The servable items for ONE topic: never-asked ones when it still has any,
   * otherwise ones whose reuse window has passed — or, once the whole bank is
   * inside the window, its most-forgotten ones.
   *
   * Keyed on the topic itself, never on whether some OTHER topic still has
   * unseen items — a topic whose whole pool has been consumed has to stay
   * reachable, or the branch asking for it is silently skipped and the student
   * is sent somewhere he did not need to go. Sorted so that replaying the same
   * history picks the same item however the bank was ordered.
   */
  const poolFor = (topic) => {
    const own = unseen.filter((it) => it.topic === topic)
    if (own.length) return own.sort((a, b) => a.id.localeCompare(b.id))
    return servable.filter((it) => it.topic === topic).sort(byMostForgotten)
  }

  /**
   * Everything servable when no particular topic is being asked for: on-exam
   * never-asked items first, then on-exam reusable ones, and only then class-only
   * material. Non-empty whenever `servable` is, which is checked above.
   */
  const breadthPool = () => [unseen.filter(onExam), servable.filter(onExam), unseen, servable].find((p) => p.length)

  // 1. A gap that has been taught but never re-tested cold. Oldest first, so a
  //    long-open gap is not starved by a newer one. Deliberately not filtered by
  //    exam weight: a gap opens on any topic he misses twice, and it only closes
  //    on a cold correct answer on that same topic, so skipping class-only
  //    topics here would leave those gaps open forever.
  //
  //    Skipped inside a sitting: the real exam does not re-test his gaps.
  const openedAt = (g) => {
    const t = new Date(g.opened_at).getTime()
    return Number.isNaN(t) ? Infinity : t
  }
  const toRetest = inMock ? [] : gaps
    .filter((g) => g.taught_at && !g.cleared_at)
    .sort((a, b) => openedAt(a) - openedAt(b) || a.topic.localeCompare(b.topic))
  for (const g of toRetest) {
    const pool = poolFor(g.topic)
    if (pool.length) {
      return serve({
        item: pool[0],
        priority: 'gap_retest',
        conditions: 'cold',
        reason: `Re-testing ${g.topic} cold, with no hints, to confirm the explanation actually landed. This gap stays open until you get one right unaided.`,
      })
    }
  }

  // 2. A topic he has never attempted.
  const untouched = unseen.filter((it) => onExam(it) && !attempted.has(it.topic))
  if (untouched.length) {
    untouched.sort((a, b) => examWeight(b.topic, topicMeta) - examWeight(a.topic, topicMeta) || a.id.localeCompare(b.id))
    const pick = untouched[0]
    return serve({
      item: pick,
      priority: 'coverage',
      conditions: 'cold',
      reason: `First question on ${pick.topic}. Until you have attempted it, it does not count as covered.`,
    })
  }

  // Everything below this line is remediation, and a proctored sitting must not
  // remediate. Priorities 3 and 4 aim the paper at his weakest topics and his
  // overdue reviews; the real AP exam is aimed at neither, so a sitting that is
  // aimed there scores him lower than the exam would — while /mock/start tells him
  // "a mock only counts if it is run like the real thing." The composite is the
  // only number that moves readiness, which is what makes this the one place where
  // aiming at a weakness does harm. Coverage (2, above) stays: a topic he has
  // never attempted is part of the paper, not a weakness being chased.
  if (inMock) {
    // How much of THIS sitting each topic has taken so far, keyed on the mock id
    // so a term of ordinary drilling cannot distort the paper.
    const answered = new Map()
    let asked = 0
    for (const a of attempts) {
      if (a.mock_id == null || mockId == null || Number(a.mock_id) !== Number(mockId)) continue
      answered.set(a.topic, (answered.get(a.topic) ?? 0) + 1)
      asked++
    }

    const pool = breadthPool()
    const topics = [...new Set(pool.map((it) => it.topic))]
    const weight = new Map(topics.map((t) => [t, examWeight(t, topicMeta)]))
    const total = [...weight.values()].reduce((n, w) => n + w, 0)
    // The share of the paper each topic's exam weight entitles it to; an equal
    // share when the bank carries no weights at all.
    const share = (t) => (total > 0 ? weight.get(t) / total : 1 / topics.length)
    // Whichever topic is furthest below its entitlement. Deterministic, like every
    // other branch — no RNG anywhere — so a disputed sitting replays question for
    // question. The final tie-break is stringified because an item may carry a
    // NULL topic, and a bank defect must not crash the sitting.
    const [next] = topics
      .map((topic) => ({ topic, owed: share(topic) * (asked + 1) - (answered.get(topic) ?? 0) }))
      .sort((a, b) => b.owed - a.owed
        || weight.get(b.topic) - weight.get(a.topic)
        || String(a.topic).localeCompare(String(b.topic)))

    return serve({
      item: poolFor(next.topic)[0],
      priority: 'mock_breadth',
      conditions: 'proctored_mock',
      reason: `Mock question on ${next.topic}, drawn to keep this sitting spread across the paper the way the exam ` +
        `weights it. A mock aimed at your weak spots would score you lower than the real exam will.`,
    })
  }

  // 3. The weakest topic that matters most. Ranked by shortfall against the
  //    per-unit floor, scaled by exam weight, so a weak heavily-tested topic
  //    outranks a weak footnote.
  const floor = config?.readiness?.per_unit_min ?? 70
  const weak = [...stats.entries()]
    .filter(([topic, s]) => s.pct < floor && isTested(topic))
    .map(([topic, s]) => ({ topic, s, urgency: (floor - s.pct) * (1 + examWeight(topic, topicMeta)) }))
    .sort((a, b) => b.urgency - a.urgency || a.topic.localeCompare(b.topic))

  for (const w of weak) {
    const pool = poolFor(w.topic)
    if (pool.length) {
      return serve({
        item: pool[0],
        priority: 'weakest',
        conditions: 'cold',
        reason: `${w.topic} is at ${w.s.pct.toFixed(0)}%, below the ${floor}% this subject needs. Working it until it holds.`,
      })
    }
  }

  // 4. Spaced review: previously missed, correct since, and now due again.
  //    Restricted to topics the exam asks about, so a session is not spent
  //    reviewing material the readiness score deliberately ignores.
  const due = [...stats.entries()]
    .filter(([topic, s]) => isTested(topic) && s.misses > 0 && s.last_ts && ageDays(s.last_ts, now) >= reviewInterval(s.streak))
    .sort((a, b) => ageDays(b[1].last_ts, now) - ageDays(a[1].last_ts, now) || a[0].localeCompare(b[0]))

  for (const [topic, s] of due) {
    const pool = poolFor(topic)
    if (pool.length) {
      return serve({
        item: pool[0],
        priority: 'review',
        conditions: 'cold',
        reason: `Spaced review of ${topic} — you missed it before, and it has been ${ageDays(s.last_ts, now).toFixed(0)} days. Checking it stuck.`,
      })
    }
  }

  // 5. Keep moving through the bank. An on-exam question he answered long enough
  //    ago to have forgotten beats a never-asked class-only one, or the exam
  //    filter above evaporates the moment every on-exam item has been seen once.
  //    `servable` is non-empty here, checked above, so this always finds a pool.
  const pool = breadthPool()
  const pick = [...pool].sort(byMostForgotten)[0]
  // Only claim he is at every floor when that is true, and only call it fresh
  // ground when it IS fresh: branch 3 may have found a topic below its floor and
  // merely been unable to serve it, and once the whole bank is inside the window
  // there is no new ground left to offer. Both sentences reach the student verbatim.
  const stranded = weak[0]
  const ground = repeating ? `another go at ${pick.topic}` : `fresh ground on ${pick.topic}`
  return serve({
    item: pick,
    priority: 'breadth',
    conditions: 'cold',
    reason: stranded
      ? `${stranded.topic} is at ${stranded.s.pct.toFixed(0)}%, below the ${floor}% this subject needs, but it has no questions left that you have not just answered — so this is ${ground} in the meantime.`
      : `Everything is at or above its floor, so this is ${ground}.`,
  })
}
