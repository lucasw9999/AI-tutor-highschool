import { test } from 'node:test'
import assert from 'node:assert/strict'
import { parseOptions, parseBlock, parseMcqFile } from '../parse-mcq.js'

const BLOCK = [
  '**Q7. (Analyze Code · 1.5 cast truncates)**',
  'What is printed?',
  '```java',
  'double d = 9.99;',
  'System.out.println((int) d);',
  '```',
  'A) `10`   B) `9`   C) `9.99`   D) `9.0`',
  '',
  '**Answer: B.** `(int)` truncates toward zero: `9.99 → 9`.',
  '`[topic 1.5][practice P3]`',
].join('\n')

test('parseOptions splits four options and strips backticks', () => {
  const o = parseOptions('A) `10`   B) `9`   C) `9.99`   D) `9.0`')
  assert.deepEqual(o, { A: '10', B: '9', C: '9.99', D: '9.0' })
})

test('parseOptions handles prose options containing periods', () => {
  const o = parseOptions(
    'A) `0`   B) `8`   C) The program throws an `ArithmeticException`.   D) It prints `Infinity`.',
  )
  assert.equal(o.C, 'The program throws an `ArithmeticException`.')
  assert.equal(o.D, 'It prints `Infinity`.')
})

test('parseOptions returns null when an option is missing', () => {
  assert.equal(parseOptions('A) one   B) two   C) three'), null)
})

test('parseBlock extracts every field', () => {
  const it = parseBlock(BLOCK, 'ac')
  assert.equal(it.id, 'csa-ac-q7')
  assert.equal(it.subject, 'ap_csa')
  assert.equal(it.number, 7)
  assert.equal(it.kind, 'mcq')
  assert.equal(it.answer, 'B')
  assert.equal(it.topic, '1.5')
  assert.equal(it.practice, 'P3')
  assert.match(it.stem, /What is printed\?/)
  assert.match(it.stem, /double d = 9\.99;/)
  assert.equal(it.options.B, '9')
  assert.match(it.explanation, /truncates toward zero/)
  assert.equal(it.allowOffSyllabus, false)
})

test('parseBlock returns null for non-question blocks', () => {
  assert.equal(parseBlock('## Some heading\n\nProse here.', 'ac'), null)
})

test('parseBlock handles a label containing parentheses', () => {
  const b = BLOCK.replace('1.5 cast truncates', '1.6 post-increment (x++) semantics')
  assert.equal(parseBlock(b, 'ac').label, 'Analyze Code · 1.6 post-increment (x++) semantics')
})

test('parseBlock detects the off-syllabus allowance tag', () => {
  const b = BLOCK.replace('[practice P3]`', '[practice P3][allow-offsyllabus]`')
  assert.equal(parseBlock(b, 'ac').allowOffSyllabus, true)
})

test('parseMcqFile splits on --- and skips prose', () => {
  const text = `# Header\n\nIntro prose.\n\n---\n\n${BLOCK}\n\n---\n\n${BLOCK.replace('Q7', 'Q8')}\n`
  const items = parseMcqFile(text, 'mcq-analyze-code.md')
  assert.equal(items.length, 2)
  assert.deepEqual(
    items.map((i) => i.id),
    ['csa-ac-q7', 'csa-ac-q8'],
  )
})

test('parseMcqFile rejects an unknown filename', () => {
  assert.throws(() => parseMcqFile('', 'mcq-unit-9.md'), /unknown MCQ file/)
})
