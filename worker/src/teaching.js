// The teaching layer.
//
// The requirement behind this file: "if you just keep doing the old questions
// without understanding what the whole thing's behind, it's going to be hard."
// Drilling a topic he does not understand produces a wrong answer at a slightly
// slower rate. So the server watches for evidence of a real concept gap and
// interrupts the drill with a short explanation.
//
// Teaching is triggered by evidence, never by the model's hunch. Two distinct
// misses on the same topic is the threshold: one miss is a slip, two is a
// pattern. And a gap does not close when the lesson is delivered — it closes
// when he gets one right cold, with no hints.

import { isServerGraded } from './grade.js'

/** Two distinct items missed on one topic is a concept gap, not bad luck. */
export const GAP_THRESHOLD = 2

/**
 * Find topics where the evidence says he does not understand the idea.
 *
 * Counts DISTINCT items missed, not total misses, so failing the same question
 * three times in a row does not look like broader confusion than it is.
 *
 * `since` is a per-topic resolution timestamp (topic -> ISO string): misses at or
 * before it have already been taught, re-tested cold and cleared, so they are
 * spent evidence. Without it, scoring the whole history re-opens a gap the moment
 * it closes and re-delivers the identical lesson forever, and the student never
 * gets another question on the topic he just proved he understood.
 */
export function detectGaps(attempts, { threshold = GAP_THRESHOLD, since = null } = {}) {
  const resolvedAt = (topic) => since?.get?.(topic) ?? since?.[topic] ?? null
  const missedItems = new Map()
  const hinted = new Map()
  for (const a of attempts) {
    if (a.topic == null) continue
    // An ungraded attempt is not a miss. Treating one as evidence of confusion
    // would open a concept gap the student never demonstrated.
    if (!isServerGraded(a)) continue
    const resolved = resolvedAt(a.topic)
    if (resolved && new Date(a.ts) <= new Date(resolved)) continue
    if (!missedItems.has(a.topic)) missedItems.set(a.topic, new Set())
    if (!a.correct) missedItems.get(a.topic).add(a.item_id)
    if (a.hints_used) hinted.set(a.topic, (hinted.get(a.topic) ?? 0) + 1)
  }
  const out = []
  for (const [topic, items] of missedItems) {
    if (items.size >= threshold) {
      out.push({ topic, distinct_misses: items.size, hinted: hinted.get(topic) ?? 0 })
    }
  }
  return out.sort((a, b) => b.distinct_misses - a.distinct_misses || a.topic.localeCompare(b.topic))
}

/**
 * Reconcile detected gaps against what is already recorded, so a lesson is
 * delivered once rather than every time the topic comes up.
 *
 * @returns {{open: Array, to_teach: Array, to_open: Array}}
 *   to_open  — newly evidenced gaps with no row yet
 *   to_teach — open gaps whose lesson has not been delivered
 *   open     — everything still unresolved, including ones already taught and
 *              awaiting a cold re-test
 */
export function reconcileGaps({ detected, gaps = [] }) {
  const openRows = gaps.filter((g) => !g.cleared_at)
  const openByTopic = new Map(openRows.map((g) => [g.topic, g]))

  const to_open = detected.filter((d) => !openByTopic.has(d.topic))
  const to_teach = openRows.filter((g) => !g.taught_at)

  return { open: openRows, to_teach, to_open }
}

/**
 * Should this correct answer close a gap?
 *
 * Only an unaided, un-tutored correct answer counts. Getting it right with a
 * hint, or immediately after being shown the worked example, demonstrates
 * short-term recall rather than understanding.
 */
export function clearsGap(gap, attempt) {
  if (!gap || gap.cleared_at) return false
  if (!attempt.correct) return false
  if (attempt.hints_used) return false
  if (attempt.conditions === 'tutored') return false
  // The lesson must have been delivered, and the re-test must come after it.
  if (!gap.taught_at) return false
  return new Date(attempt.ts) > new Date(gap.taught_at)
}

/**
 * Assemble the lesson for a topic: a plain-language idea, one worked example,
 * and the mistake this student actually made.
 *
 * Returns null when no teaching material exists for the topic, which the caller
 * must surface as a content gap rather than silently skipping the lesson.
 */
export function buildLesson({ topic, teaching, gap }) {
  const t = teaching?.get?.(topic) ?? teaching?.[topic]
  if (!t) return null
  return {
    topic,
    why_now: `You have missed ${gap?.distinct_misses ?? GAP_THRESHOLD} different questions on ${topic}. That is a pattern, not a slip, so here is the idea before the next one.`,
    plain_idea: t.plain_idea,
    worked_example: t.worked_example,
    common_mistake: t.common_mistake,
    then: 'Next question on this topic comes with no hints — that is what closes the gap.',
  }
}
