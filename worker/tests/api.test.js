import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync, existsSync } from 'node:fs'
import { DatabaseSync } from 'node:sqlite'
import { makeDb } from '../src/db.js'
import {
  handleNext, handleLog, handleTaught, handleMockStart, handleMockSubmit, handleStatus, handleDashboard,
  ApiError, MOCK_TIME_SLACK, MAX_ITEM_SHARE_OF_BUDGET, MIN_MOCK_COVERAGE,
} from '../src/api.js'

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
      // The conditional INSERT db.js does inside a sitting, with the same
      // contract: null when this paper already has that item outstanding. A fake
      // cannot reproduce the race — see tests/db.test.js for that, over real
      // SQLite — but it can hold the handler to the same return contract.
      if (s.mock_id != null && state.serves.some(
        (x) => x.subject === s.subject && !x.logged && Number(x.mock_id) === Number(s.mock_id) && x.item_id === s.item_id,
      )) {
        return null
      }
      const row = { id: state.nextServe++, logged: 0, ...s }
      state.serves.push(row)
      return row.id
    },
    /** The sitting's questions in flight: served, not yet logged. Same scope as db.js. */
    async openServeItems({ subject, mockId }) {
      return [...new Set(
        state.serves
          .filter((s) => s.subject === subject && !s.logged && Number(s.mock_id) === Number(mockId))
          .map((s) => s.item_id),
      )]
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
    /**
     * The atomic conditional filing, with the same contract as the single INSERT
     * in db.js: the mock id when the sitting was still open, null when it had
     * closed, in which case `conditions_if_closed` is what gets stored. A fake
     * cannot reproduce the race — see tests/db.test.js for that, over real
     * SQLite — but it can hold the handler to the same return contract.
     */
    async recordAttemptUnderOpenMock({ conditions_if_closed, mock_id, ...a }) {
      const sitting = await this.mock(mock_id)
      const open = sitting && !sitting.ended_at
      state.attempts.push({
        id: state.nextAttempt++, ...a,
        conditions: open ? 'proctored_mock' : conditions_if_closed,
        mock_id: open ? sitting.id : null,
      })
      return open ? sitting.id : null
    },
    /**
     * The same two conditions db.js's statement carries, in the same order.
     *
     * The PRIMARY KEY is (subject, topic, opened_at) — which does NOT dedupe two
     * opens a millisecond apart — and the NOT EXISTS on an uncleared row is what
     * actually keeps one topic to one open gap. This fake used to dedupe on
     * (subject, topic, uncleared) ALONE, which was stricter than the schema, so no
     * test here could see two concurrent /next calls writing two rows for one gap
     * and open_gaps naming the topic twice. See tests/db.test.js, over real SQLite.
     */
    async openGap({ subject, topic, opened_at }) {
      const samePk = state.gaps.some((x) => x.subject === subject && x.topic === topic && x.opened_at === opened_at)
      const alreadyOpen = state.gaps.some((x) => x.subject === subject && x.topic === topic && !x.cleared_at)
      if (samePk || alreadyOpen) return
      state.gaps.push({ subject, topic, opened_at, taught_at: null, cleared_at: null })
    },
    /** Same contract as db.js: how many rows this call changed, so a race cannot report success. */
    async markTaught({ subject, topic, taught_at }) {
      let changed = 0
      for (const g of state.gaps) {
        if (g.subject === subject && g.topic === topic && !g.cleared_at) {
          g.taught_at = taught_at
          changed++
        }
      }
      return changed
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
    /** Conditional close, same contract as db.js: 1 when this call closed it, else 0. */
    async closeMock({ id, ended_at }) {
      const m = await this.mock(id)
      if (!m || m.ended_at) return 0
      m.ended_at = ended_at
      return 1
    },
    /**
     * Conditional score write, same contract as db.js: 1 when this call stored the
     * score, 0 when the sitting is not closed or was already scored. `blanks` is
     * the "never scored" test there too, because a sitting that WAS scored and
     * legitimately produced no composite still has a blank count.
     */
    async scoreMock({ id, composite_pct, blanks }) {
      const m = await this.mock(id)
      if (!m || !m.ended_at || m.composite_pct != null || m.blanks != null) return 0
      Object.assign(m, { composite_pct, blanks })
      return 1
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

// ---------------------------------------------------------------------------
// A serve issued inside a sitting cannot be cashed in after that sitting closes
//
// Driven over REAL SQLite, the real schema and the real seeded bank rather than
// the fake above. /next's open-mock guard closed one door; this is the other
// one, and a fake that is more capable than the driver has hidden exactly this
// class of defect before.
// ---------------------------------------------------------------------------

const SEED = new URL('../seed.sql', import.meta.url)
const seeded = existsSync(SEED)
const withSeed = seeded ? test : test.skip
if (!seeded) console.warn('worker/seed.sql missing — run `npm run seed:sql` first; skipping real-SQLite api tests')

/** The subset of the D1 binding db.js uses, over node:sqlite. */
function d1(sqlite) {
  return {
    prepare(sql) {
      const stmt = sqlite.prepare(sql)
      let args = []
      const api = {
        bind(...a) {
          args = a.map((v) => (typeof v === 'boolean' ? (v ? 1 : 0) : v))
          return api
        },
        all: async () => ({ results: stmt.all(...args) }),
        first: async () => stmt.all(...args)[0] ?? null,
        run: async () => stmt.run(...args),
      }
      return api
    },
  }
}

function realDb() {
  const sqlite = new DatabaseSync(':memory:')
  sqlite.exec(readFileSync(SEED, 'utf8'))
  return { sqlite, db: makeDb(d1(sqlite)) }
}

/**
 * Exactly the evidence readiness.js judges a window on: the attempts tied to the
 * window's mock ids (`attempts.filter((a) => ids.has(a.mock_id))`), reduced to
 * the numbers the criteria are computed from. If a post-submit keystroke can
 * move anything in here, it can move mcq_overall and every per-unit floor.
 */
async function mockEvidence(db, subject, mockId) {
  const rows = (await db.attempts(subject)).filter((a) => a.mock_id === mockId)
  const graded = rows.filter((a) => a.graded_by === 'server')
  const byUnit = {}
  for (const a of graded) {
    const u = (byUnit[a.unit] ??= { n: 0, right: 0 })
    u.n++
    if (a.correct) u.right++
  }
  return {
    rows: rows.length,
    mcq_pct: graded.length ? (graded.filter((a) => a.correct).length / graded.length) * 100 : null,
    byUnit,
  }
}

withSeed('an answer given after the sitting closed cannot be added to it', async () => {
  const { db, sqlite } = realDb()
  const m = await handleMockStart({ db, subject: 'ap_csa', section: 'I', source: 'official', config: CSA, now: T0 })
  const expected = CSA.exam.mcq_count

  // Sit the section, answering everything correctly off the real key, and leave
  // the last question outstanding: served, on screen, never answered — exactly
  // what happens when time is called with one question to go.
  let answered = 0
  for (let i = 0; answered < expected - 1; i++) {
    const q = await handleNext({ db, subject: 'ap_csa', config: CSA, now: at(i * 60), mockId: m.mock })
    if (q.type !== 'question') continue
    const item = await db.item((await db.serve(q.serve)).item_id)
    await handleLog({ db, serveId: q.serve, response: item.answer, config: CSA, now: at(i * 60 + 30) })
    answered++
  }
  const stranded = await handleNext({ db, subject: 'ap_csa', config: CSA, now: at(5000), mockId: m.mock })
  assert.equal(stranded.type, 'question')

  const before = await mockEvidence(db, 'ap_csa', m.mock)
  assert.equal(before.rows, expected - 1, 'the sitting stands at 41 answers with one question stranded')

  const submitted = await handleMockSubmit({ db, mockId: m.mock, config: CSA, now: at(5400) })
  assert.equal(submitted.counted, true, '41 of 42 clears the coverage floor, so this is a scored sitting')
  const storedMock = sqlite.prepare('SELECT ended_at, composite_pct, blanks FROM mocks WHERE id = ?').get(m.mock)

  // Eleven hours later, untimed, unproctored, with the paper handed in: he
  // answers the question that was still on screen when time was called.
  const late = await handleLog({
    db, serveId: stranded.serve, response: 'B', config: CSA, now: at(5400 + 11 * 3600),
  })

  // The answer is not thrown away — he did the work — but it is ordinary
  // practice, not evidence about how he performs under exam conditions.
  const rows = await db.attempts('ap_csa')
  const lateRow = rows[rows.length - 1]
  assert.equal(rows.length, expected, 'the answer is still recorded, not lost')
  assert.equal(lateRow.mock_id, null, 'a post-submit answer must not be filed under the sitting')
  assert.equal(lateRow.conditions, 'cold', 'work done after the timer stopped is not proctored evidence')
  assert.ok(late.note, 'and he must be told which pile it landed in')
  assert.match(late.note, /submitted|after the/i)

  // The whole point: the judged window's evidence is byte-for-byte what it was
  // when the paper was handed in. Before this was fixed it went 41 rows -> 42,
  // moving mcq_overall and the affected unit's floor on one keystroke.
  assert.deepEqual(await mockEvidence(db, 'ap_csa', m.mock), before,
    'a keystroke made after the sitting ended must not move the evidence it is judged on')
  assert.deepEqual(
    sqlite.prepare('SELECT ended_at, composite_pct, blanks FROM mocks WHERE id = ?').get(m.mock), storedMock,
    'and the stored sitting must be untouched',
  )
  assert.equal(late.status.proctored_mocks, 1, 'still exactly one scored sitting')
  assert.equal(late.status.questions_answered, expected, 'the answer counts as practice')
})

// ---------------------------------------------------------------------------
// A sitting has to have been sat against a clock
//
// Driven over REAL SQLite, the real schema and the real seeded bank. The server
// holds every timestamp involved — the mock's started_at, each serve's
// served_at, each attempt's ts and its server-measured `seconds` — and it holds
// the section's real budget in config.exam. Nothing used to compare them: a
// section that takes four hours was scored exactly like one that took ninety
// minutes, and six such afternoons read as "ready".
// ---------------------------------------------------------------------------

/** Sit `n` questions of a mock, right off the real key, at a fixed pace. */
async function sitMock({ db, mock, n, spacing, seconds = 60 }) {
  let answered = 0
  for (let i = 0; answered < n; i++) {
    const q = await handleNext({ db, subject: 'ap_csa', config: CSA, now: at(answered * spacing), mockId: mock })
    if (q.type !== 'question') continue
    const item = await db.item((await db.serve(q.serve)).item_id)
    await handleLog({ db, serveId: q.serve, response: item.answer, config: CSA, now: at(answered * spacing + seconds) })
    answered++
  }
}

/**
 * Sit a mock on a real clock, every answer right off the real key.
 *
 * `spans[i]` is how long the i-th question sits between being handed out and
 * being answered; `gap` is the dead time between one answer and the next
 * question. Unlike sitMock above, the clock is CUMULATIVE, so a long interval
 * pushes everything after it later — which is what a break in the middle of a
 * sitting actually does, and the difference the per-question rule turns on.
 *
 * @returns {Promise<number>} seconds from the first question handed out to the
 *          last answer recorded: exactly the interval sittingTiming measures.
 */
async function sitPaced({ db, mock, spans, gap = 0 }) {
  let clock = 0
  for (const [i, took] of spans.entries()) {
    if (i) clock += gap
    const q = await handleNext({ db, subject: 'ap_csa', config: CSA, now: at(clock), mockId: mock })
    assert.equal(q.type, 'question', 'a sitting must never be interrupted by a lesson')
    const item = await db.item((await db.serve(q.serve)).item_id)
    clock += took
    await handleLog({ db, serveId: q.serve, response: item.answer, config: CSA, now: at(clock) })
  }
  return clock
}

withSeed('a four-hour sitting of a ninety-minute section is not exam-condition evidence', async () => {
  const { db, sqlite } = realDb()
  const expected = CSA.exam.mcq_count
  const budget = CSA.exam.mcq_minutes
  const m = await handleMockStart({ db, subject: 'ap_csa', section: 'I', source: 'official', config: CSA, now: T0 })

  // The whole section, every answer correct off the real key, at one question
  // every 5.7 minutes: 42 questions across four hours with his notes open.
  const spacing = Math.round((4 * 3600) / expected)
  await sitMock({ db, mock: m.mock, n: expected, spacing })

  const r = await handleMockSubmit({ db, mockId: m.mock, config: CSA, now: at(4 * 3600 + 600) })

  // Coverage is NOT the reason: he answered every question the section has, so
  // the only thing wrong with this sitting is the clock.
  assert.equal(r.answered, expected, 'the fixture must cover the whole section, so timing is the only defect')
  assert.equal(r.composite_pct, null, 'a four-hour ninety-minute section must not be given a composite')
  assert.equal(r.counted, false, 'and it must not count toward readiness')
  assert.equal(
    sqlite.prepare('SELECT composite_pct FROM mocks WHERE id = ?').get(m.mock).composite_pct, null,
    'the STORED composite is what a later readiness read sees; it must be null too',
  )
  assert.equal(
    sqlite.prepare('SELECT COUNT(*) n FROM mocks WHERE proctored = 1 AND composite_pct IS NOT NULL').get().n, 0,
    'nothing in the database may present this as a scored proctored mock',
  )

  // He must be able to SEE that it did not count, and why, in numbers.
  assert.match(r.basis, /NOT scored/, 'the basis must say it was not scored')
  assert.match(r.basis, new RegExp(String(budget)), `the basis must name the ${budget}-minute budget`)
  assert.match(r.basis, /2[0-9]{2} minutes/, 'and how long it actually took')
  assert.doesNotMatch(r.basis, /Scored \d+ right/, 'an unscored sitting must not also report a score')

  // Nothing is discarded: the 42 answers are still on the record as practice.
  assert.equal(r.status.questions_answered, expected, 'the work he did must not be thrown away')

  // And it must not move readiness, now or by accumulation.
  assert.equal(r.status.proctored_mocks, 0, 'an untimed sitting is not a scored proctored mock')
  assert.equal(r.status.readiness_pct, 0)
  const s = await handleStatus({ db, subject: 'ap_csa', config: CSA, now: at(4 * 3600 + 900) })
  const window = s.criteria.find((c) => /consecutive qualifying proctored mocks/i.test(c.requirement))
  assert.ok(window, `the mock-window criterion must be reported: ${JSON.stringify(s.criteria.map((c) => c.requirement))}`)
  assert.equal(window.met, false)
  assert.match(
    window.evidence, new RegExp(`only 0 of ${CSA.readiness.total_logged_mocks_min}`),
    `an untimed sitting must be worth zero qualifying mocks, not one: ${window.evidence}`,
  )

  // The advisory has to resurface, exactly as an under-covered sitting's does —
  // shown once at submit time and then forgotten is how a real sitting vanishes.
  const adv = s.advisories.find((a) => /not scored/i.test(a))
  assert.ok(adv, `an untimed sitting must stay visible in the summary: ${JSON.stringify(s.advisories)}`)
  assert.match(adv, /minutes/, 'and the advisory must name the timing, not just say "not scored"')
  const q = await handleNext({ db, subject: 'ap_csa', config: CSA, now: at(4 * 3600 + 1000) })
  assert.ok(q.status.advisories.some((a) => /not scored/i.test(a)), 'every response carries it')
  const dash = await handleDashboard({ db, configs: { ap_csa: CSA }, now: at(4 * 3600 + 1100) })
  assert.ok(
    dash.subjects[0].readiness.advisories.some((a) => /not scored/i.test(a)),
    'and the parent sees it too',
  )
})

withSeed('a sitting with one long break, still finished inside its allowance, is a real mock', async () => {
  const { db } = realDb()
  const expected = CSA.exam.mcq_count
  const budget = CSA.exam.mcq_minutes
  const m = await handleMockStart({ db, subject: 'ap_csa', section: 'I', source: 'official', config: CSA, now: T0 })

  // 42 of 42 right off the real key at exam pace, with ONE fifty-minute break: he
  // ate dinner with a question still on screen. The sitting as a whole lands at
  // 118 minutes against the 135 a 90-minute section may take, so the clock says
  // this was a mock. The per-question rule used to discard the entire afternoon
  // for exactly the interruption MOCK_TIME_SLACK is sized for — "a human needs the
  // bathroom" — and told him he had spent fifty minutes on one question, which is
  // not what happened: what is measured is serve-to-answer latency, not time on
  // task, and the server cannot tell a break from a long think.
  const spans = [...Array(expected - 1).fill(60), 50 * 60]
  const elapsed = await sitPaced({ db, mock: m.mock, spans, gap: 40 })
  const cap = budget * 60 * MAX_ITEM_SHARE_OF_BUDGET
  assert.ok(elapsed / 60 > budget, `the fixture must genuinely overrun the ${budget}-minute budget`)
  assert.ok(elapsed / 60 < budget * MOCK_TIME_SLACK, `and stay inside the ${budget * MOCK_TIME_SLACK} allowed`)
  assert.ok(Math.max(...spans) > cap, `with one interval past the ${cap / 60}-minute per-question cap`)

  const r = await handleMockSubmit({ db, mockId: m.mock, config: CSA, now: at(elapsed + 300) })
  assert.equal(r.answered, expected, 'the whole section was sat, so coverage is not in question')
  assert.equal(r.counted, true, 'one break inside the total allowance is what the slack is FOR')
  assert.equal(r.composite_pct, 100, 'every answer came off the real key, and none of it may be thrown away')
  assert.equal(r.status.proctored_mocks, 1, 'and it counts as a scored proctored mock')
  assert.ok(
    !r.status.advisories.some((a) => /not scored/i.test(a)),
    `a scored sitting must not also be advertised as unscored: ${JSON.stringify(r.status.advisories)}`,
  )
})

withSeed('a sitting put down twice, each time for half the section, is still not exam-condition evidence', async () => {
  const { db } = realDb()
  const expected = CSA.exam.mcq_count
  const budget = CSA.exam.mcq_minutes
  const allowed = Math.round(budget * MOCK_TIME_SLACK)
  const m = await handleMockStart({ db, subject: 'ap_csa', section: 'I', source: 'official', config: CSA, now: T0 })

  // 40 questions at half a minute each, and TWO questions left sitting for fifty
  // minutes apiece. The total is 120 minutes — inside the 135 a 90-minute section
  // may take — so the total-time bar says nothing at all here, and only the
  // per-question evidence shows what this was. One break is forgiven; the second
  // is not a break, it is an afternoon spent with the paper open.
  const spans = [...Array(expected - 2).fill(30), 50 * 60, 50 * 60]
  const elapsed = await sitPaced({ db, mock: m.mock, spans })
  assert.ok(
    elapsed / 60 <= budget * MOCK_TIME_SLACK,
    `the total must stay inside its ${allowed}-minute allowance, so the per-question rule is the only thing refusing it`,
  )

  const r = await handleMockSubmit({ db, mockId: m.mock, config: CSA, now: at(elapsed + 300) })
  assert.equal(r.answered, expected, 'coverage is not the defect here')
  assert.equal(r.composite_pct, null, 'a paper set down twice for half the section is not exam evidence')
  assert.equal(r.counted, false)
  assert.match(r.basis, /NOT scored/)
  assert.match(r.basis, /50 minutes|one question|two of its questions/i, 'the basis must name the intervals it refused')
  // The total-time clause is already gated on the total-time flag here, and must
  // stay that way: this sitting's span never breached anything.
  assert.doesNotMatch(r.basis, /answers span \d+ minutes/, 'the total was inside its allowance; nothing may say otherwise')

  // Q4-A2: the advisory rides on EVERY later response, and it was printing the
  // elapsed-versus-budget sentence unconditionally — "ran 120 minutes against a
  // 90-minute section ... past the 1.5x of the budget a sitting may overrun and
  // still count" — which is arithmetically false about numbers he can check.
  const s = await handleStatus({ db, subject: 'ap_csa', config: CSA, now: at(elapsed + 900) })
  const adv = s.advisories.find((a) => /not scored/i.test(a))
  assert.ok(adv, `the sitting must stay visible: ${JSON.stringify(s.advisories)}`)
  assert.match(adv, /unanswered/i, 'the advisory must name the reason that actually tripped')
  assert.doesNotMatch(
    adv, new RegExp(`ran \\d+ minutes against a ${budget}-minute section`),
    `the total never breached its allowance, so the advisory may not say it did: ${adv}`,
  )
  assert.doesNotMatch(
    adv, /may overrun and still count/,
    `only the total-time bar can be "overrun", and this sitting did not overrun it: ${adv}`,
  )
  assert.equal(r.status.proctored_mocks, 0)
})

withSeed('a sitting that is both short AND untimed names both reasons, on every surface', async () => {
  const { db } = realDb()
  const budget = CSA.exam.mcq_minutes
  const floor = Math.round(MIN_MOCK_COVERAGE * 100)
  const m = await handleMockStart({ db, subject: 'ap_csa', section: 'I', source: 'official', config: CSA, now: T0 })

  // 12 of 42, spread over four hours: two independent reasons this cannot become a
  // score, and fixing only one of them fixes nothing. The submit basis named both;
  // the advisory suppressed `short` whenever `untimed` fired and then signed off
  // with "re-sit one against a clock to turn it into a score" — false, because a
  // timed 12-of-42 sitting gets no composite either.
  const spans = Array(12).fill(60)
  const elapsed = await sitPaced({ db, mock: m.mock, spans, gap: 21 * 60 })
  assert.ok(elapsed / 60 > budget * MOCK_TIME_SLACK, 'the fixture must genuinely be untimed')

  const r = await handleMockSubmit({ db, mockId: m.mock, config: CSA, now: at(elapsed + 300) })
  assert.equal(r.counted, false)
  assert.equal(r.composite_pct, null)
  assert.match(r.basis, new RegExp(`short of the ${floor}% of the section`), 'the basis names the coverage reason')
  assert.match(r.basis, /run against a clock/, 'and the timing reason')

  const s = await handleStatus({ db, subject: 'ap_csa', config: CSA, now: at(elapsed + 900) })
  const adv = s.advisories.find((a) => /not scored/i.test(a))
  assert.ok(adv, `the sitting must stay visible: ${JSON.stringify(s.advisories)}`)
  assert.match(adv, /minutes/, 'the advisory names the timing reason')
  assert.match(
    adv, new RegExp(`under the ${floor}% of the section`),
    `and it must ALSO name the coverage reason, or he is told to fix the wrong one thing: ${adv}`,
  )
  assert.match(
    adv, /cover the section as well/,
    `a timed re-sit of 12 questions still produces no composite, so the advisory may not promise it would: ${adv}`,
  )
})

withSeed('a sitting that overruns by a few minutes is still a real mock', async () => {
  const { db } = realDb()
  const expected = CSA.exam.mcq_count
  const m = await handleMockStart({ db, subject: 'ap_csa', section: 'I', source: 'bank', config: CSA, now: T0 })

  // 42 questions ending 130 minutes after the first was handed out: over the
  // 90-minute budget, because a mock run at home overruns and a human needs the
  // bathroom, but nowhere near a four-hour open-book afternoon. This is the
  // floor under the fix — a timing gate that refuses this one would be throwing
  // away genuine evidence, which is its own way of lying about where he stands.
  const spacing = Math.round((130 * 60) / expected)
  await sitMock({ db, mock: m.mock, n: expected, spacing, seconds: 60 })

  const r = await handleMockSubmit({ db, mockId: m.mock, config: CSA, now: at(130 * 60 + 300) })
  assert.equal(r.answered, expected)
  assert.equal(r.counted, true, 'a slightly overrunning sitting is still exam-condition evidence')
  assert.equal(r.composite_pct, 100, 'every answer came off the real key')
  assert.equal(r.status.proctored_mocks, 1, 'and it counts as a scored proctored mock')
})

// ---------------------------------------------------------------------------
// blanks and the composite must tell the same story
// ---------------------------------------------------------------------------

test('questions a sitting never reached count as blank, exactly as they count as wrong', async () => {
  const db = ctxFullBank()
  const expected = CSA.exam.mcq_count
  const m = await handleMockStart({ db, subject: 'ap_csa', section: 'I', source: 'bank', config: CSA, now: T0 })
  // 38 of 42, every one of them right: the composite already counts the 4 he
  // never reached as wrong, so the blank count cannot report zero.
  for (let i = 0; i < expected - 4; i++) {
    const q = await handleNext({ db, subject: 'ap_csa', config: CSA, now: at(i * 60), mockId: m.mock })
    await handleLog({ db, serveId: q.serve, response: 'B', config: CSA, now: at(i * 60 + 40) })
  }
  const r = await handleMockSubmit({ db, mockId: m.mock, config: CSA, now: at(4000) })

  assert.equal(r.composite_pct, 90.5, '38 right out of the 42 the section expects')
  assert.equal(r.blanks, 4, 'the 4 he never reached are blank answers on the sheet, not zero blanks')
  assert.equal(db.state.mocks[0].blanks, 4, 'and the stored number the blanks criterion reads must agree')
  assert.match(r.basis, /never reached/, 'and the basis must say so in words')
})

// ---------------------------------------------------------------------------
// A sitting that is recorded but not scored must not silently disappear
// ---------------------------------------------------------------------------

test('a sitting recorded but not scored stays visible, with the pace implication named', async () => {
  const db = ctxFullBank()
  const m = await handleMockStart({ db, subject: 'ap_csa', section: 'I', source: 'official', config: CSA, now: T0 })
  // 37 of 42: he ran out of time, which is precisely the failure a mock exists
  // to expose. One question either side of this flips scored/unscored, and the
  // unscored side used to leave no trace at all beyond questions_answered.
  for (let i = 0; i < 37; i++) {
    const q = await handleNext({ db, subject: 'ap_csa', config: CSA, now: at(i * 60), mockId: m.mock })
    await handleLog({ db, serveId: q.serve, response: 'B', config: CSA, now: at(i * 60 + 40) })
  }
  const r = await handleMockSubmit({ db, mockId: m.mock, config: CSA, now: at(4000) })
  assert.equal(r.counted, false)
  assert.equal(r.composite_pct, null)
  assert.equal(r.blanks, 5, 'the 5 he never reached are still blanks on the sheet')
  assert.match(r.basis, /never reached/)
  assert.doesNotMatch(r.basis, /as wrong/, 'nothing in an unscored sitting was marked at all, so nothing "counted as wrong"')

  const s = await handleStatus({ db, subject: 'ap_csa', config: CSA, now: at(9000) })
  assert.equal(s.proctored_mocks, 0, 'an unscored sitting is still not a scored proctored mock')
  const adv = s.advisories.find((a) => /not scored/i.test(a))
  assert.ok(adv, `a real proctored sitting must not vanish from the summary: ${JSON.stringify(s.advisories)}`)
  assert.match(adv, /37 of 42/, 'say how far he actually got')
  assert.match(adv, /pace|ran out of time|time/i, 'and name what that means')

  // And it has to resurface, not be shown once at submit time and forgotten.
  const q = await handleNext({ db, subject: 'ap_csa', config: CSA, now: at(9100) })
  assert.ok(q.status.advisories.some((a) => /not scored/i.test(a)), 'every response carries it')
  assert.ok(r.status.advisories.some((a) => /not scored/i.test(a)), 'including the submit response itself')

  // The parent dashboard lists scored mocks only, so it hid the same sitting.
  const dash = await handleDashboard({ db, configs: { ap_csa: CSA }, now: at(9200) })
  assert.ok(
    dash.subjects[0].readiness.advisories.some((a) => /not scored/i.test(a)),
    'the parent must see the sitting too, not a card that says nothing happened',
  )
})

// ---------------------------------------------------------------------------
// A section whose questions the bank cannot supply must not produce a composite
//
// Driven over REAL SQLite and the REAL seeded bank, because the entire defect is
// a disagreement between the exam table and the content. `frq_count` says a
// section II sitting is 4 questions; the bank holds ZERO free-response items —
// every one of its 218 CSA items is kind 'mcq' — and the selector filters by
// topic, never by kind or section. So a section II sitting was handed 4 multiple
// choice questions, and 4 answers against "the 4 questions a section II sitting
// is expected to contain" cleared MIN_MOCK_COVERAGE outright: composite 100,
// counted true, one more proctored mock on the record. Six such afternoons over
// 11 days with one src=official are a COMPLETE qualifying window built on 24
// questions — the exact overstatement the coverage gate was written to stop,
// whose own docstring says "three answers cannot stand in for a 42-question
// section".
//
// The same disagreement runs the other way on a 'full' sitting: expected was
// mcq_count + frq_count = 46 while only the 42 multiple choice questions can be
// asked or graded, so answering all 42 correctly scored 91.3 with 4 "blanks"
// against max_blanks 1 — three such sittings made that criterion UNMEETABLE and
// `ready` unreachable through sec=full, while the basis claimed 4 questions
// "were never reached" that were never offered.
// ---------------------------------------------------------------------------

withSeed('a section II sitting is recorded but NOT scored, because the bank holds no free-response questions', async () => {
  const { db, sqlite } = realDb()
  const m = await handleMockStart({ db, subject: 'ap_csa', section: 'II', source: 'official', config: CSA, now: T0 })

  // Every question the exam table claims section II contains, answered right off
  // the real key, at a brisk minute apiece: coverage and the clock are both
  // satisfied, so the ONLY thing wrong with this sitting is that section II
  // cannot be drawn from this bank at all.
  await sitMock({ db, mock: m.mock, n: CSA.exam.frq_count, spacing: 60 })

  const r = await handleMockSubmit({ db, mockId: m.mock, config: CSA, now: at(600) })
  assert.equal(r.answered, CSA.exam.frq_count, 'the fixture answers the whole of what the table calls section II')
  assert.equal(r.composite_pct, null, '4 multiple choice questions are not a section II paper, whatever the count says')
  assert.equal(r.counted, false, 'and a sitting with no composite cannot count toward readiness')
  assert.equal(
    sqlite.prepare('SELECT composite_pct FROM mocks WHERE id = ?').get(m.mock).composite_pct, null,
    'the STORED composite is what a later readiness read sees; it must be null too',
  )
  assert.equal(
    sqlite.prepare('SELECT COUNT(*) n FROM mocks WHERE proctored = 1 AND composite_pct IS NOT NULL').get().n, 0,
    'nothing in the database may present this as a scored proctored mock',
  )
  assert.equal(r.status.proctored_mocks, 0, 'six of these must never become six qualifying mocks')

  // He is told why, in the numbers, and told nothing that is untrue.
  assert.match(r.basis, /NOT scored/, 'the basis must say plainly that it was not scored')
  assert.match(r.basis, /free.response/i, 'and name what section II is made of')
  assert.doesNotMatch(r.basis, /Scored \d+ right/, 'an unscored sitting must not also report a score')
  assert.doesNotMatch(r.basis, /never reached/, 'nothing can be "never reached" that was never offered')

  // The answers he gave are kept as evidence of work, and the sitting stays visible.
  assert.equal(r.status.questions_answered, CSA.exam.frq_count, 'the work he did must not be thrown away')
  const s = await handleStatus({ db, subject: 'ap_csa', config: CSA, now: at(900) })
  const window = s.criteria.find((c) => /consecutive qualifying proctored mocks/i.test(c.requirement))
  assert.ok(window, `the mock-window criterion must be reported: ${JSON.stringify(s.criteria.map((c) => c.requirement))}`)
  assert.match(
    window.evidence, new RegExp(`only 0 of ${CSA.readiness.total_logged_mocks_min}`),
    `a section II sitting must be worth zero qualifying mocks, not one: ${window.evidence}`,
  )
  const adv = s.advisories.find((a) => /not scored/i.test(a))
  assert.ok(adv, `the sitting must not vanish from the summary either: ${JSON.stringify(s.advisories)}`)
  assert.doesNotMatch(
    adv, /graded mechanically/,
    `its 4 answers WERE graded mechanically, so that cannot be the reason given: ${adv}`,
  )
})

withSeed('a full sitting is scored over the questions it can be scored on, not marked down for the ones the bank cannot ask', async () => {
  const { db } = realDb()
  const m = await handleMockStart({ db, subject: 'ap_csa', section: 'full', source: 'official', config: CSA, now: T0 })

  // Every multiple choice question a full sitting contains, all 42 right off the
  // real key, well inside the 180-minute budget. There is nothing else the bank
  // can put in front of him: it holds no free-response items.
  await sitMock({ db, mock: m.mock, n: CSA.exam.mcq_count, spacing: 60 })

  const r = await handleMockSubmit({ db, mockId: m.mock, config: CSA, now: at(4000) })
  assert.equal(r.answered, CSA.exam.mcq_count)
  assert.equal(
    r.expected, CSA.exam.mcq_count + CSA.exam.frq_count,
    'the response still reports what a real full sitting contains — that number is true and he should see it',
  )
  assert.equal(r.counted, true, '42 of the 42 questions this sitting could ask, every one right, is a scored sitting')
  assert.equal(r.composite_pct, 100, 'a perfect paper is 100, not 91.3 marked down for 4 questions never offered')
  assert.equal(r.blanks, 0, 'the free-response questions the bank cannot ask are not bubbles he left empty')
  assert.match(r.basis, /Multiple choice only/, 'and the basis must say what the composite covers')
  assert.doesNotMatch(r.basis, /never reached/, 'nothing can be "never reached" that was never offered')
})

// ---------------------------------------------------------------------------
// A sitting stranded between being closed and being scored
//
// handleMockSubmit closes the sitting BEFORE it reads the answers it scores, and
// that ordering is deliberate and correct: it is what tells a concurrent /log
// that the paper is in. But it leaves two writes with a gap between them, and the
// gap is the most CPU-expensive stretch in the codebase — the composite, the
// blank count, then a full readiness recomputation over the subject's whole
// history — so a Worker CPU kill lands there preferentially.
//
// What that used to leave behind: {ended_at set, composite_pct null, blanks
// null} on a sitting with 42 mechanically gradeable answers, disclosed forever as
// having "had nothing that could be graded mechanically", with /mock/submit
// returning 409 on every retry. A real 42-question sitting, lost, with a false
// reason attached.
//
// Driven over REAL SQLite, because the whole defect is which of two writes
// landed.
// ---------------------------------------------------------------------------

withSeed('a sitting stranded between closing and scoring can still be scored, and is not disclosed with a false reason', async () => {
  const { db, sqlite } = realDb()
  const expected = CSA.exam.mcq_count
  const m = await handleMockStart({ db, subject: 'ap_csa', section: 'I', source: 'official', config: CSA, now: T0 })
  await sitMock({ db, mock: m.mock, n: expected, spacing: 60 })

  // The scoring write dies. Everything before it — the close, and the 42 answers
  // — is already on disk.
  const killed = { ...db, scoreMock: async () => { throw new Error('Worker exceeded CPU time limit') } }
  await assert.rejects(
    () => handleMockSubmit({ db: killed, mockId: m.mock, config: CSA, now: at(expected * 60 + 300) }),
    /CPU/,
  )
  const stranded = sqlite.prepare('SELECT ended_at, composite_pct, blanks FROM mocks WHERE id = ?').get(m.mock)
  assert.ok(stranded.ended_at, 'the close landed, which is what makes this recoverable at all')
  assert.equal(stranded.composite_pct, null, 'and the score did not')
  assert.equal(stranded.blanks, null, 'nor the blank count — nothing of the scoring write landed')

  // The disclosure must not invent a reason. 42 answers were mechanically graded.
  const s = await handleStatus({ db, subject: 'ap_csa', config: CSA, now: at(expected * 60 + 600) })
  const adv = s.advisories.find((a) => /not scored/i.test(a))
  assert.ok(adv, `a closed sitting with no composite must stay visible: ${JSON.stringify(s.advisories)}`)
  assert.doesNotMatch(
    adv, /graded mechanically/,
    `all ${expected} of its answers WERE graded mechanically, so that cannot be the reason given: ${adv}`,
  )
  assert.match(adv, /submit/i, 'and the disclosure has to name the way out, because there is one')

  // The way out. Re-submitting a closed-but-unscored sitting scores it.
  const r = await handleMockSubmit({ db, mockId: m.mock, config: CSA, now: at(expected * 60 + 900) })
  assert.equal(r.answered, expected)
  assert.equal(r.counted, true, 'a sitting that was sat cannot be lost to a failure between two writes')
  assert.equal(r.composite_pct, 100, 'every answer came off the real key')
  assert.equal(r.status.proctored_mocks, 1)
  assert.equal(
    sqlite.prepare('SELECT composite_pct, blanks FROM mocks WHERE id = ?').get(m.mock).composite_pct, 100,
    'and the STORED composite is what a later readiness read sees',
  )
  assert.equal(
    sqlite.prepare('SELECT ended_at FROM mocks WHERE id = ?').get(m.mock).ended_at, stranded.ended_at,
    'the paper was handed in when it was handed in; a rescue may not move that',
  )

  // Once, though. A scored sitting is closed for good, and stops being disclosed.
  await assert.rejects(
    () => handleMockSubmit({ db, mockId: m.mock, config: CSA, now: at(expected * 60 + 1200) }),
    (e) => e instanceof ApiError && e.status === 409,
  )
  const after = await handleStatus({ db, subject: 'ap_csa', config: CSA, now: at(expected * 60 + 1500) })
  assert.ok(
    !after.advisories.some((a) => /not scored/i.test(a)),
    `a scored sitting must stop being advertised as unscored: ${JSON.stringify(after.advisories)}`,
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
