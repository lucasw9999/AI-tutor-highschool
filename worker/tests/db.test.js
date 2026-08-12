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
import {
  handleLog, handleNext, handleTaught, handleStatus, handleMockStart, handleMockSubmit,
  MIN_MOCK_COVERAGE, ApiError,
} from '../src/api.js'

const SCHEMA = new URL('../schema.sql', import.meta.url)
const CSA = JSON.parse(readFileSync(new URL('../config/ap_csa.json', import.meta.url)))

/**
 * How the two drivers db.js runs against report a changed-row count.
 *
 * Cloudflare's D1 `run()` resolves to `{success, meta: {changes, ...}}` with NO
 * top-level `changes`; node:sqlite's returns `{changes, lastInsertRowid}`. db.js
 * reads either, and the tests below drive the D1 shape by default — because
 * while this shim returned node:sqlite's, claimServe, closeMock, markTaught and
 * scoreMock were only ever exercised through the fallback branch and the one
 * production actually takes had zero coverage. The direction was at least
 * fail-closed (an unrecognised shape reads as 0, i.e. "already claimed", so it
 * refuses rather than double-counting) — but a guard that always fails closed
 * refuses every /log there is.
 */
const D1_ENVELOPE = (r) => ({
  success: true,
  results: [],
  meta: {
    changes: r.changes,
    last_row_id: Number(r.lastInsertRowid),
    changed_db: r.changes > 0,
    duration: 0.1,
    served_by: 'test',
  },
})

/** The raw node:sqlite result, kept so the fallback branch stays covered too. */
const NODE_SQLITE_RESULT = (r) => r

/**
 * Minimal D1-compatible wrapper over node:sqlite, matching the subset of the
 * binding that db.js actually uses: prepare().bind().all()/.first()/.run().
 *
 * `hold(sql)` optionally returns a promise to await before a statement runs, so a
 * test can park one request mid-flight and let another overtake it. Promise.all
 * only interleaves at the awaits the code happens to have; a race that has to be
 * caught at ONE statement needs to be scheduled, not hoped for.
 *
 * `envelope` shapes what run() resolves to — see D1_ENVELOPE.
 */
function d1(sqlite, hold = null, envelope = D1_ENVELOPE) {
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
        run: async () => { await pause(); return envelope(stmt.run(...args)) },
      }
      return api
    },
  }
}

function freshDb({ hold = null, envelope = D1_ENVELOPE } = {}) {
  const sqlite = new DatabaseSync(':memory:')
  sqlite.exec(readFileSync(SCHEMA, 'utf8'))
  return { db: makeDb(d1(sqlite, hold, envelope)), sqlite }
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
// The distractor he chose (METH-10)
//
// grade.js has always computed `picked` — which option a wrong answer resolved
// to — and handed it back to api.js, which threw it away, because the attempts
// table had no column for it. The distractor IS the misconception: 'D' on a
// short-circuit question is "he does not know && stops evaluating", while 'A' on
// the same question is "he misread the operator". That difference was being
// recomputed and discarded on every answer, and it cannot be recovered later —
// grade.js's parsing rules are versioned, the serve is spent, and the response
// column holds what he typed rather than what it was read as.
// ---------------------------------------------------------------------------

test('the option a wrong answer resolved to is persisted, not computed and discarded', async () => {
  const { db, sqlite } = freshDb()
  seedOneItem(sqlite) // keyed 'B'
  const serveId = await db.recordServe({ subject: 'ap_csa', item_id: 'csa-1', served_at: T0 })
  const logged = await handleLog({ db, serveId, response: 'D', config: CSA, now: at(30) })
  assert.equal(logged.correct, false, 'the fixture is keyed B, so D is a miss')

  // Read straight out of the table, not through db.js, so this cannot pass on a
  // projection that invents the column.
  assert.equal(
    sqlite.prepare(`SELECT picked FROM attempts`).get().picked, 'D',
    'the distractor he chose is the misconception; nothing else on the row carries it',
  )
  const rows = await db.attempts('ap_csa')
  assert.equal(rows[0].picked, 'D', 'and ATTEMPT_COLS must project it, or no consumer can ever read it')
})

test('a correct answer records the option it resolved to as well', async () => {
  const { db, sqlite } = freshDb()
  seedOneItem(sqlite)
  const serveId = await db.recordServe({ subject: 'ap_csa', item_id: 'csa-1', served_at: T0 })
  // Named by its text, not its letter: what is stored is what the grader READ,
  // which is the only form a later reader can compare against the key.
  await handleLog({ db, serveId, response: 'two', config: CSA, now: at(20) })
  assert.equal((await db.attempts('ap_csa'))[0].picked, 'B')
})

test('an answer with no option behind it stores no option', async () => {
  const { db, sqlite } = freshDb()
  seedOneItem(sqlite)
  for (const [response, why] of [['', 'a blank chose nothing'], ['B or C', 'an unparsed answer resolved to nothing']]) {
    const serveId = await db.recordServe({ subject: 'ap_csa', item_id: 'csa-1', served_at: T0 })
    await handleLog({ db, serveId, response, config: CSA, now: at(20) })
    const row = (await db.attempts('ap_csa')).at(-1)
    assert.equal(row.picked, null, `${why}, so the column must stay NULL rather than guess one`)
  }
})

test('a database that predates the column still records the answer', async () => {
  // What the deployed database looks like until it is migrated: every CREATE
  // TABLE in schema.sql is IF NOT EXISTS, so reloading the schema (or seed.sql,
  // which embeds it) does NOT add a column to a table that already exists.
  // Naming an absent column in the INSERT makes SQLite reject the statement, and
  // that would turn EVERY /log into a 500 — the tutor would stop recording
  // answers at all in order to record one extra letter about them.
  const { db, sqlite } = freshDb()
  seedOneItem(sqlite)
  sqlite.exec(`ALTER TABLE attempts DROP COLUMN picked`)

  const serveId = await db.recordServe({ subject: 'ap_csa', item_id: 'csa-1', served_at: T0 })
  const logged = await handleLog({ db, serveId, response: 'D', config: CSA, now: at(30) })
  assert.equal(logged.correct, false, 'the answer is still graded')
  const rows = await db.attempts('ap_csa')
  assert.equal(rows.length, 1, 'and still recorded — an unmigrated column may not cost an answer')
  assert.equal(rows[0].response, 'D')
  assert.ok('picked' in rows[0], 'the row SHAPE must not depend on the migration state')
  assert.equal(rows[0].picked, null, 'only the value is missing, and it is missing as null rather than absent')
})

test('a sitting records the distractor too, and only while the sitting is open', async () => {
  const { db, sqlite } = freshDb()
  seedSection(sqlite, 4)
  const m = await handleMockStart({ db, subject: 'ap_csa', section: 'I', source: 'bank', config: CSA, now: T0 })
  const q = await handleNext({ db, subject: 'ap_csa', config: CSA, now: at(10), mockId: m.mock })
  await handleLog({ db, serveId: q.serve, response: 'C', config: CSA, now: at(40) })
  assert.equal((await db.attempts('ap_csa')).at(-1).picked, 'C', 'the mock-filing INSERT has to carry it too')

  // The other write path: a serve cashed in after the sitting closed is demoted
  // to ordinary practice, and the distractor still has to survive the demotion.
  const late = await handleNext({ db, subject: 'ap_csa', config: CSA, now: at(50), mockId: m.mock })
  await handleMockSubmit({ db, mockId: m.mock, config: CSA, now: at(60) })
  await handleLog({ db, serveId: late.serve, response: 'A', config: CSA, now: at(70) })
  const demoted = (await db.attempts('ap_csa')).at(-1)
  assert.equal(demoted.mock_id, null, 'the fixture must actually exercise the demotion path')
  assert.equal(demoted.picked, 'A')
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

test('every conditional write reads its changed-row count out of BOTH drivers', async () => {
  // Four writes decide something from the count of rows they changed — whether
  // this caller spent the serve, closed the sitting, stored the score, or marked
  // the lesson delivered — and each reports 0 as "someone else got there first".
  // The count sits in a different place in the two drivers this code runs
  // against: D1 puts it in meta.changes and has no top-level `changes` at all,
  // node:sqlite the other way round. A shape that reads as 0 everywhere refuses
  // every /log, every submit and every /taught, so both shapes are driven here.
  for (const [driver, envelope] of [['D1', D1_ENVELOPE], ['node:sqlite', NODE_SQLITE_RESULT]]) {
    const { db, sqlite } = freshDb({ envelope })
    seedOneItem(sqlite)

    const serve = await db.recordServe({ subject: 'ap_csa', item_id: 'csa-1', served_at: T0 })
    assert.equal(await db.claimServe(serve), 1, `${driver}: claimServe must see the row it changed`)
    assert.equal(await db.claimServe(serve), 0, `${driver}: and see that a second claim changed nothing`)

    const id = await db.startMock({ subject: 'ap_csa', section: 'I', started_at: T0, proctored: 1, source: 'bank' })
    assert.equal(await db.closeMock({ id, ended_at: at(60) }), 1, `${driver}: closeMock must see the row it changed`)
    assert.equal(await db.closeMock({ id, ended_at: at(90) }), 0, `${driver}: and refuse a second close`)
    assert.equal(await db.scoreMock({ id, composite_pct: 50, blanks: 0 }), 1, `${driver}: scoreMock must see its write`)
    assert.equal(await db.scoreMock({ id, composite_pct: 90, blanks: 3 }), 0, `${driver}: and refuse a second score`)
    assert.equal((await db.mock(id)).composite_pct, 50, `${driver}: the refused score may not overwrite the stored one`)

    await db.openGap({ subject: 'ap_csa', topic: '1.3', opened_at: T0 })
    assert.equal(
      await db.markTaught({ subject: 'ap_csa', topic: '1.3', taught_at: at(10) }), 1,
      `${driver}: markTaught must see the row it changed`,
    )
    assert.equal(
      await db.markTaught({ subject: 'ap_csa', topic: 'Loops and Arrays', taught_at: at(10) }), 0,
      `${driver}: and report 0 for a topic with no open gap`,
    )
  }
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

test('two concurrent rescues of a stranded sitting score it exactly once', async () => {
  // A sitting closed by a submit that died before it scored can be finished by a
  // later submit — see api.test.js for the recovery itself. Its mutex is the
  // conditional scoring write rather than the close, because the close already
  // happened, so the race has to be held here: two rescues both compute a
  // composite, and exactly one may store one.
  const answered = CSA.exam.mcq_count
  const { db, sqlite } = freshDb()
  seedSection(sqlite)
  const m = await handleMockStart({ db, subject: 'ap_csa', section: 'I', source: 'official', config: CSA, now: T0 })
  await sitSection(db, m.mock, answered)

  const killed = { ...db, scoreMock: async () => { throw new Error('Worker exceeded CPU time limit') } }
  await assert.rejects(() => handleMockSubmit({ db: killed, mockId: m.mock, config: CSA, now: at(answered * 60) }), /CPU/)
  assert.equal(
    sqlite.prepare('SELECT blanks FROM mocks WHERE id = ?').get(m.mock).blanks, null,
    'the fixture must genuinely be a sitting closed with no score written',
  )

  const results = await Promise.allSettled([
    handleMockSubmit({ db, mockId: m.mock, config: CSA, now: at(answered * 60 + 60) }),
    handleMockSubmit({ db, mockId: m.mock, config: CSA, now: at(answered * 60 + 65) }),
  ])
  const ok = results.filter((r) => r.status === 'fulfilled')
  const refused = results.filter((r) => r.status === 'rejected')
  assert.equal(ok.length, 1, 'exactly one of two concurrent rescues may store a composite')
  assert.equal(refused.length, 1, 'and the loser must be refused, not allowed to overwrite it')
  assert.ok(refused[0].reason instanceof ApiError, `got ${refused[0].reason}`)
  assert.equal(refused[0].reason.status, 409)
  assert.equal(sqlite.prepare('SELECT composite_pct FROM mocks WHERE id = ?').get(m.mock).composite_pct, 100)
  assert.equal(ok[0].value.status.proctored_mocks, 1, 'one sitting, not two')
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

// ---------------------------------------------------------------------------
// The gap table's two read-then-writes
//
// /taught and /next both read the gaps table and then write it, and D1 offers no
// transaction, so both had the shape claimServe and closeMock were written to
// close. Driven over real SQLite, with the racing statement SCHEDULED rather than
// hoped for, because the whole point is which statement decides.
// ---------------------------------------------------------------------------

/** One topic with `n` keyed items and a teaching row: enough to open, teach and close a gap. */
function seedTaughtTopic(sqlite, { topic = '1.3', n = 4 } = {}) {
  sqlite.prepare(
    `INSERT INTO topics (id, subject, name, unit, exam_weight_low, exam_weight_high, tested_on_exam)
     VALUES (?, 'ap_csa', 'Expressions', '1', 20, 30, 1)`,
  ).run(topic)
  sqlite.prepare(
    `INSERT INTO teaching (subject, topic, plain_idea, worked_example, common_mistake)
     VALUES ('ap_csa', ?, 'The idea.', 'The example.', 'The trap.')`,
  ).run(topic)
  for (let i = 1; i <= n; i++) {
    sqlite.prepare(
      `INSERT INTO items (id, subject, topic, unit, practice, kind, stem, options_json, answer, explanation, calc_allowed)
       VALUES (?, 'ap_csa', ?, '1', 'P3', 'mcq', ?, '{"A":"one","B":"two","C":"three","D":"four"}', 'B', 'Because.', 0)`,
    ).run(`csa-g${i}`, topic, `Question ${i}?`)
  }
}

/** Miss two distinct questions on the one topic, which is what evidences a gap. */
async function missTwice(db) {
  for (const i of [1, 2]) {
    const q = await handleNext({ db, subject: 'ap_csa', config: CSA, now: at(i * 100) })
    assert.equal(q.type, 'question')
    await handleLog({ db, serveId: q.serve, response: 'A', config: CSA, now: at(i * 100 + 30) })
  }
}

/** A promise pair for parking one statement mid-flight and letting another overtake it. */
function scheduled(pattern) {
  let armed = false
  let arrived
  let release
  const reached = new Promise((r) => { arrived = r })
  const open = new Promise((r) => { release = r })
  return {
    arm: () => { armed = true },
    reached,
    release,
    hold: (sql) => {
      if (!armed || !pattern.test(sql)) return null
      armed = false // park the racing statement only, not the ones that precede it
      arrived()
      return open
    },
  }
}

test('/taught refuses to promise a re-test of a gap that closed while it was writing', async () => {
  // Every endpoint is a GET that ChatGPT may retry, so a second /taught arriving
  // beside the /log that closes the gap needs no unusual circumstances. handleTaught
  // reads the open gaps and THEN writes, and it threw away markTaught's changed-row
  // count — so the retry matched nothing, returned ok:true, and promised that the
  // topic "will come back with no hints" about a gap already closed by an unaided
  // correct answer. That is the same false success the 404 in this handler exists
  // to prevent, arriving through a narrower door.
  const race = scheduled(/UPDATE gaps SET taught_at/i)
  const { db, sqlite } = freshDb({ hold: race.hold })
  seedTaughtTopic(sqlite)

  await missTwice(db)
  const lesson = await handleNext({ db, subject: 'ap_csa', config: CSA, now: at(400) })
  assert.equal(lesson.type, 'lesson')
  assert.equal((await handleTaught({ db, subject: 'ap_csa', topic: '1.3', config: CSA, now: at(500) })).ok, true)

  // The cold re-test is on screen. He answers it right, unaided — which closes the
  // gap — at the same moment a retried /taught is writing.
  const retest = await handleNext({ db, subject: 'ap_csa', config: CSA, now: at(600) })
  assert.equal(retest.type, 'question')

  race.arm()
  const retried = handleTaught({ db, subject: 'ap_csa', topic: '1.3', config: CSA, now: at(650) })
  await race.reached // parked with its UPDATE in flight, having already read the gap as open
  const closed = await handleLog({ db, serveId: retest.serve, response: 'B', config: CSA, now: at(660) })
  assert.equal(closed.gap_closed, '1.3', 'the unaided correct answer is what closes the gap')
  race.release()

  await assert.rejects(
    () => retried,
    (e) => e instanceof ApiError && e.status === 404,
    'a /taught that changed no row must be refused, not answered with a promise about a closed gap',
  )
  const row = sqlite.prepare('SELECT taught_at, cleared_at FROM gaps WHERE topic = ?').get('1.3')
  assert.ok(row.cleared_at, 'the gap stays closed')
  assert.equal(row.taught_at, at(500), 'and the retry may not stamp a lesson onto it either')
})

test('two concurrent /next calls cannot open one gap twice', async () => {
  // openGap is INSERT OR IGNORE against PRIMARY KEY (subject, topic, opened_at),
  // and every request carries its own millisecond clock — so the PK does NOT
  // dedupe two opens of the same gap, and handleNext's read of the gaps table is a
  // read-then-write with no transaction. Two concurrent /next on one evidenced gap
  // wrote two rows, and open_gaps then listed the topic twice in EVERY response
  // the model reads to the student. api.test.js's fake could not see it: it deduped
  // on (subject, topic, uncleared), which is stricter than the schema.
  const race = scheduled(/INSERT OR IGNORE INTO gaps|INSERT INTO gaps/i)
  const { db, sqlite } = freshDb({ hold: race.hold })
  seedTaughtTopic(sqlite)

  await missTwice(db)

  race.arm()
  const first = handleNext({ db, subject: 'ap_csa', config: CSA, now: at(400) })
  await race.reached // parked with its INSERT in flight, having read no gap rows
  const second = await handleNext({ db, subject: 'ap_csa', config: CSA, now: at(401) })
  race.release()
  await first

  assert.equal(second.type, 'lesson', 'the second call still gets the lesson the evidence calls for')
  assert.equal(
    sqlite.prepare('SELECT COUNT(*) n FROM gaps WHERE subject = ? AND topic = ?').get('ap_csa', '1.3').n, 1,
    'one gap on one topic is one row, whatever the interleaving — the millisecond clocks differ, so the PK will not do it',
  )
  const s = await handleStatus({ db, subject: 'ap_csa', config: CSA, now: at(500) })
  assert.deepEqual(
    s.open_gaps, ['1.3'],
    'and the list the model reads aloud must name the topic once',
  )
})

//
// A serve is invisible to the sitting's own no-repeat list until it is LOGGED:
// select.js can only see attempt rows, so between /next and /log the question in
// flight does not exist as far as the selector is concerned. Two /next calls
// inside one sitting therefore handed out the SAME item — with two plain
// sequential calls and no /log between them, and at 200/200 trials concurrently.
// Both serves then logged cleanly, giving two attempt rows for one question under
// one mock.
//
// What that buys: MIN_MOCK_COVERAGE is ceil(0.9 * 42) = 38, so an honest 37-of-42
// sitting is counted:false with composite null, while the SAME 37 distinct
// questions with one of them served twice reads as 38 answers, clears the gate and
// is scored. And because the denominator is max(scored, expected - ungraded) = 42,
// a duplicated CORRECT answer adds to `right` without adding to the denominator:
// about 2.4 points of composite per duplicate. It also falsifies api.js's own
// header claim that a retried Action cannot double-count.
//
// Driven over real SQLite and the real schema, because this is entirely about
// serve state and the rows a projection returns.
// ---------------------------------------------------------------------------

/** Every attempt filed under one sitting, and the distinct items behind them. */
async function paperOf(db, subject, mockId) {
  const rows = (await db.attempts(subject)).filter((a) => a.mock_id === mockId)
  return { rows, items: rows.map((a) => a.item_id), distinct: new Set(rows.map((a) => a.item_id)) }
}

test('two /next calls inside one sitting cannot hand out the same question', async () => {
  const { db, sqlite } = freshDb()
  seedSection(sqlite)
  const m = await handleMockStart({ db, subject: 'ap_csa', section: 'I', source: 'bank', config: CSA, now: T0 })

  // No /log in between: the first question is still on screen when the second is
  // asked for, which is all it took.
  const first = await handleNext({ db, subject: 'ap_csa', config: CSA, now: at(0), mockId: m.mock })
  const second = await handleNext({ db, subject: 'ap_csa', config: CSA, now: at(30), mockId: m.mock })
  assert.equal(first.type, 'question')
  assert.equal(second.type, 'question')

  const firstItem = (await db.serve(first.serve)).item_id
  const secondItem = (await db.serve(second.serve)).item_id
  assert.notEqual(
    secondItem, firstItem,
    'a question already handed out and not yet answered is not available to hand out again',
  )

  // And both answers land as two attempt rows on two different questions.
  await handleLog({ db, serveId: first.serve, response: 'B', config: CSA, now: at(60) })
  await handleLog({ db, serveId: second.serve, response: 'B', config: CSA, now: at(90) })
  const paper = await paperOf(db, 'ap_csa', m.mock)
  assert.equal(paper.rows.length, 2)
  assert.equal(
    paper.distinct.size, paper.rows.length,
    `one sitting must never hold two answers to one question: ${paper.items.join(', ')}`,
  )
})

test('a duplicated question cannot buy a short sitting past the coverage gate', async () => {
  const floor = Math.ceil(CSA.exam.mcq_count * MIN_MOCK_COVERAGE)

  // The control: the honest sitting one question short of the gate is recorded and
  // NOT scored. This is the number the duplicate was worth buying past.
  const honest = freshDb()
  seedSection(honest.sqlite)
  const hm = await handleMockStart({
    db: honest.db, subject: 'ap_csa', section: 'I', source: 'bank', config: CSA, now: T0,
  })
  await sitSection(honest.db, hm.mock, floor - 1)
  const short = await handleMockSubmit({ db: honest.db, mockId: hm.mock, config: CSA, now: at(floor * 60) })
  assert.equal(short.answered, floor - 1)
  assert.equal(short.counted, false, `${floor - 1} of ${CSA.exam.mcq_count} is short of the gate`)
  assert.equal(short.composite_pct, null)

  // The buy: the same student, two questions short of the gate, with TWO questions
  // on screen at once at the end — served back to back with no answer in between.
  const { db, sqlite } = freshDb()
  seedSection(sqlite)
  const m = await handleMockStart({ db, subject: 'ap_csa', section: 'I', source: 'bank', config: CSA, now: T0 })
  await sitSection(db, m.mock, floor - 2)

  const a = await handleNext({ db, subject: 'ap_csa', config: CSA, now: at((floor - 2) * 60), mockId: m.mock })
  const b = await handleNext({ db, subject: 'ap_csa', config: CSA, now: at((floor - 2) * 60 + 5), mockId: m.mock })
  await handleLog({ db, serveId: a.serve, response: 'B', config: CSA, now: at((floor - 2) * 60 + 30) })
  await handleLog({ db, serveId: b.serve, response: 'B', config: CSA, now: at((floor - 1) * 60 + 30) })

  const paper = await paperOf(db, 'ap_csa', m.mock)
  assert.equal(paper.rows.length, floor, 'both answers are kept — the fix is not to drop one')
  assert.equal(
    paper.distinct.size, floor,
    `the sitting reached the gate on ${paper.distinct.size} distinct questions, not ${floor}: a repeat of one ` +
    `question is not a second question of evidence, and here it is the one that made the sitting scorable`,
  )

  const r = await handleMockSubmit({ db, mockId: m.mock, config: CSA, now: at(floor * 60 + 120) })
  assert.equal(r.answered, floor)
  assert.equal(r.counted, true, 'and having genuinely reached the gate, it is scored')
  assert.equal(
    r.composite_pct, Number(((floor / CSA.exam.mcq_count) * 100).toFixed(1)),
    'every answer came off the key, over the section the sitting is measured against',
  )
})

test('two concurrent /next calls in one sitting cannot hand out the same question', async () => {
  // Every endpoint is a GET that ChatGPT may fire twice. Measured at 200/200
  // duplicates before the fix, so three rounds is enough to notice a regression.
  for (let round = 0; round < 3; round++) {
    const { db, sqlite } = freshDb()
    seedSection(sqlite)
    const m = await handleMockStart({ db, subject: 'ap_csa', section: 'I', source: 'bank', config: CSA, now: T0 })

    const results = await Promise.allSettled([
      handleNext({ db, subject: 'ap_csa', config: CSA, now: at(0), mockId: m.mock }),
      handleNext({ db, subject: 'ap_csa', config: CSA, now: at(1), mockId: m.mock }),
    ])
    const served = results.filter((r) => r.status === 'fulfilled').map((r) => r.value)
    for (const r of results.filter((r) => r.status === 'rejected')) {
      assert.ok(r.reason instanceof ApiError, `round ${round}: a refused serve must be an ApiError, got ${r.reason}`)
      assert.equal(r.reason.status, 409, `round ${round}: and a retryable one`)
    }
    assert.ok(served.length >= 1, `round ${round}: at least one of two concurrent calls must be answered`)

    const items = []
    for (const q of served) items.push((await db.serve(q.serve)).item_id)
    assert.equal(
      new Set(items).size, items.length,
      `round ${round}: two concurrent serves handed out the same question (${items.join(', ')}), and both would ` +
      `log into the sitting as two questions of evidence`,
    )

    // Whatever was served can still be answered, and the sitting holds one row per question.
    for (const q of served) await handleLog({ db, serveId: q.serve, response: 'B', config: CSA, now: at(60) })
    const paper = await paperOf(db, 'ap_csa', m.mock)
    assert.equal(paper.distinct.size, paper.rows.length, `round ${round}: ${paper.items.join(', ')}`)
  }
})

// ---------------------------------------------------------------------------
// The window /log itself opens, between spending the serve and filing the answer
//
// handleLog spends the serve FIRST (claimServe flips serves.logged) and inserts
// the attempt SECOND, deliberately: a crash between them loses one answer rather
// than double-counting it. But that ordering opens a window in which a question
// belongs to NO no-repeat list at all — the serve is logged, so a `logged = 0`
// projection cannot see it, and no attempt row exists yet, so select.js's
// this-paper set cannot either. A /next arriving inside that window was handed
// the SAME question again, and recordServe's NOT EXISTS guard did not refuse it
// because that too keys on `logged = 0`.
//
// This is the duplicate-serve defect above, reopened through a narrower door, and
// it buys exactly the same thing: a 37-distinct sitting reads as 38 answers,
// clears MIN_MOCK_COVERAGE (ceil(0.9 * 42) = 38), and is scored 90.5 instead of
// being recorded as too short to count.
//
// So an item this sitting has served is on this paper whether or not its answer
// has landed yet, and openServeItems returns it either way. The interleaving is
// SCHEDULED at the attempt INSERT — a window that narrow will not be caught by
// hoping for it.
// ---------------------------------------------------------------------------

test('a /next inside /log’s own write window cannot re-serve the question being answered', async () => {
  const floor = Math.ceil(CSA.exam.mcq_count * MIN_MOCK_COVERAGE)
  const race = scheduled(/INSERT INTO\s+attempts/i)
  const { db, sqlite } = freshDb({ hold: race.hold })
  // Exactly one sitting's worth of coverage short of the gate: `floor - 1` items,
  // so once every one of them has been served there is honestly nothing left to
  // ask. A duplicate is then the ONLY way this paper can reach 38 answers.
  seedSection(sqlite, floor - 1)
  const m = await handleMockStart({ db, subject: 'ap_csa', section: 'I', source: 'bank', config: CSA, now: T0 })
  await sitSection(db, m.mock, floor - 2)

  // The last question of the bank is on screen. His answer to it is in flight —
  // past the point where the serve was spent, before the attempt row exists.
  const last = await handleNext({ db, subject: 'ap_csa', config: CSA, now: at((floor - 2) * 60), mockId: m.mock })
  assert.equal(last.type, 'question')
  const inFlight = (await db.serve(last.serve)).item_id

  race.arm()
  const logging = handleLog({ db, serveId: last.serve, response: 'B', config: CSA, now: at((floor - 2) * 60 + 30) })
  await race.reached
  assert.equal(
    (await db.serve(last.serve)).logged, 1,
    'the fixture must genuinely park inside the window: the serve is spent and the attempt row is not written yet',
  )
  assert.equal(
    (await db.attempts('ap_csa')).length, floor - 2,
    'and the answer in flight must not be on the record yet, or there is no window to test',
  )

  // ChatGPT asks for the next question while that answer is still in flight —
  // a retried Action, or a student who tapped twice.
  const raced = await Promise.allSettled([
    handleNext({ db, subject: 'ap_csa', config: CSA, now: at((floor - 2) * 60 + 31), mockId: m.mock }),
  ])
  race.release()
  await logging

  for (const r of raced) {
    if (r.status === 'rejected') {
      assert.ok(r.reason instanceof ApiError, `a refused serve must be an ApiError, got ${r.reason}`)
      assert.equal(r.reason.status, 409, 'and a retryable one — the bank really has nothing left to ask')
      continue
    }
    assert.equal(r.value.type, 'question')
    const servedAgain = (await db.serve(r.value.serve)).item_id
    assert.notEqual(
      servedAgain, inFlight,
      'the question whose answer is mid-write is still a question this paper has asked; handing it out again makes ' +
      'one keystroke into two questions of evidence',
    )
    await handleLog({ db, serveId: r.value.serve, response: 'B', config: CSA, now: at((floor - 1) * 60 + 30) })
  }

  const paper = await paperOf(db, 'ap_csa', m.mock)
  assert.equal(
    paper.distinct.size, paper.rows.length,
    `one sitting must never hold two answers to one question: ${paper.items.join(', ')}`,
  )

  // And the harm, measured on the number the student is shown: a bank of 37 can
  // only ever produce a 37-answer paper, which is short of the gate, recorded and
  // NOT scored. A duplicate makes it 38, counted, and worth 90.5.
  const r = await handleMockSubmit({ db, mockId: m.mock, config: CSA, now: at(floor * 60) })
  assert.equal(r.answered, floor - 1, 'the paper holds one answer per distinct question the bank could supply')
  assert.equal(r.counted, false, `${floor - 1} of ${CSA.exam.mcq_count} is short of the coverage gate`)
  assert.equal(r.composite_pct, null, 'a sitting too short to count may not be scored at all')
})

test('an item abandoned mid-question in one sitting is still servable in the next', async () => {
  // The other half of the invariant, and the reason both serve primitives are
  // scoped to ONE sitting: a serve is never cleaned up, so a question abandoned
  // mid-answer leaves an unlogged row behind forever. If either scope goes —
  // openServeItems' `mock_id = ?`, or recordServe's `mock_id = ?` inside the NOT
  // EXISTS — that row makes the item permanently unservable, and the drillable
  // bank shrinks by one item for every question ever left on screen.
  //
  // Held on a two-item bank so no assertion can pass by luck: once one question
  // has been answered, the abandoned one is the only question left to ask, so
  // every later call either hands out that exact item or 409s.
  const { db, sqlite } = freshDb()
  seedSection(sqlite, 2)
  const m1 = await handleMockStart({ db, subject: 'ap_csa', section: 'I', source: 'bank', config: CSA, now: T0 })
  const done = await handleNext({ db, subject: 'ap_csa', config: CSA, now: at(0), mockId: m1.mock })
  await handleLog({ db, serveId: done.serve, response: 'B', config: CSA, now: at(30) })

  // The second question goes up, and he closes the laptop with it on screen.
  const abandoned = await handleNext({ db, subject: 'ap_csa', config: CSA, now: at(60), mockId: m1.mock })
  assert.equal(abandoned.type, 'question')
  const item = (await db.serve(abandoned.serve)).item_id
  await handleMockSubmit({ db, mockId: m1.mock, config: CSA, now: at(120) })
  assert.equal(
    (await db.serve(abandoned.serve)).logged, 0,
    'the fixture must genuinely leave a stranded unlogged serve behind — nothing cleans these up',
  )
  assert.equal((await db.attempts('ap_csa')).length, 1, 'and no answer was ever given to the abandoned question')

  // Ordinary practice is outside every sitting, so it must be able to ask it —
  // and this drill is abandoned too, stranding a second serve on the same item.
  const drill = await handleNext({ db, subject: 'ap_csa', config: CSA, now: at(600) })
  assert.equal(drill.type, 'question', 'ordinary practice can still reach a question abandoned inside a sitting')
  assert.equal(
    (await db.serve(drill.serve)).item_id, item,
    'and it is the question practice must reach for: the only item in this bank nobody has ever answered, on the ' +
    'only topic that has never been attempted',
  )

  // And a later sitting must still be able to ask it, both stranded serves and all.
  // Asserted by drawing the whole two-question bank rather than by expecting it
  // first, so this holds whatever order the selector apportions units in: if either
  // serve scope leaks past the sitting, the abandoned item is unservable, and the
  // second /next has nothing left to hand out at all.
  const m2 = await handleMockStart({ db, subject: 'ap_csa', section: 'I', source: 'bank', config: CSA, now: at(900) })
  const served = []
  for (let i = 0; i < 2; i++) {
    const q = await handleNext({ db, subject: 'ap_csa', config: CSA, now: at(960 + i * 60), mockId: m2.mock })
    assert.equal(q.type, 'question', `the new sitting must be able to ask question ${i + 1} of a two-item bank`)
    served.push((await db.serve(q.serve)).item_id)
    await handleLog({ db, serveId: q.serve, response: 'B', config: CSA, now: at(990 + i * 60) })
  }
  assert.ok(
    served.includes(item),
    `a question abandoned in an earlier sitting is not spent forever — the new paper asked ${served.join(', ')} and ` +
    `never reached ${item}. A serve scope wider than one sitting makes every abandoned question permanently ` +
    `unservable, and nothing cleans stranded serves up`,
  )
  const paper = await paperOf(db, 'ap_csa', m2.mock)
  assert.equal(paper.rows.length, 2, 'and both count as evidence in the new sitting')
  assert.equal(paper.distinct.size, 2, `one row per question: ${paper.items.join(', ')}`)
})

test('two concurrent /mock/start calls cannot both open a sitting on one subject', async () => {
  // The read-then-write this closes: handleMockStart could read the mocks table,
  // see nothing open, and insert — twice, concurrently — which is exactly the
  // state the guard exists to refuse. Held at the statement, like claimServe's and
  // recordServe's, so no interleaving can produce two open papers.
  //
  // Scheduled rather than hoped for: the first INSERT is parked until the second
  // request has been through its own, so both are in flight at once.
  const race = scheduled(/INSERT INTO mocks/i)
  const { db, sqlite } = freshDb({ hold: race.hold })
  seedSection(sqlite, 2)

  race.arm()
  const first = handleMockStart({ db, subject: 'ap_csa', section: 'I', source: 'bank', config: CSA, now: T0 })
  await race.reached // parked with its INSERT in flight, having seen nothing open
  const second = handleMockStart({ db, subject: 'ap_csa', section: 'I', source: 'bank', config: CSA, now: at(1) })
  race.release()
  const results = await Promise.allSettled([first, second])
  const opened = sqlite.prepare(`SELECT COUNT(*) n FROM mocks WHERE ended_at IS NULL`).get().n
  assert.equal(opened, 1, `one subject may have exactly one open sitting, found ${opened}`)
  assert.equal(results.filter((r) => r.status === 'fulfilled').length, 1, 'exactly one caller may be given a paper')

  const refused = results.find((r) => r.status === 'rejected')
  assert.ok(refused.reason instanceof ApiError, `the loser must be refused, got ${refused.reason}`)
  assert.equal(refused.reason.status, 409)
  assert.match(refused.reason.message, /never submitted/, 'and told what is in the way')
})

test('a subject with an open sitting does not block the other subject', async () => {
  const { db, sqlite } = freshDb()
  seedSection(sqlite, 2)
  const csa = await handleMockStart({ db, subject: 'ap_csa', section: 'I', source: 'bank', config: CSA, now: T0 })
  const pre = await db.startMock({
    subject: 'ap_precalc', section: 'I', started_at: T0, proctored: 1, source: 'bank',
  })
  assert.ok(csa.mock)
  assert.ok(pre, 'two exams are in progress; a CSA paper on the desk says nothing about a Precalculus one')
})
