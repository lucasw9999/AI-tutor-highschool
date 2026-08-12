// End-to-end smoke test over the REAL schema, the REAL seeded content, and the
// REAL db.js SQL — not the in-memory fake used by api.test.js.
//
// This exists because wrangler's local dev server cannot run in this
// environment (the OS blocks binding a loopback socket), so Miniflare is not
// available. Everything below the HTTP layer is still exercised for real:
// schema.sql, seed.sql, every query in db.js, and every handler in api.js,
// against all 266 compiled items.
//
// What this does NOT cover: Cloudflare's own D1 driver and the fetch/routing
// layer in index.js. Those are verified by `npm run worker:check` (bundling)
// and by a deploy smoke test.

import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync, existsSync } from 'node:fs'
import { DatabaseSync } from 'node:sqlite'
import { makeDb } from '../src/db.js'
import { handleNext, handleLog, handleStatus, handleMockStart, handleMockSubmit } from '../src/api.js'

const SEED = new URL('../seed.sql', import.meta.url)
const CSA = JSON.parse(readFileSync(new URL('../config/ap_csa.json', import.meta.url)))
const PRECALC = JSON.parse(readFileSync(new URL('../config/ap_precalc.json', import.meta.url)))

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
  sqlite.exec(readFileSync(SEED, 'utf8'))
  return { sqlite, db: makeDb(d1(sqlite)) }
}

const T0 = '2027-03-01T12:00:00Z'
const at = (sec) => new Date(new Date(T0).getTime() + sec * 1000).toISOString()

// The seed is a build artifact; skip rather than fail if it has not been generated.
const ready = existsSync(SEED)
const maybe = ready ? test : test.skip
if (!ready) console.warn('worker/seed.sql missing — run `npm run seed:sql` first; skipping smoke tests')

maybe('the seeded database holds both subjects with no orphan items', () => {
  const { sqlite } = freshDb()
  const bySubject = Object.fromEntries(
    sqlite.prepare('SELECT subject, COUNT(*) n FROM items GROUP BY subject').all().map((r) => [r.subject, r.n]),
  )
  assert.ok(bySubject.ap_csa > 200, `csa items: ${bySubject.ap_csa}`)
  assert.ok(bySubject.ap_precalc > 0, 'precalc must not be empty')

  const orphans = sqlite.prepare(
    `SELECT COUNT(*) n FROM items i
     LEFT JOIN topics t ON t.id = i.topic AND t.subject = i.subject
     WHERE t.id IS NULL`,
  ).get().n
  assert.equal(orphans, 0, 'every item must point at a real topic row')

  const nullUnits = sqlite.prepare('SELECT COUNT(*) n FROM items WHERE unit IS NULL').get().n
  assert.equal(nullUnits, 0, 'a NULL unit would be invisible to every per-unit floor')
})

maybe('db.js SQL round-trips a serve and an attempt against real SQLite', async () => {
  const { db } = freshDb()
  const id = await db.recordServe({ subject: 'ap_csa', item_id: 'csa-ac-q1', served_at: T0 })
  assert.ok(Number.isInteger(id), `RETURNING id must yield an integer, got ${JSON.stringify(id)}`)

  const serve = await db.serve(id)
  assert.equal(serve.item_id, 'csa-ac-q1')
  assert.equal(serve.logged, 0)

  await db.markServeLogged(id)
  assert.equal((await db.serve(id)).logged, 1)

  await db.recordAttempt({
    ts: at(30), subject: 'ap_csa', item_id: 'csa-ac-q1', topic: '1.3', unit: '1',
    practice: 'P3', response: 'C', correct: 1, graded_by: 'server', seconds: 30,
    hints_used: 0, conditions: 'cold', mock_id: null,
  })
  const rows = await db.attempts('ap_csa')
  assert.equal(rows.length, 1)
  assert.equal(rows[0].kind, 'mcq', 'the join to items must supply kind')
  assert.equal(rows[0].correct, 1)
})

maybe('items parse back out of the JSON columns intact', async () => {
  const { db } = freshDb()
  const it = await db.item('csa-ac-q1')
  assert.equal(it.kind, 'mcq')
  assert.deepEqual(Object.keys(it.options).sort(), ['A', 'B', 'C', 'D'])
  assert.equal(it.answer, 'C')
  assert.ok(it.stem.includes('```java'), 'the code fence must survive SQL escaping')
})

maybe('a full CSA session runs end to end against real SQL', async () => {
  const { db } = freshDb()
  let served = 0
  let lessons = 0

  for (let i = 0; i < 12; i++) {
    const r = await handleNext({ db, subject: 'ap_csa', config: CSA, now: at(i * 120) })
    if (r.type !== 'question') {
      lessons++
      continue
    }
    served++
    assert.ok(r.serve > 0)
    assert.ok(r.stem)
    assert.ok(r.why, 'every question must explain itself')
    assert.ok(r.status.readiness_pct === 0, 'drills must never move readiness')
    // Answer the first few wrong on purpose to provoke the teaching path.
    const answer = i < 4 ? 'A' : 'B'
    const logged = await handleLog({ db, serveId: r.serve, response: answer, config: CSA, now: at(i * 120 + 45) })
    assert.equal(logged.graded_by, 'server')
    assert.equal(logged.seconds, 45, 'elapsed time must come from the serve row')
  }

  assert.ok(served > 0, 'the loop must actually serve questions')
  const s = await handleStatus({ db, subject: 'ap_csa', config: CSA, now: at(5000) })
  assert.equal(s.readiness_pct, 0)
  assert.match(s.next_thing_blocking, /topic|mock/i)
  assert.ok(s.questions_answered > 0)
})

maybe('a proctored mock scores itself and is the only thing that moves the needle', async () => {
  const { db } = freshDb()
  const m = await handleMockStart({ db, subject: 'ap_csa', section: 'I', source: 'official', config: CSA, now: T0 })

  for (let i = 0; i < 10; i++) {
    const q = await handleNext({ db, subject: 'ap_csa', config: CSA, now: at(i * 100), mockId: m.mock })
    if (q.type !== 'question') continue
    await handleLog({ db, serveId: q.serve, response: 'B', config: CSA, now: at(i * 100 + 60) })
  }
  const r = await handleMockSubmit({ db, mockId: m.mock, config: CSA, now: at(2000) })

  assert.ok(r.composite_pct >= 0 && r.composite_pct <= 100)
  assert.ok(r.answered > 0)
  // One mock is nowhere near the six-mock requirement, so readiness stays 0.
  assert.equal(r.status.readiness_pct, 0)
  assert.match(r.status.next_thing_blocking, /mock|topic/i)
})

maybe('a Precalc question can be served, graded, and reported', async () => {
  const { db } = freshDb()
  const q = await handleNext({ db, subject: 'ap_precalc', config: PRECALC, now: T0 })
  assert.ok(['question', 'lesson', 'lesson_missing'].includes(q.type))
  if (q.type === 'question') {
    const r = await handleLog({ db, serveId: q.serve, response: '3', config: PRECALC, now: at(50) })
    assert.equal(r.graded_by, 'server')
    assert.equal(r.seconds, 50)
  }
  const s = await handleStatus({ db, subject: 'ap_precalc', config: PRECALC, now: at(60) })
  assert.equal(s.subject, PRECALC.display_name)
  assert.equal(s.readiness_pct, 0)
  // Unit 4 is class-only and must not appear as an exam readiness criterion.
  assert.ok(!s.criteria.some((c) => /Unit 4/.test(c.requirement)), 'Unit 4 must be excluded')
})

maybe('reloading the seed does not disturb recorded evidence', async () => {
  const { sqlite, db } = freshDb()
  const id = await db.recordServe({ subject: 'ap_csa', item_id: 'csa-ac-q1', served_at: T0 })
  await db.recordAttempt({
    ts: at(10), subject: 'ap_csa', item_id: 'csa-ac-q1', topic: '1.3', unit: '1',
    practice: 'P3', response: 'C', correct: 1, graded_by: 'server', seconds: 10,
    hints_used: 0, conditions: 'cold', mock_id: null,
  })
  const before = (await db.attempts('ap_csa')).length

  // Re-run the whole seed, as a content update would.
  sqlite.exec(readFileSync(SEED, 'utf8'))

  assert.equal((await db.attempts('ap_csa')).length, before, 'attempts must survive a content reload')
  assert.ok(await db.serve(id), 'serves must survive a content reload')
})
