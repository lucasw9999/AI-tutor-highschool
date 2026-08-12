import { test } from 'node:test'
import assert from 'node:assert/strict'
import { validate } from '../validate.js'
import { buildTeaching } from '../parse-teaching.js'

const TOPICS = [
  { id: '1.3', subject: 'ap_csa', unit: '1', ek: 'Integer division truncates' },
  { id: '1.5', subject: 'ap_csa', unit: '1', ek: 'Casting' },
]

function item(over = {}) {
  return {
    id: 'csa-ac-q1',
    subject: 'ap_csa',
    kind: 'mcq',
    stem: 'What is printed?',
    options: { A: '1', B: '2', C: '3', D: '4' },
    answer: 'C',
    explanation: 'because',
    topic: '1.3',
    practice: 'P3',
    allowOffSyllabus: false,
    ...over,
  }
}

test('a clean item produces no errors', () => {
  assert.deepEqual(validate([item()], TOPICS).errors, [])
})

test('missing tags are errors', () => {
  const { errors } = validate([item({ topic: null, practice: null })], TOPICS)
  assert.equal(errors.filter((e) => /missing topic/.test(e)).length, 1)
  assert.equal(errors.filter((e) => /missing practice/.test(e)).length, 1)
})

test('unparsed options are an error', () => {
  assert.match(validate([item({ options: null })], TOPICS).errors.join('|'), /could not parse options/)
})

test('an answer key outside the options is an error', () => {
  assert.match(
    validate([item({ answer: 'E' })], TOPICS).errors.join('|'),
    /answer key E is not one of the options/,
  )
})

test('an unknown topic is an error', () => {
  assert.match(
    validate([item({ topic: '9.9' })], TOPICS).errors.join('|'),
    /topic 9\.9 is not in the coverage matrix/,
  )
})

test('an empty stem is an error', () => {
  assert.match(validate([item({ stem: '   ' })], TOPICS).errors.join('|'), /empty stem/)
})

test('off-syllabus constructs in the stem are errors', () => {
  assert.match(
    validate([item({ stem: 'String s = "x"; s.charAt(0);' })], TOPICS).errors.join('|'),
    /off-syllabus/,
  )
})

test('off-syllabus in options is an error too', () => {
  assert.match(
    validate([item({ options: { A: 'new HashMap<>()', B: 'b', C: 'c', D: 'd' } })], TOPICS).errors.join('|'),
    /off-syllabus/,
  )
})

test('explanations may discuss banned constructs', () => {
  assert.deepEqual(
    validate([item({ explanation: 'charAt is not on the Quick Reference' })], TOPICS).errors,
    [],
  )
})

test('allow-offsyllabus suppresses the check for that item', () => {
  assert.deepEqual(
    validate([item({ stem: 'Which returns one character? s.charAt(0)', allowOffSyllabus: true })], TOPICS)
      .errors,
    [],
  )
})

test('skewed answer distribution is a warning, not an error', () => {
  const items = Array.from({ length: 25 }, (_, n) => item({ id: `q${n}`, answer: 'A' }))
  const { errors, warnings } = validate(items, TOPICS)
  assert.deepEqual(errors, [])
  assert.match(warnings.join('|'), /answer A/)
})

test('a topic with no items is a warning', () => {
  assert.match(validate([item()], TOPICS).warnings.join('|'), /topic 1\.5 has no items/)
})

test('duplicate item ids are an error', () => {
  assert.match(validate([item(), item()], TOPICS).errors.join('|'), /duplicate item id/)
})

// --- teaching ---

const T_ITEMS = [
  { id: 'a', topic: '1.3', explanation: '17/5 is 3 because integer division drops the remainder.' },
  { id: 'b', topic: '1.3', explanation: 'Multiplication binds before addition.' },
  { id: 'c', topic: '1.5', explanation: null },
]

test('buildTeaching uses the EK as plain_idea and explanations for example and trap', () => {
  const e = buildTeaching(TOPICS, T_ITEMS).entries.find((x) => x.topic === '1.3')
  assert.equal(e.plain_idea, 'Integer division truncates')
  assert.equal(e.worked_example, '17/5 is 3 because integer division drops the remainder.')
  assert.equal(e.common_mistake, 'Multiplication binds before addition.')
  assert.equal(e.complete, true)
})

test('buildTeaching flags topics with no usable explanations as gaps', () => {
  const { entries, gaps } = buildTeaching(TOPICS, T_ITEMS)
  const e = entries.find((x) => x.topic === '1.5')
  assert.equal(e.worked_example, null)
  assert.equal(e.complete, false)
  assert.deepEqual(gaps, ['1.5'])
})

test('buildTeaching returns one entry per topic', () => {
  assert.equal(buildTeaching(TOPICS, T_ITEMS).entries.length, 2)
})
