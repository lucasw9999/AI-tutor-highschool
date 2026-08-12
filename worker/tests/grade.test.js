import { test } from 'node:test'
import assert from 'node:assert/strict'
import { grade, normalizeChoice, normalizeShort, asNumber, isBlank } from '../src/grade.js'

const MCQ = { kind: 'mcq', answer: 'B', options: { A: 'x', B: 'y', C: 'z', D: 'w' } }

test('choice normalization accepts what a student actually types', () => {
  for (const raw of ['B', 'b', '(B)', 'B)', ' b. ', 'answer: B', 'I think B']) {
    assert.equal(normalizeChoice(raw), 'B', `failed on ${JSON.stringify(raw)}`)
  }
  assert.equal(normalizeChoice(null), null)
  assert.equal(normalizeChoice('none of these'), null, 'prose with no letter is not a choice')
})

test('a letter buried in a word is not a choice', () => {
  // \b anchors prevent 'Because...' from reading as 'B'.
  assert.equal(normalizeChoice('Because it loops'), null)
})

test('MCQ grading is exact and server-owned', async (t) => {
  await t.test('correct answer', () => {
    const r = grade(MCQ, 'b')
    assert.equal(r.correct, 1)
    assert.equal(r.graded_by, 'server')
    assert.equal(r.keyed, 'B')
  })

  await t.test('wrong answer records what was picked', () => {
    const r = grade(MCQ, 'D')
    assert.equal(r.correct, 0)
    assert.equal(r.picked, 'D')
    assert.equal(r.keyed, 'B')
  })

  await t.test('blank is wrong but flagged as blank, not as a wrong pick', () => {
    const r = grade(MCQ, '   ')
    assert.equal(r.correct, 0)
    assert.equal(r.blank, true)
    assert.equal(r.detail, 'blank')
  })

  await t.test('unparseable prose is wrong but distinguishable from a blank', () => {
    const r = grade(MCQ, 'not sure honestly')
    assert.equal(r.correct, 0)
    assert.equal(r.blank, false)
    assert.equal(r.detail, 'no_letter')
  })
})

test('REGRESSION: surrounding whitespace must not cause a false negative', () => {
  // normalizeShort once trimmed last, so its ^-anchored prefix strip and
  // $-anchored period strip both missed when the student typed padding.
  // ' x = 4. ' became 'x=4.' and was marked wrong against a key of '4'.
  const item = { kind: 'constructed', answer: '4' }
  for (const raw of [' x = 4. ', '  X = 4  ', '\tx=4\n', ' 4. ', '$x = 4$']) {
    assert.equal(grade(item, raw).correct, 1, `marked wrong: ${JSON.stringify(raw)}`)
  }
  assert.equal(normalizeShort(' y = 2x+1 '), '2x+1')
})

test('short-answer normalization strips student decoration', () => {
  assert.equal(normalizeShort('$x = 4$'), '4')
  assert.equal(normalizeShort('  X  =  4. '), '4')
  assert.equal(normalizeShort('ln 3'), 'ln 3')
  assert.equal(normalizeShort('y = 2x - 1'), '2x-1')
  assert.equal(normalizeShort('f(x) = 2x + 1'), '2x+1')
})

test('numeric parsing rejects non-numbers instead of coercing them', () => {
  assert.equal(asNumber('4'), 4)
  assert.equal(asNumber('-1.273'), -1.273)
  assert.equal(asNumber('1,140'), 1140)
  assert.equal(asNumber('4x'), null, 'must not silently become 4')
  assert.equal(asNumber(''), null)
  assert.equal(asNumber('ln 3'), null)
})

test('constructed answers accept documented variants', () => {
  const item = { kind: 'constructed', answer: 'y = 2x + 1', answer_variants: ['2x+1', 'y=2x+1'] }
  for (const raw of ['y = 2x + 1', '2x+1', 'Y=2X+1', ' y = 2x+1 ']) {
    assert.equal(grade(item, raw).correct, 1, `failed on ${JSON.stringify(raw)}`)
  }
  assert.equal(grade(item, 'y = 2x - 1').correct, 0)
})

test('numeric tolerance is opt-in per item, never a default', async (t) => {
  await t.test('within tolerance passes when the item declares one', () => {
    const item = { kind: 'constructed', answer: '12.387', tolerance: 0.001 }
    assert.equal(grade(item, '12.387').correct, 1)
    assert.equal(grade(item, '12.3875').correct, 1)
    assert.equal(grade(item, '12.39').correct, 0, 'outside the declared tolerance')
  })

  await t.test('without a declared tolerance, only exact numeric agreement passes', () => {
    const item = { kind: 'constructed', answer: '4' }
    assert.equal(grade(item, '4').correct, 1)
    assert.equal(grade(item, '4.0').correct, 1, '4.0 equals 4 numerically')
    assert.equal(grade(item, '4.1').correct, 0)
  })
})

test('FRQs are never graded here, and are marked as model-graded', () => {
  const r = grade({ kind: 'frq', rubric: [] }, 'a long written response')
  assert.equal(r.graded_by, 'model')
  assert.equal(r.correct, 0, 'the server asserts nothing about an FRQ')
  assert.equal(r.detail, 'rubric')
})

test('an empty FRQ is still recorded as blank', () => {
  assert.equal(grade({ kind: 'frq' }, '').blank, true)
})

test('isBlank treats whitespace as unanswered', () => {
  assert.equal(isBlank('  \n '), true)
  assert.equal(isBlank('0'), false, 'zero is an answer')
})
