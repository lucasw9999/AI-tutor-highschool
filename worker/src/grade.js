// Server-side grading. The model never decides whether an answer was right.
//
// Two kinds are graded here with certainty: multiple choice (letter match) and
// short constructed answers (canonical form + explicit accepted variants).
// FRQs cannot be graded mechanically; they are routed to the model and marked
// `graded_by: 'model'`, which excludes them from readiness until the grader has
// been calibrated against an officially scored response.

const LETTERS = ['A', 'B', 'C', 'D', 'E']

/**
 * Pull a bare option letter out of whatever the student typed.
 * Accepts 'b', 'B', '(B)', 'B)', ' b. ', 'answer: B'. Returns null when the
 * response is not a letter choice, which callers must treat as unanswered
 * rather than wrong.
 */
export function normalizeChoice(response) {
  if (response == null) return null
  const m = String(response).toUpperCase().match(/\b([A-E])\b/)
  return m ? m[1] : null
}

/** True when the student left it blank or typed only whitespace. */
export function isBlank(response) {
  return response == null || String(response).trim() === ''
}

/**
 * Canonical form for a short answer: case-folded, whitespace-collapsed, and
 * stripped of the decoration students add ($, spaces around operators, a
 * trailing period, 'x =' prefixes).
 *
 * Order matters. Trimming happens BEFORE the anchored prefix and suffix strips —
 * with a leading space, `^(x|y|...)=` never matches, and ' x = 4. ' would
 * normalize to 'x=4.' and be marked wrong against a key of '4'. A false
 * negative here tells a student they got something wrong when they did not,
 * which is the one grading error this system must never make.
 */
export function normalizeShort(response) {
  if (response == null) return ''
  const cleaned = String(response)
    .toLowerCase()
    .replace(/\$/g, '')
    .replace(/\\left|\\right/g, '')
    .replace(/\s+/g, ' ')
    .trim()
  return cleaned
    .replace(/^(x|y|f\(x\)|answer)\s*=\s*/, '')
    .replace(/\s*([=+\-*/^,])\s*/g, '$1')
    .replace(/\.$/, '')
    .trim()
}

/** Parse a lone number, tolerating commas and a leading +. Null if not numeric. */
export function asNumber(text) {
  const t = String(text).replace(/,/g, '').replace(/^\+/, '').trim()
  if (!/^-?(\d+\.?\d*|\.\d+)$/.test(t)) return null
  return Number(t)
}

/**
 * Kinds the server refuses to score. These go to the model and are recorded
 * `graded_by: 'model'`, which excludes them from every mechanical readiness
 * floor until the grader is calibrated.
 */
export const MODEL_GRADED = new Set(['frq', 'constructed_model_graded'])

/**
 * True when an attempt's verdict was reached mechanically, and may therefore
 * count toward a performance number.
 *
 * Excludes model-graded work (quarantined until the grader is calibrated) and
 * unkeyed items (never graded at all). Treats a missing `graded_by` as
 * server-graded, since the field post-dates the earliest attempt rows.
 *
 * Every place that computes a percentage or counts a miss must filter through
 * this. Counting an ungraded attempt as a miss would blame the student for a gap
 * in the question bank.
 */
export function isServerGraded(attempt) {
  return attempt.graded_by !== 'model' && attempt.graded_by !== 'unkeyed'
}

/**
 * Grade one attempt against a stored item.
 *
 * Returns { correct, blank, graded_by, keyed, detail }. `graded_by` is 'server'
 * only when the verdict is mechanical, 'model' for rubric-scored work, and
 * 'unkeyed' when the item itself is missing an answer key.
 */
export function grade(item, response) {
  if (MODEL_GRADED.has(item.kind)) {
    return { correct: 0, blank: isBlank(response), graded_by: 'model', keyed: null, detail: 'rubric' }
  }

  // An item with no answer key cannot be graded. Returning `correct: 0` with
  // graded_by 'server' would tell the student he got it WRONG when the content
  // is what is missing — a false negative caused by a gap in the bank rather
  // than by anything he did. This is reported as ungraded instead, and
  // 'unkeyed' attempts are excluded from every readiness floor.
  if (item.answer == null || String(item.answer).trim() === '') {
    return {
      correct: 0,
      blank: isBlank(response),
      graded_by: 'unkeyed',
      keyed: null,
      detail: 'no_answer_key',
    }
  }

  if (isBlank(response)) {
    return { correct: 0, blank: true, graded_by: 'server', keyed: item.answer, detail: 'blank' }
  }

  if (item.kind === 'mcq') {
    const picked = normalizeChoice(response)
    if (picked === null) {
      return { correct: 0, blank: false, graded_by: 'server', keyed: item.answer, detail: 'no_letter' }
    }
    const keyed = normalizeChoice(item.answer)
    return {
      correct: picked === keyed ? 1 : 0,
      blank: false,
      graded_by: 'server',
      keyed,
      picked,
      detail: 'letter',
    }
  }

  // Short constructed answer: exact canonical match, or any accepted variant,
  // or numeric agreement inside a tolerance the item may specify.
  const got = normalizeShort(response)
  const accepted = [item.answer, ...(item.answer_variants ?? [])].filter(Boolean).map(normalizeShort)
  if (accepted.includes(got)) {
    return { correct: 1, blank: false, graded_by: 'server', keyed: item.answer, detail: 'exact' }
  }

  const gotNum = asNumber(got)
  if (gotNum !== null) {
    const tol = item.tolerance ?? 0
    for (const a of accepted) {
      const want = asNumber(a)
      if (want !== null && Math.abs(want - gotNum) <= tol) {
        return { correct: 1, blank: false, graded_by: 'server', keyed: item.answer, detail: 'numeric' }
      }
    }
  }

  return { correct: 0, blank: false, graded_by: 'server', keyed: item.answer, detail: 'mismatch' }
}
