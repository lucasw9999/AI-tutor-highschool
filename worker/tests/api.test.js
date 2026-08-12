import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { handleNext, handleLog, handleTaught, handleMockStart, handleMockSubmit, handleStatus, ApiError } from '../src/api.js'

const CSA = JSON.parse(readFileSync(new URL('../config/ap_csa.json', import.meta.url)))

/**
 * In-memory stand-in for the D1 layer, matching makeDb's surface. Deliberately
 * dumb: it exists to let the handlers be tested without a network, not to model
 * SQLite.
 */
function fakeDb({ items = [], topics = [], teaching = [], attempts = [], gaps = [], mocks = [] } = {}) {
  const state = { items, topics, teaching, attempts, gaps, mocks, serves: [], nextServe: 1, nextMock: 1 }
  const byId = new Map(items.map((i) => [i.id, i]))
  return {
    state,
    async items(subject) { return state.items.filter((i) => i.subject === subject) },
    async item(id) { return byId.get(id) ?? null },
    async attempts(subject) {
      return state.attempts
        .filter((a) => a.subject === subject)
        .map((a) => ({ ...a, kind: byId.get(a.item_id)?.kind, calc_allowed: byId.get(a.item_id)?.calc_allowed }))
        .sort((x, y) => new Date(x.ts) - new Date(y.ts))
    },
    async topics(subject) { return state.topics.filter((t) => t.subject === subject) },
    async teaching(subject) { return state.teaching.filter((t) => t.subject === subject) },
    async gaps(subject) { return state.gaps.filter((g) => g.subject === subject) },
    async mocks(subject) { return state.mocks.filter((m) => m.subject === subject) },
    async recordServe(s) {
      const row = { id: state.nextServe++, logged: 0, ...s }
      state.serves.push(row)
      return row.id
    },
    async serve(id) { return state.serves.find((s) => s.id === Number(id)) ?? null },
    async markServeLogged(id) { (await this.serve(id)).logged = 1 },
    async recordAttempt(a) { state.attempts.push(a) },
    async openGap(g) {
      if (!state.gaps.some((x) => x.subject === g.subject && x.topic === g.topic && !x.cleared_at)) {
        state.gaps.push({ ...g, taught_at: null, cleared_at: null })
      }
    },
    async markTaught({ subject, topic, taught_at }) {
      for (const g of state.gaps) if (g.subject === subject && g.topic === topic && !g.cleared_at) g.taught_at = taught_at
    },
    async clearGap({ subject, topic, cleared_at }) {
      for (const g of state.gaps) if (g.subject === subject && g.topic === topic && !g.cleared_at) g.cleared_at = cleared_at
    },
    async startMock(m) {
      const row = { id: state.nextMock++, composite_pct: null, blanks: null, ended_at: null, ...m }
      state.mocks.push(row)
      return row.id
    },
    async mock(id) { return state.mocks.find((m) => m.id === Number(id)) ?? null },
    async endMock({ id, ended_at, composite_pct, blanks }) {
      const m = await this.mock(id)
      Object.assign(m, { ended_at, composite_pct, blanks })
    },
  }
}

const ITEMS = ['t1', 't2'].flatMap((topic) =>
  [1, 2, 3, 4].map((i) => ({
    id: `${topic}-${i}`, subject: 'ap_csa', topic, unit: '1', practice: 'P3', kind: 'mcq',
    stem: `Question ${topic}-${i}`, options: { A: 'a', B: 'b', C: 'c', D: 'd' },
    answer: 'B', explanation: `Because of ${topic}.`, calc_allowed: 0,
  })),
)
const TOPICS = ['t1', 't2'].map((id) => ({ id, subject: 'ap_csa', unit: '1', tested_on_exam: 1, exam_weight_low: 20, exam_weight_high: 30 }))
const TEACHING = [{ subject: 'ap_csa', topic: 't1', plain_idea: 'The idea.', worked_example: 'The example.', common_mistake: 'The trap.' }]

const T0 = '2027-03-01T12:00:00Z'
const at = (sec) => new Date(new Date(T0).getTime() + sec * 1000).toISOString()

function ctx(over = {}) {
  return fakeDb({ items: ITEMS, topics: TOPICS, teaching: TEACHING, ...over })
}

/**
 * A single-topic bank. The gap tests need both misses to land on t1, and with
 * two topics available the selector correctly spends its early questions filling
 * coverage instead — so neither topic would reach the two-miss threshold.
 */
function ctxOneTopic() {
  return fakeDb({
    items: ITEMS.filter((i) => i.topic === 't1'),
    topics: TOPICS.filter((t) => t.id === 't1'),
    teaching: TEACHING,
  })
}

test('/next hands out a question and never leaks the answer', async () => {
  const db = ctx()
  const r = await handleNext({ db, subject: 'ap_csa', config: CSA, now: T0 })

  assert.equal(r.type, 'question')
  assert.ok(r.serve, 'must return a server-issued serve id')
  assert.ok(r.stem)
  assert.ok(r.why, 'must explain why this question')

  const blob = JSON.stringify(r)
  assert.ok(!('answer' in r), 'answer key must not be in the response')
  assert.ok(!blob.includes('Because of'), 'the explanation must not ship with the question')
})

test('every response carries the status summary', async () => {
  const db = ctx()
  const r = await handleNext({ db, subject: 'ap_csa', config: CSA, now: T0 })
  assert.ok(r.status, 'the kid should never have to ask where he stands')
  assert.equal(r.status.readiness_pct, 0)
  assert.ok(r.status.next_thing_blocking)
  assert.equal(typeof r.status.days_to_exam, 'number')
})

test('/log grades on the server and measures its own elapsed time', async () => {
  const db = ctx()
  const q = await handleNext({ db, subject: 'ap_csa', config: CSA, now: T0 })
  const r = await handleLog({ db, serveId: q.serve, response: 'b', config: CSA, now: at(42) })

  assert.equal(r.correct, true)
  assert.equal(r.graded_by, 'server')
  assert.equal(r.seconds, 42, 'derived from the serve row, not reported by the caller')
  assert.equal(r.explanation, `Because of ${db.state.attempts[0].topic}.`)
})

test('the model cannot fake timing: elapsed time ignores anything it sends', async () => {
  const db = ctx()
  const q = await handleNext({ db, subject: 'ap_csa', config: CSA, now: T0 })
  // handleLog takes no seconds parameter at all — the only clock is the server's.
  const r = await handleLog({ db, serveId: q.serve, response: 'B', seconds: 1, config: CSA, now: at(300) })
  assert.equal(r.seconds, 300)
})

test('a serve id can be spent exactly once', async () => {
  const db = ctx()
  const q = await handleNext({ db, subject: 'ap_csa', config: CSA, now: T0 })
  await handleLog({ db, serveId: q.serve, response: 'B', config: CSA, now: at(10) })
  await assert.rejects(
    () => handleLog({ db, serveId: q.serve, response: 'C', config: CSA, now: at(20) }),
    (e) => e instanceof ApiError && e.status === 409,
    'replaying a serve must be refused, not silently double-counted',
  )
  assert.equal(db.state.attempts.length, 1)
})

test('a fabricated serve id is refused', async () => {
  const db = ctx()
  await assert.rejects(
    () => handleLog({ db, serveId: 9999, response: 'B', config: CSA, now: T0 }),
    (e) => e instanceof ApiError && e.status === 404,
  )
})

test('a blank answer is recorded as blank rather than as a wrong guess', async () => {
  const db = ctx()
  const q = await handleNext({ db, subject: 'ap_csa', config: CSA, now: T0 })
  const r = await handleLog({ db, serveId: q.serve, response: '', config: CSA, now: at(5) })
  assert.equal(r.correct, false)
  assert.equal(r.blank, true)
})

test('a hinted answer is recorded as tutored, not cold', async () => {
  const db = ctx()
  const q = await handleNext({ db, subject: 'ap_csa', config: CSA, now: T0 })
  await handleLog({ db, serveId: q.serve, response: 'B', hints: true, config: CSA, now: at(5) })
  assert.equal(db.state.attempts[0].conditions, 'tutored')
  assert.equal(db.state.attempts[0].hints_used, 1)
})

// ---------------------------------------------------------------------------
// The teaching interrupt, end to end
// ---------------------------------------------------------------------------

test('two misses on a topic interrupt the drill with a lesson', async () => {
  const db = ctxOneTopic()
  // Miss two different questions on t1.
  for (const i of [1, 2]) {
    const q = await handleNext({ db, subject: 'ap_csa', config: CSA, now: at(i * 100) })
    await handleLog({ db, serveId: q.serve, response: 'A', config: CSA, now: at(i * 100 + 30) })
  }

  const r = await handleNext({ db, subject: 'ap_csa', config: CSA, now: at(400) })
  assert.equal(r.type, 'lesson', 'a third drill question would just produce a third wrong answer')
  assert.equal(r.lesson.plain_idea, 'The idea.')
  assert.equal(r.lesson.worked_example, 'The example.')
  assert.match(r.lesson.why_now, /2 different questions/)
})

test('a topic with no teaching material is flagged, not drilled blind', async () => {
  // t2 has no row in TEACHING.
  const db = ctx({ items: ITEMS.filter((i) => i.topic === 't2'), topics: TOPICS.filter((t) => t.id === 't2') })
  for (const i of [1, 2]) {
    const q = await handleNext({ db, subject: 'ap_csa', config: CSA, now: at(i * 100) })
    await handleLog({ db, serveId: q.serve, response: 'A', config: CSA, now: at(i * 100 + 30) })
  }
  const r = await handleNext({ db, subject: 'ap_csa', config: CSA, now: at(400) })
  assert.equal(r.type, 'lesson_missing')
  assert.equal(r.topic, 't2')
  assert.match(r.note, /no teaching material/)
})

test('after teaching, the next question on that topic is a cold re-test', async () => {
  const db = ctxOneTopic()
  for (const i of [1, 2]) {
    const q = await handleNext({ db, subject: 'ap_csa', config: CSA, now: at(i * 100) })
    await handleLog({ db, serveId: q.serve, response: 'A', config: CSA, now: at(i * 100 + 30) })
  }
  await handleNext({ db, subject: 'ap_csa', config: CSA, now: at(400) })   // lesson shown
  const t = await handleTaught({ db, subject: 'ap_csa', topic: 't1', config: CSA, now: at(500) })
  assert.match(t.next, /no hints/)

  const q = await handleNext({ db, subject: 'ap_csa', config: CSA, now: at(600) })
  assert.equal(q.type, 'question')
  assert.equal(q.topic, 't1')
  assert.match(q.why, /cold/i)
})

test('the gap closes on a cold correct answer, and not on a hinted one', async () => {
  const db = ctxOneTopic()
  for (const i of [1, 2]) {
    const q = await handleNext({ db, subject: 'ap_csa', config: CSA, now: at(i * 100) })
    await handleLog({ db, serveId: q.serve, response: 'A', config: CSA, now: at(i * 100 + 30) })
  }
  await handleNext({ db, subject: 'ap_csa', config: CSA, now: at(400) })
  await handleTaught({ db, subject: 'ap_csa', topic: 't1', config: CSA, now: at(500) })

  // Right, but with a hint: must NOT close.
  const q1 = await handleNext({ db, subject: 'ap_csa', config: CSA, now: at(600) })
  const r1 = await handleLog({ db, serveId: q1.serve, response: 'B', hints: true, config: CSA, now: at(630) })
  assert.equal(r1.gap_closed, null, 'a hinted answer shows recall, not understanding')

  // Right, unaided: closes.
  const q2 = await handleNext({ db, subject: 'ap_csa', config: CSA, now: at(700) })
  const r2 = await handleLog({ db, serveId: q2.serve, response: 'B', config: CSA, now: at(730) })
  assert.equal(r2.gap_closed, 't1')
  assert.ok(db.state.gaps.find((g) => g.topic === 't1').cleared_at)
})

// ---------------------------------------------------------------------------
// Mocks and readiness
// ---------------------------------------------------------------------------

test('/mock/start validates its inputs and states the rules', async () => {
  const db = ctx()
  const m = await handleMockStart({ db, subject: 'ap_csa', section: 'I', source: 'official', config: CSA, now: T0 })
  assert.ok(m.mock)
  assert.match(m.rules, /No hints/)
  assert.equal(db.state.mocks[0].proctored, 1)

  await assert.rejects(() => handleMockStart({ db, subject: 'ap_csa', section: 'III', source: 'bank', config: CSA, now: T0 }), ApiError)
  await assert.rejects(() => handleMockStart({ db, subject: 'ap_csa', section: 'I', source: 'guess', config: CSA, now: T0 }), ApiError)
})

test('a mock scores itself from its own logged answers', async () => {
  const db = ctx()
  const m = await handleMockStart({ db, subject: 'ap_csa', section: 'I', source: 'bank', config: CSA, now: T0 })
  // Four answers, three right.
  for (const [i, ans] of ['B', 'B', 'B', 'A'].entries()) {
    const q = await handleNext({ db, subject: 'ap_csa', config: CSA, now: at(i * 60), mockId: m.mock })
    await handleLog({ db, serveId: q.serve, response: ans, config: CSA, now: at(i * 60 + 40) })
  }
  const r = await handleMockSubmit({ db, mockId: m.mock, config: CSA, now: at(500) })
  assert.equal(r.composite_pct, 75)
  assert.equal(r.answered, 4)
  assert.match(r.basis, /Multiple choice only/)
})

test('a mock cannot be submitted twice, or submitted empty', async () => {
  const db = ctx()
  const m = await handleMockStart({ db, subject: 'ap_csa', section: 'I', source: 'bank', config: CSA, now: T0 })
  await assert.rejects(() => handleMockSubmit({ db, mockId: m.mock, config: CSA, now: at(10) }), (e) => e.status === 409)

  const q = await handleNext({ db, subject: 'ap_csa', config: CSA, now: at(20), mockId: m.mock })
  await handleLog({ db, serveId: q.serve, response: 'B', config: CSA, now: at(60) })
  await handleMockSubmit({ db, mockId: m.mock, config: CSA, now: at(100) })
  await assert.rejects(() => handleMockSubmit({ db, mockId: m.mock, config: CSA, now: at(200) }), (e) => e.status === 409)
})

test('answers inside a mock are recorded as proctored_mock', async () => {
  const db = ctx()
  const m = await handleMockStart({ db, subject: 'ap_csa', section: 'I', source: 'bank', config: CSA, now: T0 })
  const q = await handleNext({ db, subject: 'ap_csa', config: CSA, now: at(10), mockId: m.mock })
  await handleLog({ db, serveId: q.serve, response: 'B', config: CSA, now: at(50) })
  assert.equal(db.state.attempts[0].conditions, 'proctored_mock')
  assert.equal(db.state.attempts[0].mock_id, m.mock)
})

test('INTEGRATION: perfect drilling leaves readiness at 0 and names the reason', async () => {
  const db = ctx()
  // Answer every question correctly, outside any mock.
  for (let i = 0; i < ITEMS.length; i++) {
    const q = await handleNext({ db, subject: 'ap_csa', config: CSA, now: at(i * 100) })
    if (q.type !== 'question') continue
    await handleLog({ db, serveId: q.serve, response: 'B', config: CSA, now: at(i * 100 + 20) })
  }
  const s = await handleStatus({ db, subject: 'ap_csa', config: CSA, now: at(9999) })

  assert.equal(s.readiness_pct, 0, 'drills alone can never imply exam readiness')
  assert.equal(s.ready, false)
  assert.match(s.next_thing_blocking, /proctored mocks/)
  assert.match(s.what_100_means, /not "finished the material."/)
  assert.ok(s.criteria.length > 5, 'the full report lists every criterion')
})

test('/status explains what 100% would require, in the subject-specific numbers', async () => {
  const db = ctx()
  const s = await handleStatus({ db, subject: 'ap_csa', config: CSA, now: T0 })
  assert.match(s.what_100_means, new RegExp(`${CSA.readiness.composite_mean_min}%`))
  assert.match(s.what_100_means, /official College Board/)
  for (const c of s.criteria) {
    assert.equal(typeof c.requirement, 'string')
    assert.equal(typeof c.met, 'boolean')
    assert.ok(c.evidence != null, `criterion "${c.requirement}" must show its evidence`)
  }
})

test('an empty bank fails loudly instead of serving nothing', async () => {
  const db = fakeDb({ items: [], topics: TOPICS })
  await assert.rejects(
    () => handleNext({ db, subject: 'ap_csa', config: CSA, now: T0 }),
    (e) => e instanceof ApiError && e.status === 503,
  )
})
