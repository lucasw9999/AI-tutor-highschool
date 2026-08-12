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

test('a ready subject renders as ready, with no blocker box', () => {
  const mocks = [90, 90, 90, 92, 93, 94].map((c, i) => ({
    id: i + 1,
    subject: 'ap_csa',
    started_at: new Date(new Date(NOW).getTime() - (40 - i * 7) * 86400000).toISOString(),
    proctored: 1,
    source: i === 0 ? 'official' : 'bank',
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
    source: i === 0 ? 'official' : 'bank',
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

test('the footer states the FRQ caveat plainly', () => {
  const html = renderDashboard({ subjects: [subject()], now: NOW })
  assert.match(html, /advisory and excluded from readiness/)
  assert.match(html, /calibrated/)
})

test('at 0% the bar is genuinely empty, not a misleading sliver', () => {
  const html = renderDashboard({ subjects: [subject()], now: NOW })
  assert.match(html, /style="width:0%"/, 'a 1% sliver would read as some progress')
})
