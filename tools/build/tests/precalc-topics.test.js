import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { sections, labelled, parsePack, parseAll, PACKS } from '../parse-precalc-topics.js'
import { compile, summary } from '../build.js'

const read = (f) => readFileSync(f, 'utf8')

test('all four heading conventions are recognised', () => {
  const text = [
    '### 2.1 Numbered section',
    'body one',
    '### 2.2b Lettered-suffix section',
    'body two',
    '### A. Capital-letter section',
    'body three',
  ].join('\n')
  const found = sections(text)
  assert.deepEqual(found.map((s) => s.label), ['2.1', '2.2b', 'A'])
  assert.deepEqual(found.map((s) => s.title), [
    'Numbered section', 'Lettered-suffix section', 'Capital-letter section',
  ])
})

test('both idea labels are accepted: units 1/2/4 differ from unit 3', () => {
  assert.equal(labelled('**Plain language:** the idea', ['Plain language', 'Plain idea']), 'the idea')
  assert.equal(labelled('**Plain idea:** the idea', ['Plain language', 'Plain idea']), 'the idea')
})

test('a label with a parenthetical or em-dash suffix still matches', () => {
  assert.equal(labelled('**#1 mistake (HUGE on the exam):** the trap', ['#1 mistake']), 'the trap')
  assert.equal(labelled('**Worked example — sec(π/3):** the work', ['Worked example']), 'the work')
})

test('REGRESSION: a multi-line field is captured whole, not cut at the first newline', () => {
  // The lookahead once used `$` under the /m flag, which matches every line
  // ending — so every worked example lost its solution and kept only the prompt.
  const body = [
    '**Worked example:** find the AROC on [1, 4].',
    '$\\dfrac{16-1}{3}=5.$',
    'and one more line',
    '',
    '**#1 mistake:** flipping the order',
  ].join('\n')
  const got = labelled(body, ['Worked example'])
  assert.match(got, /find the AROC/)
  assert.match(got, /=5/, 'the solution line must be included')
  assert.match(got, /one more line/)
  assert.ok(!got.includes('flipping'), 'must still stop at the next bold label')
})

test('a field stops at a heading or a horizontal rule', () => {
  assert.equal(labelled('**Plain idea:** keep\n### 2.2 Next', ['Plain idea']), 'keep')
  assert.equal(labelled('**Plain idea:** keep\n---\nafter', ['Plain idea']), 'keep')
})

test('topic ids are namespaced by unit so packs cannot collide', () => {
  // Unit 1 and unit 3 both label their first concept '2.1'.
  const text = '### 2.1 First concept\n**Plain idea:** x'
  const u1 = parsePack({ text, unit: '1', tested: true, file: 'a.md' })
  const u3 = parsePack({ text, unit: '3', tested: true, file: 'b.md' })
  assert.equal(u1.topics[0].id, '1.1')
  assert.equal(u3.topics[0].id, '3.1')
  assert.notEqual(u1.topics[0].id, u3.topics[0].id)
  assert.equal(u1.topics[0].source_label, '2.1', 'the pack label is kept for traceability')
})

test('an incomplete section is reported rather than silently emitted as complete', () => {
  const text = '### 2.1 Something\n**Plain idea:** only the idea'
  const r = parsePack({ text, unit: '1', tested: true, file: 'a.md' })
  assert.equal(r.teaching[0].complete, false)
  assert.deepEqual(r.incomplete[0].missing, ['worked_example', 'common_mistake'])
})

test('a pack yielding zero sections is a hard error, never a silent zero', () => {
  const r = parseAll((f) => (f.includes('unit-1') ? 'no headings at all' : read(f)))
  assert.ok(r.errors.some((e) => /unit-1/.test(e) && /no concept sections/.test(e)))
})

// --- against the real packs ------------------------------------------------

test('the real packs parse to 11 sections each, across all four units', () => {
  const r = parseAll(read)
  assert.deepEqual(r.perUnit, { 1: 11, 2: 11, 3: 11, 4: 11 })
  assert.equal(r.topics.length, 44)
  assert.deepEqual(r.errors, [])
})

test('Unit 4 is marked untested and every other unit is tested', () => {
  const r = parseAll(read)
  for (const t of r.topics) {
    assert.equal(t.tested_on_exam, t.unit !== '4', `unit ${t.unit} tested flag is wrong`)
  }
  assert.equal(PACKS.find((p) => p.unit === '4').tested, false)
})

test('real worked examples are substantial, proving the truncation fix holds', () => {
  const r = parseAll(read)
  const withExample = r.teaching.filter((t) => t.worked_example)
  const mean = withExample.reduce((s, t) => s + t.worked_example.length, 0) / withExample.length
  assert.ok(mean > 80, `mean worked_example length ${mean.toFixed(0)} chars suggests truncation`)
  // The AROC example must include its arithmetic, not just the prompt.
  const aroc = r.teaching.find((t) => t.topic === '1.1')
  assert.match(aroc.worked_example, /5/, 'the computed answer must survive')
  assert.ok(aroc.worked_example.includes('\n'), 'a two-line example must keep both lines')
})

// --- build-level guarantees -----------------------------------------------

test('the build reports both subjects, and neither has zero topics', () => {
  const r = compile()
  assert.deepEqual(r.errors, [])
  const rows = summary(r)
  for (const [subject, counts] of Object.entries(rows)) {
    assert.ok(counts.topics > 0, `${subject} has no topics`)
    assert.ok(counts.items > 0, `${subject} has no items`)
  }
})

test('an empty subject is a build ERROR, so it can never hide behind a total', () => {
  // Feed an empty coverage matrix: CSA topics vanish and the build must object.
  const r = compile((f) => (f.includes('topic-coverage-matrix') ? '# empty\n' : read(f)))
  assert.ok(
    r.errors.some((e) => /ap_csa has no topics/.test(e)),
    `expected a missing-subject error, got: ${JSON.stringify(r.errors.slice(0, 3))}`,
  )
})

test('untagged precalc items are bucketed explicitly, not given a guessed topic', () => {
  const r = compile()
  const buckets = r.topics.filter((t) => t.untagged_bucket)
  assert.ok(buckets.length > 0)
  for (const b of buckets) {
    assert.match(b.id, /\.0$/)
    assert.match(b.ek, /Placeholder/)
  }
  // Every precalc item points at a real topic row.
  const ids = new Set(r.topics.filter((t) => t.subject === 'ap_precalc').map((t) => t.id))
  for (const it of r.items.filter((i) => i.subject === 'ap_precalc')) {
    assert.ok(ids.has(it.topic), `item ${it.id} points at unknown topic ${it.topic}`)
  }
})

test('the bucket for Unit 4 is excluded from exam coverage', () => {
  const r = compile()
  const u4 = r.topics.find((t) => t.untagged_bucket && t.unit === '4')
  if (u4) assert.equal(u4.tested_on_exam, false)
})
