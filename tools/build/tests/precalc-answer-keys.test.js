// The AP Precalculus answer-key syntax, and the ONE defect class it exists to
// avoid: a FALSE NEGATIVE — a right answer marked wrong.
//
// Every "grades CORRECT" test below runs the parser's own output through the real
// worker/src/grade.js, so what is asserted is the verdict a student would
// actually receive, not the parser's intent. A test that only checked
// `item.answer === '3'` would pass while normalizeShort turned the student's
// answer into something else entirely — which is exactly how ' x = 4. ' came to
// be graded wrong against a key of '4'.

import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { parsePracticeItems, parseAll, MIN_PER_UNIT } from '../parse-precalc.js'
import { compile } from '../build.js'
import { grade, normalizeShort } from '../../../worker/src/grade.js'

const read = (f) => readFileSync(f, 'utf8')
const U1 = 'unit-1-polynomial-rational.md'

/**
 * One P block, exactly as a pack writes it: header line, stem, solution in a
 * <details>, then any key metadata lines.
 */
function block({ n = 1, tagline = '(easy, no-calc).', stem = 'Find the AROC of $f(x)=3x-7$ on [2, 6].', solution = 'slope 3', meta = [] }) {
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

/** A pack holding just these blocks. */
const pack = (...blocks) => ['## 3. Practice set', '', ...blocks].join('\n')

/** Parse one block and return { item, errors }. */
function one(opts) {
  const r = parsePracticeItems(pack(block(opts)), U1)
  return { item: r.items[0], errors: r.errors, all: r }
}

/** The single error text, asserted to be the only one. */
function soleError(opts) {
  const { errors } = one(opts)
  assert.equal(errors.length, 1, `expected exactly one error, got ${JSON.stringify(errors)}`)
  return errors[0]
}

/** Assert this response is credited, and say what the student typed if not. */
function creditsOn(item, response) {
  const v = grade(item, response)
  assert.equal(
    v.correct,
    1,
    `FALSE NEGATIVE: ${JSON.stringify(response)} was marked wrong (graded_by=${v.graded_by}, ` +
      `detail=${v.detail}); normalizeShort gives ${JSON.stringify(normalizeShort(response))} against ` +
      `key ${JSON.stringify(item.answer)} and variants ${JSON.stringify(item.answer_variants)}`,
  )
  assert.equal(v.graded_by, 'server', 'a keyed item must be graded by the server, not routed to the model')
}

// ---------------------------------------------------------------------------
// Nothing regresses: no key, no change.
// ---------------------------------------------------------------------------

test('an item with no key block is untouched — model-graded, no key, no variants', () => {
  const { item, errors } = one({})
  assert.deepEqual(errors, [])
  assert.equal(item.kind, 'constructed_model_graded')
  assert.equal(item.answer, null)
  assert.deepEqual(item.answer_variants, [])
  assert.equal(item.topic, null, 'an untagged item leaves the topic to build.js’s <unit>.0 bucket')
  // And grade.js therefore routes it to the rubric exactly as it does today.
  assert.equal(grade(item, 'anything at all').graded_by, 'model')
})

test('every item in the shipped packs is either keyed and server-graded, or model-graded with a solution', () => {
  // Phrased as the INVARIANT rather than as "all 48 are model-graded", so it
  // still holds after the content agents key the items this syntax unblocks.
  const r = parseAll(read)
  assert.equal(r.items.length >= 48, true, `expected at least 48 items, got ${r.items.length}`)
  for (const it of r.items) {
    const keyed = it.answer != null && String(it.answer).trim() !== ''
    if (keyed) {
      assert.equal(it.kind, 'constructed', `${it.id} carries a key but is not server-graded`)
      assert.equal(grade(it, it.answer).correct, 1, `${it.id}: its own key does not grade as correct`)
    } else {
      assert.equal(it.kind, 'constructed_model_graded', `${it.id} has no key and must declare model grading`)
      assert.deepEqual(it.answer_variants, [], `${it.id} has variants but no key`)
    }
  }
})

// ---------------------------------------------------------------------------
// FALSE NEGATIVES on an atomic key.
// ---------------------------------------------------------------------------

test('FALSE NEGATIVE: an atomic key credits every spacing, casing and decoration a student types', () => {
  const { item, errors } = one({ meta: ['<!-- key: y = 2x - 1 -->'] })
  assert.deepEqual(errors, [])
  assert.equal(item.kind, 'constructed')
  for (const typed of [
    'y = 2x - 1',
    'y=2x-1',
    '  y  =  2x  -  1  ',
    'Y = 2X - 1',
    '2x-1',
    '2x - 1',
    'y = 2x - 1.',
    '$y = 2x - 1$',
    '$y=2x-1$',
    '\\left y = 2x - 1 \\right',
  ]) creditsOn(item, typed)
})

test('FALSE NEGATIVE: an "x =" prefix and a trailing period are credited — the bug this repo already shipped once', () => {
  // normalizeShort once stripped the anchored 'x =' BEFORE trimming, so
  // ' x = 4. ' normalized to 'x=4.' and was marked wrong against a key of '4'.
  // The key syntax must not reintroduce it from the content side.
  const { item } = one({ meta: ['<!-- key: 3 -->'] })
  for (const typed of ['3', ' 3 ', '3.', ' 3. ', 'x = 3', ' x = 3. ', 'answer = 3', '$3$', 'x=3']) {
    creditsOn(item, typed)
  }
})

test('FALSE NEGATIVE: a declared variant is credited exactly like the key', () => {
  const { item, errors } = one({ meta: ['<!-- key: 3 -->', '<!-- accept: AROC = 3 -->', '<!-- accept: slope 3 -->'] })
  assert.deepEqual(errors, [])
  for (const typed of ['3', 'AROC = 3', 'aroc=3', 'slope 3', 'Slope 3.']) creditsOn(item, typed)
})

test('FALSE NEGATIVE: a LaTeX key is credited in the plain form a student can actually type', () => {
  const { item, errors } = one({
    stem: 'Give the y-value of the hole of $f(x)=\\dfrac{(x-3)(x+2)}{(x-3)(x+3)}$ at $x=3$.',
    meta: ['<!-- key: \\dfrac{5}{6} -->', '<!-- accept: 5/6 -->'],
  })
  assert.deepEqual(errors, [])
  for (const typed of ['5/6', '5 / 6', '$5/6$', '\\dfrac{5}{6}', '$\\dfrac{5}{6}$', 'y = 5/6']) creditsOn(item, typed)
})

test('a wrong answer is still wrong, and a blank is still blank', () => {
  // The counterweight to every test above: acceptance must not become universal.
  const { item } = one({ meta: ['<!-- key: 3 -->', '<!-- accept: slope 3 -->'] })
  assert.equal(grade(item, '4').correct, 0)
  assert.equal(grade(item, 'slope 4').correct, 0)
  assert.equal(grade(item, '').blank, true)
  assert.equal(grade(item, '   ').blank, true)
})

// ---------------------------------------------------------------------------
// FALSE NEGATIVES on a compound, order-independent answer.
// ---------------------------------------------------------------------------

const ZEROS = {
  stem: 'Give the zeros and their multiplicities for $f(x)=(x+2)^3(x-1)^2$, and whether the graph crosses or bounces at each. Answer as a comma-separated list, e.g. -2 mult 3 crosses, 1 mult 2 bounces.',
  solution: '$x=-2$, multiplicity 3, crosses. $x=1$, multiplicity 2, bounces.',
  meta: [
    '<!-- part 1: -2 mult 3 crosses -->',
    '<!-- part 1: x=-2 mult 3 crosses -->',
    '<!-- part 1: -2 multiplicity 3 crosses -->',
    '<!-- part 2: 1 mult 2 bounces -->',
    '<!-- part 2: x=1 mult 2 bounces -->',
    '<!-- part 2: 1 multiplicity 2 bounces -->',
    '<!-- format: Answer as a comma-separated list, e.g. -2 mult 3 crosses, 1 mult 2 bounces. -->',
  ],
}

test('FALSE NEGATIVE: a compound answer typed in the other order is credited', () => {
  const { item, errors } = one(ZEROS)
  assert.deepEqual(errors, [])
  assert.equal(item.kind, 'constructed')
  creditsOn(item, '-2 mult 3 crosses, 1 mult 2 bounces')
  creditsOn(item, '1 mult 2 bounces, -2 mult 3 crosses')
})

test('FALSE NEGATIVE: a compound answer joined with "and", a semicolon or just spaces is credited', () => {
  const { item } = one(ZEROS)
  for (const typed of [
    '-2 mult 3 crosses and 1 mult 2 bounces',
    '1 mult 2 bounces and -2 mult 3 crosses',
    '-2 mult 3 crosses, and 1 mult 2 bounces',
    '-2 mult 3 crosses; 1 mult 2 bounces',
    '-2 mult 3 crosses 1 mult 2 bounces',
    '-2 mult 3 crosses,1 mult 2 bounces',
    '  -2 mult 3 crosses ,  1 mult 2 bounces .',
  ]) creditsOn(item, typed)
})

test('FALSE NEGATIVE: every declared phrasing of every part is credited, in either order', () => {
  const { item } = one(ZEROS)
  for (const typed of [
    'x=-2 mult 3 crosses, x=1 mult 2 bounces',
    'x=1 mult 2 bounces, x=-2 mult 3 crosses',
    '-2 multiplicity 3 crosses, 1 multiplicity 2 bounces',
    '1 multiplicity 2 bounces and -2 multiplicity 3 crosses',
    '$x=-2$ mult 3 crosses, $x=1$ mult 2 bounces',
    '1 mult 2 bounces, -2 multiplicity 3 crosses',
  ]) creditsOn(item, typed)
})

test('a compound answer missing one of its parts is NOT credited', () => {
  const { item } = one(ZEROS)
  assert.equal(grade(item, '-2 mult 3 crosses').correct, 0, 'half an answer is not a whole answer')
  assert.equal(grade(item, '-2 mult 3 bounces, 1 mult 2 crosses').correct, 0, 'the behaviours are swapped')
})

// ---------------------------------------------------------------------------
// Validation with teeth. Every one of these is a BUILD ERROR, because the
// alternative is an item that is silently unkeyed or, worse, mis-keyed.
// ---------------------------------------------------------------------------

test('a key that normalizes to nothing is a build ERROR', () => {
  for (const bad of ['<!-- key:  -->', '<!-- key: $$ -->', '<!-- key: x = -->', '<!-- key: \\left\\right -->']) {
    const err = soleError({ meta: [bad] })
    assert.match(err, /normali[sz]es to nothing|empty/i, `for ${bad}: ${err}`)
    assert.match(err, /pc-u1-p1/)
  }
})

test('a declared variant identical to the key after normalization is a build ERROR', () => {
  const err = soleError({ meta: ['<!-- key: y = 2x - 1 -->', '<!-- accept: y=2x-1 -->'] })
  assert.match(err, /accept/i)
  assert.match(err, /identical|same|already/i)
})

test('two identical declared variants are a build ERROR', () => {
  const err = soleError({ meta: ['<!-- key: 3 -->', '<!-- accept: slope 3 -->', '<!-- accept: slope  3 -->'] })
  assert.match(err, /accept/i)
})

test('a key on a stem that asks for reasoning is a build ERROR, not a graded string match', () => {
  const stems = [
    'Sketch the graph of $f(x)=x^3$.',
    'Explain why the estimate is too low.',
    'Give the horizontal asymptote and say what it means about the drug.',
    'Is the estimate too high or too low? Justify your answer.',
    'Describe the end behaviour in context.',
  ]
  for (const stem of stems) {
    const err = soleError({ stem, meta: ['<!-- key: 3 -->'] })
    assert.match(err, /model-graded/, `a stem that asks for prose must be pushed back to the rubric: ${err}`)
  }
})

test('a key on a stem with lettered sub-parts is a build ERROR', () => {
  const err = soleError({
    stem: '(a) Solve $\\log_2(8x)=5$. (b) Condense $\\log_3 x + 2\\log_3 3$ into a single log.',
    meta: ['<!-- key: 4 -->'],
  })
  assert.match(err, /sub-part|\(a\)/i)
  assert.match(err, /model-graded/)
})

test('a key that carries its own label is a build ERROR — the student types the bare value', () => {
  // 'HA: y = 0' normalizes to 'ha: y=0'. normalizeShort strips only 'x =',
  // 'y =', 'f(x) =' and 'answer =', so a student who types 'y = 0' — or just
  // '0' — normalizes to '0' and is marked WRONG against the labelled key.
  for (const bad of ['<!-- key: HA: y = 0 -->', '<!-- key: g(x) = 2x -->', '<!-- key: slant asymptote = y = 2x - 1 -->']) {
    const err = soleError({ meta: [bad] })
    assert.match(err, /label/i, `for ${bad}: ${err}`)
  }
  // ...while the bare value with the labelled form as a VARIANT is correct, and
  // both spellings are credited.
  const { item, errors } = one({ meta: ['<!-- key: y = 0 -->', '<!-- accept: HA: y = 0 -->'] })
  assert.deepEqual(errors, [])
  creditsOn(item, '0')
  creditsOn(item, 'y = 0')
  creditsOn(item, 'HA: y = 0')
})

test('a key with no plain-ASCII form a student could type is a build ERROR', () => {
  for (const bad of ['<!-- key: \\dfrac{5}{6} -->', '<!-- key: π/2 -->', '<!-- key: y = 2x − 1 -->']) {
    const err = soleError({ meta: [bad] })
    assert.match(err, /type|ASCII/i, `for ${bad}: ${err}`)
  }
  // Declaring the typeable form clears it.
  assert.deepEqual(one({ meta: ['<!-- key: π/2 -->', '<!-- accept: pi/2 -->'] }).errors, [])
})

test('an unknown or misspelled key field is a build ERROR, never silently ignored', () => {
  // The failure this repo has already lived through is a parser that found 22 of
  // 48 problems and reported success. A key the build cannot read must be loud.
  for (const bad of [
    '<!-- keys: 3 -->',
    '<!-- key = 3 -->',
    '<!-- answer: 3 -->',
    '<!-- variants: 3 -->',
    '<!-- tolerance: 0.01 -->',
    '<!-- kind: constructed -->',
  ]) {
    const err = soleError({ meta: [bad] })
    assert.match(err, /key|field/i, `for ${bad}: ${err}`)
  }
  // Field names are case-insensitive, though: an author who capitalises one has
  // made no mistake, and refusing it would be a build failure with no defect
  // behind it.
  assert.deepEqual(one({ meta: ['<!-- Key: 3 -->', '<!-- Accept: slope 3 -->'] }).errors, [])
  assert.equal(one({ meta: ['<!-- Key: 3 -->'] }).item.answer, '3')
})

test('a visible, non-comment key line is a build ERROR', () => {
  // It would also be a spoiler: the pack renders it right next to the question.
  for (const bad of ['**Key:** 3', 'Answer key: 3', 'key: 3']) {
    const err = soleError({ meta: [bad] })
    assert.match(err, /<!--/, `the fix is the comment form: ${err}`)
  }
  // ...but the same words INSIDE the solution are prose, hidden behind the
  // <details>, and must not fail a build.
  const { item, errors } = one({ solution: '**Answer:** y = 2x - 1, by long division.' })
  assert.deepEqual(errors, [])
  assert.match(item.solution, /\*\*Answer:\*\* y = 2x - 1/)
})

test('declaring both an atomic key and compound parts is a build ERROR', () => {
  const err = soleError({ meta: ['<!-- key: 3 -->', '<!-- part 1: 3 -->', '<!-- part 2: 4 -->'] })
  assert.match(err, /both/i)
})

test('compound parts without a format sentence the stem actually states are a build ERROR', () => {
  const noFormat = soleError({ meta: ['<!-- part 1: a -->', '<!-- part 2: b -->'] })
  assert.match(noFormat, /format/i)

  const notInStem = soleError({
    stem: 'Give the zeros and their multiplicities.',
    meta: ['<!-- part 1: a -->', '<!-- part 2: b -->', '<!-- format: Answer as a, b -->'],
  })
  assert.match(notInStem, /stem/i)
  assert.match(notInStem, /format/i)
})

test('a part that contains a comma is a build ERROR — it cannot be told from the separator', () => {
  const err = soleError({
    stem: 'Give the hole. Answer as a, b',
    meta: ['<!-- part 1: 3, 5/6 -->', '<!-- part 2: b -->', '<!-- format: Answer as a, b -->'],
  })
  assert.match(err, /comma/i)
})

test('part numbers must start at 1 and be contiguous', () => {
  const err = soleError({
    stem: 'Give it. Answer as a, b',
    meta: ['<!-- part 1: a -->', '<!-- part 3: b -->', '<!-- format: Answer as a, b -->'],
  })
  assert.match(err, /part/i)
  assert.match(err, /2/)
})

test('one part alone is a build ERROR — that is an atomic key wearing a costume', () => {
  const err = soleError({ stem: 'Give it. Answer as a', meta: ['<!-- part 1: a -->', '<!-- format: Answer as a -->'] })
  assert.match(err, /key:/)
})

test('a key appended to the header line is a build ERROR, not a spoiler in the stem', () => {
  // The header line is the one line the body slice does not cover, so a key
  // written there would have been read by nothing and rendered as part of the
  // question.
  const r = parsePracticeItems(
    ['**P1 (easy, no-calc).** Find the AROC of $f(x)=3x-7$ on [2, 6]. <!-- key: 3 -->',
      '<details><summary>Solution</summary>',
      '',
      'slope 3',
      '</details>',
      ''].join('\n'),
    U1,
  )
  assert.equal(r.errors.length, 1, JSON.stringify(r.errors))
  assert.match(r.errors[0], /its own line/i)
  assert.equal(r.items[0].answer, null, 'and it is left model-graded rather than half-keyed')
})

test('a key declaration split across lines is a build ERROR', () => {
  const err = soleError({ meta: ['<!--', 'key: 3', '-->'] })
  assert.match(err, /its own line/i)
})

test('two key fields crammed onto one line is a build ERROR, not a garbage key', () => {
  // The comment body is lazy and its tail is anchored, so the two comments match
  // as one: the key would become '3 --> <!-- accept: 4', which no student could
  // type — a keyed item that marks every answer wrong.
  const err = soleError({ meta: ['<!-- key: 3 --> <!-- accept: 4 -->'] })
  assert.match(err, /one key field/i)
  assert.equal(one({ meta: ['<!-- key: 3 --> <!-- accept: 4 -->'] }).item.answer, null, 'and no key is written')
})

test('the same field declared twice is a build ERROR', () => {
  const err = soleError({ meta: ['<!-- key: 3 -->', '<!-- key: 4 -->'] })
  assert.match(err, /once|twice|only one/i)
  assert.equal(one({ meta: ['<!-- key: 3 -->', '<!-- key: 4 -->'] }).item.answer, null)
})

test('the accepted forms of a compound answer are capped, so a build cannot explode', () => {
  const parts = []
  for (let p = 1; p <= 4; p++) {
    for (let a = 0; a < 6; a++) parts.push(`<!-- part ${p}: p${p}a${a} -->`)
  }
  const err = soleError({
    stem: 'Give it. Answer as a, b, c, d',
    meta: [...parts, '<!-- format: Answer as a, b, c, d -->'],
  })
  assert.match(err, /too many|cap/i)
})

// ---------------------------------------------------------------------------
// The optional topic tag.
// ---------------------------------------------------------------------------

test('a declared topic replaces the <unit>.0 placeholder bucket', () => {
  const { item, errors } = one({ meta: ['<!-- topic: 1.4 -->'] })
  assert.deepEqual(errors, [])
  assert.equal(item.topic, '1.4')
  // A topic tag is independent of a key: an item may be tagged and still be
  // model-graded, which is what fixes topic COVERAGE without claiming a key.
  assert.equal(item.kind, 'constructed_model_graded')
})

test('a topic from another unit is a build ERROR', () => {
  // '2.3' exists in the Precalc matrix, so validate.js would accept it happily
  // while to-sql.js derived unit 2 for an item the pack puts in unit 1.
  const err = soleError({ meta: ['<!-- topic: 2.3 -->'] })
  assert.match(err, /unit/i)
})

test('a malformed topic id is a build ERROR', () => {
  for (const bad of ['<!-- topic: 1 -->', '<!-- topic: one.four -->', '<!-- topic: 1.4.2 -->']) {
    const err = soleError({ meta: [bad] })
    assert.match(err, /topic/i, `for ${bad}: ${err}`)
  }
})

test('a declared topic survives into the compiled build instead of the bucket', () => {
  // This used to inject `<!-- topic: 1.4 -->` into P3 in memory, because no shipped
  // item declared a topic. P3 now declares that topic in the pack itself, so the
  // injection would be a SECOND declaration of the same field (a build error), and
  // the real content is the better fixture anyway: what is asserted below is that
  // build.js honours the pack's declared topic rather than bucketing the item at
  // `1.0`, read off the compiled artifact.
  const r = compile()
  const p3 = r.items.find((i) => i.id === 'pc-u1-p3')
  assert.equal(p3.topic, '1.4', 'build.js must honour the declared topic over UNTAGGED(unit)')
  assert.notEqual(p3.topic, '1.0', 'and must not fall back to the placeholder bucket for a tagged item')
  assert.equal(
    r.errors.some((e) => /pc-u1-p3/.test(e)),
    false,
    `a legitimately tagged item must not trip a gate: ${r.errors.filter((e) => /pc-u1-p3/.test(e)).join(' | ')}`,
  )
})

// ---------------------------------------------------------------------------
// The metadata is metadata: it never reaches the student.
// ---------------------------------------------------------------------------

test('key metadata never leaks into the stem or the solution, wherever it is written', () => {
  const meta = ['<!-- key: 3 -->', '<!-- accept: slope 3 -->', '<!-- topic: 1.1 -->']
  // After the </details>, which is the documented placement...
  const after = one({ meta })
  // ...and before it, which an author will do anyway.
  const before = parsePracticeItems(
    pack([
      '**P1 (easy, no-calc).** Find the AROC of $f(x)=3x-7$ on [2, 6].',
      ...meta,
      '<details><summary>Solution</summary>',
      '',
      'slope 3',
      '</details>',
      '',
    ].join('\n')),
    U1,
  )
  for (const item of [after.item, before.items[0]]) {
    assert.equal(item.answer, '3')
    assert.equal(item.topic, '1.1')
    for (const field of ['stem', 'solution', 'explanation']) {
      assert.ok(!/<!--|-->/.test(item[field]), `${field} still carries the raw comment: ${item[field]}`)
      assert.ok(!/\bkey:/i.test(item[field]), `${field} spoils the key: ${item[field]}`)
    }
    assert.match(item.stem, /Find the AROC/)
    assert.match(item.solution, /slope 3/)
  }
  assert.deepEqual(before.errors, [])
})

test('a keyed item passes every build gate, and grade.js marks it from the compiled artifact', () => {
  // The end-to-end proof: markdown -> parser -> build.js -> validate.js -> the
  // item object as items.json holds it -> grade.js's verdict. Every earlier test
  // stops at the parser, and the parser is not the thing that has to agree.
  //
  // The key used to be injected into P6 in memory. P6 now declares it in the pack,
  // so injecting it again would be a duplicate `key:` field — and reading the
  // shipped key is a stronger test than reading one this file wrote.
  const r = compile()
  const p6 = r.items.find((i) => i.id === 'pc-u1-p6')

  assert.equal(p6.kind, 'constructed', 'a keyed item must be server-graded')
  assert.equal(p6.answer, 'y = 2x - 1')
  assert.equal(p6.topic, '1.7')
  assert.deepEqual(
    r.errors.filter((e) => /pc-u1-p6/.test(e)),
    [],
    'a correctly keyed item must not trip a single gate',
  )
  for (const typed of ['y = 2x - 1', 'y=2x-1', '2x - 1', ' y = 2x - 1. ', '$y=2x-1$']) creditsOn(p6, typed)
  assert.equal(grade(p6, 'y = 2x + 1').correct, 0)
})

// ---------------------------------------------------------------------------
// Structure: a unit may GAIN items, but never lose one.
// ---------------------------------------------------------------------------

test('a unit may gain items without failing the build', () => {
  const real = read(`ap_precalc/study-packs/${U1}`)
  const grown = `${real}\n${block({ n: 13, stem: 'A brand new problem.', solution: 'the solution' })}`
  const r = parseAll((f) => (f.includes(U1) ? grown : read(f)))
  assert.equal(r.items.filter((i) => i.unit === '1').length, 13)
  assert.deepEqual(
    r.errors.filter((e) => e.includes(U1)),
    [],
    'adding a 13th problem must not be an error — the old check asserted exactly 12',
  )
})

test('a unit that LOSES an item is still a build ERROR', () => {
  const real = read(`ap_precalc/study-packs/${U1}`)
  const short = real.replace(/\*\*P12 [\s\S]*$/, '')
  assert.notEqual(short, real, 'the fixture substitution must actually apply')
  const r = parseAll((f) => (f.includes(U1) ? short : read(f)))
  assert.equal(r.items.filter((i) => i.unit === '1').length, 11)
  assert.ok(
    r.errors.some((e) => e.includes(U1) && new RegExp(String(MIN_PER_UNIT)).test(e)),
    `expected a per-unit minimum error, got: ${JSON.stringify(r.errors)}`,
  )
})

test('a MISSING P number is a build ERROR even when the count clears the minimum', () => {
  // The blind spot a bare count leaves: renumber P7 to P13 and unit 1 still has
  // 12 items, all with unique ids, while P7 has vanished from the pack.
  const real = read(`ap_precalc/study-packs/${U1}`)
  const gapped = real.replace('**P7 (medium, no-calc).**', '**P13 (medium, no-calc).**')
  assert.notEqual(gapped, real, 'the fixture substitution must actually apply')
  const r = parseAll((f) => (f.includes(U1) ? gapped : read(f)))
  assert.equal(r.items.filter((i) => i.unit === '1').length, 12, 'the count check is satisfied — the blind spot')
  assert.ok(
    r.errors.some((e) => e.includes(U1) && /\bP7\b/.test(e)),
    `expected a numbering gap error naming P7, got: ${JSON.stringify(r.errors)}`,
  )
})

test('the shipped packs pass every structural check', () => {
  const r = parseAll(read)
  assert.deepEqual(r.errors, [], 'the real content must be clean under the new checks')
})
