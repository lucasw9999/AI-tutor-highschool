// Regression test for db.js's ATTEMPT_COLS projection.
//
// api.js's mock-submit blank count reads `a.response` off every row returned
// by db.attempts(). If ATTEMPT_COLS omits that column, `response` comes back
// `undefined` on every row, so `(a.response ?? '') === ''` is true for every
// attempt regardless of what the student actually typed — every answered
// question silently counts as a blank.
//
// This test loads the real schema.sql (not seed.sql — that is a build
// artifact owned elsewhere) into node:sqlite, records one attempt with a
// real response through the real db.js write path, then reads it back
// through db.attempts() and checks the response survives the round trip.

import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { DatabaseSync } from 'node:sqlite'
import { makeDb } from '../src/db.js'

const SCHEMA = new URL('../schema.sql', import.meta.url)

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
  return makeDb(d1(sqlite))
}

test('attempts() carries the response column through to the caller', async () => {
  const db = freshDb()
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
