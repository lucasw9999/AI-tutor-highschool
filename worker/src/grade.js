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
 * Grade one attempt against a stored item.
 *
 * Returns { correct, blank, graded_by, keyed, detail }. `graded_by` is 'server'
 * whenever the verdict is mechanical; 'model' only for rubric-scored FRQs, which
 * this function refuses to score.
 */
export function grade(item, response) {
  if (item.kind === 'frq') {
    return { correct: 0, blank: isBlank(response), graded_by: 'model', keyed: null, detail: 'rubric' }
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
