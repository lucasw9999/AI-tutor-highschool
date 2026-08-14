import { test } from 'node:test'
import assert from 'node:assert/strict'
import { spawnSync } from 'node:child_process'
import { existsSync, mkdirSync, mkdtempSync, readFileSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { DatabaseSync } from 'node:sqlite'
import {
  lit, unitIndex, itemRows, topicRows, buildSql,
  splitSqlStatements, statementSizes, oversizedStatements, D1_MAX_STATEMENT_BYTES,
} from '../to-sql.js'

const ROOT = fileURLToPath(new URL('../../../', import.meta.url))
const readRoot = (...p) => readFileSync(join(ROOT, ...p), 'utf8')
const readJson = (...p) => JSON.parse(readRoot(...p))

// --- Evidence-table guard --------------------------------------------------
//
// Reloading content must never write to attempts/serves/mocks/gaps, and must
// never run a DROP/ALTER/TRUNCATE. A plain substring/regex search over the
// generated SQL text is too coarse for this: ordinary English words like
// "attempts", or a stem that asks "What does a DROP TABLE statement do?",
// live inside quoted string literals and would trip a text search despite
// writing nothing. Instead we split the SQL into individual statements — with
// `splitSqlStatements`, the same exported splitter the deploy uses, so neither
// a semicolon inside a literal nor one inside a comment can fool the split —
// and look only at each statement's head: its verb and target table, never the
// values it carries.

const STATEMENT_HEAD = new RegExp(
  '(INSERT\\s+OR\\s+(?:REPLACE|IGNORE)\\s+INTO|INSERT\\s+INTO|UPDATE|DELETE\\s+FROM|' +
  'DROP\\s+TABLE(?:\\s+IF\\s+EXISTS)?|ALTER\\s+TABLE|TRUNCATE(?:\\s+TABLE)?)\\s+["\'`]?(\\w+)',
  'i',
)

/** Find the verb + target table of each statement, ignoring comment lines
 * (`-- ...`) so a comment mentioning a table name is never mistaken for a
 * write to it. Statements with no matching head (CREATE TABLE, PRAGMA, etc.)
 * are skipped — they neither write rows nor destroy anything. */
function statementTargets(sql) {
  const targets = []
  for (const statement of splitSqlStatements(sql)) {
    const code = statement.split('\n').filter((line) => !/^\s*--/.test(line)).join('\n').trim()
    if (!code) continue
    const m = code.match(STATEMENT_HEAD)
    if (!m) continue
    targets.push({ verb: m[1].replace(/\s+/g, ' ').toUpperCase(), table: m[2].toLowerCase() })
  }
  return targets
}

/** Assert `sql` only ever writes rows to `allowedTables`, and never runs a
 * DROP/ALTER/TRUNCATE against anything. Returns the set of tables actually
 * written to (INSERT/UPDATE/DELETE), so callers can assert it precisely. */
function assertOnlyWrites(sql, allowedTables) {
  const allowed = new Set(allowedTables)
  const written = new Set()
  for (const { verb, table } of statementTargets(sql)) {
    if (/^(DROP|ALTER|TRUNCATE)/.test(verb)) {
      throw new Error(`content reload must never run ${verb} (target: ${table})`)
    }
    written.add(table)
    if (!allowed.has(table)) {
      throw new Error(`content reload must not write to ${table} (via ${verb})`)
    }
  }
  return written
}

test('lit escapes embedded quotes rather than breaking the statement', () => {
  assert.equal(lit("it's"), "'it''s'")
  assert.equal(lit(null), 'NULL')
  assert.equal(lit(undefined), 'NULL')
  assert.equal(lit(42), '42')
  assert.equal(lit(true), '1')
  assert.equal(lit(false), '0')
})

test('lit survives a Java snippet with quotes, newlines and backslashes', () => {
  const stem = 'System.out.println("a\\n" + \'x\');'
  const out = lit(stem)
  assert.ok(out.startsWith("'") && out.endsWith("'"))
  // Only single quotes need doubling in a SQL literal; the rest passes through.
  assert.equal(out, `'System.out.println("a\\n" + ''x'');'`)
})

test('a quote-heavy explanation cannot terminate the literal early', () => {
  const nasty = `'; DROP TABLE items; --`
  const out = lit(nasty)
  assert.equal(out, `'''; DROP TABLE items; --'`)
  // One opening quote, one closing, and the interior quote doubled.
  assert.equal((out.match(/'/g) ?? []).length, 4)
})

test('unit is taken from the topics table, not parsed from the topic id', () => {
  // Topic '9.1' deliberately belongs to unit '2' to prove the lookup is used.
  const topics = [{ id: '9.1', subject: 'ap_csa', unit: '2' }]
  const items = [{ id: 'x', subject: 'ap_csa', topic: '9.1', kind: 'mcq', stem: 's', answer: 'A' }]
  const rows = itemRows(items, unitIndex(topics))
  assert.equal(rows[0][3], "'2'", 'unit must come from the topic row')
})

test('an item whose topic has no row gets a NULL unit, which the CLI treats as fatal', () => {
  const rows = itemRows(
    [{ id: 'x', subject: 'ap_csa', topic: 'nope', kind: 'mcq', stem: 's', answer: 'A' }],
    unitIndex([]),
  )
  assert.equal(rows[0][3], 'NULL')
})

test('tested_on_exam defaults to 1 and only an explicit false turns it off', () => {
  const rows = topicRows([
    { id: '1.1', subject: 'ap_csa', tested_on_exam: true },
    { id: '4.1', subject: 'ap_precalc', tested_on_exam: false },
    { id: '2.1', subject: 'ap_csa' },
  ])
  assert.equal(rows[0][7], '1')
  assert.equal(rows[1][7], '0')
  assert.equal(rows[2][7], '1', 'absent means tested')
})

test('options and rubrics are stored as JSON strings', () => {
  const rows = itemRows(
    [{ id: 'x', subject: 's', topic: 't', kind: 'mcq', stem: 'q', options: { A: '1', B: '2' }, answer: 'A' }],
    unitIndex([{ id: 't', subject: 's', unit: '1' }]),
  )
  assert.equal(rows[0][7], `'{"A":"1","B":"2"}'`)
})

test('generated SQL is idempotent and never touches evidence tables', () => {
  const sql = buildSql({
    items: [
      { id: 'x', subject: 's', topic: 't', kind: 'mcq', stem: 'q', answer: 'A' },
      // Ordinary content text that happens to contain evidence-table words and
      // SQL keywords. None of this should trip the guard: it is quoted data,
      // not a statement that writes to attempts/serves/mocks/gaps or drops
      // anything. A naive substring/regex search over the whole SQL text
      // would flag these as false positives.
      {
        id: 'y', subject: 's', topic: 't', kind: 'mcq', stem: 'q', answer: 'A',
        explanation: 'Count the number of attempts the loop makes before it exits.',
      },
      {
        id: 'z', subject: 's', topic: 't', kind: 'mcq',
        stem: 'What does a DROP TABLE statement do in SQL?', answer: 'A',
      },
    ],
    topics: [{ id: 't', subject: 's', unit: '1' }],
    teaching: [{ topic: 't', subject: 's', plain_idea: 'i' }],
    schema: 'CREATE TABLE IF NOT EXISTS items (id TEXT PRIMARY KEY);',
  })
  assert.ok(sql.includes('INSERT OR REPLACE INTO items'))
  assert.ok(sql.includes('INSERT OR REPLACE INTO topics'))
  assert.ok(sql.includes('INSERT OR REPLACE INTO teaching'))
  const written = assertOnlyWrites(sql, ['topics', 'items', 'teaching'])
  assert.deepEqual([...written].sort(), ['items', 'teaching', 'topics'])
})

test('the evidence guard still catches a real write to an evidence table', () => {
  const bad = "INSERT OR REPLACE INTO items (id) VALUES ('x');\n" +
    "INSERT INTO attempts (id, correct) VALUES (1, 1);"
  assert.throws(() => assertOnlyWrites(bad, ['topics', 'items', 'teaching']), /attempts/)
})

test('the evidence guard still catches a real DROP TABLE', () => {
  const bad = "INSERT OR REPLACE INTO items (id) VALUES ('x');\nDROP TABLE items;"
  assert.throws(() => assertOnlyWrites(bad, ['topics', 'items', 'teaching']), /DROP TABLE/)
})

test('the evidence guard still catches an UPDATE or DELETE against an evidence table', () => {
  assert.throws(
    () => assertOnlyWrites("UPDATE gaps SET cleared_at = '1' WHERE id = 1;", ['topics', 'items', 'teaching']),
    /gaps/,
  )
  assert.throws(
    () => assertOnlyWrites("DELETE FROM mocks WHERE id = 1;", ['topics', 'items', 'teaching']),
    /mocks/,
  )
})

test('the real generated worker/seed.sql only ever writes to content tables', () => {
  // Read-only: this reads the checked-in file, it never regenerates it.
  const sql = readFileSync(new URL('../../../worker/seed.sql', import.meta.url), 'utf8')
  const written = assertOnlyWrites(sql, ['topics', 'items', 'teaching'])
  assert.deepEqual([...written].sort(), ['items', 'teaching', 'topics'])
})

test('large item sets are chunked into multiple statements', () => {
  const items = Array.from({ length: 95 }, (_, i) => ({ id: `i${i}`, subject: 's', topic: 't', kind: 'mcq', stem: 'q', answer: 'A' }))
  const sql = buildSql({ items, topics: [{ id: 't', subject: 's', unit: '1' }], teaching: [], schema: '' })
  const inserts = (sql.match(/INSERT OR REPLACE INTO items/g) ?? []).length
  assert.equal(inserts, 3, '95 rows at 40 per statement')
})

// --- the deployment path: one statement at a time --------------------------
//
// `sqlite.exec()` swallows a whole script at once, which is NOT how the seed
// reaches D1. The deploy splits it into statements and sends them in batches
// (worker/DEPLOY.md), and that split is where the file can be corrupted without
// looking corrupted, in two ways:
//
//   1. A `;` inside a string literal. CSA stems contain Java, so
//      `String csv = "red,green,blue,yellow";` ends a line with a semicolon
//      INSIDE a SQL literal. A naive line-ending-in-`;` split cuts there and
//      the halves are each individually invalid — or, worse, silently short a
//      row. Verified the hard way earlier in this project.
//   2. A `;` or a lone apostrophe inside a COMMENT. worker/schema.sql is
//      embedded in the seed verbatim, and its prose contains both. A splitter
//      that tracks quote state but not comments reads a comment apostrophe as
//      the start of a literal and stops seeing statement boundaries until the
//      next one, gluing statements together — and since it is parity that
//      decides this, one apostrophe added to a comment inverts the state for
//      the rest of the file and the load fails almost completely.
//
// Both are the exported `splitSqlStatements`'s job, and the tests below are
// written against that function rather than a copy of it, because a splitter
// re-derived at deploy time from prose is not the splitter these tests cover.
//
// Every statement is then loaded with `prepare().run()`, NOT `exec()`. That is
// deliberate and it is what makes hazard 2 visible: `exec()` happily runs a
// chunk carrying seven glued statements, so the row counts still reconcile and
// the corruption is invisible. `prepare()` compiles exactly ONE statement, so
// anything glued on behind it is silently skipped and the counts do not add up.

/** Load a script the way the deploy does: one statement at a time. */
function loadStatements(db, sql) {
  const statements = splitSqlStatements(sql)
  for (const [i, statement] of statements.entries()) {
    try {
      db.prepare(statement).run()
    } catch (err) {
      throw new Error(
        `statement ${i + 1} of ${statements.length} would not load on its own: ` +
        `${err.message}\n${statement.slice(0, 200)}`,
      )
    }
  }
  return statements
}

test('a `;` inside a string literal does not end the statement', () => {
  const sql = `INSERT INTO t VALUES ('String csv = "red,green";');\nINSERT INTO t VALUES ('b');`
  const out = splitSqlStatements(sql)
  assert.equal(out.length, 2)
  assert.match(out[0], /String csv = "red,green";/)
})

test("`''` is an escaped quote and does not reopen the literal", () => {
  const out = splitSqlStatements(`INSERT INTO t VALUES ('it''s; fine');\nINSERT INTO t VALUES ('b');`)
  assert.equal(out.length, 2)
  assert.equal(out[0], `INSERT INTO t VALUES ('it''s; fine');`)
})

test('a literal containing `--` is data, not the start of a comment', () => {
  const out = splitSqlStatements(`INSERT INTO t VALUES ('a -- b'); INSERT INTO t VALUES ('c');`)
  assert.equal(out.length, 2)
  assert.match(out[0], /'a -- b'/)
})

test('a literal containing a block-comment opener is data too', () => {
  const out = splitSqlStatements(`INSERT INTO t VALUES ('/* not a comment'); INSERT INTO t VALUES ('c');`)
  assert.equal(out.length, 2)
})

test('a comment with an EVEN number of apostrophes leaves the statements alone', () => {
  const out = splitSqlStatements(`-- the grader's rules and db.js's probe\nINSERT INTO t VALUES ('a');\nINSERT INTO t VALUES ('b');`)
  assert.equal(out.length, 2)
})

test('a comment with an ODD number of apostrophes does not swallow the next statement', () => {
  // THE defect. A comment-unaware splitter reads `column's` as an opening quote
  // and then sees no statement boundary until the next apostrophe, returning
  // ONE statement instead of two.
  const out = splitSqlStatements(`-- db.js detects that column's absence\nINSERT INTO t VALUES ('a');\nINSERT INTO t VALUES ('b');`)
  assert.equal(out.length, 2, 'an apostrophe in a comment must not open a literal')
  assert.match(out[1], /VALUES \('b'\);$/)
})

test('an odd-apostrophe comment ahead of several statements leaves all of them', () => {
  const sql = `-- whatever the grader's parsing rules are by then\n` +
    [1, 2, 3, 4].map((n) => `INSERT INTO t VALUES ('${n}');`).join('\n')
  assert.equal(splitSqlStatements(sql).length, 4)
})

test('a `;` inside a comment ends nothing', () => {
  // schema.sql writes `ALTER TABLE attempts ADD COLUMN picked TEXT;` inside a
  // `--` line. That semicolon is documentation, not a boundary.
  const out = splitSqlStatements(
    `--   ALTER TABLE attempts ADD COLUMN picked TEXT;   -- a note\nCREATE TABLE t (id TEXT);`,
  )
  assert.equal(out.length, 1)
  assert.match(out[0], /CREATE TABLE t \(id TEXT\);$/)
})

test('a block comment is opaque: apostrophes, semicolons and newlines inside it', () => {
  const out = splitSqlStatements(`/* it's fine;\n   really; */\nINSERT INTO t VALUES ('a');\nINSERT INTO t VALUES ('b');`)
  assert.equal(out.length, 2)
})

test('a quoted identifier is opaque the same way a literal is', () => {
  const out = splitSqlStatements(`INSERT INTO "odd;name" (id) VALUES ('a'); INSERT INTO t VALUES ('b');`)
  assert.equal(out.length, 2)
  assert.match(out[0], /"odd;name"/)
})

test('comment-only text is not a statement', () => {
  // It belongs to the statement that follows it; at end of file there is no
  // statement for it to belong to, so it is not one.
  const out = splitSqlStatements(`-- a header\n-- two lines of it\nCREATE TABLE t (id TEXT);\n-- a trailing note\n`)
  assert.equal(out.length, 1)
  assert.match(out[0], /^-- a header/)
  assert.match(out[0], /CREATE TABLE t \(id TEXT\);$/)
})

test('an empty statement is not a statement', () => {
  assert.deepEqual(splitSqlStatements(';;\nCREATE TABLE t (id TEXT);;'), ['CREATE TABLE t (id TEXT);'])
  assert.deepEqual(splitSqlStatements('-- nothing but a comment\n'), [])
  assert.deepEqual(splitSqlStatements(''), [])
})

test('a final statement with no trailing semicolon is still returned', () => {
  assert.deepEqual(splitSqlStatements('CREATE TABLE t (id TEXT)'), ['CREATE TABLE t (id TEXT)'])
})

test('every statement the splitter emits is exactly one statement, per SQLite itself', () => {
  // Independent oracle: `prepare()` compiles the FIRST statement of whatever it
  // is handed, and `sourceSQL` reports just that much. If SQLite's own tokenizer
  // agrees the whole chunk is one statement, nothing was glued together — this
  // is what fails on a chunk carrying seven CREATEs, which the shipped
  // comment-unaware splitter produced and no assertion here noticed.
  const sql = readRoot('worker', 'seed.sql')
  const db = new DatabaseSync(':memory:')
  const statements = splitSqlStatements(sql)
  const glued = []
  for (const [i, statement] of statements.entries()) {
    const compiled = db.prepare(statement)
    if (compiled.sourceSQL !== statement) {
      glued.push(
        `statement ${i + 1} of ${statements.length}: the splitter returned ` +
        `${Buffer.byteLength(statement)} bytes but SQLite reads only the first ` +
        `${Buffer.byteLength(compiled.sourceSQL)} as one statement`,
      )
    }
    compiled.run() // so the next statement's tables exist
  }
  assert.deepEqual(glued, [], glued.join('\n'))
  assert.ok(statements.length > 20, `expected the real file to hold many statements, got ${statements.length}`)
})

test('the real worker/seed.sql loads statement-by-statement and every row round-trips', () => {
  const sql = readRoot('worker', 'seed.sql')
  const items = readJson('content', 'items.json')
  const topics = readJson('content', 'topics.json')
  const teaching = readJson('content', 'teaching.json')

  const db = new DatabaseSync(':memory:')
  loadStatements(db, sql)

  const count = (table) => db.prepare(`SELECT count(*) n FROM ${table}`).get().n
  assert.equal(count('items'), items.length, 'every compiled item must survive the split and the load')
  assert.equal(count('topics'), topics.length)
  assert.equal(count('teaching'), teaching.length)

  // The exact hazard, asserted on the row it lives in rather than on a total: the
  // Java line whose semicolon sits inside the literal must arrive whole.
  const java = db.prepare(`SELECT id, stem FROM items WHERE stem LIKE '%red,green,blue,yellow%'`).all()
  assert.ok(java.length, 'the Java stem containing a semicolon inside a string literal must still be in the bank')
  for (const row of java) {
    assert.match(row.stem, /String csv = "red,green,blue,yellow";/, `${row.id}: the Java line was truncated`)
  }

  // And every key and topic, as the DATABASE holds them, against the artifact they
  // came from. A key mangled by SQL escaping would mark a right answer WRONG.
  const stored = new Map(
    db.prepare(`SELECT id, topic, unit, kind, answer, answer_variants_json FROM items`).all().map((r) => [r.id, r]),
  )
  const drift = []
  for (const it of items) {
    const row = stored.get(it.id)
    if (!row) { drift.push(`${it.id} is missing from the database entirely`); continue }
    if (row.topic !== it.topic) drift.push(`${it.id} topic: ${JSON.stringify(row.topic)} != ${JSON.stringify(it.topic)}`)
    if (row.kind !== it.kind) drift.push(`${it.id} kind: ${row.kind} != ${it.kind}`)
    if ((row.answer ?? null) !== (it.answer ?? null)) {
      drift.push(`${it.id} answer: ${JSON.stringify(row.answer)} != ${JSON.stringify(it.answer)}`)
    }
    const variants = row.answer_variants_json ? JSON.parse(row.answer_variants_json) : []
    if (JSON.stringify(variants) !== JSON.stringify(it.answer_variants ?? [])) {
      drift.push(`${it.id} answer_variants differ between content/items.json and the seed`)
    }
  }
  assert.deepEqual(drift, [], `the seed does not hold what the artifacts do:\n  ${drift.slice(0, 15).join('\n  ')}`)
})

test('one apostrophe added to a schema comment cannot corrupt the load', () => {
  // The latent total failure, reproduced on the REAL schema: a documentation-only
  // edit that adds a single apostrophe to a comment. Under a comment-unaware
  // splitter this input loads 0 of 3 items and fails almost every chunk; the
  // quote parity of the whole rest of the file is inverted by that one character.
  const schema = readRoot('worker', 'schema.sql')
  const content = {
    items: [1, 2, 3].map((n) => ({ id: `i${n}`, subject: 's', topic: 't', kind: 'mcq', stem: 'q', answer: 'A' })),
    topics: [{ id: 't', subject: 's', unit: '1' }],
    teaching: [{ topic: 't', subject: 's', plain_idea: 'i' }],
  }
  const clean = buildSql({ ...content, schema })
  const poisoned = buildSql({ ...content, schema: `${schema}\n-- one more note, about db.js's probe.\n` })

  assert.equal(
    splitSqlStatements(poisoned).length,
    splitSqlStatements(clean).length,
    'a comment must not change how many statements the file has',
  )
  const db = new DatabaseSync(':memory:')
  loadStatements(db, poisoned)
  const count = (table) => db.prepare(`SELECT count(*) n FROM ${table}`).get().n
  assert.equal(count('items'), 3)
  assert.equal(count('topics'), 1)
  assert.equal(count('teaching'), 1)
})

// --- D1's statement-length ceiling -----------------------------------------
//
// Cloudflare D1 rejects any single SQL statement over 100,000 bytes, and that
// limit applies per statement inside a batch, so grouping does not amortize it.
// Nothing else in this project can catch a violation: node:sqlite has no such
// limit and accepts a 140 KB statement without complaint, so an over-limit seed
// passes every local test and then fails PARTWAY THROUGH the real load, leaving
// the live database half-seeded. Hence a gate on the generated file.

test("D1's statement limit is named, sourced, and measured in bytes", () => {
  assert.equal(D1_MAX_STATEMENT_BYTES, 100_000)
  // Bytes, never `.length`: UTF-16 code units undercount this content by
  // thousands of bytes, and every D1 limit is specified in bytes.
  const sql = readRoot('worker', 'seed.sql')
  assert.ok(
    Buffer.byteLength(sql) > sql.length,
    'this content is full of multi-byte characters, so `.length` is the wrong unit',
  )
})

test('the shipped seed.sql has no statement D1 would reject', () => {
  const sql = readRoot('worker', 'seed.sql')
  const over = oversizedStatements(sql)
  assert.deepEqual(
    over.map((s) => `statement ${s.index}: ${s.bytes} bytes -- ${s.head}`),
    [],
    `D1 rejects statements over ${D1_MAX_STATEMENT_BYTES} bytes`,
  )
  const largest = statementSizes(sql).reduce((a, b) => (b.bytes > a.bytes ? b : a))
  assert.ok(
    largest.bytes <= D1_MAX_STATEMENT_BYTES,
    `largest statement is ${largest.bytes} bytes, ` +
    `${((largest.bytes / D1_MAX_STATEMENT_BYTES) * 100).toFixed(1)}% of the limit`,
  )
})

test('the statement-size gate fires on a statement D1 would reject', () => {
  // One item with an oversized stem: a single row bigger than the whole ceiling,
  // which is the shape this would really take (an item with many answer variants
  // landing in an already-large chunk).
  const sql = buildSql({
    items: [{ id: 'big', subject: 's', topic: 't', kind: 'mcq', stem: 'x'.repeat(120_000), answer: 'A' }],
    topics: [{ id: 't', subject: 's', unit: '1' }],
    teaching: [],
    schema: '',
  })
  const over = oversizedStatements(sql)
  assert.equal(over.length, 1, 'the oversized INSERT must be reported')
  assert.ok(over[0].bytes > D1_MAX_STATEMENT_BYTES)
  assert.match(over[0].head, /INSERT OR REPLACE INTO items/)

  // And the reason a gate is needed at all: SQLite takes the same statement
  // without complaint, so no amount of local loading would ever surface this.
  const oversized = splitSqlStatements(sql).find((s) => Buffer.byteLength(s) > D1_MAX_STATEMENT_BYTES)
  const db = new DatabaseSync(':memory:')
  db.exec(readRoot('worker', 'schema.sql'))
  db.prepare(oversized).run()
  assert.equal(db.prepare('SELECT count(*) n FROM items').get().n, 1, 'node:sqlite has no statement-length limit')
})

// --- reloading over a live database with real evidence in it ----------------

/** Everything the reload must leave untouched, as text. */
function evidenceSnapshot(db) {
  const dump = (table) => JSON.stringify(db.prepare(`SELECT * FROM ${table} ORDER BY rowid`).all())
  return {
    attempts: dump('attempts'),
    serves: dump('serves'),
    mocks: dump('mocks'),
    gaps: dump('gaps'),
    sequence: JSON.stringify(db.prepare('SELECT name, seq FROM sqlite_sequence ORDER BY name').all()),
  }
}

test('reloading the real seed over a database holding evidence disturbs none of it', () => {
  // The property worker/DEPLOY.md promises: "reloading is safe against a live
  // database with real evidence in it". This is that assertion.
  const sql = readRoot('worker', 'seed.sql')
  const db = new DatabaseSync(':memory:')
  loadStatements(db, sql)

  // A column added by a migration after the table shipped, of exactly the kind
  // schema.sql documents: it must survive a reload, because `CREATE TABLE IF NOT
  // EXISTS` leaves an existing table alone.
  db.exec('ALTER TABLE attempts ADD COLUMN a_later_migration TEXT;')

  const item = db.prepare('SELECT id, subject, topic, unit FROM items LIMIT 1').get()
  db.prepare(
    `INSERT INTO attempts (ts, subject, item_id, topic, unit, response, correct, picked, graded_by,
                           seconds, hints_used, conditions, a_later_migration)
     VALUES ('2026-08-13T12:00:00Z', ?, ?, ?, ?, 'B', 1, 'B', 'server', 42, 0, 'cold', 'kept')`,
  ).run(item.subject, item.id, item.topic, item.unit)
  db.prepare(
    `INSERT INTO serves (subject, item_id, served_at, logged) VALUES (?, ?, '2026-08-13T11:59:00Z', 1)`,
  ).run(item.subject, item.id)
  db.prepare(
    `INSERT INTO mocks (subject, section, started_at, proctored, source) VALUES (?, 'I', '2026-08-13T10:00:00Z', 1, 'bank')`,
  ).run(item.subject)
  db.prepare(
    `INSERT INTO gaps (subject, topic, opened_at) VALUES (?, ?, '2026-08-13T12:00:01Z')`,
  ).run(item.subject, item.topic)

  // INSERT OR REPLACE is a DELETE followed by an INSERT. If any evidence table
  // referenced a content table with ON DELETE CASCADE, reloading content would
  // silently erase attempts — so the absence of such a reference is part of what
  // makes the reload safe, and is asserted rather than assumed.
  for (const table of ['attempts', 'serves', 'mocks', 'gaps']) {
    const refs = db.prepare(`PRAGMA foreign_key_list(${table})`).all().map((r) => r.table)
    assert.deepEqual(
      refs.filter((t) => ['items', 'topics', 'teaching'].includes(t)),
      [],
      `${table} must not reference a content table: INSERT OR REPLACE deletes before it inserts`,
    )
  }

  const before = evidenceSnapshot(db)
  const contentBefore = ['items', 'topics', 'teaching'].map(
    (t) => JSON.stringify(db.prepare(`SELECT * FROM ${t} ORDER BY rowid`).all()),
  )

  loadStatements(db, sql) // reload
  loadStatements(db, sql) // and again, because idempotent means any number of times

  assert.deepEqual(evidenceSnapshot(db), before, 'a content reload rewrote evidence')
  assert.deepEqual(
    ['items', 'topics', 'teaching'].map((t) => JSON.stringify(db.prepare(`SELECT * FROM ${t} ORDER BY rowid`).all())),
    contentBefore,
    'a reload must be a no-op on content it already holds',
  )

  // The migration-added column survived, values and all.
  assert.equal(db.prepare('SELECT a_later_migration v FROM attempts').get().v, 'kept')

  // Autoincrement did not rewind: the next attempt gets id 2, not id 1 again.
  db.prepare(
    `INSERT INTO attempts (ts, subject, item_id, correct, graded_by, conditions)
     VALUES ('2026-08-13T13:00:00Z', ?, ?, 0, 'server', 'cold')`,
  ).run(item.subject, item.id)
  assert.equal(db.prepare('SELECT max(id) id FROM attempts').get().id, 2)
})

// --- the runbook's numbers ---------------------------------------------------
//
// worker/DEPLOY.md is followed by a human against the live database, and its
// measured figures had drifted three times by the time they were checked: a size
// 20% understated, an item count that contradicted the same document forty lines
// later, and a "measured, not guessed" claim that was no longer either. Prose
// cannot be kept honest by intention, so every figure in the runbook's
// measurement table is re-measured here against the real file.

const DEPLOY = readRoot('worker', 'DEPLOY.md')

/** The one DEPLOY.md measurement-table row whose label matches. */
function runbookRow(labelPattern) {
  const rows = DEPLOY.split('\n').filter((l) => l.startsWith('|')).map((l) => l.split('|'))
  const matched = rows.filter((cells) => labelPattern.test(cells[1] ?? ''))
  assert.equal(matched.length, 1, `expected exactly one DEPLOY.md row labelled ${labelPattern}`)
  return { label: matched[0][1], value: matched[0][2] }
}

/** The numbers the runbook states in that row's value cell, in order. */
function runbookNumbers(labelPattern) {
  return (runbookRow(labelPattern).value.match(/\d+(?:\.\d+)?/g) ?? []).map(Number)
}

/** The WRONG split — cut after every line that ends in `;` — kept only to keep
 * the runbook's warning about it honest. Never use this to load anything. */
function naiveLineSplit(sql) {
  const chunks = []
  let current = []
  for (const line of sql.split('\n')) {
    current.push(line)
    if (line.trimEnd().endsWith(';')) { chunks.push(current.join('\n')); current = [] }
  }
  if (current.join('\n').trim()) chunks.push(current.join('\n'))
  return chunks.map((c) => c.trim()).filter(Boolean)
}

test('DEPLOY.md states the real size of seed.sql, in bytes', () => {
  const sql = readRoot('worker', 'seed.sql')
  const bytes = Buffer.byteLength(sql)
  assert.deepEqual(
    runbookNumbers(/^\s*`seed\.sql`, total/),
    [bytes, Number((bytes / 1024).toFixed(1))],
    `worker/DEPLOY.md is stale: seed.sql is ${bytes} bytes (${(bytes / 1024).toFixed(1)} KiB)`,
  )
})

test('DEPLOY.md states the real statement count and the real largest statement', () => {
  const sql = readRoot('worker', 'seed.sql')
  const sizes = statementSizes(sql)
  assert.deepEqual(
    runbookNumbers(/^\s*statements\s*$/), [sizes.length],
    `worker/DEPLOY.md is stale: the file holds ${sizes.length} statements`,
  )

  const largest = sizes.reduce((a, b) => (b.bytes > a.bytes ? b : a))
  const pct = Number(((largest.bytes / D1_MAX_STATEMENT_BYTES) * 100).toFixed(1))
  assert.deepEqual(
    runbookNumbers(/^\s*largest statement\s*$/),
    [largest.bytes, pct, D1_MAX_STATEMENT_BYTES - largest.bytes],
    `worker/DEPLOY.md is stale: the largest statement is ${largest.bytes} bytes, ` +
    `${pct}% of the limit, ${D1_MAX_STATEMENT_BYTES - largest.bytes} bytes of headroom`,
  )
})

test('DEPLOY.md names every statement too big for the ~40 KiB request target', () => {
  // The instruction to group into ~40 KiB requests is unachievable for these,
  // because a statement cannot be split. The runbook has to say which they are.
  const over = statementSizes(readRoot('worker', 'seed.sql')).filter((s) => s.bytes > 40 * 1024)
  assert.deepEqual(
    runbookNumbers(/statements over 40 KiB/),
    [over.length, ...over.map((s) => s.bytes)],
    `worker/DEPLOY.md is stale: ${over.length} statements exceed 40 KiB — ${over.map((s) => s.bytes).join(', ')}`,
  )
})

test('DEPLOY.md states how little headroom one more variant-heavy item leaves', () => {
  // The measurement behind "the headroom is thin": one more row shaped like the
  // heaviest item already in the bank, added to the largest chunk.
  const sql = readRoot('worker', 'seed.sql')
  const items = readJson('content', 'items.json')
  const topics = readJson('content', 'topics.json')
  const largest = statementSizes(sql).reduce((a, b) => (b.bytes > a.bytes ? b : a))

  const heaviest = items
    .map((it) => ({ it, row: `  (${itemRows([it], unitIndex(topics))[0].join(', ')}),` }))
    .reduce((a, b) => (Buffer.byteLength(b.row) > Buffer.byteLength(a.row) ? b : a))
  assert.match(
    runbookRow(/heaviest item in the bank/).label, new RegExp(`\`${heaviest.it.id}\``),
    `worker/DEPLOY.md names the wrong heaviest item; it is now ${heaviest.it.id}`,
  )

  const grown = largest.bytes + Buffer.byteLength(heaviest.row)
  const pct = Number(((grown / D1_MAX_STATEMENT_BYTES) * 100).toFixed(1))
  assert.deepEqual(
    runbookNumbers(/heaviest item in the bank/), [grown, pct],
    `worker/DEPLOY.md is stale: one more ${heaviest.it.id}-shaped row makes that ` +
    `statement ${grown} bytes, ${pct}% of the limit`,
  )
})

test('DEPLOY.md states what a naive line-ending-in-`;` split really does', () => {
  const sql = readRoot('worker', 'seed.sql')
  const items = readJson('content', 'items.json')
  const chunks = naiveLineSplit(sql)
  const db = new DatabaseSync(':memory:')
  let failed = 0
  for (const chunk of chunks) {
    try { db.exec(chunk.endsWith(';') ? chunk : `${chunk};`) } catch { failed++ }
  }
  let loaded = 0
  try { loaded = db.prepare('SELECT count(*) n FROM items').get().n } catch { loaded = 0 }

  assert.ok(failed > 0, 'the naive split must still be broken, or this warning is obsolete')
  assert.deepEqual(
    runbookNumbers(/naive line-ending/),
    [loaded, items.length, failed, chunks.length],
    `worker/DEPLOY.md is stale: the naive split loads ${loaded} of ${items.length} items ` +
    `and fails ${failed} of ${chunks.length} chunks`,
  )
})

// --- the CLI: the orphan-topic guard ---------------------------------------
//
// `node tools/build/to-sql.js` is what actually writes worker/seed.sql, and its
// orphan check is the last thing standing between a malformed content set and a
// seed that ships. An item whose topic has no row would be invisible to every
// per-unit floor, so it must be fatal — and that has to be verified, not
// assumed, because the guard lives in main(), which nothing else exercises.

const CLI = join(ROOT, 'tools', 'build', 'to-sql.js')
const MINIMAL_SCHEMA = 'CREATE TABLE IF NOT EXISTS items (id TEXT PRIMARY KEY);'

/** Run the real CLI in a throwaway tree, so main() is exercised end to end. */
function runCli({ items, topics, teaching = [], schema = MINIMAL_SCHEMA }) {
  const dir = mkdtempSync(join(tmpdir(), 'to-sql-cli-'))
  mkdirSync(join(dir, 'content'))
  mkdirSync(join(dir, 'worker'))
  writeFileSync(join(dir, 'content', 'items.json'), JSON.stringify(items))
  writeFileSync(join(dir, 'content', 'topics.json'), JSON.stringify(topics))
  writeFileSync(join(dir, 'content', 'teaching.json'), JSON.stringify(teaching))
  writeFileSync(join(dir, 'worker', 'schema.sql'), schema)
  const out = join(dir, 'worker', 'seed.sql')
  const run = spawnSync(process.execPath, [CLI], { cwd: dir, encoding: 'utf8' })
  return {
    status: run.status,
    stdout: run.stdout,
    stderr: run.stderr,
    wrote: existsSync(out),
    seed: existsSync(out) ? readFileSync(out, 'utf8') : null,
  }
}

test('the CLI writes the seed and reports its size in BYTES', () => {
  const run = runCli({
    // A multi-byte character, so bytes and code units genuinely differ.
    items: [{ id: 'x', subject: 's', topic: 't', kind: 'mcq', stem: 'π ≈ 3.14159', answer: 'A' }],
    topics: [{ id: 't', subject: 's', unit: '1' }],
  })
  assert.equal(run.status, 0, run.stderr)
  assert.ok(run.wrote, 'a valid content set must produce worker/seed.sql')
  assert.match(run.seed, /INSERT OR REPLACE INTO items/)

  const m = run.stdout.match(/size:\s+(\d+) bytes UTF-8/)
  assert.ok(m, `expected a byte count in the output, got:\n${run.stdout}`)
  assert.equal(Number(m[1]), Buffer.byteLength(run.seed), 'the reported size must be the file size in bytes')
  assert.notEqual(Number(m[1]), run.seed.length, 'UTF-16 code units are not bytes')
  assert.match(run.stdout, /largest statement: \d+ bytes = [\d.]+% of D1's 100000-byte limit/)
})

test('the CLI refuses to write a seed when an item points at a topic with no row', () => {
  const run = runCli({
    items: [
      { id: 'ok', subject: 's', topic: 't', kind: 'mcq', stem: 'q', answer: 'A' },
      { id: 'orphan-a', subject: 's', topic: 'nope', kind: 'mcq', stem: 'q', answer: 'A' },
      // Subject-aware: this topic id exists, but under a different subject.
      { id: 'orphan-b', subject: 'other', topic: 't', kind: 'mcq', stem: 'q', answer: 'A' },
    ],
    topics: [{ id: 't', subject: 's', unit: '1' }],
  })
  assert.equal(run.status, 1, 'an orphaned item must be fatal, not a NULL unit')
  assert.equal(run.wrote, false, 'nothing may be written when the guard fires')
  assert.match(run.stderr, /2 item\(s\) reference a topic with no row/)
  assert.match(run.stderr, /orphan-a -> topic nope/)
  assert.match(run.stderr, /orphan-b -> topic t/)
  assert.doesNotMatch(run.stderr, /\bok -> topic\b/)
})

test('the CLI says how many orphans it did not list', () => {
  const run = runCli({
    items: Array.from({ length: 15 }, (_, i) => ({ id: `orphan-${i}`, subject: 's', topic: `missing-${i}`, kind: 'mcq', stem: 'q', answer: 'A' })),
    topics: [{ id: 't', subject: 's', unit: '1' }],
  })
  assert.equal(run.status, 1)
  assert.match(run.stderr, /15 item\(s\) reference a topic with no row/)
  // Ten listed, and the count of the rest — a truncated list with no marker
  // reads as the complete list.
  assert.equal((run.stderr.match(/-> topic missing-/g) ?? []).length, 10)
  assert.match(run.stderr, /\.\.\.and 5 more/)
})

test('the CLI refuses to write a seed carrying a statement D1 would reject', () => {
  const run = runCli({
    items: [{ id: 'big', subject: 's', topic: 't', kind: 'mcq', stem: 'x'.repeat(120_000), answer: 'A' }],
    topics: [{ id: 't', subject: 's', unit: '1' }],
  })
  assert.equal(run.status, 1, 'an over-limit statement must be fatal before the file is written')
  assert.equal(run.wrote, false, 'a seed that cannot finish loading must not be written')
  assert.match(run.stderr, /exceed D1's documented 100000-byte limit/)
  assert.match(run.stderr, /developers\.cloudflare\.com\/d1\/platform\/limits/)
  assert.match(run.stderr, /statement \d+: \d+ bytes/)
})
