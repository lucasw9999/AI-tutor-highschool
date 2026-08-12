const BANNED = [
  [/\bcharAt\s*\(/, 'charAt'],
  [/\bextends\s+[A-Z]/, 'extends'],
  [/\bimplements\s+[A-Z]/, 'implements'],
  [/\bHashMap\b/, 'HashMap'],
  [/\bHashSet\b/, 'HashSet'],
  [/\bdo\s*\{/, 'do-while'],
  [/\bswitch\s*\(/, 'switch'],
  [/\bMath\.(min|max|round)\s*\(/, 'Math.min/max/round'],
]

/**
 * Errors block the build; warnings print but allow it.
 *
 * Off-syllabus scanning covers stem and options only — explanations legitimately
 * discuss banned constructs in order to warn against them. Items that deliberately
 * quote one (e.g. the charAt-vs-substring distractor) opt out with
 * [allow-offsyllabus] on the tag line.
 */
export function validate(items, topics) {
  const errors = []
  const warnings = []
  const topicIds = new Set(topics.map((t) => t.id))
  const seen = new Set()

  for (const it of items) {
    if (seen.has(it.id)) errors.push(`${it.id}: duplicate item id`)
    seen.add(it.id)

    if (!it.topic) errors.push(`${it.id}: missing topic tag`)
    if (!it.practice) errors.push(`${it.id}: missing practice tag`)
    if (!it.stem || !it.stem.trim()) errors.push(`${it.id}: empty stem`)
    if (!it.options) errors.push(`${it.id}: could not parse options`)
    if (!it.answer) errors.push(`${it.id}: no answer key`)

    if (it.options && it.answer && !(it.answer in it.options)) {
      errors.push(`${it.id}: answer key ${it.answer} is not one of the options`)
    }
    if (it.topic && !topicIds.has(it.topic)) {
      errors.push(`${it.id}: topic ${it.topic} is not in the coverage matrix`)
    }

    if (!it.allowOffSyllabus) {
      const hay = [it.stem, ...Object.values(it.options || {})].join(' ')
      for (const [re, name] of BANNED) {
        if (re.test(hay)) {
          errors.push(`${it.id}: off-syllabus construct "${name}" in stem/options`)
        }
      }
    }
  }

  const graded = items.filter((i) => i.answer)
  if (graded.length >= 20) {
    for (const L of ['A', 'B', 'C', 'D']) {
      const pct = (graded.filter((i) => i.answer === L).length / graded.length) * 100
      if (pct < 20 || pct > 30) {
        warnings.push(`answer ${L} is ${pct.toFixed(1)}% of keys (target 20-30%)`)
      }
    }
  }

  for (const t of topics) {
    if (t.malformed) {
      errors.push(
        `topic ${t.id}: malformed table row (${t.cell_count} content cells, expected 3) — unescaped pipe in the source? Write a literal pipe as \\|`,
      )
    }
    if (!t.ek) {
      errors.push(`topic ${t.id}: empty EK — teaching material for this topic would be blank`)
    }
    if (!items.some((i) => i.topic === t.id)) warnings.push(`topic ${t.id} has no items`)
  }

  return { errors, warnings }
}
