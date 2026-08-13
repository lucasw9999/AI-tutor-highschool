/**
 * Parse ap_precalc/study-packs/unit-*.md practice sets into item objects.
 *
 * The four units use FOUR DIFFERENT problem-header conventions, so the parser is
 * deliberately format-agnostic: it matches `**P<N> ...**` and then inspects the
 * tagline for difficulty and calculator markers.
 *
 *   unit 1: **P1 (easy, no-calc).**
 *   unit 2: **P1 [NC] — Linear vs. exponential.**
 *   unit 3: **P1 [NC] — Easy.**
 *   unit 4: **P1 (easy).**
 *
 * ===========================================================================
 * THE OPTIONAL ANSWER KEY
 * ===========================================================================
 *
 * A problem may declare an answer key, and doing so is what makes it
 * SERVER-GRADED: grade.js marks it mechanically against `answer` and
 * `answer_variants`, the attempt is booked `graded_by: 'server'`, and it counts
 * toward readiness. Without a key the item stays `constructed_model_graded`,
 * which grade.js routes to the rubric and every readiness floor excludes.
 *
 * The key is written as one-line HTML comments inside the problem's own block —
 * invisible in the rendered pack, and stripped from both the stem and the
 * solution before either reaches a student. Put them after the solution's
 * </details>, which is where they read as what they are:
 *
 *     **P1 (easy, no-calc).** Find the AROC of $f(x)=3x-7$ on [2, 6].
 *     <details><summary>Solution</summary>
 *
 *     ... worked solution ...
 *     </details>
 *     <!-- key: 3 -->
 *     <!-- accept: AROC = 3 -->
 *     <!-- topic: 1.1 -->
 *
 * ...and a compound answer, whose parts may be given in any order:
 *
 *     **P3 (easy, no-calc).** Give the zeros and their multiplicities for
 *     $f(x)=(x+2)^3(x-1)^2$, and whether the graph crosses or bounces at each.
 *     Answer as a comma-separated list, e.g. -2 mult 3 crosses, 1 mult 2 bounces.
 *     <details><summary>Solution</summary>
 *
 *     ... worked solution ...
 *     </details>
 *     <!-- part 1: -2 mult 3 crosses -->
 *     <!-- part 1: x=-2 mult 3 crosses -->
 *     <!-- part 2: 1 mult 2 bounces -->
 *     <!-- part 2: x=1 mult 2 bounces -->
 *     <!-- format: Answer as a comma-separated list, e.g. -2 mult 3 crosses, 1 mult 2 bounces. -->
 *     <!-- topic: 1.4 -->
 *
 * Fields (case-insensitive, any order, anywhere in the problem's block):
 *
 *   key: <answer>      the canonical answer. Its presence is the whole opt-in.
 *   accept: <answer>   another form accepted as correct. Repeatable.
 *   part <n>: <answer> one accepted form of part <n> of a compound answer.
 *                      Repeatable per part; see ORDER INDEPENDENCE below.
 *   format: <sentence> the sentence — which must also appear in the stem —
 *                      telling the student how to type the answer. Required
 *                      with `part`.
 *   topic: <id>        a real CED topic id ("1.4") instead of the `<unit>.0`
 *                      placeholder bucket. Independent of the key: tagging an
 *                      item costs nothing and needs no answer.
 *
 * NO KEY IS THE DEFAULT AND IT IS ALWAYS SAFE. An item with no `key` and no
 * `part` is byte-for-byte what it was before this syntax existed. A partly-keyed
 * bank is valid; there is no pressure to key an item you are unsure of, and
 * "unsure" should always be resolved by leaving it alone.
 *
 * WHY THAT MATTERS MORE THAN COVERAGE. The one grading error this system must
 * never make is marking a RIGHT answer wrong: it punishes a student for being
 * correct and every number downstream inherits the lie. An unkeyed item costs a
 * readiness signal; a mis-keyed item costs the student's trust and corrupts the
 * evidence. So every rule below is biased towards refusing the key rather than
 * accepting a doubtful one, and every refusal is a BUILD ERROR — never a
 * silently unkeyed item, which is how a parser once found 22 of 48 problems and
 * reported success.
 *
 * ORDER INDEPENDENCE, AND THE DECISION BEHIND IT
 * ----------------------------------------------
 * grade.js compares `normalizeShort(response)` against the key and each variant
 * as WHOLE STRINGS. It cannot be taught set semantics ("all these parts must
 * appear, in any order") — and it must not be, because the grader is deliberately
 * mechanical. So a compound answer is made order-independent HERE, at build
 * time: the author declares each part once, and the parser expands the
 * declaration into every ordering of the parts, every combination of the
 * phrasings declared for them, and every separator a student plausibly types
 * (", ", " and ", ", and ", "; ", " "). "x=2 (mult 2), x=-3 (mult 1)" typed in
 * the other order is therefore a variant the bank already holds, not a miss.
 *
 * That expansion also absorbs an asymmetry in normalizeShort that would
 * otherwise be a trap: it strips a leading `x =` from the WHOLE response only,
 * so "x=-2 ..., x=1 ..." keeps its second `x=` while the first vanishes. Because
 * every combination of the declared phrasings is generated, the pairing that
 * survives normalization is always among them.
 *
 * The interlock that stops this becoming a trap: `format` is REQUIRED with
 * `part`, and the sentence it declares must appear in the stem. A student who
 * was never told to answer "-2 mult 3 crosses, 1 mult 2 bounces" will write a
 * paragraph, and a paragraph cannot match any enumeration — which is a false
 * negative dressed as content coverage. If you cannot state the required form in
 * the stem, the answer is not keyable: leave the item model-graded.
 *
 * WHAT IS DELIBERATELY NOT SUPPORTED
 * ----------------------------------
 *   * A numeric tolerance. grade.js honours `item.tolerance`, but the `items`
 *     table has no such column and to-sql.js does not emit one, so a declared
 *     tolerance would be dropped between the build and D1 — the key would grade
 *     one way in a test and another way in front of the student. Enumerate the
 *     accepted roundings as `accept:` lines instead.
 *   * Units inside a key. "6 mg/L" and "2 pi" are indistinguishable in shape,
 *     so no rule can demand a bare-number variant for the first without
 *     inviting a WRONG one for the second. Key the bare value and put the unit
 *     in the stem.
 *   * A stem that asks for reasoning, a drawing, an interpretation, or that has
 *     lettered sub-parts. Those cannot be a short string at all; a key on one is
 *     rejected outright.
 *
 * ===========================================================================
 *
 * ===========================================================================
 * THE TWO HALVES OF A PAPER: MULTIPLE CHOICE AND FREE RESPONSE
 * ===========================================================================
 *
 * WHY THESE EXIST. api.js sizes a sitting in `mcq` and `frq` and nothing else
 * (sectionParts), and it credits an answer only to the half its own KIND belongs
 * to (sectionFill). A `constructed` short answer fills neither half however well
 * it is keyed, so a bank of 48 of them could not assemble one sitting: the build
 * reported "the bank holds 0 of the 38 multiple choice question(s) ... and 0 of
 * the 4 free-response question(s) ... No sitting can be assembled at all". The
 * two declarations below are the plumbing for the halves; the questions
 * themselves are content work that follows.
 *
 * A MULTIPLE-CHOICE QUESTION. The choices are PRINTED, on one line, exactly as
 * ap_csa's mcq-*.md files print them — the pack is a document a student reads, so
 * "which of the following" with nothing following would be a broken question —
 * and the presence of that line is the whole opt-in. It compiles to the same item
 * shape parse-mcq.js produces (kind 'mcq', options keyed A-D, `answer` a letter),
 * which is what makes it server-graded by letter match everywhere for free:
 *
 *     **P13 (easy, no-calc).** Which of these is the horizontal asymptote of
 *     $f(x)=\dfrac{3x^2+1}{x^2-4}$?
 *     A) y = 0   B) y = 3   C) y = 1/3   D) no horizontal asymptote
 *     <details><summary>Solution</summary>
 *
 *     Equal degrees, so the asymptote is the ratio of the leading coefficients:
 *     $y=3$.
 *     </details>
 *     <!-- key: B -->
 *     <!-- practice: 1.A -->
 *     <!-- topic: 1.6 -->
 *
 * The option line is lifted OUT of the stem into `options`, because the Worker
 * renders the two separately and would otherwise print the choices twice. It is
 * split by parse-mcq.js's own parseOptions, so "A) x   B) y   C) z   D) w" means
 * here exactly what it means there — four options, no more and no fewer.
 *
 * A FREE-RESPONSE QUESTION. Precalc free response is handwritten in a paper
 * booklet and rubric-scored, so it is MODEL-GRADED by design: kind 'frq' is
 * already in grade.js's MODEL_GRADED, and the worked solution is the feedback
 * api.js returns to the student. Declaring which of the exam's four
 * free-response questions it models is the opt-in:
 *
 *     **P14 (exam-level, calculator).** A Ferris wheel turns at a constant rate.
 *     (a) Write a sinusoidal model for a rider's height. (b) State the midline
 *     and amplitude, and explain what each means about the wheel. (c) Find the
 *     first time the rider is 30 feet above the ground.
 *     <details><summary>Solution</summary>
 *
 *     ... worked solution, part by part ...
 *     </details>
 *     <!-- frq: Q3 -->
 *     <!-- topic: 3.4 -->
 *     <!-- practice: 2.B -->
 *
 * Fields the two halves add:
 *
 *   key: <A-D>         on an item that prints options, the LABEL of the correct
 *                      choice. Required there, and it must be one of the printed
 *                      labels.
 *   frq: <Q1-Q4>       which free-response question of the real exam this models.
 *                      Its presence is the opt-in.
 *   practice: <skill>  one of the CED's 8 skills (1.A .. 3.C). REQUIRED on a
 *                      multiple-choice item, because validate.js refuses an mcq
 *                      with no practice tag; optional elsewhere.
 *   topic: <id>        REQUIRED on both. The `<unit>.0` bucket exists for the 48
 *                      items that predate the tagging syntax; a question written
 *                      after it names the topic it tests.
 *
 * An `frq` also compiles `question_type` ("Q3") and `frq_type` ("Modeling
 * Periodic"). Both are BUILD-TIME metadata: the items table has no column for
 * them, so to-sql.js does not carry them to D1 and nothing at runtime reads them —
 * exactly as the CSA FRQ items carry `question_type`, `points`, `provided` and
 * `trace_check` in items.json and hand D1 only the columns that exist. They are
 * here so the compiled bank can say which of the four free-response questions each
 * item models; do not build a runtime rule on them without adding the column.
 *
 * ...and the tagline must say whether a calculator is allowed ("[NC]", "no-calc",
 * "calculator"): readiness.js buckets a sitting's answers on `calc_allowed === 0`
 * and `calc_allowed === 1`, so an item with neither falls into NEITHER the
 * no_calc_min nor the calc_min floor and is invisible to both.
 *
 * WHAT IS DELIBERATELY NOT SUPPORTED HERE
 * ---------------------------------------
 *   * `constructed` counting as `mcq`. A short-answer drill reported as a
 *     42-question multiple-choice paper would measure the wrong thing, which is
 *     the failure mode this repo exists to prevent.
 *   * A fifth option. grade.js reads a-e, but validate.js's key-balance warning
 *     counts A-D only and the exam has four choices, so a fifth would be a key
 *     no distribution check could see.
 *   * A rubric on a Precalc `frq`, in the shape parse-frq.js builds for CSA. Three
 *     reasons, all of them "the number would be invented or dropped":
 *     worker/config/ap_precalc.json states no `frq_points`, so any point total
 *     would be asserted rather than derived; nothing in worker/src reads
 *     `item.rubric` (db.js parses it back out of rubric_json and api.js never
 *     passes it to anything), so an authored rubric would be stored and never
 *     used; and what the student is actually shown after a free-response answer
 *     is `item.explanation` — the worked solution — which these items carry. When
 *     a consumer for a Precalc rubric exists, that is the job to add it in.
 *   * An answer key on an `frq`. grade.js routes 'frq' to the model before it ever
 *     looks at `answer`, so a key there would be dead metadata that reads like a
 *     promise of mechanical marking.
 *
 * ONE THING TO CLEAR BEFORE THE FIRST DECLARED ITEM LANDS, stated here because it
 * lives in a file this parser must not touch: worker/tests/ungraded.test.js's
 * per-item invariant asserts that a keyed Precalc item is kind 'constructed' and
 * an unkeyed one is 'constructed_model_graded'. A declared 'mcq' or 'frq' fails it
 * for doing exactly the right thing — the same way the first answer key would have
 * failed the assertion that file has already retired once. Both kinds have to be
 * named as SETS there (as tools/build/tests/precalc-answer-keys.test.js now does),
 * and that is the worker-test owner's edit, not this parser's.
 *
 * ===========================================================================
 *
 * Each unit shipped with 12 items. parseAll() asserts a per-unit MINIMUM plus
 * contiguous numbering, so a pack may gain problems but cannot quietly lose one
 * (the first version of this parser found only 22 of 48 and reported success).
 */

// normalizeShort is IMPORTED, not restated. A key has to be judged by the exact
// function that will grade it: the ' x = 4. ' false negative this repo already
// shipped lived in the one-line difference between two normalizations, and a
// copy of it here would be free to drift the same way. grade.js is pure and
// imports nothing, so depending on it costs the build nothing.
//
// grade() itself is imported for the same reason, one level up: a declared
// multiple-choice item is PROVED against the real grader at build time — every
// label, in every spelling a student types, and every option's own text has to
// resolve to the option it belongs to — because an option list the grader parses
// differently from how the student reads it is exactly where the next false
// negative gets born. parseOptions and letterOptionCollisions are imported for
// the same reason again: the option line must mean here what it means for CSA,
// and the bare-letter collision must be judged by the one rule the build already
// applies rather than by a second copy of it.
import { grade, normalizeShort } from '../../worker/src/grade.js'
import { parseOptions } from './parse-mcq.js'
import { letterOptionCollisions } from './validate.js'

const UNIT_OF = {
  'unit-1-polynomial-rational.md': { unit: '1', slug: 'u1', tested: true },
  'unit-2-exponential-logarithmic.md': { unit: '2', slug: 'u2', tested: true },
  'unit-3-trigonometric-polar.md': { unit: '3', slug: 'u3', tested: true },
  'unit-4-parametric-vectors-matrices.md': { unit: '4', slug: 'u4', tested: false },
}

/**
 * The fewest problems a pack may parse to.
 *
 * A MINIMUM rather than the old `=== 12`, which made adding a 13th problem a
 * build failure — the check meant to catch silent LOSS was also blocking
 * deliberate growth. Loss is still caught, by three checks together: this
 * floor, contiguous numbering (a renumbered or deleted problem leaves a hole),
 * and the duplicate-id check (a renumbering that collides).
 */
export const MIN_PER_UNIT = 12

/** A complete HTML comment occupying one whole line, and nothing else. */
const COMMENT_LINE = /^[ \t]*<!--([\s\S]*?)-->[ \t]*$/
/** `field: value` inside such a comment. `=` is captured so it can be refused. */
const DECLARATION = /^\s*([A-Za-z][A-Za-z0-9 _-]*?)\s*([:=])\s*([\s\S]*?)\s*$/
/** `part 3`, `part_3`, `part-3`. */
const PART_FIELD = /^part[ _-]?(\d+)$/
/** Fields that are prose for a human and are dropped without comment. */
const NOTE_FIELDS = new Set(['note', 'todo', 'fixme', 'source', 'comment'])
const KEY_FIELDS = ['key', 'accept', 'format', 'topic', 'practice', 'frq']

/**
 * The line that prints a multiple-choice item's options, recognized exactly as
 * parse-mcq.js recognizes it in the CSA banks, so one convention covers both
 * subjects. parse-mcq.js's parseOptions is the authority on what it must contain:
 * the four labels A to D, in order, on that one line.
 */
const PRINTED_OPTIONS = /^A\)/

/**
 * The CED's 8 skills, grouped under its 3 Mathematical Practices, as
 * ap_precalc/reference/skills-and-weightings.md tabulates them from the official
 * Course Framework. CSA's P1-P5 are a different course's practices and are not
 * interchangeable with these — the `practice` column holds whichever vocabulary
 * the item's own subject uses.
 */
export const PRECALC_PRACTICES = ['1.A', '1.B', '1.C', '2.A', '2.B', '3.A', '3.B', '3.C']

/**
 * The exam's four free-response questions, in exam order.
 *
 * Mirrors worker/config/ap_precalc.json `exam.frq_types`, re-stated here so the
 * content build does not read the Worker's config at runtime — the same
 * arrangement parse-frq.js uses for the CSA point values and validate.js for
 * MIN_MOCK_COVERAGE — and tools/build/tests/precalc-mcq-frq.test.js fails if the
 * two ever disagree.
 */
export const PRECALC_FRQ_SLOTS = [
  { slot: 'Q1', type: 'Function Concepts' },
  { slot: 'Q2', type: 'Modeling Non-Periodic' },
  { slot: 'Q3', type: 'Modeling Periodic' },
  { slot: 'Q4', type: 'Symbolic Manipulation' },
]

/**
 * Every spelling of a choice the grader must credit, built from the label.
 *
 * These are not a wish list: each one is a shape grade.js has a reader for
 * (LETTER_ONLY's decoration set, STRONG_LABEL, WEAK_LABEL), and on an option list
 * where a letter is ambiguous some of them stop resolving. Running all of them
 * over every declared item is what turns "the grader probably reads this" into
 * "the grader does read this", for the ~42 items the content authors will write
 * rather than only for the fixtures in a test file.
 */
const CHOICE_SPELLINGS = [
  (L) => L,
  (L) => L.toLowerCase(),
  (L) => `(${L})`,
  (L) => `${L})`,
  (L) => `${L}.`,
  (L) => `answer: ${L}`,
  (L) => `choice ${L}`,
]

/**
 * A key declaration an author wrote in the open, where the pack renders it next
 * to the question. Two problems at once — it spoils the answer, and the build
 * does not read it — so it is refused rather than ignored.
 */
const VISIBLE_DECL =
  /^[ \t]*\*{0,2}[ \t]*(keys?|answers?|answer key|accepts?|accepted|variants?|part[ _-]?\d+|format|topic|practice|frq)[ \t]*\*{0,2}[ \t]*[:=]/i

/** Stems whose answer is not a short string, however it is written. */
const UNKEYABLE_STEM = [
  [/\bsketch\b|\bdraw\b/i, 'asks for a drawing'],
  [/\bexplain\b|\bjustify\b|\bwhy\b/i, 'asks for reasoning in prose'],
  [
    /\bdescribe\b|\binterpret\b|\bin context\b|\bmeaning\b|\bwhat (it|this|that) means\b|\bsay (what|where|why|how)\b/i,
    'asks for an interpretation',
  ],
  [/\bshow that\b|\bshow your work\b|\bprove\b|\bderive\b/i, 'asks for a derivation'],
  [/\bin your own words\b/i, 'asks for prose'],
]

/** `(a)`, `(b)` — a stem broken into lettered sub-questions. */
const SUBPART = /\(\s*([a-e])\s*\)/g

/**
 * A key that opens with its own label: "HA: y = 0", "g(x) = 2x", "AROC = 3".
 * normalizeShort strips only `x =`, `y =`, `f(x) =` and `answer =`, so a student
 * who types the bare value — the natural thing to type — normalizes to something
 * shorter than the key and is marked WRONG.
 *
 * A labelled LIST is exempt: in "a=-2/3, b=10, c=20" the labels are the answer,
 * not decoration, and a student cannot omit them without losing the meaning.
 */
const LABELLED_KEY = /^[a-z][a-z0-9 .()]*[:=]/
const LABELLED_LIST = /,\s*[a-z][a-z0-9 .()]*[:=]/

/** Plain keyboard characters only: no LaTeX macro, no unicode lookalike. */
const isTypeable = (text) => /^[\x20-\x7E]+$/.test(text) && !text.includes('\\')

/** How a compound answer's parts may be joined by the student. */
const SEPARATORS = [', ', ' and ', ', and ', '; ', ' ']
const MAX_PARTS = 4
const MAX_ALTS_PER_PART = 6
/** Guards items.json and the D1 row against a combinatorial blow-up. */
const MAX_ACCEPTED_FORMS = 1000

function readTagline(tagline) {
  const t = tagline.toLowerCase()
  const difficulty = /hard|exam-level/.test(t)
    ? 'hard'
    : /med/.test(t)
      ? 'medium'
      : /easy/.test(t)
        ? 'easy'
        : null
  let calc = null
  if (/\[nc\]|no-calc|no calculator/.test(t)) calc = false
  else if (/\[c\]|calc/.test(t)) calc = true
  return { difficulty, calc }
}

/** Which field a declaration names, or null when it names nothing known. */
function fieldOf(rawName) {
  const name = rawName.toLowerCase().replace(/\s+/g, ' ').trim()
  if (KEY_FIELDS.includes(name)) return { field: name }
  if (NOTE_FIELDS.has(name)) return { field: 'note' }
  const part = name.match(PART_FIELD)
  return part ? { field: 'part', index: Number(part[1]) } : null
}

const FIELD_LIST = 'key, accept, part <n>, format, topic, practice, frq'

/**
 * Split a problem's body into the lines a student sees and the key declarations
 * the build reads, reporting every line that was TRYING to be a declaration and
 * failed. Silence is the one outcome not available here.
 */
function readDeclarations(lines) {
  const decls = []
  const errors = []
  const kept = []
  let i = 0
  let inSolution = false
  while (i < lines.length) {
    const line = lines[i]
    const comment = line.match(COMMENT_LINE)
    if (comment) {
      // COMMENT_LINE's body is lazy but its tail is anchored, so two comments on
      // one line match as ONE comment whose body carries the join: `key: 3` and
      // `accept: 4` would key the item to '3 --> <!-- accept: 4', which no
      // student could ever type. One field per line, and say so.
      if (/<!--|-->/.test(comment[1])) {
        errors.push(`only one key field may go on a line, and it must be its own comment: ${line.trim()}`)
        i++
        continue
      }
      const declared = comment[1].match(DECLARATION)
      if (!declared) {
        kept.push(line)
        i++
        continue
      }
      const [, rawName, separator, value] = declared
      const known = fieldOf(rawName)
      if (!known) {
        errors.push(
          `unrecognized key field "${rawName.trim()}" in ${line.trim()} — the fields are ${FIELD_LIST}. ` +
            `An unread field would leave the item silently unkeyed; write an editorial aside as <!-- note: ... -->`,
        )
      } else if (separator === '=') {
        errors.push(`"${rawName.trim()}" must be separated from its value with a colon, not "=": ${line.trim()}`)
      } else if (known.field !== 'note') {
        decls.push({ ...known, value, line: line.trim() })
      }
      i++
      continue
    }
    if (line.includes('<!--')) {
      errors.push(
        `a key field must be one whole HTML comment alone on its own line ("<!-- key: 3 -->"); this line is not ` +
          `one: ${line.trim()}`,
      )
      // Swallow the rest of the attempted comment, so its fields are not then
      // reported a second time as visible declarations.
      while (i < lines.length && !lines[i].includes('-->')) i++
      i++
      continue
    }
    // Only OUTSIDE the solution. A worked solution may perfectly well write
    // "**Answer:** y = 2x - 1" as prose — it is hidden behind the <details> and
    // spoils nothing — whereas the same line next to the question is both a
    // spoiler and, since the build does not read it, a key that does not exist.
    if (!inSolution && VISIBLE_DECL.test(line)) {
      errors.push(
        `an answer key must be written as an HTML comment ("<!-- key: 3 -->"), not as a visible line — the pack ` +
          `renders this one right next to the question, and the build does not read it: ${line.trim()}`,
      )
      i++
      continue
    }
    if (line.includes('<details>')) inSolution = true
    if (line.includes('</details>')) inSolution = false
    kept.push(line)
    i++
  }
  return { decls, errors, kept }
}

/**
 * The one value a field may have, reporting a second declaration rather than
 * silently taking the first.
 */
function only(decls, field, errors) {
  const found = decls.filter((d) => d.field === field)
  if (found.length > 1) errors.push(`"${field}:" is declared ${found.length} times — there can be only one`)
  return found[0]?.value
}

/** True when any declaration names this field. */
const declares = (decls, field) => decls.some((d) => d.field === field)

/**
 * A declared topic id, checked against the shape parse-precalc-topics.js numbers
 * the packs with, and against the unit the problem actually lives in. Null (with
 * an error) when it is neither.
 */
function resolveTopic(topicDecl, unit, errors) {
  if (topicDecl == null) return null
  const shape = topicDecl.trim().match(/^(\d+)\.(\d+)$/)
  if (!shape) {
    errors.push(
      `topic "${topicDecl.trim()}" is not a Precalc topic id — they are <unit>.<n> ("1.4"), as ` +
        `parse-precalc-topics.js numbers the pack's concept sections`,
    )
    return null
  }
  if (shape[1] !== unit) {
    errors.push(
      `topic "${topicDecl.trim()}" belongs to unit ${shape[1]}, but this problem is in unit ${unit}. ` +
        `Both ids exist in the matrix, so validate.js would accept it while to-sql.js derived the wrong unit ` +
        `for the item`,
    )
    return null
  }
  return topicDecl.trim()
}

/** A declared CED skill, upper-cased, or null (with an error) when it is not one. */
function resolvePractice(practiceDecl, errors) {
  if (practiceDecl == null) return null
  const code = practiceDecl.trim().toUpperCase()
  if (!PRECALC_PRACTICES.includes(code)) {
    errors.push(
      `practice "${practiceDecl.trim()}" is not an AP Precalculus skill — they are ${PRECALC_PRACTICES.join(', ')}, ` +
        `the CED's 3 Mathematical Practices and their 8 skills (ap_precalc/reference/skills-and-weightings.md). ` +
        `CSA's P1-P5 belong to a different course`,
    )
    return null
  }
  return code
}

/**
 * Two option texts a student could both be right about.
 *
 * Deliberately stricter than the grader's own comparison: grade.js reports two
 * IDENTICAL options as unreadable, but "y = 3" and "y=3" are two spellings of one
 * answer that it would happily tell apart — so a key on either one marks a right
 * answer wrong. Spaces, $ and markdown emphasis go; nothing that could change the
 * mathematics does, so "y = 3" and "x = 3" stay two different answers.
 */
const optionShape = (text) => String(text).toLowerCase().replace(/[`*$\s]/g, '').replace(/\.$/, '')

/**
 * Run every reading of a declared option list through the REAL grader, and report
 * the ones that do not land where the student meant them to.
 *
 * This is the whole defence against the defect class an MCQ format invites: an
 * option list the grader parses differently from how the student reads it. It is
 * checked here, at build time, rather than only in a test, because the items that
 * matter are the ones the content authors write next.
 */
function probeChoices(options, answer) {
  const item = { kind: 'mcq', options, answer }
  const problems = []
  const reading = (v, label) =>
    v.graded_by === 'server'
      ? `option ${v.picked}, not option ${label}`
      : `not one answer at all (${v.graded_by}: ${v.detail})`
  for (const label of Object.keys(options)) {
    for (const spell of CHOICE_SPELLINGS) {
      const typed = spell(label)
      const v = grade(item, typed)
      if (v.graded_by !== 'server' || v.picked !== label) {
        problems.push(`a response of "${typed}" is read as ${reading(v, label)}`)
      }
    }
    const text = String(options[label] ?? '').trim()
    if (!text) continue
    const v = grade(item, text)
    if (v.graded_by !== 'server' || v.picked !== label) {
      problems.push(`option ${label}'s own text "${text}" is read as ${reading(v, label)}`)
    }
  }
  return problems
}

/**
 * Turn a problem that PRINTS its options into a multiple-choice item, or into
 * errors and no item at all.
 *
 * A refusal degrades to the model-graded default — the item is exactly what it
 * would have been without the declaration, printed options and all — so no
 * half-formed option set or doubtful letter key can reach an artifact even under
 * --write-despite-incomplete.
 */
function resolveChoices({ decls, printed, unit, calc }) {
  const errors = []
  const topicDecl = only(decls, 'topic', errors)
  const practiceDecl = only(decls, 'practice', errors)
  const keyDecl = only(decls, 'key', errors)
  const topic = resolveTopic(topicDecl, unit, errors)
  const practice = resolvePractice(practiceDecl, errors)
  const refused = () => ({ kind: 'constructed_model_graded', answer: null, variants: [], topic, errors, extra: {} })

  // Fields that only mean something to a typed short answer. A letter has no
  // spellings to accept and no format to state, and grade.js never looks at
  // `answer_variants` on an mcq — so these would be dead metadata that reads like
  // a promise the grader does not keep.
  for (const field of ['accept', 'format']) {
    if (declares(decls, field)) {
      errors.push(
        `"${field}:" is declared on a multiple-choice item, whose answer is one of the printed letters — grade.js ` +
          `matches an mcq by letter and never reads a variant or a format sentence. Delete it, or delete the ` +
          `printed option line if this is meant to be a typed answer`,
      )
    }
  }
  if (declares(decls, 'part')) {
    errors.push(
      `"part <n>:" is declared on a multiple-choice item, whose answer is one of the printed letters, not a ` +
        `compound typed answer. Delete it, or delete the printed option line`,
    )
  }
  if (declares(decls, 'frq')) {
    errors.push(
      `both a printed option line and "frq:" are declared — a question is one half of the paper or the other, ` +
        `never both. api.js counts an answer toward the half its own kind belongs to and no other`,
    )
  }
  if (topicDecl == null) {
    errors.push(
      `a multiple-choice item needs "topic: <id>" — the <unit>.0 bucket exists for the 48 items that predate the ` +
        `tagging syntax, and an untagged item cannot drive topic-level teaching or count toward topic coverage`,
    )
  }
  if (practiceDecl == null) {
    errors.push(
      `a multiple-choice item needs "practice: <skill>", one of ${PRECALC_PRACTICES.join(', ')} — validate.js ` +
        `refuses an mcq with no practice tag, because a per-practice floor cannot see an untagged item`,
    )
  }
  if (calc == null) {
    errors.push(
      `the tagline says whether a calculator is allowed for every other item and says nothing here. readiness.js ` +
        `buckets a sitting's answers on calc_allowed 0 and 1 (no_calc_min, calc_min), so an item with neither falls ` +
        `into NEITHER floor and is invisible to both. Write "[NC]"/"no-calc" or "calculator" in the tagline`,
    )
  }

  const options = parseOptions(printed)
  if (!options) {
    errors.push(
      `the option line does not print all four choices as "A) ... B) ... C) ... D) ..." — parse-mcq.js's own ` +
        `parseOptions reads it, and the exam has four options: ${printed}`,
    )
    return refused()
  }
  for (const [label, text] of Object.entries(options)) {
    if (!String(text).trim()) errors.push(`option ${label} prints no text, so there is nothing for a student to pick`)
  }
  const shapes = new Map()
  for (const [label, text] of Object.entries(options)) {
    const shape = optionShape(text)
    if (!shape) continue
    if (shapes.has(shape)) {
      errors.push(
        `options ${shapes.get(shape)} and ${label} are the same answer written two ways ` +
          `("${String(options[shapes.get(shape)]).trim()}" and "${String(text).trim()}") — two options a student ` +
          `could both be right about, while only one of them can be the key`,
      )
    } else {
      shapes.set(shape, label)
    }
  }
  for (const c of letterOptionCollisions(options)) {
    errors.push(
      `option ${c.label}'s text "${String(c.text).trim()}" is itself label ${c.collidesWith}, so a response of ` +
        `"${c.collidesWith}" cannot be disambiguated between option ${c.label} (by text) and option ` +
        `${c.collidesWith} (by letter) — grade.js declines it, and a decline is invisible to every downstream ` +
        `statistic. Reword option ${c.label}`,
    )
  }

  if (keyDecl == null) {
    errors.push(
      `a printed option line makes this a multiple-choice item and it declares no "key:" — write ` +
        `"<!-- key: B -->", the label of the correct choice`,
    )
  }
  const answer = keyDecl == null ? null : keyDecl.trim().toUpperCase()
  if (answer != null && !(answer in options)) {
    errors.push(
      `the key "${keyDecl.trim()}" is not one of the printed option labels — a multiple-choice key is A, B, C or D, ` +
        `and grade.js compares the letter a student picks against it`,
    )
  }
  if (errors.length) return refused()

  const problems = probeChoices(options, answer)
  if (problems.length) {
    errors.push(
      `the real grader does not read this option list the way a student would: ` +
        `${problems.slice(0, 4).join('; ')}${problems.length > 4 ? `; and ${problems.length - 4} more` : ''}. ` +
        `Reword the options until every letter and every option's own text resolve to their own choice`,
    )
    return refused()
  }

  return { kind: 'mcq', answer, variants: [], topic, errors, extra: { practice, options } }
}

/**
 * Turn a problem that declares `frq:` into a free-response item, or into errors
 * and the model-graded default.
 *
 * There is no key and there is no rubric: kind 'frq' is in grade.js's
 * MODEL_GRADED, so the response is routed to the model and the worked solution is
 * the feedback api.js returns. See the module comment for why a rubric is left
 * out rather than invented.
 */
function resolveFrq({ decls, unit, calc }) {
  const errors = []
  const topicDecl = only(decls, 'topic', errors)
  const practiceDecl = only(decls, 'practice', errors)
  const frqDecl = only(decls, 'frq', errors)
  const topic = resolveTopic(topicDecl, unit, errors)
  const practice = resolvePractice(practiceDecl, errors)
  const refused = () => ({ kind: 'constructed_model_graded', answer: null, variants: [], topic, errors, extra: {} })

  for (const field of ['key', 'accept', 'format']) {
    if (declares(decls, field)) {
      errors.push(
        `"${field}:" is declared on a free-response item. grade.js routes kind 'frq' to the model before it looks ` +
          `at any key, so this would never be compared to anything — dead metadata that reads like a promise of ` +
          `mechanical marking. Delete it, or delete "frq:" if this is meant to be a typed answer`,
      )
    }
  }
  if (declares(decls, 'part')) {
    errors.push(
      `"part <n>:" is declared on a free-response item, which is rubric-scored rather than matched against a ` +
        `typed answer. Delete it, or delete "frq:"`,
    )
  }
  if (topicDecl == null) {
    errors.push(
      `a free-response item needs "topic: <id>" — the items table has one topic column, so name the topic this ` +
        `question primarily tests (the CSA FRQs carry the first topic their file declares, for the same reason)`,
    )
  }
  if (calc == null) {
    errors.push(
      `the tagline says nothing about a calculator. The free-response half is sat in a calculator part and a ` +
        `no-calculator part (exam.frq_calc_minutes, exam.frq_no_calc_minutes), and readiness.js buckets answers on ` +
        `calc_allowed 0 and 1, so an item with neither is invisible to both floors`,
    )
  }
  const slot = PRECALC_FRQ_SLOTS.find((s) => s.slot === String(frqDecl).trim().toUpperCase())
  if (!slot) {
    errors.push(
      `frq "${String(frqDecl).trim()}" is not one of this exam's four free-response questions — they are ` +
        `${PRECALC_FRQ_SLOTS.map((s) => `${s.slot} ${s.type}`).join(', ')} ` +
        `(worker/config/ap_precalc.json exam.frq_types). Declare the slot, e.g. "<!-- frq: Q3 -->"`,
    )
  }
  if (errors.length) return refused()

  return {
    kind: 'frq',
    answer: null,
    variants: [],
    topic,
    errors,
    extra: { ...(practice ? { practice } : {}), question_type: slot.slot, frq_type: slot.type },
  }
}

/** Every ordering of a list. Bounded by MAX_PARTS, so at most 24. */
function permutations(list) {
  if (list.length <= 1) return [list]
  const out = []
  list.forEach((item, i) => {
    for (const rest of permutations([...list.slice(0, i), ...list.slice(i + 1)])) out.push([item, ...rest])
  })
  return out
}

/**
 * One phrasing chosen per part, every way round, each paired with the "<part>:
 * <phrasing>" labels it used so a phrasing that earns nothing can be named.
 */
function combinations(parts) {
  return parts.reduce(
    (acc, alternatives, k) =>
      acc.flatMap(([chosen, picks]) => alternatives.map((a, i) => [[...chosen, a], [...picks, `${k}:${i}`]])),
    [[[], []]],
  )
}

/** Text compared to decide whether the stem really states the format sentence. */
const looseText = (text) =>
  String(text)
    .toLowerCase()
    .replace(/[`*$]/g, '')
    .replace(/\s+/g, ' ')
    .trim()

/**
 * Turn one problem's declarations into { answer, variants, topic }, or into
 * errors and NO key.
 *
 * Every failure returns the item unkeyed as well as reporting the error, so that
 * even a build run with --write-despite-incomplete cannot write a doubtful key
 * into an artifact.
 */
function resolveKey({ decls, stem, unit }) {
  const errors = []
  const unkeyed = { answer: null, variants: [], topic: null, errors }

  const keyDecl = only(decls, 'key', errors)
  const formatDecl = only(decls, 'format', errors)
  const topicDecl = only(decls, 'topic', errors)
  const accepts = decls.filter((d) => d.field === 'accept').map((d) => d.value)
  const partDecls = decls.filter((d) => d.field === 'part')

  // --- the topic tag, which stands on its own ------------------------------
  const topic = resolveTopic(topicDecl, unit, errors)

  const indices = [...new Set(partDecls.map((d) => d.index))].sort((a, b) => a - b)
  if (keyDecl == null && !partDecls.length) {
    // No key at all: the safe default. Anything declared to support a key that
    // does not exist is dead content, and it is more likely a key half-written.
    for (const [field, present] of [['accept', accepts.length], ['format', formatDecl != null]]) {
      if (present) {
        errors.push(`"${field}:" is declared with no "key:" or "part <n>:" — nothing would accept it`)
      }
    }
    return { ...unkeyed, topic }
  }

  if (keyDecl != null && partDecls.length) {
    errors.push(
      `both "key:" and "part <n>:" are declared — one canonical answer, or a compound one, never both. ` +
        `Delete whichever is not the answer`,
    )
    return { ...unkeyed, topic }
  }

  // --- is this stem keyable at all? ---------------------------------------
  const subparts = [...new Set(String(stem).match(SUBPART) ?? [])]
  if (subparts.length > 1) {
    errors.push(
      `the stem is broken into lettered sub-parts (${subparts.join(' ')}), so what a student types is a ` +
        `multi-part solution rather than one answer; any string match against it would mark right answers wrong. ` +
        `Leave it model-graded`,
    )
    return { ...unkeyed, topic }
  }
  for (const [pattern, why] of UNKEYABLE_STEM) {
    const hit = String(stem).match(pattern)
    if (hit) {
      errors.push(
        `the stem ${why} ("${hit[0]}"), which no answer key can judge — a correct explanation typed any other ` +
          `way would be marked wrong. Leave it model-graded, or ask a separately keyable question`,
      )
      return { ...unkeyed, topic }
    }
  }

  // --- assemble the accepted forms ---------------------------------------
  let answer
  let generated = []
  if (keyDecl != null) {
    answer = keyDecl.trim()
  } else {
    if (indices.length < 2) {
      errors.push(
        `only one part is declared, which is an atomic answer wearing a costume — declare it as "key:" instead`,
      )
      return { ...unkeyed, topic }
    }
    if (indices.length > MAX_PARTS) {
      errors.push(
        `${indices.length} parts declared, more than the ${MAX_PARTS} this syntax will key. An answer with that ` +
          `many pieces is a worked solution, not a short answer: leave it model-graded`,
      )
      return { ...unkeyed, topic }
    }
    const misnumbered = indices.filter((n, k) => n !== k + 1)
    if (misnumbered.length) {
      errors.push(
        `parts must be numbered 1..${indices.length} with no gaps; declared ${indices.map((n) => `part ${n}`).join(', ')}`,
      )
      return { ...unkeyed, topic }
    }
    const parts = indices.map((n) => partDecls.filter((d) => d.index === n).map((d) => d.value.trim()))
    for (const [k, alternatives] of parts.entries()) {
      if (alternatives.length > MAX_ALTS_PER_PART) {
        errors.push(`part ${k + 1} declares ${alternatives.length} phrasings, more than the ${MAX_ALTS_PER_PART} allowed`)
      }
      for (const alternative of alternatives) {
        if (alternative.includes(',')) {
          errors.push(
            `part ${k + 1} ("${alternative}") contains a comma, which is also how the parts are separated — a ` +
              `student's answer could not be told apart from a different set of parts. Reword the part`,
          )
        }
        if (!normalizeShort(alternative)) {
          errors.push(`part ${k + 1} ("${alternative}") normalizes to nothing, so it could never be matched`)
        }
      }
    }
    if (errors.length) return { ...unkeyed, topic }

    if (formatDecl == null) {
      errors.push(
        `a compound answer needs a "format:" sentence, and the stem must state it — otherwise the student is ` +
          `never told to type "${parts.map((p) => p[0]).join(', ')}" and a correct paragraph is marked wrong`,
      )
      return { ...unkeyed, topic }
    }

    const forms = permutations(indices).length * parts.reduce((n, p) => n * p.length, 1) * SEPARATORS.length
    if (forms > MAX_ACCEPTED_FORMS) {
      errors.push(
        `these parts expand to ${forms} accepted forms, past the cap of ${MAX_ACCEPTED_FORMS} — too many phrasings ` +
          `or too many parts. Declare fewer phrasings, or leave the item model-graded`,
      )
      return { ...unkeyed, topic }
    }

    answer = parts.map((p) => p[0]).join(', ')

    // Expand, remembering which declared phrasings the FIRST form of each
    // normalized shape used. A phrasing that never wins that race accepts
    // nothing the others do not already accept.
    //
    // Dead weight is judged by that EFFECT, not by comparing the phrasings to
    // each other: normalizeShort strips a leading `x =` from the whole response,
    // so "x=-2 mult 3 crosses" and "-2 mult 3 crosses" look identical in
    // isolation while behaving differently in second position ("..., x=1 mult 2
    // bounces" keeps its prefix). Comparing them directly rejected a phrasing
    // the bank genuinely needed.
    const winners = new Set()
    const firstOf = new Map()
    for (const [chosen, picks] of combinations(parts)) {
      for (const ordering of permutations(chosen)) {
        for (const separator of SEPARATORS) {
          const form = ordering.join(separator)
          const norm = normalizeShort(form)
          if (!norm || firstOf.has(norm)) continue
          firstOf.set(norm, form)
          for (const pick of picks) winners.add(pick)
        }
      }
    }
    generated = [...firstOf.values()]
    for (const [k, alternatives] of parts.entries()) {
      for (const [a, alternative] of alternatives.entries()) {
        if (!winners.has(`${k}:${a}`)) {
          errors.push(
            `part ${k + 1}'s phrasing "${alternative}" accepts nothing that its other phrasings do not already ` +
              `accept — dead weight, and usually a sign that normalizeShort already covers the difference`,
          )
        }
      }
    }
    if (errors.length) return { ...unkeyed, topic }
  }

  // The stem must actually say what it told the author it says.
  if (formatDecl != null && !looseText(stem).includes(looseText(formatDecl))) {
    errors.push(
      `the "format:" sentence does not appear in the stem, so nothing tells the student how to type the answer. ` +
        `Add it to the stem verbatim: "${formatDecl.trim()}"`,
    )
    return { ...unkeyed, topic }
  }

  // --- the key itself -----------------------------------------------------
  const normKey = normalizeShort(answer)
  if (!normKey) {
    errors.push(
      `the answer key "${answer}" normalizes to nothing (normalizeShort strips $, \\left/\\right, an "x =" ` +
        `prefix and a trailing period), so no answer could ever match it`,
    )
    return { ...unkeyed, topic }
  }
  if (LABELLED_KEY.test(normKey) && !LABELLED_LIST.test(normKey)) {
    errors.push(
      `the answer key "${answer}" carries its own label. normalizeShort strips only "x =", "y =", "f(x) =" and ` +
        `"answer =", so a student who types the bare value is marked WRONG. Key the bare value and add the ` +
        `labelled form as "accept:" — extra variants only ever widen what is credited`,
    )
    return { ...unkeyed, topic }
  }

  const declared = [answer, ...accepts.map((a) => a.trim())]
  for (const form of declared.slice(1)) {
    if (!normalizeShort(form)) {
      errors.push(`the accepted form "${form}" normalizes to nothing, so it could never be matched`)
    }
  }
  const seen = new Map([[normKey, answer]])
  for (const form of declared.slice(1)) {
    const norm = normalizeShort(form)
    if (!norm) continue
    if (seen.has(norm)) {
      errors.push(
        `"accept: ${form}" is identical to ${seen.get(norm) === answer ? `the key "${answer}"` : `"${seen.get(norm)}"`} ` +
          `once normalized, so it accepts nothing new — dead weight, and usually a sign that normalizeShort already ` +
          `covers the difference`,
      )
      continue
    }
    seen.set(norm, form)
  }
  if (errors.length) return { ...unkeyed, topic }

  if (![...seen.keys()].some(isTypeable)) {
    errors.push(
      `no accepted form of "${answer}" can be typed on a plain keyboard (LaTeX macros, or unicode like − and π), ` +
        `so a student typing the answer the ordinary way is marked wrong. Add the typeable form as "accept:"`,
    )
    return { ...unkeyed, topic }
  }

  // Author-declared forms first, then the mechanical expansion, deduplicated on
  // the normalized form the grader will actually compare.
  const variants = []
  const emitted = new Set([normKey])
  for (const form of [...declared.slice(1), ...generated]) {
    const norm = normalizeShort(form)
    if (!norm || emitted.has(norm)) continue
    emitted.add(norm)
    variants.push(form)
  }
  return { answer, variants, topic, errors }
}

/**
 * Parse one pack's practice set.
 *
 * @returns {{items: object[], errors: string[]}} errors are per-item key
 * problems, each already prefixed with the item id; parseAll adds the
 * pack-level ones.
 */
export function parsePracticeItems(text, filename) {
  const meta = UNIT_OF[filename]
  if (!meta) throw new Error(`unknown Precalc file: ${filename}`)

  const lines = text.split('\n')
  const starts = []
  lines.forEach((l, i) => {
    const m = l.match(/^\*\*P(\d+)\b(.*?)\*\*(.*)$/)
    if (m) starts.push({ i, num: Number(m[1]), tagline: m[2], rest: m[3] })
  })

  const items = []
  const errors = []
  starts.forEach((s, k) => {
    const end = k + 1 < starts.length ? starts[k + 1].i : lines.length
    const id = `pc-${meta.slug}-p${s.num}`
    // The key declarations come out of the body BEFORE anything else reads it,
    // so neither the stem nor the solution can carry them to the student. The
    // header's own tail is scanned too: `**P1 (easy).** Find it. <!-- key: 3 -->`
    // is a natural thing to write, and it lives on the ONE line the body slice
    // does not include — so it would have been a key the build never read, sitting
    // in the stem as a spoiler. It is refused loudly instead.
    const head = readDeclarations([s.rest])
    const declared = readDeclarations(lines.slice(s.i + 1, end))
    const body = declared.kept.join('\n')
    const solMatch = body.match(/<details><summary>Solution<\/summary>\s*([\s\S]*?)<\/details>/)
    const stemTail = body.split('<details>')[0]
    const { difficulty, calc } = readTagline(s.tagline)
    const decls = [...head.decls, ...declared.decls]

    // The printed option line, which is what makes a problem multiple choice. It
    // is looked for in the STEM REGION only — the lines a student reads before
    // opening the solution — for two reasons: a worked solution may legitimately
    // walk through "A) 0, B) 3, C) 1/3, D) none" while explaining the distractors,
    // and an option list below the answer is not a question anyone can answer.
    // The region below </details> is checked separately, because a list written
    // there would otherwise be a multiple-choice item the build silently read as
    // a typed short answer keyed to the letter 'B'.
    const stemLines = stemTail.split('\n')
    const printedLines = stemLines.filter((l) => PRINTED_OPTIONS.test(l.trim()))
    const printedAt = stemLines.findIndex((l) => PRINTED_OPTIONS.test(l.trim()))
    const printed = printedAt === -1 ? null : stemLines[printedAt].trim()
    const stemOf = (kept) => `${head.kept.join('\n')}\n${kept.join('\n')}`.replace(/\s+/g, ' ').trim()
    const fullStem = stemOf(stemLines)
    const misplaced = body
      .split('</details>')
      .slice(1)
      .some((tail) => tail.split('\n').some((l) => PRINTED_OPTIONS.test(l.trim())))

    let r
    if (printed != null) {
      r = resolveChoices({ decls, printed, unit: meta.unit, calc })
    } else if (declares(decls, 'frq')) {
      r = resolveFrq({ decls, unit: meta.unit, calc })
    } else {
      const key = resolveKey({ decls, stem: fullStem, unit: meta.unit })
      const practice = resolvePractice(only(decls, 'practice', key.errors), key.errors)
      r = {
        // A problem that declares no answer key is a worked-solution exercise:
        // "give the zeros and their multiplicities, and say whether the graph
        // crosses or bounces" has no canonical short answer. Those are declared
        // model-graded rather than left with a null key, which grade.js would
        // otherwise treat as a mismatch and mark every answer WRONG. Model-graded
        // work is excluded from every readiness floor — which is exactly why the
        // key syntax exists, and why a keyed problem becomes 'constructed', the
        // kind schema.sql has named for a mechanically marked short answer since
        // the items table shipped.
        kind: key.answer ? 'constructed' : 'constructed_model_graded',
        answer: key.answer,
        variants: key.variants,
        topic: key.topic,
        errors: key.errors,
        // Nothing is appended unless the pack declared it, so an item that
        // declares no practice compiles byte-for-byte as it did before this field
        // existed.
        extra: practice ? { practice } : {},
      }
    }
    // Two ways an option list can be in the wrong place, both of which the
    // resolvers above cannot see because they are handed one line. Either one
    // degrades the item exactly as a refused declaration does, so nothing
    // half-formed reaches an artifact.
    const misplacedErrors = []
    if (misplaced) {
      misplacedErrors.push(
        `a printed option line sits BELOW the solution's </details>, where the build does not look for one and the ` +
          `student would read the choices after the answer. Move it directly under the stem`,
      )
    }
    // A second option line in the stem would stay in the stem as prose while the
    // first became the item's options — two conflicting lists in front of the
    // student, only one of which he is marked against.
    if (printedLines.length > 1) {
      misplacedErrors.push(
        `${printedLines.length} printed option lines above the solution; a multiple-choice item has one. The first ` +
          `would become the options and the rest would stay in the stem: ${printedLines[1].trim()}`,
      )
    }
    if (misplacedErrors.length) {
      r.errors.push(...misplacedErrors)
      r = { kind: 'constructed_model_graded', answer: null, variants: [], topic: r.topic, errors: r.errors, extra: {} }
    }
    for (const e of [...head.errors, ...declared.errors, ...r.errors]) errors.push(`${id}: ${e}`)

    const solution = solMatch ? solMatch[1].replace(/\s+/g, ' ').trim() : null
    items.push({
      id,
      subject: 'ap_precalc',
      unit: meta.unit,
      number: s.num,
      kind: r.kind,
      difficulty,
      calc_allowed: calc,
      tested_on_exam: meta.tested,
      // The option line belongs to `options` on an accepted multiple-choice item,
      // because the Worker renders the two separately and would print the choices
      // twice. On anything else — including a REFUSED multiple-choice item — the
      // stem is every line the pack wrote, so the question still reads as written.
      stem: r.kind === 'mcq' ? stemOf([...stemLines.slice(0, printedAt), ...stemLines.slice(printedAt + 1)]) : fullStem,
      solution,
      // The printed solution is the feedback the student sees after answering.
      explanation: solution,
      answer: r.answer,
      answer_variants: r.variants,
      // Last, and null unless the pack tags it, so build.js's
      // `it.topic ?? UNTAGGED(unit)` keeps bucketing the untagged ones at
      // <unit>.0 — and so the compiled items.json keeps the key order it had
      // when build.js was the one appending the topic.
      topic: r.topic,
      // Only what this problem actually declared: `practice` and `options` for a
      // multiple-choice item, `question_type` and `frq_type` for a free-response
      // one, nothing at all for the short-answer items that predate both.
      ...r.extra,
    })
  })

  return { items, errors }
}

/** Parse every unit and refuse to report success if any unit is short. */
export function parseAll(readFile) {
  const items = []
  const errors = []
  for (const f of Object.keys(UNIT_OF)) {
    const text = readFile(`ap_precalc/study-packs/${f}`)
    const { items: got, errors: keyErrors } = parsePracticeItems(text, f)
    errors.push(...keyErrors)
    if (got.length < MIN_PER_UNIT) {
      errors.push(
        `${f}: parsed ${got.length} items, expected at least ${MIN_PER_UNIT} — the pack shipped with ` +
          `${MIN_PER_UNIT}, so a smaller number means problems were dropped or the header convention changed`,
      )
    }
    // The count check above only catches a short unit. A renumbered problem
    // (e.g. P6 relabelled P5) still parses to the expected count while two
    // items collide on the same id — and items.id is a PRIMARY KEY loaded via
    // INSERT OR REPLACE, so one problem would silently disappear downstream.
    const ids = got.map((i) => i.id)
    const dupes = [...new Set(ids.filter((id, idx) => ids.indexOf(id) !== idx))]
    if (dupes.length) {
      errors.push(`${f}: duplicate item id(s), one problem would be silently dropped: ${dupes.join(', ')}`)
    }
    // ...and a renumbering that does NOT collide leaves a hole instead: with the
    // count check now a floor, P7 relabelled P13 keeps 12 items with 12 unique
    // ids while P7 itself is gone from the pack.
    const numbers = got.map((i) => i.number)
    const holes = Array.from({ length: Math.max(0, ...numbers) }, (_, k) => k + 1).filter((n) => !numbers.includes(n))
    if (holes.length) {
      errors.push(
        `${f}: problem number(s) ${holes.map((n) => `P${n}`).join(', ')} missing from a sequence that runs to ` +
          `P${Math.max(...numbers)} — a problem was deleted or renumbered, and item ids are derived from that number`,
      )
    }
    const missingSolution = got.filter((i) => !i.solution).map((i) => i.id)
    if (missingSolution.length) {
      errors.push(`${f}: items with no solution block: ${missingSolution.join(', ')}`)
    }
    items.push(...got)
  }
  return { items, errors }
}

export const PRECALC_FILES = Object.keys(UNIT_OF)
