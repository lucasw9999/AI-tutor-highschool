import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { renderDashboard, subjectSection, esc } from '../src/dashboard.js'
import { computeReadiness } from '../src/readiness.js'

const CSA = JSON.parse(readFileSync(new URL('../config/ap_csa.json', import.meta.url)))
const NOW = '2027-04-01T12:00:00Z'

function subject({ mocks = [], attempts = [], coverage = { topics_total: 53, topics_drilled: 10 }, config = CSA } = {}) {
  return {
    config,
    coverage,
    attempts,
    mocks,
    readiness: computeReadiness({ config, mocks, attempts, coverage, calibrated: false, now: NOW }),
  }
}

test('esc neutralises HTML so item content cannot inject markup', () => {
  assert.equal(esc('<script>alert(1)</script>'), '&lt;script&gt;alert(1)&lt;/script&gt;')
  assert.equal(esc('a & b'), 'a &amp; b')
  assert.equal(esc(`"quoted" and 'single'`), '&quot;quoted&quot; and &#39;single&#39;')
  assert.equal(esc(null), '')
})

test('a topic name containing angle brackets is escaped, not rendered', () => {
  // CSA topics legitimately mention generics like ArrayList<String>.
  const cfg = { ...CSA, display_name: 'AP CSA <ArrayList<String>>' }
  const html = subjectSection({ ...subject({ config: cfg }), now: NOW })
  assert.ok(!html.includes('<ArrayList'), 'raw angle brackets must not reach the page')
  assert.ok(html.includes('&lt;ArrayList'))
})

test('the page leads with the honest number and what is blocking it', () => {
  const html = renderDashboard({ subjects: [subject()], now: NOW })
  assert.match(html, /0<small>% ready<\/small>/)
  assert.match(html, /Blocked on:/)
  assert.match(html, /Every requirement/)
  assert.match(html, /does not move this number/, 'must state that drills cannot move readiness')
})

test('unmeasurable criteria are shown as pending, not as failures', () => {
  const html = renderDashboard({ subjects: [subject()], now: NOW })
  assert.match(html, /class="s pend"/, 'pending criteria need their own marker')
  assert.match(html, /not yet measurable/)
  assert.match(html, /not being reported as a failure/)
})

test('an uncalibrated FRQ criterion renders as pending, never as a false ✗ (H2)', () => {
  // Built directly, independent of readiness.js, so this test does not depend on
  // the readiness fixer's pending:true change having landed yet. The renderer
  // must be correct for a frq criterion in either calibration state.
  const criteria = [
    { id: 'coverage', label: 'Every exam-tested topic attempted at least once', met: true, detail: '53 of 53 topics' },
    { id: 'mock_window', label: '3 consecutive qualifying proctored mocks', met: true, detail: '3 mocks in window' },
    { id: 'freshness', label: 'Most recent mock within 42 days', met: true, detail: '1 days ago' },
    { id: 'composite_mean', label: 'Mean composite across 3 mocks ≥ 82%', met: true, detail: '90.0%' },
    {
      id: 'frq',
      label: 'Free response ≥ 85%',
      met: false,
      pending: true,
      detail: 'grader not yet calibrated against an officially scored response',
    },
  ]
  const readiness = { readiness_pct: 80, ready: false, first_unmet: 'frq', criteria, advisories: [] }
  const s = { config: CSA, readiness, coverage: { topics_total: 53, topics_drilled: 53 }, attempts: [], mocks: [], now: NOW }
  const html = subjectSection(s)
  assert.match(
    html,
    /<td class="s pend">·<\/td><td>Free response ≥ 85%<\/td>/,
    'an uncalibrated FRQ criterion must render with the neutral pending marker',
  )
  assert.ok(
    !html.includes('<td class="s nope">✗</td><td>Free response ≥ 85%</td>'),
    'FRQ must never render as a hard failure while it is merely uncalibrated',
  )
})

test('H1-DISPLAY regression: a displayed evidence value never reads as passing beside a failing mark', () => {
  // Lowest mock is 77.96 against a 78 floor. If readiness.js ever formats for
  // display without rounding before comparing, this shows "78.0%" next to a ✗ —
  // a value that reads as meeting the floor it just failed. Root cause lives in
  // readiness.js (owned by another fixer); this is a render-level tripwire.
  const mocks = [90, 90, 90, 92, 93, 77.96].map((c, i) => ({
    id: i + 1,
    subject: 'ap_csa',
    started_at: new Date(new Date(NOW).getTime() - (40 - i * 7) * 86400000).toISOString(),
    proctored: 1,
    source: i === 0 ? 'official' : 'bank',
    composite_pct: c,
    blanks: 0,
  }))
  const coverage = { topics_total: 53, topics_drilled: 53 }
  const readiness = computeReadiness({ config: CSA, mocks, attempts: [], coverage, calibrated: false, now: NOW })
  const html = subjectSection({ config: CSA, readiness, coverage, attempts: [], mocks, now: NOW })

  const row = html.match(/<td class="(s [a-z]+)">[^<]*<\/td><td>Lowest single mock[^<]*<\/td><td class="ev">([^<]*)<\/td>/)
  assert.ok(row, 'the composite-floor row must be present in the rendered table')
  const [, markClass, evidenceText] = row
  if (markClass === 's nope') {
    const shown = parseFloat(evidenceText)
    assert.ok(
      shown < CSA.readiness.composite_floor_min,
      `Evidence shows "${evidenceText}" beside a failing mark, which reads as meeting the ${CSA.readiness.composite_floor_min}% floor`,
    )
  }
})

test('a ready subject renders as ready, with no blocker box', () => {
  const mocks = [90, 90, 90, 92, 93, 94].map((c, i) => ({
    id: i + 1,
    subject: 'ap_csa',
    started_at: new Date(new Date(NOW).getTime() - (40 - i * 7) * 86400000).toISOString(),
    proctored: 1,
    // The official anchor must fall INSIDE the judged window (the most recent
    // 3 mocks, i.e. indices 3-5) — an official sitting outside that window
    // anchors nothing under the corrected readiness contract.
    source: i === 4 ? 'official' : 'bank',
    composite_pct: c,
    blanks: 0,
  }))
  const attempts = []
  for (const mock_id of [4, 5, 6]) {
    for (const unit of CSA.units) {
      for (const practice of CSA.practices) {
        for (let i = 0; i < 10; i++) attempts.push({ mock_id, kind: 'mcq', unit, practice, correct: 1, calc_allowed: 0 })
      }
    }
    for (let i = 0; i < 4; i++) attempts.push({ mock_id, kind: 'frq', unit: '2', practice: 'P3', correct: 1 })
  }
  const s = {
    config: CSA,
    coverage: { topics_total: 53, topics_drilled: 53 },
    attempts,
    mocks,
    readiness: computeReadiness({
      config: CSA, mocks, attempts,
      coverage: { topics_total: 53, topics_drilled: 53 },
      calibrated: true, now: NOW,
    }),
  }
  const html = renderDashboard({ subjects: [s], now: NOW })
  assert.match(html, /100<small>% ready/)
  assert.match(html, /Every requirement is met/)
  assert.ok(!html.includes('Blocked on:'))
  assert.match(html, /class="[^"]*ready"/)
})

test('mock history is listed with dates and official mocks flagged', () => {
  const mocks = [
    { id: 1, started_at: '2027-03-01T00:00:00Z', proctored: 1, source: 'official', composite_pct: 71.4, blanks: 0 },
    { id: 2, started_at: '2027-03-12T00:00:00Z', proctored: 1, source: 'bank', composite_pct: 76.8, blanks: 0 },
  ]
  const html = renderDashboard({ subjects: [subject({ mocks })], now: NOW })
  assert.match(html, /2027-03-01 · 71%/)
  assert.match(html, /official/)
  assert.match(html, /2027-03-12 · 77%/)
})

test('with no mocks, no mock-history section is rendered', () => {
  const html = renderDashboard({ subjects: [subject()], now: NOW })
  assert.ok(!html.includes('Mock history'))
})

test('an advisory is surfaced without changing the number', () => {
  const mocks = [95, 94, 93, 95, 90, 85].map((c, i) => ({
    id: i + 1,
    started_at: new Date(new Date(NOW).getTime() - (40 - i * 7) * 86400000).toISOString(),
    proctored: 1,
    // Official anchor inside the judged window (indices 3-5) — see the "ready
    // subject" fixture above for why.
    source: i === 4 ? 'official' : 'bank',
    composite_pct: c,
    blanks: 0,
  }))
  const s = subject({ mocks, coverage: { topics_total: 53, topics_drilled: 53 } })
  const html = renderDashboard({ subjects: [s], now: NOW })
  assert.match(html, /class="adv"/)
  assert.match(html, /fatigue/)
})

test('both subjects render on one page', () => {
  const PRECALC = JSON.parse(readFileSync(new URL('../config/ap_precalc.json', import.meta.url)))
  const html = renderDashboard({ subjects: [subject(), subject({ config: PRECALC })], now: NOW })
  assert.match(html, /AP Computer Science A/)
  assert.match(html, /AP Precalculus/)
})

test('the page is valid standalone HTML with no external requests', () => {
  const html = renderDashboard({ subjects: [subject()], now: NOW })
  assert.match(html, /^<!doctype html>/)
  assert.match(html, /<\/html>$/)
  assert.ok(!/<script/i.test(html), 'no JavaScript at all')
  assert.ok(!/https?:\/\//.test(html.replace(/<meta[^>]*>/g, '')), 'no external fetches')
  assert.match(html, /noindex/, 'must not be indexable')
})

test('the footer states the FRQ caveat plainly, and never claims FRQ is excluded (H2)', () => {
  // FRQ evidence still caps readiness at 99% / not-ready even when uncalibrated
  // (it stays an unmet — now pending — criterion), so the footer must not claim
  // it is "excluded from readiness". It must instead say plainly that FRQ cannot
  // count toward readiness yet, and that 100% is unreachable until calibrated.
  const html = renderDashboard({ subjects: [subject()], now: NOW })
  assert.ok(
    !html.includes('excluded from readiness'),
    'FRQ still blocks the number even when uncalibrated, so the footer must not claim it is excluded',
  )
  assert.match(html, /cannot count toward readiness/)
  assert.match(html, /100% readiness is not reachable/)
  assert.match(html, /calibrated against an officially scored College Board response/)
})

test('at 0% the bar is genuinely empty, not a misleading sliver', () => {
  const html = renderDashboard({ subjects: [subject()], now: NOW })
  assert.match(html, /style="width:0%"/, 'a 1% sliver would read as some progress')
})

// ---------------------------------------------------------------------------
// The page has to say WHEN, not just how much (GAP-5, METH-11, GAP-3)
//
// Every number on this page used to be a snapshot with no date on it except the
// mock chips. Six weeks of silence therefore looked exactly like a hard week: the
// same 0%, the same blocker, the same chips. Open gaps were passed in and not
// rendered at all, so a gap open since September looked like one opened today,
// and pace — the one thing that decides a timed exam and is invisible in a
// percentage — was nowhere.
// ---------------------------------------------------------------------------

test('the parent is told when he last worked, and for how long he has not', () => {
  const html = subjectSection({
    ...subject(),
    last_answer: { at: '2027-02-18T12:00:00Z', days: 42, on: '2027-02-18' },
    now: NOW,
  })
  assert.match(html, /2027-02-18/, 'the date of the last answer')
  assert.match(html, /42 days ago/, 'and how long ago that was, or the page is a snapshot again')
})

test('a subject with no answers at all says so, rather than showing nothing', () => {
  const html = subjectSection({ ...subject(), last_answer: null, now: NOW })
  assert.match(html, /No answers recorded/i)
  assert.ok(!html.includes('days ago'), 'and must not invent an age for evidence that does not exist')
})

test('an answer from today is not reported as an age', () => {
  const html = subjectSection({
    ...subject(),
    last_answer: { at: NOW, days: 0, on: '2027-04-01' },
    now: NOW,
  })
  assert.match(html, /today/i)
})

test('open gaps are rendered with their ages, oldest first', () => {
  const html = subjectSection({
    ...subject(),
    open_gaps: [
      { topic: '4.2', opened_at: '2027-01-05T00:00:00Z', days_open: 86, taught: true },
      { topic: '2.7', opened_at: '2027-03-28T00:00:00Z', days_open: 4, taught: false },
    ],
    now: NOW,
  })
  assert.match(html, /4\.2/)
  assert.match(html, /86 days/, 'a gap open since January is not the same as one opened this week')
  assert.match(html, /2\.7/)
  assert.match(html, /4 days/)
  assert.ok(html.indexOf('4.2') < html.indexOf('2.7'), 'oldest first, as it is handed over')
  assert.match(html, /awaiting a cold re-test|taught/i, 'and whether the lesson has been given')
})

test('with no open gaps the section is absent rather than empty', () => {
  const html = subjectSection({ ...subject(), open_gaps: [], now: NOW })
  assert.ok(!/Open gaps/i.test(html))
})

test('pace is shown whether or not it is bad enough to advise on', () => {
  const ok = subjectSection({
    ...subject(),
    pace: {
      n: 30, seconds: 110, target_seconds: 129, over_by_seconds: -19, projected_minutes: 77,
      section_questions: 42, budget_minutes: 90, measured: true, over: false,
    },
    now: NOW,
  })
  assert.match(ok, /110s/, 'the measured pace')
  assert.match(ok, /129s/, 'against the exam’s own target')
  assert.match(ok, /77 minutes/, 'and what it projects to over a real section')

  const slow = subjectSection({
    ...subject(),
    pace: {
      n: 30, seconds: 200, target_seconds: 129, over_by_seconds: 71, projected_minutes: 140,
      section_questions: 42, budget_minutes: 90, measured: true, over: true,
    },
    now: NOW,
  })
  assert.match(slow, /140 minutes/)
  assert.match(slow, /90/, 'against the budget the section gets')
})

test('a pace measured over too few answers is labelled, not presented as a finding', () => {
  const html = subjectSection({
    ...subject(),
    pace: {
      n: 3, seconds: 300, target_seconds: 129, over_by_seconds: 171, projected_minutes: 210,
      section_questions: 42, budget_minutes: 90, measured: false, over: false,
    },
    now: NOW,
  })
  assert.match(html, /3 answer/, 'the sample size has to be visible')
  assert.match(html, /not yet|too few/i, 'this project reports "not yet measurable" rather than guessing')
})

test('a sitting started and never submitted is visible on the parent page', () => {
  const html = subjectSection({
    ...subject(),
    unfinished_sittings: [
      { id: 7, section: 'I', started_at: '2027-03-30T09:00:00Z', answered: 12, open_minutes: 2880, budget_minutes: 90 },
    ],
    now: NOW,
  })
  assert.match(html, /#7/)
  assert.match(html, /never submitted/i)
  assert.match(html, /12 answer/, 'with what is on it, so it can be judged rather than guessed at')
  assert.match(html, /90 minutes/, 'against the budget it is past')
})
