// What to ask next, and why.
//
// The selector is deterministic on purpose. Given the same history it makes the
// same choice, so a disputed question can be replayed and explained. Every
// return value carries a `reason`, which the status view shows verbatim — the
// student should never wonder why he is being asked something.
//
// Priority order, highest first:
//   1. Re-test a taught gap cold. A gap closes only on an unaided correct answer.
//   2. Fill a coverage hole. A topic with no attempts is not a topic he knows.
//   3. Shore up the weakest topic, weighted by how much the exam cares.
//   4. Spaced review of something previously missed and now due.
//   5. Anything unseen, so the bank keeps moving.

const DAY_MS = 86400000

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
  const ordered = [...attempts].sort((a, b) => new Date(a.ts) - new Date(b.ts))
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
 * @returns {{item: object, reason: string, priority: string, conditions: string}|null}
 *          null only when every item is inside the reuse window, which means the
 *          bank is exhausted rather than that the student is finished.
 */
export function pickNext({ items, attempts = [], gaps = [], topicMeta = new Map(), config, now, reuseDays = 56 }) {
  const stats = topicStats(attempts)

  // An item answered recently is not evidence — he may just remember it.
  const lastSeen = new Map()
  for (const a of attempts) {
    const prev = lastSeen.get(a.item_id)
    if (!prev || new Date(a.ts) > new Date(prev)) lastSeen.set(a.item_id, a.ts)
  }
  const fresh = items.filter((it) => {
    const seen = lastSeen.get(it.id)
    return !seen || ageDays(seen, now) >= reuseDays
  })
  if (!fresh.length) return null

  const unseen = fresh.filter((it) => !lastSeen.has(it.id))
  const testedTopics = new Set(
    [...topicMeta.entries()].filter(([, m]) => m.tested_on_exam !== 0).map(([id]) => id),
  )
  const onExam = (it) => testedTopics.size === 0 || testedTopics.has(it.topic)

  // 1. A gap that has been taught but never re-tested cold.
  const toRetest = gaps.filter((g) => g.taught_at && !g.cleared_at)
  for (const g of toRetest) {
    const pool = (unseen.length ? unseen : fresh).filter((it) => it.topic === g.topic)
    if (pool.length) {
      return {
        item: pool[0],
        priority: 'gap_retest',
        conditions: 'cold',
        reason: `Re-testing ${g.topic} cold, with no hints, to confirm the explanation actually landed. This gap stays open until you get one right unaided.`,
      }
    }
  }

  // 2. A topic he has never attempted.
  const untouched = unseen.filter((it) => onExam(it) && !stats.has(it.topic))
  if (untouched.length) {
    untouched.sort((a, b) => examWeight(b.topic, topicMeta) - examWeight(a.topic, topicMeta) || a.id.localeCompare(b.id))
    const pick = untouched[0]
    return {
      item: pick,
      priority: 'coverage',
      conditions: 'cold',
      reason: `First question on ${pick.topic}. Until you have attempted it, it does not count as covered.`,
    }
  }

  // 3. The weakest topic that matters most. Ranked by shortfall against the
  //    per-unit floor, scaled by exam weight, so a weak heavily-tested topic
  //    outranks a weak footnote.
  const floor = config?.readiness?.per_unit_min ?? 70
  const weak = [...stats.entries()]
    .filter(([topic, s]) => s.pct < floor && (testedTopics.size === 0 || testedTopics.has(topic)))
    .map(([topic, s]) => ({ topic, s, urgency: (floor - s.pct) * (1 + examWeight(topic, topicMeta)) }))
    .sort((a, b) => b.urgency - a.urgency || a.topic.localeCompare(b.topic))

  for (const w of weak) {
    const pool = (unseen.length ? unseen : fresh).filter((it) => it.topic === w.topic)
    if (pool.length) {
      return {
        item: pool[0],
        priority: 'weakest',
        conditions: 'cold',
        reason: `${w.topic} is at ${w.s.pct.toFixed(0)}%, below the ${floor}% this subject needs. Working it until it holds.`,
      }
    }
  }

  // 4. Spaced review: previously missed, correct since, and now due again.
  const due = [...stats.entries()]
    .filter(([, s]) => s.misses > 0 && s.last_ts && ageDays(s.last_ts, now) >= reviewInterval(s.streak))
    .sort((a, b) => ageDays(b[1].last_ts, now) - ageDays(a[1].last_ts, now) || a[0].localeCompare(b[0]))

  for (const [topic, s] of due) {
    const pool = (unseen.length ? unseen : fresh).filter((it) => it.topic === topic)
    if (pool.length) {
      return {
        item: pool[0],
        priority: 'review',
        conditions: 'cold',
        reason: `Spaced review of ${topic} — you missed it before, and it has been ${ageDays(s.last_ts, now).toFixed(0)} days. Checking it stuck.`,
      }
    }
  }

  // 5. Keep moving through the bank.
  const rest = (unseen.length ? unseen : fresh).filter(onExam)
  const pool = rest.length ? rest : unseen.length ? unseen : fresh
  const pick = [...pool].sort((a, b) => examWeight(b.topic, topicMeta) - examWeight(a.topic, topicMeta) || a.id.localeCompare(b.id))[0]
  return {
    item: pick,
    priority: 'breadth',
    conditions: 'cold',
    reason: `Everything is at or above its floor, so this is fresh ground on ${pick.topic}.`,
  }
}
