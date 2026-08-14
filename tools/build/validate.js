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
// EVERY DEMAND HERE IS PER KIND, and that is the correction this gate needed
// most. It used to add the halves of a paper together — CSA's 42 multiple choice
// plus 4 free-response — take 90% of the total, and count the whole bank against
// it. 218 mcq items cleared a 42-question demand comfortably, so the gate passed
// a bank holding ZERO free-response questions while free response is 45% of the
// real exam score and all 25 of its free-response points. Every mock that bank
// could assemble was structurally 0% free response, and nothing said so.
//
// A section is not a number of questions, it is a number of questions OF A KIND:
// api.js's sectionFill credits an answer only to the half its own kind belongs
// to, and its partObstacle judges each half's supply on its own with exactly the
// arithmetic mirrored below (ceil(count x MIN_MOCK_COVERAGE) items of that kind).
// A half the bank cannot supply is dropped from `scorable`, so the composite
// silently becomes a percentage of part of an exam.
//
// What is a HARD demand and what is merely tight, reasoned out explicitly:
//
//   * Each half of a sitting must be assembled from DISTINCT items OF ITS OWN
//     KIND. Asking the same question twice does not make it two questions of
//     evidence, and no number of multiple choice answers fills the free-response
//     half. So `supply(kind) >= ceil(count * MIN_MOCK_COVERAGE)` is unavoidable
//     per half: no policy can conjure the items, only more content can. -> ERROR.
//   * At least one half must be gradable BY KEY. The composite counts
//     server-graded answers only, so a bank of model-graded items can fill a
//     sitting and still never produce a composite. -> ERROR.
//   * A half whose kind is rubric-scored by design (frq) is NOT required to
//     carry keys — grade.js routes it to the model on purpose. Its supply still
//     matters: without it the student cannot practise that half at all.
//   * The `consecutive_qualifying_mocks` sittings that decide readiness must all
//     fall inside `window_span_days_max` days. If the no-repeat window covers
//     that whole span, none of them may re-ask an earlier one's question, so they
//     need that many disjoint papers — again per half. -> ERROR (fixable from
//     either side: more items, or a window sized to the bank).
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
 * The halves a full paper is made of: the item KIND each is drawn from, how many
 * of them the real exam has, and the config key that says so.
 *
 * Mirrors api.js's sectionParts, including its two accepted shapes for the
 * multiple-choice count — CSA states `mcq_count`, Precalc states
 * `mcq_no_calc_count` + `mcq_calc_count` — and its kind labels, which are what
 * the bank is counted by.
 */
function examParts(e = {}) {
  const parts = []
  const stated = e.mcq_count != null
  const split = e.mcq_no_calc_count != null || e.mcq_calc_count != null
  const mcq = stated ? e.mcq_count : (split ? (e.mcq_no_calc_count ?? 0) + (e.mcq_calc_count ?? 0) : null)
  if (mcq != null) {
    parts.push({
      kind: 'mcq',
      name: 'multiple choice',
      count: mcq,
      key: stated ? 'exam.mcq_count' : 'exam.mcq_no_calc_count + exam.mcq_calc_count',
    })
  }
  if (e.frq_count != null) {
    parts.push({ kind: 'frq', name: 'free-response', count: e.frq_count, key: 'exam.frq_count' })
  }
  return parts
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
  // is what the bank has to be able to assemble, half by half.
  const parts = examParts(e)
  const questions = parts.reduce((total, p) => total + p.count, 0)

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

  const share = `${Math.round(MIN_MOCK_COVERAGE * 100)}%`
  const mocks = r.total_logged_mocks_min ?? 0

  // What each half of a full paper demands of the bank, and what the bank has of
  // that kind. `need` is api.js partObstacle's own arithmetic; `keyed` is what
  // grade.js can mark mechanically, which is all the composite counts.
  const halves = parts.filter((p) => p.count > 0).map((p) => ({
    ...p,
    need: Math.ceil(p.count * MIN_MOCK_COVERAGE),
    have: bank.filter((i) => i.kind === p.kind).length,
    keyed: bank.filter(
      (i) => i.kind === p.kind && !MODEL_GRADED_KINDS.has(i.kind) && String(i.answer ?? '').trim() !== '',
    ).length,
    // A kind that is rubric-scored by design. Its supply is still required; its
    // keys are not, and demanding them would be demanding the wrong content.
    rubric: MODEL_GRADED_KINDS.has(p.kind),
  }))
  const kindsPresent = [...new Set(bank.map((i) => i.kind ?? 'no kind'))].sort()
    .map((k) => `${k}=${bank.filter((i) => (i.kind ?? 'no kind') === k).length}`)
    .join(', ')

  // 1. Can each half be put in front of him at all?
  //
  // When the bank holds nothing markable AT ALL, that is said here rather than as
  // a second error: "you have no questions of this kind" and "none of what you do
  // have could be marked" are one finding about one bank with one fix, and a bank
  // of 48 rubric-scored items against an exam that wants 42 multiple choice would
  // otherwise be reported twice.
  const markable = bank.filter(
    (i) => !MODEL_GRADED_KINDS.has(i.kind) && String(i.answer ?? '').trim() !== '',
  ).length
  const short = halves.filter((h) => h.have < h.need)
  if (short.length) {
    const detail = short
      .map((h) =>
        `${h.have} of the ${h.need} ${h.name} question(s) it takes to cover the ${h.count} a full paper contains ` +
        `(${h.key} ${h.count}, times the ${share} of a half api.js requires before that half is scorable)`)
      .join('; and ')
    errors.push(
      `${subject}: the bank holds ${detail}. ` +
      (short.length === halves.length
        ? `No sitting can be assembled at all, so readiness.total_logged_mocks_min (${mocks}) is unreachable.`
        : `A sitting is a number of questions OF A KIND and an answer fills only its own half (api.js sectionFill), ` +
          `so every paper this bank can assemble is structurally 0% ${short.map((h) => h.name).join(' and ')} — ` +
          `api.js drops that half from the sitting's scorable count and the composite becomes a percentage of part ` +
          `of an exam, with nothing at runtime saying which part.`) +
      ` Kinds in the bank: ${kindsPresent}. Only items of the kind that is short can fix this; no other kind ` +
      `substitutes for it.` +
      (markable
        ? ''
        : ` And not one item in this bank can be graded mechanically, so no sitting could produce a composite even ` +
          `if it were assembled: the composite counts server-graded answers only, and ` +
          `readiness.composite_mean_min (${r.composite_mean_min ?? '?'}) can never be met.`),
    )
  }

  // 2. Can a composite come out of it? The composite counts server-graded answers
  // only (grade.js), so an item routed to a rubric, or carrying no usable key,
  // cannot move readiness. Reported per half, and only where supply is not already
  // the binding shortfall — "you have the questions but cannot mark them" and "you
  // do not have the questions" are different problems with different fixes.
  const marked = halves.filter((h) => !h.rubric && h.have >= h.need)
  for (const h of marked.filter((x) => x.keyed < x.need)) {
    errors.push(
      `${subject}: only ${h.keyed} of the ${h.have} ${h.name} item(s) in the bank can be graded mechanically ` +
        `(kinds present: ${kindsPresent}), short of the ${h.need} that half needs, but the composite that moves ` +
        `readiness counts server-graded answers only — so readiness.composite_mean_min (${r.composite_mean_min ?? '?'}) ` +
        `can never be met. Add keyed items.`,
    )
  }
  // A subject whose every half is rubric-scored BY DESIGN can never produce a
  // composite however large its bank grows, which no supply or key count says.
  if (halves.length && halves.every((h) => h.rubric)) {
    errors.push(
      `${subject}: every half of this exam is rubric-scored by design ` +
        `(${halves.map((h) => `${h.name} → kind '${h.kind}'`).join(', ')}), so no sitting can ever produce a ` +
        `composite and readiness.composite_mean_min (${r.composite_mean_min ?? '?'}) can never be met. This is a ` +
        `standard that cannot be measured, not a bank that is too small.`,
    )
  }

  // 3. How many of the qualifying sittings fall inside one no-repeat window. K
  // sittings spread as widely as the span allows are span/(K-1) days apart, so a
  // window covering several of those gaps forces those sittings to share a pool —
  // and to share it per half, since a paper still needs its own kinds.
  const reuseWindow = r.reuse_days ?? ASSUMED_REUSE_DAYS
  const stated = r.reuse_days == null ? ` (unset, so the selector's ${ASSUMED_REUSE_DAYS}-day fallback applies)` : ''
  const qualifying = r.consecutive_qualifying_mocks ?? 0
  const span = r.window_span_days_max ?? null
  if (qualifying > 1 && span != null) {
    const apart = span / (qualifying - 1)
    const disjoint = Math.min(qualifying, Math.floor(reuseWindow / apart) + 1)
    const tight = halves.filter((h) => h.have >= h.need && h.have < disjoint * h.need)
    if (disjoint > 1 && tight.length) {
      errors.push(
        `${subject}: readiness.consecutive_qualifying_mocks (${qualifying}) sittings must fall inside ` +
          `readiness.window_span_days_max (${span}) days, i.e. about ${apart.toFixed(0)} days apart, and ` +
          `readiness.reuse_days (${reuseWindow})${stated} spans ${disjoint} of them — so ${disjoint} sittings need ` +
          `distinct questions of each kind: ` +
          tight.map((h) => `${disjoint * h.need} ${h.name} required, ${h.have} in the bank (short ${disjoint * h.need - h.have})`).join('; ') +
          `. Either add items or set readiness.reuse_days below ${apart.toFixed(0)}, so a sitting that much later may ` +
          `re-ask a question.`,
      )
    }
  }

  // 4. Reuse across sittings weeks apart is fine, and worth saying out loud.
  const reused = halves.filter((h) => h.have >= h.need && mocks * h.need > h.have)
  if (reused.length) {
    warnings.push(
      `${subject}: readiness.total_logged_mocks_min (${mocks}) sittings x ` +
        reused.map((h) => `${h.need} ${h.name} = ${mocks * h.need} servings against ${h.have} in the bank`).join(', and ') +
        ` — so sittings will re-ask questions from earlier ones. That is allowed once readiness.reuse_days ` +
        `(${reuseWindow})${stated} has passed, and select.js labels the repeat when it has not; the fix is more items, ` +
        `never a lower mock count.`,
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
 * Options whose TEXT is a bare letter naming a DIFFERENT option's label.
 *
 * A bare letter matching this option's OWN label is fine: reading the response as
 * a letter and matching it against option text both land on the same option, so
 * there is nothing to disambiguate. A bare letter matching a DIFFERENT option's
 * label is genuinely ambiguous — the grader has no way to tell which the student
 * meant, so it declines the response rather than guess, and that decline is
 * invisible to every downstream statistic. Ship the fix in the content, not
 * around it: reword the option.
 *
 * EXPORTED so the content parsers can refuse an option list before it is ever
 * compiled, judged by this exact function rather than by a second copy of the
 * rule that would be free to drift weaker (tools/build/parse-precalc.js). The
 * CSA bank ships four of these — csa-ac-q14, csa-ac-q33 and csa-u2-q7 twice.
 *
 * @returns {Array<{label: string, text: string, collidesWith: string}>}
 */
export function letterOptionCollisions(options) {
  if (!options || typeof options !== 'object') return []
  const labels = Object.keys(options)
  const out = []
  for (const [label, text] of Object.entries(options)) {
    const bare = bareLetter(text)
    if (bare && bare !== label.toUpperCase() && labels.some((l) => l.toUpperCase() === bare)) {
      out.push({ label, text, collidesWith: bare })
    }
  }
  return out
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
        // The gate itself lives in letterOptionCollisions, so the content
        // parsers refuse a colliding option list against this exact rule rather
        // than against a second copy of it.
        for (const c of letterOptionCollisions(it.options)) {
          errors.push(
            `${it.id}: option ${c.label}'s text "${c.text.trim()}" is itself label ${c.collidesWith} — a response of ` +
              `"${c.collidesWith}" cannot be disambiguated between option ${c.label} (by text) and option ` +
              `${c.collidesWith} (by letter); reword option ${c.label}'s text so it is not a bare letter`,
          )
        }
      }
    } else if (it.kind === 'constructed') {
      // A short constructed answer, marked mechanically by grade.js against
      // `answer` plus `answer_variants`. schema.sql has named this kind since the
      // items table shipped ("mcq | constructed | frq | constructed_model_graded")
      // and worker/tests/grade.test.js has always graded it — but validate.js had
      // never met one, because every Precalc item was emitted
      // constructed_model_graded, so the first item to carry an answer key was
      // rejected as an unknown kind. It has no options to check; the key is the
      // whole contract.
      if (!it.answer || !String(it.answer).trim()) {
        errors.push(
          `${it.id}: kind 'constructed' with no answer key — grade.js reports every answer 'unkeyed', so the item ` +
            `can never move readiness. Add a key, or declare it 'constructed_model_graded'`,
        )
      }
    } else if (!it.kind) {
      errors.push(`${it.id}: no kind — an item is 'mcq', 'constructed', or an explicitly model-graded kind`)
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

  // The key-balance check measures how the four LETTERS are spread across the
  // multiple-choice keys, so its population is the multiple-choice items — not
  // everything that carries a key. `items.filter((i) => i.answer)` was the same
  // set for as long as every keyed item was an mcq, and stopped being one the
  // round 24 Precalc `constructed` items arrived with keys like "4, -2, 2pi/3":
  // 283 keys of which 259 are letters, so every percentage came out about 8% low
  // and the 20-30% band was applied to the wrong denominator in BOTH directions —
  // a letter on 32.8% of the real keys reads as 30.0% and stops warning, one on
  // 21.6% reads as 19.8% and warns about nothing. The drift grows with every
  // short-answer key added, and the message named a population it was not
  // counting.
  const lettered = items.filter((i) => i.kind === 'mcq' && /^[A-D]$/.test(String(i.answer ?? '').trim().toUpperCase()))
  if (lettered.length >= 20) {
    for (const L of ['A', 'B', 'C', 'D']) {
      const pct = (lettered.filter((i) => String(i.answer).trim().toUpperCase() === L).length / lettered.length) * 100
      if (pct < 20 || pct > 30) {
        warnings.push(
          `answer ${L} is ${pct.toFixed(1)}% of the ${lettered.length} multiple-choice keys (target 20-30%)`,
        )
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
