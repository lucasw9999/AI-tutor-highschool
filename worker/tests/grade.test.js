import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import {
  grade,
  normalizeChoice,
  resolveChoice,
  normalizeShort,
  asNumber,
  isBlank,
  isServerGraded,
} from '../src/grade.js'

const MCQ = { kind: 'mcq', answer: 'B', options: { A: 'x', B: 'y', C: 'z', D: 'w' } }

test('choice normalization accepts what a student actually types', () => {
  // Every accepted form is either the WHOLE response or a letter introduced by
  // an explicit marker. Nothing here scans mid-sentence for a stray letter.
  for (const raw of [
    'B',
    'b',
    '(B)',
    'B)',
    ' b. ',
    'B?',
    'answer: B',
    'answer B',
    'the answer is B',
    'choice B',
    'option (b)',
    'I pick B',
    'I think B',
    'B I think',
    'not A, the answer is B',
  ]) {
    assert.equal(normalizeChoice(raw), 'B', `failed on ${JSON.stringify(raw)}`)
  }
  assert.equal(normalizeChoice(null), null)
  assert.equal(normalizeChoice('none of these'), null, 'prose with no letter is not a choice')
})

test('G1: a letter sitting inside prose is never read as a choice', () => {
  // The old scan was /\b([A-E])\b/ over free text, first match wins, so the
  // English article 'a' read as choice A. These are real shipped-item responses.
  for (const raw of [
    'Because it loops',
    'it throws a NullPointerException',
    'a StringIndexOutOfBoundsException',
    'A NullPointerException is thrown.',
    'b is 3 after the loop, so C',
    'an empty line',
    'a list of the values',
    'it prints a blank line',
  ]) {
    assert.equal(normalizeChoice(raw), null, `read a choice out of ${JSON.stringify(raw)}`)
  }
})

test('G1: an ambiguous multi-letter response is never resolved to a guess', () => {
  const opts = { A: 'w', B: 'x', C: 'y', D: 'z' }
  for (const raw of ['B or C', 'B, C', 'A and B', 'either A or D', 'B/C', 'answer: A or B']) {
    assert.equal(normalizeChoice(raw), null, `guessed at ${JSON.stringify(raw)}`)
    assert.equal(resolveChoice(raw, opts), null, `guessed at ${JSON.stringify(raw)}`)
    const r = grade({ kind: 'mcq', answer: 'B', options: opts }, raw)
    assert.notEqual(r.graded_by, 'server', `${JSON.stringify(raw)} must not be scored`)
    assert.equal(isServerGraded(r), false, `${JSON.stringify(raw)} must not count`)
  }
})

test('G1: a negated letter is not the letter that was negated', () => {
  const opts = { A: 'w', B: 'x', C: 'y', D: 'z' }
  assert.equal(resolveChoice('not A, the answer is C', opts), 'C')
  assert.equal(resolveChoice('the answer is not A', opts), null, 'no answer was stated')
  assert.equal(resolveChoice("it's definitely not A", opts), null)
})

test('MCQ grading is exact and server-owned', async (t) => {
  await t.test('correct answer', () => {
    const r = grade(MCQ, 'b')
    assert.equal(r.correct, 1)
    assert.equal(r.graded_by, 'server')
    assert.equal(r.keyed, 'B')
  })

  await t.test('wrong answer records what was picked', () => {
    const r = grade(MCQ, 'D')
    assert.equal(r.correct, 0)
    assert.equal(r.picked, 'D')
    assert.equal(r.keyed, 'B')
  })

  await t.test('blank is wrong but flagged as blank, not as a wrong pick', () => {
    const r = grade(MCQ, '   ')
    assert.equal(r.correct, 0)
    assert.equal(r.blank, true)
    assert.equal(r.detail, 'blank')
  })

  await t.test('unparseable prose is recorded but NOT scored as wrong', () => {
    // REWRITTEN CONTRACT (G3). This used to return graded_by 'server' with
    // correct 0, so an answer the server could not read was booked as a miss and
    // opened a phantom concept gap. An unreadable response is ungraded.
    const r = grade(MCQ, 'not sure honestly')
    assert.equal(r.blank, false, 'still distinguishable from a blank')
    assert.equal(r.detail, 'no_letter')
    assert.equal(r.graded_by, 'unparsed')
    assert.equal(isServerGraded(r), false, 'nothing downstream may read this as a miss')
  })
})

test('REGRESSION: surrounding whitespace must not cause a false negative', () => {
  // normalizeShort once trimmed last, so its ^-anchored prefix strip and
  // $-anchored period strip both missed when the student typed padding.
  // ' x = 4. ' became 'x=4.' and was marked wrong against a key of '4'.
  const item = { kind: 'constructed', answer: '4' }
  for (const raw of [' x = 4. ', '  X = 4  ', '\tx=4\n', ' 4. ', '$x = 4$']) {
    assert.equal(grade(item, raw).correct, 1, `marked wrong: ${JSON.stringify(raw)}`)
  }
  assert.equal(normalizeShort(' y = 2x+1 '), '2x+1')
})

test('short-answer normalization strips student decoration', () => {
  assert.equal(normalizeShort('$x = 4$'), '4')
  assert.equal(normalizeShort('  X  =  4. '), '4')
  assert.equal(normalizeShort('ln 3'), 'ln 3')
  assert.equal(normalizeShort('y = 2x - 1'), '2x-1')
  assert.equal(normalizeShort('f(x) = 2x + 1'), '2x+1')
})

test('numeric parsing rejects non-numbers instead of coercing them', () => {
  assert.equal(asNumber('4'), 4)
  assert.equal(asNumber('-1.273'), -1.273)
  assert.equal(asNumber('1,140'), 1140)
  assert.equal(asNumber('4x'), null, 'must not silently become 4')
  assert.equal(asNumber(''), null)
  assert.equal(asNumber('ln 3'), null)
})

test('constructed answers accept documented variants', () => {
  const item = { kind: 'constructed', answer: 'y = 2x + 1', answer_variants: ['2x+1', 'y=2x+1'] }
  for (const raw of ['y = 2x + 1', '2x+1', 'Y=2X+1', ' y = 2x+1 ']) {
    assert.equal(grade(item, raw).correct, 1, `failed on ${JSON.stringify(raw)}`)
  }
  assert.equal(grade(item, 'y = 2x - 1').correct, 0)
})

test('numeric tolerance is opt-in per item, never a default', async (t) => {
  await t.test('within tolerance passes when the item declares one', () => {
    const item = { kind: 'constructed', answer: '12.387', tolerance: 0.001 }
    assert.equal(grade(item, '12.387').correct, 1)
    assert.equal(grade(item, '12.3875').correct, 1)
    assert.equal(grade(item, '12.39').correct, 0, 'outside the declared tolerance')
  })

  await t.test('without a declared tolerance, only exact numeric agreement passes', () => {
    const item = { kind: 'constructed', answer: '4' }
    assert.equal(grade(item, '4').correct, 1)
    assert.equal(grade(item, '4.0').correct, 1, '4.0 equals 4 numerically')
    assert.equal(grade(item, '4.1').correct, 0)
  })
})

test('FRQs are never graded here, and are marked as model-graded', () => {
  const r = grade({ kind: 'frq', rubric: [] }, 'a long written response')
  assert.equal(r.graded_by, 'model')
  assert.equal(r.correct, 0, 'the server asserts nothing about an FRQ')
  assert.equal(r.detail, 'rubric')
})

test('an empty FRQ is still recorded as blank', () => {
  assert.equal(grade({ kind: 'frq' }, '').blank, true)
})

test('isBlank treats whitespace as unanswered', () => {
  assert.equal(isBlank('  \n '), true)
  assert.equal(isBlank('0'), false, 'zero is an answer')
})

// ---------------------------------------------------------------------------
// G2 — the answer VALUE the student typed, not just the label
// ---------------------------------------------------------------------------

const PRINTS_B = {
  kind: 'mcq',
  answer: 'C',
  options: { A: 'A', B: 'An `ArithmeticException` is thrown.', C: 'B', D: 'Nothing.' },
}

test('G2: a response that IS an option value resolves to that option', () => {
  assert.equal(grade(PRINTS_B, 'it prints B').correct, 1, 'the program prints B, which is option C')
  assert.equal(grade(PRINTS_B, 'the output is B').correct, 1)
  assert.equal(grade(PRINTS_B, 'prints B').correct, 1)
  assert.equal(grade(PRINTS_B, 'C').correct, 1, 'the label still works')
  assert.equal(grade(PRINTS_B, 'Nothing.').correct, 0, 'a value that is the wrong option is still wrong')
  assert.equal(grade(PRINTS_B, 'Nothing.').picked, 'D')

  const npe = {
    kind: 'mcq',
    answer: 'C',
    options: { A: '0', B: 'An empty line', C: 'A `NullPointerException` is thrown.', D: 'null' },
  }
  for (const raw of [
    'A NullPointerException is thrown.',
    'A `NullPointerException` is thrown',
    'a nullpointerexception is thrown',
    'it throws a NullPointerException',
    'it throws a `NullPointerException`',
    'the answer is a NullPointerException',
  ]) {
    assert.equal(grade(npe, raw).correct, 1, `marked wrong: ${JSON.stringify(raw)}`)
  }
  assert.equal(grade(npe, 'null').picked, 'D', 'the value null is option D, not a missing answer')
  assert.equal(grade(npe, '0').picked, 'A')
})

test('G2: a value reading that collides with a label reading is left ungraded', () => {
  // csa-ac-q14 shape: option C's text is literally 'B'. A bare 'B' could mean
  // label B or the printed value B. Guessing either way risks calling a right
  // answer wrong, so the response is reported unparsed and nothing is booked.
  const r = grade(PRINTS_B, 'B')
  assert.equal(r.graded_by, 'unparsed')
  assert.equal(r.detail, 'ambiguous_choice')
  assert.equal(isServerGraded(r), false)

  // csa-u2-q7 shape, the mirror image: option D's text is 'A' while the KEY is
  // label A. Resolving a bare letter to the value would mark a right answer
  // wrong here — which is why neither reading is allowed to win by default.
  const mirror = { kind: 'mcq', answer: 'A', options: { A: 'C', B: 'B', C: 'F', D: 'A' } }
  assert.equal(grade(mirror, 'A').graded_by, 'unparsed', 'must not be scored as D')
  assert.equal(isServerGraded(grade(mirror, 'A')), false)

  // An explicit marker breaks the tie, in either direction.
  assert.equal(grade(mirror, 'choice A').correct, 1)
  assert.equal(grade(mirror, 'option A').correct, 1)
  assert.equal(grade(mirror, 'it prints C').correct, 1, 'C is printed, which is option A')
  assert.equal(grade(PRINTS_B, 'choice B').picked, 'B', 'he named the label explicitly')
})

test('G2: an option value that no label could mean is read as the value', () => {
  // 'e' is not one of A-D, so there is no competing label reading.
  const item = { kind: 'mcq', answer: 'B', options: { A: 'def', B: 'ef', C: 'cdef', D: 'e' } }
  assert.equal(grade(item, 'ef').correct, 1)
  assert.equal(grade(item, 'it prints ef').correct, 1)
  assert.equal(grade(item, 'the output is ef').correct, 1)
  assert.equal(grade(item, 'e').picked, 'D', 'the value e is option D')
  assert.equal(grade(item, 'B').correct, 1, 'the label still works')
  assert.equal(grade(item, 'def').picked, 'A')
})

test('G2: option values are only matched when exactly one option can match', () => {
  const quoted = { kind: 'mcq', answer: 'D', options: { A: '428', B: '42', C: '"50"', D: '50' } }
  assert.equal(grade(quoted, '50').correct, 1, 'quoted "50" is a different value from 50')
  assert.equal(grade(quoted, '"50"').picked, 'C')
  const tie = { kind: 'mcq', answer: 'B', options: { A: 'same', B: 'same', C: 'x', D: 'y' } }
  assert.equal(grade(tie, 'same').graded_by, 'unparsed', 'two options match; do not guess')
})

// ---------------------------------------------------------------------------
// G4 — an item whose own key is unusable
// ---------------------------------------------------------------------------

test('G4: an mcq whose key is not a letter choice is ungraded, not every-answer-wrong', () => {
  for (const answer of ['the second one', 'BD', '1', 'true']) {
    const item = { kind: 'mcq', answer, options: { A: 'w', B: 'x', C: 'y', D: 'z' } }
    for (const raw of ['A', 'B', 'C', 'D', '  ']) {
      const r = grade(item, raw)
      assert.equal(r.graded_by, 'unkeyed', `key ${JSON.stringify(answer)} answered ${raw}`)
      assert.equal(r.detail, 'no_answer_key')
      assert.equal(r.keyed, null)
      assert.equal(isServerGraded(r), false, 'a broken key must never book a miss')
    }
  }
  // A usable key still grades normally, however the author decorated it.
  for (const answer of ['B', 'b', '(B)', 'B.']) {
    assert.equal(grade({ kind: 'mcq', answer, options: { A: 'w', B: 'x', C: 'y', D: 'z' } }, 'b').correct, 1)
  }
})

// ---------------------------------------------------------------------------
// G5 / G6 — the constructed-answer false negatives
// ---------------------------------------------------------------------------

test('G5: a difference exactly equal to the tolerance is inside it', () => {
  // 3.1 - 3 computes to 0.10000000000000009 in binary floating point, so a bare
  // `<= tol` comparison called an answer at the edge of the declared tolerance
  // wrong.
  assert.equal(grade({ kind: 'constructed', answer: '3', tolerance: 0.1 }, '3.1').correct, 1)
  assert.equal(grade({ kind: 'constructed', answer: '3', tolerance: 0.1 }, '2.9').correct, 1)
  assert.equal(grade({ kind: 'constructed', answer: '0.3', tolerance: 0.1 }, '0.2').correct, 1)
  assert.equal(grade({ kind: 'constructed', answer: '1.1', tolerance: 0.2 }, '1.3').correct, 1)
  assert.equal(grade({ kind: 'constructed', answer: '8.1', tolerance: 0.3 }, '8.4').correct, 1)
  // The tolerance is still a real bound, not an excuse.
  assert.equal(grade({ kind: 'constructed', answer: '3', tolerance: 0.1 }, '3.2').correct, 0)
  assert.equal(grade({ kind: 'constructed', answer: '3', tolerance: 0.1 }, '3.11').correct, 0)
})

test('G6: a key or variant of zero is a real answer, not a missing one', () => {
  assert.equal(grade({ kind: 'constructed', answer: 0 }, '0').correct, 1)
  assert.equal(grade({ kind: 'constructed', answer: '0' }, '0').correct, 1)
  assert.equal(grade({ kind: 'constructed', answer: 'zero', answer_variants: [0] }, '0').correct, 1)
  assert.equal(grade({ kind: 'constructed', answer: 0, tolerance: 0.01 }, '0.005').correct, 1)
  assert.equal(grade({ kind: 'constructed', answer: 0 }, '1').correct, 0)
})

// ---------------------------------------------------------------------------
// G7 — the same grader, run against the content that actually shipped
// ---------------------------------------------------------------------------

const SHIPPED = JSON.parse(readFileSync(new URL('../../content/items.json', import.meta.url)))
const SHIPPED_MCQ = SHIPPED.filter((i) => i.kind === 'mcq')
const byId = (id) => {
  const it = SHIPPED.find((i) => i.id === id)
  assert.ok(it, `shipped item ${id} has gone missing`)
  return it
}

// ---------------------------------------------------------------------------
// Which (item, letter) pairs are genuinely unreadable — DERIVED FROM THE BANK
//
// A letter names one option as a LABEL and a DIFFERENT option as a VALUE. Both
// readings are live and lead to different options, so the grader declines rather
// than guess. Every such pair is a CONTENT defect, not a grading one.
//
// RETIRED PRECONDITION: this used to be `AMBIGUOUS_BY_DESIGN`, a hand-written list
// of the four pairs the audit found — csa-ac-q14:B, csa-ac-q33:C, csa-u2-q7:A,
// csa-u2-q7:C — and 'Q4' below asserted the bank still held EXACTLY those. The
// content has since been fixed: every letter-valued option now sits at the label
// whose letter it is, and the three items' keys moved with them (q14 C -> B,
// q7 A -> C, q33's key stays D). The shipped bank contains no collision at all,
// and 28 response forms that could not be read now reach a verdict.
//
// That is a better bank and a worse fixture — it left the grader's refusal proved
// only by content that no longer exists. So:
//
//   - the list is DERIVED, which turns the sweep below from "a declined letter is
//     one of these four" into the stronger "a declined letter is genuinely
//     ambiguous in the bank as it stands";
//   - the refusal itself is proved on AMBIGUOUS, an item that is ambiguous BY
//     CONSTRUCTION, so no content fix can take the proof away (the same move
//     openapi.test.js made in cdddfd8 for the same three items);
//   - AUDITED_COLLISIONS keeps the four as a relapse ALLOWLIST. The direction that
//     matters is unchanged: no NEW colliding item may appear. The direction that
//     fired here — "and these four must still exist" — is the one that treats a
//     content fix as a regression, and it is the one retired.
// ---------------------------------------------------------------------------

/**
 * Every (item, letter, owner, item) tuple in `items` where `letter` names one
 * option as a LABEL and exactly one DIFFERENT option as a VALUE.
 */
const collisionsIn = (items) => items.flatMap((item) =>
  Object.keys(item.options).flatMap((label) => {
    const owners = Object.entries(item.options)
      .filter(([, text]) => String(text).trim().toUpperCase() === label)
      .map(([owner]) => owner)
    return owners.length === 1 && owners[0] !== label ? [[item.id, label, owners[0], item]] : []
  }),
)

const LETTER_COLLISIONS = collisionsIn(SHIPPED_MCQ)
const COLLIDING = new Set(LETTER_COLLISIONS.map(([id, label]) => `${id}:${label}`))

/** The collisions the audit found. Nothing outside this set may ever appear. */
const AUDITED_COLLISIONS = new Set([
  'csa-ac-q14:B', // option C's text was 'B'
  'csa-ac-q33:C', // option A's text was 'c'
  'csa-u2-q7:A', // option D's text was 'A'
  'csa-u2-q7:C', // option A's text was 'C'
])

/**
 * An item that IS ambiguous, and cannot be fixed out from under the tests that
 * need it: a faithful copy of csa-u2-q7 as it shipped when the audit ran. The
 * program prints 'C' and the key is A, option D's text is 'A' and option A's text
 * is 'C' — so a bare 'A' names both the key's label and option D's value, and a
 * bare 'C' names option C's label and the key's own value.
 *
 * Both of the grader's obligations live on those two letters: never credit for an
 * answer he did not give, and never a miss on an answer he may well have got
 * right. csa-ac-q14 was the same shape with the key on the other side of the
 * collision, so one fixture proves both.
 */
const AMBIGUOUS = {
  id: 'FIXTURE(a letter-valued option, as csa-u2-q7 shipped)',
  kind: 'mcq',
  answer: 'A',
  options: { A: 'C', B: 'B', C: 'F', D: 'A' },
}

/** The same letter, however he decorated it. LETTER_ONLY accepts all of these. */
const decorations = (letter) => [
  letter,
  letter.toLowerCase(),
  `${letter}.`,
  ` ${letter} `,
  `"${letter}"`,
  `'${letter}'`,
  `${letter},`,
  `${letter}!`,
  `${letter};`,
  `${letter}:`,
  `[${letter}]`,
  `(${letter})`,
  `${letter})`,
  `${letter}?`,
  `answer: ${letter}`,
  `the answer is ${letter}`,
  `I think ${letter}`,
  `${letter} I think`,
]

/**
 * Every letter-shaped way of naming an item's OWN key, read off the item rather
 * than written down.
 *
 * The explicitly-marked forms are unconditional — a named label is readable
 * whatever the options say. A BARE or decorated letter is demanded only where this
 * bank leaves it readable: where the letter collides, the grader MUST decline it
 * (Q4-G1/G2 pins that direction over the fixture and the whole bank), so
 * demanding credit here would demand the opposite of the same behaviour.
 */
function letterForms(item) {
  const key = normalizeChoice(item.answer)
  const marked = [`choice ${key}`, `option ${key}`, `I pick ${key}`]
  return COLLIDING.has(`${item.id}:${key}`) ? marked : [...marked, ...decorations(key)]
}

test('the shipped bank really is the thing under test', () => {
  assert.ok(SHIPPED_MCQ.length >= 200, `only ${SHIPPED_MCQ.length} shipped mcq items`)
})

test('G7: real shipped items credit the answer the student actually gave', async (t) => {
  // RETIRED RESPONSES: 'C', 'c', 'answer: C' on csa-ac-q14, and 'choice A',
  // 'option A' on csa-u2-q7. Those letters were the keys those two items shipped
  // with when the audit ran. The content fix moved their keys (q14 C -> B,
  // q7 A -> C), so a frozen 'C' on q14 now names a WRONG option — asserting credit
  // for it would assert that a wrong answer is right, which is the one thing this
  // project may never do. The letter forms are therefore read off each item's own
  // key by letterForms(), which demands the same forms of the same items either
  // side of the content fix.
  //
  // The VALUE forms below are untouched. They resolve through the option's text,
  // and the text of every key option here is unchanged — 'it prints B' is q14's
  // answer both when option C read 'B' and now that option B does.
  const table = [
    // [item id, responses that name the key through its option TEXT]
    ['csa-ac-q60', ['A NullPointerException is thrown.', 'A `NullPointerException` is thrown.',
      'it throws a NullPointerException', 'it throws a `NullPointerException`']],
    ['csa-ac-q33', ['A StringIndexOutOfBoundsException is thrown.', 'a StringIndexOutOfBoundsException',
      'it throws a StringIndexOutOfBoundsException']],
    ['csa-ac-q14', ['it prints B', 'the output is B', 'prints B']],
    ['csa-ac-q30', ['ef', 'it prints ef', 'the output is ef']],
    ['csa-u2-q7', ['it prints C', 'the output is C']],
  ]
  for (const [id, values] of table) {
    await t.test(id, () => {
      const item = byId(id)
      for (const raw of [...letterForms(item), ...values]) {
        const r = grade(item, raw)
        assert.equal(r.graded_by, 'server', `${id} ${JSON.stringify(raw)} was not graded`)
        assert.equal(r.correct, 1, `${id} marked ${JSON.stringify(raw)} wrong (picked ${r.picked}, key ${r.keyed})`)
      }
      // AND THE CORRECTED TRUTH, in the one form that holds whichever way the
      // content goes: the bare key letter earns credit exactly when no other
      // option's text is that letter. It is what the content fix bought — on all
      // three repaired items the bare key is now credited where it was declined —
      // and it fails in both directions, so neither a relapse in the bank nor a
      // grader that starts guessing at a collision can pass it.
      const key = normalizeChoice(item.answer)
      const bare = grade(item, key)
      assert.equal(
        bare.graded_by === 'server' && bare.correct === 1,
        !COLLIDING.has(`${id}:${key}`),
        `${id}: a bare '${key}' was ${bare.graded_by}/${bare.correct}, and option ` +
          `${COLLIDING.has(`${id}:${key}`) ? 'text collides with that letter' : 'texts do not collide with it'}`,
      )
    })
  }
})

test('N8: a verbatim option ending in a period keeps its period visible after a hedge tail is stripped', () => {
  // canonAnswer strips a TRAILING period before HEDGE_TAIL ever runs. So a
  // response that is the option text verbatim, ending in a period, plus a
  // trailing hedge — 'The program throws an ArithmeticException. I think' —
  // has its period sitting mid-string when canonAnswer looks for one at the
  // end and finds 'k' instead. Only after HEDGE_TAIL peels off ' I think'
  // does that period become the new trailing character, and nothing strips
  // it a second time — so the hedged reading still carries a period the
  // option's own (period-free) canonical text does not, and matches nothing.
  const item = byId('csa-ac-q4')
  const optionText = item.options[item.answer]
  assert.match(optionText, /\.$/, 'fixture assumption: the correct option text ends in a period')
  for (const raw of [`${optionText} I think`, `${optionText} i think`, `${optionText}, I think`, `${optionText} maybe`]) {
    const r = grade(item, raw)
    assert.equal(r.graded_by, 'server', `${JSON.stringify(raw)} was declined (detail: ${r.detail})`)
    assert.equal(r.correct, 1, `${JSON.stringify(raw)} was scored wrong (picked ${r.picked}, keyed ${r.keyed})`)
  }
})

test('G7: the responses the audit reproduced are never scored as misses', () => {
  // Each of these was `correct: 0, graded_by: 'server'` before the fix. Being
  // credited is best; being left unparsed is acceptable. Being called wrong is
  // the one outcome this project may never produce.
  //
  // RETIRED RESPONSE: the literal `['csa-u2-q7', 'A']`. 'A' was q7's KEY when the
  // audit reproduced it, and the reason it may never be booked a miss was that it
  // was the right answer. The content fix moved that key to C and gave option A the
  // text 'A', so a student who now types 'A' is unambiguously claiming the program
  // prints A, which it does not: the miss is CORRECT, and demanding it be withheld
  // would be demanding that a wrong answer go unmarked. The entry is therefore read
  // off the item's own key — which is what the audit was actually about — and holds
  // either side of the fix: declined while the letter collided, credited now.
  const reproduced = [
    ['csa-ac-q60', 'it throws a NullPointerException'],
    ['csa-ac-q33', 'a StringIndexOutOfBoundsException'],
    ['csa-ac-q33', 'A StringIndexOutOfBoundsException is thrown.'],
    ['csa-ac-q14', 'B'],
    ['csa-ac-q14', 'it prints B'],
    ['csa-ac-q30', 'ef'],
    ['csa-u2-q7', (item) => normalizeChoice(item.answer)],
    ['csa-u2-q7', 'it prints C'],
  ]
  for (const [id, response] of reproduced) {
    const item = byId(id)
    const raw = typeof response === 'function' ? response(item) : response
    const r = grade(item, raw)
    assert.ok(
      !(r.graded_by === 'server' && r.correct === 0),
      `${id}: ${JSON.stringify(raw)} was scored as a miss (picked ${r.picked}, key ${r.keyed})`,
    )
  }
})

test('G7: across the whole shipped bank, a letter answer is never misread', () => {
  for (const item of SHIPPED_MCQ) {
    for (const label of Object.keys(item.options)) {
      const forms = [
        label,
        label.toLowerCase(),
        `(${label})`,
        `${label})`,
        `${label}.`,
        ` ${label} `,
        `answer: ${label}`,
        `I think ${label}`,
        // Q4-G1: the same letter, decorated the way a student decorates one.
        // LETTER_ONLY strips all of this; canonAnswer keeps it. Every form here
        // has to reach the same verdict as the undecorated letter.
        `"${label}"`,
        `'${label}'`,
        `${label},`,
        `${label}!`,
        `${label};`,
        `${label}:`,
        `[${label}]`,
        `${label}?`,
      ]
      for (const form of forms) {
        const r = grade(item, form)
        assert.ok(
          r.graded_by === 'server' || r.graded_by === 'unparsed',
          `${item.id} ${JSON.stringify(form)} => ${r.graded_by}`,
        )
        if (r.graded_by === 'server') {
          assert.equal(r.picked, label, `${item.id}: ${JSON.stringify(form)} read as ${r.picked}`)
          assert.equal(r.correct, label === r.keyed ? 1 : 0, `${item.id} ${JSON.stringify(form)}`)
        } else {
          assert.ok(
            COLLIDING.has(`${item.id}:${label}`),
            `${item.id}: ${JSON.stringify(form)} was left ungraded and the bank makes it perfectly readable — ` +
              `no option's text is '${label}', so there is nothing to be ambiguous about`,
          )
        }
      }
      // An explicitly named label is always readable, collision or not.
      for (const form of [`choice ${label}`, `option ${label}`, `I pick ${label}`]) {
        const r = grade(item, form)
        assert.equal(r.graded_by, 'server', `${item.id} ${JSON.stringify(form)} => ${r.graded_by}`)
        assert.equal(r.picked, label, `${item.id}: ${JSON.stringify(form)} read as ${r.picked}`)
      }
    }
  }
})

test('G7: across the whole shipped bank, an option value is never misread', () => {
  for (const item of SHIPPED_MCQ) {
    for (const [label, text] of Object.entries(item.options)) {
      for (const form of [text, String(text).replace(/`/g, ''), `it prints ${text}`, `the output is ${text}`]) {
        const r = grade(item, form)
        assert.ok(
          r.graded_by === 'server' || r.graded_by === 'unparsed',
          `${item.id} ${JSON.stringify(form)} => ${r.graded_by}`,
        )
        if (r.graded_by === 'server') {
          assert.equal(r.picked, label, `${item.id}: value ${JSON.stringify(form)} read as ${r.picked}`)
        }
      }
      // The option's own text, typed verbatim, has to resolve unless the bank
      // made it collide with a label.
      const bare = String(text).trim().toUpperCase()
      const collides = /^[A-E]$/.test(bare) && bare !== label && bare in item.options
      if (!collides) {
        const verbatim = grade(item, text)
        assert.equal(
          verbatim.graded_by,
          'server',
          `${item.id}: option ${label} typed verbatim (${JSON.stringify(text)}) was not graded`,
        )
        assert.equal(verbatim.correct, label === verbatim.keyed ? 1 : 0, `${item.id} option ${label} verbatim`)
      }
    }
  }
})

// ---------------------------------------------------------------------------
// Q4-G1 / Q4-G2 — the collision guard, and the punctuation that slipped past it
//
// LETTER_COLLISIONS, COLLIDING, AUDITED_COLLISIONS, AMBIGUOUS and decorations()
// are all defined with the G7 fixtures above, because the whole-bank sweeps there
// need them too.
// ---------------------------------------------------------------------------

test('Q4: the fixture is ambiguous by construction, and no NEW collision has reached the bank', () => {
  // RETIRED PRECONDITION: `assert.deepEqual(LETTER_COLLISIONS, [...the four the
  // audit found])`, under the name 'Q4: the bank still contains the collisions
  // these tests are about'. It was doing two jobs at once and only one of them was
  // a gate.
  //
  // The gate — no colliding item may appear that nobody has looked at — is kept
  // below, as containment rather than equality. The other half required the four
  // known collisions to STILL BE THERE, which made a content fix indistinguishable
  // from a regression: the bank was repaired, 28 unreadable response forms started
  // reaching a verdict, and this went red. Whether the artifacts match the markdown
  // is B8's job, and B8 does it over the whole bank rather than over four items.
  //
  // What the equality was really protecting is that the tests below have something
  // ambiguous to run against. That is now guaranteed by construction instead of by
  // the bank staying broken, and asserted here as a precondition.
  assert.deepEqual(
    collisionsIn([AMBIGUOUS]).map(([, label, owner]) => `${label} vs option ${owner}`).sort(),
    ['A vs option D', 'C vs option A'],
    'precondition: the fixture must be genuinely ambiguous, or the tests below prove nothing about the grader',
  )
  for (const [id, label, owner] of LETTER_COLLISIONS) {
    assert.ok(
      AUDITED_COLLISIONS.has(`${id}:${label}`),
      `${id} gives option ${owner} the text '${label}', which is also option ${label}'s label — a bare '${label}' on ` +
        `that item names two different options and cannot be read. That is a CONTENT defect: move the letter-valued ` +
        `option to the label whose letter it is, and move the key with it, as csa-ac-q14, csa-ac-q33 and csa-u2-q7 ` +
        `already were. Do not add it to AUDITED_COLLISIONS.`,
    )
  }
})

test('Q4-G1/G2: a decorated letter never outranks the value reading it collides with', async (t) => {
  // The fixture first, so the obligation is proved whatever the bank holds, then
  // the bank itself as a relapse guard: if a colliding item ever comes back, the
  // grader must still decline the bare letter rather than guess. Neither direction
  // depends on the bank staying broken.
  for (const [id, letter, owner, item] of [...collisionsIn([AMBIGUOUS]), ...LETTER_COLLISIONS]) {
    await t.test(`${id} ${letter} (label ${letter} vs option ${owner})`, () => {
      for (const raw of decorations(letter)) {
        const r = grade(item, raw)
        assert.equal(
          r.graded_by,
          'unparsed',
          `${id} ${JSON.stringify(raw)} was graded (picked ${r.picked}, key ${r.keyed}, correct ${r.correct})`,
        )
        assert.equal(r.detail, 'ambiguous_choice', `${id} ${JSON.stringify(raw)} declined for the wrong reason`)
        assert.equal(isServerGraded(r), false, `${id} ${JSON.stringify(raw)} must not count`)
      }
    })
  }
})

test('Q4-G1: quoting the character the program printed is not a wrong answer', () => {
  // csa-u2-q7 prints 'C' when score is 70, and 'C' is also an option label.
  // Quoting a printed character is a natural thing to do, and the student who
  // writes "C" is RIGHT. LETTER_ONLY strips the quotes and reads a label,
  // canonAnswer keeps them so the competing value reading found nothing, and
  // matchFragment ignores anything under three characters — so the label won a
  // confident verdict and he was told he was wrong. One comma was enough.
  //
  // On the bank as the audit found it the best obtainable outcome was a DECLINE:
  // option A's text was 'C' and the key was A, so nothing could tell the two
  // readings apart. The content fix put 'C' at label C and moved the key there, so
  // '"C"' on q7 — and '"B"' on csa-ac-q14, the same shape — are now CREDITED
  // outright. Same assertion, satisfied the better way, which is what it always
  // asked for: never a miss.
  for (const raw of ['"C"', "'C'", '(C)', 'C)', 'C,', 'C!', 'C;', 'C:', '[C]']) {
    const r = grade(byId('csa-u2-q7'), raw)
    assert.ok(
      !(r.graded_by === 'server' && r.correct === 0),
      `csa-u2-q7 ${JSON.stringify(raw)} was scored as a miss (picked ${r.picked}, key ${r.keyed})`,
    )
  }
  for (const raw of ['"B"', "'B'", '(B)', 'B)', 'B,', 'B!', 'B;', 'B:', '[B]']) {
    const r = grade(byId('csa-ac-q14'), raw)
    assert.ok(
      !(r.graded_by === 'server' && r.correct === 0),
      `csa-ac-q14 ${JSON.stringify(raw)} was scored as a miss (picked ${r.picked}, key ${r.keyed})`,
    )
  }
  // And the declining direction, on the item as it shipped: quoting the printed
  // character while the bank still collides it must never be booked a miss either.
  for (const raw of decorations('C')) {
    const r = grade(AMBIGUOUS, raw)
    assert.ok(
      !(r.graded_by === 'server' && r.correct === 0),
      `${AMBIGUOUS.id} ${JSON.stringify(raw)} was scored as a miss (picked ${r.picked}, key ${r.keyed})`,
    )
  }
})

test('Q4-G2: a decorated letter that happens to equal the key is not credit', () => {
  // The mirror of Q4-G1, and it feeds readiness. On csa-u2-q7 as the audit found
  // it the key was A and option D's text was 'A', so a student who miscomputed the
  // output as A and typed '(A)' was told he was right and it counted toward being
  // ready.
  //
  // RETIRED ASSERTION: `assert.equal(isServerGraded(r), false)` against the shipped
  // csa-u2-q7. That half was never about decoration — it was the consequence of the
  // letter being AMBIGUOUS, and it is the collision that has been fixed away: q7's
  // key is now C, its option A really does read 'A', and a decorated 'A' is a
  // confidently recorded MISS. Refusing to record it would be refusing to mark a
  // wrong answer wrong.
  //
  // So the obligation moves to the item as it shipped, where the letter both equals
  // the key and collides, and cannot be repaired out from under it. What the shipped
  // item still owes is the half that has nothing to do with ambiguity: decoration
  // must never turn a wrong option into credit.
  for (const raw of ['"A"', "'A'", '(A)', 'A)', 'A,', 'A!', 'A;', 'A:', '[A]', 'answer: A']) {
    const r = grade(AMBIGUOUS, raw)
    assert.notEqual(r.correct, 1, `${AMBIGUOUS.id} ${JSON.stringify(raw)} was credited (picked ${r.picked})`)
    assert.equal(isServerGraded(r), false, `${AMBIGUOUS.id} ${JSON.stringify(raw)} must not feed readiness`)
    const q7 = grade(byId('csa-u2-q7'), raw)
    assert.notEqual(q7.correct, 1, `csa-u2-q7 ${JSON.stringify(raw)} was credited (picked ${q7.picked})`)
  }
})

test('Q4-G1: decoration still resolves on every item that has no letter-valued option', () => {
  // The collision guard must stay confined to the items that actually collide —
  // today, none of them. On every other (item, letter) pair a decorated letter is
  // just a letter and still earns its verdict, so a guard that over-fires is
  // throwing real evidence away.
  let resolved = 0
  for (const item of SHIPPED_MCQ) {
    for (const label of Object.keys(item.options)) {
      if (COLLIDING.has(`${item.id}:${label}`)) continue
      for (const raw of decorations(label)) {
        const r = grade(item, raw)
        assert.equal(r.graded_by, 'server', `${item.id} ${JSON.stringify(raw)} => ${r.graded_by} (${r.detail})`)
        assert.equal(r.picked, label, `${item.id} ${JSON.stringify(raw)} read as ${r.picked}`)
        resolved++
      }
    }
  }
  assert.ok(resolved > 15000, `only ${resolved} decorated letters resolved`)
})

// ---------------------------------------------------------------------------
// Q4-G3 — a word that asserts nothing is not an answer
// ---------------------------------------------------------------------------

test('Q4-G3: a lone word lifted out of an option is not a statement of that option', () => {
  // matchFragment resolved a one-word fragment to whichever option contained it,
  // so an option's sentence FRAME — 'thrown', 'prints', 'loop' — earned a
  // confident verdict from a response that names no option at all. Both
  // directions do damage: credit for an answer he never gave, and a miss that
  // drags the topic percentage and can open a concept gap he then has to work
  // off. A stopword in front of the word does not make it two words.
  const cases = [
    ['csa-ac-q60', 'thrown', 'was credited: option C is "A `NullPointerException` is thrown."'],
    ['csa-ac-q60', 'is thrown', 'same word behind a stopword'],
    ['csa-ac-q60', 'line', 'booked a miss against option B, "An empty line"'],
    ['csa-ac-q81', 'loop', 'was credited: option C is "Change the loop condition to `i < a.length`"'],
    ['csa-ac-q81', 'the loop', 'same word behind a stopword'],
    ['csa-ac-q14', 'thrown', 'booked a miss recorded as a pick of B'],
    ['csa-ac-q4', 'prints', 'booked a miss recorded as a pick of D'],
    ['csa-ac-q33', 'thrown', 'was credited on the strength of the frame alone'],
  ]
  for (const [id, raw, why] of cases) {
    const r = grade(byId(id), raw)
    assert.equal(
      r.graded_by,
      'unparsed',
      `${id} ${JSON.stringify(raw)} was graded (picked ${r.picked}, correct ${r.correct}) — ${why}`,
    )
    assert.equal(isServerGraded(r), false, `${id} ${JSON.stringify(raw)} must not count`)
  }
})

test('Q4-G3: the word that carries the option keeps its verdict', () => {
  // The guard has to tell an option's substance from its frame, or it throws
  // away real evidence with the noise. Every response here names the heaviest
  // word of exactly one option and stays readable — in both directions, because
  // naming the wrong option's substance is a real answer and a real miss.
  assert.equal(grade(byId('csa-ac-q60'), 'NullPointerException').correct, 1)
  assert.equal(grade(byId('csa-ac-q60'), 'a NullPointerException').correct, 1)
  assert.equal(grade(byId('csa-ac-q60'), 'it throws a NullPointerException').correct, 1)
  assert.equal(grade(byId('csa-ac-q33'), 'StringIndexOutOfBoundsException').correct, 1)
  assert.equal(grade(byId('csa-ac-q4'), 'ArithmeticException').correct, 1)
  assert.equal(grade(byId('csa-ac-q81'), 'Change the loop condition').correct, 1)
  assert.equal(grade(byId('csa-ac-q81'), 'condition').correct, 1)
  // RETIRED EXPECTATIONS: the LABELS 'B' for csa-ac-q14's ArithmeticException
  // option and 'C' for csa-ac-q33's 'An empty string'. Those two items had their
  // options reordered to stop a letter-valued option colliding with another
  // option's label, so the same option texts now sit at different labels ('C' and
  // 'B' respectively) — and a frozen label would have made this test insist the
  // grader read a response as an option that no longer holds those words.
  //
  // Each case therefore names the option by its TEXT, which is what the response
  // is actually reaching for, and the label is looked up on the item. The verdict
  // pinned is unchanged and is the one that matters: the response resolves to the
  // option whose substance it names, that option is not the key, and it is
  // recorded as a real miss.
  const wrongOption = [
    ['csa-ac-q60', 'an empty line', 'An empty line'],
    ['csa-ac-q60', 'empty', 'An empty line'],
    ['csa-ac-q14', 'ArithmeticException', 'An `ArithmeticException` is thrown.'],
    ['csa-ac-q4', 'Infinity', 'It prints `Infinity`.'],
    ['csa-ac-q4', 'it prints Infinity', 'It prints `Infinity`.'],
    ['csa-ac-q33', 'An empty string', 'An empty string'],
  ]
  for (const [id, raw, optionText] of wrongOption) {
    const item = byId(id)
    const owners = Object.entries(item.options).filter(([, text]) => text === optionText).map(([label]) => label)
    assert.equal(
      owners.length, 1,
      `${id}: ${JSON.stringify(optionText)} names ${owners.length} options, so there is no one verdict to pin`,
    )
    const [picked] = owners
    assert.notEqual(picked, normalizeChoice(item.answer), `${id}: ${JSON.stringify(optionText)} is the KEY, not a miss`)
    const r = grade(item, raw)
    assert.equal(r.graded_by, 'server', `${id} ${JSON.stringify(raw)} was declined (${r.detail})`)
    assert.equal(r.picked, picked, `${id} ${JSON.stringify(raw)} read as ${r.picked}, not as option ${picked}`)
    assert.equal(r.correct, 0, `${id} ${JSON.stringify(raw)} names a wrong option and is a real miss`)
  }
})

// ---------------------------------------------------------------------------
// Q4-G4 — the form the options are PRINTED in
// ---------------------------------------------------------------------------

/** A label and its own text together, the way the student sees the option. */
const printedForms = (label, text) => [
  `${label}. ${text}`,
  `(${label}) ${text}`,
  `${label}) ${text}`,
  `${label} - ${text}`,
  `${label}: ${text}`,
  `${text} (${label})`,
]

test('Q4-G4: a label with its own text is the most natural answer there is', () => {
  // The options are printed 'C. 3.2', so that is what a student types when he
  // answers by copying one. LETTER_ONLY needs the letter to BE the whole
  // response and the label prefix stops the text matching any option, so every
  // one of the 218 shipped items declined this with reason 'no_letter' — and
  // api.js has already spent the serve by then and cannot re-grade it. A right
  // answer in the most natural possible format produced no evidence, ever.
  const item = byId('csa-ac-q1') // key C, option C is '3.2'
  for (const raw of printedForms('C', '3.2')) {
    const r = grade(item, raw)
    assert.equal(r.graded_by, 'server', `${JSON.stringify(raw)} was declined (${r.detail})`)
    assert.equal(r.correct, 1, `${JSON.stringify(raw)} was scored wrong (picked ${r.picked})`)
  }
  // A wrong option, printed the same way, is a real miss.
  for (const raw of printedForms('A', '3.4')) {
    const r = grade(item, raw)
    assert.equal(r.graded_by, 'server', `${JSON.stringify(raw)} was declined (${r.detail})`)
    assert.equal(r.picked, 'A', `${JSON.stringify(raw)} read as ${r.picked}`)
    assert.equal(r.correct, 0)
  }
})

test('Q4-G4: a label and a text that disagree are as unreadable as any collision', () => {
  // 'C. 3.4' says option C and prints option A's value. Nothing can tell which
  // half he meant, so nothing is booked — the same answer the grader gives any
  // other response with two live readings.
  const item = byId('csa-ac-q1')
  for (const raw of ['C. 3.4', '(C) 3.4', 'C) 3.4', 'C - 3.4', '3.4 (C)', 'A. 3.2', 'D) 3.2']) {
    const r = grade(item, raw)
    assert.equal(r.graded_by, 'unparsed', `${JSON.stringify(raw)} was graded (picked ${r.picked})`)
    assert.equal(r.detail, 'ambiguous_choice', `${JSON.stringify(raw)} declined for the wrong reason`)
    assert.equal(isServerGraded(r), false)
  }
})

test('Q4-G4: the printed form disambiguates the items whose option text is a letter', () => {
  // A bare 'A' on the item below cannot be read: label A, or option D's text 'A'.
  // Print the whole option — 'A. C', the label and the character the program prints
  // — and both halves say A. Giving MORE of the answer must not be punished.
  //
  // RETIRED FIXTURES: csa-u2-q7 ('A. C', '(A) C', 'D. A') and csa-ac-q14 ('C. B',
  // 'C) B'), the two shipped items that had a letter-valued option when the audit
  // ran. The content fix moved every such option to the label whose letter it is
  // and moved the keys with it, so on the repaired bank q7's key is C and its
  // printed form is 'C. C' — a form in which nothing was ever ambiguous, and which
  // therefore cannot demonstrate disambiguation at all. Keeping the literals would
  // have asserted credit for what is now a wrong option; re-deriving them from the
  // new keys would have left the test passing while proving nothing.
  //
  // So this runs on the item as it shipped, preserved as a fixture that cannot be
  // repaired out from under it. The relapse guard over the real bank is the sweep
  // below ('the printed form of the key resolves'), which covers every shipped
  // item including any future letter-valued option, and needs no collision to
  // exist in order to mean something.
  assert.equal(grade(AMBIGUOUS, 'A. C').correct, 1, 'the label and the printed character both say A')
  assert.equal(grade(AMBIGUOUS, '(A) C').correct, 1)
  assert.equal(grade(AMBIGUOUS, 'D. A').picked, 'D', "option D's own printed form is option D, not the letter A")
  assert.equal(grade(AMBIGUOUS, 'D. A').correct, 0, 'and D is not the key, so it is a real miss')
  // The precondition the whole test rests on: the bare letters really are
  // unreadable here, so the printed form is adding the information that resolves
  // them rather than repeating what was already clear.
  for (const letter of ['A', 'C']) {
    assert.equal(
      grade(AMBIGUOUS, letter).graded_by, 'unparsed',
      `precondition: a bare '${letter}' on the fixture must be unreadable, or 'A. C' disambiguates nothing`,
    )
  }
})

test('Q4-G4: across the whole shipped bank, the printed form of the key resolves', () => {
  let resolved = 0
  for (const item of SHIPPED_MCQ) {
    const keyed = normalizeChoice(item.answer)
    for (const [label, text] of Object.entries(item.options)) {
      for (const raw of printedForms(label, text)) {
        const r = grade(item, raw)
        assert.equal(r.graded_by, 'server', `${item.id} ${JSON.stringify(raw)} => ${r.graded_by} (${r.detail})`)
        assert.equal(r.picked, label, `${item.id} ${JSON.stringify(raw)} read as ${r.picked}`)
        assert.equal(r.correct, label === keyed ? 1 : 0, `${item.id} ${JSON.stringify(raw)}`)
        resolved++
      }
    }
  }
  assert.ok(resolved > 5000, `only ${resolved} printed options resolved`)
})

test('Q4-G4: across the whole shipped bank, a label over another option text declines', () => {
  for (const item of SHIPPED_MCQ) {
    for (const [label, text] of Object.entries(item.options)) {
      for (const other of Object.keys(item.options).filter((l) => l !== label)) {
        // Unless the bank made the two halves genuinely agree: on csa-u2-q7
        // option A's text is 'C', so 'C. C' is option C's label over option A's
        // text and only the letter A can be meant by neither.
        const r = grade(item, `${other}. ${text}`)
        assert.equal(
          r.graded_by,
          'unparsed',
          `${item.id} ${JSON.stringify(`${other}. ${text}`)} was graded as ${r.picked}`,
        )
      }
    }
  }
})

// ---------------------------------------------------------------------------
// Q4-G5 — the guards in the matcher, one assertion each
// ---------------------------------------------------------------------------

test('Q4-G5: a fragment two options share resolves to neither', () => {
  // csa-ac-q17 offers 'x <= 0 && x >= 10' and 'x <= 0 || x >= 10'. A student who
  // types only the part they have in common has not chosen between them, and
  // handing back the first hit would book a verdict he did not earn.
  for (const raw of ['x <=', 'x <= 0', 'x >= 10']) {
    const r = grade(byId('csa-ac-q17'), raw)
    assert.equal(r.graded_by, 'unparsed', `${JSON.stringify(raw)} resolved to ${r.picked}`)
  }
  // '20 30' opens three of csa-ac-q44's four options.
  assert.equal(grade(byId('csa-ac-q44'), '20 30').graded_by, 'unparsed')
})

test('Q4-G5: the words of an option have to appear in order and together', () => {
  // Option C of csa-ac-q81 is 'Change the loop condition to `i < a.length`'.
  // Matching on set inclusion instead of a contiguous run would accept any
  // scramble of its words, which is not what the student wrote.
  const q81 = byId('csa-ac-q81')
  assert.equal(grade(q81, 'the loop condition').correct, 1, 'a run of whole tokens, in order')
  for (const raw of ['condition the loop', 'loop the', 'change condition']) {
    assert.equal(grade(q81, raw).graded_by, 'unparsed', `${JSON.stringify(raw)} was read as an option`)
  }
  assert.equal(grade(byId('csa-ac-q86'), 'copy of each').correct, 1)
  assert.equal(grade(byId('csa-ac-q86'), 'each copy').graded_by, 'unparsed', 'the same words, reordered')
})

test('Q4-G5: a stopword is never an answer, on any item in the bank', () => {
  for (const item of SHIPPED_MCQ) {
    for (const raw of ['the', 'and', 'not', 'but', 'its', 'is not', 'it is', 'and the', 'the and']) {
      const r = grade(item, raw)
      assert.equal(r.graded_by, 'unparsed', `${item.id} ${JSON.stringify(raw)} read as ${r.picked}`)
    }
  }
})

test('Q4-G5: the fragment floor keeps operators out and lets a real short answer in', () => {
  // csa-u4-q13 prints 'b 3 z', which is option A. 'b 3' is three characters, a
  // run of whole tokens in exactly one option, and a real if partial answer.
  assert.equal(grade(byId('csa-u4-q13'), 'b 3').correct, 1)
  assert.equal(grade(byId('csa-u4-q13'), 'z 3').picked, 'B', 'the same shape, naming a wrong option')
  // Two characters is one number out of a printed list, or an operator.
  for (const [id, raw] of [
    ['csa-ac-q44', '10'],
    ['csa-ac-q42', '20'],
    ['csa-ac-q38', '2n'],
  ]) {
    assert.equal(grade(byId(id), raw).graded_by, 'unparsed', `${id} ${JSON.stringify(raw)} was read as an option`)
  }
})

// ---------------------------------------------------------------------------
// Q6-G1 — the printed form, hedged and decorated the way a student writes it
// ---------------------------------------------------------------------------

/** A hedge a student puts in front of an answer, and nothing else. */
const HEDGES = ['I think', 'i think', 'maybe', 'probably', 'my answer is', "I'd say", 'it must be', 'well']

test('Q6-G1: a hedge in front of the printed form does not cost the student his answer', () => {
  // Both halves already resolve on their own — 'C. 3.2' is credited, and so is
  // 'I think C'. Put them together and the answer was thrown away, because
  // labelWithText was the only reader handed the RAW response: it never saw a
  // hedge stripped, and every one of its patterns is anchored at ^.
  const item = byId('csa-ac-q1') // key C, option C is '3.2'
  assert.equal(grade(item, 'C. 3.2').correct, 1, 'baseline: the printed form resolves')
  assert.equal(grade(item, 'I think C').correct, 1, 'baseline: the hedge is stripped off a bare letter')
  for (const hedge of HEDGES) {
    for (const raw of [`${hedge} C. 3.2`, `${hedge} (C) 3.2`, `${hedge} C) 3.2`, `${hedge} C: 3.2`, `${hedge} C - 3.2`, `${hedge} 3.2 (C)`]) {
      const r = grade(item, raw)
      assert.equal(r.graded_by, 'server', `${JSON.stringify(raw)} was declined (${r.detail})`)
      assert.equal(r.correct, 1, `${JSON.stringify(raw)} was scored wrong (picked ${r.picked})`)
    }
  }
  // A hedge cannot manufacture agreement either: the two halves still have to
  // name the same option.
  for (const raw of ['I think C. 3.4', 'maybe A. 3.2']) {
    const r = grade(item, raw)
    assert.equal(r.graded_by, 'unparsed', `${JSON.stringify(raw)} was graded as ${r.picked}`)
    assert.equal(r.detail, 'ambiguous_choice')
  }
})

test('Q6-G1: one trailing mark on the printed form is decoration, not a different answer', () => {
  // LETTER_ONLY has always tolerated a trailing ',', '!', '?', ';', ':' or quote
  // on a bare letter — 'C?' is credited. The text half of the printed form
  // tolerated none of it, so 'C. 3.2?' declined while 'C. 3.2.' and 'C?' both
  // resolved. The whole point of this reader is that giving MORE of the answer
  // must not be punished.
  const item = byId('csa-ac-q1')
  for (const raw of ['C. 3.2?', 'C. 3.2!', 'C. 3.2,', 'C. 3.2;', 'C. 3.2:', '"C. 3.2"', "'C. 3.2'", '(C) 3.2?', 'C) 3.2!', 'I think C. 3.2?']) {
    const r = grade(item, raw)
    assert.equal(r.graded_by, 'server', `${JSON.stringify(raw)} was declined (${r.detail})`)
    assert.equal(r.correct, 1, `${JSON.stringify(raw)} was scored wrong (picked ${r.picked})`)
  }
  // A wrong option, decorated the same way, is still a real miss.
  const wrong = grade(item, 'A. 3.4?')
  assert.equal(wrong.graded_by, 'server')
  assert.equal(wrong.picked, 'A')
  assert.equal(wrong.correct, 0)

  // The undecorated text is tried FIRST, and that ordering is load-bearing.
  // csa-ac-q76 offers `g`, `go`, `g!` and `go!` as four separate options, so on
  // that item a trailing '!' is not decoration at all — it names a different
  // option. 'A. g!' is therefore a genuine standoff between label A and option
  // C, and stripping the mark before trying the text as written would resolve it
  // to A and book a wrong pick.
  const q76 = byId('csa-ac-q76')
  assert.deepEqual(Object.values(q76.options), ['g', 'go', 'g!', 'go!'], 'fixture assumption')
  assert.equal(grade(q76, 'A. g!').detail, 'ambiguous_choice', 'the mark is meaningful on this item')
  assert.equal(grade(q76, 'B. go!').detail, 'ambiguous_choice')
  assert.equal(grade(q76, 'D. go!').correct, 1, 'and the option that really is `go!` still resolves')
  assert.equal(grade(q76, 'A. g?').picked, 'A', "'?' is not one of this item's options, so it is decoration")
})

test('Q6-G1: across the whole shipped bank, a hedged or decorated printed form resolves', () => {
  let resolved = 0
  for (const item of SHIPPED_MCQ) {
    const keyed = normalizeChoice(item.answer)
    for (const [label, text] of Object.entries(item.options)) {
      for (const raw of [
        `I think ${label}. ${text}`,
        `maybe ${label}) ${text}`,
        `my answer is ${label}: ${text}`,
        `${label}. ${text}?`,
        `${label}. ${text},`,
        `${label}. ${text};`,
        `"${label}. ${text}"`,
      ]) {
        const r = grade(item, raw)
        assert.equal(r.graded_by, 'server', `${item.id} ${JSON.stringify(raw)} => ${r.graded_by} (${r.detail})`)
        assert.equal(r.picked, label, `${item.id} ${JSON.stringify(raw)} read as ${r.picked}`)
        assert.equal(r.correct, label === keyed ? 1 : 0, `${item.id} ${JSON.stringify(raw)}`)
        resolved++
      }
    }
  }
  assert.ok(resolved > 5000, `only ${resolved} hedged printed forms resolved`)
})

// ---------------------------------------------------------------------------
// Q6-G2 — the separator is what keeps the English article out
// ---------------------------------------------------------------------------

test('Q6-G2: a bare space is not a label separator, on any item in the bank', () => {
  // LABEL_THEN_TEXT demands a real separator — ')', '.', ':', ',', ';' or a dash
  // — between the label and its text. Accepting a space instead would make the
  // article in 'a NullPointerException' a label prefix: on csa-ac-q1 (key C) the
  // response 'a 3.4' would name label A over option A's own text, the two halves
  // would agree, and a wrong pick of A would be booked; on csa-ac-q2 (key A,
  // option A '11') 'a 11' would be credited outright. Neither response names a
  // label at all. Pinned over the whole bank, in both directions.
  for (const item of SHIPPED_MCQ) {
    for (const [label, text] of Object.entries(item.options)) {
      for (const raw of [`${label} ${text}`, `${label.toLowerCase()} ${text}`]) {
        const r = grade(item, raw)
        assert.equal(
          r.graded_by,
          'unparsed',
          `${item.id} ${JSON.stringify(raw)} was graded as ${r.picked} (correct ${r.correct})`,
        )
        assert.equal(r.detail, 'no_letter', `${item.id} ${JSON.stringify(raw)} declined for the wrong reason`)
      }
    }
  }
  // The two responses the audit named, stated as the outcomes they must not have.
  const q1 = grade(byId('csa-ac-q1'), 'a 3.4')
  assert.notEqual(q1.picked, 'A', 'the article booked a wrong pick of A')
  assert.equal(isServerGraded(q1), false)
  const q2 = grade(byId('csa-ac-q2'), 'a 11')
  assert.notEqual(q2.correct, 1, 'the article earned an undeserved credit')
  assert.equal(isServerGraded(q2), false)
  // And a real separator still resolves the same pair, so the pin is about the
  // space and not about the reading.
  assert.equal(grade(byId('csa-ac-q1'), 'a. 3.4').picked, 'A')
  assert.equal(grade(byId('csa-ac-q2'), 'a. 11').correct, 1)
})

// ---------------------------------------------------------------------------
// Q6-G3 — a letter the item does not offer names nothing
// ---------------------------------------------------------------------------

test('Q6-G3: a fifth letter over an option text is no_letter, not an ambiguous choice', () => {
  // csa-ac-q1 has four options. 'E. 3.2' names a label that does not exist, so
  // the response is not the printed form of anything and the recorded reason is
  // that no letter was named. Without the index check the letter E survives, the
  // text half resolves to C, the two disagree, and the attempt is stored — and
  // handed to the GPT — as 'ambiguous choice': it tells the student his answer
  // was unreadable between two options when he named an option that is not on
  // the paper.
  const item = byId('csa-ac-q1')
  assert.ok(!('E' in item.options), 'fixture assumption: csa-ac-q1 offers no option E')
  for (const raw of ['E. 3.2', 'e) 3.2', '(E) 3.2', 'E: 3.2', '3.2 (E)', 'I think E. 3.2']) {
    const r = grade(item, raw)
    assert.equal(r.graded_by, 'unparsed', `${JSON.stringify(raw)} was graded as ${r.picked}`)
    assert.equal(r.detail, 'no_letter', `${JSON.stringify(raw)} was recorded as ${r.detail}`)
  }
  // The same shape with a letter the item DOES offer still reports the standoff.
  assert.equal(grade(item, 'D. 3.2').detail, 'ambiguous_choice')
})

test('G7: no shipped mcq is keyed with something the grader cannot use', () => {
  for (const item of SHIPPED_MCQ) {
    const keyed = normalizeChoice(item.answer)
    assert.ok(keyed, `${item.id} has an unusable key ${JSON.stringify(item.answer)}`)
    assert.ok(keyed in item.options, `${item.id} is keyed ${keyed}, which is not one of its options`)
  }
})

// ---------------------------------------------------------------------------
// Q8-G1 — a character that MEANS an ASCII character is that ASCII character
//
// normalizeShort and canonAnswer folded `$`, `\left`, backticks, whitespace and a
// trailing period, but not the lookalikes every real keyboard, CAS, PDF and word
// processor emits. Substituting U+2212 MINUS SIGN for the ASCII hyphen in a
// SHIPPED CORRECT ANSWER, 7 of the 24 keyed constructed items came back
// `correct: 0, graded_by: 'server', detail: 'mismatch'` — pc-u1-p3, pc-u1-p5,
// pc-u1-p6, pc-u3-p1, pc-u3-p2, pc-u3-p5, pc-u4-p3 — a right answer marked wrong
// and booked as a miss the student then has to work off. The same substitution
// pushed 80 option texts across 26 mcq items to `unparsed / no_letter`: the serve
// is spent and no evidence is recorded at all.
//
// It bit in BOTH directions, because the bank itself carries these characters in
// its own keys and options: `n(n−1)/2` (csa-u2-q23 option A), `n²` (csa-ac-q38),
// `π/3` (pc-u3-p19), `cos θ` (pc-u3-p21), `15 ≤ H ≤ 62.5` (pc-u1-p17),
// `-√3/2` (pc-u3-p14), `show(7) → show(int)` (csa-u1-q11), `résumé` (csa-u3-q3)
// and an em dash on six more. On every one of those a student typing the plain
// ASCII form of the option printed in front of him was refused.
//
// tools/build/parse-precalc.js gates `isTypeable = /^[\x20-\x7E]+$/` on accepted
// forms, so an ASCII-typeable spelling is guaranteed to EXIST. That gate is
// one-directional: it never made a Unicode-typed RESPONSE acceptable, and it does
// not apply to mcq option text at all. This is the other half.
// ---------------------------------------------------------------------------

/**
 * Mutations that swap a character for one that means the same thing. Each is
 * applied to a form the bank itself declares correct; the verdict must not move.
 * These are what a student's keyboard, a pasted PDF, a CAS and Word produce.
 */
const LOOKALIKE_MUTATIONS = {
  minus_sign: (s) => s.replace(/-/g, '−'),
  en_dash: (s) => s.replace(/-/g, '–'),
  em_dash_to_ascii: (s) => s.replace(/[–—]/g, '-'),
  nbsp: (s) => s.replace(/ /g, ' '),
  thin_space: (s) => s.replace(/ /g, ' '),
  zero_width: (s) => s.replace(/([^\s])/g, '$1​'),
  curly_apostrophe: (s) => s.replace(/'/g, '’'),
  curly_quotes: (s) => s.replace(/"([^"]*)"/g, '“$1”'),
  pi_symbol: (s) => s.replace(/pi/g, 'π'),
  pi_to_ascii: (s) => s.replace(/π/g, 'pi'),
  theta_to_ascii: (s) => s.replace(/θ/g, 'theta'),
  radical_to_ascii: (s) => s.replace(/√/g, 'sqrt'),
  superscript_two: (s) => s.replace(/\^2\b/g, '²'),
  superscript_to_ascii: (s) => s.replace(/²/g, '^2'),
  le_ge_to_ascii: (s) => s.replace(/≤/g, '<=').replace(/≥/g, '>='),
  arrow_to_ascii: (s) => s.replace(/→/g, '->').replace(/⇒/g, '=>'),
  accent_stripped: (s) => s.replace(/é/g, 'e'),
  fullwidth: (s) => s.replace(/[\x21-\x7e]/g, (c) => String.fromCharCode(c.charCodeAt(0) + 0xfee0)),
  leading_dot: (s) => s.replace(/(^|[^\w.])0\.(\d)/g, '$1.$2'),
}

/** The keyed short-answer items — the ones a student types a value into. */
const SHIPPED_CONSTRUCTED = SHIPPED.filter(
  (i) => i.kind === 'constructed' && i.answer != null && String(i.answer).trim() !== '',
)

/**
 * The accepted forms of an item, one per distinct multiset of characters.
 *
 * Every mutation above is a per-CHARACTER substitution, so two forms built from
 * the same characters exercise byte-for-byte the same substitutions. The variant
 * sets are mostly word-order permutations — pc-u3-p1 ships 960 of them — so this
 * throws away nothing the sweep could have caught and turns ten seconds into a
 * fraction of one. Every distinct SPELLING (`sqrt2` vs `sqrt(2)`, `pi` vs `π`,
 * `50*0.8^x` vs `50(0.8)^x`) has its own multiset and is kept.
 */
const acceptedForms = (item) => {
  const bySignature = new Map()
  for (const form of [item.answer, ...(item.answer_variants ?? [])]) {
    if (form == null || String(form).trim() === '') continue
    const signature = [...String(form)].sort().join('')
    if (!bySignature.has(signature)) bySignature.set(signature, String(form))
  }
  return [...bySignature.values()]
}

test('Q8-G1: every shipped short answer survives every lookalike substitution', () => {
  assert.ok(SHIPPED_CONSTRUCTED.length >= 20, `only ${SHIPPED_CONSTRUCTED.length} keyed constructed items`)
  const refused = []
  for (const item of SHIPPED_CONSTRUCTED) {
    for (const form of acceptedForms(item)) {
      // The bank declares this form correct, so the unmutated form must pass.
      assert.equal(grade(item, form).correct, 1, `${item.id} refuses its own declared form ${JSON.stringify(form)}`)
      for (const [name, mutate] of Object.entries(LOOKALIKE_MUTATIONS)) {
        const typed = mutate(form)
        if (typed === form) continue
        const r = grade(item, typed)
        if (r.correct !== 1 || r.graded_by !== 'server') {
          refused.push(`${item.id} ${name} ${JSON.stringify(typed)} -> ${r.graded_by}/${r.detail}`)
        }
      }
    }
  }
  assert.deepEqual(refused.slice(0, 25), [], `${refused.length} right answers marked wrong`)
})

/** (item, label) pairs where the option's own text already resolves to it. */
const READABLE_OPTIONS = SHIPPED_MCQ.flatMap((item) =>
  Object.entries(item.options)
    .filter(([label, text]) => text != null && grade(item, String(text)).picked === label)
    .map(([label, text]) => [item, label, String(text)]),
)

test('Q8-G1: every readable mcq option survives every lookalike substitution', () => {
  assert.ok(READABLE_OPTIONS.length >= 500, `only ${READABLE_OPTIONS.length} readable options`)
  const refused = []
  for (const [item, label, text] of READABLE_OPTIONS) {
    for (const [name, mutate] of Object.entries(LOOKALIKE_MUTATIONS)) {
      const typed = mutate(text)
      if (typed === text) continue
      const r = grade(item, typed)
      if (r.graded_by !== 'server' || r.picked !== label) {
        refused.push(`${item.id}:${label} ${name} ${JSON.stringify(typed)} -> ${r.graded_by}/${r.detail}/${r.picked}`)
      }
    }
  }
  assert.deepEqual(refused.slice(0, 25), [], `${refused.length} readable options stopped resolving`)
})

test('Q8-G1: folding never credits an answer the bank calls wrong', () => {
  // Folding is a character equivalence. It may not make two DIFFERENT answers
  // equal, so every distractor — and every lookalike spelling of one — still
  // scores 0, and no other item's key is ever accepted here.
  const credited = []
  for (const item of SHIPPED_MCQ) {
    const keyed = normalizeChoice(item.answer)
    for (const [label, text] of Object.entries(item.options)) {
      if (label === keyed || text == null) continue
      for (const mutate of [(s) => s, ...Object.values(LOOKALIKE_MUTATIONS)]) {
        const r = grade(item, mutate(String(text)))
        if (r.correct === 1) credited.push(`${item.id} distractor ${label} credited via ${JSON.stringify(mutate(String(text)))}`)
      }
    }
  }
  for (const item of SHIPPED_CONSTRUCTED) {
    const own = new Set(
      [item.answer, ...(item.answer_variants ?? [])].filter((a) => a != null).map((a) => normalizeShort(a)),
    )
    const wrong = [
      // A sign that vanished is a different answer.
      String(item.answer).replace(/-/g, ''),
      // So is a digit that changed.
      String(item.answer).replace(/\d/, (d) => String((Number(d) + 1) % 10)),
      // And so is every other item's answer.
      ...SHIPPED_CONSTRUCTED.filter((o) => o.id !== item.id).map((o) => String(o.answer)),
    ]
    for (const w of wrong) {
      for (const mutate of [(s) => s, ...Object.values(LOOKALIKE_MUTATIONS)]) {
        const typed = mutate(w)
        if (own.has(normalizeShort(typed))) continue
        const r = grade(item, typed)
        if (r.correct === 1) credited.push(`${item.id} credited wrong answer ${JSON.stringify(typed)}`)
      }
    }
  }
  assert.deepEqual(credited.slice(0, 25), [], `${credited.length} wrong answers credited`)
})

test('Q8-G1: folding leaves every item’s options distinct from each other', () => {
  // If a fold collapsed two options onto one canonical form the grader would
  // report `ambiguous_choice` where it used to resolve — a refusal, not a false
  // credit, but still a serve spent. No shipped item may reach that state.
  const collapsed = []
  for (const item of SHIPPED_MCQ) {
    const seen = new Map()
    for (const [label, text] of Object.entries(item.options)) {
      if (text == null) continue
      const canon = normalizeShort(text)
      if (seen.has(canon)) collapsed.push(`${item.id}: ${seen.get(canon)} and ${label} both fold to ${JSON.stringify(canon)}`)
      seen.set(canon, label)
    }
  }
  assert.deepEqual(collapsed, [])
})

test('Q8-G1: every bare letter and every key still resolves after folding', () => {
  for (const item of SHIPPED_MCQ) {
    for (const label of Object.keys(item.options)) {
      assert.equal(grade(item, label).picked, label, `${item.id} lost the bare letter ${label}`)
      assert.equal(grade(item, `choice ${label}`).picked, label, `${item.id} lost 'choice ${label}'`)
    }
    assert.ok(normalizeChoice(item.answer), `${item.id} key became unreadable`)
  }
})

test('Q8-G1: the fold is stated on normalizeShort directly', () => {
  const eq = (a, b) => assert.equal(normalizeShort(a), normalizeShort(b), `${JSON.stringify(a)} != ${JSON.stringify(b)}`)
  eq('−2', '-2')             // U+2212 MINUS SIGN, what a CAS emits
  eq('y = 2x – 1', 'y = 2x - 1')  // en dash
  eq('a — b', 'a - b')       // em dash
  eq('a‑b', 'a-b')           // non-breaking hyphen
  eq('x = 4', 'x = 4')  // non-breaking space
  eq('a​b', 'ab')            // zero-width space from a paste
  eq('don’t', "don't")       // curly apostrophe
  eq('“yes”', '"yes"')  // curly quotes
  eq('3π/4', '3pi/4')        // pi
  eq('cos θ', 'cos theta')   // theta
  eq('√3/2', 'sqrt3/2')      // radical
  eq('n²', 'n^2')            // superscript two
  eq('x⁻¹', 'x^(-1)')   // a superscript run
  eq('15 ≤ h', '15 <= h')    // less-or-equal
  eq('a → b', 'a -> b')      // arrow
  eq('résumé', 'resume')// accented letter
  eq('ｙ＝２', 'y=2') // fullwidth
  eq('½', '1/2')             // vulgar fraction
  eq('.8', '0.8')                 // a leading-dot decimal
  eq('y=50(.8)^x', 'y=50(0.8)^x')
  // And it does NOT make different answers equal.
  assert.notEqual(normalizeShort('-2'), normalizeShort('2'))
  assert.notEqual(normalizeShort('n^2'), normalizeShort('n^3'))
  assert.notEqual(normalizeShort('0.8'), normalizeShort('0.08'))
  assert.notEqual(normalizeShort('pi/6'), normalizeShort('pi/3'))
})
