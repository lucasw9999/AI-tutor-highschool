import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { sections, labelled, parsePack, parseAll, PACKS } from '../parse-precalc-topics.js'
import { parseAll as parsePrecalcItems } from '../parse-precalc.js'
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

test('PC5 REGRESSION: no section with a Worked example line ends up with a null field, and the incomplete count is pinned', () => {
  // The test above only averages length over rows that ALREADY have an
  // example, so it is blind to a whole-field loss — it passed even while PC1
  // silently dropped topics 3.9 and 3.11 to null. Check every section whose
  // raw markdown contains a "**Worked example" line directly against its
  // parsed output, and pin the count of rows that are genuinely incomplete in
  // the source (verified by hand, not just trusted): 1.10, 1.11, 2.11, 3.3,
  // 4.3, 4.9 — six, not the eight that shipped with the cap bug live.
  const r = parseAll(read)
  for (const pack of PACKS) {
    const text = read(`ap_precalc/study-packs/${pack.file}`)
    sections(text).forEach((s, i) => {
      if (/\*\*Worked examples?\b/.test(s.body)) {
        const topic = r.teaching.find((t) => t.topic === `${pack.unit}.${i + 1}`)
        assert.ok(
          topic?.worked_example,
          `${pack.file} §${s.label} "${s.title}" has a Worked example line in the markdown but parsed to null`,
        )
      }
    })
  }

  assert.equal(r.incomplete.length, 6, `expected 6 genuinely-incomplete rows, got ${r.incomplete.length}`)
  assert.deepEqual(
    r.incomplete.map((row) => row.topic).sort(),
    ['1.10', '1.11', '2.11', '3.3', '4.3', '4.9'],
  )
})

test('PC1 REGRESSION: a worked example is not dropped just because its label carries a long prompt', () => {
  // unit-3 §2.8 (topic 3.9) labels its worked example with a 70-char inline
  // question: "Worked example — simplify k(x) = [(1 − sin²x)/sin x]·sec x to a
  // single term in tan x:". The 60-char suffix cap in labelled() silently ate
  // this whole field, and the build printed a false "missing: worked_example"
  // warning even though the solution is right there in the markdown.
  const r = parseAll(read)
  const t39 = r.teaching.find((t) => t.topic === '3.9')
  assert.ok(t39.worked_example, 'topic 3.9 must have a worked example — the markdown has one')
  assert.match(t39.worked_example, /1\/tan x|cot x/, 'the 2024 FRQ Q4B answer must survive')
  assert.match(
    t39.worked_example,
    /simplify k\(x\)/,
    'the prompt embedded in the label must be kept, not just the solution',
  )

  // Same bug, unit-3 §2.10 (topic 3.11): "Worked example — for r = 3 + 2cos θ,
  // is the distance from origin increasing on (0, π)?" also exceeds 60 chars.
  const t311 = r.teaching.find((t) => t.topic === '3.11')
  assert.ok(t311.worked_example, 'topic 3.11 must have a worked example — the markdown has one')
  assert.match(t311.worked_example, /-4\/\\?pi|−4\/π|-1\.27|−1\.27/, 'the computed average rate of change must survive')

  assert.ok(
    !r.incomplete.some((row) => row.topic === '3.9' || row.topic === '3.11'),
    'once the field is captured, these rows must not be reported missing worked_example',
  )
})

test('PC2 REGRESSION: lettered worked examples (A/B/C) are all kept, not just the first', () => {
  // unit-2 §2.8 (topic 2.8) has three lettered examples — A (no calc), B
  // (calculator, 3 decimals), C (quadratic-in-disguise, 2025 FRQ Q4). Each new
  // "**Worked example ...**" bold label used to terminate the match, so only A
  // survived while `complete: true` asserted the row was whole.
  const r = parseAll(read)
  const t28 = r.teaching.find((t) => t.topic === '2.8')
  assert.match(t28.worked_example, /3\^\{?x\}?\s*=\s*9|x\s*=\s*2\b/, 'example A must survive')
  assert.match(t28.worked_example, /4\^\{?x\}?\s*=\s*20|2\.161/, 'example B must survive')
  assert.match(
    t28.worked_example,
    /e\^\{?2x\}?-e\^\{?x\}?-12=0|quadratic-in-disguise|u=4/,
    'example C (2025 FRQ Q4) must survive',
  )
})

test('PC3 REGRESSION: a duplicated P number is a hard error even though the item count still matches', () => {
  // Renumbering unit 1's P6 to P5 (a plausible hand-edit slip) yields 12 items
  // parsed — the count check alone is satisfied — but only 11 unique ids,
  // and items.id is a PRIMARY KEY, so one problem silently vanishes on
  // INSERT OR REPLACE. Use an injected readFile so real content is untouched.
  const real = read('ap_precalc/study-packs/unit-1-polynomial-rational.md')
  const dup = real.replace('**P6 (medium, no-calc).**', '**P5 (medium, no-calc).**')
  assert.notEqual(dup, real, 'the fixture substitution must actually apply')
  const readInjected = (f) => (f.includes('unit-1') ? dup : read(f))

  const r = parsePrecalcItems(readInjected)
  const unit1Items = r.items.filter((i) => i.unit === '1')
  assert.equal(unit1Items.length, 12, 'the plain count check is satisfied — that is exactly the blind spot')
  assert.equal(
    new Set(unit1Items.map((i) => i.id)).size,
    11,
    'two items now share an id, proving the collision',
  )
  assert.ok(
    r.errors.some((e) => /unit-1/.test(e) && /duplicate/i.test(e)),
    `expected a duplicate-id error, got: ${JSON.stringify(r.errors)}`,
  )
})

test('N12: a worked example whose label carried the actual prompt does not open on a dangling fragment', () => {
  // labelled(..., { includeSuffix: true }) keeps the label's suffix text —
  // correct, because on these topics the suffix IS the prompt and dropping it
  // truncates the whole solution. But it kept the bare suffix while dropping
  // the words "Worked example" that introduced it, so the field now opens
  // directly on a fragment: "A (no calc)\nSolve...", "exact value of
  // cos(5π/6)\n5π/6 is in QII...", "— sec(π/3)". A reader (a student, or the
  // model quoting this teaching row) sees a sentence with no subject.
  const r = parseAll(read)
  const DANGLING_BEFORE_FIX = [
    '2.8', '2.9', '3.1', '3.2', '3.5', '3.6', '3.7', '3.8', '3.9', '3.10', '3.11', '4.5',
  ]
  for (const topicId of DANGLING_BEFORE_FIX) {
    const t = r.teaching.find((x) => x.topic === topicId)
    assert.ok(t?.worked_example, `topic ${topicId} lost its worked example entirely`)
    assert.match(
      t.worked_example,
      /^worked examples?\b/i,
      `topic ${topicId} opens on a dangling fragment: ${JSON.stringify(t.worked_example.split('\n')[0])}`,
    )
  }
})

// --- build-level guarantees -----------------------------------------------

test('the build reports both subjects, and neither has zero topics', () => {
  const r = compile()
  // Today's content legitimately FAILS the build: 33 exam-tested Precalc topics
  // have no items of their own and one teaching row is entirely blank (both proved
  // in build-gates.test.js). What must hold HERE is narrower and permanent — no
  // parser silently produced nothing, which is the failure this test was written
  // for. Asserting zero errors would now mean asserting those content gaps away.
  const silent = r.errors.filter((e) => /has no topics|parse failed|parsed \d+ items|no concept sections/.test(e))
  assert.deepEqual(silent, [], 'a parser returned nothing and the build did not object')
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
