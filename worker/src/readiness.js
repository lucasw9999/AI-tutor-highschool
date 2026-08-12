// The readiness engine.
//
// This module exists because of one bug: the old system reported 100% when the
// student had merely *seen* every topic. Coverage is not readiness. Here,
// readiness is a computed verdict over proctored mock evidence, and it can only
// reach 100 when every criterion in the subject config holds simultaneously.
//
// Two rules are structural, not stylistic:
//   1. Drills cannot move readiness. Only attempts tied to a proctored mock count.
//   2. Model-graded work (FRQs) cannot move readiness until the grader has been
//      calibrated against an officially scored response.

const DAY_MS = 86400000

export function daysBetween(a, b) {
  return (new Date(b).getTime() - new Date(a).getTime()) / DAY_MS
}

/** Percent correct over a set of attempts, or null when the set is empty. */
export function pct(attempts) {
  if (!attempts.length) return null
  const right = attempts.reduce((n, a) => n + (a.correct ? 1 : 0), 0)
  return (right / attempts.length) * 100
}

/** Group attempts by a field and return percent correct for each value. */
export function breakdown(attempts, field) {
  const groups = new Map()
  for (const a of attempts) {
    const k = a[field]
    if (k == null) continue
    if (!groups.has(k)) groups.set(k, [])
    groups.get(k).push(a)
  }
  const out = {}
  for (const [k, v] of groups) out[k] = { pct: pct(v), n: v.length }
  return out
}

/**
 * Find the most recent run of consecutive proctored mocks that can legitimately
 * be judged, or explain why no such window exists yet.
 *
 * "Qualifying" is deliberately strict: enough sittings, spread over enough days
 * (so they are not all one cram afternoon), not so spread out that the earliest
 * is stale, and at least one drawn from official College Board material so the
 * bank's difficulty is anchored to something real.
 */
export function qualifyingWindow({ config, mocks, now }) {
  const r = config.readiness
  const need = r.consecutive_qualifying_mocks

  const scored = mocks
    .filter((m) => m.proctored && m.composite_pct != null)
    .sort((a, b) => new Date(a.started_at) - new Date(b.started_at))

  if (scored.length < r.total_logged_mocks_min) {
    return {
      window: null,
      reason: `only ${scored.length} of ${r.total_logged_mocks_min} required proctored mocks logged`,
    }
  }
  if (scored.length < need) {
    return { window: null, reason: `need ${need} consecutive mocks, have ${scored.length}` }
  }
  if (r.require_official_mock && !scored.some((m) => m.source === 'official')) {
    return { window: null, reason: 'no official College Board mock logged yet — bank-only scores are unanchored' }
  }

  const win = scored.slice(-need)
  const span = daysBetween(win[0].started_at, win[win.length - 1].started_at)
  if (span < r.window_span_days_min) {
    return {
      window: null,
      reason: `last ${need} mocks span only ${span.toFixed(1)} days; need ${r.window_span_days_min}+ so this is not one cram session`,
    }
  }
  if (span > r.window_span_days_max) {
    return {
      window: null,
      reason: `last ${need} mocks span ${span.toFixed(0)} days; the earliest is stale beyond ${r.window_span_days_max}`,
    }
  }
  return { window: win, reason: null }
}

/**
 * Assemble the performance checks for a qualifying window. Each entry is
 * { id, label, met, detail }, so the caller can name the single thing standing
 * between the student and readiness instead of showing a bare number.
 */
function performanceChecks({ config, window, attempts, calibrated }) {
  const r = config.readiness
  const ids = new Set(window.map((m) => m.id))
  const mockAttempts = attempts.filter((a) => ids.has(a.mock_id))
  const composites = window.map((m) => m.composite_pct)
  const checks = []

  const mean = composites.reduce((s, x) => s + x, 0) / composites.length
  checks.push({
    id: 'composite_mean',
    label: `Mean composite across ${window.length} mocks ≥ ${r.composite_mean_min}%`,
    met: mean >= r.composite_mean_min,
    detail: `${mean.toFixed(1)}%`,
  })

  const floor = Math.min(...composites)
  checks.push({
    id: 'composite_floor',
    label: `Lowest single mock ≥ ${r.composite_floor_min}%`,
    met: floor >= r.composite_floor_min,
    detail: `${floor.toFixed(1)}%`,
  })

  let worstDrop = 0
  for (let i = 1; i < composites.length; i++) {
    worstDrop = Math.max(worstDrop, composites[i - 1] - composites[i])
  }
  checks.push({
    id: 'non_declining',
    label: `No drop steeper than ${r.max_decline_between_mocks} points between mocks`,
    met: worstDrop <= r.max_decline_between_mocks,
    detail: worstDrop > 0 ? `worst drop ${worstDrop.toFixed(1)} pts` : 'no decline',
  })

  const mcq = mockAttempts.filter((a) => a.kind === 'mcq')
  const mcqPct = pct(mcq)
  checks.push({
    id: 'mcq_overall',
    label: `Multiple choice ≥ ${r.mcq_overall_min}%`,
    met: mcqPct != null && mcqPct >= r.mcq_overall_min,
    detail: mcqPct == null ? 'no MCQ attempts in window' : `${mcqPct.toFixed(1)}% of ${mcq.length}`,
  })

  const byUnit = breakdown(mockAttempts, 'unit')
  for (const unit of config.units) {
    const got = byUnit[unit]
    checks.push({
      id: `unit_${unit}`,
      label: `Unit ${unit} ≥ ${r.per_unit_min}%`,
      met: got != null && got.pct >= r.per_unit_min,
      detail: got == null ? 'never tested under mock conditions' : `${got.pct.toFixed(0)}% of ${got.n}`,
    })
  }

  // CSA is scored by skill practice; Precalc by calculator/no-calculator half.
  if (r.dominant_practice) {
    const byPractice = breakdown(mockAttempts, 'practice')
    for (const p of config.practices) {
      const min = p === r.dominant_practice ? r.dominant_practice_min : r.other_practice_min
      const got = byPractice[p]
      checks.push({
        id: `practice_${p}`,
        label: `${p} ≥ ${min}%`,
        met: got != null && got.pct >= min,
        detail: got == null ? 'never tested under mock conditions' : `${got.pct.toFixed(0)}% of ${got.n}`,
      })
    }
  }
  if (r.no_calc_min != null) {
    for (const [flag, min, name] of [
      [0, r.no_calc_min, 'No-calculator'],
      [1, r.calc_min, 'Calculator'],
    ]) {
      const set = mockAttempts.filter((a) => a.calc_allowed === flag)
      const p = pct(set)
      checks.push({
        id: `calc_${flag}`,
        label: `${name} section ≥ ${min}%`,
        met: p != null && p >= min,
        detail: p == null ? 'never tested under mock conditions' : `${p.toFixed(0)}% of ${set.length}`,
      })
    }
  }

  const blanks = window.reduce((n, m) => n + (m.blanks ?? 0), 0)
  checks.push({
    id: 'blanks',
    label: `At most ${r.max_blanks} blank response across the window`,
    met: blanks <= r.max_blanks,
    detail: `${blanks} blank${blanks === 1 ? '' : 's'}`,
  })

  // FRQ evidence is quarantined until the grader is proven. Reporting an FRQ
  // percentage scored by the same model that wrote the rubric would measure
  // self-consistency, not accuracy.
  const frq = mockAttempts.filter((a) => a.kind === 'frq')
  if (!calibrated) {
    checks.push({
      id: 'frq',
      label: 'Free response scored against a calibrated grader',
      met: false,
      detail: 'grader not yet calibrated against an officially scored response — FRQ evidence excluded',
    })
  } else {
    const frqPct = pct(frq)
    checks.push({
      id: 'frq',
      label: `Free response ≥ ${r.frq_min_pct}%`,
      met: frqPct != null && frqPct >= r.frq_min_pct,
      detail: frqPct == null ? 'no FRQ attempts in window' : `${frqPct.toFixed(0)}% of ${frq.length}`,
    })
  }

  return checks
}

/**
 * The whole verdict.
 *
 * @returns {{readiness_pct: number, ready: boolean, first_unmet: string|null,
 *            criteria: Array, advisories: Array<string>}}
 */
export function computeReadiness({ config, mocks = [], attempts = [], coverage = {}, calibrated = false, now }) {
  const r = config.readiness
  const criteria = []
  const advisories = []

  // A. Coverage is a prerequisite, not a score. Failing it pins readiness at 0
  //    no matter how good the mock numbers look.
  const topicsTotal = coverage.topics_total ?? 0
  const topicsDrilled = coverage.topics_drilled ?? 0
  const coverageMet = topicsTotal > 0 && topicsDrilled >= topicsTotal
  criteria.push({
    id: 'coverage',
    label: 'Every exam-tested topic attempted at least once',
    met: coverageMet,
    detail: topicsTotal === 0 ? 'no topics loaded' : `${topicsDrilled} of ${topicsTotal} topics`,
  })

  const { window, reason } = qualifyingWindow({ config, mocks, now })
  criteria.push({
    id: 'mock_window',
    label: `${r.consecutive_qualifying_mocks} consecutive qualifying proctored mocks`,
    met: window != null,
    detail: window ? `${window.length} mocks in window` : reason,
  })

  if (!coverageMet || !window) {
    return {
      readiness_pct: 0,
      ready: false,
      first_unmet: !coverageMet ? 'coverage' : 'mock_window',
      criteria,
      advisories,
    }
  }

  // D. Freshness — evidence decays. A great score from two months ago is not a
  //    claim about today.
  const latest = window[window.length - 1]
  const age = daysBetween(latest.started_at, now)
  criteria.push({
    id: 'freshness',
    label: `Most recent mock within ${r.freshness_days} days`,
    met: age <= r.freshness_days,
    detail: `${age.toFixed(0)} days ago`,
  })

  criteria.push(...performanceChecks({ config, window, attempts, calibrated }))

  // E. Burnout guard — advisory only. A slide is a signal to rest, not a reason
  //    to relabel the evidence.
  const comps = window.map((m) => m.composite_pct)
  if (comps.length >= 3 && comps[0] - comps[comps.length - 1] >= r.burnout_drop_points) {
    advisories.push(
      `Scores have fallen ${(comps[0] - comps[comps.length - 1]).toFixed(0)} points across the window. ` +
        `That usually means fatigue rather than lost knowledge — take a break before the next sitting.`,
    )
  }

  const met = criteria.filter((c) => c.met).length
  const readiness_pct = Math.round((met / criteria.length) * 100)
  const firstUnmet = criteria.find((c) => !c.met)

  return {
    // Guard against rounding presenting 100% while something is still unmet.
    readiness_pct: firstUnmet ? Math.min(readiness_pct, 99) : 100,
    ready: !firstUnmet,
    first_unmet: firstUnmet ? firstUnmet.id : null,
    criteria,
    advisories,
  }
}
