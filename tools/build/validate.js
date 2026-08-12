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
 * Topic ids are only unique WITHIN a subject: 42 of the 48 Precalc ids ("1.1",
 * "2.3", ...) are also CSA ids. Keying any topic bookkeeping on the bare id lets
 * one subject's items vouch for another subject's topics, which is how 44 empty
 * Precalc topics produced 2 warnings instead of 44. Item ids, by contrast, are the
 * primary key of the items table and must be globally unique.
 */
const topicKey = (subject, id) => `${subject ?? '?'}:${id}`

/** Kinds that are graded by the model against a worked solution, not by key. */
const MODEL_GRADED_KINDS = new Set(['frq', 'constructed_model_graded'])

/**
 * Errors block the build; warnings print but allow it.
 *
 * Runs over EVERY subject. The MCQ-shaped assertions (practice tag, four options,
 * key present and among them) are gated on `kind === 'mcq'`, because a
 * model-graded constructed-response item legitimately has no options and no key —
 * build.js holds those to their own contract instead. Everything that is true of
 * any item at all — unique id, a topic that exists in its own subject, a stem a
 * student can actually read — is checked universally.
 *
 * Off-syllabus scanning covers stem and options only — explanations legitimately
 * discuss banned constructs in order to warn against them. Items that deliberately
 * quote one (e.g. the charAt-vs-substring distractor) opt out with
 * [allow-offsyllabus] on the tag line.
 */
export function validate(items, topics) {
  const errors = []
  const warnings = []
  const topicIds = new Set(topics.map((t) => topicKey(t.subject, t.id)))
  const seen = new Set()

  for (const it of items) {
    if (seen.has(it.id)) errors.push(`${it.id}: duplicate item id`)
    seen.add(it.id)

    if (!it.topic) errors.push(`${it.id}: missing topic tag`)
    if (!it.stem || !it.stem.trim()) errors.push(`${it.id}: empty stem`)
    if (it.topic && !topicIds.has(topicKey(it.subject, it.topic))) {
      errors.push(`${it.id}: topic ${it.topic} is not in the coverage matrix for ${it.subject}`)
    }

    if (it.kind === 'mcq') {
      if (!it.practice) errors.push(`${it.id}: missing practice tag`)
      if (!it.options) errors.push(`${it.id}: could not parse options`)
      if (!it.answer) errors.push(`${it.id}: no answer key`)
      if (it.options && it.answer && !(it.answer in it.options)) {
        errors.push(`${it.id}: answer key ${it.answer} is not one of the options`)
      }
    } else if (!it.kind) {
      errors.push(`${it.id}: no kind — an item is either 'mcq' or an explicitly model-graded kind`)
    } else if (!MODEL_GRADED_KINDS.has(it.kind)) {
      errors.push(`${it.id}: unknown kind '${it.kind}' — cannot tell how this item would be graded`)
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
    // Keyed per subject: a CSA item at "1.1" must not vouch for Precalc's "1.1".
    if (!items.some((i) => topicKey(i.subject, i.topic) === topicKey(t.subject, t.id))) {
      warnings.push(`topic ${t.id} has no items (${t.subject})`)
    }
  }

  return { errors, warnings }
}
