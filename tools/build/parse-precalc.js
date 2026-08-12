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
 * Each unit has exactly 12 items; parseAll() asserts that so a future format
 * change cannot silently drop problems (the first version of this parser found
 * only 22 of 48 and reported success).
 */
const UNIT_OF = {
  'unit-1-polynomial-rational.md': { unit: '1', slug: 'u1', tested: true },
  'unit-2-exponential-logarithmic.md': { unit: '2', slug: 'u2', tested: true },
  'unit-3-trigonometric-polar.md': { unit: '3', slug: 'u3', tested: true },
  'unit-4-parametric-vectors-matrices.md': { unit: '4', slug: 'u4', tested: false },
}

const EXPECTED_PER_UNIT = 12

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

export function parsePracticeItems(text, filename) {
  const meta = UNIT_OF[filename]
  if (!meta) throw new Error(`unknown Precalc file: ${filename}`)

  const lines = text.split('\n')
  const starts = []
  lines.forEach((l, i) => {
    const m = l.match(/^\*\*P(\d+)\b(.*?)\*\*(.*)$/)
    if (m) starts.push({ i, num: Number(m[1]), tagline: m[2], rest: m[3] })
  })

  return starts.map((s, k) => {
    const end = k + 1 < starts.length ? starts[k + 1].i : lines.length
    const body = lines.slice(s.i + 1, end).join('\n')
    const solMatch = body.match(/<details><summary>Solution<\/summary>\s*([\s\S]*?)<\/details>/)
    const stemTail = body.split('<details>')[0]
    const { difficulty, calc } = readTagline(s.tagline)

    return {
      id: `pc-${meta.slug}-p${s.num}`,
      subject: 'ap_precalc',
      unit: meta.unit,
      number: s.num,
      // These are worked-solution practice problems, not single-answer items:
      // "give the zeros and their multiplicities, and say whether the graph
      // crosses or bounces" has no canonical short answer. So they are declared
      // model-graded rather than left with a null key, which would otherwise be
      // treated as a mismatch and mark every answer WRONG. Model-graded work is
      // excluded from every readiness floor.
      kind: 'constructed_model_graded',
      difficulty,
      calc_allowed: calc,
      tested_on_exam: meta.tested,
      stem: `${s.rest}\n${stemTail}`.replace(/\s+/g, ' ').trim(),
      solution: solMatch ? solMatch[1].replace(/\s+/g, ' ').trim() : null,
      // The printed solution is the feedback the student sees after answering.
      explanation: solMatch ? solMatch[1].replace(/\s+/g, ' ').trim() : null,
      answer: null,
      answer_variants: [],
    }
  })
}

export function parseTeachingTriples(text, filename) {
  const meta = UNIT_OF[filename]
  if (!meta) throw new Error(`unknown Precalc file: ${filename}`)
  const out = []
  const sections = text.split(/^###+\s+/m).slice(1)
  for (const sec of sections) {
    const heading = sec.split('\n')[0].trim()
    const idm = heading.match(/^(\d+\.\d+[a-z]?)\s+(.*)$/)
    if (!idm) continue
    const grab = (re) => {
      const mm = sec.match(re)
      return mm ? mm[1].replace(/\s+/g, ' ').trim() : null
    }
    out.push({
      topic: `pc-${idm[1]}`,
      subject: 'ap_precalc',
      unit: meta.unit,
      name: idm[2],
      plain_idea: grab(/\*\*Plain idea:?\*\*\s*([\s\S]*?)(?=\n\n|\*\*)/),
      worked_example: grab(/\*\*Worked example[^*]*\*\*\s*([\s\S]*?)(?=\n\n\*\*|\*\*#1)/),
      common_mistake: grab(/\*\*#1 mistake:?\*\*\s*([\s\S]*?)(?=\n\n|\*\*|$)/),
      source_file: `ap_precalc/study-packs/${filename}`,
    })
  }
  return out
}

/** Parse every unit and refuse to report success if any unit is short. */
export function parseAll(readFile) {
  const items = []
  const teaching = []
  const errors = []
  for (const f of Object.keys(UNIT_OF)) {
    const text = readFile(`ap_precalc/study-packs/${f}`)
    const got = parsePracticeItems(text, f)
    if (got.length !== EXPECTED_PER_UNIT) {
      errors.push(`${f}: parsed ${got.length} items, expected ${EXPECTED_PER_UNIT}`)
    }
    const missingSolution = got.filter((i) => !i.solution).map((i) => i.id)
    if (missingSolution.length) {
      errors.push(`${f}: items with no solution block: ${missingSolution.join(', ')}`)
    }
    items.push(...got)
    teaching.push(...parseTeachingTriples(text, f))
  }
  return { items, teaching, errors }
}

export const PRECALC_FILES = Object.keys(UNIT_OF)
