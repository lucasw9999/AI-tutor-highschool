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
import { handleLog, ApiError } from '../src/api.js'

const SCHEMA = new URL('../schema.sql', import.meta.url)
const CSA = JSON.parse(readFileSync(new URL('../config/ap_csa.json', import.meta.url)))

/**
 * Minimal D1-compatible wrapper over node:sqlite, matching the subset of the
 * binding that db.js actually uses: prepare().bind().all()/.first()/.run().
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
        run: async () => stmt.run(...args),
      }
      return api
    },
  }
}

function freshDb() {
  const sqlite = new DatabaseSync(':memory:')
  sqlite.exec(readFileSync(SCHEMA, 'utf8'))
  return { db: makeDb(d1(sqlite)), sqlite }
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

