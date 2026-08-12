// Regression tests for db.js against the REAL schema.
//
// 1. ATTEMPT_COLS. api.js's mock-submit blank count reads `a.response` off every
//    row returned by db.attempts(). If ATTEMPT_COLS omits that column,
//    `response` comes back `undefined` on every row, so `(a.response ?? '') ===
//    ''` is true for every attempt regardless of what the student actually
//    typed — every answered question silently counts as a blank.
//
// 2. Spending a serve exactly once. A `SELECT logged` followed by an
//    unconditional `UPDATE ... SET logged = 1` is a read-then-write with no
//    transaction around it, so two concurrent /log calls on one serve id both
//    read logged = 0 and both record an attempt: ONE answer, TWO attempt rows.
//    Every endpoint is a GET that ChatGPT may retry, so nothing unusual has to
//    happen for this to be reached. db.js spends the serve with a conditional
//    UPDATE instead, and these hold it to that.
//
// These load the real schema.sql (not seed.sql — that is a build artifact owned
// elsewhere) into node:sqlite and drive the real db.js write paths.

import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { DatabaseSync } from 'node:sqlite'
import { makeDb } from '../src/db.js'
import { handleLog, handleNext, handleMockStart, handleMockSubmit, ApiError } from '../src/api.js'

const SCHEMA = new URL('../schema.sql', import.meta.url)
const CSA = JSON.parse(readFileSync(new URL('../config/ap_csa.json', import.meta.url)))

/**
 * Minimal D1-compatible wrapper over node:sqlite, matching the subset of the
 * binding that db.js actually uses: prepare().bind().all()/.first()/.run().
 *
 * `hold(sql)` optionally returns a promise to await before a statement runs, so a
 * test can park one request mid-flight and let another overtake it. Promise.all
 * only interleaves at the awaits the code happens to have; a race that has to be
 * caught at ONE statement needs to be scheduled, not hoped for.
 */
function d1(sqlite, hold = null) {
  return {
    prepare(sql) {
      const stmt = sqlite.prepare(sql)
      let args = []
      const pause = async () => {
        const p = hold?.(sql)
        if (p) await p
      }
      const api = {
        bind(...a) {
          args = a.map((v) => (typeof v === 'boolean' ? (v ? 1 : 0) : v))
          return api
        },
        all: async () => { await pause(); return { results: stmt.all(...args) } },
        first: async () => { await pause(); return stmt.all(...args)[0] ?? null },
        run: async () => { await pause(); return stmt.run(...args) },
      }
      return api
    },
  }
}

function freshDb({ hold = null } = {}) {
  const sqlite = new DatabaseSync(':memory:')
  sqlite.exec(readFileSync(SCHEMA, 'utf8'))
  return { db: makeDb(d1(sqlite, hold)), sqlite }
}

/** One keyed CSA item and its topic row, so a real /log call has something to grade. */
function seedOneItem(sqlite) {
  sqlite.exec(
    `INSERT INTO topics (id, subject, name, unit, exam_weight_low, exam_weight_high, tested_on_exam)
     VALUES ('1.3', 'ap_csa', 'Expressions', '1', 20, 30, 1);
     INSERT INTO items (id, subject, topic, unit, practice, kind, stem, options_json, answer, explanation, calc_allowed)
     VALUES ('csa-1', 'ap_csa', '1.3', '1', 'P3', 'mcq', 'Question?',
             '{"A":"one","B":"two","C":"three","D":"four"}', 'B', 'Because.', 0);`,
  )
}

test('attempts() carries the response column through to the caller', async () => {
  const { db } = freshDb()
  await db.recordAttempt({
    ts: '2027-03-01T12:00:00Z', subject: 'ap_csa', item_id: 'no-such-item', topic: '1.3',
    unit: '1', practice: 'P3', response: 'B', correct: 1, graded_by: 'server',
    seconds: 30, hints_used: 0, conditions: 'cold', mock_id: null,
  })

  const rows = await db.attempts('ap_csa')
  assert.equal(rows.length, 1)
  assert.ok('response' in rows[0], 'ATTEMPT_COLS must project a.response, or every blank check downstream is vacuous')
  assert.equal(rows[0].response, 'B')
})

// ---------------------------------------------------------------------------
// A serve id can be spent exactly once, even by two callers at once
// ---------------------------------------------------------------------------

test('claimServe reports whether THIS call was the one that spent the serve', async () => {
  const { db } = freshDb()
  const id = await db.recordServe({ subject: 'ap_csa', item_id: 'csa-1', served_at: '2027-03-01T12:00:00Z' })

  const claims = await Promise.all([db.claimServe(id), db.claimServe(id)])
  assert.deepEqual(
    claims.slice().sort((a, b) => a - b), [0, 1],
    'exactly one concurrent claim may change a row; a claim that changed nothing must say 0',
  )
  assert.equal((await db.serve(id)).logged, 1)
  assert.equal(await db.claimServe(id), 0, 'and a later claim on a spent serve changes nothing')
})

test('two concurrent /log calls on one serve id record exactly ONE attempt', async () => {
  const { db, sqlite } = freshDb()
  seedOneItem(sqlite)
  const serveId = await db.recordServe({
    subject: 'ap_csa', item_id: 'csa-1', served_at: '2027-03-01T12:00:00Z', mock_id: null,
  })

  // Every endpoint is a GET, so ChatGPT may fire the same logAnswer twice. D1 has
  // no transaction here: with a read-then-write guard both calls saw logged = 0,
  // both were fulfilled, and one answer became two attempt rows — which moves
  // questions_answered, every per-unit floor and the composite off one keystroke.
  const results = await Promise.allSettled([
    handleLog({ db, serveId, response: 'B', config: CSA, now: '2027-03-01T12:00:30Z' }),
    handleLog({ db, serveId, response: 'B', config: CSA, now: '2027-03-01T12:00:30Z' }),
  ])

  const attempts = await db.attempts('ap_csa')
  assert.equal(attempts.length, 1, `one answer must be one attempt row, got ${attempts.length}`)

  const fulfilled = results.filter((r) => r.status === 'fulfilled')
  const rejected = results.filter((r) => r.status === 'rejected')
  assert.equal(fulfilled.length, 1, 'exactly one of the two racing calls may succeed')
  assert.equal(rejected.length, 1)
  assert.ok(rejected[0].reason instanceof ApiError, `the loser must be refused, got ${rejected[0].reason}`)
  assert.equal(rejected[0].reason.status, 409)
  assert.equal(fulfilled[0].value.status.questions_answered, 1, 'and the number he is shown must say one')
})

// ---------------------------------------------------------------------------
// A sitting can be closed exactly once, and its score can only describe the
// answers that were actually inside it
//
// The mirror of the serve race above, on the other table. handleMockSubmit's
// `if (m.ended_at) throw` was a read-then-write and db.js's endMock was an
// unconditional UPDATE, so two submits could both score one sitting — and, worse,
// the composite was computed from answers read BEFORE the sitting was closed, so
// a first-time /log that started while the paper was still open could file its
// answer under the mock afterwards. Readiness reads the judged window's evidence
// as `attempts.filter((a) => ids.has(a.mock_id))`, so that answer was counted
// against a composite already frozen without it: the post-submit defect fixed in
// round 2, reopened through a narrow window.
// ---------------------------------------------------------------------------

const T0 = '2027-03-01T12:00:00Z'
const at = (sec) => new Date(new Date(T0).getTime() + sec * 1000).toISOString()

/** Enough keyed CSA mcq items, spread over the real units, to sit a whole section. */
function seedSection(sqlite, n = CSA.exam.mcq_count + 4) {
  for (const unit of CSA.units) {
    sqlite.prepare(
      `INSERT INTO topics (id, subject, name, unit, exam_weight_low, exam_weight_high, tested_on_exam)
       VALUES (?, 'ap_csa', ?, ?, 20, 30, 1)`,
    ).run(`${unit}.1`, `Topic ${unit}`, unit)
  }
  for (let i = 1; i <= n; i++) {
    const unit = CSA.units[i % CSA.units.length]
    sqlite.prepare(
      `INSERT INTO items (id, subject, topic, unit, practice, kind, stem, options_json, answer, explanation, calc_allowed)
       VALUES (?, 'ap_csa', ?, ?, 'P3', 'mcq', ?, '{"A":"one","B":"two","C":"three","D":"four"}', 'B', 'Because.', 0)`,
    ).run(`csa-${i}`, `${unit}.1`, unit, `Question ${i}?`)
  }
}

/** Sit `n` questions of an open mock, one a minute, every answer right. */
async function sitSection(db, mockId, n) {
  for (let i = 0; i < n; i++) {
    const q = await handleNext({ db, subject: 'ap_csa', config: CSA, now: at(i * 60), mockId })
    assert.equal(q.type, 'question')
    await handleLog({ db, serveId: q.serve, response: 'B', config: CSA, now: at(i * 60 + 30) })
  }
}

test('closeMock reports whether THIS call was the one that closed the sitting', async () => {
  const { db } = freshDb()
  const id = await db.startMock({ subject: 'ap_csa', section: 'I', started_at: T0, proctored: 1, source: 'bank' })

  const claims = await Promise.all([db.closeMock({ id, ended_at: at(60) }), db.closeMock({ id, ended_at: at(60) })])
  assert.deepEqual(
    claims.slice().sort((a, b) => a - b), [0, 1],
    'exactly one concurrent close may change a row; a close that changed nothing must say 0',
  )
  assert.equal((await db.mock(id)).ended_at, at(60))
  assert.equal(await db.closeMock({ id, ended_at: at(999) }), 0, 'and a later close on a closed sitting changes nothing')
  assert.equal((await db.mock(id)).ended_at, at(60), 'without moving the time the paper was handed in')
})

test('two concurrent /mock/submit calls close and score one sitting exactly once', async () => {
  const answered = CSA.exam.mcq_count
  // Three runs: a race that passes once proves very little.
  for (let round = 0; round < 3; round++) {
    const { db, sqlite } = freshDb()
    seedSection(sqlite)
    const m = await handleMockStart({ db, subject: 'ap_csa', section: 'I', source: 'official', config: CSA, now: T0 })
    await sitSection(db, m.mock, answered)

    const results = await Promise.allSettled([
      handleMockSubmit({ db, mockId: m.mock, config: CSA, now: at(answered * 60) }),
      handleMockSubmit({ db, mockId: m.mock, config: CSA, now: at(answered * 60 + 5) }),
    ])
    const ok = results.filter((r) => r.status === 'fulfilled')
    const refused = results.filter((r) => r.status === 'rejected')
    assert.equal(ok.length, 1, `round ${round}: exactly one of two concurrent submits may score the sitting`)
    assert.equal(refused.length, 1, `round ${round}: the loser must be refused, not silently allowed to rescore`)
    assert.ok(refused[0].reason instanceof ApiError, `round ${round}: got ${refused[0].reason}`)
    assert.equal(refused[0].reason.status, 409)
    assert.match(refused[0].reason.message, /already submitted/)

    const stored = sqlite.prepare('SELECT ended_at, composite_pct FROM mocks WHERE id = ?').get(m.mock)
    assert.equal(stored.composite_pct, 100, `round ${round}: every answer came off the key`)
    assert.equal(stored.ended_at, at(answered * 60), `round ${round}: the winner's clock is the one that stands`)
    assert.equal(ok[0].value.status.proctored_mocks, 1, `round ${round}: one sitting, not two`)
  }
})

test('a first-time /log racing /mock/submit cannot be counted against a frozen composite', async () => {
  const expected = CSA.exam.mcq_count
  // Three runs, and the interleaving is scheduled rather than hoped for.
  for (let round = 0; round < 3; round++) {
    let armed = false
    let arrived
    let release
    const reached = new Promise((r) => { arrived = r })
    const open = new Promise((r) => { release = r })
    const { db, sqlite } = freshDb({
      hold: (sql) => {
        if (!armed || !/INSERT INTO\s+attempts/i.test(sql)) return null
        armed = false // hold the racing answer only, not the sitting that precedes it
        arrived()
        return open
      },
    })
    seedSection(sqlite)
    const m = await handleMockStart({ db, subject: 'ap_csa', section: 'I', source: 'official', config: CSA, now: T0 })

    // A full sitting bar one: 41 of 42 answered, at exam pace, all correct.
    await sitSection(db, m.mock, expected - 1)

    // The last question is on screen, unanswered, when he hits submit — and his
    // answer to it is in flight at the exact moment the paper is handed in.
    const last = await handleNext({ db, subject: 'ap_csa', config: CSA, now: at((expected - 1) * 60), mockId: m.mock })
    armed = true
    const logging = handleLog({ db, serveId: last.serve, response: 'B', config: CSA, now: at((expected - 1) * 60 + 30) })
    await reached // /log is parked with its INSERT in flight, its answer not yet filed
    const submitted = await handleMockSubmit({ db, mockId: m.mock, config: CSA, now: at(expected * 60) })
    release()
    const logged = await logging

    // THE invariant. The stored composite is frozen at whatever the submit read;
    // readiness judges the sitting on every attempt carrying its mock id. If those
    // two sets can differ by even one answer, the composite is a statement about
    // evidence other than the evidence it is checked against.
    const rows = await db.attempts('ap_csa')
    const filed = rows.filter((a) => a.mock_id === m.mock)
    const stored = sqlite.prepare('SELECT composite_pct, ended_at FROM mocks WHERE id = ?').get(m.mock)
    assert.equal(submitted.answered, expected - 1, `round ${round}: the paper was handed in with 41 answers on it`)
    assert.equal(
      filed.length, submitted.answered,
      `round ${round}: the composite was computed over ${submitted.answered} answers, but ${filed.length} are filed ` +
      `under the sitting — readiness counts what is filed, so one of them is a lie`,
    )
    assert.equal(
      stored.composite_pct, (filed.filter((a) => a.correct).length / expected) * 100,
      `round ${round}: the stored composite must describe exactly the answers filed under the sitting`,
    )

    // And the answer he gave is kept, as practice, with the reason he can read.
    const lastItem = (await db.serve(last.serve)).item_id
    assert.equal(rows.length, expected, `round ${round}: the answer must not be lost`)
    const late = rows.find((a) => a.item_id === lastItem && a.mock_id === null)
    assert.ok(late, `round ${round}: the racing answer must still be on the record, as ordinary practice`)
    assert.notEqual(late.conditions, 'proctored_mock', `round ${round}: it was not answered inside a live sitting`)
    assert.ok(logged.note, `round ${round}: and he must be told which pile it landed in`)
    assert.match(logged.note, /submitted/, `round ${round}: ${logged.note}`)
    assert.equal(logged.status.proctored_mocks, 1, `round ${round}: still exactly one scored sitting`)
  }
})

