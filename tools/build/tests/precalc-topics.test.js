import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { sections, labelled, parsePack, parseAll, PACKS, UNIT_WEIGHTS } from '../parse-precalc-topics.js'
import { parseAll as parsePrecalcItems } from '../parse-precalc.js'
import { compile, summary } from '../build.js'

const read = (f) => readFileSync(f, 'utf8')
const U1 = 'ap_precalc/study-packs/unit-1-polynomial-rational.md'
const U4 = 'ap_precalc/study-packs/unit-4-parametric-vectors-matrices.md'

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

test('PC-C4: the per-unit exam weights are the CED figures, and the config agrees with the parser', () => {
  // The official AP Precalculus CED gives Unit 1 30-40%, Unit 2 25-40%, Unit 3
  // 30-35% of the multiple-choice section. Unit 2's low bound shipped as 27,
  // which is not a College Board number. It is not decorative: select.js
  // apportions a proctored sitting across units in proportion to
  // exam_weight_low/high (see its `examWeight` and the mock coverage pass), so a
  // wrong weight changes which questions a paper asks and how many come from
  // each unit. It is replicated onto every topic row in the unit, so one wrong
  // pair biases eleven rows.
  //
  // Both places are pinned because there are two independent copies of these
  // numbers — the parser's table (which reaches the database via topics rows)
  // and worker/config/ap_precalc.json's exam.unit_weights (which the dashboard
  // reads) — and they can drift apart silently.
  const CED = { 1: [30, 40], 2: [25, 40], 3: [30, 35] }

  for (const [unit, want] of Object.entries(CED)) {
    assert.deepEqual(UNIT_WEIGHTS[unit], want, `parser UNIT_WEIGHTS unit ${unit} disagrees with the CED`)
  }
  assert.deepEqual(UNIT_WEIGHTS['4'], [0, 0], 'Unit 4 is not assessed on the exam')

  const config = JSON.parse(read('worker/config/ap_precalc.json'))
  for (const [unit, want] of Object.entries(CED)) {
    assert.deepEqual(
      config.exam.unit_weights[unit],
      want,
      `worker/config/ap_precalc.json exam.unit_weights unit ${unit} disagrees with the CED`,
    )
  }
  assert.deepEqual(
    Object.keys(config.exam.unit_weights).sort(),
    ['1', '2', '3'],
    'the config must weight exactly the exam-tested units',
  )

  // The weight the parser actually stamps onto topic rows, not just the table.
  const r = parseAll(read)
  for (const t of r.topics) {
    const [lo, hi] = CED[t.unit] ?? [0, 0]
    assert.equal(t.exam_weight_low, lo, `topic ${t.id} carries the wrong exam_weight_low`)
    assert.equal(t.exam_weight_high, hi, `topic ${t.id} carries the wrong exam_weight_high`)
  }
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
  // the source (verified by hand, not just trusted): 4.3 and 4.9 — the two
  // unit-4 sections with no plain-idea label. It was six while units 1-3 still
  // had gaps (1.10, 1.11, 2.11, 3.3); those four sections now carry every label,
  // so no exam-tested topic is missing teaching material at all.
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

  assert.equal(r.incomplete.length, 2, `expected 2 genuinely-incomplete rows, got ${r.incomplete.length}`)
  assert.deepEqual(
    r.incomplete.map((row) => row.topic).sort(),
    ['4.3', '4.9'],
  )
  assert.deepEqual(
    r.incomplete.filter((row) => !row.topic.startsWith('4.')),
    [],
    'every exam-tested topic (units 1-3) must have all three teaching fields',
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
  // Renumbering unit 1's P6 to P5 (a plausible hand-edit slip) parses to the same
  // number of items — the count check alone is satisfied — but one id fewer,
  // and items.id is a PRIMARY KEY, so one problem silently vanishes on
  // INSERT OR REPLACE. Use an injected readFile so real content is untouched.
  //
  // Counted against the pack as it stands rather than against a literal 12: the
  // pack may gain problems (it has), and this test is about the collision, not
  // about how many items unit 1 ships.
  const real = read('ap_precalc/study-packs/unit-1-polynomial-rational.md')
  const dup = real.replace('**P6 (medium, no-calc).**', '**P5 (medium, no-calc).**')
  assert.notEqual(dup, real, 'the fixture substitution must actually apply')
  const readInjected = (f) => (f.includes('unit-1') ? dup : read(f))

  const shipped = parsePrecalcItems(read).items.filter((i) => i.unit === '1').length
  const r = parsePrecalcItems(readInjected)
  const unit1Items = r.items.filter((i) => i.unit === '1')
  assert.equal(unit1Items.length, shipped, 'the plain count check is satisfied — that is exactly the blind spot')
  assert.equal(
    new Set(unit1Items.map((i) => i.id)).size,
    shipped - 1,
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

test('PC-C8b: the a + b·ln(t+1) model is practised by ONE item, not two near-duplicates', () => {
  // pc-u1-p9 and pc-u2-p12 were both "find a and b for a + b·ln(t+1) from two
  // points" — the same model, the same shape, differing only in the story and the
  // numbers. Two items of one form is one item of evidence dressed as two: it
  // spends a bank of 48 twice on the same skill and overstates coverage of the
  // form. pc-u2-p12 is the one kept, because it goes further (AROC, then the
  // concavity explanation that FRQ Q2 actually scores) and it lives in the unit
  // whose content it is.
  const r = parsePrecalcItems(read)
  const logModel = r.items.filter((i) => /=\s*a\s*\+\s*b\\ln\(t\+1\)/.test(i.stem))
  assert.deepEqual(
    logModel.map((i) => i.id),
    ['pc-u2-p12'],
    'exactly one practice item may drill the a + b·ln(t+1) two-point fit',
  )
  // ...and the survivor is the richer one, so the differentiation cannot be
  // "resolved" later by deleting the parts that made it worth keeping.
  assert.match(logModel[0].stem, /average rate of change/i)
  assert.match(logModel[0].solution, /concave down/i)
})

test('PC-C8c: no item in a completed pack is missing difficulty or calc_allowed, and the remaining gaps are pinned', () => {
  // The parser reads both fields off each item's tagline, and a missing tagline
  // is silent: difficulty simply comes back null, and a null calc_allowed is read
  // as FALSE (no-calculator) by readiness.js's calculator-half filter
  // `a.calc_allowed === flag`, so an untagged item is measured against the wrong
  // half of the exam rather than skipped.
  //
  // The two lists below are pinned as exact sets, not as counts or as "at most":
  // every id still missing a field is named, so filling one in must be
  // accompanied by deleting it from here, and dropping a tag from a pack that
  // HAS one fails immediately. Both remaining groups belong to packs this change
  // does not own — unit 3's two FRQ-style items, and all twelve of unit 4.
  const r = parsePrecalcItems(read)
  const noDifficulty = r.items.filter((i) => !i.difficulty).map((i) => i.id)
  const noCalc = r.items.filter((i) => i.calc_allowed === null || i.calc_allowed === undefined).map((i) => i.id)

  assert.deepEqual(noDifficulty, ['pc-u3-p11', 'pc-u3-p12'], 'untagged difficulty outside unit 3')
  assert.deepEqual(
    noCalc,
    Array.from({ length: 12 }, (_, k) => `pc-u4-p${k + 1}`),
    'untagged calc_allowed outside unit 4',
  )
  // Unit 1 and unit 2 are complete on both fields — that is what this change fixed.
  for (const it of r.items.filter((i) => i.unit === '1' || i.unit === '2')) {
    assert.ok(it.difficulty, `${it.id} has no difficulty`)
    assert.notEqual(it.calc_allowed, null, `${it.id} has no calc_allowed`)
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
  // RETIRED ASSERTION: this used to open with `assert.ok(buckets.length > 0)` on the
  // real content, which was only true because every one of the 48 Precalc items was
  // untagged. It is now false, and correctly so — build.js declares a `<unit>.0`
  // bucket ONLY for a unit that still has an item sitting in one, because an empty
  // bucket marked tested_on_exam is a topic no item can ever reach and so a
  // permanent cap on coverage. The bucketing behaviour itself is what this test is
  // about, so it is now driven by removing a tag rather than by hoping one is
  // missing: the guarantee is that an untagged item is bucketed, never guessed.
  const r = compile()
  const missing = (f) => (f.endsWith(U1) ? read(U1).replace('<!-- topic: 1.1 -->', '') : read(f))
  const untagged = compile(missing)

  const bucketed = untagged.items.filter((i) => i.subject === 'ap_precalc' && i.topic === '1.0')
  assert.equal(bucketed.length, 1, 'the item whose tag was removed must be bucketed, not assigned a guess')
  const buckets = untagged.topics.filter((t) => t.untagged_bucket)
  assert.ok(buckets.length > 0, 'and the bucket it lands in must be a declared topic row')
  for (const b of buckets) {
    assert.match(b.id, /\.0$/)
    assert.match(b.ek, /Placeholder/)
  }
  // No bucket is invented for a unit whose every item is tagged, in either compile.
  for (const c of [r, untagged]) {
    for (const b of c.topics.filter((t) => t.untagged_bucket)) {
      assert.ok(
        c.items.some((i) => i.subject === b.subject && i.topic === b.id),
        `bucket ${b.id} is declared but nothing lands in it`,
      )
    }
  }

  // Every precalc item points at a real topic row — the property the bucket exists
  // to guarantee, checked on the real content and on the untagged one.
  for (const c of [r, untagged]) {
    const ids = new Set(c.topics.filter((t) => t.subject === 'ap_precalc').map((t) => t.id))
    for (const it of c.items.filter((i) => i.subject === 'ap_precalc')) {
      assert.ok(ids.has(it.topic), `item ${it.id} points at unknown topic ${it.topic}`)
    }
  }
})

test('the bucket for Unit 4 is excluded from exam coverage', () => {
  // `if (u4)` used to guard this, which now makes it vacuous: the real content has
  // no bucket at all. So the unit-4 bucket is provoked instead of waited for — an
  // untagged class-only item must never invent an exam-tested topic that readiness
  // then demands coverage of.
  const missing = (f) => (f.endsWith(U4) ? read(U4).replace(/<!-- topic: 4\.\d+ -->/, '') : read(f))
  const r = compile(missing)
  const u4 = r.topics.find((t) => t.untagged_bucket && t.unit === '4')
  assert.ok(u4, 'precondition: removing a unit-4 tag must produce the unit-4 bucket')
  assert.equal(u4.tested_on_exam, false)
  assert.deepEqual(r.unreachable.filter((u) => u.id === '4.0'), [])
})
