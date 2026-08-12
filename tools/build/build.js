import { readFileSync, writeFileSync, mkdirSync } from 'node:fs'
import { parseMcqFile, MCQ_FILES } from './parse-mcq.js'
import { parseFrqAll } from './parse-frq.js'
import { parseTopics } from './parse-topics.js'
import { buildTeaching } from './parse-teaching.js'
import { parseAll as parsePrecalcTopics } from './parse-precalc-topics.js'
import { parseAll as parsePrecalcItems } from './parse-precalc.js'
import { validate } from './validate.js'

export function ping() {
  return 'pong'
}

const BANK_DIR = 'ap_csa/ap_csa_exam/question-bank'
const MATRIX = 'ap_csa/ap_csa_exam/topic-coverage-matrix.md'
const OUT = 'content'

/** Subjects the Worker is configured to serve. A subject with no topics is a bug. */
const SUBJECTS = ['ap_csa', 'ap_precalc']

/**
 * Precalc practice items live in a trailing "practice set" section, outside any
 * concept section, so the markdown does not say which topic each one tests.
 * Rather than guess a mapping and present it as fact, each item is bucketed at
 * `<unit>.0` — an explicit "unit level, not yet topic-tagged" marker. Per-unit
 * readiness works immediately; topic-level teaching for Precalc waits for real
 * tagging, and the build reports exactly how many items are waiting.
 */
const UNTAGGED = (unit) => `${unit}.0`

function precalcUnitBuckets(items) {
  const units = [...new Set(items.map((i) => i.unit))].sort()
  return units.map((unit) => ({
    id: UNTAGGED(unit),
    subject: 'ap_precalc',
    unit,
    name: `Unit ${unit} — practice items not yet topic-tagged`,
    ek: 'Placeholder bucket. Items here count toward per-unit readiness but cannot drive topic-level teaching.',
    exam_weight_low: 0,
    exam_weight_high: 0,
    tested_on_exam: unit !== '4',
    untagged_bucket: true,
  }))
}

export function compile(readFile = (f) => readFileSync(f, 'utf8')) {
  // --- AP CSA ------------------------------------------------------------
  const csaTopics = parseTopics(readFile(MATRIX))
  const csaMcq = MCQ_FILES.flatMap((f) => parseMcqFile(readFile(`${BANK_DIR}/${f}`), f))

  // Free response is 45% of the CSA exam score and all 25 of its points, and it
  // used to reach the build not at all: parse-mcq.js names five mcq-*.md files
  // and nothing named frq-q*.md, so 20 finished practice FRQs were invisible to
  // every gate, to the selector, and to the student. A refused parse is an ERROR
  // and yields no items — parse-frq.js does not return a partial bank — so this
  // can never quietly compile a bank with some of the free-response half in it.
  //
  // Units come from the topics table, exactly as to-sql.js derives them, rather
  // than from the topic id's prefix: a topic whose unit is not what its prefix
  // suggests still lands in the right unit.
  const csaUnits = new Map(csaTopics.map((t) => [t.id, t.unit]))
  const frqErrors = []
  let csaFrq = []
  try {
    csaFrq = parseFrqAll((f) => readFile(`${BANK_DIR}/${f}`)).items
      .map((it) => ({ ...it, unit: csaUnits.get(it.topic) ?? null }))
  } catch (err) {
    frqErrors.push(err.message)
  }

  // MCQ items first, deliberately. buildTeaching takes a topic's FIRST item
  // explanation as its worked example, and an MCQ's answer-key rationale is a
  // worked example of that one topic, while an FRQ's sample solution is a whole
  // class or a whole method spanning several. Appending keeps every existing
  // teaching row byte-identical.
  const csaItems = [...csaMcq, ...csaFrq]
  const csaTeaching = buildTeaching(csaTopics, csaItems)

  // --- AP Precalculus ----------------------------------------------------
  const pc = parsePrecalcTopics(readFile)
  const errors = [...frqErrors, ...pc.errors]

  let pcItems = []
  let pcItemErrors = []
  try {
    const parsed = parsePrecalcItems(readFile)
    pcItems = (parsed.items ?? []).map((it) => ({
      ...it,
      subject: 'ap_precalc',
      topic: it.topic ?? UNTAGGED(it.unit),
    }))
    pcItemErrors = parsed.errors ?? []
  } catch (err) {
    pcItemErrors = [`precalc item parse failed: ${err.message}`]
  }
  errors.push(...pcItemErrors)

  const topics = [...csaTopics, ...pc.topics, ...precalcUnitBuckets(pcItems)]
  const items = [...csaItems, ...pcItems]
  const teaching = [...csaTeaching.entries, ...pc.teaching]

  // EVERY subject goes through validation. Passing only the CSA slice here is how
  // 48 Precalc items and 48 Precalc topics bypassed every check in validate.js:
  // an item with an empty stem, or two items sharing an id (which to-sql.js then
  // collapses with INSERT OR REPLACE, losing one), were both reported as success.
  const v = validate(items, topics)
  errors.push(...v.errors)
  const warnings = [...v.warnings]

  // A configured subject with no topics means a parser silently produced nothing.
  for (const s of SUBJECTS) {
    if (!topics.some((t) => t.subject === s)) errors.push(`subject ${s} has no topics — parser returned nothing`)
  }

  // Readiness must be arithmetically reachable. readiness.js requires
  // topics_drilled >= topics_total before it evaluates anything else, so an
  // exam-tested topic with no items of its own caps the subject below 100% forever
  // while the dashboard still presents readiness as a computed verdict. This is an
  // error, not a warning: the build must stop claiming success for a subject that
  // cannot reach the bar. Only subjects that have items at all are judged — a
  // subject with zero items is already reported above as its own failure.
  const unreachable = []
  for (const s of SUBJECTS) {
    const subjectItems = items.filter((i) => i.subject === s)
    if (!subjectItems.length) continue
    for (const topic of topics.filter((t) => t.subject === s && t.tested_on_exam)) {
      if (!subjectItems.some((i) => i.topic === topic.id)) {
        unreachable.push({ subject: s, id: topic.id, name: topic.name })
      }
    }
  }
  for (const s of SUBJECTS) {
    const gaps = unreachable.filter((u) => u.subject === s)
    if (!gaps.length) continue
    const total = topics.filter((t) => t.subject === s && t.tested_on_exam).length
    errors.push(
      `${s}: ${gaps.length} of ${total} exam-tested topic(s) have NO items, so readiness can never exceed ` +
      `${(((total - gaps.length) / total) * 100).toFixed(1)}% coverage. Untestable topics:\n` +
      gaps.map((g) => `        ${g.id} — ${g.name}`).join('\n'),
    )
  }

  // Teaching material must contain something. worker/src/teaching.js only guards
  // against a MISSING row, so an all-null row returns a truthy lesson with three
  // empty fields and the "no teaching material exists yet" safeguard never fires:
  // the student gets a blank remediation screen.
  const blankTeaching = teaching.filter((t) => !t.plain_idea && !t.worked_example && !t.common_mistake)
  for (const t of blankTeaching) {
    errors.push(
      `teaching ${t.subject}:${t.topic} has no teaching content at all (plain_idea, worked_example and ` +
      `common_mistake are all null) — the student would be shown a blank remediation`,
    )
  }

  // A topic a student can be drilled on but never taught from is a dead end.
  const teachingKeys = new Set(teaching.map((t) => `${t.subject}:${t.topic}`))
  const topicsMissingTeaching = topics
    .filter((t) => items.some((i) => i.subject === t.subject && i.topic === t.id))
    .filter((t) => !teachingKeys.has(`${t.subject}:${t.id}`))
    .map((t) => ({ subject: t.subject, id: t.id, name: t.name }))
  for (const t of topicsMissingTeaching) {
    errors.push(`topic ${t.subject}:${t.id} has items but no teaching row — a wrong answer has nothing to teach from`)
  }

  // Cross-subject gate. validate() only ever ran over the CSA items, which is
  // how 48 keyless Precalc items reached the database: grade() treated a null
  // key as a mismatch, so every answer would have been marked WRONG. An item is
  // either mechanically gradeable (and must carry a key) or explicitly declared
  // model-graded. There is no third state.
  const MODEL_GRADED_KINDS = new Set(['frq', 'constructed_model_graded'])
  for (const it of items) {
    const keyed = it.answer != null && String(it.answer).trim() !== ''
    if (!MODEL_GRADED_KINDS.has(it.kind) && !keyed) {
      errors.push(
        `${it.id} (${it.subject}, kind=${it.kind}): no answer key. Add one, or declare kind as ` +
        `'constructed_model_graded' so it is routed to the model instead of being marked wrong.`,
      )
    }
    if (MODEL_GRADED_KINDS.has(it.kind) && !it.explanation && !it.solution) {
      errors.push(`${it.id}: model-graded items need a worked solution for the student to compare against`)
    }
  }

  return {
    topics, items, teaching, errors, warnings,
    csaTeachingGaps: csaTeaching.gaps,
    precalcIncomplete: pc.incomplete,
    precalcUntagged: pcItems.filter((i) => i.topic.endsWith('.0')).length,
    perUnitSections: pc.perUnit,
    // Free response, so the build can never again report a CSA bank without
    // saying how much of the exam's other half is in it.
    frq: {
      items: csaFrq.length,
      points: csaFrq.reduce((n, it) => n + it.points, 0),
      byType: Object.fromEntries(
        [...new Set(csaFrq.map((i) => i.question_type))].sort()
          .map((slot) => [slot, csaFrq.filter((i) => i.question_type === slot).length]),
      ),
      primaryTopics: [...new Set(csaFrq.map((i) => i.topic))],
    },
    unreachable,
    blankTeaching,
    topicsMissingTeaching,
  }
}

/**
 * Per-subject counts, so an empty subject can never hide behind a total.
 *
 * Rows WRITTEN and rows COMPLETE are separate numbers. Reporting only the complete
 * count understated reality — it printed "teaching= 36" while 44 Precalc rows were
 * being written to teaching.json and loaded into D1, several of them missing fields.
 *
 * Items are also broken down BY KIND. A single item total is what let CSA report a
 * healthy 218 while holding not one free-response question — 45% of the exam score
 * and every one of its 25 free-response points, absent, invisible in the summary
 * line. api.js measures a section's supply per kind (sectionParts), so the build
 * must report per kind too, or the two can disagree without anyone noticing.
 */
export function summary({ topics, items, teaching }) {
  const rows = {}
  for (const s of SUBJECTS) {
    const subjectTeaching = teaching.filter((t) => t.subject === s)
    const subjectItems = items.filter((i) => i.subject === s)
    rows[s] = {
      topics: topics.filter((t) => t.subject === s).length,
      items: subjectItems.length,
      itemsByKind: Object.fromEntries(
        [...new Set(subjectItems.map((i) => i.kind ?? 'no kind'))].sort()
          .map((kind) => [kind, subjectItems.filter((i) => i.kind === kind).length]),
      ),
      teachingWritten: subjectTeaching.length,
      teachingComplete: subjectTeaching.filter((t) => t.complete !== false).length,
    }
  }
  return rows
}

/**
 * Everything about the content that is not ready, whether or not the build passed.
 * Printed before the errors and independently of them, so a failing build still
 * says exactly what content work is outstanding.
 */
export function incompleteReport(r) {
  const rows = summary(r)
  const out = []

  for (const [subject, c] of Object.entries(rows)) {
    if (c.items === 0) out.push(`${subject} has NO items — it cannot serve a single question yet`)
    if (c.teachingWritten > c.teachingComplete) {
      out.push(
        `${subject}: ${c.teachingWritten - c.teachingComplete} of ${c.teachingWritten} teaching row(s) written ` +
        `to teaching.json are missing at least one field`,
      )
    }
  }
  if (r.precalcUntagged) {
    out.push(`${r.precalcUntagged} precalc item(s) are bucketed at <unit>.0 and cannot drive topic-level teaching until tagged`)
  }
  // The same disclosure the Precalc buckets get, for the same reason: the FRQ
  // markdown declares its topics per FILE (its Cross-links line, which agrees
  // with the "Bank Item(s)" column of the coverage matrix), never per item. Each
  // item therefore carries the first topic its file declares — the document's own
  // ordering — and the other topics that file covers get no item of their own from
  // it. Said out loud rather than presented as a per-item tag the content does
  // not state.
  if (r.frq.items) {
    out.push(
      `ap_csa: ${r.frq.items} free-response item(s) carry the FIRST topic their file declares ` +
      `(${r.frq.primaryTopics.join(', ')}) because the markdown declares topics per FRQ file, not per item — so ` +
      'topic-level selection sees each question type as one topic',
    )
  }
  for (const [subject, ids] of Object.entries(bySubject(r.unreachable))) {
    out.push(`${subject}: ${ids.length} exam-tested topic(s) cannot reach readiness — no items exist for ${ids.join(', ')}`)
  }
  for (const [subject, ids] of Object.entries(bySubject(r.topicsMissingTeaching))) {
    out.push(`${subject}: ${ids.length} topic(s) have items but no teaching row: ${ids.join(', ')}`)
  }
  const blank = bySubject(r.blankTeaching.map((t) => ({ subject: t.subject, id: t.topic })))
  for (const [subject, ids] of Object.entries(blank)) {
    out.push(`${subject}: ${ids.length} teaching row(s) are entirely blank: ${ids.join(', ')}`)
  }
  if (r.csaTeachingGaps.length) {
    out.push(`ap_csa: ${r.csaTeachingGaps.length} topic(s) lack teaching material: ${r.csaTeachingGaps.join(', ')}`)
  }
  return out
}

function bySubject(rows) {
  const out = {}
  for (const r of rows) (out[r.subject] ??= []).push(r.id)
  return out
}

/**
 * A build answers two independent questions, and they must not be conflated:
 *
 *   1. did the compile produce FAITHFUL artifacts from the markdown?
 *   2. is the content COMPLETE enough for the readiness engine to work?
 *
 * (2) is false today — ap_precalc has 33 exam-tested topics with no items — and the
 * gates above are right to fail the build for it. But failing also meant writing
 * nothing, which stranded fixes that were already correct in the markdown (a wrong
 * answer key, a false arithmetic check, 92 backtick-corrupted MCQ options) inside
 * the compiler, where no student could ever see them.
 *
 * This flag separates the two: write the faithful artifacts, keep every ERROR, keep
 * the non-zero exit. It is an exact argv flag on purpose — never an env var, never a
 * default, never inferred from CI — so nothing a job inherits can turn it on, and it
 * says out loud that what it wrote is incomplete and must not be deployed as if it
 * were finished.
 */
const WRITE_DESPITE_INCOMPLETE = '--write-despite-incomplete'

function writeArtifacts({ items, topics, teaching }) {
  mkdirSync(OUT, { recursive: true })
  writeFileSync(`${OUT}/items.json`, `${JSON.stringify(items, null, 2)}\n`)
  writeFileSync(`${OUT}/topics.json`, `${JSON.stringify(topics, null, 2)}\n`)
  writeFileSync(`${OUT}/teaching.json`, `${JSON.stringify(teaching, null, 2)}\n`)
}

function main(argv = process.argv.slice(2)) {
  const writeAnyway = argv.includes(WRITE_DESPITE_INCOMPLETE)
  const r = compile()
  const rows = summary(r)

  console.log('Per subject:')
  for (const [subject, c] of Object.entries(rows)) {
    const kinds = Object.entries(c.itemsByKind).map(([k, n]) => `${k}=${n}`).join(' ') || 'none'
    console.log(
      `  ${subject.padEnd(11)} topics=${String(c.topics).padStart(3)}  items=${String(c.items).padStart(4)} (${kinds})` +
      `  teaching rows written=${String(c.teachingWritten).padStart(3)} complete=${String(c.teachingComplete).padStart(3)}`,
    )
  }
  console.log(
    `Free response: ${r.frq.items} item(s) worth ${r.frq.points} rubric points ` +
    `${JSON.stringify(r.frq.byType)}`,
  )
  console.log(`Precalc concept sections per unit: ${JSON.stringify(r.perUnitSections)}`)

  for (const w of r.warnings) console.warn(`WARN  ${w}`)
  for (const inc of r.precalcIncomplete) {
    console.warn(`WARN  precalc topic ${inc.topic} (${inc.source_label ?? inc.label}) missing: ${inc.missing.join(', ')} — "${inc.title.slice(0, 50)}"`)
  }

  // Printed before the verdict, so it is visible whether the build passes or fails.
  const notReady = incompleteReport(r)
  if (notReady.length) {
    console.log('\nINCOMPLETE CONTENT (true regardless of whether the build passes):')
    for (const n of notReady) console.log(`  - ${n}`)
  }

  if (r.errors.length) {
    for (const e of r.errors) console.error(`ERROR ${e}`)
    if (!writeAnyway) {
      console.error(`\nBuild FAILED with ${r.errors.length} error(s). Nothing written.`)
      process.exit(1)
    }
    // Same errors, same failure — only the artifacts change hands.
    writeArtifacts(r)
    console.error(`\nBuild FAILED with ${r.errors.length} error(s).`)
    console.error('*** INCOMPLETE CONTENT WRITTEN ***')
    console.error(
      `  ${WRITE_DESPITE_INCOMPLETE} was passed, so ${OUT}/items.json, topics.json and teaching.json were\n` +
      '  rewritten from the markdown even though the errors above are UNFIXED. These artifacts are\n' +
      '  faithful to the content, and the content is incomplete: readiness cannot be computed from it.\n' +
      '  They must NOT be deployed, seeded or reported as if the content were complete. The build has\n' +
      '  still FAILED — fix every ERROR above and re-run without the flag before shipping.',
    )
    process.exit(1)
  }

  writeArtifacts(r)
  if (writeAnyway) {
    console.log(`\n${WRITE_DESPITE_INCOMPLETE} had no effect: the content passed every gate.`)
  }
  console.log(`\nBuild OK. Wrote ${OUT}/items.json, topics.json, teaching.json`)
}

if (process.argv[1] && process.argv[1].endsWith('build.js')) main()
