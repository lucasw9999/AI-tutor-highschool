import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { computeReadiness, qualifyingWindow, pct, breakdown, daysBetween } from '../src/readiness.js'
import { grade, MODEL_GRADED } from '../src/grade.js'

const CSA = JSON.parse(readFileSync(new URL('../config/ap_csa.json', import.meta.url)))
const PRECALC = JSON.parse(readFileSync(new URL('../config/ap_precalc.json', import.meta.url)))

const NOW = '2027-04-01T12:00:00Z'

/** A proctored mock with a composite score, n days before NOW. */
function mock(id, daysAgo, composite, extra = {}) {
  const started = new Date(new Date(NOW).getTime() - daysAgo * 86400000).toISOString()
  return { id, subject: 'ap_csa', started_at: started, proctored: 1, source: 'bank', composite_pct: composite, blanks: 0, ...extra }
}

/**
 * Proctored mocks at the given ages in days, oldest first, ids 1..n.
 *
 * `official` is the INDEX of the sitting drawn from College Board material.
 * It defaults to the last one because the anchor has to sit inside the judged
 * window, and the window is the most recent run of mocks.
 */
function record(daysAgo, { composites, official = daysAgo.length - 1, blanks = 0 } = {}) {
  return daysAgo.map((d, i) =>
    mock(i + 1, d, composites?.[i] ?? 90, { blanks, ...(i === official ? { source: 'official' } : {}) }),
  )
}

/** `right` correct out of `total` attempts of one kind, all in one slice. */
function run({ mock_id, total, right, kind = 'mcq', unit = '1', practice = 'P1', calc_allowed = 0, graded_by }) {
  return Array.from({ length: total }, (_, i) => ({
    mock_id,
    kind,
    unit,
    practice,
    calc_allowed,
    correct: i < right ? 1 : 0,
    ...(graded_by ? { graded_by } : {}),
  }))
}

/**
 * Free-response rows carrying a RECORDED rubric verdict: a model-graded kind the
 * bank really contains, marked with a `graded_by` that is not one of the three
 * "not graded" markers, so `correct` on these rows is a real score.
 *
 * grade.js does NOT write these today. It books every model-graded item as
 * `{correct: 0, graded_by: 'model'}` the moment it is served — 'model' means
 * "routed to the rubric", not "scored zero" — and no code path ever writes a
 * verdict back. `ungradedFrqRun` below is that real shape. The previous comment
 * here claimed these rows were "the shape grade.js actually produces", which was
 * false as to `correct` and hid the fact that a calibrated grader reading real
 * rows would have reported 0% on free response.
 */
function frqRun({ mock_id, total = 4, right = total, kind = 'constructed_model_graded' }) {
  return run({ mock_id, total, right, kind, unit: '2', practice: 'P3', graded_by: 'model_scored' })
}

/**
 * Free-response rows exactly as grade.js books them: routed to the rubric and
 * never scored. Built from the grader's own return value so the fixture cannot
 * drift away from what the code writes.
 */
function ungradedFrqRun({ mock_id, total = 4, kind = 'constructed_model_graded' }) {
  const booked = grade({ kind, answer: null }, 'a full worked response')
  return Array.from({ length: total }, () => ({
    mock_id,
    kind,
    unit: '2',
    practice: 'P3',
    calc_allowed: 0,
    correct: booked.correct,
    graded_by: booked.graded_by,
  }))
}

/**
 * Attempts that satisfy every per-slice floor, so a test can isolate one
 * failing dimension instead of tripping over unrelated ones.
 */
function passingAttempts(mockIds, config = CSA, correctRate = 1) {
  const out = []
  let n = 0
  for (const mock_id of mockIds) {
    for (const unit of config.units) {
      for (const practice of config.practices ?? ['P1']) {
        for (let i = 0; i < 10; i++) {
          n++
          out.push({
            mock_id,
            kind: 'mcq',
            unit,
            practice,
            calc_allowed: i % 2,
            correct: n % Math.round(1 / (1 - correctRate + 1e-9)) === 0 ? 0 : 1,
          })
        }
      }
    }
  }
  return out
}

const FULL_COVERAGE = { topics_total: 53, topics_drilled: 53 }

test('helpers', async (t) => {
  await t.test('pct is null for an empty set rather than 0', () => {
    assert.equal(pct([]), null)
    assert.equal(pct([{ correct: 1 }, { correct: 0 }]), 50)
  })

  await t.test('breakdown groups and skips null keys', () => {
    const b = breakdown([{ unit: '1', correct: 1 }, { unit: '1', correct: 0 }, { unit: null, correct: 1 }], 'unit')
    assert.deepEqual(Object.keys(b), ['1'])
    assert.equal(b['1'].pct, 50)
    assert.equal(b['1'].n, 2)
  })

  await t.test('daysBetween is signed and ordered', () => {
    assert.equal(daysBetween('2027-01-01', '2027-01-11'), 10)
  })
})

// ---------------------------------------------------------------------------
// The regression that started this project.
// ---------------------------------------------------------------------------

test('THE ORIGINAL BUG: full topic coverage with zero mocks is 0%, never 100%', () => {
  const r = computeReadiness({ config: CSA, mocks: [], attempts: [], coverage: FULL_COVERAGE, now: NOW })
  assert.equal(r.readiness_pct, 0, 'coverage alone must not produce a readiness score')
  assert.equal(r.ready, false)
  assert.equal(r.first_unmet, 'mock_window')
})

test('drill attempts cannot move readiness, however many are correct', () => {
  // 500 perfect answers, none tied to a proctored mock.
  const drills = Array.from({ length: 500 }, () => ({ mock_id: null, kind: 'mcq', unit: '1', practice: 'P3', correct: 1 }))
  const r = computeReadiness({ config: CSA, mocks: [], attempts: drills, coverage: FULL_COVERAGE, now: NOW })
  assert.equal(r.readiness_pct, 0)
  assert.equal(r.first_unmet, 'mock_window')
})

test('incomplete coverage pins readiness at 0 even with a perfect mock record', () => {
  const mocks = [mock(1, 30, 95, { source: 'official' }), mock(2, 20, 96), mock(3, 10, 97), mock(4, 8, 95), mock(5, 5, 96), mock(6, 2, 97)]
  const r = computeReadiness({
    config: CSA,
    mocks,
    attempts: passingAttempts([1, 2, 3, 4, 5, 6]),
    coverage: { topics_total: 53, topics_drilled: 40 },
    now: NOW,
  })
  assert.equal(r.readiness_pct, 0)
  assert.equal(r.first_unmet, 'coverage')
})

// ---------------------------------------------------------------------------
// Window qualification
// ---------------------------------------------------------------------------

test('mock window qualification', async (t) => {
  await t.test('rejects a cram session: 3 mocks inside 2 days', () => {
    const mocks = [mock(1, 40, 90, { source: 'official' }), mock(2, 30, 90), mock(3, 20, 90), mock(4, 2, 90), mock(5, 1, 90), mock(6, 0, 90)]
    const { window, reason } = qualifyingWindow({ config: CSA, mocks, now: NOW })
    assert.equal(window, null)
    assert.match(reason, /cram/)
  })

  await t.test('rejects a bank-only record when an official mock is required', () => {
    const mocks = [1, 2, 3, 4, 5, 6].map((i) => mock(i, 40 - i * 6, 90))
    const { window, reason } = qualifyingWindow({ config: CSA, mocks, now: NOW })
    assert.equal(window, null)
    assert.match(reason, /official/)
  })

  await t.test('rejects an unproctored sitting: only proctored mocks count', () => {
    const mocks = [1, 2, 3, 4, 5, 6].map((i) => mock(i, 40 - i * 6, 90, { proctored: 0, source: 'official' }))
    const { window, reason } = qualifyingWindow({ config: CSA, mocks, now: NOW })
    assert.equal(window, null)
    assert.match(reason, /0 of 6/)
  })

  await t.test('accepts a properly spaced record and returns the LAST three', () => {
    const mocks = [mock(1, 40, 80), mock(2, 34, 82), mock(3, 28, 84), mock(4, 22, 86), mock(5, 14, 88, { source: 'official' }), mock(6, 4, 90)]
    const { window } = qualifyingWindow({ config: CSA, mocks, now: NOW })
    assert.deepEqual(window.map((m) => m.id), [4, 5, 6])
  })
})

// ---------------------------------------------------------------------------
// Each performance floor blocks on its own
// ---------------------------------------------------------------------------

/** Six well-spaced mocks at a given composite, with an official one inside the judged window. */
function sixMocks(composites) {
  return composites.map((c, i) => mock(i + 1, 40 - i * 7, c, i === 4 ? { source: 'official' } : {}))
}

function assess({ composites, attempts, config = CSA, calibrated = true, blanks }) {
  const mocks = sixMocks(composites)
  if (blanks != null) mocks[mocks.length - 1].blanks = blanks
  return computeReadiness({
    config,
    mocks,
    attempts: attempts ?? passingAttempts([4, 5, 6], config),
    coverage: FULL_COVERAGE,
    calibrated,
    now: NOW,
  })
}

test('performance floors', async (t) => {
  await t.test('a mean below the floor blocks readiness', () => {
    const r = assess({ composites: [80, 80, 80, 79, 79, 79] })
    assert.equal(r.ready, false)
    assert.equal(r.first_unmet, 'composite_mean')
  })

  await t.test('one weak sitting blocks even when the mean passes', () => {
    // mean 84 clears 82, but the 70 sits under the 78 floor.
    const r = assess({ composites: [85, 85, 85, 92, 90, 70] })
    assert.equal(r.ready, false)
    const floor = r.criteria.find((c) => c.id === 'composite_floor')
    assert.equal(floor.met, false)
  })

  await t.test('a steep decline blocks even with a passing mean and floor', () => {
    const r = assess({ composites: [85, 85, 85, 95, 94, 85] })
    const nd = r.criteria.find((c) => c.id === 'non_declining')
    assert.equal(nd.met, false, '9-point drop exceeds the 5-point tolerance')
    assert.equal(r.ready, false)
  })

  await t.test('one untested unit blocks readiness and is named', () => {
    // Unit 4 never appears under mock conditions.
    const attempts = passingAttempts([4, 5, 6]).filter((a) => a.unit !== '4')
    const r = assess({ composites: [90, 90, 90, 90, 90, 90], attempts })
    const u4 = r.criteria.find((c) => c.id === 'unit_4')
    assert.equal(u4.met, false)
    assert.match(u4.detail, /never tested/)
    assert.equal(r.ready, false)
  })

  await t.test('a weak unit blocks even when the overall MCQ score is strong', () => {
    const attempts = passingAttempts([4, 5, 6]).map((a) =>
      a.unit === '3' ? { ...a, correct: 0 } : a,
    )
    const r = assess({ composites: [90, 90, 90, 90, 90, 90], attempts })
    const u3 = r.criteria.find((c) => c.id === 'unit_3')
    assert.equal(u3.met, false)
    assert.equal(u3.detail, '0% of 150')
    assert.equal(r.ready, false)
  })

  await t.test('the dominant practice is held to a higher bar than the others', () => {
    const p3 = CSA.readiness.dominant_practice_min
    const other = CSA.readiness.other_practice_min
    assert.ok(p3 > other, 'P3 must be the strictest practice floor')
    // 80% on everything: clears the 70 floor for most, misses P3's 85.
    const attempts = passingAttempts([4, 5, 6]).map((a, i) => ({ ...a, correct: i % 5 === 0 ? 0 : 1 }))
    const r = assess({ composites: [90, 90, 90, 90, 90, 90], attempts })
    assert.equal(r.criteria.find((c) => c.id === 'practice_P3').met, false)
    assert.equal(r.criteria.find((c) => c.id === 'practice_P1').met, true)
  })

  await t.test('two blank responses block readiness', () => {
    const r = assess({ composites: [90, 90, 90, 90, 90, 90], blanks: 2 })
    assert.equal(r.criteria.find((c) => c.id === 'blanks').met, false)
    assert.equal(r.ready, false)
  })

  await t.test('stale evidence blocks readiness: a valid window can still be too old', () => {
    // The last three sittings span 24 days, so they form a legitimate window —
    // but the newest is 70 days old, so it says nothing about today.
    const mocks = [90, 90, 90, 91, 92, 93].map((c, i) => mock(i + 1, 130 - i * 12, c, i === 4 ? { source: 'official' } : {}))
    const { window } = qualifyingWindow({ config: CSA, mocks, now: NOW })
    assert.notEqual(window, null, 'a 24-day span is a valid window')
    const r = computeReadiness({ config: CSA, mocks, attempts: passingAttempts([4, 5, 6]), coverage: FULL_COVERAGE, calibrated: true, now: NOW })
    assert.equal(r.first_unmet, 'freshness')
    assert.equal(r.ready, false)
  })

  await t.test('a window stretched beyond the max span is rejected outright', () => {
    // Last three at 100, 55 and 5 days ago: a 95-day spread, so the earliest
    // score is too old to be evidence about the same student.
    const daysAgo = [160, 140, 120, 100, 55, 5]
    const mocks = daysAgo.map((d, i) => mock(i + 1, d, 90, i === 0 ? { source: 'official' } : {}))
    const { window, reason } = qualifyingWindow({ config: CSA, mocks, now: NOW })
    assert.equal(window, null)
    assert.match(reason, /stale beyond 42/)
  })
})

// ---------------------------------------------------------------------------
// FRQ quarantine
// ---------------------------------------------------------------------------

test('an uncalibrated FRQ grader blocks 100% and says why', () => {
  const r = assess({ composites: [90, 90, 90, 92, 93, 94], calibrated: false })
  const frq = r.criteria.find((c) => c.id === 'frq')
  assert.equal(frq.met, false)
  assert.match(frq.detail, /not yet calibrated/)
  assert.equal(r.ready, false)
  assert.ok(r.readiness_pct < 100)
})

// ---------------------------------------------------------------------------
// The one path to 100
// ---------------------------------------------------------------------------

test('100% requires every criterion at once, and reports ready', () => {
  const mocks = sixMocks([90, 90, 90, 92, 93, 94])
  // The free-response rows carry a recorded rubric verdict — a model-graded kind
  // the bank really contains, marked graded_by 'model_scored'. grade.js cannot
  // write that yet (see frqRun and ungradedFrqRun); until it can, no real record
  // reaches 100, which is the honest state rather than a fixture bug.
  const attempts = [...passingAttempts([4, 5, 6]), ...[4, 5, 6].flatMap((mock_id) => frqRun({ mock_id }))]
  const r = computeReadiness({ config: CSA, mocks, attempts, coverage: FULL_COVERAGE, calibrated: true, now: NOW })

  assert.equal(r.first_unmet, null, `unmet: ${JSON.stringify(r.criteria.filter((c) => !c.met), null, 1)}`)
  assert.equal(r.ready, true)
  assert.equal(r.readiness_pct, 100)
})

test('readiness never reports 100 while any criterion is unmet', () => {
  // Fail exactly one of many criteria; rounding must not paper over it.
  const r = assess({ composites: [90, 90, 90, 92, 93, 94], blanks: 5 })
  assert.ok(r.readiness_pct <= 99, `got ${r.readiness_pct}`)
  assert.equal(r.ready, false)
})

// ---------------------------------------------------------------------------
// Precalc: same engine, different config
// ---------------------------------------------------------------------------

test('Precalc uses calculator/no-calculator halves instead of practices', () => {
  const mocks = [70, 72, 74, 76, 78, 80].map((c, i) => ({
    ...mock(i + 1, 40 - i * 7, c, i === 4 ? { source: 'official' } : {}),
    subject: 'ap_precalc',
  }))
  const attempts = passingAttempts([4, 5, 6], PRECALC)
  const r = computeReadiness({ config: PRECALC, mocks, attempts, coverage: { topics_total: 10, topics_drilled: 10 }, calibrated: true, now: NOW })

  assert.ok(r.criteria.some((c) => c.id === 'calc_0'), 'must check the no-calculator half')
  assert.ok(r.criteria.some((c) => c.id === 'calc_1'), 'must check the calculator half')
  assert.ok(!r.criteria.some((c) => c.id.startsWith('practice_')), 'Precalc has no practice floors')
  assert.ok(!r.criteria.some((c) => c.id === 'unit_4'), 'Unit 4 is class-only and excluded from readiness')
})

test('a weak no-calculator half blocks Precalc readiness', () => {
  const mocks = [70, 72, 74, 76, 78, 80].map((c, i) => ({
    ...mock(i + 1, 40 - i * 7, c, i === 4 ? { source: 'official' } : {}),
    subject: 'ap_precalc',
  }))
  // Everything right on the calculator half, everything wrong without one.
  const attempts = passingAttempts([4, 5, 6], PRECALC).map((a) => ({ ...a, correct: a.calc_allowed === 0 ? 0 : 1 }))
  const r = computeReadiness({ config: PRECALC, mocks, attempts, coverage: { topics_total: 10, topics_drilled: 10 }, calibrated: true, now: NOW })

  assert.equal(r.criteria.find((c) => c.id === 'calc_0').met, false)
  assert.equal(r.criteria.find((c) => c.id === 'calc_1').met, true)
  assert.equal(r.ready, false)
})

test('the burnout guard advises rest without relabelling the evidence', () => {
  const mocks = sixMocks([90, 90, 90, 95, 90, 85])
  const r = computeReadiness({ config: CSA, mocks, attempts: passingAttempts([4, 5, 6]), coverage: FULL_COVERAGE, calibrated: true, now: NOW })
  assert.equal(r.advisories.length, 1)
  assert.match(r.advisories[0], /fatigue/)
})

test('both subject configs set a floor for every dimension they score', () => {
  for (const [name, cfg] of [['ap_csa', CSA], ['ap_precalc', PRECALC]]) {
    const r = cfg.readiness
    for (const key of ['composite_mean_min', 'composite_floor_min', 'mcq_overall_min', 'per_unit_min', 'frq_min_pct', 'max_blanks', 'consecutive_qualifying_mocks', 'freshness_days']) {
      assert.equal(typeof r[key], 'number', `${name} is missing ${key}`)
    }
    assert.ok(r.composite_floor_min <= r.composite_mean_min, `${name}: floor cannot exceed the mean requirement`)
    assert.ok(r.require_official_mock, `${name} must require an official mock`)
  }
})

// ---------------------------------------------------------------------------
// The official anchor has to be INSIDE the window that gets judged
// ---------------------------------------------------------------------------

test('official anchoring is a property of the judged window, not of the logbook', async (t) => {
  await t.test('a bank-only window is rejected even though an official mock was logged once', () => {
    // One official sitting 300 days ago, then a clean, well-spaced run of bank
    // mocks. The window is 100% bank-sourced, so nothing anchors its difficulty.
    const mocks = record([300, 60, 50, 45, 22, 14, 4], { official: 0 })
    const { window, reason } = qualifyingWindow({ config: CSA, mocks, now: NOW })
    assert.equal(window, null, 'a window of three bank mocks is not anchored')
    assert.match(reason, /official/)

    const r = computeReadiness({
      config: CSA, mocks, attempts: passingAttempts([5, 6, 7]),
      coverage: FULL_COVERAGE, calibrated: true, now: NOW,
    })
    assert.equal(r.readiness_pct, 0, 'this reported 100% ready before the window was checked')
    assert.equal(r.ready, false)
    assert.equal(r.first_unmet, 'mock_window')
  })

  await t.test('even a recent official mock does not anchor a window it is not part of', () => {
    const mocks = record([60, 50, 40, 30, 20, 10], { official: 2 })
    const { window, reason } = qualifyingWindow({ config: CSA, mocks, now: NOW })
    assert.equal(window, null)
    assert.match(reason, /official/)
  })

  await t.test('an official mock anywhere inside the window anchors it', () => {
    for (const official of [3, 4, 5]) {
      const mocks = record([60, 50, 40, 30, 20, 10], { official })
      const { window } = qualifyingWindow({ config: CSA, mocks, now: NOW })
      assert.deepEqual(window?.map((m) => m.id), [4, 5, 6], `official at index ${official}`)
    }
  })
})

// ---------------------------------------------------------------------------
// The window search: don't give up on the first candidate, don't skip fresh
// evidence either
// ---------------------------------------------------------------------------

test('window search', async (t) => {
  await t.test('a lone recent sitting does not erase a judgeable block behind it', () => {
    // The last three (62, 55 and 50 days ago plus one at 2 days) span 60 days,
    // so they are not one coherent block. 62/55/50 is. Judging it gives real
    // measured numbers plus an honest freshness failure, rather than reporting
    // that nothing about this student is measurable.
    const mocks = record([200, 150, 100, 62, 55, 50, 2], { official: 4 })
    const { window } = qualifyingWindow({ config: CSA, mocks, now: NOW })
    assert.deepEqual(window?.map((m) => m.id), [4, 5, 6])

    const r = computeReadiness({
      config: CSA, mocks, attempts: passingAttempts([4, 5, 6]),
      coverage: FULL_COVERAGE, calibrated: true, now: NOW,
    })
    const mean = r.criteria.find((c) => c.id === 'composite_mean')
    assert.equal(mean.pending, undefined, 'the window is measurable, so nothing is pending')
    assert.equal(mean.met, true)
    assert.equal(r.first_unmet, 'freshness', 'the honest failure is freshness, not "no window"')
    assert.ok(r.readiness_pct > 0 && r.readiness_pct <= 99, `got ${r.readiness_pct}`)
  })

  await t.test('a bunched-up recent block is never stepped over for older, better scores', () => {
    // Three sittings at 95 a month ago, then three at 50 in the last two days.
    // Falling back to the older block would report ready while ignoring every
    // fresh piece of evidence — the overstatement this module exists to prevent.
    const mocks = record([40, 30, 20, 2, 1, 0], { official: 2, composites: [95, 95, 95, 50, 50, 50] })
    const { window, reason } = qualifyingWindow({ config: CSA, mocks, now: NOW })
    assert.equal(window, null)
    assert.match(reason, /cram/)
    const r = computeReadiness({
      config: CSA, mocks, attempts: passingAttempts([1, 2, 3]),
      coverage: FULL_COVERAGE, calibrated: true, now: NOW,
    })
    assert.equal(r.ready, false)
    assert.equal(r.readiness_pct, 0)
  })

  await t.test('a crammed recent block is not stepped over even when it starts a new block', () => {
    // R3 asked only whether the IMMEDIATELY newer sitting was more than
    // window_span_days_max away. Here it is — 50 days ago to 2 days ago is a
    // 48-day gap — so the search stepped over all THREE fresh sittings and
    // judged the stale 95s: readiness_pct 94, composite_mean "95.0%", and
    // yesterday's three 50s ignored entirely. The most recent evidence must
    // never be ignorable: three crammed sittings cannot be judged, and that is
    // what the report has to say.
    const mocks = record([62, 55, 50, 2, 1, 0], { official: 2, composites: [95, 95, 95, 50, 50, 50] })
    const { window, reason } = qualifyingWindow({ config: CSA, mocks, now: NOW })
    assert.equal(window, null, 'the three newest sittings are the evidence, and they are a cram')
    assert.match(reason, /cram/)

    const r = computeReadiness({
      config: CSA, mocks, attempts: passingAttempts([1, 2, 3]),
      coverage: FULL_COVERAGE, calibrated: true, now: NOW,
    })
    assert.equal(r.readiness_pct, 0, 'nothing is measurable, so nothing may be reported as measured')
    assert.equal(r.first_unmet, 'mock_window')
    const mean = r.criteria.find((c) => c.id === 'composite_mean')
    assert.equal(mean.pending, true, 'the stale 95s must not be reported as this window')
    assert.ok(!/95/.test(mean.detail), `stale composite reported as current: ${mean.detail}`)
  })

  await t.test('an earlier block can never be reported as ready', () => {
    // The only sittings a window may skip are ones separated from it by more
    // than window_span_days_max, which is why freshness_days must not exceed
    // that: the fallback window is then always too old to claim today.
    for (const [name, cfg] of [['ap_csa', CSA], ['ap_precalc', PRECALC]]) {
      assert.ok(
        cfg.readiness.freshness_days <= cfg.readiness.window_span_days_max,
        `${name}: freshness_days must not exceed window_span_days_max`,
      )
    }
    const mocks = record([120, 100, 62, 55, 50, 2], { official: 3 })
    const r = computeReadiness({
      config: CSA, mocks, attempts: [...passingAttempts([3, 4, 5]), ...[3, 4, 5].flatMap((mock_id) => frqRun({ mock_id }))],
      coverage: FULL_COVERAGE, calibrated: true, now: NOW,
    })
    assert.deepEqual(qualifyingWindow({ config: CSA, mocks, now: NOW }).window?.map((m) => m.id), [3, 4, 5])
    assert.equal(r.criteria.find((c) => c.id === 'freshness').met, false)
    assert.equal(r.ready, false)
  })

  await t.test('a properly spaced run of 4 is still short of the 6 logged mocks required', () => {
    const four = record([40, 30, 20, 10])
    const { window, reason } = qualifyingWindow({ config: CSA, mocks: four, now: NOW })
    assert.equal(window, null, '4 is enough for a 3-mock window but not enough evidence overall')
    assert.match(reason, /only 4 of 6/)

    const five = record([50, 40, 30, 20, 10])
    assert.match(qualifyingWindow({ config: CSA, mocks: five, now: NOW }).reason, /only 5 of 6/)

    const six = record([60, 50, 40, 30, 20, 10])
    assert.notEqual(qualifyingWindow({ config: CSA, mocks: six, now: NOW }).window, null, 'exactly 6 qualifies')
  })

  await t.test('a block of exactly the required length is judged, not passed over', () => {
    // A block is only ever passed over for being too SHORT to judge. One holding
    // exactly consecutive_qualifying_mocks sittings is judgeable, so it must be
    // judged: skipping it would reach back for older numbers again.
    const mocks = record([200, 150, 145, 62, 55, 50, 2], { official: 4 })
    const { window } = qualifyingWindow({ config: CSA, mocks, now: NOW })
    assert.deepEqual(window?.map((m) => m.id), [4, 5, 6], 'the 62/55/50 block is exactly 3 sittings and qualifies')
  })

  await t.test('a config asking for more consecutive mocks than it logs reports the shortfall', () => {
    // Unreachable on shipped config — total_logged_mocks_min is 6 for CSA and 4
    // for Precalc, both above the 3 consecutive mocks a window needs — but the
    // guard is kept, because every message below describes "the last 3 mocks"
    // and every candidate is a slice of exactly that length. Without it, a
    // config with a lower total would judge, and describe, a window shorter than
    // it claims. This config is the one that makes the guard live.
    const cfg = { ...CSA, readiness: { ...CSA.readiness, total_logged_mocks_min: 2 } }
    assert.ok(cfg.readiness.total_logged_mocks_min < cfg.readiness.consecutive_qualifying_mocks)
    const { window, reason } = qualifyingWindow({ config: cfg, mocks: record([30, 20]), now: NOW })
    assert.equal(window, null, 'two sittings can never form a three-mock window')
    assert.match(reason, /need 3 consecutive mocks, have 2/)
  })
})

// ---------------------------------------------------------------------------
// Every threshold, pinned at its exact boundary
// ---------------------------------------------------------------------------

const criterion = (r, id) => r.criteria.find((c) => c.id === id)

test('threshold boundaries', async (t) => {
  await t.test('composite mean: exactly 82 is met, 81.97 is not', () => {
    assert.equal(criterion(assess({ composites: [90, 90, 90, 83, 82, 81] }), 'composite_mean').met, true)
    assert.equal(criterion(assess({ composites: [90, 90, 90, 83, 82, 80.9] }), 'composite_mean').met, false)
  })

  await t.test('composite floor: exactly 78 is met, 77.9 is not', () => {
    assert.equal(criterion(assess({ composites: [90, 90, 90, 78, 86, 85] }), 'composite_floor').met, true)
    assert.equal(criterion(assess({ composites: [90, 90, 90, 77.9, 86, 85] }), 'composite_floor').met, false)
  })

  await t.test('decline: a drop of exactly 5 is tolerated, 5.1 is not', () => {
    assert.equal(criterion(assess({ composites: [90, 90, 90, 90, 85, 88] }), 'non_declining').met, true)
    assert.equal(criterion(assess({ composites: [90, 90, 90, 90, 84.9, 88] }), 'non_declining').met, false)
  })

  await t.test('blanks: exactly one blank is tolerated, two are not', () => {
    assert.equal(criterion(assess({ composites: [90, 90, 90, 92, 93, 94], blanks: 1 }), 'blanks').met, true)
    assert.equal(criterion(assess({ composites: [90, 90, 90, 92, 93, 94], blanks: 2 }), 'blanks').met, false)
  })

  await t.test('overall MCQ: exactly 80% is met, 79% is not', () => {
    const at = (right) => [4, 5, 6].flatMap((mock_id) => run({ mock_id, total: 100, right }))
    assert.equal(criterion(assess({ composites: [90, 90, 90, 90, 90, 90], attempts: at(80) }), 'mcq_overall').met, true)
    assert.equal(criterion(assess({ composites: [90, 90, 90, 90, 90, 90], attempts: at(79) }), 'mcq_overall').met, false)
  })

  await t.test('per unit: exactly 75% is met, 74.5% is not', () => {
    const at = (right) => [
      ...passingAttempts([4, 5, 6]).filter((a) => a.unit !== '3'),
      ...run({ mock_id: 4, total: 200, right, unit: '3' }),
    ]
    assert.equal(criterion(assess({ composites: [90, 90, 90, 90, 90, 90], attempts: at(150) }), 'unit_3').met, true)
    assert.equal(criterion(assess({ composites: [90, 90, 90, 90, 90, 90], attempts: at(149) }), 'unit_3').met, false)
  })

  await t.test('the dominant practice: exactly 85% is met, 84.5% is not', () => {
    const at = (right) => [
      ...passingAttempts([4, 5, 6]).filter((a) => a.practice !== 'P3'),
      ...run({ mock_id: 4, total: 200, right, practice: 'P3' }),
    ]
    assert.equal(criterion(assess({ composites: [90, 90, 90, 90, 90, 90], attempts: at(170) }), 'practice_P3').met, true)
    assert.equal(criterion(assess({ composites: [90, 90, 90, 90, 90, 90], attempts: at(169) }), 'practice_P3').met, false)
  })

  await t.test('the no-calculator half: exactly 65% is met, 64.5% is not', () => {
    const mocks = [70, 72, 74, 76, 78, 80].map((c, i) => ({
      ...mock(i + 1, 40 - i * 7, c, i === 4 ? { source: 'official' } : {}),
      subject: 'ap_precalc',
    }))
    const judge = (right) =>
      computeReadiness({
        config: PRECALC,
        mocks,
        attempts: [
          ...passingAttempts([4, 5, 6], PRECALC).filter((a) => a.calc_allowed !== 0),
          ...run({ mock_id: 4, total: 200, right, calc_allowed: 0 }),
        ],
        coverage: { topics_total: 10, topics_drilled: 10 },
        calibrated: true,
        now: NOW,
      })
    assert.equal(criterion(judge(130), 'calc_0').met, true)
    assert.equal(criterion(judge(129), 'calc_0').met, false)
  })

  await t.test('free response: exactly 85% is met, 84.5% is not', () => {
    const at = (right) => [...passingAttempts([4, 5, 6]), ...frqRun({ mock_id: 4, total: 200, right })]
    assert.equal(criterion(assess({ composites: [90, 90, 90, 92, 93, 94], attempts: at(170) }), 'frq').met, true)
    assert.equal(criterion(assess({ composites: [90, 90, 90, 92, 93, 94], attempts: at(169) }), 'frq').met, false)
  })

  await t.test('freshness: exactly 42 days old is met, 42.1 is not', () => {
    const judge = (age) =>
      computeReadiness({
        config: CSA,
        mocks: record([120, 100, 80, 70, 60, age], { official: 4 }),
        attempts: passingAttempts([4, 5, 6]),
        coverage: FULL_COVERAGE,
        calibrated: true,
        now: NOW,
      })
    assert.equal(criterion(judge(42), 'freshness').met, true)
    assert.equal(criterion(judge(42.1), 'freshness').met, false)
  })

  await t.test('window span: exactly 10 days qualifies, 9.96 does not', () => {
    const at = (newest) => record([60, 50, 40, 20, 15, newest], { official: 4 })
    assert.notEqual(qualifyingWindow({ config: CSA, mocks: at(10), now: NOW }).window, null, '10 days is not a cram')
    assert.equal(qualifyingWindow({ config: CSA, mocks: at(10.04), now: NOW }).window, null)
  })

  await t.test('window span: exactly 42 days qualifies, 42.04 does not', () => {
    const at = (oldest) => record([120, 100, 80, oldest, 30, 2], { official: 3 })
    assert.notEqual(qualifyingWindow({ config: CSA, mocks: at(44), now: NOW }).window, null, '42 days is not yet stale')
    assert.equal(qualifyingWindow({ config: CSA, mocks: at(44.04), now: NOW }).window, null)
  })

  await t.test('the gap that starts a new block: 42.0 days does not, 42.04 does', () => {
    // The ONLY sittings a candidate window may leave out are ones separated from
    // it by more than window_span_days_max: they belong to a later block of
    // practice, and a block too small to judge (one sitting here) hides nothing.
    // At exactly the limit the newest sitting still belongs WITH the run behind
    // it, so that run cannot be judged without it — and with it the span is 47
    // days, which is stale. This is the boundary of the whole rule, so it is
    // pinned from both sides.
    const at = (newest) => record([120, 100, 62, 55, 50, newest], { official: 3 })
    assert.equal(
      daysBetween(at(8)[4].started_at, at(8)[5].started_at),
      42,
      'the gap under test is exactly window_span_days_max',
    )
    assert.equal(
      qualifyingWindow({ config: CSA, mocks: at(8), now: NOW }).window,
      null,
      'a 42.0-day gap does not start a new block, so the 8-day sitting is part of the run and stretches it to 47 days',
    )
    assert.deepEqual(
      qualifyingWindow({ config: CSA, mocks: at(7.96), now: NOW }).window?.map((m) => m.id),
      [3, 4, 5],
      'a 42.04-day gap starts a new block, and one sitting alone can never be judged',
    )
  })
})

// ---------------------------------------------------------------------------
// A displayed number may never contradict the verdict printed beside it
// ---------------------------------------------------------------------------

test('displayed numbers agree with the verdict', async (t) => {
  await t.test('a mean of 81.96 is not printed as 82.0 next to a failure', () => {
    const c = criterion(assess({ composites: [90, 90, 90, 82.4, 82.4, 81.08] }), 'composite_mean')
    assert.equal(c.met, false, '81.96 does not meet an 82 bar')
    assert.equal(c.detail, '81.9%')
  })

  await t.test('a floor of 77.96 is not printed as 78.0 next to a failure', () => {
    const c = criterion(assess({ composites: [90, 90, 90, 77.96, 86, 85] }), 'composite_floor')
    assert.equal(c.met, false)
    assert.equal(c.detail, '77.9%')
  })

  await t.test('a drop of 5.04 is not printed as 5.0 next to a failure', () => {
    const c = criterion(assess({ composites: [90, 90, 90, 90, 84.96, 88] }), 'non_declining')
    assert.equal(c.met, false)
    assert.equal(c.detail, 'worst drop 5.1 pts')
  })

  await t.test('an MCQ score of 79.96 is not printed as 80.0 next to a failure', () => {
    const attempts = run({ mock_id: 4, total: 2500, right: 1999 })
    const c = criterion(assess({ composites: [90, 90, 90, 90, 90, 90], attempts }), 'mcq_overall')
    assert.equal(c.met, false)
    assert.equal(c.detail, '79.9% of 2500')
  })

  await t.test('a unit at 74.5 is not printed as 75 next to a failure', () => {
    const attempts = [
      ...passingAttempts([4, 5, 6]).filter((a) => a.unit !== '3'),
      ...run({ mock_id: 4, total: 200, right: 149, unit: '3' }),
    ]
    const c = criterion(assess({ composites: [90, 90, 90, 90, 90, 90], attempts }), 'unit_3')
    assert.equal(c.met, false)
    assert.equal(c.detail, '74% of 200')
  })

  await t.test('free response at 84.5 is not printed as 85 next to a failure', () => {
    const attempts = [...passingAttempts([4, 5, 6]), ...frqRun({ mock_id: 4, total: 200, right: 169 })]
    const c = criterion(assess({ composites: [90, 90, 90, 92, 93, 94], attempts }), 'frq')
    assert.equal(c.met, false)
    assert.equal(c.detail, '84%')
  })

  await t.test('a mock 42.4 days old is not printed as 42 days next to a failure', () => {
    const r = computeReadiness({
      config: CSA,
      mocks: record([120, 100, 80, 70, 60, 42.4], { official: 4 }),
      attempts: passingAttempts([4, 5, 6]),
      coverage: FULL_COVERAGE, calibrated: true, now: NOW,
    })
    const c = criterion(r, 'freshness')
    assert.equal(c.met, false)
    assert.equal(c.detail, '43 days ago')
  })

  await t.test('a span rejection message cannot assert its own threshold is met', () => {
    const { reason } = qualifyingWindow({ config: CSA, mocks: record([60, 50, 40, 20, 15, 10.04], { official: 4 }), now: NOW })
    assert.match(reason, /9\.9 days/)
    assert.ok(!reason.includes('10.0'), reason)
  })

  await t.test('a staleness message cannot round itself back under the threshold', () => {
    const { reason } = qualifyingWindow({ config: CSA, mocks: record([120, 100, 80, 44.04, 30, 2], { official: 3 }), now: NOW })
    assert.match(reason, /42\.1 days/)
    assert.match(reason, /stale beyond 42/)
  })
})

// ---------------------------------------------------------------------------
// Free response: the kinds the bank actually contains
// ---------------------------------------------------------------------------

test('calibrated free-response evidence counts the kinds the bank really stores', async (t) => {
  await t.test('every model-graded kind can satisfy the criterion', () => {
    for (const kind of MODEL_GRADED) {
      const attempts = [...passingAttempts([4, 5, 6]), ...[4, 5, 6].flatMap((mock_id) => frqRun({ mock_id, kind }))]
      const r = assess({ composites: [90, 90, 90, 92, 93, 94], attempts })
      assert.equal(criterion(r, 'frq').met, true, `${kind}: ${criterion(r, 'frq').detail}`)
      assert.equal(r.ready, true, `${kind} should be able to complete the record`)
    }
  })

  await t.test("the bank's own free-response kind is one of them", () => {
    // Every free-response item in the bank is 'constructed_model_graded'; the
    // literal 'frq' appears nowhere in the content, so filtering on it alone
    // means real free-response work could never satisfy the criterion.
    assert.ok(MODEL_GRADED.has('constructed_model_graded'))
    const attempts = [...passingAttempts([4, 5, 6]), ...[4, 5, 6].flatMap((mock_id) => frqRun({ mock_id }))]
    assert.equal(criterion(assess({ composites: [90, 90, 90, 92, 93, 94], attempts }), 'frq').detail, '100%')
  })

  await t.test('an uncalibrated grader leaves the criterion pending, not failed', () => {
    const c = criterion(assess({ composites: [90, 90, 90, 92, 93, 94], calibrated: false }), 'frq')
    assert.equal(c.met, false)
    assert.equal(c.pending, true, 'unmeasurable is not the same as fallen short')
    assert.match(c.detail, /not yet calibrated/)
  })
})

// ---------------------------------------------------------------------------
// An FRQ attempt that was never scored is not a score of zero
// ---------------------------------------------------------------------------

test('unscored free-response work is reported as unmeasured, never as 0%', async (t) => {
  await t.test('grade.js books rubric work unscored, and a calibrated grader must not read that as zero', () => {
    // attempts.correct is NOT NULL, so the row grade.js writes for every rubric
    // item is correct: 0 with graded_by 'model'. Nothing writes a verdict back.
    // Reading those rows as data told the student he scored 0% on free response
    // when in fact nothing had been graded — the same false negative
    // isServerGraded() exists to prevent, one layer up.
    const booked = grade({ kind: 'constructed_model_graded', answer: null }, 'a full worked response')
    assert.equal(booked.graded_by, 'model')
    assert.equal(booked.correct, 0, 'the placeholder that made the 0% report possible')

    const attempts = [...passingAttempts([4, 5, 6]), ...[4, 5, 6].flatMap((mock_id) => ungradedFrqRun({ mock_id }))]
    const c = criterion(assess({ composites: [90, 90, 90, 92, 93, 94], attempts }), 'frq')
    assert.equal(c.met, false)
    assert.equal(c.pending, true, 'never scored is not the same as scored zero')
    assert.ok(!/%/.test(c.detail), `a percentage over unscored rows: ${c.detail}`)
    assert.match(c.detail, /12 free-response attempts/)
    assert.match(c.detail, /none .*scored/)
  })

  await t.test('a recorded verdict is measured, and unscored work beside it is disclosed', () => {
    const attempts = [
      ...passingAttempts([4, 5, 6]),
      ...frqRun({ mock_id: 4, total: 10, right: 10 }),
      ...ungradedFrqRun({ mock_id: 5, total: 2 }),
    ]
    const c = criterion(assess({ composites: [90, 90, 90, 92, 93, 94], attempts }), 'frq')
    assert.equal(c.met, true, 'the scored rows are real evidence')
    assert.equal(c.detail, '100% of 10 scored; 2 not yet scored')
  })

  await t.test('no free-response evidence at all is a shortfall, not an unmeasured criterion', () => {
    // Distinct from the case above: here the student has produced no rubric work
    // to grade, which is a gap in HIS evidence — the same treatment an untested
    // unit gets. Pending is reserved for work he did that nothing ever scored.
    const c = criterion(assess({ composites: [90, 90, 90, 92, 93, 94] }), 'frq')
    assert.equal(c.met, false)
    assert.equal(c.pending, undefined, 'no attempts is a shortfall he can close, not a measurement gap')
    assert.equal(c.detail, 'no FRQ attempts in window')
  })

  await t.test('a recorded rubric verdict never leaks into a mechanical floor', () => {
    // A rubric verdict is model-graded however it is marked, so it may not move
    // an MCQ, per-unit or per-practice number — those are mechanical floors.
    const composites = [90, 90, 90, 92, 93, 94]
    const base = assess({ composites, attempts: passingAttempts([4, 5, 6]) })
    const withFrq = assess({
      composites,
      attempts: [...passingAttempts([4, 5, 6]), ...frqRun({ mock_id: 4, total: 40, right: 0 })],
    })
    assert.equal(criterion(withFrq, 'frq').detail, '0%', 'scored zero IS a verdict, and it fails')
    assert.equal(criterion(withFrq, 'frq').met, false)
    for (const id of ['mcq_overall', 'unit_2', 'practice_P3']) {
      assert.deepEqual(criterion(withFrq, id), criterion(base, id), `${id} moved on free-response evidence`)
    }
  })
})

// ---------------------------------------------------------------------------
// One criteria list, one definition of readiness_pct
// ---------------------------------------------------------------------------

test('the pending report and the evaluated report describe the same bar', () => {
  const evaluated = assess({ composites: [90, 90, 90, 92, 93, 94] })
  const pending = computeReadiness({ config: CSA, mocks: [], attempts: [], coverage: FULL_COVERAGE, now: NOW })
  assert.deepEqual(
    pending.criteria.map((c) => c.id),
    evaluated.criteria.map((c) => c.id),
    'a student with no window must see every requirement, in the same order',
  )
  const freshness = pending.criteria.find((c) => c.id === 'freshness')
  assert.ok(freshness, 'the 42-day mock-expiry requirement must be visible before there is a window')
  assert.match(freshness.label, /42 days/)
  assert.equal(freshness.pending, true)
})

test('readiness_pct is the share of that one list which is met', () => {
  const r = assess({ composites: [90, 90, 90, 92, 93, 94], calibrated: false })
  const met = r.criteria.filter((c) => c.met).length
  assert.equal(r.readiness_pct, Math.round((met / r.criteria.length) * 100))
  assert.ok(r.readiness_pct < 100, 'the pending FRQ criterion counts as unmet')
})

test('one day past the span limit changes the verdict but not what the number means', () => {
  // R4: 44 days of span reported 100 over 18 criteria; 45 days reported 0 over
  // 17, so the same field described two different quantities.
  const judge = (oldest) => {
    const mocks = record([120, 100, 80, oldest, 30, 2], { official: 3 })
    return computeReadiness({
      config: CSA,
      mocks,
      attempts: [...passingAttempts([4, 5, 6]), ...[4, 5, 6].flatMap((mock_id) => frqRun({ mock_id }))],
      coverage: FULL_COVERAGE, calibrated: true, now: NOW,
    })
  }
  const inside = judge(44)
  const outside = judge(45)
  assert.equal(inside.readiness_pct, 100)
  assert.equal(inside.ready, true)
  assert.equal(outside.readiness_pct, 0, 'no qualifying window means nothing has been measured')
  assert.equal(outside.first_unmet, 'mock_window')
  assert.deepEqual(outside.criteria.map((c) => c.id), inside.criteria.map((c) => c.id))
  assert.ok(
    outside.criteria.filter((c) => c.pending).length === outside.criteria.length - 2,
    'every performance check is reported as not yet measurable, none as failed',
  )
})
