import { readFileSync, writeFileSync, mkdirSync } from 'node:fs'
import { parseMcqFile, MCQ_FILES } from './parse-mcq.js'
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
  const csaItems = MCQ_FILES.flatMap((f) => parseMcqFile(readFile(`${BANK_DIR}/${f}`), f))
  const { errors, warnings } = validate(csaItems, csaTopics)
  const csaTeaching = buildTeaching(csaTopics, csaItems)

  // --- AP Precalculus ----------------------------------------------------
  const pc = parsePrecalcTopics(readFile)
  errors.push(...pc.errors)

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

  // A configured subject with no topics means a parser silently produced nothing.
  for (const s of SUBJECTS) {
    if (!topics.some((t) => t.subject === s)) errors.push(`subject ${s} has no topics — parser returned nothing`)
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
  }
}

/** Per-subject counts, so an empty subject can never hide behind a total. */
export function summary({ topics, items, teaching }) {
  const rows = {}
  for (const s of SUBJECTS) {
    rows[s] = {
      topics: topics.filter((t) => t.subject === s).length,
      items: items.filter((i) => i.subject === s).length,
      teaching: teaching.filter((t) => t.subject === s && t.complete !== false).length,
    }
  }
  return rows
}

function main() {
  const r = compile()
  const rows = summary(r)

  console.log('Per subject:')
  for (const [subject, c] of Object.entries(rows)) {
    console.log(`  ${subject.padEnd(11)} topics=${String(c.topics).padStart(3)}  items=${String(c.items).padStart(4)}  teaching=${String(c.teaching).padStart(3)}`)
  }
  console.log(`Precalc concept sections per unit: ${JSON.stringify(r.perUnitSections)}`)

  for (const w of r.warnings) console.warn(`WARN  ${w}`)
  if (r.csaTeachingGaps.length) {
    console.warn(`WARN  ${r.csaTeachingGaps.length} CSA topic(s) lack teaching material: ${r.csaTeachingGaps.join(', ')}`)
  }
  for (const inc of r.precalcIncomplete) {
    console.warn(`WARN  precalc topic ${inc.topic} (${inc.source_label ?? inc.label}) missing: ${inc.missing.join(', ')} — "${inc.title.slice(0, 50)}"`)
  }

  if (r.errors.length) {
    for (const e of r.errors) console.error(`ERROR ${e}`)
    console.error(`\nBuild FAILED with ${r.errors.length} error(s). Nothing written.`)
    process.exit(1)
  }

  mkdirSync(OUT, { recursive: true })
  writeFileSync(`${OUT}/items.json`, `${JSON.stringify(r.items, null, 2)}\n`)
  writeFileSync(`${OUT}/topics.json`, `${JSON.stringify(r.topics, null, 2)}\n`)
  writeFileSync(`${OUT}/teaching.json`, `${JSON.stringify(r.teaching, null, 2)}\n`)
  console.log(`\nBuild OK. Wrote ${OUT}/items.json, topics.json, teaching.json`)

  // Say plainly what is not ready, so "Build OK" is never mistaken for "complete".
  const notReady = []
  for (const [subject, c] of Object.entries(rows)) {
    if (c.items === 0) notReady.push(`${subject} has NO items — it cannot serve a single question yet`)
  }
  if (r.precalcUntagged) {
    notReady.push(`${r.precalcUntagged} precalc item(s) are bucketed at <unit>.0 and cannot drive topic-level teaching until tagged`)
  }
  if (notReady.length) {
    console.log('\nINCOMPLETE (build succeeded, content did not):')
    for (const n of notReady) console.log(`  - ${n}`)
  }
}

if (process.argv[1] && process.argv[1].endsWith('build.js')) main()
