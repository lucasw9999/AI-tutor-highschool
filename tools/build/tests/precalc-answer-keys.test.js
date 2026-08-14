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

/**
 * Unicode and LaTeX folded to the ASCII a key is written in, so a key can be
 * looked for in the prose of the worked solution: the packs write "−√2/2" and
 * "$\dfrac{5}{6}$" where a key says "-sqrt(2)/2" and "5/6".
 */
const folded = (text) =>
  String(text)
    .toLowerCase()
    .replace(/[−–—]/g, '-')
    .replace(/π/g, 'pi')
    .replace(/√/g, 'sqrt')
    .replace(/[·⋅×]/g, '*')
    .replace(/\\[a-z]?frac\{([^{}]*)\}\{([^{}]*)\}/g, '$1/$2')
    .replace(/\\[a-z]+/g, '')

const squeezed = (text) => folded(text).replace(/[$*`{}()[\]\s]/g, '')
const wordsOf = (text) =>
  folded(text)
    .split(/[\s,;:]+/)
    .map((w) => w.replace(/[$*`{}()[\]]/g, ''))
    .filter(Boolean)

/**
 * True when some accepted form of this item's key is traceable to the worked
 * solution the author wrote — every word of it appearing somewhere in that
 * solution's prose.
 *
 * Deliberately weak, and it is the strongest thing a test can say about a key
 * without re-deriving the mathematics: it cannot tell a right answer from a
 * plausible wrong one. What it does catch is a key with NO relationship to the
 * item, which is the whole failure class `grade(it, it.answer)` hid.
 */
const groundedInSolution = (item) => {
  const solution = squeezed(item.solution ?? '')
  return [item.answer, ...(item.answer_variants ?? [])].some((form) =>
    wordsOf(form).every((word) => solution.includes(squeezed(word))),
  )
}

/** The spellings of its own key a STUDENT types, which are not the key itself. */
const studentSpellings = (item) =>
  item.kind === 'mcq'
    ? [item.answer.toLowerCase(), `(${item.answer})`, `${item.answer})`, `${item.answer}.`]
    : [` ${item.answer} `, `${item.answer}.`, `$${item.answer}$`, item.answer.toUpperCase()]

test('every item in the shipped packs is either keyed and server-graded, or model-graded with a solution', () => {
  // Phrased as the INVARIANT rather than as "all 48 are model-graded", so it
  // still holds after the content agents key the items this syntax unblocks —
  // and after they declare the multiple-choice and free-response questions
  // parse-precalc.js's other two declarations unblock, which is why the kinds are
  // named as SETS: 'mcq' is server-graded by letter and 'frq' is rubric-scored by
  // design, so pinning 'constructed' and 'constructed_model_graded' here would
  // fail the first declared half of a paper for doing exactly what it should.
  const SERVER_GRADED = new Set(['constructed', 'mcq'])
  const MODEL_GRADED_KINDS = new Set(['constructed_model_graded', 'frq'])
  const r = parseAll(read)
  assert.equal(r.items.length >= 48, true, `expected at least 48 items, got ${r.items.length}`)
  for (const it of r.items) {
    const keyed = it.answer != null && String(it.answer).trim() !== ''
    if (keyed) {
      assert.ok(SERVER_GRADED.has(it.kind), `${it.id} carries a key but its kind '${it.kind}' is not server-graded`)
      // `assert.equal(grade(it, it.answer).correct, 1)` used to stand here, and
      // it is a TAUTOLOGY on a constructed item: grade() builds its accepted set
      // as [answer, ...variants].map(normalizeShort) and compares
      // normalizeShort(response), so with response === it.answer both sides are
      // the same expression. It passed on a deliberate key of "qqzzx nonsense 99"
      // declared on an item whose answer is 3, with 0 build errors, while the
      // student who typed "3" was marked WRONG. Two assertions with content
      // replace it: the key is credited as a STUDENT spells it, which exercises
      // normalizeShort and the variant set rather than one expression against
      // itself; and the key is grounded in the worked solution.
      for (const typed of studentSpellings(it)) creditsOn(it, typed)
      if (it.kind === 'mcq') {
        // A letter cannot be grounded in prose. The multiple-choice equivalent
        // is that the keyed choice's own TEXT resolves to the choice it is
        // printed against — the reading a student who types the answer rather
        // than the label depends on.
        creditsOn(it, String(it.options[it.answer]).trim())
      } else {
        assert.ok(
          groundedInSolution(it),
          `${it.id}: no accepted form of the key ${JSON.stringify(it.answer)} appears in the worked solution, so ` +
            `nothing in the pack says this is the answer: ${JSON.stringify(it.solution)}`,
        )
      }
    } else {
      assert.ok(MODEL_GRADED_KINDS.has(it.kind), `${it.id} has no key, so its kind '${it.kind}' must be model-graded`)
      assert.deepEqual(it.answer_variants, [], `${it.id} has variants but no key`)
    }
  }
})

test('a key with nothing behind it in the solution fails the shipped-bank invariant', () => {
  // The proof that the invariant above is no longer a tautology. This is the
  // audit's own construction: a nonsense key on pc-u1-p14, whose answer is 4.
  const nonsense = parsePracticeItems(
    pack(block({ stem: 'Find $f(2)+f(-1)$.', solution: '$f(2)+f(-1)=3+1=\\mathbf{4}$.', meta: ['<!-- key: qqzzx nonsense 99 -->'] })),
    U1,
  ).items[0]
  assert.deepEqual(nonsense.answer, 'qqzzx nonsense 99', 'the parser cannot know it is nonsense — no gate can')
  assert.equal(grade(nonsense, nonsense.answer).correct, 1, 'which is exactly why comparing it to itself proves nothing')
  assert.equal(groundedInSolution(nonsense), false, 'but nothing in the worked solution says it')
  assert.equal(grade(nonsense, '4').correct, 0, 'and the student who is right is marked wrong')
  // ...while the real key of the same item is grounded, and credits him.
  const real = parsePracticeItems(
    pack(block({ stem: 'Find $f(2)+f(-1)$.', solution: '$f(2)+f(-1)=3+1=\\mathbf{4}$.', meta: ['<!-- key: 4 -->'] })),
    U1,
  ).items[0]
  assert.equal(groundedInSolution(real), true)
  creditsOn(real, '4')
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
// FALSE POSITIVES on a compound answer: the direction the expander was never
// tested in. Every test above asks "is this right answer credited?"; these ask
// "is this WRONG answer refused?", which is the question a permutation of an
// ORDER-SIGNIFICANT answer poses. "we can't fault any mistake if we say it's
// good" — crediting the swap is the same lie as marking a right answer wrong,
// pointing the other way.
// ---------------------------------------------------------------------------

/** The shipped bank, compiled once: the items a student is actually served. */
let SHIPPED
const shipped = (id) => {
  SHIPPED ??= compile()
  const it = SHIPPED.items.find((i) => i.id === id)
  assert.ok(it, `${id} is not in the compiled bank`)
  return it
}

/**
 * Assert this response is REFUSED, and by the server rather than by falling off
 * the keyed path: an item that quietly became model-graded would "refuse"
 * everything, which is not the same thing at all.
 */
function refusesOn(item, response, why) {
  const v = grade(item, response)
  assert.equal(
    v.correct,
    0,
    `FALSE POSITIVE: ${JSON.stringify(response)} was CREDITED on ${item.id ?? 'the item'} — ${why}. ` +
      `normalizeShort gives ${JSON.stringify(normalizeShort(response))}; the key is ` +
      `${JSON.stringify(item.answer)}`,
  )
  assert.equal(v.graded_by, 'server', 'a keyed item must still be graded by the server')
}

test('FALSE POSITIVE: a permutation of an order-declared answer is refused, on the shipped items', () => {
  // Each stem states the order in so many words, so the position of a value is
  // part of the claim it makes. "-2, 4, 2pi/3" on 4sin(3x)-2 says the amplitude
  // is -2 and the midline is 4: THE canonical mistake this item exists to catch.
  const p2 = shipped('pc-u3-p2')
  creditsOn(p2, '4, -2, 2pi/3')
  refusesOn(p2, '-2, 4, 2pi/3', 'amplitude and midline swapped')
  refusesOn(p2, '2pi/3, 4, -2', 'all three rotated')
  refusesOn(p2, 'amplitude -2, midline 4, period 2pi/3', 'swapped, and labelled with the swap')

  const p1 = shipped('pc-u3-p1')
  creditsOn(p1, '3pi/4, -sqrt(2)/2')
  refusesOn(p1, '-sqrt(2)/2, 3pi/4', 'the radian measure and the cosine swapped')

  const p5 = shipped('pc-u3-p5')
  creditsOn(p5, '5pi/6, -pi/4')
  refusesOn(p5, '-pi/4, 5pi/6', 'arccos and arctan swapped')
})

test('FALSE POSITIVE: bare values with a declared order credit that order and no other', () => {
  const ORDERED = {
    stem: 'State the amplitude and the midline of $f(x)=4\\sin(3x)-2$. Answer as two comma-separated values in that order.',
    solution: 'amplitude 4, midline -2',
    meta: [
      '<!-- part 1: 4 -->',
      '<!-- part 2: -2 -->',
      '<!-- format: Answer as two comma-separated values in that order. -->',
    ],
  }
  const { item, errors } = one(ORDERED)
  assert.deepEqual(errors, [])
  assert.equal(item.kind, 'constructed')
  creditsOn(item, '4, -2')
  creditsOn(item, '4 and -2')
  refusesOn(item, '-2, 4', 'the two values swapped, on a stem that states the order')
  refusesOn(item, '-2 and 4', 'the two values swapped')
})

test('a genuine solution set stays order-free — every ordering is the same answer', () => {
  // pc-u3-p8 solves 2sin^2x - sinx - 1 = 0 on [0, 2pi): the three parts are a
  // SET, so no ordering of them is a different claim. The fix for the ordered
  // items must not cost this item a single form.
  const p8 = shipped('pc-u3-p8')
  for (const typed of [
    'pi/2, 7pi/6, 11pi/6',
    '7pi/6, 11pi/6, pi/2',
    '11pi/6, 7pi/6, pi/2',
    'pi/2, 11pi/6, 7pi/6',
    'x=pi/2, 7pi/6, 11pi/6',
  ]) creditsOn(p8, typed)
})

test('self-labelling parts stay order-free even where the stem states an order', () => {
  // The parts name themselves, so a reordering asserts exactly the same facts
  // and marking it wrong would be a false negative. Two shipped items whose
  // format sentence says "then" / "in this form", and which must keep every
  // ordering they credit today.
  const p7 = shipped('pc-u1-p7')
  creditsOn(p7, 'overestimate, increasing')
  creditsOn(p7, 'increasing, overestimate')

  const p5 = shipped('pc-u1-p5')
  creditsOn(p5, 'hole at x=3, VA at x=-3, HA y=1')
  creditsOn(p5, 'HA y=1, hole at x=3, VA at x=-3')
  creditsOn(p5, 'VA at x=-3, HA at y=1, hole: x=3')

  const u2p1 = shipped('pc-u2-p1')
  creditsOn(u2p1, 'exponential, y=50(0.8)^x')
  creditsOn(u2p1, 'y=50(0.8)^x, exponential')
})

test('bare-value parts whose format states NEITHER an order nor a set are a build ERROR', () => {
  // The fail-safe direction: with nothing in the parts to tell them apart and
  // nothing in the sentence the student was given, the parser cannot know
  // whether "-2, 4" is a right answer or the classic wrong one — so it refuses
  // the key instead of guessing, and the item degrades to model-graded.
  const err = soleError({
    stem: 'State the amplitude and the midline of $f(x)=4\\sin(3x)-2$. Answer as two comma-separated values.',
    solution: 'amplitude 4, midline -2',
    meta: [
      '<!-- part 1: 4 -->',
      '<!-- part 2: -2 -->',
      '<!-- format: Answer as two comma-separated values. -->',
    ],
  })
  assert.match(err, /order/i)
  assert.match(err, /in that order|in any order/, `the diagnostic must state both vocabularies: ${err}`)
  assert.equal(
    one({
      stem: 'State the amplitude and the midline of $f(x)=4\\sin(3x)-2$. Answer as two comma-separated values.',
      meta: ['<!-- part 1: 4 -->', '<!-- part 2: -2 -->', '<!-- format: Answer as two comma-separated values. -->'],
    }).item.answer,
    null,
    'and no key is written, so --write-despite-incomplete cannot ship the guess',
  )
})

test('"in any order" on bare-value parts credits every ordering', () => {
  const { item, errors } = one({
    stem: 'Solve $\\sin x = 1/2$ on $[0, 2\\pi)$. Answer as a comma-separated list in any order.',
    solution: 'pi/6, 5pi/6',
    meta: [
      '<!-- part 1: pi/6 -->',
      '<!-- part 2: 5pi/6 -->',
      '<!-- format: Answer as a comma-separated list in any order. -->',
    ],
  })
  assert.deepEqual(errors, [])
  creditsOn(item, 'pi/6, 5pi/6')
  creditsOn(item, '5pi/6, pi/6')
})

test('a format sentence claiming both an order and any order is a build ERROR', () => {
  const err = soleError({
    stem: 'State them. Answer as two comma-separated values in that order, in any order.',
    meta: [
      '<!-- part 1: 4 -->',
      '<!-- part 2: -2 -->',
      '<!-- format: Answer as two comma-separated values in that order, in any order. -->',
    ],
  })
  assert.match(err, /both|contradic/i)
})

// ---------------------------------------------------------------------------
// How the parts are JOINED. Two defects lived here, pointing opposite ways: a
// separator that vanished and fused two parts into one number that answers
// neither, and the ordinary English list — commas between, a conjunction before
// the last — which no item with three parts could ever generate.
// ---------------------------------------------------------------------------

test('FALSE POSITIVE: a separator that fuses the parts into one expression is not generated', () => {
  // "5pi/6 - pi/4" is a SUBTRACTION: 7pi/12, one number answering neither
  // arccos(-sqrt3/2) nor arctan(-1). normalizeShort strips the whitespace around
  // the operator, so a space-joined "5pi/6" + "-pi/4" normalizes to exactly what
  // the student typed, and 14 such forms shipped as accepted answers.
  const p5 = shipped('pc-u3-p5')
  refusesOn(p5, '5pi/6 - pi/4', 'the two parts fused into a subtraction')
  refusesOn(p5, '5pi/6-pi/4', 'the same fusion, typed without spaces')
  refusesOn(p5, '5pi/6 -pi/4', 'the space-joined form the expander used to emit')

  const p1 = shipped('pc-u3-p1')
  refusesOn(p1, '3pi/4 - sqrt(2)/2', 'the two parts fused into a subtraction')
  refusesOn(p1, '3pi/4 -sqrt(2)/2', 'the space-joined form the expander used to emit')
  for (const it of [p1, p5]) {
    const fused = (it.answer_variants ?? []).filter((f) => !/[,;]| and /.test(f) && /\s-/.test(f))
    assert.deepEqual(fused, [], `${it.id} still ships space-joined forms that read as a subtraction`)
  }
})

test('a space between two parts still joins them where nothing can fuse', () => {
  // The counterweight: the run-on join is only dropped where normalizeShort
  // would eat it. Two words with a space between them are still two words.
  creditsOn(shipped('pc-u1-p7'), 'overestimate increasing')
  creditsOn(shipped('pc-u2-p1'), 'exponential y=50(0.8)^x')
  creditsOn(shipped('pc-u3-p8'), 'pi/2 7pi/6 11pi/6')
})

test('FALSE NEGATIVE: the ordinary English list is credited on every three-part item', () => {
  // commas between the entries, a conjunction before the last. Every shipped
  // three-part item booked this as a MISS — counted against the student, fed
  // into gap detection and into readiness.
  for (const [id, typed] of [
    ['pc-u1-p5', 'hole at x=3, VA at x=-3, and HA y=1'],
    ['pc-u1-p5', 'hole at x=3, VA at x=-3 and HA y=1'],
    ['pc-u3-p2', '4, -2, and 2pi/3'],
    ['pc-u3-p2', '4, -2 and 2pi/3'],
    ['pc-u3-p8', 'pi/2, 7pi/6, and 11pi/6'],
    ['pc-u3-p8', 'pi/2, 7pi/6 and 11pi/6'],
  ]) creditsOn(shipped(id), typed)
})

/** Three parts that label themselves, so every ordering is the same answer. */
const FEATURES = {
  stem: 'For $f(x)=\\dfrac{x^2-x-6}{x^2-9}$ find the hole, the vertical asymptote and the horizontal asymptote. Answer as three comma-separated entries in this form: hole at x=5, VA at x=6, HA y=7.',
  solution: 'hole at $x=3$, VA at $x=-3$, HA $y=1$',
  meta: [
    '<!-- part 1: hole at x=3 -->',
    '<!-- part 2: VA at x=-3 -->',
    '<!-- part 3: HA y=1 -->',
    '<!-- format: Answer as three comma-separated entries in this form: hole at x=5, VA at x=6, HA y=7. -->',
  ],
}

test('THREE parts: every ordering, joined every way a student writes a list', () => {
  // The first three-part fixture in this suite. Every positive compound fixture
  // was two parts, where "a, b and c" and "a, and b, and c" cannot be told
  // apart — which is why a list scheme was never missed.
  const { item, errors } = one(FEATURES)
  assert.deepEqual(errors, [])
  assert.equal(item.kind, 'constructed')
  for (const typed of [
    'hole at x=3, VA at x=-3, HA y=1',
    'hole at x=3, VA at x=-3, and HA y=1',
    'hole at x=3, VA at x=-3 and HA y=1',
    'hole at x=3; VA at x=-3; HA y=1',
    'hole at x=3 and VA at x=-3 and HA y=1',
    'HA y=1, hole at x=3, and VA at x=-3',
    'VA at x=-3, HA y=1 and hole at x=3',
    'HA y=1, VA at x=-3, hole at x=3',
  ]) creditsOn(item, typed)
  // ...and the whole answer is still the whole answer.
  assert.equal(grade(item, 'hole at x=3, VA at x=-3').correct, 0, 'two thirds of an answer is not the answer')
})

test('THREE bare values in a declared order: the list forms, that order only', () => {
  const AMP = {
    stem: 'State the amplitude, midline and period of $f(x)=4\\sin(3x)-2$. Answer as three comma-separated values in the order amplitude, midline, period.',
    solution: 'amplitude 4, midline -2, period 2pi/3',
    meta: [
      '<!-- part 1: 4 -->',
      '<!-- part 2: -2 -->',
      '<!-- part 3: 2pi/3 -->',
      '<!-- format: Answer as three comma-separated values in the order amplitude, midline, period. -->',
    ],
  }
  const { item, errors } = one(AMP)
  assert.deepEqual(errors, [])
  for (const typed of ['4, -2, 2pi/3', '4, -2, and 2pi/3', '4, -2 and 2pi/3', '4; -2; 2pi/3']) creditsOn(item, typed)
  for (const typed of ['-2, 4, 2pi/3', '2pi/3, -2, 4', '-2, 4, and 2pi/3', '4, 2pi/3 and -2']) {
    refusesOn(item, typed, 'a swap on a stem that states the order')
  }
})

test('the forms nobody writes are not spent, which is what pays for the ones everybody writes', () => {
  // A DELIBERATE narrowing, recorded so it is not "fixed" back: joining every
  // gap with ", and " produced "4, and -2, and 2pi/3" — 444 of the 2612 forms
  // the bank shipped, on a shape no student types — and the cap at 1000 forms
  // has room for the English list only because that shape is gone. Same for the
  // run-on join between multi-word entries, which cannot be read back as a list.
  const { item } = one(FEATURES)
  assert.equal(grade(item, 'hole at x=3, and VA at x=-3, and HA y=1').correct, 0)
  assert.equal(grade(item, 'hole at x=3 VA at x=-3 HA y=1').correct, 0)
  // Single-word parts keep the run-on join, because the gaps are still findable.
  creditsOn(shipped('pc-u3-p8'), '7pi/6 pi/2 11pi/6')
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

test('an HTML comment that declares NO field is a build ERROR, never a dropped key', () => {
  // The colon is what DECLARATION matches on, so one typo turned a key into a
  // comment that named nothing — and a comment that names nothing was kept as
  // invisible body text and dropped. No error, no key, and an item that says
  // "model-graded" while the markdown says otherwise: exactly the failure this
  // file's own invariant forbids ("never a silently unkeyed item, which is how a
  // parser once found 22 of 48 problems and reported success").
  for (const bad of ['<!-- key 4 -->', '<!-- accept 4 -->', '<!-- topic 1.4 -->', '<!-- part 1 3pi/4 -->']) {
    const err = soleError({ meta: [bad] })
    assert.match(err, /declar|field/i, `for ${bad}: ${err}`)
    assert.match(err, /:/, `the diagnostic must show the colon that is missing: ${err}`)
  }
  // The worse half: a typo on ONE part of a compound answer left the other parts
  // contiguous, so every gate passed and the item shipped keyed on 2 of its 3
  // parts — the COMPLETE right answer marked wrong, the incomplete one credited.
  const r = parsePracticeItems(
    pack(
      block({
        stem: 'State the amplitude, midline and period of $f(x)=4\\sin(3x)-2$. Answer as three comma-separated values in the order amplitude, midline, period.',
        meta: [
          '<!-- part 1: 4 -->',
          '<!-- part 2: -2 -->',
          '<!-- part 3 2pi/3 -->',
          '<!-- format: Answer as three comma-separated values in the order amplitude, midline, period. -->',
        ],
      }),
    ),
    U1,
  )
  assert.equal(r.errors.length, 1, JSON.stringify(r.errors))
  assert.match(r.errors[0], /part 3 2pi\/3/)
  assert.equal(r.items[0].answer, null, 'and the item is not keyed on the parts that did parse')
  assert.equal(r.items[0].kind, 'constructed_model_graded')
})

test('an editorial aside is still written as a note, and still costs nothing', () => {
  // The counterweight: `note:` (and todo/fixme/source/comment) is how a human
  // writes prose into a problem block, and it must not become an error now that
  // its neighbours are.
  const { item, errors } = one({
    meta: ['<!-- key: 3 -->', '<!-- note: keyed after checking the 2024 scoring guidelines -->'],
  })
  assert.deepEqual(errors, [])
  assert.equal(item.answer, '3')
  assert.equal(item.stem.includes('keyed after checking'), false, 'and it never reaches the student')
})

// ---------------------------------------------------------------------------
// The two gates that judge a compound answer's PHRASINGS. Both were
// order-of-declaration dependent: one refused content it already had, the other
// blamed the wrong line for it.
// ---------------------------------------------------------------------------

/** The accepted set as the grader sees it, so two declarations can be compared. */
const acceptedShapes = (item) =>
  new Set([item.answer, ...(item.answer_variants ?? [])].map(normalizeShort))

const PI_PARTS = {
  stem: 'Convert 135° to radians and find cos(135°) exactly. Answer as two comma-separated entries in that order.',
  solution: '3π/4 and −√2/2',
  format: '<!-- format: Answer as two comma-separated entries in that order. -->',
}

test('a keyboard-typeable form counts wherever it is declared, not only where it is listed first', () => {
  // isTypeable was checked against the key and `accept:` only — never against
  // the forms the parser itself generated — so two declarations with an
  // IDENTICAL accepted set differed by the ORDER their phrasings were listed in,
  // and one of them was refused with a diagnostic telling the author to add
  // something the item already had.
  const ascii = one({
    ...PI_PARTS,
    meta: ['<!-- part 1: 3pi/4 -->', '<!-- part 1: 3π/4 -->', '<!-- part 2: -sqrt(2)/2 -->', PI_PARTS.format],
  })
  const unicode = one({
    ...PI_PARTS,
    meta: ['<!-- part 1: 3π/4 -->', '<!-- part 1: 3pi/4 -->', '<!-- part 2: -sqrt(2)/2 -->', PI_PARTS.format],
  })
  assert.deepEqual(ascii.errors, [])
  assert.deepEqual(unicode.errors, [], 'listing the same phrasings in the other order must key the same item')
  assert.deepEqual(
    [...acceptedShapes(unicode.item)].sort(),
    [...acceptedShapes(ascii.item)].sort(),
    'the accepted set cannot depend on which phrasing was written first',
  )
  for (const item of [ascii.item, unicode.item]) creditsOn(item, '3pi/4, -sqrt(2)/2')
})

test('a compound answer with NO typeable form anywhere is still a build ERROR', () => {
  // The gate keeps its teeth: what changed is where it looks, not what it wants.
  const err = soleError({
    stem: 'Give the two values. Answer as two comma-separated entries in that order.',
    meta: [
      '<!-- part 1: 3π/4 -->',
      '<!-- part 2: −√2/2 -->',
      '<!-- format: Answer as two comma-separated entries in that order. -->',
    ],
  })
  assert.match(err, /type/i)
  assert.match(err, /part/i, `for a compound answer the fix is another part phrasing, not "accept:": ${err}`)
})

test('the dead-weight gate names the phrasing that is dead weight, in either declaration order', () => {
  // The gate registered the FIRST form of each normalized shape and blamed every
  // phrasing that won no race — and the all-first-phrasings combination is
  // generated first, so phrasing 0 always won. Declaring the redundant phrasing
  // FIRST therefore reported the one the item actually wants: `part 1: $4$` then
  // `part 1: 4` said that "4" accepts nothing new.
  const both = (meta) =>
    one({
      stem: 'State the amplitude and the midline of $f(x)=4\\sin(3x)-2$. Answer as two comma-separated values in that order.',
      meta: [...meta, '<!-- part 2: -2 -->', '<!-- format: Answer as two comma-separated values in that order. -->'],
    }).errors
  for (const order of [
    ['<!-- part 1: $4$ -->', '<!-- part 1: 4 -->'],
    ['<!-- part 1: 4 -->', '<!-- part 1: $4$ -->'],
  ]) {
    const errors = both(order)
    assert.equal(errors.length, 1, JSON.stringify(errors))
    assert.match(errors[0], /"\$4\$"/, `the redundant phrasing must be named: ${errors[0]}`)
    assert.match(errors[0], /"4"/, `and so must the one it duplicates, since either may be deleted: ${errors[0]}`)
  }
})

test('the dead-weight gate spares a phrasing that only earns its keep in second position', () => {
  // The reason this gate is effect-based and not a comparison: normalizeShort
  // strips a leading "x =" from the WHOLE response, so "x=-2 mult 3 crosses" and
  // "-2 mult 3 crosses" are identical in isolation and different in second
  // position. Both shipped items that declare such a pair must keep it.
  assert.deepEqual(one(ZEROS).errors, [])
  creditsOn(one(ZEROS).item, 'x=1 mult 2 bounces, x=-2 mult 3 crosses')
  const p8 = shipped('pc-u3-p8')
  creditsOn(p8, 'pi/2, x=7pi/6, x=11pi/6')
  // A trailing period is the same trap in the other direction: normalizeShort
  // strips it from the END of the response only, so "4." differs from "4"
  // everywhere except last, and the gate must not call it dead weight.
  const period = one({
    stem: 'State the amplitude and the midline. Answer as two comma-separated values in that order.',
    meta: [
      '<!-- part 1: 4 -->',
      '<!-- part 1: 4. -->',
      '<!-- part 2: -2 -->',
      '<!-- format: Answer as two comma-separated values in that order. -->',
    ],
  })
  assert.deepEqual(period.errors, [])
  creditsOn(period.item, '4., -2')
})

test('the dead-weight gate still refuses a phrasing that earns its keep NOWHERE', () => {
  // The teeth: two spellings normalizeShort cannot tell apart in ANY position.
  const pair = soleError({
    stem: 'State the amplitude and the midline. Answer as two comma-separated values in that order.',
    meta: [
      '<!-- part 1: amplitude 4 -->',
      '<!-- part 1: amplitude  4 -->',
      '<!-- part 2: -2 -->',
      '<!-- format: Answer as two comma-separated values in that order. -->',
    ],
  })
  assert.match(pair, /interchangeable/i)
  assert.match(pair, /part 1/)

  // ...and where the redundancy is one-sided, the one phrasing that adds nothing
  // is named alone. "x=4." is "4." wherever the prefix is stripped (first
  // position) and "x=4" wherever the period is (last), so the other two
  // phrasings between them already accept everything it would.
  const single = soleError({
    stem: 'Solve it. Answer as a comma-separated list in any order.',
    meta: [
      '<!-- part 1: x=4. -->',
      '<!-- part 1: 4. -->',
      '<!-- part 1: x=4 -->',
      '<!-- part 2: -2 -->',
      '<!-- format: Answer as a comma-separated list in any order. -->',
    ],
  })
  assert.match(single, /"x=4\." accepts nothing/)
})

test('the accepted forms of a compound answer are capped, so a build cannot explode', () => {
  const parts = []
  for (let p = 1; p <= 4; p++) {
    for (let a = 0; a < 6; a++) parts.push(`<!-- part ${p}: p${p}a${a} -->`)
  }
  // "in that order" so the refusal is the CAP and nothing else: these parts are
  // interchangeable bare values, which without a stated order is its own error.
  const err = soleError({
    stem: 'Give it. Answer as a, b, c, d in that order',
    meta: [...parts, '<!-- format: Answer as a, b, c, d in that order -->'],
  })
  assert.match(err, /too many|cap/i)
})

test('the cap is refused JUST over the line, and honoured just under it', () => {
  // The cap was only ever tested at a 155x overshoot, where any arithmetic
  // passes. These two differ by ONE declared phrasing and straddle the line: 3
  // single-word parts in any order expand to 6 orderings x 6 join schemes = 36
  // forms per combination of phrasings, so 6x5x1 phrasings is 1080 forms and
  // 6x4x1 is 864.
  const phrasings = (counts) =>
    counts.flatMap((n, p) => Array.from({ length: n }, (_, a) => `<!-- part ${p + 1}: v${p}w${a} -->`))
  const set = {
    stem: 'Solve it. Answer as a comma-separated list in any order.',
    meta: ['<!-- format: Answer as a comma-separated list in any order. -->'],
  }
  const over = one({ ...set, meta: [...phrasings([6, 5, 1]), ...set.meta] })
  assert.equal(over.errors.length, 1, JSON.stringify(over.errors))
  assert.match(over.errors[0], /expand to 1080 accepted forms, past the cap of 1000/)
  assert.equal(over.item.answer, null, 'over the cap the item degrades to model-graded, key and all')
  assert.equal(over.item.kind, 'constructed_model_graded')

  const under = one({ ...set, meta: [...phrasings([6, 4, 1]), ...set.meta] })
  assert.deepEqual(under.errors, [])
  assert.equal(under.item.kind, 'constructed')
  // And the property that matters, which the cap must never quietly break: what
  // is emitted is the WHOLE expansion, never a truncation of it. Every form in
  // it grades correct, and forms from the far end of the ordering — the ones a
  // truncation would drop first — are among them.
  const forms = [under.item.answer, ...under.item.answer_variants]
  assert.equal(forms.length, 864, 'the whole expansion must ship, undeduplicated by accident and unclipped')
  assert.equal(new Set(forms.map(normalizeShort)).size, forms.length, 'and no two forms the grader cannot tell apart')
  for (const form of forms) creditsOn(under.item, form)
  creditsOn(under.item, 'v2w0, v1w3, v0w5')
  creditsOn(under.item, 'v2w0, v1w3, and v0w5')
  creditsOn(under.item, 'v1w3 v2w0 v0w5')
})

test('the shipped item nearest the cap is fully expanded, not clipped', () => {
  // pc-u1-p5 declares 2 x 4 x 4 phrasings of three self-labelling parts: 6
  // orderings x 32 combinations x 5 join schemes = 960 of the 1000 forms
  // allowed, the closest any shipped item comes to the ceiling.
  const p5 = shipped('pc-u1-p5')
  const forms = [p5.answer, ...p5.answer_variants]
  assert.equal(forms.length, 960, 'the whole expansion ships, or the cap has started truncating')
  assert.equal(new Set(forms.map(normalizeShort)).size, 960)
  // The last phrasing of the last part, in the last ordering, joined by the last
  // scheme: everything a truncation would take first.
  creditsOn(p5, 'horizontal asymptote y=1, vertical asymptote at x=-3 and hole: x=3')
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
  // One PAST the last problem the pack ships, computed rather than hard-coded: a
  // literal 13 collided with the real P13 once unit 1 grew, and the collision made
  // this test fail for the duplicate id instead of proving what it is about.
  const shipped = parseAll(read).items.filter((i) => i.unit === '1').length
  const grown = `${real}\n${block({ n: shipped + 1, stem: 'A brand new problem.', solution: 'the solution' })}`
  const r = parseAll((f) => (f.includes(U1) ? grown : read(f)))
  assert.equal(r.items.filter((i) => i.unit === '1').length, shipped + 1)
  assert.deepEqual(
    r.errors.filter((e) => e.includes(U1)),
    [],
    'adding one more problem must not be an error — the old check asserted exactly 12',
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
  // The blind spot a bare count leaves: renumber P7 to the number one past the end
  // and unit 1 keeps its item count, all with unique ids, while P7 has vanished from
  // the pack. The target number is computed, not literal — a literal 13 now names a
  // problem the pack really has, which would make this a duplicate-id test instead.
  const real = read(`ap_precalc/study-packs/${U1}`)
  const shipped = parseAll(read).items.filter((i) => i.unit === '1').length
  const gapped = real.replace('**P7 (medium, no-calc).**', `**P${shipped + 1} (medium, no-calc).**`)
  assert.notEqual(gapped, real, 'the fixture substitution must actually apply')
  const r = parseAll((f) => (f.includes(U1) ? gapped : read(f)))
  assert.equal(r.items.filter((i) => i.unit === '1').length, shipped, 'the count check is satisfied — the blind spot')
  assert.ok(
    r.errors.some((e) => e.includes(U1) && /\bP7\b/.test(e)),
    `expected a numbering gap error naming P7, got: ${JSON.stringify(r.errors)}`,
  )
})

test('the shipped packs pass every structural check', () => {
  const r = parseAll(read)
  assert.deepEqual(r.errors, [], 'the real content must be clean under the new checks')
})
