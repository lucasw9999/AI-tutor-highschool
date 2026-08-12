// The gates that stop a broken question bank from being reported as "Build OK".
//
// Every check here exists because the build once printed success over content a
// student could not actually study from: 48 Precalc items and 48 Precalc topics
// never went through validate() at all, so an empty stem, a duplicated id, or a
// topic no item can reach were all invisible.
//
// Content is never mutated: the real repo files are read, and the one file under
// test is text-patched in memory before compile() sees it.
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { compile, summary, incompleteReport } from '../build.js'
import { validate } from '../validate.js'

const read = (f) => readFileSync(f, 'utf8')
const U1 = 'ap_precalc/study-packs/unit-1-polynomial-rational.md'

/** A readFile that serves the real repo, with `file`'s text rewritten in memory. */
function patched(file, patch) {
  return (f) => (f.endsWith(file) ? patch(read(file)) : read(f))
}

/** Errors are long once the coverage gate speaks; keep failure messages readable. */
const brief = (errors) => errors.slice(0, 6).join('\n  ')

// --- B1: validation must cover every subject, not just CSA -----------------

test('B1: a Precalc item with an empty stem is a build ERROR', () => {
  // Blank the P1 prompt but keep its header, exactly the shape a hand edit produces.
  const r = compile(patched(U1, (t) => t.replace(/^(\*\*P1\b[^*]*\*\*).*$/m, '$1')))
  const blank = r.items.find((i) => i.id === 'pc-u1-p1')
  assert.equal(blank.stem, '', 'precondition: the patch must produce a genuinely empty stem')
  assert.ok(
    r.errors.some((e) => e.includes('pc-u1-p1') && /empty stem/.test(e)),
    `expected an empty-stem error for pc-u1-p1, got:\n  ${brief(r.errors)}`,
  )
})

test('B1: two Precalc items sharing an id is a build ERROR, not a silent lost item', () => {
  // to-sql.js emits INSERT OR REPLACE, so a duplicate id means D1 receives one
  // row fewer than the summary claims to have written.
  const r = compile(patched(U1, (t) => t.replace(/^\*\*P12\b/m, '**P3')))
  assert.equal(r.items.filter((i) => i.id === 'pc-u1-p3').length, 2, 'precondition: the id must collide')
  assert.ok(
    r.errors.some((e) => e.includes('pc-u1-p3') && /duplicate item id/.test(e)),
    `expected a duplicate-id error, got:\n  ${brief(r.errors)}`,
  )
})

test('B1: MCQ-shaped checks do not falsely flag model-graded Precalc items', () => {
  const r = compile()
  const falsePositive = /missing practice tag|could not parse options|no answer key|not one of the options/
  const wrong = r.errors.filter((e) => /^pc-u\d-p\d+/.test(e) && falsePositive.test(e))
  assert.deepEqual(wrong, [], 'model-graded items are not MCQs and must not be judged as if they were')
})

// --- B2: topic bookkeeping must be keyed by subject ------------------------

test('B2: a Precalc topic with no items still warns when CSA has an item at the same id', () => {
  // 42 of 48 Precalc topic ids collide with CSA ids, so a global key masked them.
  const topics = [
    { id: '1.1', subject: 'ap_csa', ek: 'CSA idea' },
    { id: '1.1', subject: 'ap_precalc', ek: 'Precalc idea' },
  ]
  const items = [
    {
      id: 'csa-q1', subject: 'ap_csa', kind: 'mcq', topic: '1.1', practice: 'P3',
      stem: 'What is printed?', options: { A: 'a', B: 'b', C: 'c', D: 'd' }, answer: 'A',
    },
  ]
  const { warnings } = validate(items, topics)
  const noItems = warnings.filter((w) => /has no items/.test(w))
  assert.equal(noItems.length, 1, `expected exactly one has-no-items warning, got ${JSON.stringify(noItems)}`)
  assert.match(noItems[0], /ap_precalc/)
})

test('B2: an item may not borrow a topic id that exists only in another subject', () => {
  const topics = [
    { id: '1.5', subject: 'ap_csa', ek: 'CSA only' },
    { id: '2.1', subject: 'ap_precalc', ek: 'Precalc only' },
  ]
  const items = [
    { id: 'pc-x', subject: 'ap_precalc', kind: 'constructed_model_graded', topic: '1.5', stem: 's', solution: 'sol' },
  ]
  const { errors } = validate(items, topics)
  assert.ok(
    errors.some((e) => e.includes('pc-x') && e.includes('1.5') && /coverage matrix/.test(e)),
    `expected a cross-subject topic error, got ${JSON.stringify(errors)}`,
  )
})

// --- B3: an exam-tested topic with no items is unreachable readiness -------

test('B3: an exam-tested topic with no items of its own is a build ERROR', () => {
  const r = compile()
  const expected = r.topics
    .filter((t) => t.tested_on_exam)
    .filter((t) => r.items.some((i) => i.subject === t.subject))
    .filter((t) => !r.items.some((i) => i.subject === t.subject && i.topic === t.id))
    .map((t) => `${t.subject}:${t.id}`)
    .sort()
  assert.deepEqual(
    r.unreachable.map((u) => `${u.subject}:${u.id}`).sort(),
    expected,
    'compile() must report exactly the exam-tested topics no item can reach',
  )
  assert.ok(expected.length > 0, 'precondition: current content has unreachable topics')
  const text = r.errors.join('\n')
  for (const u of r.unreachable) {
    assert.ok(text.includes(u.id), `unreachable topic ${u.id} must be named in the error output`)
  }
})

test('B3: every exam-tested Precalc CONCEPT topic is unreachable today, and no CSA topic is', () => {
  // All 48 Precalc items sit in the <unit>.0 untagged buckets, so every real
  // exam-tested concept topic has zero items — coverage is capped at 3 of 36 (8.3%)
  // and readiness.js requires topics_drilled >= topics_total before it evaluates
  // anything else. This is the content gap, not the gate: it shrinks only when
  // Precalc items get real topic tags.
  const r = compile()
  const expected = r.topics
    .filter((t) => t.subject === 'ap_precalc' && t.tested_on_exam && !t.untagged_bucket)
    .map((t) => t.id)
  assert.ok(expected.length > 0, 'precondition: Precalc has exam-tested concept topics')
  assert.deepEqual(
    r.unreachable.filter((u) => u.subject === 'ap_precalc').map((u) => u.id).sort(),
    expected.sort(),
  )
  assert.deepEqual(
    r.unreachable.filter((u) => u.subject === 'ap_csa'),
    [],
    'CSA has an item on every one of its exam-tested topics; the gate must stay silent for it',
  )
})

// --- B4: teaching material must actually contain something ----------------

test('B4: a teaching row with every content field null is a build ERROR', () => {
  // Injected: a concept section carrying none of the three labels. teaching.js only
  // guards against a MISSING row, so an all-null row returns a truthy lesson with
  // three empty fields and the "no teaching material yet" safeguard never fires.
  const r = compile(
    patched(U1, (t) =>
      t.replace('## 3. Graduated practice set', '### 2.99 A section with no labelled fields\n\nprose only\n\n## 3. Graduated practice set')),
  )
  const blank = r.blankTeaching.filter((t) => t.subject === 'ap_precalc')
  assert.ok(blank.length > 0, 'precondition: the injected section must yield an all-null teaching row')
  for (const t of blank) {
    assert.ok(
      r.errors.some((e) => e.includes(`${t.subject}:${t.topic}`) && /no teaching content/.test(e)),
      `blank teaching row ${t.subject}:${t.topic} must be an error, got:\n  ${brief(r.errors)}`,
    )
  }
})

test('B4: the real content ships exactly one all-blank teaching row, and it errors', () => {
  // ap_precalc 1.11 ("Model domain & range restrictions") has plain_idea,
  // worked_example and common_mistake all null in the pack.
  const r = compile()
  assert.deepEqual(r.blankTeaching.map((t) => `${t.subject}:${t.topic}`), ['ap_precalc:1.11'])
  assert.ok(r.errors.some((e) => e.includes('1.11') && /no teaching content/.test(e)))
})

test('B4: a topic that has items must have a teaching row of its own', () => {
  const r = compile()
  for (const id of ['1.0', '2.0', '3.0', '4.0']) {
    assert.ok(
      r.topicsMissingTeaching.some((t) => t.id === id && t.subject === 'ap_precalc'),
      `bucket ${id} carries items but no teaching row, and must be reported`,
    )
    assert.ok(
      r.errors.some((e) => e.includes(id) && /no teaching row/.test(e)),
      `expected a missing-teaching-row error for ${id}, got:\n  ${brief(r.errors)}`,
    )
  }
})

// --- B5: the output must not understate what was written -------------------

test('B5: the per-subject table reports rows written and rows complete separately', () => {
  const r = compile()
  const rows = summary(r)
  const pc = r.teaching.filter((t) => t.subject === 'ap_precalc')
  // Every row written reaches teaching.json and D1, complete or not, so the output
  // must not report only the complete count as it once did ("teaching= 36" while 44
  // rows shipped).
  assert.equal(rows.ap_precalc.teachingWritten, pc.length)
  assert.equal(rows.ap_precalc.teachingComplete, pc.filter((t) => t.complete !== false).length)
  assert.ok(
    rows.ap_precalc.teachingWritten > rows.ap_precalc.teachingComplete,
    `precondition: some Precalc teaching rows are still incomplete (written ${rows.ap_precalc.teachingWritten}, complete ${rows.ap_precalc.teachingComplete})`,
  )
})

test('B5: the INCOMPLETE list names every class of gap, not just untagged items', () => {
  const r = compile()
  const lines = incompleteReport(r).join('\n')
  assert.match(lines, /bucketed at <unit>\.0/, 'untagged items')
  assert.match(lines, /1\.11/, 'the blank teaching row')
  assert.match(lines, /no teaching row/, 'item-bearing topics with no teaching row')
  assert.match(lines, /cannot reach readiness|unreachable/, 'unreachable exam-tested topics')
  for (const u of r.unreachable) {
    assert.ok(lines.includes(u.id), `unreachable topic ${u.id} must appear in the INCOMPLETE list`)
  }
})
