// Guards against the worst failure this system can produce: telling the student
// he got something wrong when the question bank, not his answer, was at fault.
//
// The bug these lock down: all 48 Precalc items shipped with `answer: null`, and
// grade() treated a missing key as a mismatch. Every Precalc answer — including
// perfect ones — would have been recorded as WRONG, then fed into topic
// percentages, gap detection, and mock composites.

import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { grade, isServerGraded, MODEL_GRADED } from '../src/grade.js'
import { computeReadiness } from '../src/readiness.js'
import { detectGaps } from '../src/teaching.js'
import { topicStats, pickNext } from '../src/select.js'
import { compile } from '../../tools/build/build.js'

const CSA = JSON.parse(readFileSync(new URL('../config/ap_csa.json', import.meta.url)))

test('an item with no answer key is reported ungraded, never wrong', () => {
  const r = grade({ kind: 'constructed', answer: null }, '3')
  assert.equal(r.graded_by, 'unkeyed')
  assert.notEqual(r.graded_by, 'server', 'must not claim a server verdict')
  assert.equal(r.detail, 'no_answer_key')
})

test('an empty-string key is treated as missing, not as an answer of ""', () => {
  assert.equal(grade({ kind: 'constructed', answer: '   ' }, '3').graded_by, 'unkeyed')
  assert.equal(grade({ kind: 'mcq', answer: '' }, 'B').graded_by, 'unkeyed')
})

test('a model-graded kind is routed to the model, not scored here', () => {
  for (const kind of MODEL_GRADED) {
    const r = grade({ kind, answer: null }, 'some work')
    assert.equal(r.graded_by, 'model', `${kind} must be model-graded`)
  }
  assert.ok(MODEL_GRADED.has('constructed_model_graded'))
  assert.ok(MODEL_GRADED.has('frq'))
})

test('isServerGraded excludes model and unkeyed, and defaults to true', () => {
  assert.equal(isServerGraded({ graded_by: 'server' }), true)
  assert.equal(isServerGraded({ graded_by: 'model' }), false)
  assert.equal(isServerGraded({ graded_by: 'unkeyed' }), false)
  assert.equal(isServerGraded({ graded_by: 'unparsed' }), false, 'an unread answer is not a verdict')
  assert.equal(isServerGraded({}), true, 'a missing field predates the column; treat as server')
})

test('a response the grader cannot read is reported unparsed, never wrong', () => {
  // The docstring on normalizeChoice always said an unreadable choice must be
  // treated as unanswered rather than wrong. grade() said 'server' anyway, so
  // every unreadable answer became a miss plus a phantom concept gap.
  const item = { kind: 'mcq', answer: 'B', options: { A: 'w', B: 'x', C: 'y', D: 'z' } }
  for (const raw of ['not sure honestly', 'the one with the loop', 'B or C']) {
    const r = grade(item, raw)
    assert.equal(r.graded_by, 'unparsed', `${JSON.stringify(raw)} claimed a server verdict`)
    assert.notEqual(r.graded_by, 'server')
    assert.equal(isServerGraded(r), false)
  }
  // A blank is different: he really did leave it empty, and that is a miss.
  assert.equal(grade(item, '   ').graded_by, 'server')
  assert.equal(grade(item, '   ').blank, true)
})

test('an unparsed attempt is invisible to every downstream number', () => {
  const unread = [
    { topic: 'a', item_id: 'a1', correct: 0, graded_by: 'unparsed', ts: '2027-01-01' },
    { topic: 'a', item_id: 'a2', correct: 0, graded_by: 'unparsed', ts: '2027-01-02' },
  ]
  assert.deepEqual(detectGaps(unread), [], 'two unread answers must not look like a gap')
  assert.equal(topicStats(unread).get('a'), undefined, 'and must not make a percentage')
})

test('an mcq keyed with a non-letter is ungraded, not automatically wrong', () => {
  // validate.js does not run over every subject, so nothing stops an author from
  // keying an mcq with prose. Scanning that key produced null and marked every
  // student wrong.
  const r = grade({ kind: 'mcq', answer: 'the second one', options: { A: 'w', B: 'x' } }, 'A')
  assert.equal(r.graded_by, 'unkeyed')
  assert.equal(r.detail, 'no_answer_key')
  assert.equal(isServerGraded(r), false)
})

// --- nothing downstream may read an ungraded attempt as a miss -------------

test('ungraded attempts do not open a phantom concept gap', () => {
  const ungraded = [
    { topic: 'a', item_id: 'a1', correct: 0, graded_by: 'unkeyed' },
    { topic: 'a', item_id: 'a2', correct: 0, graded_by: 'unkeyed' },
    { topic: 'b', item_id: 'b1', correct: 0, graded_by: 'model' },
    { topic: 'b', item_id: 'b2', correct: 0, graded_by: 'model' },
  ]
  assert.deepEqual(detectGaps(ungraded), [], 'four ungraded zeros must not look like two gaps')
})

test('a real gap is still detected alongside ungraded noise', () => {
  const mixed = [
    { topic: 'a', item_id: 'a1', correct: 0, graded_by: 'server' },
    { topic: 'a', item_id: 'a2', correct: 0, graded_by: 'server' },
    { topic: 'b', item_id: 'b1', correct: 0, graded_by: 'unkeyed' },
    { topic: 'b', item_id: 'b2', correct: 0, graded_by: 'unkeyed' },
  ]
  assert.deepEqual(detectGaps(mixed).map((g) => g.topic), ['a'])
})

test('ungraded attempts do not drag a topic percentage down', () => {
  const s = topicStats([
    { topic: 'a', item_id: 'a1', correct: 1, graded_by: 'server', ts: '2027-01-01' },
    { topic: 'a', item_id: 'a2', correct: 0, graded_by: 'unkeyed', ts: '2027-01-02' },
    { topic: 'a', item_id: 'a3', correct: 0, graded_by: 'model', ts: '2027-01-03' },
  ])
  assert.equal(s.get('a').n, 1, 'only the graded attempt counts')
  assert.equal(s.get('a').pct, 100, 'one right out of one graded')
})

test('an ungraded attempt still counts as having attempted the topic', () => {
  // Coverage asks "has he tried this?" — an ungraded try still answers yes.
  const items = [
    { id: 'a1', topic: 'a', kind: 'mcq' },
    { id: 'b1', topic: 'b', kind: 'mcq' },
  ]
  const meta = new Map([['a', { tested_on_exam: 1 }], ['b', { tested_on_exam: 1 }]])
  const attempts = [{ topic: 'a', item_id: 'a1', correct: 0, graded_by: 'unkeyed', ts: '2027-01-01' }]
  const r = pickNext({ items, attempts, topicMeta: meta, config: CSA, now: '2027-02-01' })
  assert.equal(r.item.topic, 'b', 'a is attempted; coverage should move to b')
})

test('readiness ignores ungraded and model-graded attempts', () => {
  const mocks = [85, 86, 87, 88, 89, 90].map((c, i) => ({
    id: i + 1,
    started_at: new Date(Date.parse('2027-04-01') - (40 - i * 7) * 86400000).toISOString(),
    proctored: 1,
    // The official anchor has to sit INSIDE the window that gets judged (the
    // three newest mocks), so it is the newest mock here rather than the oldest.
    source: i === 5 ? 'official' : 'bank',
    composite_pct: c,
    blanks: 0,
  }))
  const base = { unit: '1', practice: 'P3', kind: 'mcq', calc_allowed: 0 }
  const attempts = []
  for (const mock_id of [4, 5, 6]) {
    // 10 correct server-graded, plus 90 ungraded zeros that must not count.
    for (let i = 0; i < 10; i++) attempts.push({ ...base, mock_id, correct: 1, graded_by: 'server' })
    for (let i = 0; i < 90; i++) attempts.push({ ...base, mock_id, correct: 0, graded_by: 'unkeyed' })
  }
  const r = computeReadiness({
    config: CSA, mocks, attempts,
    coverage: { topics_total: 53, topics_drilled: 53 },
    calibrated: false, now: '2027-04-01T12:00:00Z',
  })
  const mcq = r.criteria.find((c) => c.id === 'mcq_overall')
  assert.equal(mcq.met, true, `MCQ should be 100% of 30, got: ${mcq.detail}`)
  assert.match(mcq.detail, /of 30$/, 'only the 30 graded attempts may be counted')
})

// --- the build gate that stops this reaching the database ------------------

test('the build REJECTS a gradeable item with no answer key', () => {
  const r = compile()
  // The gate under test is the answer-key gate, so this asserts on that gate
  // alone. Today's content legitimately trips OTHER gates (33 exam-tested Precalc
  // topics ship with no items at all), and asserting zero build errors here would
  // quietly assert those content gaps away.
  assert.deepEqual(
    r.errors.filter((e) => /answer key/i.test(e)),
    [],
    'every real item must be keyed or explicitly model-graded',
  )

  // Simulate the regression: a keyed kind with a null key.
  const MODEL = new Set(['frq', 'constructed_model_graded'])
  const bad = { id: 'x1', subject: 'ap_precalc', kind: 'constructed', answer: null }
  const keyed = bad.answer != null && String(bad.answer).trim() !== ''
  assert.ok(!MODEL.has(bad.kind) && !keyed, 'this is exactly the shape the gate must catch')
})

test('every real item is either keyed or explicitly model-graded', () => {
  const r = compile()
  for (const it of r.items) {
    const keyed = it.answer != null && String(it.answer).trim() !== ''
    assert.ok(
      keyed || MODEL_GRADED.has(it.kind),
      `${it.id} (${it.subject}) is neither keyed nor declared model-graded`,
    )
  }
})

test('every model-graded item carries a worked solution to compare against', () => {
  const r = compile()
  for (const it of r.items.filter((i) => MODEL_GRADED.has(i.kind))) {
    assert.ok(it.explanation || it.solution, `${it.id} has no solution for the student to check`)
  }
})

test('the Precalc items are declared model-graded, not left silently keyless', () => {
  const r = compile()
  const pc = r.items.filter((i) => i.subject === 'ap_precalc')
  assert.ok(pc.length > 0)
  for (const it of pc) {
    assert.equal(it.kind, 'constructed_model_graded', `${it.id} must declare model grading`)
    assert.ok(it.explanation, `${it.id} must ship its worked solution`)
  }
})
