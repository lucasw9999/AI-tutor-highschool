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
import { breakdown } from '../src/readiness.js'

const SEED = new URL('../seed.sql', import.meta.url)
const CSA = JSON.parse(readFileSync(new URL('../config/ap_csa.json', import.meta.url)))
const PRECALC = JSON.parse(readFileSync(new URL('../config/ap_precalc.json', import.meta.url)))

/**
 * Minimal D1-compatible wrapper over node:sqlite, matching the subset of the
 * binding that db.js actually uses: prepare().bind().all()/.first()/.run().
 *
 * run() reshapes node:sqlite's raw {changes, lastInsertRowid} into the D1
 * envelope the deployed Worker actually resolves to — {success, meta: {changes,
 * ...}}, with NO top-level `changes` — so the changed-row counts db.js reads in
 * claimServe, closeMock and scoreMock (`r?.meta?.changes ?? r?.changes ?? 0`)
 * are exercised through their production branch here too, not only through the
 * node:sqlite-shaped fallback. See worker/tests/db.test.js's D1_ENVELOPE for the
 * same shape driven with a mutation check proving both branches are covered.
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
            meta: {
              changes: r.changes,
              last_row_id: Number(r.lastInsertRowid),
              changed_db: r.changes > 0,
              duration: 0.1,
              served_by: 'test',
            },
          }
        },
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

  // 10 logged answers is far short of the 90%-of-42 coverage floor api.js
  // requires before it will produce a composite at all, so this sitting is
  // recorded but NOT scored: composite_pct is null (not "some number in
  // range", which null would also satisfy), counted is false, and basis
  // explains why.
  assert.ok(r.answered > 0, 'the loop must actually log some answers')
  assert.ok(r.answered < 38, 'this fixture answers far fewer than the 90% coverage floor requires')
  assert.equal(r.composite_pct, null, 'a sitting this far under the coverage floor must not receive a composite')
  assert.equal(r.counted, false, 'an uncovered sitting must not count toward readiness')
  assert.match(r.basis, /recorded but NOT scored/, 'the basis string must explain why no composite was produced')
  // One mock is nowhere near the six-mock requirement, so readiness stays 0.
  assert.equal(r.status.readiness_pct, 0)
  assert.match(r.status.next_thing_blocking, /mock|topic/i)
})

maybe('a full 42-question mock scores an exact composite and blank count, and its per-unit breakdown matches real content', async () => {
  const { db } = freshDb()
  const m = await handleMockStart({ db, subject: 'ap_csa', section: 'I', source: 'official', config: CSA, now: T0 })

  // A fully known set of outcomes across the WHOLE section: 21 right, 20 wrong,
  // 1 genuinely blank -- 42 answers total, matching CSA.exam.mcq_count exactly,
  // so this sitting clears the coverage floor api.js requires before it will
  // produce a composite at all (a handful of answers is recorded but NOT
  // scored). Every "right"/"wrong" response is derived from the REAL answer
  // key pulled back off the serve, not guessed, so the expected composite
  // below is exact rather than merely plausible.
  const plan = [...Array(21).fill('right'), ...Array(20).fill('wrong'), 'blank']
  const seen = []
  let i = 0
  while (seen.length < plan.length) {
    const q = await handleNext({ db, subject: 'ap_csa', config: CSA, now: at(i * 100), mockId: m.mock })
    i++
    if (q.type !== 'question') continue

    const serveRow = await db.serve(q.serve)
    const item = await db.item(serveRow.item_id)
    const outcome = plan[seen.length]
    const response = outcome === 'right' ? item.answer : outcome === 'wrong' ? (item.answer === 'A' ? 'B' : 'A') : ''

    await handleLog({ db, serveId: q.serve, response, config: CSA, now: at(i * 100 + 30) })
    seen.push({ unit: item.unit, kind: item.kind, correct: outcome === 'right' })
  }

  const r = await handleMockSubmit({ db, mockId: m.mock, config: CSA, now: at(20000) })

  // 42 answers against a 42-question section clears the coverage floor, so this
  // gets a real composite. Every answer on it is multiple choice — not because
  // the seed holds nothing else (it holds 20 free-response items, 45% of the real
  // exam) but because this is a section I sitting, and api.js will not serve a
  // sitting a half its own section does not have. So all 42 answers — including
  // the blank, which grade.js scores as a mechanically graded miss — are scored.
  // 21 of 42 right is exactly 50%, not merely a value inside [0, 100].
  assert.deepEqual(
    [...new Set(seen.map((x) => x.kind))], ['mcq'],
    'section I is the multiple choice half; a rubric-scored item on it could not be marked at all',
  )
  assert.equal(r.answered, 42)
  assert.equal(r.scored, 42, 'every answer on a section I paper is mechanically graded, so all 42 must be scored')
  assert.equal(r.counted, true, 'full coverage of the section must produce a real composite')
  assert.equal(r.composite_pct, 50, 'a known 21-of-42 must produce the exact composite, not just a plausible one')
  // This is the exact shape of the regression a missing a.response projection
  // produces: blanks silently equals attempts.length (42) for every mock,
  // regardless of what was actually typed.
  assert.equal(r.blanks, 1, 'blanks must equal the 1 response actually left blank, not the 42 that were answered')

  // Per-unit breakdown, checked against the real unit each served item carries
  // in the seeded content, not a synthetic attempt.
  const attempts = (await db.attempts('ap_csa')).filter((a) => a.mock_id === m.mock)
  const byUnit = breakdown(attempts, 'unit')
  const expected = new Map()
  for (const { unit, correct } of seen) {
    const e = expected.get(unit) ?? { n: 0, right: 0 }
    e.n++
    if (correct) e.right++
    expected.set(unit, e)
  }
  assert.equal(Object.keys(byUnit).length, expected.size, 'breakdown must surface exactly the units actually exercised')
  for (const [unit, e] of expected) {
    assert.ok(byUnit[unit], `unit ${unit} must appear in the breakdown`)
    assert.equal(byUnit[unit].n, e.n, `unit ${unit} attempt count must match the real items served`)
    assert.equal(byUnit[unit].pct, (e.right / e.n) * 100, `unit ${unit} pct must match real correctness`)
  }
})

maybe('a Precalc question is served and never marked wrong for lacking a key', async () => {
  const { db } = freshDb()
  const q = await handleNext({ db, subject: 'ap_precalc', config: PRECALC, now: T0 })
  assert.ok(['question', 'lesson', 'lesson_missing'].includes(q.type))

  if (q.type === 'question') {
    const r = await handleLog({ db, serveId: q.serve, response: '3', config: PRECALC, now: at(50) })
    // These items are worked-solution practice with no canonical short answer,
    // so they are model-graded. The original bug asserted only graded_by ===
    // 'server' here, which passed while every answer was being scored WRONG.
    assert.equal(r.graded_by, 'model')
    assert.equal(r.correct, null, 'the server must not claim a verdict it did not reach')
    assert.equal(r.graded, false)
    assert.ok(r.explanation, 'the student must get the worked solution as feedback')
    assert.match(r.note, /does not count toward readiness/)
    assert.equal(r.seconds, 50)

    // And the recorded attempt must not poison any percentage.
    const rows = await db.attempts('ap_precalc')
    assert.equal(rows[0].graded_by, 'model')
  }

  const s = await handleStatus({ db, subject: 'ap_precalc', config: PRECALC, now: at(60) })
  assert.equal(s.subject, PRECALC.display_name)
  assert.equal(s.readiness_pct, 0)
  assert.ok(!s.criteria.some((c) => /Unit 4/.test(c.requirement)), 'Unit 4 must be excluded')
})

maybe('a Precalc mock composite is not dragged to zero by ungraded answers', async () => {
  const { db } = freshDb()
  const m = await handleMockStart({ db, subject: 'ap_precalc', section: 'I', source: 'bank', config: PRECALC, now: T0 })
  for (let i = 0; i < 5; i++) {
    const q = await handleNext({ db, subject: 'ap_precalc', config: PRECALC, now: at(i * 100), mockId: m.mock })
    if (q.type !== 'question') continue
    await handleLog({ db, serveId: q.serve, response: 'anything', config: PRECALC, now: at(i * 100 + 60) })
  }
  const r = await handleMockSubmit({ db, mockId: m.mock, config: PRECALC, now: at(2000) })
  assert.equal(r.scored, 0, 'no mechanically graded answers in this sitting')
  assert.ok(r.ungraded > 0)
  assert.match(r.basis, /need human or model grading/)
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
