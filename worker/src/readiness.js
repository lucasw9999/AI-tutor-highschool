// The readiness engine.
//
// This module exists because of one bug: the old system reported 100% when the
// student had merely *seen* every topic. Coverage is not readiness. Here,
// readiness is a computed verdict over proctored mock evidence, and it can only
// reach 100 when every criterion in the subject config holds simultaneously.
//
// Three rules are structural, not stylistic:
//   1. Drills cannot move readiness. Only attempts tied to a proctored mock count.
//   2. Model-graded work (FRQs) cannot move readiness until the grader has been
//      calibrated against an officially scored response AND has actually
//      recorded a verdict. A rubric item that was merely routed to the model is
//      unmeasured, not a zero.
//   3. The window being judged must itself contain an official College Board
//      sitting. An official mock elsewhere in the logbook anchors nothing.

import { isServerGraded, MODEL_GRADED } from './grade.js'

const DAY_MS = 86400000

export function daysBetween(a, b) {
  return (new Date(b).getTime() - new Date(a).getTime()) / DAY_MS
}

/**
 * Round a measured value to the precision it will be DISPLAYED at, away from
 * the bar it is compared against, and then compare THAT value. The number a
 * parent reads is then exactly the number the verdict was reached on.
 *
 * The direction matters. Rounding 77.96 to "78.0" and comparing that against a
 * `>= 78` floor would quietly move the floor to 77.95; flooring to 77.9 leaves
 * the verdict identical to the unrounded comparison — every shipped threshold
 * is a whole number, and `floor(v) >= T ⟺ v >= T` for any such T — while making
 * "77.9% ✗" self-consistent. `roundUp` does the same job for the `<=` limits,
 * where exceeding is the failure.
 */
export function roundDown(value, decimals = 1) {
  const f = 10 ** decimals
  return Math.floor(value * f) / f
}

export function roundUp(value, decimals = 1) {
  const f = 10 ** decimals
  return Math.ceil(value * f) / f
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
 * Why this candidate window cannot be judged, or null when it can.
 *
 * The official-material check is applied to the window itself, not to the
 * logbook: three bank-sourced mocks are unanchored however many official
 * sittings happened months earlier, and "at least one from official College
 * Board material" is a promise about the mocks being scored.
 */
function disqualify(win, r, need) {
  const span = daysBetween(win[0].started_at, win[win.length - 1].started_at)
  if (span < r.window_span_days_min) {
    return `last ${need} mocks span only ${roundDown(span).toFixed(1)} days; need ${r.window_span_days_min}+ so this is not one cram session`
  }
  if (span > r.window_span_days_max) {
    return `last ${need} mocks span ${roundUp(span).toFixed(1)} days; the earliest is stale beyond ${r.window_span_days_max}`
  }
  if (r.require_official_mock && !win.some((m) => m.source === 'official')) {
    return 'no official College Board mock inside the window — bank-only scores are unanchored'
  }
  return null
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
  // Unreachable on shipped config, and kept deliberately: both subjects set
  // total_logged_mocks_min (6 and 4) above consecutive_qualifying_mocks (3), so
  // the check above already covers this. Everything below slices exactly `need`
  // sittings and every message calls them "the last N mocks", so a config with a
  // lower total would judge — and describe — a window shorter than it claims.
  // A test builds such a config so this branch is exercised rather than assumed.
  if (scored.length < need) {
    return { window: null, reason: `need ${need} consecutive mocks, have ${scored.length}` }
  }

  // Two sittings more than window_span_days_max apart can never share a window,
  // so the logbook falls into BLOCKS of practice separated by exactly those gaps.
  // The only candidate a block offers is its own newest `need` sittings: judging
  // an earlier slice of the same block would drop a sitting close enough to
  // belong with it.
  //
  // Blocks are walked newest first, and one is passed over ONLY when it holds
  // fewer than `need` sittings — too few to be judged under any rule, so nothing
  // measurable is hidden by skipping it. The first block that CAN form a
  // candidate is the verdict: if that candidate is disqualified, the
  // disqualification is the answer, because reaching further back would judge
  // older, better-looking scores while ignoring what the student just sat.
  //
  // That is the correction to R3, which asked only whether the IMMEDIATELY newer
  // sitting was far away. Three crammed sittings yesterday, 48 days after the
  // previous block, satisfied that test, so all three were stepped over and
  // two-month-old 95s were reported as though they were current.
  //
  // The rule balances the two failure directions. Fresh weak evidence is never
  // stepped over for stale strong evidence, because a block that can be judged
  // always is. And a legitimate older block is still measured when the newest
  // sittings are too few to judge at all, so a lone recent mock does not erase
  // the record behind it. Where the two conflict — the newest block can form a
  // candidate but fails — honesty about the most recent evidence wins.
  //
  // Because a pass-over only ever crosses a gap wider than window_span_days_max,
  // and both configs set freshness_days <= that limit, any window that leaves out
  // newer sittings is necessarily stale: an earlier block can inform the report
  // but can never be reported as ready.

  // The reason always describes the most recent `need` sittings — the run the
  // student just sat, which is what the wording refers to — even when an older
  // block supplies the judged window. It is never null on a failing path: if
  // those sittings qualified they would be the first candidate and returned
  // below, and a candidate that straddles a block boundary spans more than
  // window_span_days_max by construction.
  const reason = disqualify(scored.slice(-need), r, need)

  for (let end = scored.length - 1; end >= need - 1; ) {
    let start = end
    while (start > 0 && daysBetween(scored[start - 1].started_at, scored[start].started_at) <= r.window_span_days_max) {
      start--
    }
    if (end - start + 1 >= need) {
      const win = scored.slice(end - need + 1, end + 1)
      return disqualify(win, r, need) ? { window: null, reason } : { window: win, reason: null }
    }
    end = start - 1
  }
  return { window: null, reason }
}

/**
 * Every performance check a subject will be judged on, as {id, label}.
 *
 * Single source of truth for the labels, so the "pending" report and the
 * evaluated report can never drift apart in wording or in which checks exist.
 * Freshness lives here too: a student with no window yet still has to be told
 * that mock evidence expires, and leaving it out hid the requirement from
 * exactly the reader who had not met it.
 */
export function plannedChecks(config) {
  const r = config.readiness
  const out = [
    { id: 'freshness', label: `Most recent mock within ${r.freshness_days} days` },
    { id: 'composite_mean', label: `Mean composite across ${r.consecutive_qualifying_mocks} mocks ≥ ${r.composite_mean_min}%` },
    { id: 'composite_floor', label: `Lowest single mock ≥ ${r.composite_floor_min}%` },
    { id: 'non_declining', label: `No drop steeper than ${r.max_decline_between_mocks} points between mocks` },
    { id: 'mcq_overall', label: `Multiple choice ≥ ${r.mcq_overall_min}%` },
  ]
  for (const unit of config.units) {
    out.push({ id: `unit_${unit}`, label: `Unit ${unit} ≥ ${r.per_unit_min}%` })
  }
  if (r.dominant_practice) {
    for (const p of config.practices) {
      const min = p === r.dominant_practice ? r.dominant_practice_min : r.other_practice_min
      out.push({ id: `practice_${p}`, label: `${p} ≥ ${min}%` })
    }
  }
  if (r.no_calc_min != null) {
    out.push({ id: 'calc_0', label: `No-calculator section ≥ ${r.no_calc_min}%` })
    out.push({ id: 'calc_1', label: `Calculator section ≥ ${r.calc_min}%` })
  }
  out.push({ id: 'blanks', label: `At most ${r.max_blanks} blank response across the window` })
  out.push({ id: 'frq', label: `Free response ≥ ${r.frq_min_pct}%` })
  return out
}

/**
 * Evaluate the planned checks against a qualifying window.
 *
 * Returns a Map of id -> {met, detail}; the caller zips it with plannedChecks so
 * labels live in exactly one place.
 *
 * Every number here is rounded to its display precision BEFORE it is compared,
 * so no criterion can print a value that reads as clearing the bar it just
 * failed. See roundDown/roundUp for why the rounding is directional.
 */
function evaluateChecks({ config, window, attempts, calibrated, now }) {
  const r = config.readiness
  const ids = new Set(window.map((m) => m.id))
  const inWindow = attempts.filter((a) => ids.has(a.mock_id))

  // Only mechanically graded evidence can move a mechanical floor. Model-graded
  // work is quarantined until calibration, and an attempt on an item with no
  // answer key was never graded at all — counting either as a miss would blame
  // the student for a gap in the bank.
  //
  // The kind is checked as well as the verdict: a rubric-scored item is
  // model-graded whatever `graded_by` a future calibrated grader writes on it, so
  // it can never be allowed to move an MCQ, per-unit, per-practice or
  // per-calculator-half number. Filtering on graded_by alone left that open.
  const mockAttempts = inWindow.filter((a) => isServerGraded(a) && !MODEL_GRADED.has(a.kind))

  const composites = window.map((m) => m.composite_pct)
  const out = new Map()

  // Evidence decays. A great score from two months ago is not a claim about
  // today, so age rounds UP: 42.4 days reads as 43, never as "42 days" beside a
  // failure of a 42-day bar.
  const age = roundUp(daysBetween(window[window.length - 1].started_at, now), 0)
  out.set('freshness', { met: age <= r.freshness_days, detail: `${age} days ago` })

  const mean = roundDown(composites.reduce((s, x) => s + x, 0) / composites.length)
  out.set('composite_mean', { met: mean >= r.composite_mean_min, detail: `${mean.toFixed(1)}%` })

  const floor = roundDown(Math.min(...composites))
  out.set('composite_floor', { met: floor >= r.composite_floor_min, detail: `${floor.toFixed(1)}%` })

  let steepest = 0
  for (let i = 1; i < composites.length; i++) {
    steepest = Math.max(steepest, composites[i - 1] - composites[i])
  }
  const worstDrop = roundUp(steepest)
  out.set('non_declining', {
    met: worstDrop <= r.max_decline_between_mocks,
    detail: worstDrop > 0 ? `worst drop ${worstDrop.toFixed(1)} pts` : 'no decline',
  })

  const mcq = mockAttempts.filter((a) => a.kind === 'mcq')
  const mcqRaw = pct(mcq)
  const mcqPct = mcqRaw == null ? null : roundDown(mcqRaw)
  out.set('mcq_overall', {
    met: mcqPct != null && mcqPct >= r.mcq_overall_min,
    detail: mcqPct == null ? 'no MCQ attempts in window' : `${mcqPct.toFixed(1)}% of ${mcq.length}`,
  })

  const byUnit = breakdown(mockAttempts, 'unit')
  for (const unit of config.units) {
    const got = byUnit[unit]
    const p = got == null ? null : roundDown(got.pct, 0)
    out.set(`unit_${unit}`, {
      met: p != null && p >= r.per_unit_min,
      detail: p == null ? 'never tested under mock conditions' : `${p}% of ${got.n}`,
    })
  }

  // CSA is scored by skill practice; Precalc by calculator/no-calculator half.
  if (r.dominant_practice) {
    const byPractice = breakdown(mockAttempts, 'practice')
    for (const p of config.practices) {
      const min = p === r.dominant_practice ? r.dominant_practice_min : r.other_practice_min
      const got = byPractice[p]
      const shown = got == null ? null : roundDown(got.pct, 0)
      out.set(`practice_${p}`, {
        met: shown != null && shown >= min,
        detail: shown == null ? 'never tested under mock conditions' : `${shown}% of ${got.n}`,
      })
    }
  }
  if (r.no_calc_min != null) {
    for (const [flag, min] of [[0, r.no_calc_min], [1, r.calc_min]]) {
      const set = mockAttempts.filter((a) => a.calc_allowed === flag)
      const raw = pct(set)
      const p = raw == null ? null : roundDown(raw, 0)
      out.set(`calc_${flag}`, {
        met: p != null && p >= min,
        detail: p == null ? 'never tested under mock conditions' : `${p}% of ${set.length}`,
      })
    }
  }

  const blanks = window.reduce((n, m) => n + (m.blanks ?? 0), 0)
  out.set('blanks', { met: blanks <= r.max_blanks, detail: `${blanks} blank${blanks === 1 ? '' : 's'}` })

  // FRQ evidence is quarantined until the grader is proven. Reporting an FRQ
  // percentage scored by the same model that wrote the rubric would measure
  // self-consistency, not accuracy. That is a gap in what has been MEASURED, not
  // a shortfall by the student, so it is flagged pending rather than failed.
  if (!calibrated) {
    out.set('frq', {
      met: false,
      pending: true,
      detail: 'grader not yet calibrated against an officially scored response — FRQ evidence excluded',
    })
  } else {
    // Once calibrated, model-graded work is trusted, so this reads from the full
    // window rather than the server-graded subset. The filter is the grader's own
    // set of model-graded kinds: no item in the bank is stored as kind 'frq' —
    // every free-response item is 'constructed_model_graded' — so matching that
    // literal would have measured nothing the moment calibration was switched on.
    //
    // Trusted is not the same as scored. grade.js books EVERY rubric item as
    // `{correct: 0, graded_by: 'model'}` when it is served: attempts.correct is
    // NOT NULL, so 0 is the only value that row can carry, and 'model' means
    // "routed to the rubric", not "scored zero". Nothing writes a verdict back
    // yet. Averaging those rows reported that the student scored 0% on free
    // response when nothing had been graded at all — the same false negative
    // isServerGraded() exists to prevent, so its definition of "carries a
    // verdict" is what is applied here rather than bypassed. Until a calibrated
    // grader records verdicts under some other `graded_by`, this reports the FRQ
    // criterion as PENDING, which is the truth: unmeasured, not zero.
    const frqAttempts = inWindow.filter((a) => MODEL_GRADED.has(a.kind))
    const graded = frqAttempts.filter(isServerGraded)
    const frqRaw = pct(graded)
    const frqPct = frqRaw == null ? null : roundDown(frqRaw, 0)
    const unscored = frqAttempts.length - graded.length
    if (frqPct == null && frqAttempts.length) {
      out.set('frq', {
        met: false,
        pending: true,
        detail: `${frqAttempts.length} free-response attempt${frqAttempts.length === 1 ? '' : 's'} in window, none carrying a scored verdict yet — nothing to measure`,
      })
    } else {
      out.set('frq', {
        met: frqPct != null && frqPct >= r.frq_min_pct,
        // A percentage over part of the free-response work says so, so the
        // number can never read as a verdict on work nobody graded.
        detail:
          frqPct == null
            ? 'no FRQ attempts in window'
            : unscored
              ? `${frqPct}% of ${graded.length} scored; ${unscored} not yet scored`
              : `${frqPct}%`,
      })
    }
  }

  return out
}

function performanceChecks({ config, window, attempts, calibrated, now }) {
  const results = evaluateChecks({ config, window, attempts, calibrated, now })
  return plannedChecks(config).map(({ id, label }) => ({ id, label, ...results.get(id) }))
}

/** The same checks, listed as not yet measured because the evidence for them does not exist. */
function pendingChecks({ config, window }) {
  const need = config.readiness.consecutive_qualifying_mocks
  const detail = window
    ? 'not yet measurable — every exam-tested topic has to be attempted first'
    : `not yet measurable — needs ${need} qualifying proctored mocks`
  return plannedChecks(config).map(({ id, label }) => ({ id, label, met: false, pending: true, detail }))
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

  // Both paths report the WHOLE bar, from the same plannedChecks list, so the
  // criteria a reader sees never depend on how far the evidence got. Without a
  // window the performance checks are listed as NOT YET MEASURED rather than as
  // failures — claiming a student fell short of a standard he was never assessed
  // against would be its own false statement.
  const measurable = coverageMet && window != null
  criteria.push(
    ...(measurable
      ? performanceChecks({ config, window, attempts, calibrated, now })
      : pendingChecks({ config, window })),
  )

  // Burnout guard — advisory only. A slide is a signal to rest, not a reason to
  // relabel the evidence.
  const comps = window ? window.map((m) => m.composite_pct) : []
  if (comps.length >= 3 && comps[0] - comps[comps.length - 1] >= r.burnout_drop_points) {
    advisories.push(
      `Scores have fallen ${(comps[0] - comps[comps.length - 1]).toFixed(0)} points across the window. ` +
        `That usually means fatigue rather than lost knowledge — take a break before the next sitting.`,
    )
  }

  // One definition of the number, for both paths: the share of that one criteria
  // list which is met, with pending checks counted as unmet.
  //
  // Coverage and a qualifying window are what make the rest measurable at all,
  // so they gate the number rather than scoring points inside it. Until both
  // hold, the honest report is that nothing has been measured — 0 — and not the
  // fraction of checks that happen not to need mock evidence. That is the whole
  // reason this project exists: full topic coverage with no mocks is 0%.
  const met = criteria.filter((c) => c.met).length
  const firstUnmet = criteria.find((c) => !c.met)
  const share = Math.round((met / criteria.length) * 100)

  return {
    // Guard against rounding presenting 100% while something is still unmet.
    readiness_pct: firstUnmet ? Math.min(measurable ? share : 0, 99) : 100,
    ready: !firstUnmet,
    first_unmet: firstUnmet ? firstUnmet.id : null,
    criteria,
    advisories,
  }
}
