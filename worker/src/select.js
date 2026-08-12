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
// it produces is the only number that can move readiness. Four rules make that
// claim true rather than decorative:
//   - The whole paper is composed by that one rule, coverage holes included. A
//     coverage pass that runs FIRST orders by exam weight descending and walks
//     the heavy units until the paper is full, which shuts the lightest unit out
//     of the sitting entirely.
//   - The share is computed per UNIT, not per topic. exam_weight_low/high is a
//     unit weight replicated onto every topic row in that unit, so normalizing it
//     across topics gives a unit weight x topicCount — a 60% unit with one topic
//     loses to a 40% unit with three.
//   - It is apportioned over every exam-tested question this paper has not yet
//     asked, and freshness is decided AFTER the unit is chosen. Apportioning over
//     only the questions outside the reuse window instead makes that window a
//     filter on which UNITS may appear at all, and the selector works the heavy
//     units first, so theirs go stale first: seven days of ordinary CSA drilling
//     shut the heaviest unit on the exam out of the paper completely.
//   - It draws ONLY on material the exam tests, and refuses when that runs out.
//     Padding a paper from the class-only tiers puts material readiness
//     deliberately excludes into a composite that has no unit filter.
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
// a repeat never displaces a fresh question WITHIN the pool being drawn from, and
// no item may appear twice on the SAME paper — the same question twice is not two
// questions of evidence, whatever the bank is short of.
//
// "Within the pool being drawn from" is the exact scope, and the qualifier is
// load-bearing. In ordinary practice the pool is the whole bank, so the rule is
// global: while any item anywhere is outside the window, nothing inside it is
// served. Inside a sitting the pool is the topic the exam-weighted apportionment
// landed on, so a unit whose own questions are all inside the window contributes
// labelled repeats rather than nothing at all. The alternative is a paper missing
// a unit, which is silent and scores him HIGH on the material he skipped.
//
// A degraded repeat is reported twice over: in the `reason` the student reads, and
// as `repeat: true` plus a `repeat_of` marker naming the earlier answer, which is
// the form a caller needs in order to store the distinction. See `serve()` for
// what api.js and db.js still owe that marker.

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

/**
 * Whole CALENDAR days from `then` to `now`, in UTC. 0 means the same date.
 *
 * Elapsed hours are the wrong unit for the sentence the student reads. An answer
 * given at 20:00 yesterday is 16 hours old, and "you answered it today" about it
 * is a claim he can check and find false — which is the one thing the reason
 * must never be.
 */
function calendarDaysAgo(then, now) {
  return Math.floor(new Date(now).getTime() / DAY_MS) - Math.floor(new Date(then).getTime() / DAY_MS)
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
 *        teaching: the remediation priorities (1, 3, 4) are skipped and the WHOLE
 *        paper — coverage holes included — is drawn in proportion to exam weight,
 *        at unit granularity, over every exam-tested question this paper has not
 *        yet asked. Freshness is a preference inside the chosen topic, not a filter
 *        on which units may be sampled. `mockId` says which sitting, so the balance
 *        is measured over THIS paper rather than his whole history.
 * @param {number|null} reuseDays  Overrides readiness.reuse_days, for tests.
 * @param {Set<string>|string[]|null} excludeItemIds  Item ids that must not be
 *        served, whatever the pools say. This is the caller's window on serves it
 *        has handed out but not yet seen logged: an attempt row is the only thing
 *        this module can see, so without it two /next calls inside one sitting can
 *        hand out the same item. Removed from EVERY pool, in every branch,
 *        including the degraded-repeat path. Defaults to excluding nothing.
 * @returns {{item: object, reason: string, priority: string, conditions: string,
 *          repeat?: true, repeat_of?: {item_id: string, last_answered_at: string,
 *          days_since: number}}|null}
 *          `repeat: true` marks a question he has answered inside the no-repeat
 *          window, served because the pool it was drawn from had nothing fresher;
 *          `repeat_of` says which answer made it one, and the `reason` says so in
 *          words too. null when there is no item left that this paper has not
 *          already asked — the bank being smaller than one sitting, which
 *          tools/build/validate.js fails the build over — or, inside a sitting, when
 *          the exam-tested bank is exhausted and the only thing left to serve would
 *          be off-syllabus.
 */
export function pickNext({
  items, attempts = [], gaps = [], topicMeta = new Map(), config, now, reuseDays = null,
  sampling = null, mockId = null, excludeItemIds = null,
}) {
  const inMock = sampling === 'mock'
  const reuseWindow = reuseDays ?? config?.readiness?.reuse_days ?? DEFAULT_REUSE_DAYS
  const stats = topicStats(attempts)
  // Coverage asks "has he tried this?", which an ungraded attempt still answers.
  const attempted = new Set(attempts.map((a) => a.topic))
  const excluded = excludeItemIds instanceof Set ? excludeItemIds : new Set(excludeItemIds ?? [])

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
  // An id the caller has already handed out is unservable for the same reason —
  // it is a question in flight that no attempt row has recorded yet.
  const thisPaper = new Set(
    inMock && mockId != null
      ? attempts.filter((a) => Number(a.mock_id) === Number(mockId)).map((a) => a.item_id)
      : [],
  )
  const servableAtAll = items.filter((it) => !thisPaper.has(it.id) && !excluded.has(it.id))

  const testedTopics = new Set(
    [...topicMeta.entries()].filter(([, m]) => m.tested_on_exam !== 0).map(([id]) => id),
  )
  const isTested = (topic) => testedTopics.size === 0 || testedTopics.has(topic)
  const onExam = (it) => isTested(it.topic)

  // Inside a sitting, exam-tested material is the whole world: a paper may not be
  // padded from the class-only corner of the bank, so that corner cannot count as
  // available either. Deciding the reuse window over the FULL bank would mean an
  // untouched unit 4 makes the bank look fresh while every question the sitting is
  // allowed to ask is inside the window — which read as "nothing servable" and
  // refused the second Precalc sitting at question one.
  const universe = inMock ? servableAtAll.filter(onExam) : servableAtAll
  /** Never answered, or answered long enough ago to be evidence again. */
  const isFresh = (it) => {
    const seen = lastSeen.get(it.id)
    return !seen || ageDays(seen, now) >= reuseWindow
  }
  const outsideWindow = universe.filter(isFresh)

  // The bank is worked through: nothing is outside the window. Serving a repeat
  // and labelling it beats serving nothing — a student who has answered
  // everything recently still needs practice, and a 409 gives him none.
  //
  // In ordinary practice this is decided GLOBALLY: while any item anywhere is
  // outside the window, a within-window item stays unservable, so a repeat can
  // never displace a fresh question. Inside a sitting that global rule cannot be
  // primary, because there it decides which UNITS may appear on the paper at all —
  // see the mock branch. `repeating` therefore says only whether the whole bank is
  // worked through, which is what the student-facing sentence in `serve` needs to
  // get right; whether a given serve is a repeat is a property of that ITEM.
  const repeating = !outsideWindow.length
  const servable = repeating ? universe : outsideWindow
  // Nothing left to ask. Outside a sitting that means the bank is smaller than one
  // paper. Inside one it also covers the exam-tested bank running out mid-paper,
  // which is the honest answer there: the lower class-only tiers exist so ordinary
  // practice never hits a 409, but handleMockSubmit scores every server-graded
  // answer in a sitting with no unit filter, so padding a paper from them puts
  // material readiness deliberately excludes straight into composite_pct. On
  // Precalc that was 6 of every 42 questions, on every sitting, under a reason
  // claiming the paper was weighted like the exam. A 409 he can act on beats a
  // quietly off-syllabus score.
  //
  // `universe` empty and `servable` empty are the same condition: `outsideWindow`
  // is a subset of `universe`, and `repeating` is exactly "that subset is empty".
  if (!universe.length) return null

  const unseen = servable.filter((it) => !lastSeen.has(it.id))
  /**
   * A choice, with the truth about reuse attached.
   *
   * Every return goes through here, so no branch can hand back a remembered
   * question dressed up as fresh evidence. The sentence lands in the `reason` the
   * status view and /next both show verbatim.
   *
   * The test is on the ITEM, not on whether the whole bank is worked through. In
   * ordinary practice the two coincide — nothing inside the window is servable
   * until everything is — but a sitting apportions the paper across units first
   * and prefers freshness inside the chosen topic, so it can reach for a
   * remembered question while other units still hold fresh ones. That is a real
   * trade (see the mock branch), and it is only an honest one if the question it
   * serves is labelled for what it is.
   *
   * The same fact also leaves in machine-readable form, as `repeat: true` plus a
   * `repeat_of` marker naming the earlier answer. Prose alone cannot be acted on,
   * and right now nothing acts on it: handleNext does not forward the flag,
   * recordAttempt stores no column for it, and handleMockSubmit counts a
   * remembered answer into composite_pct identically to a first-time one — so a
   * sitting made entirely of repeats can still qualify a student for the exam.
   * Closing that needs two changes outside this module:
   *   - api.js: forward `choice.repeat` / `choice.repeat_of` from handleNext onto
   *     the /log path, and exclude repeats from the scored set in
   *     handleMockSubmit (they are still attempts, and still practice — they are
   *     just not evidence about what he can do on an unseen question).
   *   - db.js: persist it, e.g. `attempts.is_repeat INTEGER NOT NULL DEFAULT 0`
   *     plus the prior answer's timestamp, so the exclusion is derivable from the
   *     stored row rather than re-derived from a reuse window that may since have
   *     been re-sized.
   */
  const serve = (choice) => {
    const seen = lastSeen.get(choice.item.id)
    if (!seen || ageDays(seen, now) >= reuseWindow) return choice
    const days = calendarDaysAgo(seen, now)
    const when = days <= 0 ? 'earlier today' : days === 1 ? 'yesterday' : `${days} days ago`
    // Only claim the whole bank is used up when it is. Inside a sitting the
    // shortage can be local to the topic the apportionment landed on, and telling
    // him the bank is empty when three other units still hold fresh questions is
    // a claim he can check and find false.
    const shortage = repeating
      ? 'the bank has nothing left that you have not already seen'
      : `every question left on ${choice.item.topic} is one you have answered recently`
    return {
      ...choice,
      repeat: true,
      repeat_of: { item_id: choice.item.id, last_answered_at: seen, days_since: ageDays(seen, now) },
      reason: `${choice.reason} You have answered this exact question before — you answered it ${when}, and ` +
        `${shortage}, so getting it right here is a memory check rather than fresh evidence.`,
    }
  }

  /**
   * The servable items for ONE topic, out of `pool`: its never-asked ones when it
   * still has any, then the ones whose reuse window has passed, and only then its
   * most-forgotten ones.
   *
   * Keyed on the topic itself, never on whether some OTHER topic still has
   * unseen items — a topic whose whole pool has been consumed has to stay
   * reachable, or the branch asking for it is silently skipped and the student
   * is sent somewhere he did not need to go. Sorted so that replaying the same
   * history picks the same item however the bank was ordered.
   *
   * `pool` defaults to `servable`, where the reuse decision has already been taken
   * globally and the second tier is therefore everything. A sitting passes
   * `universe` instead and relies on all three tiers, which is what keeps "a repeat
   * never displaces a fresh question" true of the pool actually being drawn from.
   */
  const poolFor = (topic, pool = servable) => {
    const own = pool.filter((it) => it.topic === topic)
    const never = own.filter((it) => !lastSeen.has(it.id))
    if (never.length) return never.sort((a, b) => a.id.localeCompare(b.id))
    const reusable = own.filter(isFresh)
    return (reusable.length ? reusable : own).sort(byMostForgotten)
  }

  /**
   * Everything servable when no particular topic is being asked for: on-exam
   * never-asked items first, then on-exam reusable ones, and only then class-only
   * material. Non-empty whenever `servable` is, which is checked above.
   *
   * Only ordinary practice reaches this, and the class-only tiers are the reason:
   * a drill has to hand back something rather than a 409, and any question beats
   * none. A sitting is scored, so it draws on `servable` directly, which inside a
   * mock already holds exam-tested material only.
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
  //
  //    Skipped inside a sitting, and NOT because coverage is remediation — it is
  //    not, and a sitting does still fill a coverage hole. It is skipped here
  //    because this branch orders by exam weight DESCENDING and returns as soon
  //    as it finds anything, so on a bank where most topics are untouched it
  //    composes the entire paper on its own: heaviest unit until its items run
  //    out, then the next, and the lightest unit never gets a question at all. On
  //    the real CSA bank that gave the first mock of his life 40.5% unit 4, 28.6%
  //    unit 2, 31.0% unit 1 and 0.0% unit 3 — a fifth of the exam missing from
  //    the only measurement that moves readiness. The mock branch below fills the
  //    same holes through the weight-proportional ranking instead, and labels the
  //    pick `coverage` when the topic it lands on has never been attempted.
  const coverageReason = (topic) =>
    `First question on ${topic}. Until you have attempted it, it does not count as covered.`
  const untouched = inMock ? [] : unseen.filter((it) => onExam(it) && !attempted.has(it.topic))
  if (untouched.length) {
    untouched.sort((a, b) => examWeight(b.topic, topicMeta) - examWeight(a.topic, topicMeta) || a.id.localeCompare(b.id))
    const pick = untouched[0]
    return serve({
      item: pick,
      priority: 'coverage',
      conditions: 'cold',
      reason: coverageReason(pick.topic),
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
    // The paper is apportioned over `universe`: ALL exam-tested material this
    // sitting has not already asked, whether or not it is inside the reuse window.
    // Freshness is decided AFTER the unit is chosen, by poolFor, which prefers a
    // never-asked question, then one whose window has passed, then the most
    // forgotten.
    //
    // Gating the apportionment on the reuse window instead — sampling only from
    // `servable` — turns a freshness preference into a filter on which UNITS may
    // appear on the paper at all, because the selector works the heavy units first
    // and their items therefore cross into the window first. On the real CSA bank
    // at 20 answers a day, seven days of ordinary drilling left unit 4 with 0 items
    // outside a 28-day window and 88 inside, while units 1-3 still held fresh ones:
    // the 38-question sitting came out u1 31.6% / u2 47.4% / u3 21.1% / u4 0.0%
    // against entitlements of 20.2 / 30.3 / 14.1 / 35.4, and two days later
    // 57.9 / 0.0 / 42.1 / 0.0. handleMockSubmit scores the whole paper into
    // composite_pct with no unit filter, so a student who could do units 1-3 and
    // not unit 4 — worth 72 on the real weighting, a clear fail — scored 89.5 and
    // cleared composite_floor_min on a paper that never asked the unit he cannot do.
    // Overstating readiness is the one failure this project cannot ship.
    //
    // The trade is deliberate and it is the cheaper one: a remembered question is
    // still practice, it is labelled a repeat in the `reason` and in `repeat_of`,
    // and a caller can exclude it from the score. A unit missing from the paper is
    // silent and inflates the only number that moves readiness.
    const topics = [...new Set(universe.map((it) => it.topic))]

    // Exam weight is a property of the UNIT. The bank replicates a unit's weight
    // onto every topic row inside it, so normalizing across TOPICS yields a share
    // proportional to weight x topicCount: on a 60%-one-topic against a
    // 40%-three-topic bank, the 60% unit took 13 of 40 questions.
    //
    // A topic row that names no unit stands alone: with nothing to group it with,
    // its weight really is its own.
    const unitOf = (topic) => {
      const unit = topicMeta.get(topic)?.unit
      return unit == null ? `topic:${String(topic)}` : `unit:${String(unit)}`
    }
    const unitTopics = new Map()
    for (const topic of topics) {
      if (!unitTopics.has(unitOf(topic))) unitTopics.set(unitOf(topic), [])
      unitTopics.get(unitOf(topic)).push(topic)
    }
    // The replicated weight is the same on every row of a unit; the maximum is
    // taken so that one malformed row cannot silently zero a unit out of the paper.
    const unitWeight = new Map(
      [...unitTopics].map(([unit, own]) => [unit, Math.max(...own.map((t) => examWeight(t, topicMeta)))]),
    )
    const total = [...unitWeight.values()].reduce((n, w) => n + w, 0)
    /** The share of the paper a unit's exam weight entitles it to. */
    const share = (unit) => (total > 0 ? unitWeight.get(unit) / total : 1 / unitTopics.size)

    // How much of THIS sitting each unit and each topic has taken so far, keyed on
    // the mock id so a term of ordinary drilling cannot distort the paper. The unit
    // comes from the topic row rather than the attempt's own `unit` column, so that
    // the tally and the entitlement are counted the same way.
    const askedInUnit = new Map()
    const askedOnTopic = new Map()
    let asked = 0
    for (const a of attempts) {
      if (a.mock_id == null || mockId == null || Number(a.mock_id) !== Number(mockId)) continue
      askedInUnit.set(unitOf(a.topic), (askedInUnit.get(unitOf(a.topic)) ?? 0) + 1)
      askedOnTopic.set(a.topic, (askedOnTopic.get(a.topic) ?? 0) + 1)
      asked++
    }

    // Apportion the paper across UNITS first, and only then choose a topic inside
    // the unit that is owed a question. Apportioning across topics — even after
    // dividing a unit's entitlement among its own topic rows — cannot be made to
    // track the exam at this paper length: 53 CSA topics against 42 questions
    // leaves every topic owed about half a question, and which halves round up
    // then depends on how many topic rows a unit happens to carry. It gave unit 1
    // four of 42 against the 20.2% it is entitled to. Four units against 42
    // questions rounds to within half a question of the real weighting.
    //
    // Deterministic, like every other branch — no RNG anywhere — so a disputed
    // sitting replays question for question. Keys are stringified because an item
    // may carry a NULL topic, and a bank defect must not crash the sitting.
    //
    // Two units owed the same share AND carrying the same exam weight are
    // interchangeable as far as the sample is concerned, and the order between them
    // used to fall through to the unit's NAME, which is arbitrary. Break that tie
    // on evidence quality instead: the unit that can still supply a never-asked
    // question goes first. It cannot distort the paper — the loser is owed exactly
    // as much and takes the next question — and it stops the paper serving a
    // remembered question ahead of a fresh one it could have had for nothing.
    const unitsWithNeverAsked = new Set(
      universe.filter((it) => !lastSeen.has(it.id)).map((it) => unitOf(it.topic)),
    )
    const [nextUnit] = [...unitTopics.keys()]
      .map((unit) => ({ unit, owed: share(unit) * (asked + 1) - (askedInUnit.get(unit) ?? 0) }))
      .sort((a, b) => b.owed - a.owed
        || unitWeight.get(b.unit) - unitWeight.get(a.unit)
        || Number(unitsWithNeverAsked.has(b.unit)) - Number(unitsWithNeverAsked.has(a.unit))
        || a.unit.localeCompare(b.unit))

    // Inside the unit, spread across its topics: the one this paper has asked
    // least, then by name. Not by exam weight — every topic row in a unit carries
    // the same replicated weight, so that comparison could never decide anything.
    const [nextTopic] = unitTopics.get(nextUnit.unit)
      .map((topic) => ({ topic, n: askedOnTopic.get(topic) ?? 0 }))
      .sort((a, b) => a.n - b.n || String(a.topic).localeCompare(String(b.topic)))

    const item = poolFor(nextTopic.topic, universe)[0]
    // A topic with no attempts behind it is a coverage hole wherever it turns up,
    // and saying so is more use to the student than the generic sampling sentence.
    // What has changed is only which topic gets asked: the apportionment above
    // chose it out of every unit the exam tests, so no unit can be walked past.
    if (!attempted.has(nextTopic.topic)) {
      return serve({
        item,
        priority: 'coverage',
        conditions: 'proctored_mock',
        reason: `${coverageReason(nextTopic.topic)} It comes up now because this sitting is drawn to spread across ` +
          `the paper the way the exam weights it.`,
      })
    }
    return serve({
      item,
      priority: 'mock_breadth',
      conditions: 'proctored_mock',
      reason: `Mock question on ${nextTopic.topic}, drawn to keep this sitting spread across the paper the way the ` +
        `exam weights it. A mock aimed at your weak spots would score you lower than the real exam will.`,
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
