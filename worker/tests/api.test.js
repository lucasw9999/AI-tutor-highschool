import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { handleNext, handleLog, handleTaught, handleMockStart, handleMockSubmit, handleStatus, ApiError } from '../src/api.js'

const CSA = JSON.parse(readFileSync(new URL('../config/ap_csa.json', import.meta.url)))
const PRECALC = JSON.parse(readFileSync(new URL('../config/ap_precalc.json', import.meta.url)))

/**
 * Exactly the columns db.js's ATTEMPT_COLS projects, and nothing else.
 *
 * Kept in lockstep on purpose. A fake that hands back the whole row is strictly
 * more capable than the real query, so a handler can read a field D1 never
 * returns and every test still passes — which is how a blank-counting bug once
 * shipped with the suite green.
 */
const ATTEMPT_COLS = [
  'id', 'ts', 'subject', 'item_id', 'topic', 'unit', 'practice', 'response',
  'correct', 'graded_by', 'seconds', 'hints_used', 'conditions', 'mock_id',
]

/**
 * In-memory stand-in for the D1 layer, matching makeDb's surface. Deliberately
 * dumb: it exists to let the handlers be tested without a network, not to model
 * SQLite.
 */
function fakeDb({ items = [], topics = [], teaching = [], attempts = [], gaps = [], mocks = [] } = {}) {
  const state = { items, topics, teaching, attempts, gaps, mocks, serves: [], nextServe: 1, nextMock: 1, nextAttempt: 1 }
  const byId = new Map(items.map((i) => [i.id, i]))
  return {
    state,
    async items(subject) { return state.items.filter((i) => i.subject === subject) },
    async item(id) { return byId.get(id) ?? null },
    async attempts(subject) {
      return state.attempts
        .filter((a) => a.subject === subject)
        .map((a) => {
          const row = {}
          for (const c of ATTEMPT_COLS) row[c] = a[c] ?? null
          // The LEFT JOIN to items supplies these two, and only these two.
          row.kind = byId.get(a.item_id)?.kind ?? null
          row.calc_allowed = byId.get(a.item_id)?.calc_allowed ?? null
          return row
        })
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
    /**
     * The conditional claim, with the same contract as the single UPDATE in
     * db.js: 1 when this call spent the serve, 0 when it was already spent.
     * A fake cannot reproduce the race — see tests/db.test.js for that, over
     * real SQLite — but it can hold the handler to the same return contract.
     */
    async claimServe(id) {
      const s = await this.serve(id)
      if (!s || s.logged) return 0
      s.logged = 1
      return 1
    },
    async recordAttempt(a) { state.attempts.push({ id: state.nextAttempt++, ...a }) },
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

/** A second subject, so the handlers can be caught judging one against the other. */
const PRE_ITEMS = [1, 2].map((i) => ({
  id: `p-${i}`, subject: 'ap_precalc', topic: 'p1', unit: '1', practice: null, kind: 'mcq',
  stem: `Precalc question ${i}`, options: { A: 'a', B: 'b', C: 'c', D: 'd' },
  answer: 'B', explanation: 'Because of p1.', calc_allowed: 0,
}))
const PRE_TOPICS = [{ id: 'p1', subject: 'ap_precalc', unit: '1', tested_on_exam: 1, exam_weight_low: 30, exam_weight_high: 40 }]
const CONFIGS = { ap_csa: CSA, ap_precalc: PRECALC }

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

/** A one-topic bank deep enough to miss two questions, clear the gap, and miss two more. */
function ctxDeep({ topic = 't1', n = 8 } = {}) {
  return fakeDb({
    items: Array.from({ length: n }, (_, i) => ({
      id: `${topic}-${i + 1}`, subject: 'ap_csa', topic, unit: '1', practice: 'P3', kind: 'mcq',
      stem: `Question ${topic}-${i + 1}`, options: { A: 'a', B: 'b', C: 'c', D: 'd' },
      answer: 'B', explanation: `Because of ${topic}.`, calc_allowed: 0,
    })),
    topics: TOPICS.filter((t) => t.id === topic),
    // TEACHING covers t1 only, so a t2 bank is deliberately material-free.
    teaching: TEACHING,
  })
}

/** A bank big enough to sit a full 42-question Section I mock without repeats. */
function ctxFullBank(n = CSA.exam.mcq_count + 2) {
  return fakeDb({
    items: Array.from({ length: n }, (_, i) => ({
      id: `f-${i + 1}`, subject: 'ap_csa', topic: i % 2 ? 't2' : 't1', unit: '1', practice: 'P3', kind: 'mcq',
      stem: `Full question ${i + 1}`, options: { A: 'a', B: 'b', C: 'c', D: 'd' },
      answer: 'B', explanation: 'Because.', calc_allowed: 0,
    })),
    topics: TOPICS,
    teaching: TEACHING,
  })
}

/**
 * Two topics, each deep enough that a whole sitting COULD be spent on one of
 * them. With four items per topic the weakest-topic branch runs dry after two
 * questions and the paper accidentally spreads, which hides the defect.
 */
function ctxTwoTopics(n = 8) {
  return fakeDb({
    items: ['t1', 't2'].flatMap((topic) =>
      Array.from({ length: n }, (_, i) => ({
        id: `${topic}-${i + 1}`, subject: 'ap_csa', topic, unit: '1', practice: 'P3', kind: 'mcq',
        stem: `Question ${topic}-${i + 1}`, options: { A: 'a', B: 'b', C: 'c', D: 'd' },
        answer: 'B', explanation: `Because of ${topic}.`, calc_allowed: 0,
      })),
    ),
    topics: TOPICS,
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

test('an answer the server cannot read is explained, not left as a silent nothing', async () => {
  // "B or C" is neither a choice nor a wrong choice: grade() reports it unparsed
  // so it cannot become a miss he then has to work off. But an unparsed verdict
  // returned correct: null, graded: false and NO note, so he was told nothing at
  // all and had no way to know what to do about it.
  const db = ctx()
  const q = await handleNext({ db, subject: 'ap_csa', config: CSA, now: T0 })
  const r = await handleLog({ db, serveId: q.serve, response: 'B or C', config: CSA, now: at(20) })

  assert.equal(r.graded_by, 'unparsed')
  assert.equal(r.graded, false)
  assert.equal(r.correct, null, 'an unreadable answer is not a wrong answer')
  assert.ok(r.note, 'a verdict of "nothing" with no explanation leaves him stuck')
  assert.match(r.note, /could not/i, 'say plainly that it could not be read')
  assert.match(r.note, /letter/i, 'and what to do about it: reply with just the letter')
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

test('a topic with no teaching material is flagged, and drilling continues', async () => {
  // t2 has no row in TEACHING.
  const db = ctxDeep({ topic: 't2' })
  for (const i of [1, 2]) {
    const q = await handleNext({ db, subject: 'ap_csa', config: CSA, now: at(i * 100) })
    await handleLog({ db, serveId: q.serve, response: 'A', config: CSA, now: at(i * 100 + 30) })
  }
  const r = await handleNext({ db, subject: 'ap_csa', config: CSA, now: at(400) })
  assert.deepEqual(r.lesson_missing, ['t2'], 'the content gap must be named, not hidden')
  assert.match(r.note, /no teaching material/)
  assert.equal(r.type, 'question', 'flagging a missing lesson must not stop the subject dead')

  // And it must keep serving: the old behaviour returned lesson_missing forever,
  // so no question was ever served again for ANY topic in the subject.
  for (const i of [5, 6, 7]) {
    const q = await handleNext({ db, subject: 'ap_csa', config: CSA, now: at(i * 100) })
    assert.equal(q.type, 'question', `call ${i} must still hand out a question`)
    await handleLog({ db, serveId: q.serve, response: 'B', config: CSA, now: at(i * 100 + 30) })
  }
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

test('/mock/start states the real time budget for the section it opened', async () => {
  const db = ctx()
  const timing = async (section) =>
    (await handleMockStart({ db, subject: 'ap_csa', section, source: 'bank', config: CSA, now: T0 })).timing
  assert.equal(await timing('I'), '90 minutes')
  assert.equal(await timing('II'), '90 minutes')
  // Under-timing a full sitting halves it, and a half-sat mock is not scored.
  assert.equal(await timing('full'), '180 minutes', 'a full sitting is both sections, not the multiple choice alone')
})

test('a full mock scores itself from its own logged answers', async () => {
  const db = ctxFullBank()
  const expected = CSA.exam.mcq_count
  const m = await handleMockStart({ db, subject: 'ap_csa', section: 'I', source: 'bank', config: CSA, now: T0 })
  // Sit the whole section: 32 of 42 right.
  for (let i = 0; i < expected; i++) {
    const q = await handleNext({ db, subject: 'ap_csa', config: CSA, now: at(i * 60), mockId: m.mock })
    assert.equal(q.type, 'question')
    await handleLog({ db, serveId: q.serve, response: i < 32 ? 'B' : 'A', config: CSA, now: at(i * 60 + 40) })
  }
  const r = await handleMockSubmit({ db, mockId: m.mock, config: CSA, now: at(4000) })
  assert.equal(r.composite_pct, 76.2, '32 of 42')
  assert.equal(r.answered, expected)
  assert.equal(r.expected, expected)
  assert.equal(r.blanks, 0, 'nothing was left blank, and the count must say so')
  assert.equal(r.counted, true)
  assert.match(r.basis, /Multiple choice only/)
})

test('a mock covering a handful of questions is recorded but NOT scored', async () => {
  // The false-100 path: three correct answers out of a 42-question section is
  // 100% of what was answered, and would satisfy every composite criterion.
  const db = ctx()
  const m = await handleMockStart({ db, subject: 'ap_csa', section: 'I', source: 'bank', config: CSA, now: T0 })
  for (const [i, ans] of ['B', 'B', 'B'].entries()) {
    const q = await handleNext({ db, subject: 'ap_csa', config: CSA, now: at(i * 60), mockId: m.mock })
    await handleLog({ db, serveId: q.serve, response: ans, config: CSA, now: at(i * 60 + 40) })
  }
  const r = await handleMockSubmit({ db, mockId: m.mock, config: CSA, now: at(500) })

  assert.equal(r.composite_pct, null, 'three answers cannot stand in for a 42-question section')
  assert.equal(r.counted, false)
  assert.equal(r.answered, 3)
  assert.equal(r.expected, CSA.exam.mcq_count)
  assert.match(r.basis, /3 of the 42/, 'the basis must say how much of the section was actually sat')
  assert.equal(db.state.mocks[0].composite_pct, null, 'and nothing scorable may be stored either')
  assert.equal(r.status.proctored_mocks, 0, 'a partial sitting is not a logged proctored mock')
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

// ---------------------------------------------------------------------------
// A closed gap stays closed, and an unanswered question is not a free pass
// ---------------------------------------------------------------------------

/** Miss two distinct questions, take the lesson, then answer one right cold. */
async function openTeachAndClose(db) {
  for (const i of [1, 2]) {
    const q = await handleNext({ db, subject: 'ap_csa', config: CSA, now: at(i * 100) })
    await handleLog({ db, serveId: q.serve, response: 'A', config: CSA, now: at(i * 100 + 30) })
  }
  const lesson = await handleNext({ db, subject: 'ap_csa', config: CSA, now: at(400) })
  await handleTaught({ db, subject: 'ap_csa', topic: 't1', config: CSA, now: at(500) })
  const q = await handleNext({ db, subject: 'ap_csa', config: CSA, now: at(600) })
  const closed = await handleLog({ db, serveId: q.serve, response: 'B', config: CSA, now: at(630) })
  return { lesson, closed }
}

test('a cleared gap does not re-open and re-teach the same lesson forever', async () => {
  const db = ctxDeep()
  const { lesson, closed } = await openTeachAndClose(db)
  assert.equal(lesson.type, 'lesson')
  assert.equal(closed.gap_closed, 't1')

  // The next call used to hand back the identical lesson, and every call after
  // it, so drilling never resumed.
  for (const i of [7, 8, 9]) {
    const r = await handleNext({ db, subject: 'ap_csa', config: CSA, now: at(i * 100) })
    assert.equal(r.type, 'question', `call ${i}: a closed gap must not be re-taught`)
    assert.deepEqual(r.status.open_gaps, [], 'and it must not be reported open either')
    await handleLog({ db, serveId: r.serve, response: 'B', config: CSA, now: at(i * 100 + 30) })
  }
  assert.equal(db.state.gaps.length, 1, 'one gap, opened once — not a new row every cycle')
})

test('the lesson response reports the gap it is delivering a lesson for', async () => {
  const db = ctxDeep()
  for (const i of [1, 2]) {
    const q = await handleNext({ db, subject: 'ap_csa', config: CSA, now: at(i * 100) })
    await handleLog({ db, serveId: q.serve, response: 'A', config: CSA, now: at(i * 100 + 30) })
  }
  const lesson = await handleNext({ db, subject: 'ap_csa', config: CSA, now: at(400) })
  assert.equal(lesson.type, 'lesson')
  assert.deepEqual(lesson.status.open_gaps, ['t1'], 'saying "no open gaps" while teaching one is a contradiction')
})

test('two fresh misses after a cleared gap open it again', async () => {
  const db = ctxDeep()
  await openTeachAndClose(db)
  // Suppressing resolved evidence must not suppress NEW evidence.
  for (const i of [7, 8]) {
    const q = await handleNext({ db, subject: 'ap_csa', config: CSA, now: at(i * 100) })
    assert.equal(q.type, 'question')
    await handleLog({ db, serveId: q.serve, response: 'A', config: CSA, now: at(i * 100 + 30) })
  }
  const r = await handleNext({ db, subject: 'ap_csa', config: CSA, now: at(1000) })
  assert.equal(r.type, 'lesson', 'two misses since the gap closed are a fresh pattern')
  assert.equal(db.state.gaps.filter((g) => !g.cleared_at).length, 1)
})

test('/taught refuses a topic that has no open gap', async () => {
  const db = ctxOneTopic()
  await assert.rejects(
    // The model passing a topic NAME where an id belongs used to return ok:true
    // and a promise that the topic would come back — with nothing recorded.
    () => handleTaught({ db, subject: 'ap_csa', topic: 'Loops and Arrays', config: CSA, now: T0 }),
    (e) => e instanceof ApiError && e.status === 404,
  )
})

// ---------------------------------------------------------------------------
// Mock conditions cannot be borrowed, and a partial sitting is not a mock
// ---------------------------------------------------------------------------

test('/next refuses a mock id that is closed, unknown, or another subject\'s', async () => {
  const db = ctx()
  const m = await handleMockStart({ db, subject: 'ap_csa', section: 'I', source: 'bank', config: CSA, now: T0 })
  const q = await handleNext({ db, subject: 'ap_csa', config: CSA, now: at(10), mockId: m.mock })
  await handleLog({ db, serveId: q.serve, response: 'B', config: CSA, now: at(50) })
  await handleMockSubmit({ db, mockId: m.mock, config: CSA, now: at(100) })
  const servesBefore = db.state.serves.length

  // Answering more questions "inside" a submitted mock moved readiness hours later.
  await assert.rejects(
    () => handleNext({ db, subject: 'ap_csa', config: CSA, now: at(25000), mockId: m.mock }),
    (e) => e instanceof ApiError && e.status === 409,
  )
  await assert.rejects(
    () => handleNext({ db, subject: 'ap_csa', config: CSA, now: at(200), mockId: 9999 }),
    (e) => e instanceof ApiError && e.status === 404,
  )
  const other = await handleMockStart({ db, subject: 'ap_precalc', section: 'I', source: 'bank', config: PRECALC, now: T0 })
  await assert.rejects(
    () => handleNext({ db, subject: 'ap_csa', config: CSA, now: at(300), mockId: other.mock }),
    (e) => e instanceof ApiError && e.status === 409,
  )
  assert.equal(db.state.serves.length, servesBefore, 'a refused mock id must not leave a serve row behind')
})

test('a mock that skips questions counts the unanswered ones as wrong', async () => {
  const db = ctxFullBank()
  const expected = CSA.exam.mcq_count
  const m = await handleMockStart({ db, subject: 'ap_csa', section: 'I', source: 'bank', config: CSA, now: T0 })
  for (let i = 0; i < expected - 2; i++) {
    const q = await handleNext({ db, subject: 'ap_csa', config: CSA, now: at(i * 60), mockId: m.mock })
    await handleLog({ db, serveId: q.serve, response: 'B', config: CSA, now: at(i * 60 + 40) })
  }
  const r = await handleMockSubmit({ db, mockId: m.mock, config: CSA, now: at(4000) })
  assert.equal(r.answered, expected - 2)
  assert.equal(r.composite_pct, 95.2, '40 right out of 42 expected, not 40 out of 40')
  assert.match(r.basis, /40 of the 42/)
})

test('a mock is judged by its own subject, not by the config the caller sent', async () => {
  const db = fakeDb({ items: PRE_ITEMS, topics: PRE_TOPICS })
  const m = await handleMockStart({ db, subject: 'ap_precalc', section: 'I', source: 'bank', config: PRECALC, now: T0 })
  const q = await handleNext({ db, subject: 'ap_precalc', config: PRECALC, now: at(10), mockId: m.mock })
  await handleLog({ db, serveId: q.serve, response: 'B', configs: CONFIGS, now: at(50) })

  await assert.rejects(
    () => handleMockSubmit({ db, mockId: m.mock, config: CSA, now: at(100) }),
    (e) => e instanceof ApiError && e.status === 400,
    'scoring a Precalc sitting against CSA floors reports the wrong exam',
  )
  const r = await handleMockSubmit({ db, mockId: m.mock, configs: CONFIGS, now: at(100) })
  assert.equal(r.status.subject, PRECALC.display_name)
  assert.equal(r.status.exam_date, PRECALC.exam_date)
})

test('/log judges the answer against its own subject, not the caller\'s claim', async () => {
  const db = fakeDb({ items: PRE_ITEMS, topics: PRE_TOPICS })
  const q = await handleNext({ db, subject: 'ap_precalc', config: PRECALC, now: T0 })

  await assert.rejects(
    () => handleLog({ db, serveId: q.serve, response: 'B', config: CSA, now: at(30) }),
    (e) => e instanceof ApiError && e.status === 400,
    'a Precalc answer judged against CSA floors reports the wrong exam date, goal and per-unit bar',
  )
  // The refusal must not have spent the serve.
  const r = await handleLog({ db, serveId: q.serve, response: 'B', configs: CONFIGS, now: at(30) })
  assert.equal(r.status.subject, PRECALC.display_name)
  assert.equal(r.status.exam_date, PRECALC.exam_date)
  assert.equal(r.status.goal, PRECALC.goal)
})

test('a proctored mock is not aimed at his weakest topic', async () => {
  const taughtGap = () => [{ subject: 'ap_csa', topic: 't1', opened_at: at(10), taught_at: at(20), cleared_at: null }]

  const drill = ctx({ gaps: taughtGap() })
  const outside = await handleNext({ db: drill, subject: 'ap_csa', config: CSA, now: at(100) })
  assert.equal(outside.topic, 't1', 'outside a mock, the taught gap is exactly what should come next')
  assert.match(outside.why, /Re-testing/)

  const sitting = ctx({ gaps: taughtGap() })
  const m = await handleMockStart({ db: sitting, subject: 'ap_csa', section: 'I', source: 'bank', config: CSA, now: T0 })
  const inside = await handleNext({ db: sitting, subject: 'ap_csa', config: CSA, now: at(100), mockId: m.mock })
  assert.equal(inside.type, 'question')
  assert.doesNotMatch(inside.why, /Re-testing/, 'the real exam is not a remediation set on his weakest topic')
})

test('a mock sitting spreads across the exam instead of drilling the weak topic', async () => {
  // Suppressing the gap-driven lesson and the gap re-test was not enough: the
  // weakest-topic and spaced-review priorities still applied inside a sitting, so
  // a mock was aimed squarely at what he is worst at. The real AP exam is not,
  // and a sitting that is systematically understates the composite — the only
  // number that moves readiness.
  const db = ctxTwoTopics()
  const seed = (item_id, topic, correct) => db.state.attempts.push({
    id: db.state.nextAttempt++, ts: at(1), subject: 'ap_csa', item_id, topic, unit: '1',
    practice: 'P3', response: 'X', correct, graded_by: 'server', seconds: 30,
    hints_used: 0, conditions: 'cold', mock_id: null,
  })
  seed('t1-1', 't1', 0)   // t1 at 0%
  seed('t1-2', 't1', 0)
  seed('t2-1', 't2', 1)   // t2 at 100%
  seed('t2-2', 't2', 1)

  // Outside a sitting, t1 is exactly what he should be working on.
  const drill = await handleNext({ db, subject: 'ap_csa', config: CSA, now: at(100) })
  assert.equal(drill.type, 'lesson')
  assert.equal(drill.lesson.topic, 't1', 'ordinary practice must still chase the weak topic')

  const m = await handleMockStart({ db, subject: 'ap_csa', section: 'I', source: 'bank', config: CSA, now: at(150) })
  const served = []
  for (let i = 0; i < 4; i++) {
    const q = await handleNext({ db, subject: 'ap_csa', config: CSA, now: at(200 + i * 60), mockId: m.mock })
    assert.equal(q.type, 'question')
    assert.doesNotMatch(q.why, /below the/, 'a sitting must not be justified as remediation')
    served.push(q.topic)
    await handleLog({ db, serveId: q.serve, response: 'B', config: CSA, now: at(200 + i * 60 + 40) })
  }
  assert.equal(
    new Set(served).size, 2,
    `both topics carry exam weight, so a 4-question sitting must reach both — got ${served.join(', ')}`,
  )
})

test('days_to_exam counts calendar days in one fixed zone', async () => {
  const db = ctx()
  const days = async (now) => (await handleStatus({ db, subject: 'ap_csa', config: CSA, now })).days_to_exam
  // Both of these are the evening before the exam in US Pacific.
  assert.equal(await days('2027-05-11T22:00:00Z'), 1, '15:00 the day before is one day out')
  assert.equal(await days('2027-05-12T03:00:00Z'), 1, '20:00 the same evening is still one day out')
  assert.equal(await days('2027-05-12T15:00:00Z'), 0, 'exam morning is the day itself')
})
