import { readdirSync, readFileSync } from 'node:fs'

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

// ---------------------------------------------------------------------------
// Is the readiness standard SATISFIABLE against the bank that exists?
//
// The build already refuses to pass an exam-tested topic with no items. This is
// the same question one level up, and until now nobody asked it: a subject's
// readiness config demands N scored sittings, api.js will not score a sitting
// until it covers 90% of the section, and the bank is finite. CSA's config asks
// for 6 sittings x 38 answered questions = 228 servings from a 218-item bank, so
// the sixth sitting could not be completed and total_logged_mocks_min was
// unreachable — arithmetically, not eventually. The only symptom was a 409.
//
// What is a HARD demand and what is merely tight, reasoned out explicitly:
//
//   * One sitting must be assembled from DISTINCT items. Asking the same
//     question twice does not make it two questions of evidence, and the
//     composite a sitting produces is the only number that moves readiness. So
//     `bank >= ceil(questions * MIN_MOCK_COVERAGE)` is unavoidable: no policy can
//     conjure the items, only more content can. -> ERROR.
//   * Those items must be gradable BY KEY. The composite counts server-graded
//     answers only, so a bank of model-graded items can fill a sitting and still
//     never produce a composite. -> ERROR.
//   * The `consecutive_qualifying_mocks` sittings that decide readiness must all
//     fall inside `window_span_days_max` days. If the no-repeat window covers
//     that whole span, none of them may re-ask an earlier one's question, so they
//     need that many disjoint papers. -> ERROR (fixable from either side: more
//     items, or a window sized to the bank).
//   * Reuse ACROSS sittings once the window has passed is ordinary test practice
//     — a paper is a sample of the exam, and a question answered five weeks ago
//     is evidence again — and select.js labels a repeat that is still inside the
//     window rather than passing it off as fresh. So needing more total servings
//     than the bank holds is worth saying and is NOT a failure. -> WARNING. It
//     must never be "fixed" by lowering total_logged_mocks_min or the coverage
//     gate: those are the standard, and the supply side is what gives.
// ---------------------------------------------------------------------------

/**
 * The share of a section a sitting must cover before api.js scores it.
 *
 * Re-stated here rather than imported, so the content build does not depend on
 * the Worker runtime; validate.test.js fails if it ever disagrees with api.js's
 * MIN_MOCK_COVERAGE.
 */
export const MIN_MOCK_COVERAGE = 0.9

/**
 * The no-repeat window assumed for a config that names none. Same arrangement:
 * this must equal select.js's DEFAULT_REUSE_DAYS, and a test fails if it does not.
 */
export const ASSUMED_REUSE_DAYS = 56

/** Every subject config the Worker ships, as parsed JSON, ordered by filename. */
export function readinessConfigs(dir = new URL('../../worker/config/', import.meta.url)) {
  return readdirSync(dir)
    .filter((f) => f.endsWith('.json'))
    .sort()
    .map((f) => JSON.parse(readFileSync(new URL(f, dir), 'utf8')))
}

/**
 * Judge ONE subject's bank against ONE subject's readiness config.
 *
 * `bank` is that subject's items and nothing else. An empty bank is not judged:
 * build.js already reports a configured subject that parsed to nothing, and a
 * second voice saying "0 items cannot supply a sitting" adds noise, not news.
 */
export function feasibility(bank, config) {
  const errors = []
  const warnings = []
  if (!bank.length) return { errors, warnings }

  const subject = config?.subject ?? '?'
  const examBlock = config?.exam
  const readinessBlock = config?.readiness
  const e = examBlock ?? {}
  const r = readinessBlock ?? {}

  // The longest sitting /mock/start accepts is 'full' — the whole paper — so that
  // is what the bank has to be able to assemble.
  const mcq = e.mcq_count ?? ((e.mcq_no_calc_count ?? 0) + (e.mcq_calc_count ?? 0) || null)
  const frq = e.frq_count ?? null
  const questions = (mcq ?? 0) + (frq ?? 0)

  // A missing/misnamed "exam" block resolves `questions` to 0 exactly like a
  // healthy one that legitimately has nothing to check — the two shipped configs
  // already use two different exam-count shapes (mcq_count vs mcq_no_calc_count +
  // mcq_calc_count), so a third subject getting the shape wrong is plausible, and
  // nothing else validates a readiness config's shape. Silently returning here
  // would be a gate that quietly stops gating, which is worse than no gate — so
  // say so instead, whenever there is any indication this config meant to be
  // checked (the exam block is absent entirely, or a readiness block is present
  // expecting to be judged against it).
  if (!questions) {
    if (examBlock == null) {
      errors.push(
        `${subject}: readiness config has no "exam" block, so feasibility cannot be checked — expected ` +
          `exam.mcq_count (or exam.mcq_no_calc_count + exam.mcq_calc_count), plus optional exam.frq_count`,
      )
    } else if (readinessBlock != null) {
      errors.push(
        `${subject}: readiness config's "exam" block does not resolve to any questions (checked exam.mcq_count, ` +
          `exam.mcq_no_calc_count + exam.mcq_calc_count, and exam.frq_count — all missing or zero), so ` +
          `feasibility cannot be checked against readiness.total_logged_mocks_min`,
      )
    }
    return { errors, warnings }
  }

  const perSitting = Math.ceil(questions * MIN_MOCK_COVERAGE)
  const mocks = r.total_logged_mocks_min ?? 0
  const demand = `a scored sitting needs ${perSitting} distinct questions (exam.mcq_count ${mcq ?? 0} + ` +
    `exam.frq_count ${frq ?? 0}, times the ${Math.round(MIN_MOCK_COVERAGE * 100)}% of a section a sitting must cover)`

  if (bank.length < perSitting) {
    errors.push(
      `${subject}: ${bank.length} items in the bank, but ${demand} — no sitting can ever be assembled, so ` +
        `readiness.total_logged_mocks_min (${mocks}) is unreachable. Add at least ${perSitting - bank.length} ` +
        `more item${perSitting - bank.length === 1 ? '' : 's'}.`,
    )
  }

  // The composite counts server-graded answers only (grade.js), so an item routed
  // to a rubric, or carrying no usable key, cannot move readiness at all. Reported
  // only when gradability is the binding shortfall: if every item in the bank is
  // gradable, the bank is simply too small and the check above has said so once.
  const scorable = bank.filter((i) => !MODEL_GRADED_KINDS.has(i.kind) && String(i.answer ?? '').trim() !== '')
  if (scorable.length < perSitting && scorable.length < bank.length) {
    const kinds = [...new Set(bank.map((i) => i.kind ?? 'no kind'))].sort().join(', ')
    errors.push(
      `${subject}: only ${scorable.length} of ${bank.length} items can be graded mechanically (kinds present: ` +
        `${kinds}), but the composite that moves readiness counts server-graded answers only — so ${demand}, and ` +
        `readiness.composite_mean_min (${r.composite_mean_min ?? '?'}) can never be met. Add keyed items.`,
    )
  }

  // How many of the qualifying sittings fall inside one no-repeat window. K
  // sittings spread as widely as the span allows are span/(K-1) days apart, so a
  // window covering several of those gaps forces those sittings to share a pool.
  const reuseWindow = r.reuse_days ?? ASSUMED_REUSE_DAYS
  const stated = r.reuse_days == null ? ` (unset, so the selector's ${ASSUMED_REUSE_DAYS}-day fallback applies)` : ''
  const qualifying = r.consecutive_qualifying_mocks ?? 0
  const span = r.window_span_days_max ?? null
  if (qualifying > 1 && span != null) {
    const apart = span / (qualifying - 1)
    const disjoint = Math.min(qualifying, Math.floor(reuseWindow / apart) + 1)
    const need = disjoint * perSitting
    if (disjoint > 1 && bank.length < need) {
      errors.push(
        `${subject}: readiness.consecutive_qualifying_mocks (${qualifying}) sittings must fall inside ` +
          `readiness.window_span_days_max (${span}) days, i.e. about ${apart.toFixed(0)} days apart, and ` +
          `readiness.reuse_days (${reuseWindow})${stated} spans ${disjoint} of them — so ${disjoint} sittings need ` +
          `distinct questions: ${need} required, ${bank.length} in the bank (short ${need - bank.length}). Either ` +
          `add items or set readiness.reuse_days below ${apart.toFixed(0)}, so a sitting that much later may re-ask ` +
          `a question.`,
      )
    }
  }

  const servings = mocks * perSitting
  if (servings > bank.length) {
    warnings.push(
      `${subject}: readiness.total_logged_mocks_min (${mocks}) sittings x ${perSitting} questions = ${servings} ` +
        `servings, and the bank holds ${bank.length} — so sittings will re-ask questions from earlier ones. That is ` +
        `allowed once readiness.reuse_days (${reuseWindow})${stated} has passed, and select.js labels the repeat when it ` +
        `has not; the fix is more items, never a lower mock count.`,
    )
  }

  return { errors, warnings }
}

/**
 * Strips trivial decoration (surrounding whitespace, a wrapping backtick
 * pair, a trailing period) and returns the option's text as an uppercase
 * letter, or null if it isn't a bare single letter at all.
 */
function bareLetter(text) {
  if (typeof text !== 'string') return null
  let t = text.trim()
  if (t.length > 2 && t.startsWith('`') && t.endsWith('`')) t = t.slice(1, -1).trim()
  t = t.replace(/\.$/, '').trim()
  return /^[A-Za-z]$/.test(t) ? t.toUpperCase() : null
}

/**
 * Errors block the build; warnings print but allow it.
 *
 * Runs over EVERY subject. The MCQ-shaped assertions (practice tag, four options,
 * key present and among them, and no option text that collides with a label) are
 * gated on `kind === 'mcq'`, because a model-graded constructed-response item
 * legitimately has no options and no key — build.js holds those to their own
 * contract instead. Everything that is true of any item at all — unique id, a
 * topic that exists in its own subject, a stem a student can actually read — is
 * checked universally.
 *
 * Off-syllabus scanning covers stem and options only — explanations legitimately
 * discuss banned constructs in order to warn against them. Items that deliberately
 * quote one (e.g. the charAt-vs-substring distractor) opt out with
 * [allow-offsyllabus] on the tag line.
 *
 * `configs` are the readiness standards each subject's bank is measured against,
 * defaulting to the ones the Worker ships. Pass [] to check the items alone — a
 * fixture of two items is not a claim about a subject's whole bank.
 */
export function validate(items, topics, configs = readinessConfigs()) {
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
      if (it.options) {
        const labels = Object.keys(it.options)
        for (const [label, text] of Object.entries(it.options)) {
          const bare = bareLetter(text)
          // A bare letter matching this option's OWN label is fine: reading the
          // response as a letter and matching it against option text both land
          // on the same option, so there is nothing to disambiguate. A bare
          // letter matching a DIFFERENT option's label is genuinely ambiguous —
          // the grader has no way to tell which the student meant, so it now
          // declines the response rather than guess, and that decline is
          // invisible to every downstream statistic. Ship the fix in the
          // content, not around it: reword the option.
          if (bare && bare !== label.toUpperCase() && labels.some((l) => l.toUpperCase() === bare)) {
            errors.push(
              `${it.id}: option ${label}'s text "${text.trim()}" is itself label ${bare} — a response of ` +
                `"${bare}" cannot be disambiguated between option ${label} (by text) and option ${bare} ` +
                `(by letter); reword option ${label}'s text so it is not a bare letter`,
            )
          }
        }
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

  const seenTopics = new Set()
  for (const t of topics) {
    const tKey = topicKey(t.subject, t.id)
    // Mirrors the item-id duplicate check above: topics has PRIMARY KEY (subject,
    // id) and to-sql.js emits INSERT OR REPLACE for topics exactly as it does for
    // items, so a copy-pasted row here means D1 receives one row fewer than the
    // build reports writing — keyed on subject, since a topic id is only unique
    // within its own subject.
    if (seenTopics.has(tKey)) errors.push(`topic ${t.id}: duplicate topic id for subject ${t.subject}`)
    seenTopics.add(tKey)

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

  // Last, because it is the only check that judges the bank as a whole rather
  // than one item or one topic.
  for (const config of configs) {
    const f = feasibility(items.filter((i) => i.subject === config.subject), config)
    errors.push(...f.errors)
    warnings.push(...f.warnings)
  }

  return { errors, warnings }
}
