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
  'correct', 'graded_by', 'seconds', 'hints_used', 'conditions', 'mock_id', 'picked',
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
    /**
     * The conditional INSERT db.js does, with the same contract: null when this
     * subject already has a sitting that was started and never submitted. A fake
     * cannot reproduce the race — see tests/db.test.js for that, over real SQLite —
     * but it can hold the handler to the same return contract.
     */
    async startMock(m) {
      // Only a sitting with an ANSWER on it blocks a new one — an empty open
      // sitting cannot be submitted, so blocking on it would deadlock the subject.
      const blocking = state.mocks.some((x) => (
        x.subject === m.subject && !x.ended_at && state.attempts.some((a) => a.mock_id === x.id)
      ))
      if (blocking) return null
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
  // A FRESH database per section: a subject may not have two sittings open at
  // once (see db.startMock), so opening three on one database is now refused —
  // correctly, and it has nothing to do with what this test is about.
  const timing = async (section) =>
    (await handleMockStart({ db: ctx(), subject: 'ap_csa', section, source: 'bank', config: CSA, now: T0 })).timing
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

/**
 * The subset of the D1 binding db.js uses, over node:sqlite.
 *
 * run() resolves to the D1 ENVELOPE — `{success, meta: {changes, ...}}`, with no
 * top-level `changes` — because that is the shape Cloudflare returns and the
 * branch claimServe, closeMock, scoreMock and markTaught actually take in
 * production. Handing back node:sqlite's `{changes, lastInsertRowid}` instead
 * exercised only their fallback, so the tests below drove a path the deployed
 * Worker never takes. tests/db.test.js keeps one test on the node:sqlite shape so
 * the fallback stays covered.
 */
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
        run: async () => {
          const r = stmt.run(...args)
          return {
            success: true,
            results: [],
            meta: { changes: r.changes, last_row_id: Number(r.lastInsertRowid), changed_db: r.changes > 0 },
          }
        },
      }
      return api
    },
  }
}

/**
 * Bring a database built from worker/seed.sql up to worker/schema.sql.
 *
 * seed.sql embeds a SNAPSHOT of the schema and is regenerated centrally, so a
 * column added to schema.sql is absent here until that regeneration lands — and
 * every CREATE TABLE in it is IF NOT EXISTS, so reloading cannot add one either.
 * This runs the same ALTERs schema.sql lists for a live database, each only when
 * it is actually missing, so it goes on working once the seed catches up.
 *
 * Without it every seeded test below would drive db.js's unmigrated write path
 * and the migrated one — the one production is supposed to be on — would be
 * exercised only by tests/db.test.js, which loads schema.sql directly.
 */
function migrateToSchema(sqlite) {
  const columns = new Set(sqlite.prepare(`PRAGMA table_info(attempts)`).all().map((c) => c.name))
  if (!columns.has('picked')) sqlite.exec(`ALTER TABLE attempts ADD COLUMN picked TEXT`)
}

function realDb() {
  const sqlite = new DatabaseSync(':memory:')
  sqlite.exec(readFileSync(SEED, 'utf8'))
  migrateToSchema(sqlite)
  return { sqlite, db: makeDb(d1(sqlite)) }
}

/**
 * The real seeded bank with one half of the exam taken out of it.
 *
 * A bank that cannot supply a half of a section is not a hypothetical: it is what
 * ap_csa itself was until the free-response items were compiled into it, and it is
 * every subject whose second half has not been written yet. Now that the seed holds
 * both halves, the scenario has to be built rather than found — deleting the rows
 * is the whole of it, since the exam table still says section II is 4 free-response
 * questions and a full paper is 42 + 4.
 */
function realDbMissing(kind) {
  const { sqlite, db } = realDb()
  const gone = sqlite.prepare('DELETE FROM items WHERE kind = ?').run(kind).changes
  assert.ok(gone > 0, `the seed is supposed to hold ${kind} items for this fixture to remove — it held none`)
  return { sqlite, db, removed: Number(gone) }
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

/**
 * Sit `n` questions of a mock, right off the real key, at a fixed pace.
 *
 * A rubric-scored question has no key to answer off — `answer` is NULL on every
 * free-response item, deliberately, because grade.js would otherwise mark every
 * response to it wrong. Sending that NULL through as the response filed a BLANK,
 * which is a different sitting from the one the caller asked for. So a rubric item
 * gets a written response instead, and comes back graded_by 'model': answered, and
 * not markable, which is exactly what a real free-response answer is today.
 */
async function sitMock({ db, mock, n, spacing, seconds = 60 }) {
  let answered = 0
  for (let i = 0; answered < n; i++) {
    const q = await handleNext({ db, subject: 'ap_csa', config: CSA, now: at(answered * spacing), mockId: mock })
    if (q.type !== 'question') continue
    const item = await db.item((await db.serve(q.serve)).item_id)
    await handleLog({
      db, serveId: q.serve, response: item.answer ?? WRITTEN_RESPONSE, config: CSA, now: at(answered * spacing + seconds),
    })
    answered++
  }
}

/** What a student types at a free-response question: prose and code, not a letter. */
const WRITTEN_RESPONSE = 'public int total(int[] a) { int s = 0; for (int x : a) s += x; return s; }'

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
// A section the bank cannot ask AND MARK must not produce a composite
//
// Driven over REAL SQLite and the REAL seeded bank, because the entire defect is
// a disagreement between the exam table and the content. `frq_count` says a
// section II sitting is 4 questions; the bank held ZERO free-response items —
// every one of its 218 CSA items was kind 'mcq' — and the selector filters by
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
//
// The bank has since gained the exam's free-response half — 20 items, 125 rubric
// points — so section II can now be ASKED. It still cannot be MARKED: every one
// of those items is rubric-scored and the grader is not calibrated, which is a
// second, independent reason the same sitting gets no composite, and the reason
// the sittings below now turn on. The bank-cannot-supply case has not gone away
// (it is every subject whose second half is unwritten), so it is built explicitly
// with realDbMissing.
// ---------------------------------------------------------------------------

withSeed('a section II sitting is recorded but NOT scored, because nothing on it can be marked', async () => {
  const { db, sqlite } = realDb()
  const m = await handleMockStart({ db, subject: 'ap_csa', section: 'II', source: 'official', config: CSA, now: T0 })

  // Every question the exam table says section II contains — four real
  // free-response questions now, each answered in writing, at a brisk minute
  // apiece: coverage and the clock are both satisfied, so the ONLY thing wrong
  // with this sitting is that nothing on it can be marked mechanically.
  await sitMock({ db, mock: m.mock, n: CSA.exam.frq_count, spacing: 60 })
  const kinds = await paperRows(db, 'ap_csa', m.mock)
  assert.deepEqual(
    [...new Set(kinds.map((a) => a.kind))], ['frq'],
    'a section II paper is free-response, and the bank can now supply it',
  )
  assert.deepEqual(
    [...new Set(kinds.map((a) => a.graded_by))], ['model'],
    'and every one of those answers is routed to the rubric rather than marked',
  )

  const r = await handleMockSubmit({ db, mockId: m.mock, config: CSA, now: at(600) })
  assert.equal(r.answered, CSA.exam.frq_count, 'the fixture answers the whole of section II')
  assert.equal(r.composite_pct, null, 'four rubric answers nobody has graded are not a score')
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
  assert.match(
    r.basis, /rubric-scored rather than mechanically marked/,
    `and give the reason that is actually true of this paper: ${r.basis}`,
  )
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
    adv, /short of the \d+% of the section/,
    `the section was covered in full, so shortfall cannot be the reason given: ${adv}`,
  )
})

withSeed('a section II sitting the bank cannot supply is refused outright, not filled with the other half', async () => {
  // The bank-cannot-supply case, built explicitly now that the seed holds both
  // halves. Before the kind filter this sitting was handed 4 MULTIPLE CHOICE
  // questions and reported as "4 of the 4 questions a section II sitting is
  // expected to contain"; the paper is now refused at the first question, and the
  // refusal says the thing that is actually wrong — the content does not exist.
  const { db } = realDbMissing('frq')
  const m = await handleMockStart({ db, subject: 'ap_csa', section: 'II', source: 'official', config: CSA, now: T0 })

  const { answered, refusal } = await sitUntilRefused({ db, mock: m.mock, limit: CSA.exam.frq_count + 4 })
  assert.equal(answered, 0, 'a section II paper made of multiple choice is not a section II paper at all')
  assert.ok(refusal instanceof ApiError && refusal.status === 409, `the first serve is refused: ${refusal}`)
  assert.match(
    refusal.message, /cannot be given a single question/,
    `and not as "already been asked every question", which would be untrue of an empty paper: ${refusal.message}`,
  )
  assert.match(refusal.message, /4 free-response question\(s\)/, refusal.message)
  assert.match(refusal.message, /holds 0 exam-tested question\(s\) it may put on that section/, refusal.message)
  assert.doesNotMatch(refusal.message, /wait/i, 'waiting cannot conjure a free-response item into the bank')
  assert.match(refusal.message, /Nothing was recorded/, 'and nothing may be filed against a paper that does not exist')

  // Nothing was recorded, so there is nothing to submit either — and the sitting is
  // left open rather than stranded closed and unscorable.
  await assert.rejects(
    () => handleMockSubmit({ db, mockId: m.mock, config: CSA, now: at(600) }),
    (e) => e instanceof ApiError && e.status === 409 && /no logged answers/.test(e.message),
  )
})

withSeed('a full sitting is scored over the questions it can be scored on, not marked down for the ones the bank cannot ask', async () => {
  // On a bank with no free-response items at all: the half exists on the exam and
  // cannot be asked here, which is precisely what must not be counted against him.
  // (With the half in the bank it IS asked — see the padding test below.)
  const { db } = realDbMissing('frq')
  const m = await handleMockStart({ db, subject: 'ap_csa', section: 'full', source: 'official', config: CSA, now: T0 })

  // Every multiple choice question a full sitting contains, all 42 right off the
  // real key, well inside the 180-minute budget. There is nothing else this bank
  // can put in front of him.
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

// ---------------------------------------------------------------------------
// A sitting is a fixed number of questions OF A KIND, and neither bound held
//
// Driven over REAL SQLite and the REAL seeded bank, because the whole defect is
// a disagreement between the exam table, the content, and what the serve loop
// will hand out. Nothing capped a sitting at its own section: /next kept drawing
// from all 218 CSA items, so a `full` paper (42 mcq + 4 frq) could be answered
// 46 times — every one of them multiple choice — and its basis then reported
// "Answered 46 of the 46 questions a section full sitting is expected to
// contain", with the free-response half claimed as sat and never asked. Answer
// it 50 times and the same sentence read "50 of the 46".
// ---------------------------------------------------------------------------

/** The paper's own answers, as the handlers see them. */
const paperRows = async (db, subject, mockId) =>
  (await db.attempts(subject)).filter((a) => a.mock_id === mockId)

/**
 * Sit a mock through the real handlers until it will not serve another question,
 * answering every one right off the real key.
 *
 * @returns {Promise<{answered: number, refusal: Error|null}>} how many landed,
 *          and what stopped the loop.
 */
async function sitUntilRefused({ db, mock, subject = 'ap_csa', config = CSA, limit, spacing = 60 }) {
  let answered = 0
  let refusal = null
  while (answered < limit) {
    let q
    try {
      q = await handleNext({ db, subject, config, now: at(answered * spacing), mockId: mock })
    } catch (e) {
      refusal = e
      break
    }
    if (q.type !== 'question') continue
    const item = await db.item((await db.serve(q.serve)).item_id)
    await handleLog({ db, serveId: q.serve, response: item.answer ?? 'B', config, now: at(answered * spacing + 30) })
    answered++
  }
  return { answered, refusal }
}

withSeed('a full sitting cannot be padded past the section it is a sitting of, and its basis says which half was sat', async () => {
  const { db } = realDb()
  const mcq = CSA.exam.mcq_count
  const frq = CSA.exam.frq_count
  const m = await handleMockStart({ db, subject: 'ap_csa', section: 'full', source: 'official', config: CSA, now: T0 })

  // Answer for as long as the server will serve. The bank holds 218 mcq items and
  // 20 free-response ones, so without a bound the paper simply keeps growing past
  // the 46 questions a full sitting contains — the padding this test exists for.
  const { answered, refusal } = await sitUntilRefused({ db, mock: m.mock, limit: mcq + frq + 4 })

  const rows = await paperRows(db, 'ap_csa', m.mock)
  assert.equal(
    rows.filter((a) => a.kind === 'frq').length, frq,
    `a full paper is ${frq} free-response questions and the bank now holds them, so exactly ${frq} were sat — the ` +
      `per-half bound is what stops the 5th, and this assertion read 0 while the half was missing from the bank`,
  )
  assert.equal(rows.filter((a) => a.kind === 'mcq').length, mcq, 'and the multiple choice half in full')
  assert.equal(
    answered, mcq + frq,
    `a full paper is ${mcq} multiple choice plus ${frq} free-response, so ${mcq + frq} answers is the whole of what ` +
      `this sitting may hold — it took ${answered}`,
  )
  assert.ok(refusal instanceof ApiError && refusal.status === 409, `the serve after that must be refused: ${refusal}`)
  assert.match(
    refusal.message, new RegExp(`all ${mcq + frq} question\\(s\\) a section full sitting contains`),
    `and say the paper is as long as the section already: ${refusal.message}`,
  )
  assert.doesNotMatch(refusal.message, /wait/i, 'waiting cannot make a paper longer than its own section')

  const r = await handleMockSubmit({ db, mockId: m.mock, config: CSA, now: at((mcq + frq) * 60 + 600) })
  assert.equal(r.answered, mcq + frq)
  assert.equal(r.expected, mcq + frq, 'the real section size is a true fact and he should still see it')
  assert.match(
    r.basis, new RegExp(`${frq} of its ${frq} free-response`),
    `the basis has to say the free-response half was sat: ${r.basis}`,
  )
  assert.match(r.basis, new RegExp(`${mcq} of its ${mcq} multiple choice`), `and the multiple choice half too: ${r.basis}`)
  assert.match(
    r.basis, new RegExp(`${frq} response\\(s\\) need human or model grading`),
    `and that the rubric half is excluded from the composite rather than folded into it: ${r.basis}`,
  )
  assert.equal(r.counted, true, 'every question a full paper holds, every markable one right, is a scored sitting')
  assert.equal(r.composite_pct, 100)
  assert.equal(r.scored_out_of, mcq, 'the divisor is the section half that can be asked and marked, not the paper length')
  assert.equal(r.blanks, 0, 'a rubric answer nobody has graded is not an empty bubble')
})

withSeed('a section II sitting is its own half and no longer, and its answers are all free-response', async () => {
  const { db } = realDb()
  const frq = CSA.exam.frq_count
  const m = await handleMockStart({ db, subject: 'ap_csa', section: 'II', source: 'bank', config: CSA, now: T0 })

  // Section II is 4 free-response questions. Two bounds could stop the paper here —
  // the frq half filling, and the section's own length — and this pins that the
  // paper stops at 4 whichever gets there first, with nothing of the other half on
  // it. Before the kind filter it was 4 MULTIPLE CHOICE questions, and only the
  // section-length bound stopped a 12-answer paper being reported against it.
  const { answered, refusal } = await sitUntilRefused({ db, mock: m.mock, limit: frq + 8 })
  assert.equal(answered, frq, `a section II paper is ${frq} questions long`)
  assert.deepEqual(
    [...new Set((await paperRows(db, 'ap_csa', m.mock)).map((a) => a.kind))], ['frq'],
    'and every one of them is the kind section II is made of',
  )
  assert.ok(refusal instanceof ApiError && refusal.status === 409, `and the next serve is refused: ${refusal}`)
  assert.match(refusal.message, new RegExp(`all ${frq} question\\(s\\) a section II sitting contains`), refusal.message)

  // Unchanged by the bound: the sitting is recorded, unscored, and honest about
  // which half its answers actually filled.
  const r = await handleMockSubmit({ db, mockId: m.mock, config: CSA, now: at(2000) })
  assert.equal(r.counted, false)
  assert.match(
    r.basis, new RegExp(`Answered ${frq} of the ${frq} questions a section II sitting is expected to contain`),
    `the whole section was sat, and by the kind it is made of, so it may be reported against it: ${r.basis}`,
  )
  assert.match(r.basis, /rubric-scored rather than mechanically marked/, r.basis)
  assert.equal(r.status.questions_answered, frq, 'and nothing he did was thrown away')
})

// ---------------------------------------------------------------------------
// A sitting may only be served the halves the section it is a sitting of has
//
// The kind filter used to look at the halves that were already FULL, and a half a
// section does not have at all is never full — a section I sitting has no frq
// part, so 'frq' was never in that set. The moment the bank held a free-response
// item, a MULTIPLE CHOICE sitting could be handed one: it fills no half of the
// paper, it is booked graded_by 'model' so nothing can mark it, and it comes off
// the composite's numerator having stood in for nothing. Section II inverted is
// the same defect — an mcq is not a free-response paper.
//
// Driven over a fabricated bank holding BOTH halves, deliberately: the point is
// what the serve loop may draw from, and that must hold whatever the seeded bank
// happens to contain today.
// ---------------------------------------------------------------------------

/** A CSA bank holding both halves of the exam, so a serve can pick the wrong one. */
function ctxBothHalves(perKind = 6) {
  return fakeDb({
    items: ['t1', 't2'].flatMap((topic) => [
      ...Array.from({ length: perKind / 2 }, (_, i) => ({
        id: `${topic}-frq-${i + 1}`, subject: 'ap_csa', topic, unit: '1', practice: 'P3', kind: 'frq',
        stem: `Write the ${topic} method (${i + 1})`, options: null,
        answer: null, explanation: 'Sample solution.', calc_allowed: 0,
      })),
      ...Array.from({ length: perKind / 2 }, (_, i) => ({
        id: `${topic}-mcq-${i + 1}`, subject: 'ap_csa', topic, unit: '1', practice: 'P3', kind: 'mcq',
        stem: `Question ${topic}-${i + 1}`, options: { A: 'a', B: 'b', C: 'c', D: 'd' },
        answer: 'B', explanation: `Because of ${topic}.`, calc_allowed: 0,
      })),
    ]),
    topics: TOPICS,
    teaching: TEACHING,
  })
}

/**
 * Hand out questions until the server refuses, WITHOUT answering them: a serve in
 * flight is already excluded, so this walks the eligible bank without needing a
 * grader for either half.
 *
 * @returns {Promise<{kinds: string[], refusal: Error|null}>}
 */
async function serveUntilRefused({ db, mock, subject = 'ap_csa', config = CSA, limit }) {
  const kinds = []
  let refusal = null
  while (kinds.length < limit) {
    let q
    try {
      q = await handleNext({ db, subject, config, now: at(kinds.length * 60), mockId: mock })
    } catch (e) {
      refusal = e
      break
    }
    if (q.type !== 'question') continue
    kinds.push((await db.item((await db.serve(q.serve)).item_id)).kind)
  }
  return { kinds, refusal }
}

test('a section I sitting is never handed a free-response question', async () => {
  const db = ctxBothHalves()
  const m = await handleMockStart({ db, subject: 'ap_csa', section: 'I', source: 'bank', config: CSA, now: T0 })

  // Section I is 42 multiple choice questions, and this bank holds 6 of them
  // beside 6 free-response ones. Without the kind filter the paper takes all 12.
  const { kinds, refusal } = await serveUntilRefused({ db, mock: m.mock, limit: 12 })
  assert.deepEqual(
    [...new Set(kinds)], ['mcq'],
    `section I is multiple choice; a free-response question on it fills no half and cannot be marked: ${kinds}`,
  )
  assert.equal(kinds.length, 6, 'the whole multiple choice half of this bank, and nothing else')
  assert.ok(refusal instanceof ApiError && refusal.status === 409, `then the serve is refused: ${refusal}`)
  assert.match(
    refusal.message, /all 6 exam-tested question\(s\) this bank can put on a section I paper/,
    `and counted over what section I may draw from — the 6 free-response items were never on it: ${refusal.message}`,
  )
})

test('a section II sitting is never handed a multiple choice question', async () => {
  const db = ctxBothHalves()
  const m = await handleMockStart({ db, subject: 'ap_csa', section: 'II', source: 'bank', config: CSA, now: T0 })

  const { kinds, refusal } = await serveUntilRefused({ db, mock: m.mock, limit: 12 })
  assert.deepEqual([...new Set(kinds)], ['frq'], `section II is free-response only: ${kinds}`)
  assert.equal(kinds.length, CSA.exam.frq_count, 'and it is exactly as long as the section')
  assert.ok(refusal instanceof ApiError && refusal.status === 409, `then the serve is refused: ${refusal}`)
})

test('a full sitting is handed both halves, and each only up to what the exam has of it', async () => {
  // The other side of the same filter: `full` HAS both halves, so neither may be
  // closed off before it is full. 4 free-response questions and no more, with the
  // multiple choice half free to take the rest of the paper.
  const db = ctxBothHalves()
  const m = await handleMockStart({ db, subject: 'ap_csa', section: 'full', source: 'bank', config: CSA, now: T0 })

  const { kinds } = await serveUntilRefused({ db, mock: m.mock, limit: 12 })
  assert.equal(kinds.filter((k) => k === 'frq').length, CSA.exam.frq_count, `${kinds}`)
  assert.equal(kinds.filter((k) => k === 'mcq').length, 6, `every mcq the bank holds is still servable: ${kinds}`)
})

// ---------------------------------------------------------------------------
// The composite states ONE divisor, in the field and in the sentence
//
// `scored_out_of` is max(scored, scorable - ungraded), and the sentence that
// explains the composite was printing `scorable` — two different numbers in one
// string whenever they disagree. Reproduced both ways below: 43 markable answers
// on a section whose markable half is 42 (the field said 43, the sentence 42,
// 2.2 points apart), and 40 answers of which 4 could not be marked (the field
// said 38, the sentence 42).
//
// Driven over REAL SQLite. The two states are filed through db.js's own writer
// rather than through /next, deliberately: the serve path is bounded now, so a
// paper longer than its section is only reachable through a lost /next race, and
// the CSA bank is entirely mechanically markable, so no answer to it can come
// back needing a grader.
// ---------------------------------------------------------------------------

/** File `rows` answers under an open sitting, through db.js, over real SQLite. */
async function fileAnswers({ db, sqlite, subject, mockId, rows, minutes = 5 }) {
  const item = sqlite.prepare('SELECT id, topic, unit, practice FROM items WHERE subject = ? LIMIT 1').get(subject)
  const start = new Date(T0).getTime()
  for (const [i, row] of rows.entries()) {
    await db.recordAttempt({
      ts: new Date(start + (minutes * 60000 * i) / Math.max(rows.length - 1, 1)).toISOString(),
      subject, item_id: item.id, topic: item.topic, unit: item.unit, practice: item.practice,
      response: 'A', correct: row.correct ?? 0, graded_by: row.graded_by ?? 'server',
      seconds: 5, hints_used: 0, conditions: 'proctored_mock', mock_id: mockId,
    })
  }
}

/** The divisor and the right-answer count the handler states in its own prose. */
const statedArithmetic = (basis) => /Scored (\d+) right out of (\d+)/.exec(basis)
/** The divisor the explanatory sentence claims the composite was measured over. */
const statedDivisor = (basis) => /measured over the (\d+) question\(s\) of the (\d+)/.exec(basis)

withSeed('the composite is explained with the divisor it was actually taken over, not a second one', async () => {
  const mcq = CSA.exam.mcq_count
  const frq = CSA.exam.frq_count

  for (const [what, rows, right] of [
    [
      // One more markable answer than the section has markable questions.
      'a paper carrying more markable answers than its section has questions',
      [...Array(40).fill({ correct: 1 }), ...Array(3).fill({ correct: 0 })], 40,
    ],
    [
      // Four answers that no grader can mark mechanically: the section's 42
      // markable questions, less the 4 that came back unmarkable, is 38.
      'a paper whose answers include four that cannot be marked',
      [...Array(4).fill({ correct: 0, graded_by: 'model' }), ...Array(34).fill({ correct: 1 }), ...Array(2).fill({ correct: 0 })], 34,
    ],
  ]) {
    const { db, sqlite } = realDb()
    const m = await handleMockStart({ db, subject: 'ap_csa', section: 'full', source: 'official', config: CSA, now: T0 })
    await fileAnswers({ db, sqlite, subject: 'ap_csa', mockId: m.mock, rows })
    const r = await handleMockSubmit({ db, mockId: m.mock, config: CSA, now: at(600) })
    const where = `${what}: ${r.basis}`

    const arithmetic = statedArithmetic(r.basis)
    assert.ok(arithmetic, `a scored sitting states its arithmetic — ${where}`)
    assert.equal(Number(arithmetic[1]), right, `and counts the right answers it actually had — ${where}`)
    assert.equal(
      Number(arithmetic[2]), r.scored_out_of,
      `the sentence divides by a different number than the field — ${where}`,
    )

    const measured = statedDivisor(r.basis)
    assert.ok(measured, `a composite measured over less than the section says so — ${where}`)
    assert.equal(
      Number(measured[1]), r.scored_out_of,
      `one composite, two divisors in one string: ${measured[1]} against ${r.scored_out_of} — ${where}`,
    )
    assert.equal(Number(measured[2]), mcq + frq, `against the real section size — ${where}`)

    // The identity the GPT does its own arithmetic against.
    assert.equal(
      Number(((right / r.scored_out_of) * 100).toFixed(1)), r.composite_pct,
      `${right} right / ${r.scored_out_of} does not give ${r.composite_pct} — ${where}`,
    )
  }
})

withSeed('a divisor pulled below the markable half says what pulled it there', async () => {
  const { db, sqlite } = realDb()
  const m = await handleMockStart({ db, subject: 'ap_csa', section: 'full', source: 'official', config: CSA, now: T0 })
  await fileAnswers({
    db, sqlite, subject: 'ap_csa', mockId: m.mock,
    rows: [...Array(4).fill({ correct: 0, graded_by: 'model' }), ...Array(34).fill({ correct: 1 }), ...Array(2).fill({ correct: 0 })],
  })
  const r = await handleMockSubmit({ db, mockId: m.mock, config: CSA, now: at(600) })
  assert.equal(r.scored_out_of, 38, '42 markable questions, less the 4 answers that came back unmarkable')
  assert.match(
    r.basis, /4 (more of them|of its answers)[^.]*mark/i,
    `the sentence names the 42-to-38 deduction rather than leaving the number unexplained: ${r.basis}`,
  )
})

// ---------------------------------------------------------------------------
// What the forgiven break actually lets through, and what it is disclosed as
//
// The per-question rule forgives the single longest interval and caps the next
// one at half the section's budget, and the comment above MOCK_TIME_SLACK
// disclosed the cost of that as "the one question ... about 2.4 points". It is
// not one question: the cap is half the budget and the total-time bar allows
// 1.5x of it, so intervals at the cap fit three deep inside a sitting that is
// never refused. The disclosure has to state the exposure the two constants
// really permit, and this test is what keeps the two in step — tighten the rule
// and the first half fails; change either constant and the arithmetic below
// moves with it.
// ---------------------------------------------------------------------------

const API_SRC = readFileSync(new URL('../src/api.js', import.meta.url), 'utf8')

/**
 * The disclosure paragraph above MOCK_TIME_SLACK, unwrapped onto one line.
 *
 * Sliced rather than searched whole-file so a failure prints the paragraph at
 * issue, and unwrapped so re-flowing the comment cannot break the match while
 * leaving the claim wrong.
 */
function timingDisclosure(src) {
  const start = src.indexOf('WHAT THAT DELIBERATELY LETS THROUGH')
  const end = src.indexOf('export const MOCK_TIME_SLACK', start)
  assert.ok(start >= 0 && end > start, 'the disclosure above MOCK_TIME_SLACK moved or was renamed; update this test')
  return src.slice(start, end).replace(/\n\s*\*\s?/g, ' ')
}

withSeed('the forgiven break is disclosed at the exposure the two bars actually permit', async () => {
  const budget = CSA.exam.mcq_minutes
  const cap = budget * MAX_ITEM_SHARE_OF_BUDGET
  const allowance = budget * MOCK_TIME_SLACK
  const covered = Math.ceil(CSA.exam.mcq_count * MIN_MOCK_COVERAGE)
  // How many intervals at the per-question cap the total-time bar leaves room for.
  const permitted = Math.floor(MOCK_TIME_SLACK / MAX_ITEM_SHARE_OF_BUDGET)
  assert.ok(permitted >= 2, `the cap only bites past the forgiven break, so this test needs at least 2: ${permitted}`)

  /** Sit a covered section with `n` intervals at the cap and the rest instant. */
  const sitWithLongIntervals = async (n) => {
    const { db } = realDb()
    const m = await handleMockStart({ db, subject: 'ap_csa', section: 'I', source: 'official', config: CSA, now: T0 })
    const spans = [...Array(n).fill(cap * 60), ...Array(covered - n).fill(0)]
    const elapsed = await sitPaced({ db, mock: m.mock, spans })
    return { elapsed, r: await handleMockSubmit({ db, mockId: m.mock, config: CSA, now: at(elapsed + 300) }) }
  }

  // Three questions left sitting for 45 minutes each is 135 minutes, exactly the
  // allowance, and the second-longest interval is exactly at the cap — so this
  // sitting is COUNTED. That is the real exposure of the forgiven break.
  const permittedRun = await sitWithLongIntervals(permitted)
  assert.equal(permittedRun.elapsed / 60, allowance, 'the fixture must land exactly on the total-time bar')
  assert.equal(
    permittedRun.r.counted, true,
    `${permitted} intervals of ${cap} minutes inside the ${allowance}-minute allowance are permitted today, which is ` +
      `what the disclosure has to admit to: ${permittedRun.r.basis}`,
  )

  // A fourth cannot fit: the total-time bar is what bounds the exposure.
  const refused = await sitWithLongIntervals(permitted + 1)
  assert.equal(refused.r.counted, false, 'one more such interval must push the sitting past its allowance')
  assert.match(refused.r.basis, /answers span \d+ minutes/, 'and the total-time bar is what refuses it')

  // So the disclosed cost is `permitted` questions of the composite, not one.
  const points = ((permitted / CSA.exam.mcq_count) * 100).toFixed(1)
  const disclosed = timingDisclosure(API_SRC)
  assert.doesNotMatch(
    disclosed, /about 2\.4 points/,
    `the disclosure claimed one question of a 42-question composite; the bars permit ${permitted}: ${disclosed}`,
  )
  assert.match(
    disclosed, new RegExp(`at most ${permitted} such intervals`),
    `the disclosure has to name how many long intervals the two bars really permit: ${disclosed}`,
  )
  assert.match(
    disclosed, new RegExp(`${points} points`),
    `and what that costs: ${permitted} of ${CSA.exam.mcq_count} questions is ${points} points — ${disclosed}`,
  )
})

withSeed('the pace clause counts the intervals it actually measured', async () => {
  const { db } = realDb()
  const covered = Math.ceil(CSA.exam.mcq_count * MIN_MOCK_COVERAGE)
  const m = await handleMockStart({ db, subject: 'ap_csa', section: 'I', source: 'official', config: CSA, now: T0 })

  // Three questions left sitting for 200, 60 and 55 minutes: the paper was put
  // down at least three times, and the clause named only the two longest and then
  // asserted "so the paper was put down twice" — a count it had not measured.
  const spans = [200 * 60, 60 * 60, 55 * 60, ...Array(covered - 3).fill(0)]
  const elapsed = await sitPaced({ db, mock: m.mock, spans })
  const r = await handleMockSubmit({ db, mockId: m.mock, config: CSA, now: at(elapsed + 300) })

  assert.equal(r.counted, false)
  assert.doesNotMatch(r.basis, /put down twice/, `three intervals past the cap is not twice: ${r.basis}`)
  assert.match(r.basis, /3 of its questions sat unanswered/, `state the count that was measured: ${r.basis}`)
  assert.match(r.basis, /200, 60 and 55 minutes/, `and the intervals behind it: ${r.basis}`)

  // The advisory rides on every later response and is built from the same clause.
  const s = await handleStatus({ db, subject: 'ap_csa', config: CSA, now: at(elapsed + 900) })
  const adv = s.advisories.find((a) => /not scored/i.test(a))
  assert.ok(adv, `the sitting must stay visible: ${JSON.stringify(s.advisories)}`)
  assert.doesNotMatch(adv, /put down twice/, `and it cannot state a different count either: ${adv}`)
  assert.match(adv, /3 of its questions sat unanswered/, adv)
})

// ---------------------------------------------------------------------------
// The fifth state is "no verdict yet", not "nothing is wrong"
// ---------------------------------------------------------------------------

withSeed('a stranded sitting that will still fail a gate is not advertised as fine', async () => {
  const { db } = realDb()
  const floor = Math.round(MIN_MOCK_COVERAGE * 100)
  const m = await handleMockStart({ db, subject: 'ap_csa', section: 'I', source: 'official', config: CSA, now: T0 })
  // 10 of 42, timed: the scoring write dies, so no verdict was ever reached — but
  // the coverage gate is going to refuse this sitting the moment one is.
  await sitMock({ db, mock: m.mock, n: 10, spacing: 60 })
  const killed = { ...db, scoreMock: async () => { throw new Error('Worker exceeded CPU time limit') } }
  await assert.rejects(() => handleMockSubmit({ db: killed, mockId: m.mock, config: CSA, now: at(1200) }), /CPU/)

  const s = await handleStatus({ db, subject: 'ap_csa', config: CSA, now: at(1500) })
  const adv = s.advisories.find((a) => /not scored/i.test(a))
  assert.ok(adv, `a closed sitting with no composite must stay visible: ${JSON.stringify(s.advisories)}`)
  assert.match(adv, /never scored/, 'the unfinished write is still the state to report')
  assert.match(adv, /submit/i, 'and re-submitting is still the way out')
  assert.doesNotMatch(
    adv, /Nothing is wrong with the sitting itself/,
    `something IS wrong with it: it covers 10 of 42, and the very next advisory says so: ${adv}`,
  )
  assert.match(adv, /10 of 42/, `so the gate it will still fail has to be named here: ${adv}`)
  assert.match(adv, new RegExp(`${floor}%`), adv)

  // One call later, the same sitting, the other surface — which must not
  // contradict what the advisory just promised.
  const r = await handleMockSubmit({ db, mockId: m.mock, config: CSA, now: at(1800) })
  assert.equal(r.counted, false, 'a 10-of-42 sitting does not become a score by being submitted again')
  assert.match(r.basis, new RegExp(`short of the ${floor}% of the section`))
})

withSeed('a stranded sitting that would score is still reported as sound', async () => {
  const { db } = realDb()
  const expected = CSA.exam.mcq_count
  const m = await handleMockStart({ db, subject: 'ap_csa', section: 'I', source: 'official', config: CSA, now: T0 })
  await sitMock({ db, mock: m.mock, n: expected, spacing: 60 })
  const killed = { ...db, scoreMock: async () => { throw new Error('Worker exceeded CPU time limit') } }
  await assert.rejects(() => handleMockSubmit({ db: killed, mockId: m.mock, config: CSA, now: at(9000) }), /CPU/)

  const s = await handleStatus({ db, subject: 'ap_csa', config: CSA, now: at(9300) })
  const adv = s.advisories.find((a) => /not scored/i.test(a))
  // The qualification must be earned, not blanket: a full, timed, markable
  // sitting really has nothing wrong with it beyond the unfinished write.
  assert.match(adv, /Nothing is wrong with the sitting itself/, adv)
  assert.equal((await handleMockSubmit({ db, mockId: m.mock, config: CSA, now: at(9600) })).counted, true)
})

// ---------------------------------------------------------------------------
// An exhausted paper: the real condition, and no remedy that cannot work
// ---------------------------------------------------------------------------

withSeed('the refusal on an exhausted paper names the real condition, and offers no remedy that cannot work', async () => {
  const { db, sqlite } = realDb()
  const m = await handleMockStart({ db, subject: 'ap_precalc', section: 'I', source: 'bank', config: PRECALC, now: T0 })
  const onExam = (kinds) => sqlite.prepare(
    `SELECT count(*) n FROM items i
      JOIN topics t ON t.id = i.topic AND t.subject = i.subject
     WHERE i.subject = 'ap_precalc' AND t.tested_on_exam <> 0 ${kinds}`,
  ).get().n

  // RETIRED PRECONDITION: `tested`, counted over EVERY exam-tested Precalc item of
  // any kind, and required to be shorter than one section.
  //
  // That was the servable supply only while the bank held no `mcq` at all: with no
  // question of section I's own half in it, api.js keeps every other kind servable
  // so that timed practice on an unsuppliable section is still real work. The
  // Precalc packs now ship 12 multiple choice items, which flips that allowance
  // off — a section I paper is drawn from the halves section I is made of and
  // nothing else, because a keyed short-answer drill fills no half of it and may
  // not stand in for one. So the exam-tested bank went from 36 to 55 while the
  // supply THIS paper may draw from went from 36 to 12, and a precondition reading
  // "55 < 42" is measuring the wrong set.
  //
  // It is replaced by that same rule, stated: the supply is the section's own
  // halves once the bank holds one exam-tested question of them, and whatever else
  // it has while it holds none. Both eras satisfy it, and the corrected truth is
  // pinned below — every answer on the paper is of a kind section I contains, and
  // the refusal quotes the section's supply and NOT the bank's total.
  const ownHalf = onExam(`AND i.kind = 'mcq'`)
  const eligible = ownHalf > 0 ? ownHalf : onExam(`AND i.kind <> 'frq'`)
  const wholeBank = onExam('')
  assert.ok(
    eligible > 0 && eligible < PRECALC.exam.mcq_count,
    `this test needs a section this bank cannot fill, which section I of Precalc is: ${eligible} of ` +
      `${PRECALC.exam.mcq_count}`,
  )

  // A fresh database, the first sitting anyone has ever sat: every question this
  // section may be given is served once, and then there is nothing left to ask.
  const { answered, refusal } = await sitUntilRefused({
    db, mock: m.mock, subject: 'ap_precalc', config: PRECALC, limit: PRECALC.exam.mcq_count,
  })
  assert.equal(answered, eligible, 'a question may not appear twice on one paper, so the bank is the bound')
  const kinds = sqlite.prepare(
    `SELECT DISTINCT i.kind k FROM attempts a JOIN items i ON i.id = a.item_id WHERE a.mock_id = ? ORDER BY k`,
  ).all(m.mock).map((r) => r.k)
  if (ownHalf > 0) {
    assert.deepEqual(
      kinds, ['mcq'],
      `a section I paper is multiple choice, so nothing else may be on it: got ${kinds.join(', ')}`,
    )
  }
  assert.ok(refusal instanceof ApiError && refusal.status === 409, `the next serve must be refused: ${refusal}`)
  assert.match(refusal.message, /already/i, `name what actually happened: ${refusal.message}`)
  assert.match(
    refusal.message, new RegExp(`all ${eligible} exam-tested question\\(s\\)`),
    `in numbers, and the number is the supply this SECTION has: ${refusal.message}`,
  )
  if (wholeBank !== eligible) {
    assert.doesNotMatch(
      refusal.message, new RegExp(`\\b${wholeBank}\\b`),
      `the bank's ${wholeBank} exam-tested items are not ${eligible} questions this paper could ask, and quoting the ` +
        `larger figure would tell him the paper saw material it never saw: ${refusal.message}`,
    )
  }
  assert.doesNotMatch(
    refusal.message, /no.repeat window|reuse window/i,
    `that state cannot produce this refusal — the selector serves a labelled repeat instead: ${refusal.message}`,
  )
  assert.doesNotMatch(
    refusal.message, /wait/i,
    `and waiting is not a remedy the student can act on: ${refusal.message}`,
  )

  // Which the clock proves: the same call is refused a day, a fortnight, two
  // months and a year later, because the this-paper exclusion is unconditional.
  for (const days of [1, 15, 60, 365]) {
    await assert.rejects(
      () => handleNext({ db, subject: 'ap_precalc', config: PRECALC, now: at(days * 86400), mockId: m.mock }),
      (e) => e instanceof ApiError && e.status === 409,
      `waiting ${days} days cannot change the answer, so nothing may suggest that it does`,
    )
  }
})

// ---------------------------------------------------------------------------
// An answer nobody will ever grade is not an answer awaiting a grader
// ---------------------------------------------------------------------------

withSeed('an answer the grader could not read is not reported as waiting for a grader', async () => {
  const { db } = realDb()
  const expected = CSA.exam.mcq_count
  const m = await handleMockStart({ db, subject: 'ap_csa', section: 'I', source: 'official', config: CSA, now: T0 })

  const notes = []
  for (let i = 0; i < expected; i++) {
    const q = await handleNext({ db, subject: 'ap_csa', config: CSA, now: at(i * 60), mockId: m.mock })
    assert.equal(q.type, 'question')
    const item = await db.item((await db.serve(q.serve)).item_id)
    // Two answers that name no single choice, and 40 right off the real key.
    const unreadable = i < 2
    const logged = await handleLog({
      db, serveId: q.serve, response: unreadable ? 'B or C' : item.answer, config: CSA, now: at(i * 60 + 30),
    })
    if (!unreadable) continue
    assert.equal(logged.graded_by, 'unparsed')
    notes.push(logged.note)
  }

  assert.equal(notes.length, 2)
  for (const note of notes) {
    assert.match(note, /letter/i, '/log tells him to send just the letter, i.e. no grader is coming for this one')
  }

  const r = await handleMockSubmit({ db, mockId: m.mock, config: CSA, now: at(4000) })
  assert.equal(r.ungraded, 2, 'both are still excluded from the composite')
  assert.doesNotMatch(
    r.basis, /need human or model grading/,
    `no human or model will ever look at an answer that could not be read — /log said as much: ${r.basis}`,
  )
  assert.match(r.basis, /could not be read/i, `so the basis has to say what really happened to them: ${r.basis}`)
  assert.equal(r.scored_out_of, expected - 2, 'the two unreadable answers came off the divisor')
  assert.equal(r.composite_pct, 100, '40 right of the 40 that could be marked')
})

test('days_to_exam counts calendar days in one fixed zone', async () => {
  const db = ctx()
  const days = async (now) => (await handleStatus({ db, subject: 'ap_csa', config: CSA, now })).days_to_exam
  // Both of these are the evening before the exam in US Pacific.
  assert.equal(await days('2027-05-11T22:00:00Z'), 1, '15:00 the day before is one day out')
  assert.equal(await days('2027-05-12T03:00:00Z'), 1, '20:00 the same evening is still one day out')
  assert.equal(await days('2027-05-12T15:00:00Z'), 0, 'exam morning is the day itself')
})

// ---------------------------------------------------------------------------
// Pace (METH-11), staleness (GAP-5) and a sitting that was never finished (GAP-3)
//
// Three absences with the same shape: the server holds the evidence, computes
// nothing from it, and says nothing about it.
//
//   pace_seconds_per_mcq sits in both configs and was read NOWHERE in worker/src.
//   Per-question `seconds` fed the total-time gate and the per-item break cap —
//   both ADMISSION tests on a mock, neither feedback — so a student could pass
//   every gate while being consistently half a minute a question too slow, which
//   on a timed exam is how a capable student scores badly.
//
//   Nothing computed days-since-last-attempt, so six weeks of silence looked
//   exactly like a hard week: the same 0%, the same blocker, the same chips.
//
//   An abandoned OPEN sitting was invisible everywhere — unscoredSittings skips a
//   mock with no ended_at, proctored_mocks counts only scored ones — while every
//   FINISHED failure mode produces a loud advisory. Start a section, see it going
//   badly, walk away, start another: the one gaming path the timing and coverage
//   gates do not close.
// ---------------------------------------------------------------------------

/** The one advisory that matches, or undefined. Advisories are the student's only channel. */
const advisory = (status, re) => status.advisories.find((a) => re.test(a))

withSeed('a student who is consistently too slow is told so, in numbers he can check', async () => {
  const { db } = realDb()
  // Twelve multiple-choice answers, every one taking 200 seconds against the 129
  // this config states for one real exam question. Answered correctly, so no gap
  // interrupts and nothing here is about being wrong.
  for (let i = 0; i < 12; i++) {
    const q = await handleNext({ db, subject: 'ap_csa', config: CSA, now: at(i * 400) })
    if (q.type !== 'question') continue
    const item = await db.item((await db.serve(q.serve)).item_id)
    await handleLog({ db, serveId: q.serve, response: item.answer, config: CSA, now: at(i * 400 + 200) })
  }
  const s = await handleStatus({ db, subject: 'ap_csa', config: CSA, now: at(6000) })
  const pace = advisory(s, /pace/i)
  assert.ok(pace, `pace is measurable and was not reported: ${JSON.stringify(s.advisories)}`)
  assert.match(pace, /200 seconds/, 'the measured pace, from the server’s own clock')
  assert.match(pace, new RegExp(`${CSA.exam.pace_seconds_per_mcq} seconds`), 'against the config’s own target')
  assert.match(pace, new RegExp(`${CSA.exam.mcq_minutes} minutes`), 'and what that projects to over the section')
})

withSeed('a student who is on pace is not nagged about it', async () => {
  const { db } = realDb()
  for (let i = 0; i < 12; i++) {
    const q = await handleNext({ db, subject: 'ap_csa', config: CSA, now: at(i * 400) })
    if (q.type !== 'question') continue
    const item = await db.item((await db.serve(q.serve)).item_id)
    await handleLog({ db, serveId: q.serve, response: item.answer, config: CSA, now: at(i * 400 + 100) })
  }
  const s = await handleStatus({ db, subject: 'ap_csa', config: CSA, now: at(6000) })
  assert.equal(advisory(s, /pace/i), undefined, '100 seconds against a 129-second target is not a pace problem')
})

withSeed('two slow answers are not a pace measurement', async () => {
  const { db } = realDb()
  for (let i = 0; i < 2; i++) {
    const q = await handleNext({ db, subject: 'ap_csa', config: CSA, now: at(i * 900) })
    if (q.type !== 'question') continue
    const item = await db.item((await db.serve(q.serve)).item_id)
    await handleLog({ db, serveId: q.serve, response: item.answer, config: CSA, now: at(i * 900 + 600) })
  }
  const s = await handleStatus({ db, subject: 'ap_csa', config: CSA, now: at(3000) })
  assert.equal(
    advisory(s, /pace/i), undefined,
    'a median over two answers is noise, and "not yet measurable" is this project’s standing rule',
  )
})

withSeed('six weeks of silence is said out loud, not hidden behind an unchanged number', async () => {
  const { db } = realDb()
  const q = await handleNext({ db, subject: 'ap_csa', config: CSA, now: T0 })
  await handleLog({ db, serveId: q.serve, response: 'B', config: CSA, now: at(30) })

  const fresh = await handleStatus({ db, subject: 'ap_csa', config: CSA, now: at(3600) })
  assert.equal(advisory(fresh, /nothing has been recorded/i), undefined, 'an hour later is not silence')

  const sixWeeks = at(42 * 86400)
  const s = await handleStatus({ db, subject: 'ap_csa', config: CSA, now: sixWeeks })
  const stale = advisory(s, /nothing has been recorded/i)
  assert.ok(stale, `six weeks of silence must be visible: ${JSON.stringify(s.advisories)}`)
  assert.match(stale, /42 days/, 'the count of days, so a pause cannot be mistaken for progress')
  assert.match(stale, /2027-03-01/, 'and the date of the last answer')
})

withSeed('a second sitting cannot be opened while one is still open', async () => {
  const { db } = realDb()
  const first = await handleMockStart({ db, subject: 'ap_csa', section: 'I', source: 'bank', config: CSA, now: T0 })
  // One answer on the paper: that is what "saw it going badly and walked away"
  // means, and an answer is the only thing walking away can discard. An empty
  // paper deliberately blocks nothing — see the deadlock test below.
  const opening = await handleNext({ db, subject: 'ap_csa', config: CSA, now: at(10), mockId: first.mock })
  await handleLog({ db, serveId: opening.serve, response: 'B', config: CSA, now: at(40) })
  await assert.rejects(
    () => handleMockStart({ db, subject: 'ap_csa', section: 'I', source: 'bank', config: CSA, now: at(60) }),
    (e) => {
      assert.equal(e.status, 409)
      assert.match(e.message, new RegExp(`${first.mock}`), 'the refusal has to name the sitting that is open')
      assert.match(e.message, /submitMock/, 'and the way out of it')
      return true
    },
    'walking away from a bad section and starting another is the one gaming path the gates do not close',
  )

  // The other subject is a different exam and a different paper.
  assert.ok(
    (await handleMockStart({ db, subject: 'ap_precalc', section: 'I', source: 'bank', config: PRECALC, now: at(60) })).mock,
  )

  // Finishing it — not abandoning it — is what frees the subject.
  await handleMockSubmit({ db, mockId: first.mock, config: CSA, now: at(200) })
  const second = await handleMockStart({ db, subject: 'ap_csa', section: 'I', source: 'bank', config: CSA, now: at(300) })
  assert.ok(second.mock > first.mock)
})

withSeed('a sitting started and never finished is surfaced once it is past its section budget', async () => {
  const { db } = realDb()
  const m = await handleMockStart({ db, subject: 'ap_csa', section: 'I', source: 'bank', config: CSA, now: T0 })
  const q = await handleNext({ db, subject: 'ap_csa', config: CSA, now: at(60), mockId: m.mock })
  await handleLog({ db, serveId: q.serve, response: 'B', config: CSA, now: at(120) })

  // Ten minutes in, this is a sitting in progress, which is not a thing to report.
  const during = await handleStatus({ db, subject: 'ap_csa', config: CSA, now: at(600) })
  assert.equal(advisory(during, /never submitted/i), undefined)

  // Past the 90 minutes the section itself gets, it is no longer in progress.
  const after = await handleStatus({ db, subject: 'ap_csa', config: CSA, now: at((CSA.exam.mcq_minutes + 1) * 60) })
  const abandoned = advisory(after, /never submitted/i)
  assert.ok(abandoned, `an open sitting past its budget must be visible: ${JSON.stringify(after.advisories)}`)
  assert.match(abandoned, new RegExp(`#${m.mock}`), 'named, so it can be submitted or explained')
  assert.match(abandoned, new RegExp(`${CSA.exam.mcq_minutes} minutes`), 'against the budget it is past')
  assert.match(abandoned, /1 answer|answered 1/, 'and what is on it')
  assert.equal(after.proctored_mocks, 0, 'it still cannot count as a mock — nothing was scored')
})

withSeed('the dashboard is handed the staleness, the pace and the gap ages, not just a snapshot', async () => {
  const { db } = realDb()
  const q = await handleNext({ db, subject: 'ap_csa', config: CSA, now: T0 })
  await handleLog({ db, serveId: q.serve, response: 'B', config: CSA, now: at(200) })

  const data = await handleDashboard({ db, configs: CONFIGS, now: at(9 * 86400) })
  const csa = data.subjects.find((s) => s.config.subject === 'ap_csa')
  assert.equal(csa.last_answer.at, at(200), 'the parent has to be able to see WHEN he last worked')
  assert.equal(csa.last_answer.days, 9)
  assert.ok(csa.pace, 'and the pace measurement, whether or not it is bad enough to advise on')
  assert.ok(Array.isArray(csa.open_gaps), 'and the open gaps with their ages, which nothing rendered at all')
  assert.ok(Array.isArray(csa.unfinished_sittings))

  const empty = data.subjects.find((s) => s.config.subject === 'ap_precalc')
  assert.equal(empty.last_answer, null, 'no answers at all is null, not a fabricated date')
})

withSeed('an open sitting with nothing on it does not lock the subject out forever', async () => {
  // The deadlock the refusal above would otherwise create, and it is total:
  // handleMockSubmit deliberately REFUSES a sitting with no logged answers and
  // leaves it open (so a mistaken submit does not strand a sittable paper). So a
  // /mock/start that was never answered — a mis-tap, or a model that called start
  // twice — could never be submitted, and if it also blocked every new sitting,
  // proctored evidence for this subject would be unreachable for good. The guard
  // therefore refuses only a sitting that holds an ANSWER, which is the only thing
  // that walking away can discard.
  const { db } = realDb()
  const empty = await handleMockStart({ db, subject: 'ap_csa', section: 'I', source: 'bank', config: CSA, now: T0 })
  await assert.rejects(
    () => handleMockSubmit({ db, mockId: empty.mock, config: CSA, now: at(30) }),
    (e) => e instanceof ApiError && /no logged answers/.test(e.message),
    'the fixture depends on submit refusing an empty sitting, which is deliberate behaviour',
  )
  const next = await handleMockStart({ db, subject: 'ap_csa', section: 'I', source: 'bank', config: CSA, now: at(60) })
  assert.ok(next.mock > empty.mock, 'an empty paper holds no evidence, so nothing is discarded by starting another')
})

withSeed('an unfinished sitting with no answers on it is reported as what it is', async () => {
  const { db } = realDb()
  const m = await handleMockStart({ db, subject: 'ap_csa', section: 'I', source: 'bank', config: CSA, now: T0 })
  const s = await handleStatus({ db, subject: 'ap_csa', config: CSA, now: at((CSA.exam.mcq_minutes + 1) * 60) })
  const open = advisory(s, /never submitted/i)
  assert.ok(open, `an open sitting past its budget must be visible even when it is empty: ${JSON.stringify(s.advisories)}`)
  assert.match(open, new RegExp(`#${m.mock}`))
  assert.match(open, /no answers/i, 'and it must not be described as holding evidence it does not hold')
  assert.doesNotMatch(
    open, /Submit it with submitMock and it will be scored/,
    'submitMock refuses an empty sitting, so the advisory must not send him to a call that cannot work',
  )
})

withSeed('the parent page states an unfinished sitting once, not twice', async () => {
  // handleDashboard passes every advisory through verbatim so the student and the
  // parent cannot be told the same judgement in different words — but the card
  // renders the unfinished sitting itself, with its numbers, so the paragraph
  // written for the student would be the same sitting stated twice on one page.
  const { db } = realDb()
  const m = await handleMockStart({ db, subject: 'ap_csa', section: 'I', source: 'bank', config: CSA, now: T0 })
  const q = await handleNext({ db, subject: 'ap_csa', config: CSA, now: at(30), mockId: m.mock })
  await handleLog({ db, serveId: q.serve, response: 'B', config: CSA, now: at(60) })

  const now = at((CSA.exam.mcq_minutes + 1) * 60)
  const student = await handleStatus({ db, subject: 'ap_csa', config: CSA, now })
  assert.ok(advisory(student, /never submitted/i), 'the student is still told, in words')

  const data = await handleDashboard({ db, configs: CONFIGS, now })
  const csa = data.subjects.find((s) => s.config.subject === 'ap_csa')
  assert.equal(
    csa.readiness.advisories.find((a) => /never submitted/i.test(a)), undefined,
    'and the parent gets it as the card’s own fact line instead of the same paragraph again',
  )
  assert.equal(csa.unfinished_sittings.length, 1, 'which means the card has to actually be handed the sitting')
  assert.equal(csa.unfinished_sittings[0].id, m.mock)
  assert.equal(csa.unfinished_sittings[0].answered, 1)
})

// ---------------------------------------------------------------------------
// A paper is made of the section's own questions, and nothing may stand in
//
// Driven over REAL SQLite and worker/schema.sql, with the bank built here rather
// than seeded: the defect is about item KINDS, and the seeded Precalc bank does
// not yet hold the kinds that expose it. (It is also stale relative to the
// markdown, which is somebody else's fix; nothing below reads it.)
//
// THE DEFECT. handleNext closed a kind off a sitting only when that kind was a
// half of the EXAM the sitting belongs to — the other half of the paper, or a
// half already full. A kind belonging to NEITHER half was left servable on
// purpose, with the reason written into the source: "every Precalc item is
// `constructed_model_graded`", so no such item could ever be marked, so no such
// answer could ever reach a composite. That premise died the moment the Precalc
// packs could declare `kind: mcq` (and a per-problem answer key, which makes a
// `constructed` item server-graded).
//
// What it then produced, measured below on the pre-fix code: a section I sitting
// of 42 answers, 20 of them keyed SHORT-ANSWER DRILLS and only 22 of the
// section's 42 multiple choice questions — `counted: true`, `composite_pct: 100`,
// `scored_out_of: 42`. `covered` compares attempts.length of ANY kind against
// ceil(scorable x 0.9), and `right`/`scored` counted every server-graded answer on
// the paper whatever it was a question of. That is this project's founding bug in
// new clothes: 100% reported for "Section I, 42 multiple-choice questions" on a
// paper that was not that section.
// ---------------------------------------------------------------------------

const SCHEMA = new URL('../schema.sql', import.meta.url)

/**
 * A Precalc bank holding both an exam-shaped half and a pile of keyed drills,
 * over real SQL.
 *
 * Deliberately built so that BOTH could compose the paper: the drills sit on
 * their own topics, so the mock sampler (which spreads across a unit's topics
 * least-asked-first, then by name) reaches them before the multiple choice ones —
 * which is exactly what a real bank looks like while the exam-shaped items are
 * still being written.
 *
 * @param mcq  how many keyed `mcq` items the bank holds, i.e. whether the exam's
 *             multiple choice half can be supplied at all (it takes
 *             ceil(42 x 0.9) = 38 before section I is scorable).
 * @param drills  how many keyed `constructed` short-answer items sit alongside.
 */
function precalcBank({ mcq = PRECALC.exam.mcq_count, drills = 20, frq = 0 } = {}) {
  const sqlite = new DatabaseSync(':memory:')
  sqlite.exec(readFileSync(SCHEMA, 'utf8'))
  const topic = sqlite.prepare(
    `INSERT INTO topics (id, subject, name, unit, tested_on_exam, exam_weight_low, exam_weight_high)
     VALUES (?, 'ap_precalc', ?, '1', 1, 30, 40)`,
  )
  const item = sqlite.prepare(
    `INSERT INTO items (id, subject, topic, unit, practice, kind, stem, options_json, answer, explanation, calc_allowed)
     VALUES (?, 'ap_precalc', ?, '1', 'P1', ?, ?, ?, ?, ?, 0)`,
  )
  const pad = (n) => String(n).padStart(2, '0')
  // Drills first in name order, so the sampler prefers them and the padding is
  // reproduced rather than hoped for.
  for (let i = 1; i <= drills; i++) {
    topic.run(`c${pad(i)}`, `Drill topic ${i}`)
    item.run(`c${pad(i)}-q1`, `c${pad(i)}`, 'constructed', `Short answer ${i}`, null, '7', `Because ${i}.`)
  }
  for (let i = 1; i <= mcq; i++) {
    topic.run(`k${pad(i)}`, `Exam topic ${i}`)
    item.run(
      `k${pad(i)}-q1`, `k${pad(i)}`, 'mcq', `Multiple choice ${i}`,
      JSON.stringify({ A: 'a', B: 'b', C: 'c', D: 'd' }), 'B', `Because ${i}.`,
    )
  }
  for (let i = 1; i <= frq; i++) {
    topic.run(`f${pad(i)}`, `Free response topic ${i}`)
    item.run(`f${pad(i)}-q1`, `f${pad(i)}`, 'frq', `Free response ${i}`, null, null, `Because ${i}.`)
  }
  return { sqlite, db: makeDb(d1(sqlite)) }
}

/** What is actually on one paper: every attempt filed under the sitting, in order. */
async function paperOf(db, mockId, subject = 'ap_precalc') {
  return (await db.attempts(subject)).filter((a) => Number(a.mock_id) === Number(mockId))
}

/**
 * Sit a Precalc mock, answering every question right off the real key, until the
 * server refuses or `limit` answers are on the paper.
 *
 * A rubric-scored item has no key, so it gets written work — answered, and not
 * markable, which is what a free-response answer is today.
 */
async function sitPrecalc({ db, mock, limit, spacing = 120, seconds = 60 }) {
  let answered = 0
  let refusal = null
  while (answered < limit) {
    let q
    try {
      q = await handleNext({ db, subject: 'ap_precalc', config: PRECALC, now: at(answered * spacing), mockId: mock })
    } catch (e) {
      refusal = e
      break
    }
    if (q.type !== 'question') continue
    const item = await db.item((await db.serve(q.serve)).item_id)
    await handleLog({
      db, serveId: q.serve, response: item.answer ?? 'my working, in prose',
      config: PRECALC, now: at(answered * spacing + seconds),
    })
    answered++
  }
  return { answered, refusal }
}

test('a section I paper is the section\'s own multiple choice questions, never drills padding out the count', async () => {
  const { db } = precalcBank({ mcq: PRECALC.exam.mcq_count, drills: 20 })
  const expected = PRECALC.exam.mcq_count
  const m = await handleMockStart({ db, subject: 'ap_precalc', section: 'I', source: 'official', config: PRECALC, now: T0 })

  const { answered } = await sitPrecalc({ db, mock: m.mock, limit: expected + 4 })
  const paper = await paperOf(db, m.mock)

  // THE INVARIANT. A section I sitting is 42 multiple choice questions. A keyed
  // short-answer drill fills no half of it (sectionFill credits an answer only to
  // its own kind's part), so it cannot be one of the 42 — and it cannot be handed
  // out as though it were.
  assert.deepEqual(
    [...new Set(paper.map((a) => a.kind))], ['mcq'],
    `a section I paper made partly of short-answer drills is not a section I paper at all: ` +
      `${paper.filter((a) => a.kind !== 'mcq').length} of its ${paper.length} answers are not multiple choice`,
  )
  assert.equal(answered, expected, 'and the bank can supply the whole section, so the whole section is what it sits')
  assert.equal(new Set(paper.map((a) => a.item_id)).size, paper.length, 'no question may appear twice on one paper')

  const r = await handleMockSubmit({ db, mockId: m.mock, config: PRECALC, now: at(expected * 120 + 600) })
  assert.equal(r.answered, expected)
  assert.equal(r.counted, true, 'the whole section, answered inside its budget, is a scored sitting')
  assert.equal(r.composite_pct, 100, 'every answer was the key itself, so this is 100 — and it means 100 of section I')
  assert.equal(r.scored_out_of, expected, 'measured over the 42 multiple choice questions the section actually contains')
  assert.equal(r.scored, expected, 'every answer on it was mechanically marked')
  assert.equal(r.blanks, 0)
})

test('a drill answer already on a paper cannot buy that paper past the coverage gate', async () => {
  // The transition case, and the reason the submit side is guarded as well as the
  // serve side: a sitting can be OPEN with drills already on it when the
  // exam-shaped content lands (a deploy reloads the bank; the sitting does not
  // restart). From then on /next serves only multiple choice, so the paper ends up
  // mixed — and 20 drills plus 22 multiple choice used to clear a 38-of-42
  // coverage gate and be scored 100.
  const { db } = precalcBank({ mcq: PRECALC.exam.mcq_count, drills: 20 })
  const expected = PRECALC.exam.mcq_count
  const mock = await db.startMock({ subject: 'ap_precalc', section: 'I', started_at: T0, proctored: 1, source: 'official' })

  const drills = 20
  const onSection = expected - drills
  let n = 0
  const file = async (item_id, topic, kind) => {
    await db.recordAttempt({
      ts: at(n * 120 + 60), subject: 'ap_precalc', item_id, topic, unit: '1', practice: 'P1',
      response: kind === 'mcq' ? 'B' : '7', correct: 1, graded_by: 'server', seconds: 60,
      hints_used: 0, conditions: 'proctored_mock', mock_id: mock,
    })
    n++
  }
  const pad = (i) => String(i).padStart(2, '0')
  for (let i = 1; i <= drills; i++) await file(`c${pad(i)}-q1`, `c${pad(i)}`, 'constructed')
  for (let i = 1; i <= onSection; i++) await file(`k${pad(i)}-q1`, `k${pad(i)}`, 'mcq')

  const r = await handleMockSubmit({ db, mockId: mock, config: PRECALC, now: at(expected * 120 + 600) })
  assert.equal(r.answered, expected, 'the paper does hold 42 answers, every one of them correct')
  assert.equal(
    r.composite_pct, null,
    `22 of the section's 42 multiple choice questions is not 90% of section I, whatever else is on the paper`,
  )
  assert.equal(r.counted, false, 'and a sitting with no composite cannot move readiness')
  assert.equal(r.scored_out_of, null, 'there was no division, and a number here would read as one')
  assert.match(r.basis, /short of the \d+% of the section/, `the existing shortfall reason is what fires: ${r.basis}`)
  assert.match(r.basis, new RegExp(`${onSection} of its ${expected} multiple choice`), r.basis)
  // The drills are still his work: recorded, counted as practice, and named.
  assert.equal(r.status.questions_answered, expected, 'nothing he answered is thrown away')
  assert.match(
    r.basis, new RegExp(`${drills} of those answer\\(s\\) — constructed items — fill no half of a section I paper`),
    `the basis has to account for the other ${drills} answers rather than leave them unexplained: ${r.basis}`,
  )
  assert.match(r.basis, /count as ordinary practice/, r.basis)
  assert.doesNotMatch(r.basis, /Scored \d+ right/, 'an unscored sitting must not also report a score')

  // The same sitting, on the surface that resurfaces afterwards: it must quote the
  // number the gate was applied to, not the paper length, or the two contradict.
  const s = await handleStatus({ db, subject: 'ap_precalc', config: PRECALC, now: at(expected * 120 + 900) })
  const adv = s.advisories.find((a) => /not scored/i.test(a))
  assert.ok(adv, `an unscored sitting must stay visible: ${JSON.stringify(s.advisories)}`)
  assert.match(adv, new RegExp(`reached ${onSection} of ${expected}`), `not "reached 42 of 42": ${adv}`)
  assert.match(adv, new RegExp(`other ${drills} answer\\(s\\) are of a kind a section I paper does not contain`), adv)
})

test('a sitting hands out a different question each time, and none at all once it is in', async () => {
  // Re-verified here because both guards run through the same `unservable` list the
  // kind filter above was added to, so a mistake there would silently reopen them.
  const { db } = precalcBank({ mcq: PRECALC.exam.mcq_count, drills: 20 })
  const m = await handleMockStart({ db, subject: 'ap_precalc', section: 'I', source: 'official', config: PRECALC, now: T0 })

  // Two /next with nothing logged in between: the first question is on screen, and
  // a served-but-unanswered item is still on the paper, so it cannot be issued
  // again. Two attempt rows for one question are not two questions of evidence.
  const first = await handleNext({ db, subject: 'ap_precalc', config: PRECALC, now: T0, mockId: m.mock })
  const second = await handleNext({ db, subject: 'ap_precalc', config: PRECALC, now: at(60), mockId: m.mock })
  const idOf = async (q) => (await db.serve(q.serve)).item_id
  assert.notEqual(await idOf(first), await idOf(second), 'a question in flight must not be handed out twice')

  await handleLog({ db, serveId: first.serve, response: 'B', config: PRECALC, now: at(90) })
  await handleLog({ db, serveId: second.serve, response: 'B', config: PRECALC, now: at(120) })
  await handleMockSubmit({ db, mockId: m.mock, config: PRECALC, now: at(200) })
  await assert.rejects(
    () => handleNext({ db, subject: 'ap_precalc', config: PRECALC, now: at(300), mockId: m.mock }),
    (e) => e instanceof ApiError && e.status === 409,
    'a closed sitting cannot be served another question',
  )
})

test('a Precalc drill is served and marked exactly as before outside a mock', async () => {
  // The capability this must not break: a keyed `constructed` item is the whole of
  // the measurable-topic-percentage work, and ordinary drilling is where it lives.
  const { db } = precalcBank({ mcq: PRECALC.exam.mcq_count, drills: 20 })
  const kinds = new Set()
  for (let i = 0; i < 6; i++) {
    const q = await handleNext({ db, subject: 'ap_precalc', config: PRECALC, now: at(i * 300) })
    assert.equal(q.type, 'question', `ordinary drilling must not be refused: ${JSON.stringify(q)}`)
    const item = await db.item((await db.serve(q.serve)).item_id)
    const r = await handleLog({ db, serveId: q.serve, response: item.answer, config: PRECALC, now: at(i * 300 + 90) })
    assert.equal(r.graded_by, 'server', `${item.id}: a keyed drill must still reach a real verdict`)
    assert.equal(r.correct, true, `${item.id}: its own key must still mark its own answer right`)
    kinds.add(item.kind)
  }
  assert.ok(
    kinds.has('constructed'),
    `a short-answer drill must still be servable outside a sitting — got ${[...kinds].join(', ')}`,
  )
  const s = await handleStatus({ db, subject: 'ap_precalc', config: PRECALC, now: at(3000) })
  assert.equal(s.questions_answered, 6, 'and the drills count as practice, exactly as they did before')
})

test('a sitting on a bank with no exam-shaped question of its own is still real work, and still unscorable', async () => {
  // THE ALLOWANCE THAT SURVIVES, narrowed to the fact it was justified by. api.js
  // left a no-half kind servable inside a sitting because "practice against a bank
  // that cannot supply the section is kept as real work that simply cannot be
  // scored" — true only while the bank holds nothing the section IS made of, which
  // is the state Precalc is in until the exam-shaped items land. So a drills-only
  // bank still sits: nothing is refused, nothing is discarded, and the sitting is
  // disclosed as unscorable through the existing `supplied` reason rather than
  // pretending to a composite. As soon as one multiple choice question exists, the
  // test above takes over and drills stop appearing on section I papers.
  const { db } = precalcBank({ mcq: 0, drills: 12 })
  const m = await handleMockStart({ db, subject: 'ap_precalc', section: 'I', source: 'bank', config: PRECALC, now: T0 })
  const { answered, refusal } = await sitPrecalc({ db, mock: m.mock, limit: 5 })
  assert.equal(refusal, null, `timed practice on an unsuppliable section is not refused: ${refusal?.message}`)
  assert.equal(answered, 5)

  const r = await handleMockSubmit({ db, mockId: m.mock, config: PRECALC, now: at(2000) })
  assert.equal(r.scored, 5, 'the answers were marked, and saying otherwise would discard them')
  assert.equal(r.counted, false)
  assert.equal(r.composite_pct, null, 'null is not zero and must never be shown as one')
  assert.match(r.basis, /cannot be scored from this question bank at all/, r.basis)
  assert.match(r.basis, /0 exam-tested multiple choice question\(s\)/, r.basis)
})

test('a question the bank cannot ask is neither a blank nor a wrong answer, and the divisor identity still holds', async () => {
  // 38 keyed multiple choice items is exactly what it takes for section I to be
  // scorable, and four fewer than the section contains: the paper runs out at 38,
  // and no drill may be handed out to close the gap.
  //
  // WHAT THIS TEST USED TO PIN, and why it was wrong. It asserted
  // `scored_out_of: 42` and `blanks: 4` — "the four it never reached count as blank
  // AND as wrong" — and stopped there, without asking what that costs downstream.
  // It costs everything: max_blanks is 1, blanks are SUMMED across a three-sitting
  // window, so 4 per sitting is 12 per window and the criterion was UNSATISFIABLE BY
  // CONSTRUCTION on this bank. `ready` could never be true, and the string a parent
  // read as the one thing blocking his son was `At most 1 blank response across the
  // window — 12 blanks`, on a record where the son had answered every question the
  // system was able to ask him, correctly, four times over.
  //
  // A question the bank cannot ask is not one he failed to reach. api.js's own
  // comment said so already, and the codebase had already ruled the same way when a
  // whole half is missing (a full CSA sitting on a bank with no free-response items
  // scores 100 over 42, not 91.3 over 46 — see the sibling test above). This is that
  // rule applied inside a half instead of across two, and the shortfall is disclosed
  // as what it is: a gap in the question bank.
  const need = Math.ceil(PRECALC.exam.mcq_count * MIN_MOCK_COVERAGE)
  const { db } = precalcBank({ mcq: need, drills: 20 })
  const m = await handleMockStart({ db, subject: 'ap_precalc', section: 'I', source: 'official', config: PRECALC, now: T0 })

  const { answered, refusal } = await sitPrecalc({ db, mock: m.mock, limit: PRECALC.exam.mcq_count })
  assert.equal(answered, need, 'the paper is as long as the bank can make it, and not one drill longer')
  assert.ok(refusal instanceof ApiError && refusal.status === 409, `and then it says so: ${refusal?.message}`)
  assert.match(refusal.message, /cannot be drawn from this bank/, refusal.message)
  const paper = await paperOf(db, m.mock)
  assert.deepEqual([...new Set(paper.map((a) => a.kind))], ['mcq'])

  const r = await handleMockSubmit({ db, mockId: m.mock, config: PRECALC, now: at(need * 120 + 600) })
  assert.equal(r.counted, true, `${need} of ${PRECALC.exam.mcq_count} is 90% of section I, so this is a scored sitting`)
  assert.equal(r.expected, PRECALC.exam.mcq_count, 'the real section size is a true fact and he still sees it')
  assert.equal(
    r.scored_out_of, need,
    'the divisor is the questions the bank can ask AND mark — counting the four it cannot ask as wrong is the same ' +
      'false negative as marking an unkeyed item wrong',
  )
  assert.equal(
    r.blanks, 0,
    'a question that was never asked is not a bubble he left empty; four of these per sitting made max_blanks (1) ' +
      'unreachable and pinned the blame on him',
  )
  assert.equal(r.composite_pct, 100, 'every answer given was the key itself, over every question he could be asked')

  // Said in words, and attributed to the bank rather than to him.
  assert.match(
    r.basis, new RegExp(`${PRECALC.exam.mcq_count - need} of those ${PRECALC.exam.mcq_count} questions cannot be asked`),
    `the basis has to disclose the shortfall rather than absorb it silently: ${r.basis}`,
  )
  assert.match(r.basis, /gap in the question bank rather than a question he skipped/, r.basis)
  assert.doesNotMatch(
    r.basis, /never reached/,
    `nothing can be "never reached" that this bank cannot ask: ${r.basis}`,
  )

  // The identity the GPT does its own arithmetic against, unchanged.
  const right = Number(/Scored (\d+) right out of (\d+)/.exec(r.basis)[1])
  const stated = Number(/Scored (\d+) right out of (\d+)/.exec(r.basis)[2])
  assert.equal(right, need, 'every answer given was the key itself')
  assert.equal(stated, r.scored_out_of, 'one composite, one divisor, stated once')
  assert.equal(Number(((right / r.scored_out_of) * 100).toFixed(1)), r.composite_pct, 'right / scored_out_of is the composite')

  // And the questions he DID skip are still his. One answer short of the bank's
  // supply is one blank, and the sitting drops below the coverage gate with it —
  // the gate is measured against the 42 the section has, not the 38 the bank holds,
  // so nothing here lowered it.
  const { db: db2 } = precalcBank({ mcq: need, drills: 20 })
  const m2 = await handleMockStart({ db: db2, subject: 'ap_precalc', section: 'I', source: 'official', config: PRECALC, now: T0 })
  await sitPrecalc({ db: db2, mock: m2.mock, limit: need - 1 })
  const short = await handleMockSubmit({ db: db2, mockId: m2.mock, config: PRECALC, now: at(need * 120 + 600) })
  assert.equal(short.blanks, 1, 'the one question he could have been asked and was not IS a blank')
  assert.match(short.basis, /1 question\(s\) were never reached/, short.basis)
  assert.equal(
    short.composite_pct, null,
    `${need - 1} of ${PRECALC.exam.mcq_count} is under the 90% the gate asks for, and the gate did not move`,
  )
})

// ---------------------------------------------------------------------------
// THE FOUNDING FAILURE, in both directions, on the bank that actually ships
//
// Driven over REAL SQLite, worker/schema.sql and worker/seed.sql, through the real
// handlers, because the whole of both defects is a disagreement between the exam
// table (42 multiple choice + 4 free-response) and the shipped Precalc content (38
// exam-tested keyed mcq, 4 rubric-scored frq). No fabricated bank can express it:
// the in-memory fake in this file has repeatedly proven MORE capable than the real
// projection, and every `section: 'full'` test above is ap_csa, whose 221 mcq items
// exceed mcq_count outright — so the absorption path below cannot arise there at
// all.
//
// DEFECT ONE, understating and misattributing. Precalc's exam-tested keyed mcq
// supply is 38; `need = ceil(42 x 0.9)` is 38, so partObstacle passed the half and
// `scorable` claimed all 42. `unreached = scorable - onSection.length` was then 4 on
// EVERY sitting, forever, and blanks are summed across a three-sitting window
// against max_blanks 1. Measured: four sittings, days 0/11/22/33, every one of the
// 38 answers correct off the real key — readiness 86%, `ready:false`, and
// `next_thing_blocking` read `At most 1 blank response across the window — 12
// blanks`. It blamed the student for four questions the server itself refused to
// hand him: /next's own refusal on the same paper says "the 4 multiple choice
// question(s) it still owes cannot be drawn from this bank".
//
// DEFECT TWO, overstating, which is the unsafe direction. On a `full` paper the
// same 4-question gap was absorbed instead: `unreached` credited the 4 rubric
// answers as reaching 4 of the multiple choice half's questions (erasing 4 blanks),
// while `denominator = scorable - unmarkable` took the SAME 4 rows off a divisor
// that never included them. One row counted twice in the student's favour. Measured
// on one sitting submitted at two points: 38 answers read composite 90.2 over 41
// with 4 blanks, 42 answers read composite 100 over 38 with 0 blanks, and the
// markable evidence between those two states was ONE extra answer. On this bank
// `blanks <= max_blanks` was reachable only that way.
// ---------------------------------------------------------------------------

/** Every exam-tested topic, attempted once as an ordinary drill, so coverage holds. */
async function drillEveryTopic(db, sqlite, subject, config) {
  const topics = sqlite
    .prepare(`SELECT id FROM topics WHERE subject = ? AND tested_on_exam != 0`).all(subject).map((t) => t.id)
  const anItem = sqlite.prepare(`SELECT id, answer FROM items WHERE subject = ? AND topic = ? LIMIT 1`)
  let clock = -200000
  for (const topic of topics) {
    const item = anItem.get(subject, topic)
    assert.ok(item, `every exam-tested topic needs an item for this fixture: ${topic} has none`)
    const serve = await db.recordServe({ subject, item_id: item.id, served_at: at(clock) })
    await handleLog({ db, serveId: serve, response: item.answer ?? WRITTEN_RESPONSE, config, now: at(clock + 60) })
    clock += 300
  }
  return topics.length
}

/**
 * Sit one Precalc paper starting at `base` seconds, answering everything right off
 * the real key, until the server refuses or `limit` answers are on it.
 *
 * Unlike sitPrecalc above this takes a base offset, because the defect is about a
 * WINDOW of sittings days apart, and the clock those sittings are judged on is the
 * server's own.
 */
async function sitPrecalcAt({ db, mock, base, limit, spacing = 60 }) {
  let answered = 0
  let refusal = null
  const kinds = []
  while (answered < limit) {
    let q
    try {
      q = await handleNext({ db, subject: 'ap_precalc', config: PRECALC, now: at(base + answered * spacing), mockId: mock })
    } catch (e) {
      refusal = e
      break
    }
    if (q.type !== 'question') continue
    const item = await db.item((await db.serve(q.serve)).item_id)
    await handleLog({
      db, serveId: q.serve, response: item.answer ?? 'my working, in prose',
      config: PRECALC, now: at(base + answered * spacing + 30),
    })
    kinds.push(item.kind)
    answered++
  }
  return { answered, refusal, kinds }
}

const DAY = 86400

withSeed('the four questions the shipped Precalc bank cannot ask are not four blanks in his answer sheet', async () => {
  const { db, sqlite } = realDb()
  const drilled = await drillEveryTopic(db, sqlite, 'ap_precalc', PRECALC)
  assert.equal(drilled, 33, 'the coverage prerequisite is met by drilling, so the performance criteria are evaluated')

  // Four sittings, spaced 11 days apart so the window qualifies, with the official
  // one inside the judged run (the last three).
  const sittings = []
  for (const [i, day] of [0, 11, 22, 33].entries()) {
    const m = await handleMockStart({
      db, subject: 'ap_precalc', section: 'I', source: i === 2 ? 'official' : 'bank', config: PRECALC, now: at(day * DAY),
    })
    const { answered, refusal, kinds } = await sitPrecalcAt({ db, mock: m.mock, base: day * DAY, limit: 60 })
    assert.deepEqual([...new Set(kinds)], ['mcq'], 'a section I paper is multiple choice and nothing else')
    assert.equal(answered, 38, `this bank can put 38 of the section's 42 questions on a paper, and it puts all 38`)
    assert.match(
      refusal.message, /4 multiple choice question\(s\) it still owes cannot be drawn from this bank/,
      `and /next says exactly whose gap the other four are: ${refusal.message}`,
    )
    sittings.push(await handleMockSubmit({ db, mockId: m.mock, config: PRECALC, now: at(day * DAY + 40 * 60) }))
  }

  for (const r of sittings) {
    assert.equal(r.counted, true, '38 of 42 is 90% of section I, answered inside the budget')
    assert.equal(r.blanks, 0, 'he answered every question he was offered; there are no unfilled bubbles')
    assert.equal(r.scored_out_of, 38, 'and the composite is measured over the questions the bank could ask')
    assert.equal(r.composite_pct, 100)
    assert.match(r.basis, /4 of those 42 questions cannot be asked from this bank at all/, r.basis)
    assert.match(r.basis, /gap in the question bank rather than a question he skipped/, r.basis)
    assert.doesNotMatch(r.basis, /count as blank AND as wrong/, `nothing here was blank: ${r.basis}`)
  }

  const s = await handleStatus({ db, subject: 'ap_precalc', config: PRECALC, now: at(34 * DAY) })
  const blanks = s.criteria.find((c) => /blank response/.test(c.requirement))
  assert.ok(blanks, `the blanks criterion must be reported: ${JSON.stringify(s.criteria.map((c) => c.requirement))}`)
  assert.equal(blanks.met, true, `it was UNSATISFIABLE by construction on this bank: ${blanks.evidence}`)
  assert.equal(blanks.evidence, '0 blanks', 'and the evidence for it is that he left none')
  assert.doesNotMatch(
    s.next_thing_blocking, /blank/i,
    `a student who answered everything he was offered may not be told blanks are what block him: ${s.next_thing_blocking}`,
  )
  // What DOES block him now is honest and is not about him: the free-response
  // grader has never been calibrated, so that evidence is unmeasured rather than
  // failed, and api.js passes `calibrated: false` as a literal at every call site.
  assert.match(s.next_thing_blocking, /grader not yet calibrated/, s.next_thing_blocking)

  // The bank's own shortfall does not vanish with the blank count: it is disclosed
  // on every surface, as a fact about the bank, so a composite of 100 cannot be read
  // as 100% of the real section.
  const shortfall = s.advisories.find((a) => /cannot supply one half of the exam in full/i.test(a))
  assert.ok(shortfall, `the shortfall must be disclosed somewhere: ${JSON.stringify(s.advisories)}`)
  assert.match(shortfall, /38 of the 42 multiple choice question\(s\)/, shortfall)
  assert.match(shortfall, /not counted as blanks and not counted wrong/, shortfall)
  const dash = await handleDashboard({ db, configs: { ap_precalc: PRECALC }, now: at(34 * DAY) })
  assert.ok(
    dash.subjects[0].readiness.advisories.some((a) => /cannot supply one half of the exam in full/i.test(a)),
    'and the parent reading the card sees the same thing, not a bare 100%',
  )
})

withSeed('a rubric answer cannot erase a blank and shrink the divisor at the same time', async () => {
  // The same student, the same bank, the same work, one `full` sitting — submitted
  // at two points. Both readings have to be honest ABOUT THE SAME EVIDENCE, and the
  // rubric half may not buy coverage for the multiple choice half in either.
  //
  // THIRTY-EIGHT ANSWERS is the audit's own fixture and the number the selector
  // reaches by itself: it spends the multiple choice half first and then interleaves
  // (measured on the shipped bank: 36 mcq, then F m F m F F), so a paper cut at 38
  // holds 37 multiple choice answers and 1 rubric one. That is 37 of the 38 multiple
  // choice questions the bank can ask — under the gate — and it used to CLEAR the
  // gate at "38 of 42" and score 90.2, because the rubric answer was counted as
  // reaching a multiple choice question.
  const { db: dbShort } = realDb()
  const mShort = await handleMockStart({
    db: dbShort, subject: 'ap_precalc', section: 'full', source: 'official', config: PRECALC, now: T0,
  })
  await sitPrecalcAt({ db: dbShort, mock: mShort.mock, base: 0, limit: 38 })
  const paper = await paperOf(dbShort, mShort.mock)
  const mcqAnswered = paper.filter((a) => a.kind === 'mcq').length
  const frqAnswered = paper.filter((a) => a.kind === 'frq').length
  assert.equal(mcqAnswered + frqAnswered, 38, 'the whole paper is one of the two halves')
  assert.ok(frqAnswered > 0, 'precondition: the paper holds rubric answers, which is what used to pad the count')
  assert.ok(mcqAnswered < 38, 'precondition: and it is short of the multiple choice questions the bank can ask')

  const r = await handleMockSubmit({ db: dbShort, mockId: mShort.mock, config: PRECALC, now: at(3600) })
  assert.equal(
    r.composite_pct, null,
    `${mcqAnswered} of the 38 multiple choice questions this bank can ask is under 90% of section I — a rubric answer ` +
      'is not a multiple choice question and may not fill the coverage gate for one',
  )
  assert.equal(r.counted, false, 'so it cannot count toward readiness at all')
  assert.equal(r.scored_out_of, null, 'and there was no division')
  assert.equal(
    r.blanks, 38 - mcqAnswered,
    'the multiple choice questions he never reached ARE blanks: the bank could have asked them',
  )
  assert.match(r.basis, /short of the \d+% of the section/, r.basis)

  // And the surface that resurfaces afterwards quotes the number the gate was
  // applied to, with both reasons it differs from `answered` named separately: an
  // answer on a half nothing can mark is not an answer of a kind the section does
  // not contain, and neither is a question the bank cannot ask.
  const sShort = await handleStatus({ db: dbShort, subject: 'ap_precalc', config: PRECALC, now: at(4000) })
  const adv = sShort.advisories.find((a) => /not scored/i.test(a))
  assert.ok(adv, `the sitting must stay visible: ${JSON.stringify(sShort.advisories)}`)
  assert.match(adv, new RegExp(`reached ${mcqAnswered} of ${PRECALC.exam.mcq_count}`), `not "reached 38 of 42": ${adv}`)
  assert.match(adv, /on a half of section full this bank cannot mark/, adv)
  assert.match(adv, /can put only 38 of those 42 on a paper at all/, adv)
  assert.match(adv, /gap in the question bank rather than questions he skipped/, adv)

  // The same paper, four multiple choice answers further on: now it covers what the
  // bank can ask, and the rubric half neither adds a reached question nor takes one
  // off the divisor.
  const { db, sqlite } = realDb()
  const m = await handleMockStart({ db, subject: 'ap_precalc', section: 'full', source: 'official', config: PRECALC, now: T0 })
  const { kinds } = await sitPrecalcAt({ db, mock: m.mock, base: 0, limit: 46 })
  assert.equal(kinds.filter((k) => k === 'mcq').length, 38, 'every multiple choice question the bank can ask')
  assert.equal(kinds.filter((k) => k === 'frq').length, PRECALC.exam.frq_count, 'and the whole rubric half')

  const full = await handleMockSubmit({ db, mockId: m.mock, config: PRECALC, now: at(4000) })
  assert.equal(full.counted, true)
  assert.equal(full.composite_pct, 100, 'every markable answer right, over every markable question')
  assert.equal(
    full.scored_out_of, 38,
    'the divisor is the multiple choice half the bank can ask; the rubric half was never in it, so it cannot be ' +
      'deducted from it either',
  )
  assert.equal(full.blanks, 0, 'and the rubric answers are not four multiple choice questions "reached"')
  assert.equal(full.ungraded, PRECALC.exam.frq_count, 'the rubric answers are reported as needing a grader, once')
  assert.doesNotMatch(
    full.basis, /came back as work no grader can mark/,
    `the rubric half is excluded by its own obstacle; deducting it AGAIN was the double count: ${full.basis}`,
  )
  assert.match(full.basis, /rubric-scored rather than mechanically marked/, full.basis)
  assert.match(full.basis, /4 of them are questions this bank cannot ask/, full.basis)

  // A section I sitting of the same 38 answers reads the SAME, which is the
  // disagreement this pair of defects produced: 90.2 over 41 with 4 blanks on one
  // surface, 100 over 38 with 0 blanks on the other, from one afternoon's work.
  const { db: db1 } = realDb()
  const m1 = await handleMockStart({ db: db1, subject: 'ap_precalc', section: 'I', source: 'official', config: PRECALC, now: T0 })
  await sitPrecalcAt({ db: db1, mock: m1.mock, base: 0, limit: 60 })
  const one = await handleMockSubmit({ db: db1, mockId: m1.mock, config: PRECALC, now: at(4000) })
  assert.deepEqual(
    { composite: one.composite_pct, out_of: one.scored_out_of, blanks: one.blanks },
    { composite: full.composite_pct, out_of: full.scored_out_of, blanks: full.blanks },
    'the same 38 markable answers must not score differently for having a rubric half beside them',
  )

  // Four such sittings and the blank criterion is met on evidence rather than on
  // absorption: the stored blank counts are all 0 because nothing was left empty.
  assert.deepEqual(
    sqlite.prepare('SELECT blanks FROM mocks WHERE id = ?').all(m.mock).map((x) => x.blanks), [0],
    'and the stored number the criterion reads agrees',
  )
})

withSeed('every answer on a mixed paper is excluded once, for one reason', async () => {
  // The state api.js:1143-1149 names as live: a sitting is OPEN with short-answer
  // drills already on it when the exam-shaped content lands, so its paper is mixed.
  //
  // THE DEFECT. `ungraded` counted every answer with no server verdict, paper-wide,
  // and the basis then described the whole of it as "responses that need human or
  // model grading" — including a model-graded drill that the very next sentence
  // also excluded as an answer that "fills no half of a section I paper". The same
  // row, excluded twice, for two different reasons, in one basis. On a `full` paper
  // the mismatch was arithmetical instead: `ungraded: 5` beside a divisor deduction
  // of 4, with the fifth row in no arithmetic at all.
  const { db, sqlite } = realDb()
  const m = await handleMockStart({ db, subject: 'ap_precalc', section: 'I', source: 'official', config: PRECALC, now: T0 })
  const drill = (kind, ts) => {
    const it = sqlite.prepare(
      `SELECT i.id, i.topic, i.unit, i.practice, i.answer FROM items i
       JOIN topics t ON t.id = i.topic AND t.subject = i.subject
       WHERE i.subject = 'ap_precalc' AND i.kind = ? AND t.tested_on_exam != 0 LIMIT 1`,
    ).get(kind)
    assert.ok(it, `the seed must hold an exam-tested ${kind} item for this fixture`)
    return db.recordAttempt({
      ts, subject: 'ap_precalc', item_id: it.id, topic: it.topic, unit: it.unit, practice: it.practice,
      response: it.answer ?? 'working', correct: it.answer ? 1 : 0, graded_by: it.answer ? 'server' : 'model',
      seconds: 60, hints_used: 0, conditions: 'proctored_mock', mock_id: m.mock,
    })
  }
  await drill('constructed', at(10))               // keyed: marked, and still not section I
  await drill('constructed_model_graded', at(20))  // unkeyed rubric work: no verdict at all
  await sitPrecalcAt({ db, mock: m.mock, base: 60, limit: 60 })

  const r = await handleMockSubmit({ db, mockId: m.mock, config: PRECALC, now: at(4000) })
  assert.equal(r.answered, 40, '38 multiple choice answers and the two drills already on the paper')
  assert.equal(r.ungraded, 1, 'one row on this paper carries no verdict: the rubric drill')

  // The paper is PARTITIONED by the prose: every answer is accounted for exactly
  // once, and the counts add up to `answered`.
  const grading = /(\d+) response\(s\) need human or model grading/.exec(r.basis)
  assert.equal(grading, null, `no answer to section ITSELF needs a grader here, so nothing may claim any do: ${r.basis}`)
  const set_aside = /(\d+) of those answer\(s\) — ([\w/]+) items — fill no half/.exec(r.basis)
  assert.ok(set_aside, `the drills have to be accounted for: ${r.basis}`)
  assert.equal(Number(set_aside[1]), 2, 'both drills, named once, in the clause that owns them')
  assert.equal(set_aside[2], 'constructed/constructed_model_graded')
  assert.match(
    r.basis, /1 of them carries no grader's verdict either/,
    `and the ungraded count stays reconstructible from the prose rather than unexplained: ${r.basis}`,
  )

  // Unchanged by any of it: the drills cannot fill section I, and the composite is
  // over the multiple choice questions the bank can ask.
  assert.equal(r.scored_out_of, 38, 'the divisor is the section half, not the paper length')
  assert.equal(r.composite_pct, 100)
  assert.equal(r.blanks, 0)
})
