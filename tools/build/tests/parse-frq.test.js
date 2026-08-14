// The FRQ ingestion, tested against the REAL markdown.
//
// Free response is 45% of the AP CSA exam and all 25 of its points, and the
// database held ZERO items of kind 'frq' while ap_csa/ap_csa_exam/question-bank/
// carried 20 finished practice FRQs. Nothing in tools/ or worker/src ever
// mentioned frq-q*.md: parse-mcq.js hardcodes five mcq-*.md files, so the whole
// free-response bank was invisible to the build.
//
// Every parser in this repo has been bitten by assuming a convention the
// markdown does not follow — one found 22 of 48 items and reported success,
// another truncated every field at its first newline. So these tests pin the
// conventions that are actually in the files, and pin the parser's refusal to
// report success on a partial parse:
//
//   * a rubric criterion may contain UNESCAPED pipes inside an inline code span
//     (frq-q4 point 4 of borderSum: `r == 0 || r == grid.length - 1 || ...`),
//     which a naive split on '|' shreds into eight cells;
//   * stems are multi-paragraph with fenced code in the middle;
//   * Q1's rubric is TWO tables (4 points + 3 points) numbered 1..7 across both,
//     while Q2/Q3/Q4 have one;
//   * Q3's provided `Book` class sits in the section preamble, outside any item,
//     and the prose says which items it belongs to.
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { parseFrqAll, parseFrqFile, splitCells, FRQ_FILES, FRQ_TOTAL, FrqParseError } from '../parse-frq.js'

const ROOT = new URL('../../../', import.meta.url)
const BANK = new URL('ap_csa/ap_csa_exam/question-bank/', ROOT)
const MATRIX = new URL('ap_csa/ap_csa_exam/topic-coverage-matrix.md', ROOT)

const read = (f) => readFileSync(new URL(f, BANK), 'utf8')
/** A bank reader that serves the real files, with one file's text rewritten. */
const patched = (file, patch) => (f) => (f === file ? patch(read(f)) : read(f))

const REAL = parseFrqAll(read)
const items = REAL.items
const byId = new Map(items.map((i) => [i.id, i]))
const of = (slot) => items.filter((i) => i.question_type === slot)

// --- what the markdown actually contains -----------------------------------

test('all four FRQ files are ingested: 5 practice FRQs each, 20 in total', () => {
  assert.equal(FRQ_FILES.length, 4)
  assert.equal(items.length, 20)
  assert.equal(FRQ_TOTAL, 20)
  assert.deepEqual(
    FRQ_FILES.map((f) => [f.slot, of(f.slot).length]),
    [['Q1', 5], ['Q2', 5], ['Q3', 5], ['Q4', 5]],
  )
})

test('the four question types carry their real exam point values: 7/7/5/6', () => {
  assert.deepEqual(
    FRQ_FILES.map((f) => [f.slot, f.points]),
    [['Q1', 7], ['Q2', 7], ['Q3', 5], ['Q4', 6]],
  )
  for (const f of FRQ_FILES) {
    for (const it of of(f.slot)) {
      assert.equal(it.points, f.points, `${it.id} must be worth ${f.points} points`)
      assert.equal(it.rubric.total_points, f.points, `${it.id} rubric total`)
    }
  }
})

test('this test is the ONLY thing that catches worker/config/ap_csa.json drifting', () => {
  // FRQ_FILES is the authority: it is what the markdown is validated against, and
  // nothing at runtime reads exam.frq_points — grep it and you find this file, the
  // parser's own prose, and nothing that executes. So a config that drifts from
  // the parser builds clean and ships, and ONLY this assertion objects. It is not
  // a redundant restatement of a stronger check; it is the whole check.
  const cfg = JSON.parse(readFileSync(new URL('worker/config/ap_csa.json', ROOT), 'utf8'))
  assert.deepEqual(
    Object.fromEntries(FRQ_FILES.map((f) => [f.slot, f.points])),
    cfg.exam.frq_points,
    'FRQ_FILES is what the build validates the markdown against; exam.frq_points only re-states it for the Worker',
  )
  assert.equal(FRQ_TOTAL / FRQ_FILES.length, 5, 'five practice FRQs per exam question type')
})

test('every rubric is itemized point by point, numbered 1..N with no gaps', () => {
  for (const it of items) {
    const points = it.rubric.criteria.map((c) => c.point)
    assert.deepEqual(
      points,
      Array.from({ length: it.points }, (_, k) => k + 1),
      `${it.id}: ${it.points} points must be numbered 1..${it.points} in order`,
    )
    for (const c of it.rubric.criteria) {
      assert.ok(c.criterion && c.criterion.trim().length > 10, `${it.id} point ${c.point} needs a real criterion`)
    }
  }
})

test('Q1 rubrics are two parts summing to 7; Q2-Q4 are single tables', () => {
  for (const it of of('Q1')) {
    assert.deepEqual(it.rubric.parts.map((p) => [p.label, p.points]), [['Part A', 4], ['Part B', 3]], it.id)
    assert.equal(it.rubric.parts.reduce((n, p) => n + p.points, 0), 7)
    assert.deepEqual(
      [...new Set(it.rubric.criteria.map((c) => c.part))],
      ['Part A', 'Part B'],
      `${it.id}: every criterion belongs to the part whose table it is in`,
    )
    assert.deepEqual(it.rubric.criteria.filter((c) => c.part === 'Part A').map((c) => c.point), [1, 2, 3, 4])
    assert.deepEqual(it.rubric.criteria.filter((c) => c.part === 'Part B').map((c) => c.point), [5, 6, 7])
  }
  for (const slot of ['Q2', 'Q3', 'Q4']) {
    for (const it of of(slot)) {
      assert.deepEqual(it.rubric.parts, [], `${it.id} has one undivided rubric`)
      assert.deepEqual([...new Set(it.rubric.criteria.map((c) => c.part))], [null], it.id)
    }
  }
})

test('Q1 part rubrics name the method each part scores', () => {
  assert.deepEqual(
    byId.get('csa-frq-q1-p1').rubric.parts.map((p) => p.method),
    ['countLongTrips', 'routeCode'],
  )
})

// --- the pipe trap: a criterion containing unescaped '||' in a code span -----

test('a rubric criterion with unescaped pipes inside a code span survives intact', () => {
  // frq-q4-2d-array.md line 298. parse-topics.js's splitRow only knows about the
  // ESCAPED pipe (\|) that file uses, and there is not one escaped pipe in any
  // frq-q*.md: splitting this row on '|' yields eight cells and truncates the
  // criterion at "with the condition `r == 0 ".
  const point4 = byId.get('csa-frq-q4-p5').rubric.criteria.find((c) => c.point === 4)
  assert.match(point4.criterion, /r == 0 \|\| r == grid\.length - 1 \|\| c == 0 \|\| c == grid\[0\]\.length - 1/)
  assert.match(point4.criterion, /last row\/col use `length - 1`/, 'and the text after the code span too')
})

test('no criterion text was truncated at a pipe, a newline or a backtick', () => {
  // Cross-checked against the source: every criterion the markdown wrote must
  // appear in the file verbatim, whole. The source is unescaped the same way
  // splitCells unescapes it, because a criterion is stored RENDERED: an author who
  // writes the markdown-correct `\|` gets `|` in the item, and comparing that
  // against the raw bytes would fail a row that in fact parsed perfectly. See
  // 'a criterion written with markdown-correct escaped pipes survives too' below.
  for (const f of FRQ_FILES) {
    const text = read(f.file).replace(/\\\|/g, '|')
    for (const it of of(f.slot)) {
      for (const c of it.rubric.criteria) {
        assert.ok(
          text.includes(c.criterion),
          `${it.id} point ${c.point} is not in ${f.file} verbatim:\n  ${c.criterion}`,
        )
      }
    }
  }
})

test('splitCells resolves an escaped pipe to a literal, outside a code span and in', () => {
  // The escaped-pipe arm of splitCells is the one branch that decides how a point
  // is cut out of a row and had no test at all: there is not one `\|` in the four
  // files. It is the documented escape hatch for a criterion that must show a
  // literal pipe outside a code span, so it is pinned here rather than left to the
  // first author who needs it.
  assert.deepEqual(splitCells('| 4 | uses r == 0 \\|\\| c == 0 |'), ['', ' 4 ', ' uses r == 0 || c == 0 ', ''])
  assert.deepEqual(splitCells('| 1 | a `x | y` b |'), ['', ' 1 ', ' a `x | y` b ', ''])
  assert.deepEqual(splitCells('| 1 | plain |'), ['', ' 1 ', ' plain ', ''])
})

test('a criterion written with markdown-correct escaped pipes survives too', () => {
  // The four files use UNESCAPED pipes inside code spans, which is what the parser
  // is built for. But `\|` is markdown's own escape and the header advertises it,
  // so writing it must not break anything: the criterion arrives with the escape
  // resolved, whole, and reads exactly as the unescaped row does.
  const row = read('frq-q4-2d-array.md').split('\n').find((l) => l.startsWith('| 4 ') && l.includes('r == 0 ||'))
  const escaped = patched('frq-q4-2d-array.md', (t) => t.replace(row, row.replace(/\|\|/g, '\\|\\|')))
  const point4 = parseFrqAll(escaped).items
    .find((i) => i.id === 'csa-frq-q4-p5').rubric.criteria.find((c) => c.point === 4)
  assert.match(point4.criterion, /r == 0 \|\| r == grid\.length - 1 \|\| c == 0 \|\| c == grid\[0\]\.length - 1/)
  assert.match(point4.criterion, /last row\/col use `length - 1`/)
  assert.equal(point4.criterion, byId.get('csa-frq-q4-p5').rubric.criteria.find((c) => c.point === 4).criterion)
})

// --- stems, solutions, traces ----------------------------------------------

test('every item carries a multi-line stem, a sample solution and a trace check', () => {
  for (const it of items) {
    assert.ok(it.stem.trim().length > 80, `${it.id} stem is too short to be a real prompt`)
    assert.ok(it.solution.includes('```java'), `${it.id} solution must keep its fenced Java`)
    assert.ok(it.trace_check.length > 40, `${it.id} must carry its trace check`)
    assert.ok(it.explanation.includes(it.solution), `${it.id} explanation is built on the sample solution`)
    assert.equal(it.answer, null, `${it.id} is rubric-scored, so it must not pretend to have a key`)
    assert.equal(it.kind, 'frq')
    assert.equal(it.subject, 'ap_csa')
  }
})

test('a stem keeps every paragraph and code fence, in source order', () => {
  const q1p1 = byId.get('csa-frq-q1-p1')
  assert.match(q1p1.stem, /^A `TripLog` class records the distances/)
  assert.match(q1p1.stem, /\*\*Part A \(4 points\)\.\*\*/)
  assert.match(q1p1.stem, /\*\*Part B \(3 points\)\.\*\*/)
  assert.match(q1p1.stem, /public static int distanceOf\(int id\)/, 'the provided helpers')
  assert.match(q1p1.stem, /public static String routeCode\(String label\)/, 'the Part B skeleton')
  assert.match(q1p1.stem, /routeCode\("LOCAL"\)` returns `"LOCAL"`\.$/, 'through to the last example')
  assert.equal(q1p1.stem.split('```java').length - 1, 3, 'one provided block plus two skeletons')
  assert.ok(!q1p1.stem.includes('#### '), 'the stem stops before the sample solution')
  assert.ok(!q1p1.stem.includes('Trace check'), 'and never swallows the rubric or trace')
})

test('a stem shows the grid examples that are not Java', () => {
  const q4p1 = byId.get('csa-frq-q4-p1')
  assert.match(q4p1.stem, /\{\{1, 2, 3\},\n \{4, 6, 7\}\}/, 'the example grid block is part of the prompt')
})

test('provided code and the skeleton to be implemented are told apart', () => {
  const q1p1 = byId.get('csa-frq-q1-p1')
  assert.equal(q1p1.provided.length, 1)
  assert.match(q1p1.provided[0], /implementation not shown/)
  assert.equal(q1p1.skeleton.length, 2, 'Part A and Part B each hand over a signature')
  for (const s of q1p1.skeleton) assert.match(s, /to be implemented/)

  const q4p3 = byId.get('csa-frq-q4-p3')
  assert.match(q4p3.provided.join('\n'), /public class Seat/, 'the element class is provided, not written')

  // Q2 asks for a whole class from a bulleted specification: no code is given.
  for (const it of of('Q2')) {
    assert.deepEqual(it.provided, [], `${it.id} provides no code`)
    assert.deepEqual(it.skeleton, [], `${it.id} hands over no signature`)
    assert.match(it.stem, /Write the \*\*entire class\*\*/)
  }
})

test('the shared Book class reaches exactly the two Q3 items the prose names', () => {
  // frq-q3-arraylist.md defines `Book` once in the section preamble: "A `Book`
  // element class is provided for FRQs 1 and 3". Without it, csa-frq-q3-p1's stem
  // names getPages() with nothing to define it and the item is unanswerable.
  assert.deepEqual(REAL.byFile.get('frq-q3-arraylist.md').sharedProvidedFor, [1, 3])
  for (const n of [1, 3]) {
    const it = byId.get(`csa-frq-q3-p${n}`)
    assert.match(it.stem, /public class Book/, `${it.id} needs the element class it calls`)
    assert.match(it.stem, /element class is provided for FRQs 1 and 3/, 'kept verbatim, with its own sentence')
  }
  for (const n of [2, 4, 5]) {
    assert.ok(!byId.get(`csa-frq-q3-p${n}`).stem.includes('public class Book'), `csa-frq-q3-p${n} does not use it`)
  }
})

test('the notes explaining a solution are kept with it, not dropped', () => {
  const q3p2 = byId.get('csa-frq-q3-p2')
  assert.match(q3p2.notes.join('\n'), /Why backward\?/, 'the remove-while-iterating rationale')
  assert.match(q3p2.notes.join('\n'), /Equivalent forward pattern/, 'including the one after the trace check')
  assert.match(q3p2.notes.join('\n'), /while \(i < scores\.size\(\)\)/, 'with its fenced code intact')
  assert.match(q3p2.explanation, /Why backward\?/, 'and they reach the student through the explanation')
})

// --- identity, topics, the penalty policy ----------------------------------

test('ids are unique, stable and shaped like the rest of the bank', () => {
  assert.equal(new Set(items.map((i) => i.id)).size, 20)
  assert.deepEqual(of('Q3').map((i) => i.id), [1, 2, 3, 4, 5].map((n) => `csa-frq-q3-p${n}`))
  for (const it of items) assert.equal(it.number, Number(it.id.slice(-1)))
})

test('each item is labelled with its exam slot and the class it is about', () => {
  assert.equal(byId.get('csa-frq-q1-p1').label, 'Q1 Methods & Control Structures · TripLog')
  assert.equal(byId.get('csa-frq-q3-p5').label, 'Q3 Data Analysis with ArrayList · insertInOrder')
})

test('topics come from the file that declares them, and the whole list is kept', () => {
  const declared = Object.fromEntries(FRQ_FILES.map((f) => [f.slot, REAL.byFile.get(f.file).topics]))
  assert.deepEqual(declared, {
    Q1: ['1.15', '2.9', '2.10'],
    Q2: ['1.13', '3.1', '3.3', '3.4', '3.5', '3.9'],
    Q3: ['4.8', '4.9', '4.10'],
    Q4: ['4.5', '4.11', '4.12', '4.13'],
  })
  for (const it of items) {
    assert.deepEqual(it.topics, declared[it.question_type], `${it.id} keeps its file's whole declared list`)
    assert.equal(it.topic, declared[it.question_type][0], `${it.id}'s primary topic is the first declared`)
  }
})

test('KNOWN DEFECT: Q4\'s five items are tagged 4.5, a 1D topic, and they are all 2D', () => {
  // Pinned as a defect, not as a convention, so it cannot be mistaken for one and
  // so the day it is fixed this test fails and points at the fix. `topic` is the
  // FIRST topic each file declares; for Q1-Q3 that read holds for all five items,
  // but frq-q4 declares 4.5 "Standard Array Algorithms" — the ONE-dimensional
  // topic — first, while every one of its items is two-dimensional and the same
  // file declares 4.13 "2D Array Algorithms ... sum, count, find max/min in 2D".
  //
  // The fix is content-side and spans build.js:284-290, build-gates.test.js:689
  // and the committed worker/seed.sql as well as this parser; see the change set
  // in parseFrqAll's docstring. When it lands, replace this test with the per-item
  // topic map.
  const matrix = readFileSync(MATRIX, 'utf8')
  assert.match(matrix, /\*\*4\.5\*\* Standard Array Algorithms/, '4.5 is the 1D standard-algorithms topic')
  assert.match(matrix, /\*\*4\.13\*\* 2D Array Algorithms/, '4.13 is the 2D one, declared by the same file')
  for (const it of of('Q4')) {
    assert.equal(it.topic, '4.5', `${it.id} still carries the wrong topic — if this failed, the fix landed`)
    assert.ok(it.topics.includes('4.13'), `${it.id}'s own file already declares the topic that describes it`)
    assert.match(
      `${it.stem}\n${it.solution}`,
      /\[[a-z]+\]\[[a-z]+\]|grid\[0\]\.length|int\[\]\[\]/,
      `${it.id} is a 2D-array question by its own text`,
    )
  }
})

test('the topics a file declares are the topics the coverage matrix cites it from', () => {
  // Two independent statements in the content — the file's own cross-link line and
  // the matrix's "Bank Item(s)" column — must agree, or one of them is stale.
  const matrix = readFileSync(MATRIX, 'utf8')
  for (const f of FRQ_FILES) {
    const cites = matrix
      .split('\n')
      .filter((l) => l.includes(`question-bank/${f.file}`))
      .map((l) => l.match(/^\|\s*\*\*(\d+\.\d+)\*\*/)?.[1])
      .filter(Boolean)
    assert.deepEqual(
      [...REAL.byFile.get(f.file).topics].sort(),
      cites.sort(),
      `${f.file}: cross-link topics and topic-coverage-matrix.md citations disagree`,
    )
  }
})

test('every item carries the penalty cap policy its file states once', () => {
  for (const it of items) {
    assert.equal(it.rubric.penalty_cap, 3)
    assert.match(it.rubric.penalty_policy, /Penalty cap = 3 per question, earned-parts only, charged once\./)
    assert.match(it.rubric.penalty_policy, /points are independent|point is awarded independently/)
  }
})

test('the official models each file cites are recorded: two per file, eight in all', () => {
  const models = FRQ_FILES.flatMap((f) => REAL.byFile.get(f.file).models)
  assert.equal(models.length, 8)
  for (const m of models) {
    assert.ok(m.title, 'each model names its task')
    assert.match(m.source, /apcentral\.collegeboard\.org/, 'and links the official source')
  }
  assert.match(models[0].title, /MessageBuilder/)
})

test('no stem carries an off-syllabus construct, so validate() stays silent', () => {
  // The banned list validate.js scans stems with. charAt and Math.max are
  // DISCUSSED in the rubrics and point-loser tables, which are not stems.
  const banned = [/\bcharAt\s*\(/, /\bextends\s+[A-Z]/, /\bimplements\s+[A-Z]/, /\bHashMap\b/, /\bHashSet\b/,
    /\bdo\s*\{/, /\bswitch\s*\(/, /\bMath\.(min|max|round)\s*\(/]
  for (const it of items) {
    for (const re of banned) assert.ok(!re.test(it.stem), `${it.id} stem trips ${re}`)
  }
})

// --- the parser must REFUSE to report success on a partial parse ------------

test('a missing practice FRQ is refused, not quietly reported as four', () => {
  const drop = patched('frq-q1-methods-control.md', (t) =>
    t.replace(/### Practice FRQ 5 — [\s\S]*?(?=## \(c\))/, ''))
  assert.throws(() => parseFrqAll(drop), (err) => {
    assert.ok(err instanceof FrqParseError)
    assert.match(err.message, /frq-q1-methods-control\.md/)
    assert.match(err.message, /4/, 'must say how many it found')
    assert.match(err.message, /5/, 'and how many it expected')
    return true
  })
})

test('a rubric one point short of the question value is refused', () => {
  const short = patched('frq-q3-arraylist.md', (t) => t.replace('| 5 | Returns the count |\n', ''))
  assert.throws(() => parseFrqAll(short), (err) => {
    assert.match(err.message, /csa-frq-q3-p1/)
    assert.match(err.message, /4 rubric point\(s\).*5/s, err.message)
    return true
  })
})

test('a rubric row that is not "| point | criterion |" is refused, never half-read', () => {
  const broken = patched('frq-q4-2d-array.md', (t) =>
    t.replace('| 6 | Returns the count |', '| 6 | Returns | the count |'))
  assert.throws(() => parseFrqAll(broken), /malformed rubric row/)
})

test('a rubric whose points are renumbered out of order is refused', () => {
  const jumbled = patched('frq-q2-class-design.md', (t) =>
    t.replace('| 7 | `isAvailable()` returns', '| 8 | `isAvailable()` returns'))
  assert.throws(() => parseFrqAll(jumbled), /numbered 1\.\.7/)
})

test('a part table whose points do not sum to the question value is refused', () => {
  const bad = patched('frq-q1-methods-control.md', (t) =>
    t.replace('**Part B — `routeCode` (3 points)**', '**Part B — `routeCode` (2 points)**'))
  assert.throws(() => parseFrqAll(bad), /part points 4 \+ 2 = 6/)
})

test('an item with no sample solution is refused', () => {
  const bad = patched('frq-q2-class-design.md', (t) =>
    t.replace(/#### Sample solution\n\n```java[\s\S]*?```\n\n(?=#### Rubric \(7 points\))/, ''))
  assert.throws(() => parseFrqAll(bad), /csa-frq-q2-p1.*sample solution/s)
})

test('an item with no trace check is refused', () => {
  const bad = patched('frq-q4-2d-array.md', (t) => t.replace(/^\*\*Trace check\.\*\* Row 0.*$/m, ''))
  assert.throws(() => parseFrqAll(bad), /csa-frq-q4-p1[\s\S]*Trace check/)
})

test('an item with an empty stem is refused', () => {
  const bad = patched('frq-q3-arraylist.md', (t) =>
    t.replace(/(### Practice FRQ 1 — `countLongBooks` \(5 points\).*\n)[\s\S]*?(?=#### Sample solution)/, '$1\n'))
  assert.throws(() => parseFrqAll(bad), /csa-frq-q3-p1.*empty stem/s)
})

test('a Java block that is neither provided nor a skeleton is refused', () => {
  // The provided-vs-skeleton distinction is what tells the student what he has to
  // write. A third kind of block means the convention changed, so guessing which
  // it is would be exactly the silent partial parse this file exists to prevent.
  const bad = patched('frq-q1-methods-control.md', (t) =>
    t.replace('/* to be implemented in Part A */', '/* left as an exercise */'))
  assert.throws(() => parseFrqAll(bad), /unclassified java block/)
})

test('a file whose point value contradicts the exam table is refused', () => {
  const bad = patched('frq-q3-arraylist.md', (t) => t.replace('(5 points)', '(4 points)'))
  assert.throws(() => parseFrqAll(bad), /4 points.*expected 5/s)
})

test('a file with no penalty cap policy is refused', () => {
  const bad = patched('frq-q2-class-design.md', (t) => t.replace(/Penalty cap = 3 per question[^\n]*/, ''))
  assert.throws(() => parseFrqAll(bad), /penalty cap/i)
})

test('a file whose cross-link declares no topics is refused', () => {
  const bad = patched('frq-q4-2d-array.md', (t) => t.replace('(topics 4.5, 4.11, 4.12, 4.13)', ''))
  assert.throws(() => parseFrqAll(bad), /topics/)
})

test('a shared provided class with no stated applicability is refused', () => {
  const bad = patched('frq-q3-arraylist.md', (t) =>
    t.replace('A `Book` element class is provided for FRQs 1 and 3', 'A `Book` element class is provided'))
  assert.throws(() => parseFrqAll(bad), /which practice FRQs/)
})

test('every refusal names the file and lists every violation it found at once', () => {
  const bad = patched('frq-q1-methods-control.md', (t) =>
    t.replace('| 4 | Increments the counter on a match and returns the count |\n', '')
      .replace(/^\*\*Trace check\.\*\* Part A: `digitSum\(2025\).*$/m, ''))
  assert.throws(() => parseFrqAll(bad), (err) => {
    assert.match(err.message, /csa-frq-q1-p1/, 'the short rubric')
    assert.match(err.message, /csa-frq-q1-p2/, 'and the missing trace check, in one report')
    return true
  })
})

test('parseFrqFile refuses an unknown filename rather than guessing a slot', () => {
  assert.throws(() => parseFrqFile('# nothing\n', 'frq-q9-invented.md'), /unknown FRQ file/)
})

test('parseFrqFile parses one file alone and returns its items and its metadata', () => {
  // The single-file entry point is exported and was only ever tested by its throw.
  const one = parseFrqFile(read('frq-q3-arraylist.md'), 'frq-q3-arraylist.md')
  assert.deepEqual(one.items.map((i) => i.id), [1, 2, 3, 4, 5].map((n) => `csa-frq-q3-p${n}`))
  assert.deepEqual(one.meta.sharedProvidedFor, [1, 3])
  assert.equal(one.meta.slot, 'Q3')
  assert.equal(one.meta.points, 5)
  assert.equal(one.meta.title, 'Data Analysis with ArrayList')
  assert.deepEqual(one.meta.topics, ['4.8', '4.9', '4.10'])
  assert.equal(one.meta.models.length, 2)
  assert.deepEqual(one.items.map((i) => i.rubric.criteria.length), [5, 5, 5, 5, 5])
})

test('a file with no "## (b)" section is refused, and returns no items at all', () => {
  const bad = patched('frq-q2-class-design.md', (t) => t.replace('## (b) Original practice FRQs', '## (b2) Scratch'))
  assert.throws(() => parseFrqAll(bad), (err) => {
    assert.match(err.message, /no "## \(b\) Original practice FRQs" section/)
    assert.match(err.message, /0 FRQ item\(s\)|15 FRQ item\(s\)/, err.message)
    return true
  })
})

test('a file with no "# FRQ Bank — Qn: ..." heading is refused', () => {
  const bad = patched('frq-q1-methods-control.md', (t) =>
    t.replace('# FRQ Bank — Q1: Methods & Control Structures (7 points)', '# Q1 practice'))
  assert.throws(() => parseFrqAll(bad), /cannot tell which exam question this file is/)
})

test('a practice FRQ heading the parser cannot read is refused, never renumbered', () => {
  const bad = patched('frq-q2-class-design.md', (t) =>
    t.replace('### Practice FRQ 3 — `Sensor` (7 points)', '### Practice FRQ 3 — `Sensor` [7 pts]'))
  assert.throws(() => parseFrqAll(bad), (err) => {
    assert.match(err.message, /unreadable practice FRQ heading/)
    assert.match(err.message, /Sensor/)
    return true
  })
})

// --- the SILENT defects: mutations that used to parse clean and lie ----------
//
// Every negative test above this line is a mutation the parser already shouted
// about. These are the ones it used to accept in silence, still reporting 20
// items and 125 points while handing the student something else. A mutation that
// parses cleanly and produces the wrong output is the failure mode this whole
// module exists to prevent, so each one is pinned as a REFUSAL here.

test('a shared class whose closing fence is missing is refused, not silently dropped', () => {
  // Printed before the fix: PARSED CLEAN, 20 items, sharedProvidedFor=[], and
  // csa-frq-q3-p1 and -p3 shipped with provided=0 and no `public class Book` in the
  // stem — while rubric point 3 of q3-p1 still reads "calls the provided
  // getPages()". fencedBlocks reports `unterminated`; nobody looked at it here.
  const bad = patched('frq-q3-arraylist.md', (t) =>
    t.replace('public int    getPages()  { /* not shown */ }\n}\n```\n', 'public int    getPages()  { /* not shown */ }\n}\n'))
  assert.throws(() => parseFrqAll(bad), (err) => {
    assert.match(err.message, /frq-q3-arraylist\.md/)
    assert.match(err.message, /unterminated code fence in the section \(b\) preamble/, err.message)
    return true
  })
})

test('a preamble that promises a shared class but carries no java block is refused', () => {
  // The applicability SENTENCE is the gate now, not the block: the old code only
  // looked for the class if a fenced block happened to be found, so deleting the
  // block while keeping "provided for FRQs 1 and 3" parsed clean with 20 items.
  const bad = patched('frq-q3-arraylist.md', (t) => t.replace(/```java\npublic class Book \{[\s\S]*?\n\}\n```\n\n/, ''))
  assert.throws(() => parseFrqAll(bad), (err) => {
    assert.match(err.message, /says a shared element class is provided/)
    assert.match(err.message, /FRQ\(s\) 1, 3/, err.message)
    return true
  })
})

test('a shared class fenced as ```Java instead of ```java is refused', () => {
  // The subtlest of the three: sharedProvidedFor stayed [1, 3] and both stems kept
  // the class text, but `provided` was silently 0 — the code inventory only counts
  // blocks tagged exactly "java", so the class was shown and not inventoried.
  const bad = patched('frq-q3-arraylist.md', (t) => t.replace('```java\npublic class Book {', '```Java\npublic class Book {'))
  assert.throws(() => parseFrqAll(bad), (err) => {
    assert.match(err.message, /no fenced ```java block/)
    assert.match(err.message, /tagged \[Java\]/, err.message)
    return true
  })
})

test('deleting BOTH the shared class and its sentence is refused by the file table', () => {
  // With the block AND the prose gone there is nothing left in the markdown to
  // notice, so FRQ_FILES declares which items the class belongs to and the prose
  // must agree with it.
  const bad = patched('frq-q3-arraylist.md', (t) =>
    t.replace(/A `Book` element class is provided for FRQs 1 and 3[^\n]*\n\n```java\npublic class Book \{[\s\S]*?\n\}\n```\n\n/, ''))
  assert.throws(() => parseFrqAll(bad), (err) => {
    assert.match(err.message, /reaches FRQ\(s\) \[none\]/)
    assert.match(err.message, /FRQ_FILES declares \[1, 3\]/, err.message)
    return true
  })
})

test('Q1 rubric tables merged into one is refused: the part split cannot vanish', () => {
  // An ordinary-looking formatting cleanup — drop the two "**Part A/B — `m` (N
  // points)**" lines and the second table's header — used to parse with ZERO
  // violations: rows=7, numbered 1..7, parts=[], every criterion's part null. The
  // sum-to-total invariant was conditional on parts existing, so zero parts was
  // indistinguishable from a single undivided table.
  const bad = patched('frq-q1-methods-control.md', (t) => t
    .replace(/^\*\*Part [AB] — `[^`]+` \(\d+ points?\)\*\*\n\n/gm, '')
    .replace(/(\| \d+ \| [^\n]*\|\n)\n\| Pt \| Criterion \|\n\|---\|---\|\n/g, '$1'))
  assert.throws(() => parseFrqAll(bad), (err) => {
    assert.match(err.message, /csa-frq-q1-p1/)
    assert.match(err.message, /0 rubric part header\(s\).*expected 2/, err.message)
    return true
  })
})

test('a part header the parser cannot read is named as such, not as a bad row', () => {
  // This one was already caught, but for the wrong reason and with a message that
  // sent the reader to the wrong line: the second table's "| Pt | Criterion |" row
  // stopped being skipped, producing 'malformed rubric row (2 cell(s), expected
  // "| point | criterion |")' about a row with exactly 2 cells.
  const bad = patched('frq-q1-methods-control.md', (t) =>
    t.replace(/^\*\*Part ([AB]) — `([^`]+)` \((\d+) points?\)\*\*$/gm, '**Part $1: `$2` ($3 points)**'))
  assert.throws(() => parseFrqAll(bad), (err) => {
    assert.match(err.message, /0 rubric part header\(s\).*expected 2/, err.message)
    assert.doesNotMatch(err.message, /malformed rubric row/, err.message)
    return true
  })
})

test('Q2-Q4 growing a part header is refused too: the count is checked both ways', () => {
  const bad = patched('frq-q3-arraylist.md', (t) =>
    t.replace('| Pt | Criterion |\n|---|---|\n| 1 | Declares and initializes a counter to 0 |',
      '**Part A — `countLongBooks` (5 points)**\n\n| Pt | Criterion |\n|---|---|\n| 1 | Declares and initializes a counter to 0 |'))
  assert.throws(() => parseFrqAll(bad), /csa-frq-q3-p1.*1 rubric part header\(s\).*expected 0/s)
})

test('a java block claiming BOTH "not shown" and "to be implemented" is refused', () => {
  // classifyJava tested /not shown/ first, so a skeleton that merely MENTIONS the
  // provided helpers was filed as provided code: q1-p1 went from provided 1 /
  // skeleton 2 to provided 2 / skeleton 1 with zero violations. The signature the
  // student must WRITE became code he was HANDED.
  const bad = patched('frq-q1-methods-control.md', (t) => t.replace(
    'public static String routeCode(String label) {\n    /* to be implemented in Part B */',
    'public static String routeCode(String label) {\n    // uses the provided helpers above, whose bodies are not shown\n    /* to be implemented in Part B */'))
  assert.throws(() => parseFrqAll(bad), (err) => {
    assert.match(err.message, /csa-frq-q1-p1/)
    assert.match(err.message, /unclassified java block/)
    assert.match(err.message, /BOTH "not shown" and "to be implemented"/, err.message)
    return true
  })
})

test('an unclassified java block in the SHARED class is refused as well', () => {
  const bad = patched('frq-q3-arraylist.md', (t) => t.replace(/\/\* not shown \*\//g, '/* omitted */'))
  assert.throws(() => parseFrqAll(bad), /unclassified java block in the shared element class/)
})

test('a second "**Trace check.**" is refused rather than discarding the first', () => {
  // Last write won: the earlier paragraph vanished from trace_check AND from
  // explanation, which /log returns to the student, with zero violations —
  // while everything else in this file that appears twice is a violation.
  const bad = patched('frq-q3-arraylist.md', (t) => t.replace(
    '**Trace check.** pages 120,400,80,510',
    '**Trace check.** An earlier, contradictory trace that the parser used to throw away without a word.\n\n' +
    '**Trace check.** pages 120,400,80,510'))
  assert.throws(() => parseFrqAll(bad), (err) => {
    assert.match(err.message, /csa-frq-q3-p1/)
    assert.match(err.message, /two "\*\*Trace check\.\*\*" paragraphs/, err.message)
    return true
  })
})
