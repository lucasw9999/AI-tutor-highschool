import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { buildTeaching } from '../parse-teaching.js'
import { parseTopics } from '../parse-topics.js'
import { parseMcqFile, MCQ_FILES } from '../parse-mcq.js'
import { buildLesson } from '../../../worker/src/teaching.js'

// --- K1: `common_mistake` must never be a fabricated second item explanation ---
//
// CSA has no "#1 mistake" label anywhere in topic-coverage-matrix.md (unlike the
// Precalc study packs, which genuinely have one — see parse-precalc-topics.js).
// The old code took the SECOND item explanation on a topic and called it a
// "common mistake". It is not a description of a mistake at all — it is just
// another question's answer key rationale, and gpt-instructions.md tells the
// model to present it to the student as "the trap". That is a fabrication.

const TOPICS = [
  { id: '1.1', subject: 'ap_csa', ek: 'Types of errors' },
  { id: '1.2', subject: 'ap_csa', ek: 'Primitive types' },
]

// Two items on the SAME topic, each with its own unrelated explanation — mirrors
// the real bank, where csa-u1-q1 and csa-u1-q2 both target topic 1.1 but explain
// two different questions.
const ITEMS = [
  { id: 'csa-u1-q1', topic: '1.1', explanation: 'Explanation for question 1, about logic errors.' },
  { id: 'csa-u1-q2', topic: '1.1', explanation: 'Explanation for question 2, about syntax errors.' },
]

test('common_mistake is never fabricated from a second item explanation', () => {
  const e = buildTeaching(TOPICS, ITEMS).entries.find((x) => x.topic === '1.1')
  // worked_example legitimately borrows the first item's explanation — that is
  // CSA's documented design, since there is no separate worked-example source.
  assert.equal(e.worked_example, ITEMS[0].explanation)
  // common_mistake has NO genuine source for CSA. It must not silently become
  // some OTHER item's unrelated explanation.
  assert.notEqual(e.common_mistake, ITEMS[1].explanation)
  assert.equal(e.common_mistake, null)
})

test('completeness does not require a common_mistake (CSA has no genuine source for one)', () => {
  const e = buildTeaching(TOPICS, ITEMS).entries.find((x) => x.topic === '1.1')
  assert.equal(e.complete, true, 'plain_idea + worked_example is still a usable, honest lesson')
})

test('a topic with only one explanation still gets an honest (null) common_mistake', () => {
  const oneItem = [ITEMS[0]]
  const e = buildTeaching(TOPICS, oneItem).entries.find((x) => x.topic === '1.1')
  assert.equal(e.worked_example, ITEMS[0].explanation)
  assert.equal(e.common_mistake, null)
})

// --- K1, real data: run the actual parser over the real CSA source files ---
//
// Regression guard tied to the real content, not just a synthetic fixture: no
// topic's common_mistake may equal some OTHER item's explanation on that topic.

test('real CSA content: common_mistake is never another item explanation, for every topic', () => {
  const read = (f) => readFileSync(f, 'utf8')
  const topics = parseTopics(read('ap_csa/ap_csa_exam/topic-coverage-matrix.md'))
  const items = MCQ_FILES.flatMap((f) =>
    parseMcqFile(read(`ap_csa/ap_csa_exam/question-bank/${f}`), f),
  )
  const { entries } = buildTeaching(topics, items)
  assert.ok(entries.length > 0, 'precondition: real topics must have loaded')

  const explanationsByTopic = new Map()
  for (const it of items) {
    if (!it.explanation) continue
    if (!explanationsByTopic.has(it.topic)) explanationsByTopic.set(it.topic, new Set())
    explanationsByTopic.get(it.topic).add(it.explanation)
  }

  for (const e of entries) {
    if (e.common_mistake == null) continue
    const topicExplanations = explanationsByTopic.get(e.topic) ?? new Set()
    assert.ok(
      !topicExplanations.has(e.common_mistake),
      `topic ${e.topic}: common_mistake is verbatim one of its items' explanations — fabricated, not a real mistake`,
    )
  }
})

// --- K3: buildLesson must not treat an all-null teaching row as present ---
//
// worker/src/teaching.js's buildLesson only guarded against a MISSING row
// (`teaching.get(topic)` returning undefined). A row that EXISTS but whose
// plain_idea, worked_example and common_mistake are all null still passed the
// `if (!t) return null` check, so the caller got back a truthy "lesson" with
// nothing in it — the "no teaching material" safeguard never fired.
// ap_precalc:1.11 is exactly this row in the shipped content.

test('buildLesson returns null for a teaching row whose content fields are all null', () => {
  const teaching = new Map([
    ['1.11', { plain_idea: null, worked_example: null, common_mistake: null }],
  ])
  const lesson = buildLesson({ topic: '1.11', teaching, gap: { distinct_misses: 2 } })
  assert.equal(lesson, null, 'an all-null row must be treated as absent, same as a missing row')
})

test('buildLesson still returns null when the teaching row is entirely missing (existing guarantee)', () => {
  assert.equal(buildLesson({ topic: 'nope', teaching: new Map(), gap: {} }), null)
})

test('buildLesson still returns a usable lesson for a partially-filled row', () => {
  // A row with an idea and a trap but no worked example must NOT be discarded —
  // losing real material would be its own defect.
  const teaching = new Map([
    ['1.10', { plain_idea: 'idea only', worked_example: null, common_mistake: 'trap only' }],
  ])
  const lesson = buildLesson({ topic: '1.10', teaching, gap: { distinct_misses: 2 } })
  assert.ok(lesson, 'a row with SOME content must still produce a lesson')
  assert.equal(lesson.plain_idea, 'idea only')
  assert.equal(lesson.worked_example, null)
  assert.equal(lesson.common_mistake, 'trap only')
})

test('buildLesson still returns a full lesson when every field is present (existing guarantee)', () => {
  const teaching = new Map([
    ['a', { plain_idea: 'idea', worked_example: 'example', common_mistake: 'trap' }],
  ])
  const lesson = buildLesson({ topic: 'a', teaching, gap: { distinct_misses: 3 } })
  assert.equal(lesson.plain_idea, 'idea')
  assert.equal(lesson.worked_example, 'example')
  assert.equal(lesson.common_mistake, 'trap')
  assert.match(lesson.why_now, /3 different questions/)
})
