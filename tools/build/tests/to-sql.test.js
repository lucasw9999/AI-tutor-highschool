import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { lit, unitIndex, itemRows, topicRows, buildSql } from '../to-sql.js'

// --- Evidence-table guard --------------------------------------------------
//
// Reloading content must never write to attempts/serves/mocks/gaps, and must
// never run a DROP/ALTER/TRUNCATE. A plain substring/regex search over the
// generated SQL text is too coarse for this: ordinary English words like
// "attempts", or a stem that asks "What does a DROP TABLE statement do?",
// live inside quoted string literals and would trip a text search despite
// writing nothing. Instead we split the SQL into individual statements
// (quote-aware, so neither a semicolon nor a keyword embedded inside a
// string literal can fool the split) and look only at each statement's head
// — its verb and target table — never at the values it carries.

/** Split SQL into statements on a top-level `;`, treating anything inside a
 * single-quoted literal (where `''` is an escaped quote) as opaque. */
function splitStatements(sql) {
  const statements = []
  let current = ''
  let inString = false
  for (let i = 0; i < sql.length; i++) {
    const c = sql[i]
    current += c
    if (inString) {
      if (c === "'") {
        if (sql[i + 1] === "'") current += sql[++i] // escaped quote: stays inside the literal
        else inString = false
      }
      continue
    }
    if (c === "'") inString = true
    else if (c === ';') { statements.push(current); current = '' }
  }
  if (current.trim()) statements.push(current)
  return statements
}

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
  for (const statement of splitStatements(sql)) {
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
