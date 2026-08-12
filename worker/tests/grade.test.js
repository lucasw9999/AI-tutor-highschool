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

test('the shipped bank really is the thing under test', () => {
  assert.ok(SHIPPED_MCQ.length >= 200, `only ${SHIPPED_MCQ.length} shipped mcq items`)
})

test('G7: real shipped items credit the answer the student actually gave', async (t) => {
  const table = [
    // [item id, responses that MUST be graded correct]
    ['csa-ac-q60', ['C', 'c', '(C)', 'answer: C', 'the answer is C', 'I think C',
      'A NullPointerException is thrown.', 'A `NullPointerException` is thrown.',
      'it throws a NullPointerException', 'it throws a `NullPointerException`']],
    ['csa-ac-q33', ['D', 'd', 'answer: D', 'choice D',
      'A StringIndexOutOfBoundsException is thrown.', 'a StringIndexOutOfBoundsException',
      'it throws a StringIndexOutOfBoundsException']],
    ['csa-ac-q14', ['C', 'c', 'answer: C', 'it prints B', 'the output is B', 'prints B']],
    ['csa-ac-q30', ['B', 'b', 'answer: B', 'ef', 'it prints ef', 'the output is ef']],
    ['csa-u2-q7', ['choice A', 'option A', 'it prints C', 'the output is C']],
  ]
  for (const [id, responses] of table) {
    await t.test(id, () => {
      const item = byId(id)
      for (const raw of responses) {
        const r = grade(item, raw)
        assert.equal(r.graded_by, 'server', `${id} ${JSON.stringify(raw)} was not graded`)
        assert.equal(r.correct, 1, `${id} marked ${JSON.stringify(raw)} wrong (picked ${r.picked}, key ${r.keyed})`)
      }
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
  const reproduced = [
    ['csa-ac-q60', 'it throws a NullPointerException'],
    ['csa-ac-q33', 'a StringIndexOutOfBoundsException'],
    ['csa-ac-q33', 'A StringIndexOutOfBoundsException is thrown.'],
    ['csa-ac-q14', 'B'],
    ['csa-ac-q14', 'it prints B'],
    ['csa-ac-q30', 'ef'],
    ['csa-u2-q7', 'A'],
    ['csa-u2-q7', 'it prints C'],
  ]
  for (const [id, raw] of reproduced) {
    const r = grade(byId(id), raw)
    assert.ok(
      !(r.graded_by === 'server' && r.correct === 0),
      `${id}: ${JSON.stringify(raw)} was scored as a miss (picked ${r.picked}, key ${r.keyed})`,
    )
  }
})

// Which letters on which items genuinely cannot be read: both readings of the
// response are live and lead to different options, so the grader declines rather
// than guess. Every entry is an item whose option TEXT is a bare letter — a
// content defect, not a grading one. Nothing else in the bank may join this list.
const AMBIGUOUS_BY_DESIGN = new Set([
  'csa-ac-q14:B', // option C's text is 'B'
  'csa-ac-q33:C', // option A's text is 'c'
  'csa-u2-q7:A', // option D's text is 'A'
  'csa-u2-q7:C', // option A's text is 'C'
])

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
            AMBIGUOUS_BY_DESIGN.has(`${item.id}:${label}`),
            `${item.id}: ${JSON.stringify(form)} was left ungraded and is not a known collision`,
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
// ---------------------------------------------------------------------------

/**
 * Every shipped (item, letter) pair where the letter names one option as a
 * LABEL and a DIFFERENT option as a VALUE. Both readings are live, so the
 * grader declines — and it has to go on declining however the student decorated
 * the letter. Derived from the bank rather than listed, so a new colliding item
 * cannot quietly appear and be graded by a coin flip.
 */
const LETTER_COLLISIONS = SHIPPED_MCQ.flatMap((item) =>
  Object.keys(item.options).flatMap((label) => {
    const owners = Object.entries(item.options)
      .filter(([, text]) => String(text).trim().toUpperCase() === label)
      .map(([owner]) => owner)
    return owners.length === 1 && owners[0] !== label ? [[item.id, label, owners[0]]] : []
  }),
)

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

test('Q4: the bank still contains the collisions these tests are about', () => {
  assert.deepEqual(
    LETTER_COLLISIONS.map(([id, label]) => `${id}:${label}`).sort(),
    [...AMBIGUOUS_BY_DESIGN].sort(),
    'the set of letter collisions in the shipped bank has changed',
  )
})

test('Q4-G1/G2: a decorated letter never outranks the value reading it collides with', async (t) => {
  for (const [id, letter, owner] of LETTER_COLLISIONS) {
    await t.test(`${id} ${letter} (label ${letter} vs option ${owner})`, () => {
      const item = byId(id)
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
  // csa-u2-q7 prints 'C' when score is 70; option A's text IS 'C' and the key
  // is A. Quoting a printed character is a natural thing to do, and the student
  // who writes "C" is RIGHT. LETTER_ONLY strips the quotes and reads a label,
  // canonAnswer keeps them so the competing value reading found nothing, and
  // matchFragment ignores anything under three characters — so the label won a
  // confident verdict and he was told he was wrong. One comma was enough.
  for (const raw of ['"C"', "'C'", '(C)', 'C)', 'C,', 'C!', 'C;', 'C:', '[C]']) {
    const r = grade(byId('csa-u2-q7'), raw)
    assert.ok(
      !(r.graded_by === 'server' && r.correct === 0),
      `csa-u2-q7 ${JSON.stringify(raw)} was scored as a miss (picked ${r.picked}, key ${r.keyed})`,
    )
  }
  // Same shape on csa-ac-q14: the key is C and option C's text is the printed 'B'.
  for (const raw of ['"B"', "'B'", '(B)', 'B)', 'B,', 'B!', 'B;', 'B:', '[B]']) {
    const r = grade(byId('csa-ac-q14'), raw)
    assert.ok(
      !(r.graded_by === 'server' && r.correct === 0),
      `csa-ac-q14 ${JSON.stringify(raw)} was scored as a miss (picked ${r.picked}, key ${r.keyed})`,
    )
  }
})

test('Q4-G2: a decorated letter that happens to equal the key is not credit', () => {
  // The mirror of Q4-G1, and it feeds readiness. On csa-u2-q7 the key is A and
  // option D's text is 'A', so a student who miscomputed the output as A and
  // typed '(A)' was told he was right and it counted toward being ready.
  for (const raw of ['"A"', "'A'", '(A)', 'A)', 'A,', 'A!', 'A;', 'A:', '[A]', 'answer: A']) {
    const r = grade(byId('csa-u2-q7'), raw)
    assert.notEqual(r.correct, 1, `csa-u2-q7 ${JSON.stringify(raw)} was credited (picked ${r.picked})`)
    assert.equal(isServerGraded(r), false, `csa-u2-q7 ${JSON.stringify(raw)} must not feed readiness`)
  }
})

test('Q4-G1: decoration still resolves on every item that has no letter-valued option', () => {
  // The collision guard must stay confined to the four items that collide. On
  // the rest, a decorated letter is just a letter and still earns its verdict.
  const colliding = new Set(LETTER_COLLISIONS.map(([id, label]) => `${id}:${label}`))
  let resolved = 0
  for (const item of SHIPPED_MCQ) {
    for (const label of Object.keys(item.options)) {
      if (colliding.has(`${item.id}:${label}`)) continue
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
  for (const [id, raw, picked] of [
    ['csa-ac-q60', 'an empty line', 'B'],
    ['csa-ac-q60', 'empty', 'B'],
    ['csa-ac-q14', 'ArithmeticException', 'B'],
    ['csa-ac-q4', 'Infinity', 'D'],
    ['csa-ac-q4', 'it prints Infinity', 'D'],
    ['csa-ac-q33', 'An empty string', 'C'],
  ]) {
    const r = grade(byId(id), raw)
    assert.equal(r.graded_by, 'server', `${id} ${JSON.stringify(raw)} was declined (${r.detail})`)
    assert.equal(r.picked, picked, `${id} ${JSON.stringify(raw)} read as ${r.picked}`)
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
  // csa-u2-q7's bare 'A' cannot be read: label A, or option D's text 'A'. Print
  // the whole option — 'A. C', the label and the character the program prints —
  // and both halves say A. Giving more of the answer must not be punished.
  assert.equal(grade(byId('csa-u2-q7'), 'A. C').correct, 1)
  assert.equal(grade(byId('csa-u2-q7'), '(A) C').correct, 1)
  assert.equal(grade(byId('csa-u2-q7'), 'D. A').picked, 'D')
  assert.equal(grade(byId('csa-ac-q14'), 'C. B').correct, 1)
  assert.equal(grade(byId('csa-ac-q14'), 'C) B').correct, 1)
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

test('G7: no shipped mcq is keyed with something the grader cannot use', () => {
  for (const item of SHIPPED_MCQ) {
    const keyed = normalizeChoice(item.answer)
    assert.ok(keyed, `${item.id} has an unusable key ${JSON.stringify(item.answer)}`)
    assert.ok(keyed in item.options, `${item.id} is keyed ${keyed}, which is not one of its options`)
  }
})
