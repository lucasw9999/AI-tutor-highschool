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
 * Each unit shipped with 12 items. parseAll() asserts a per-unit MINIMUM plus
 * contiguous numbering, so a pack may gain problems but cannot quietly lose one
 * (the first version of this parser found only 22 of 48 and reported success).
 */

// normalizeShort is IMPORTED, not restated. A key has to be judged by the exact
// function that will grade it: the ' x = 4. ' false negative this repo already
// shipped lived in the one-line difference between two normalizations, and a
// copy of it here would be free to drift the same way. grade.js is pure and
// imports nothing, so depending on it costs the build nothing.
import { normalizeShort } from '../../worker/src/grade.js'

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
const KEY_FIELDS = ['key', 'accept', 'format', 'topic']

/**
 * A key declaration an author wrote in the open, where the pack renders it next
 * to the question. Two problems at once — it spoils the answer, and the build
 * does not read it — so it is refused rather than ignored.
 */
const VISIBLE_DECL =
  /^[ \t]*\*{0,2}[ \t]*(keys?|answers?|answer key|accepts?|accepted|variants?|part[ _-]?\d+|format|topic)[ \t]*\*{0,2}[ \t]*[:=]/i

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

const FIELD_LIST = 'key, accept, part <n>, format, topic'

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

  const only = (field) => {
    const found = decls.filter((d) => d.field === field)
    if (found.length > 1) errors.push(`"${field}:" is declared ${found.length} times — there can be only one`)
    return found[0]?.value
  }
  const keyDecl = only('key')
  const formatDecl = only('format')
  const topicDecl = only('topic')
  const accepts = decls.filter((d) => d.field === 'accept').map((d) => d.value)
  const partDecls = decls.filter((d) => d.field === 'part')

  // --- the topic tag, which stands on its own ------------------------------
  let topic = null
  if (topicDecl != null) {
    const shape = topicDecl.trim().match(/^(\d+)\.(\d+)$/)
    if (!shape) {
      errors.push(
        `topic "${topicDecl.trim()}" is not a Precalc topic id — they are <unit>.<n> ("1.4"), as ` +
          `parse-precalc-topics.js numbers the pack's concept sections`,
      )
    } else if (shape[1] !== unit) {
      errors.push(
        `topic "${topicDecl.trim()}" belongs to unit ${shape[1]}, but this problem is in unit ${unit}. ` +
          `Both ids exist in the matrix, so validate.js would accept it while to-sql.js derived the wrong unit ` +
          `for the item`,
      )
    } else {
      topic = topicDecl.trim()
    }
  }

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
    const stem = `${head.kept.join('\n')}\n${stemTail}`.replace(/\s+/g, ' ').trim()
    const key = resolveKey({ decls: [...head.decls, ...declared.decls], stem, unit: meta.unit })
    for (const e of [...head.errors, ...declared.errors, ...key.errors]) errors.push(`${id}: ${e}`)

    const solution = solMatch ? solMatch[1].replace(/\s+/g, ' ').trim() : null
    items.push({
      id,
      subject: 'ap_precalc',
      unit: meta.unit,
      number: s.num,
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
      difficulty,
      calc_allowed: calc,
      tested_on_exam: meta.tested,
      stem,
      solution,
      // The printed solution is the feedback the student sees after answering.
      explanation: solution,
      answer: key.answer,
      answer_variants: key.variants,
      // Last, and null unless the pack tags it, so build.js's
      // `it.topic ?? UNTAGGED(unit)` keeps bucketing the untagged ones at
      // <unit>.0 — and so the compiled items.json keeps the key order it had
      // when build.js was the one appending the topic.
      topic: key.topic,
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
