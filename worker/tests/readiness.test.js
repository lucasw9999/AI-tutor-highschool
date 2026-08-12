import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { computeReadiness, qualifyingWindow, pct, breakdown, daysBetween } from '../src/readiness.js'

const CSA = JSON.parse(readFileSync(new URL('../config/ap_csa.json', import.meta.url)))
const PRECALC = JSON.parse(readFileSync(new URL('../config/ap_precalc.json', import.meta.url)))

const NOW = '2027-04-01T12:00:00Z'

/** A proctored mock with a composite score, n days before NOW. */
function mock(id, daysAgo, composite, extra = {}) {
  const started = new Date(new Date(NOW).getTime() - daysAgo * 86400000).toISOString()
  return { id, subject: 'ap_csa', started_at: started, proctored: 1, source: 'bank', composite_pct: composite, blanks: 0, ...extra }
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
    const mocks = [mock(1, 40, 80, { source: 'official' }), mock(2, 34, 82), mock(3, 28, 84), mock(4, 22, 86), mock(5, 14, 88), mock(6, 4, 90)]
    const { window } = qualifyingWindow({ config: CSA, mocks, now: NOW })
    assert.deepEqual(window.map((m) => m.id), [4, 5, 6])
  })
})

// ---------------------------------------------------------------------------
// Each performance floor blocks on its own
// ---------------------------------------------------------------------------

/** Six well-spaced mocks at a given composite, one of them official. */
function sixMocks(composites) {
  return composites.map((c, i) => mock(i + 1, 40 - i * 7, c, i === 0 ? { source: 'official' } : {}))
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
    const mocks = [90, 90, 90, 91, 92, 93].map((c, i) => mock(i + 1, 130 - i * 12, c, i === 0 ? { source: 'official' } : {}))
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
  const attempts = [
    ...passingAttempts([4, 5, 6]),
    ...[4, 5, 6].flatMap((mock_id) =>
      Array.from({ length: 4 }, () => ({ mock_id, kind: 'frq', unit: '2', practice: 'P3', correct: 1 })),
    ),
  ]
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
    ...mock(i + 1, 40 - i * 7, c, i === 0 ? { source: 'official' } : {}),
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
    ...mock(i + 1, 40 - i * 7, c, i === 0 ? { source: 'official' } : {}),
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
