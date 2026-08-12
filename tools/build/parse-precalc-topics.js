// Parse AP Precalculus topics and teaching material out of the study packs.
//
// The packs are the right source: each concept section already carries a plain
// language idea, a worked example, and the #1 mistake — exactly the three fields
// the teaching table needs. Nothing has to be invented.
//
// Two traps this parser exists to survive:
//
// 1. FOUR CONVENTIONS. The packs were written by hand over time, so headings are
//    `### 2.1 Title` in units 1-3 but `### A. Title` in unit 4, and the idea
//    label is `**Plain language:**` in units 1, 2 and 4 but `**Plain idea:**` in
//    unit 3. Labels also carry suffixes: `**#1 mistake (HUGE on the exam):**`.
//    A parser matching one spelling silently returns almost nothing.
//
// 2. COLLIDING SECTION NUMBERS. Every pack numbers its concepts from 2.1, so
//    unit 1's "2.1 Average Rate of Change" and unit 3's "2.1 Radians & the unit
//    circle" are both "2.1". Topic ids are therefore namespaced by unit.

/** Which unit each pack describes, and whether the exam tests it. */
export const PACKS = [
  { file: 'unit-1-polynomial-rational.md', unit: '1', tested: true },
  { file: 'unit-2-exponential-logarithmic.md', unit: '2', tested: true },
  { file: 'unit-3-trigonometric-polar.md', unit: '3', tested: true },
  // Required for the class, never on the exam. Excluded from readiness.
  { file: 'unit-4-parametric-vectors-matrices.md', unit: '4', tested: false },
]

/**
 * Exam MCQ weight per unit, as published in the College Board AP Precalculus
 * Course and Exam Description.
 *
 * These are not decorative. select.js apportions a proctored sitting across
 * units in proportion to exam_weight_low/high, so these bounds decide which
 * questions a mock paper asks and how many come from each unit; the pair is also
 * replicated onto every topic row in the unit, so one wrong bound biases eleven
 * rows. Unit 2 shipped as [27, 40]; the CED says 25-40%, and 27 was not a
 * College Board figure. `ap_precalc/coverage-map.md` and
 * `ap_precalc/mastery-tracker.md` still print the old 27-40% in prose.
 */
export const UNIT_WEIGHTS = {
  1: [30, 40],
  2: [25, 40],
  3: [30, 35],
  4: [0, 0],
}

// `### 2.1 Title`, `### 2.2b Title`, `### A. Title`.
const HEADING = /^###\s+((?:\d+\.\d+[a-z]?)|(?:[A-Z]))\.?\s+(.+?)\s*$/

/** Split a pack into concept sections, keyed by its own heading label. */
export function sections(text) {
  const lines = text.split('\n')
  const out = []
  let current = null
  for (const line of lines) {
    const m = line.match(HEADING)
    if (m) {
      if (current) out.push(current)
      current = { label: m[1], title: m[2], body: [] }
      continue
    }
    // A new `## ` section ends the concept list.
    if (/^##\s+\d+\./.test(line) && current) {
      out.push(current)
      current = null
      continue
    }
    if (current) current.body.push(line)
  }
  if (current) out.push(current)
  return out.map((s) => ({ ...s, body: s.body.join('\n').trim() }))
}

/**
 * Pull the text following a bold label, tolerating a suffix before the colon and
 * stopping at the next bold label, heading, or rule.
 *
 * The end-of-input alternative is `(?![\s\S])`, NOT `$`. The `m` flag is needed
 * to anchor `^**Label` to a line start, but under `m` a `$` in the lookahead
 * matches every line ending too — which truncated every field to its first line
 * and silently dropped the solution from every worked example.
 *
 * The suffix between the alias and the colon is uncapped (`[^*]*?`, not a fixed
 * `{0,N}`), because some packs put the actual worked-example PROMPT there (e.g.
 * "Worked example — simplify k(x) = [...] to a single term in tan x:"). A fixed
 * cap made the whole label fail to match and silently dropped the solution. The
 * stop lookahead also exempts further labels from the SAME alias family, so a
 * lettered run ("Worked example A/B/C") is consumed as one field instead of
 * being cut off at the second label.
 */
export function labelled(body, aliases, { includeSuffix = false } = {}) {
  const altPattern = aliases.map((a) => a.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|')
  for (const alias of aliases) {
    const esc = alias.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
    // Matches `**Plain language:**`, `**#1 mistake (HUGE):**`, `**Worked example — sec:**`
    const re = new RegExp(
      `^\\*\\*${esc}([^*]*?):?\\*\\*\\s*([\\s\\S]*?)(?=\\n\\*\\*(?!(?:${altPattern}))|\\n###|\\n---|(?![\\s\\S]))`,
      'm',
    )
    const m = body.match(re)
    if (m && m[2].trim()) {
      const value = m[2].trim()
      // Strip the leading em-dash/colon/whitespace punctuation the suffix was
      // introduced with, e.g. " — simplify k(x)..." -> "simplify k(x)...".
      const suffix = m[1].replace(/^[\s—–:-]+/, '').trim()
      if (!includeSuffix || !suffix) return value
      // The suffix alone is a fragment, not a sentence — "sec(π/3)" or "A (no
      // calc)" reads as a dangling clause with no subject. Putting the
      // matched alias back in front ("Worked example — sec(π/3)") is what
      // makes it read as the prompt it actually is. `suffix` never carries a
      // leading dash at this point (stripped above), so this cannot double one.
      return `${alias} — ${suffix}\n${value}`
    }
  }
  return null
}

const IDEA = ['Plain language', 'Plain idea', 'Plain-language']
const EXAMPLE = ['Worked example', 'Worked examples']
const MISTAKE = ['#1 mistake', '#1 Mistake', 'Common mistake']

/**
 * Parse one pack into topic + teaching rows.
 *
 * Topic ids are `<unit>.<sequence>` so they cannot collide across packs, and the
 * pack's own heading label is preserved in `source_label` for traceability back
 * to the markdown.
 */
export function parsePack({ text, unit, tested, file }) {
  const found = sections(text)
  const topics = []
  const teaching = []
  const incomplete = []

  found.forEach((s, i) => {
    const id = `${unit}.${i + 1}`
    const [lo, hi] = UNIT_WEIGHTS[unit] ?? [0, 0]
    topics.push({
      id,
      subject: 'ap_precalc',
      unit,
      name: s.title,
      ek: labelled(s.body, IDEA) ?? s.title,
      exam_weight_low: lo,
      exam_weight_high: hi,
      tested_on_exam: tested,
      source_label: s.label,
      source_file: `ap_precalc/study-packs/${file}`,
    })

    const plain_idea = labelled(s.body, IDEA)
    // The prompt sometimes lives in the label itself (e.g. "Worked example —
    // simplify k(x) = ... to a single term in tan x:"), so it is prepended to
    // the solution — otherwise the solution arrives without its question.
    const worked_example = labelled(s.body, EXAMPLE, { includeSuffix: true })
    const common_mistake = labelled(s.body, MISTAKE)
    teaching.push({
      topic: id,
      subject: 'ap_precalc',
      plain_idea,
      worked_example,
      common_mistake,
      source_file: `ap_precalc/study-packs/${file}`,
      complete: Boolean(plain_idea && worked_example && common_mistake),
    })
    if (!(plain_idea && worked_example && common_mistake)) {
      incomplete.push({
        topic: id,
        label: s.label,
        title: s.title,
        missing: [
          !plain_idea && 'plain_idea',
          !worked_example && 'worked_example',
          !common_mistake && 'common_mistake',
        ].filter(Boolean),
      })
    }
  })

  return { topics, teaching, incomplete, sectionCount: found.length }
}

/**
 * Parse all four packs.
 *
 * Refuses to report success if a pack yields no sections at all — the failure
 * mode that let an earlier parser return a third of the items and call it done.
 */
export function parseAll(readFile) {
  const topics = []
  const teaching = []
  const incomplete = []
  const errors = []
  const perUnit = {}

  for (const pack of PACKS) {
    const text = readFile(`ap_precalc/study-packs/${pack.file}`)
    const r = parsePack({ ...pack, text })
    if (r.sectionCount === 0) {
      errors.push(`${pack.file}: no concept sections matched — heading convention changed?`)
    }
    perUnit[pack.unit] = r.sectionCount
    topics.push(...r.topics)
    teaching.push(...r.teaching)
    incomplete.push(...r.incomplete)
  }

  return { topics, teaching, incomplete, errors, perUnit }
}
