import { test } from 'node:test'
import assert from 'node:assert/strict'
import { parseTopics, splitRow } from '../parse-topics.js'

const DOC = [
  '### Unit 1 — Using Objects & Methods (15–25% of MCQ) · 15 topics',
  '',
  '| Topic | Key Testable EK | Bank Item(s) |',
  '|---|---|---|',
  '| **1.1** Algorithms, Compilers & Error Types | Syntax, logic, run-time, exception | `question-bank/mcq-unit-1.md` |',
  '| **1.3** Arithmetic, Operators & Expressions | Integer division truncates | `question-bank/mcq-unit-1.md`, `question-bank/mcq-analyze-code.md` |',
  '',
  '### Unit 4 — Data Collections (30–40% of MCQ) · 17 topics',
  '',
  '| Topic | Key Testable EK | Bank Item(s) |',
  '|---|---|---|',
  '| **4.12** Nested Traversal | Row-major and column-major | `question-bank/mcq-unit-4.md` |',
].join('\n')

test('parseTopics reads id, name, EK and unit', () => {
  const t = parseTopics(DOC)
  assert.equal(t.length, 3)
  assert.equal(t[0].id, '1.1')
  assert.equal(t[0].unit, '1')
  assert.equal(t[0].name, 'Algorithms, Compilers & Error Types')
  assert.equal(t[0].ek, 'Syntax, logic, run-time, exception')
  assert.equal(t[0].subject, 'ap_csa')
  assert.equal(t[0].tested_on_exam, true)
  assert.equal(t[0].malformed, false)
})

test('parseTopics carries the unit weight range onto each topic', () => {
  const t = parseTopics(DOC)
  assert.equal(t[0].exam_weight_low, 15)
  assert.equal(t[0].exam_weight_high, 25)
  assert.equal(t[2].unit, '4')
  assert.equal(t[2].exam_weight_low, 30)
  assert.equal(t[2].exam_weight_high, 40)
})

test('parseTopics ignores header and separator rows', () => {
  assert.equal(parseTopics('| Topic | Key Testable EK | Bank Item(s) |\n|---|---|---|').length, 0)
})

// --- pipe handling: this is the bug that silently truncated topic 2.6 ---

test('splitRow treats an escaped pipe as content, not a separator', () => {
  assert.deepEqual(splitRow('| a | b \\| c | d |'), ['', ' a ', ' b | c ', ' d ', ''])
})

test('parseTopics keeps a full EK containing escaped pipes', () => {
  const doc = [
    '### Unit 2 — Selection & Iteration (25–35% of MCQ) · 12 topics',
    '| **2.6** De Morgan | Truth tables; `!(A&&B)` = `(!A\\|\\|!B)`; `==` compares references | `question-bank/mcq-unit-2.md` |',
  ].join('\n')
  const t = parseTopics(doc)
  assert.equal(t.length, 1)
  assert.equal(t[0].malformed, false)
  assert.match(t[0].ek, /compares references/) // would be truncated by a naive [^|]* capture
  assert.match(t[0].ek, /\(!A\|\|!B\)/)
})

test('parseTopics flags a row with UNescaped pipes as malformed', () => {
  const doc = [
    '### Unit 2 — Selection & Iteration (25–35% of MCQ) · 12 topics',
    '| **2.5** `!` `&&` `||`, Precedence | Logical NOT/AND/OR | `question-bank/mcq-unit-2.md` |',
  ].join('\n')
  const t = parseTopics(doc)
  assert.equal(t[0].malformed, true)
  assert.ok(t[0].cell_count > 3)
})
