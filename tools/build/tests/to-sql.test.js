import { test } from 'node:test'
import assert from 'node:assert/strict'
import { lit, unitIndex, itemRows, topicRows, buildSql } from '../to-sql.js'

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
    items: [{ id: 'x', subject: 's', topic: 't', kind: 'mcq', stem: 'q', answer: 'A' }],
    topics: [{ id: 't', subject: 's', unit: '1' }],
    teaching: [{ topic: 't', subject: 's', plain_idea: 'i' }],
    schema: 'CREATE TABLE IF NOT EXISTS items (id TEXT PRIMARY KEY);',
  })
  assert.ok(sql.includes('INSERT OR REPLACE INTO items'))
  assert.ok(sql.includes('INSERT OR REPLACE INTO topics'))
  assert.ok(sql.includes('INSERT OR REPLACE INTO teaching'))
  for (const table of ['attempts', 'serves', 'mocks', 'gaps']) {
    assert.ok(!new RegExp(`(INSERT|UPDATE|DELETE)[^;]*\\b${table}\\b`).test(sql),
      `content reload must not write to ${table}`)
  }
  assert.ok(!/\bDROP\b/.test(sql), 'a reload must never drop anything')
})

test('large item sets are chunked into multiple statements', () => {
  const items = Array.from({ length: 95 }, (_, i) => ({ id: `i${i}`, subject: 's', topic: 't', kind: 'mcq', stem: 'q', answer: 'A' }))
  const sql = buildSql({ items, topics: [{ id: 't', subject: 's', unit: '1' }], teaching: [], schema: '' })
  const inserts = (sql.match(/INSERT OR REPLACE INTO items/g) ?? []).length
  assert.equal(inserts, 3, '95 rows at 40 per statement')
})
