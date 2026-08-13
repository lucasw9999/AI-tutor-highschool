// The two halves of an AP Precalculus paper, as a study pack declares them.
//
// A Precalc sitting could not be assembled at all: api.js sizes a paper in `mcq`
// and `frq` (sectionParts) and every Precalc item was `constructed` or
// `constructed_model_graded`, which fill neither half. These tests pin the
// declarations that let a pack write a genuine multiple-choice question and a
// genuine free-response question, and — because an option list is exactly where
// the next FALSE NEGATIVE gets born — every "credits" assertion below runs the
// parser's own output through the REAL worker/src/grade.js and asserts the
// VERDICT A STUDENT WOULD RECEIVE, never the parser's intent.

import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import {
  parsePracticeItems,
  parseAll,
  PRECALC_PRACTICES,
  PRECALC_FRQ_SLOTS,
} from '../parse-precalc.js'
import { parseOptions } from '../parse-mcq.js'
import { validate, feasibility, readinessConfigs, MIN_MOCK_COVERAGE } from '../validate.js'
import { compile } from '../build.js'
import { grade } from '../../../worker/src/grade.js'

const read = (f) => readFileSync(f, 'utf8')
const U1 = 'unit-1-polynomial-rational.md'
const U3 = 'unit-3-trigonometric-polar.md'

const OPTIONS = 'A) y = 0   B) y = 3   C) y = 1/3   D) no horizontal asymptote'
const STEM = 'Which of these is the horizontal asymptote of $f(x)=\\dfrac{3x^2+1}{x^2-4}$?'
const SOLUTION = 'Equal degrees, so the asymptote is the ratio of the leading coefficients: $y=3$.'
const MCQ_META = ['<!-- key: B -->', '<!-- practice: 1.A -->', '<!-- topic: 1.6 -->']

/** One multiple-choice P block, exactly as a pack writes it. */
function mcqBlock({
  n = 13,
  tagline = '(easy, no-calc).',
  stem = STEM,
  options = OPTIONS,
  solution = SOLUTION,
  meta = MCQ_META,
} = {}) {
  return [
    `**P${n} ${tagline}** ${stem}`,
    ...(options == null ? [] : [options]),
    '<details><summary>Solution</summary>',
    '',
    solution,
    '</details>',
    ...meta,
    '',
  ].join('\n')
}

const FRQ_STEM =
  'A Ferris wheel turns at a constant rate. (a) Write a sinusoidal model for a rider\'s height. ' +
  '(b) State the midline and amplitude, and explain what each means about the wheel. ' +
  '(c) Find the first time the rider is 30 feet above the ground.'
const FRQ_SOLUTION =
  '(a) $h(t)=25\\sin\\!\\big(\\tfrac{\\pi}{15}(t-7.5)\\big)+30$. (b) Midline 30 (the hub height), amplitude 25 ' +
  '(the radius). (c) $t=15$ seconds, where the rider crosses the midline going up.'
const FRQ_META = ['<!-- frq: Q3 -->', '<!-- topic: 3.4 -->']

/** One free-response P block. */
function frqBlock({
  n = 14,
  tagline = '(exam-level, calculator).',
  stem = FRQ_STEM,
  solution = FRQ_SOLUTION,
  meta = FRQ_META,
} = {}) {
  return [
    `**P${n} ${tagline}** ${stem}`,
    '<details><summary>Solution</summary>',
    '',
    solution,
    '</details>',
    ...meta,
    '',
  ].join('\n')
}

const pack = (...blocks) => ['## 3. Practice set', '', ...blocks].join('\n')

/** Parse one block and return { item, errors }. A free-response fixture is unit 3. */
function one(text, file = U1) {
  const r = parsePracticeItems(pack(text), file)
  return { item: r.items[0], errors: r.errors }
}

/** The single error text, asserted to be the only one. */
function soleError(text, file = U1) {
  const { errors } = one(text, file)
  assert.equal(errors.length, 1, `expected exactly one error, got ${JSON.stringify(errors)}`)
  return errors[0]
}

/** Assert this response is credited BY THE REAL GRADER, and say what was typed if not. */
function creditsOn(item, response) {
  const v = grade(item, response)
  assert.equal(
    v.correct,
    1,
    `FALSE NEGATIVE: ${JSON.stringify(response)} was marked wrong on ${item.id} ` +
      `(graded_by=${v.graded_by}, detail=${v.detail}, picked=${v.picked}); key ${JSON.stringify(item.answer)}, ` +
      `options ${JSON.stringify(item.options)}`,
  )
  assert.equal(v.graded_by, 'server', 'a multiple-choice item must be graded by the server, not routed to the model')
}

// ---------------------------------------------------------------------------
// Nothing existing changes. The 48 shipped items keep the exact shape they had.
// ---------------------------------------------------------------------------

/** The keys every Precalc item has carried since before either declaration existed. */
const BASE_KEYS = [
  'id', 'subject', 'unit', 'number', 'kind', 'difficulty', 'calc_allowed', 'tested_on_exam',
  'stem', 'solution', 'explanation', 'answer', 'answer_variants', 'topic',
]

test('a short-answer item compiles with exactly the keys it had before, and no others', () => {
  // Byte-identity of the compiled artifact, asserted as the shape rather than as
  // a snapshot: an added `practice: null` or `options: null` on the 48 shipped
  // items would rewrite content/items.json for 48 items that did not change.
  //
  // Stated per KIND so it keeps holding once the packs gain the questions this
  // format unblocks: a short-answer item carries the base keys and nothing else,
  // and each declaration adds exactly the fields it declared.
  const r = parseAll(read)
  assert.deepEqual(r.errors, [], 'the real content must stay clean under the new checks')
  assert.equal(r.items.length >= 48, true, `expected at least 48 items, got ${r.items.length}`)
  const shortAnswer = r.items.filter((i) => i.kind === 'constructed' || i.kind === 'constructed_model_graded')
  assert.equal(shortAnswer.length >= 48, true, 'the 48 shipped items are short-answer, so all of them are in this set')
  for (const it of shortAnswer) {
    assert.deepEqual(
      Object.keys(it).filter((k) => k !== 'practice'),
      BASE_KEYS,
      `${it.id} gained or lost a key`,
    )
  }
  for (const it of r.items.filter((i) => i.kind === 'mcq')) {
    assert.deepEqual(Object.keys(it), [...BASE_KEYS, 'practice', 'options'], it.id)
  }
  for (const it of r.items.filter((i) => i.kind === 'frq')) {
    assert.deepEqual(
      Object.keys(it).filter((k) => k !== 'practice'),
      [...BASE_KEYS, 'question_type', 'frq_type'],
      it.id,
    )
  }
})

// ---------------------------------------------------------------------------
// A declared MCQ compiles to exactly the shape parse-mcq.js produces for CSA.
// ---------------------------------------------------------------------------

test('a declared MCQ compiles to parse-mcq.js’s shape: kind mcq, A-D options, a letter key', () => {
  const { item, errors } = one(mcqBlock())
  assert.deepEqual(errors, [])
  assert.equal(item.kind, 'mcq')
  assert.equal(item.answer, 'B')
  assert.deepEqual(item.options, parseOptions(OPTIONS), 'the options must be split by parse-mcq.js’s own function')
  assert.deepEqual(Object.keys(item.options), ['A', 'B', 'C', 'D'])
  assert.equal(item.practice, '1.A')
  assert.equal(item.topic, '1.6')
  assert.equal(item.calc_allowed, false)
  assert.equal(item.difficulty, 'easy')
  // The printed option line belongs to `options`, not to the stem: the Worker
  // renders the two separately, so leaving it in the stem shows them twice.
  assert.equal(item.stem, STEM.replace(/\s+/g, ' ').trim())
  assert.ok(!/A\)/.test(item.stem), `the option line leaked into the stem: ${item.stem}`)
  // ...and the worked solution is still the feedback the student is shown.
  assert.equal(item.explanation, SOLUTION)
  assert.deepEqual(item.answer_variants, [], 'a letter has no spelling variants')
  assert.deepEqual(Object.keys(item), [...BASE_KEYS, 'practice', 'options'])
})

test('FALSE NEGATIVE: every spelling of the right letter is credited by the real grader', () => {
  const { item } = one(mcqBlock())
  for (const typed of [
    'B', 'b', ' B ', '(B)', '(b)', 'B.', 'B)', 'b ', 'answer: B', 'answer is b', 'choice B',
    'I think B', 'I pick B', 'B?',
  ]) creditsOn(item, typed)
})

test('FALSE NEGATIVE: the option’s own text, and the printed "B) text" form, are credited', () => {
  const { item } = one(mcqBlock())
  for (const typed of ['y = 3', 'Y = 3', 'y = 3.', 'B) y = 3', 'B. y = 3', '(B) y = 3', 'y = 3 (B)']) {
    creditsOn(item, typed)
  }
})

test('a re-spaced or LaTeX-wrapped option text is DECLINED, never marked wrong', () => {
  // grade.js's canonAnswer collapses runs of whitespace but does not strip spaces
  // around operators and does not strip $ — normalizeShort, which the typed-answer
  // keys are judged by, does both. So "y=3" against an option printed "y = 3" is
  // read as no answer at all: correct 0 with graded_by 'unparsed', which
  // isServerGraded() excludes from every percentage, gap and readiness floor. It
  // costs a serve, and it does NOT tell a student he was wrong. That is why the
  // answer a multiple-choice item asks for is the LETTER, and why the parser
  // proves every letter spelling rather than every spelling of the text.
  const { item } = one(mcqBlock())
  for (const typed of ['y=3', '$y = 3$']) {
    const v = grade(item, typed)
    assert.equal(v.correct, 0)
    assert.equal(v.graded_by, 'unparsed', `${typed} must be declined, not booked as a miss`)
  }
})

test('a wrong letter is wrong, and a blank is blank', () => {
  const { item } = one(mcqBlock())
  for (const typed of ['A', 'a', '(C)', 'D.', 'y = 0', 'answer: C']) {
    const v = grade(item, typed)
    assert.equal(v.correct, 0, `${typed} must not be credited against a key of B`)
    assert.equal(v.graded_by, 'server', `${typed} is a readable choice and must be graded, not declined`)
  }
  assert.equal(grade(item, '').blank, true)
  assert.equal(grade(item, '   ').blank, true)
})

test('every declared MCQ is proved against the grader at BUILD time, spelling by spelling', () => {
  // The gate that protects the ~42 items the content authors will write, not just
  // this fixture. Option A's text is the letter B IN QUOTES: the bare-letter gate
  // cannot see it (quotes are not decoration it strips) and every letter still
  // resolves, but grade.js reads the option's OWN text as both label B and option
  // A's value and declines it — so a student who copies option A verbatim gets no
  // verdict at all. Only running the real grader over the list finds this.
  const err = soleError(mcqBlock({ options: 'A) "B"   B) y = 3   C) y = 1/3   D) none of these' }))
  assert.match(err, /the real grader does not read this option list/, err)
  assert.match(err, /option A's own text/, err)
  assert.match(err, /not one answer at all \(unparsed: ambiguous_choice\)/, err)
})

// ---------------------------------------------------------------------------
// Validation with teeth. Every one of these is a BUILD ERROR, and every refusal
// leaves a model-graded item rather than a half-formed multiple-choice one.
// ---------------------------------------------------------------------------

test('fewer than four options is a build ERROR', () => {
  const err = soleError(mcqBlock({ options: 'A) y = 0   B) y = 3   C) y = 1/3' }))
  assert.match(err, /four/i, err)
  assert.match(err, /pc-u1-p13/)
})

test('a key that is not one of the option labels is a build ERROR', () => {
  for (const bad of ['<!-- key: E -->', '<!-- key: 3 -->', '<!-- key: y = 3 -->', '<!-- key: B or C -->']) {
    const err = soleError(mcqBlock({ meta: [bad, '<!-- practice: 1.A -->', '<!-- topic: 1.6 -->'] }))
    assert.match(err, /A, B, C or D|one of the option/i, `for ${bad}: ${err}`)
  }
})

test('a printed option list with no key at all is a build ERROR', () => {
  const err = soleError(mcqBlock({ meta: ['<!-- practice: 1.A -->', '<!-- topic: 1.6 -->'] }))
  assert.match(err, /key/i, err)
})

test('two identical options are a build ERROR', () => {
  const err = soleError(mcqBlock({ options: 'A) y = 0   B) y = 3   C) y = 0   D) none of these' }))
  assert.match(err, /same|identical/i, err)
  assert.match(err, /\bA\b/, 'must name both colliding options')
  assert.match(err, /\bC\b/)
})

test('two options that differ only in spacing are a build ERROR — two right answers, one key', () => {
  const err = soleError(mcqBlock({ options: 'A) y = 0   B) y = 3   C) y=3   D) none of these' }))
  assert.match(err, /same|identical/i, err)
})

test('an option whose text is a bare letter naming ANOTHER option is a build ERROR', () => {
  // The collision the CSA bank already ships four of (csa-ac-q14, csa-ac-q33,
  // csa-u2-q7 twice): a response of "C" cannot be told apart from option A by
  // text and option C by letter, so the grader declines and the decline is
  // invisible to every downstream statistic.
  const err = soleError(mcqBlock({ options: 'A) C   B) y = 3   C) y = 1/3   D) none of these' }))
  assert.match(err, /disambiguat|bare letter/i, err)
  assert.match(err, /"C"/, 'must quote the offending option text')
})

test('the bare-letter gate is the one validate.js already applies to CSA, not a weaker copy', () => {
  // Reached through validate() with a Precalc-shaped MCQ item: the shipped gate
  // is keyed on kind, not on subject, so a Precalc MCQ inherits it exactly.
  const topics = [{ id: '1.6', subject: 'ap_precalc', unit: '1', ek: 'Rational asymptotes' }]
  const item = {
    id: 'pc-u1-p13', subject: 'ap_precalc', kind: 'mcq', topic: '1.6', practice: '1.A',
    stem: STEM, options: { A: 'C', B: 'y = 3', C: 'y = 1/3', D: 'none of these' }, answer: 'B',
  }
  const { errors } = validate([item], topics, [])
  const hit = errors.filter((e) => /disambiguat/.test(e))
  assert.equal(hit.length, 1, `expected the shipped disambiguation error, got ${JSON.stringify(errors)}`)
  assert.match(hit[0], /option A's text "C" is itself label C/)
})

test('an option whose text is its OWN label is not an error', () => {
  // Reading "A" as a letter and matching "A" as text both land on option A.
  const { item, errors } = one(mcqBlock({ options: 'A) A   B) y = 3   C) y = 1/3   D) none of these' }))
  assert.deepEqual(errors, [])
  creditsOn(item, 'B')
  assert.equal(grade(item, 'A').picked, 'A')
})

test('a missing or unknown practice code is a build ERROR', () => {
  const missing = soleError(mcqBlock({ meta: ['<!-- key: B -->', '<!-- topic: 1.6 -->'] }))
  assert.match(missing, /practice/i, missing)
  for (const bad of ['P3', '1.D', '4.A', 'MP1', '1']) {
    const err = soleError(mcqBlock({ meta: ['<!-- key: B -->', `<!-- practice: ${bad} -->`, '<!-- topic: 1.6 -->'] }))
    assert.match(err, /practice/i, `for ${bad}: ${err}`)
  }
  // Lower case is the same code, and refusing it would be a build failure with
  // no defect behind it.
  const { item, errors } = one(mcqBlock({ meta: ['<!-- key: B -->', '<!-- practice: 1.c -->', '<!-- topic: 1.6 -->'] }))
  assert.deepEqual(errors, [])
  assert.equal(item.practice, '1.C')
})

test('the practice codes are the eight the repo’s own CED reference states', () => {
  const doc = read('ap_precalc/reference/skills-and-weightings.md')
  const stated = [...new Set([...doc.matchAll(/\*\*([123]\.[A-C])\*\*/g)].map((m) => m[1]))].sort()
  assert.deepEqual(
    [...PRECALC_PRACTICES].sort(),
    stated,
    'the vocabulary must be the CED’s 8 skills as ap_precalc/reference/skills-and-weightings.md tabulates them',
  )
})

test('a missing topic tag is a build ERROR on a declared MCQ', () => {
  // The <unit>.0 bucket exists for the 48 items that predate the tagging syntax.
  // A question written after it must name a real topic, or topic-level teaching
  // and topic coverage cannot see it.
  const err = soleError(mcqBlock({ meta: ['<!-- key: B -->', '<!-- practice: 1.A -->'] }))
  assert.match(err, /topic/i, err)
})

test('a tagline that says nothing about a calculator is a build ERROR on a declared MCQ', () => {
  // readiness.js buckets a mock's answers on `calc_allowed === 0` and
  // `calc_allowed === 1`, so a null lands in NEITHER the no_calc_min nor the
  // calc_min floor — invisible to both.
  const err = soleError(mcqBlock({ tagline: '(easy).' }))
  assert.match(err, /calc/i, err)
})

test('short-answer key fields alongside a printed option list are a build ERROR', () => {
  for (const bad of ['<!-- accept: y = 3 -->', '<!-- format: Answer as a letter. -->']) {
    const err = soleError(mcqBlock({ meta: [...MCQ_META, bad] }))
    assert.match(err, /multiple choice|letter/i, `for ${bad}: ${err}`)
  }
  const parts = one(mcqBlock({ meta: [...MCQ_META, '<!-- part 1: y = 3 -->', '<!-- part 2: y = 0 -->'] }))
  assert.equal(parts.errors.length, 1, JSON.stringify(parts.errors))
  assert.match(parts.errors[0], /multiple-choice|letter/i)
})

test('a refused MCQ degrades to a model-graded item that still prints its own options', () => {
  // Nothing doubtful may reach an artifact, even under --write-despite-incomplete:
  // a refused MCQ is exactly the item it would have been without the declaration.
  const { item } = one(mcqBlock({ options: 'A) y = 0   B) y = 3   C) y = 0   D) none' }))
  assert.equal(item.kind, 'constructed_model_graded')
  assert.equal(item.answer, null)
  assert.equal(item.options, undefined, 'no half-formed option set may be written')
  assert.match(item.stem, /A\) y = 0/, 'the printed choices stay in the stem, so the question still reads')
  assert.equal(grade(item, 'B').graded_by, 'model')
})

test('an option line BELOW the solution is a build ERROR, not a short answer keyed to "B"', () => {
  // The silent misread this prevents: the build would find no option line, read
  // "key: B" as a typed short answer of the letter B, and mark every student who
  // picked the right choice by its text wrong — while the pack showed the choices
  // only after the answer.
  const { item, errors } = one([
    '**P13 (easy, no-calc).** Which of these is the horizontal asymptote?',
    '<details><summary>Solution</summary>',
    '',
    SOLUTION,
    '</details>',
    OPTIONS,
    '<!-- key: B -->',
    '<!-- practice: 1.A -->',
    '<!-- topic: 1.6 -->',
    '',
  ].join('\n'))
  assert.equal(errors.length, 1, JSON.stringify(errors))
  assert.match(errors[0], /BELOW the solution/, errors[0])
  assert.equal(item.kind, 'constructed_model_graded', 'and it is not written as a short answer keyed to a letter')
  assert.equal(item.answer, null)
})

test('two printed option lines are a build ERROR', () => {
  const { item, errors } = one(mcqBlock({
    options: `${OPTIONS}\nA) 0   B) 3   C) 1/3   D) none`,
  }))
  assert.equal(errors.length, 1, JSON.stringify(errors))
  assert.match(errors[0], /2 printed option lines/, errors[0])
  assert.equal(item.kind, 'constructed_model_graded')
})

test('an option list INSIDE the solution is prose about the distractors, not a declaration', () => {
  // A worked solution may walk through the choices; only the stem region declares.
  const { item, errors } = one(mcqBlock({
    solution: `A) 0 is the asymptote of a bottom-heavy quotient, B) y = 3 is right, C) 1/3 inverts the ratio, D) is wrong. ${SOLUTION}`,
  }))
  assert.deepEqual(errors, [])
  assert.equal(item.kind, 'mcq')
  creditsOn(item, 'B')
})

// ---------------------------------------------------------------------------
// A declared FRQ fills the free-response half, and is rubric-scored by design.
// ---------------------------------------------------------------------------

test('a declared FRQ compiles to kind frq, model-graded, carrying its worked solution', () => {
  const { item, errors } = one(frqBlock(), U3)
  assert.deepEqual(errors, [])
  assert.equal(item.kind, 'frq')
  assert.equal(item.answer, null, 'a handwritten booklet answer has no mechanical key')
  assert.deepEqual(item.answer_variants, [])
  assert.equal(item.options, undefined)
  assert.equal(item.question_type, 'Q3')
  assert.equal(item.frq_type, 'Modeling Periodic')
  assert.equal(item.topic, '3.4')
  assert.equal(item.calc_allowed, true)
  assert.equal(item.solution, FRQ_SOLUTION)
  assert.equal(item.explanation, FRQ_SOLUTION, 'the worked solution is the feedback api.js returns')
  assert.deepEqual(Object.keys(item), [...BASE_KEYS, 'question_type', 'frq_type'])
  // grade.js already routes 'frq' to the model, so nothing marks it wrong.
  const v = grade(item, 'anything a student writes in the booklet')
  assert.equal(v.graded_by, 'model')
  assert.equal(v.detail, 'rubric')
})

test('a free-response stem may ask for reasoning and lettered sub-parts — that is what it is for', () => {
  const { item, errors } = one(frqBlock(), U3)
  assert.deepEqual(errors, [], 'the unkeyable-stem checks guard KEYS, and an FRQ declares none')
  assert.match(item.stem, /\(b\) State the midline/)
})

test('an FRQ slot outside Q1-Q4 is a build ERROR that names the four', () => {
  for (const bad of ['Q5', 'Q0', 'Modeling Periodic', '3', 'q']) {
    const err = soleError(frqBlock({ meta: [`<!-- frq: ${bad} -->`, '<!-- topic: 3.4 -->'] }), U3)
    assert.match(err, /Q1/, `for ${bad}: ${err}`)
    assert.match(err, /Symbolic Manipulation/, `for ${bad}: ${err}`)
  }
  // Lower case is the same slot.
  assert.equal(one(frqBlock({ meta: ['<!-- frq: q4 -->', '<!-- topic: 3.4 -->'] }), U3).item.question_type, 'Q4')
})

test('the four FRQ slots are the ones worker/config/ap_precalc.json states', () => {
  const config = readinessConfigs().find((c) => c.subject === 'ap_precalc')
  assert.deepEqual(
    PRECALC_FRQ_SLOTS.map((s) => s.type),
    config.exam.frq_types,
    'the slot table mirrors exam.frq_types and must never drift from it',
  )
  assert.equal(PRECALC_FRQ_SLOTS.length, config.exam.frq_count)
})

test('an answer key alongside a declared FRQ is a build ERROR', () => {
  for (const bad of ['<!-- key: 30 -->', '<!-- accept: 30 feet -->', '<!-- format: Answer as a number. -->']) {
    const err = soleError(frqBlock({ meta: [...FRQ_META, bad] }), U3)
    assert.match(err, /rubric|free-response|model/i, `for ${bad}: ${err}`)
  }
})

test('a printed option list alongside a declared FRQ is a build ERROR', () => {
  const err = soleError([
    '**P14 (exam-level, calculator).** Which of these models the wheel?',
    OPTIONS,
    '<details><summary>Solution</summary>',
    '',
    FRQ_SOLUTION,
    '</details>',
    '<!-- frq: Q3 -->',
    '<!-- topic: 3.4 -->',
    '<!-- practice: 2.B -->',
    '<!-- key: B -->',
    '',
  ].join('\n'), U3)
  assert.match(err, /multiple choice|both/i, err)
})

test('a declared FRQ needs a topic and a calculator marker too', () => {
  const noTopic = soleError(frqBlock({ meta: ['<!-- frq: Q3 -->'] }), U3)
  assert.match(noTopic, /topic/i, noTopic)
  const noCalc = soleError(frqBlock({ tagline: '(exam-level).' }), U3)
  assert.match(noCalc, /calc/i, noCalc)
})

test('a declared FRQ may name a practice, and may leave it out as the CSA FRQs do', () => {
  const { item, errors } = one(frqBlock({ meta: [...FRQ_META, '<!-- practice: 2.B -->'] }), U3)
  assert.deepEqual(errors, [])
  assert.equal(item.practice, '2.B')
  assert.equal(one(frqBlock(), U3).item.practice, undefined)
})

// ---------------------------------------------------------------------------
// End to end: markdown -> parser -> build.js -> validate.js -> grade.js.
// ---------------------------------------------------------------------------

/** compile() with one pack patched, as build-gates.test.js does. */
function patched(file, patch) {
  return (f) => (f.endsWith(file) ? patch(readFileSync(f, 'utf8')) : readFileSync(f, 'utf8'))
}

/**
 * The next problem number a pack has room for.
 *
 * Read off the pack rather than hardcoded: parseAll refuses a hole in the P
 * numbering, so a fixture appended at a fixed P13 breaks the moment the content
 * authors add a thirteenth problem of their own.
 */
function nextNumber(text) {
  const used = [...text.matchAll(/^\*\*P(\d+)\b/gm)].map((m) => Number(m[1]))
  return Math.max(0, ...used) + 1
}

test('a declared MCQ and FRQ pass every build gate, and grade from the compiled artifact', () => {
  const pcPack = `ap_precalc/study-packs/${U1}`
  const n = nextNumber(read(pcPack))
  const r = compile(patched(U1, (t) => [
    t,
    mcqBlock({ n }),
    frqBlock({ n: n + 1, meta: ['<!-- frq: Q1 -->', '<!-- topic: 1.11 -->'] }),
  ].join('\n')))
  const ids = [`pc-u1-p${n}`, `pc-u1-p${n + 1}`]
  const mine = r.errors.filter((e) => ids.some((id) => e.includes(id)))
  assert.deepEqual(mine, [], `a correctly declared item must not trip a single gate: ${mine.join(' | ')}`)

  const mcq = r.items.find((i) => i.id === ids[0])
  assert.equal(mcq.kind, 'mcq')
  assert.equal(mcq.answer, 'B')
  assert.equal(mcq.unit, '1')
  for (const typed of ['B', 'b', '(B)', 'B.', 'answer: B', 'y = 3']) creditsOn(mcq, typed)
  assert.equal(grade(mcq, 'A').correct, 0)

  const frq = r.items.find((i) => i.id === ids[1])
  assert.equal(frq.kind, 'frq')
  assert.equal(grade(frq, 'a page of work').graded_by, 'model')

  // And the feasibility gate now counts them into the halves they belong to,
  // instead of reporting a bank that cannot assemble a sitting at all.
  //
  // Asserted as a BICONDITIONAL per half, because the earlier version demanded
  // the message name BOTH halves unconditionally. That pinned a transitional
  // world -- both halves short -- which this campaign is deliberately ending: the
  // moment the free-response half was supplied, `incompleteReport` correctly
  // stopped printing a free-response clause and the assertion failed for the
  // right reason. A clause must appear exactly when its half is short, and must
  // name the real count when it does; the fixture's own injected item counts
  // toward that, which is why the totals are read off the compile.
  const pc = r.items.filter((i) => i.subject === 'ap_precalc')
  const half = r.errors.find((e) => /^ap_precalc: the bank holds/.test(e)) ?? ''
  for (const [kind, need, label] of [['mcq', 38, 'multiple choice'], ['frq', 4, 'free-response']]) {
    const held = pc.filter((i) => i.kind === kind).length
    const clause = new RegExp(`${held} of the ${need} ${label}`)
    if (held < need) {
      assert.match(half, clause, `the ${label} half holds ${held} of ${need} and the gate must say so: ${half}`)
    } else {
      assert.ok(
        !new RegExp(`of the ${need} ${label}`).test(half),
        `the ${label} half is supplied (${held} of ${need}), so the gate must not still report it short: ${half}`,
      )
    }
  }
})

test('38 declared MCQs and 4 declared FRQs make a Precalc sitting assemblable and scorable', () => {
  // The arithmetic the build once blocked on, walked to its end: what api.js's
  // partObstacle demands of each half (ceil(count x MIN_MOCK_COVERAGE)) against the
  // bank that holds them. This is the claim the format had to earn.
  const config = readinessConfigs().find((c) => c.subject === 'ap_precalc')
  const need = {
    mcq: Math.ceil(config.exam.mcq_count * MIN_MOCK_COVERAGE),
    frq: Math.ceil(config.exam.frq_count * MIN_MOCK_COVERAGE),
  }
  assert.deepEqual(need, { mcq: 38, frq: 4 })

  // RETIRED PRECONDITION: `assert.equal(before.errors.filter((e) => /the bank
  // holds/.test(e)).length, 1, 'precondition: today the bank supplies neither half')`,
  // followed by the same feasibility() call over the shipped bank PLUS 42 synthetic
  // items, to show what would happen if the packs ever supplied both halves.
  //
  // The packs now do. The content agents have written 38 multiple-choice and 4
  // free-response Precalc items, so that precondition demanded the bank stay unable
  // to assemble a sitting — the exact outcome this test was written to ask for — and
  // the synthetic 42 were standing in for content that exists. So the claim is made
  // about the real bank instead: both halves ARE supplied, and the feasibility gate
  // is silent on it. Nothing is softened; the floors are proved to be live below.
  const shipped = parseAll(read).items
  const held = Object.fromEntries(
    Object.keys(need).map((kind) => [kind, shipped.filter((i) => i.kind === kind).length]),
  )
  assert.ok(
    held.mcq >= need.mcq,
    `the packs must supply the multiple-choice half: ${held.mcq} of the ${need.mcq} a scorable section I needs`,
  )
  assert.ok(
    held.frq >= need.frq,
    `the packs must supply the free-response half: ${held.frq} of the ${need.frq} a scorable section II needs`,
  )
  const now = feasibility(shipped, config)
  assert.deepEqual(
    now.errors, [],
    `both halves are supplied and markable, so the gate must be silent: ${now.errors.join(' | ')}`,
  )
  assert.equal(now.warnings.length, 1, 'reuse across sittings weeks apart stays a warning, never an error')
  assert.match(now.warnings[0], /re-ask questions from earlier ones/)

  // AND EVERY FLOOR IS STILL LIVE. Each half is re-judged on a bank cut to one item
  // BELOW its own floor — short by construction, so this cannot go quiet however much
  // content is added later — and the gate must name that half's shortfall, with the
  // real numbers, and must not report the half that is still supplied. Cut to
  // `need - 1` rather than "drop one" for the same reason: dropping one item from a
  // bank of 50 MCQs would leave it comfortably above 38 and prove nothing.
  for (const [kind, label] of [['mcq', 'multiple choice'], ['frq', 'free-response']]) {
    const other = kind === 'mcq' ? 'frq' : 'mcq'
    const otherLabel = kind === 'mcq' ? 'free-response' : 'multiple choice'
    const cut = [
      ...shipped.filter((i) => i.kind !== kind),
      ...shipped.filter((i) => i.kind === kind).slice(0, need[kind] - 1),
    ]
    const short = feasibility(cut, config).errors.filter((e) => /the bank holds/.test(e))
    assert.equal(
      short.length, 1,
      `a bank holding ${need[kind] - 1} ${label} question(s) is below the floor of ${need[kind]} and the gate must ` +
        `say so exactly once, got ${JSON.stringify(short)}`,
    )
    assert.match(short[0], new RegExp(`${need[kind] - 1} of the ${need[kind]} ${label}`), short[0])
    assert.ok(
      !new RegExp(`of the ${need[other]} ${otherLabel}`).test(short[0]),
      `the ${otherLabel} half is still supplied, so the gate must not report it short: ${short[0]}`,
    )
  }
})
