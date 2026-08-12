import { readFileSync, writeFileSync, mkdirSync } from 'node:fs'
import { parseMcqFile, MCQ_FILES } from './parse-mcq.js'
import { parseTopics } from './parse-topics.js'
import { buildTeaching } from './parse-teaching.js'
import { validate } from './validate.js'

export function ping() {
  return 'pong'
}

const BANK_DIR = 'ap_csa/ap_csa_exam/question-bank'
const MATRIX = 'ap_csa/ap_csa_exam/topic-coverage-matrix.md'
const OUT = 'content'

export function compile() {
  const topics = parseTopics(readFileSync(MATRIX, 'utf8'))
  const items = MCQ_FILES.flatMap((f) =>
    parseMcqFile(readFileSync(`${BANK_DIR}/${f}`, 'utf8'), f),
  )
  const { errors, warnings } = validate(items, topics)
  const teaching = buildTeaching(topics, items)
  return { topics, items, teaching, errors, warnings }
}

function main() {
  const { topics, items, teaching, errors, warnings } = compile()

  console.log(`parsed ${items.length} items across ${MCQ_FILES.length} files`)
  console.log(`parsed ${topics.length} topics`)

  for (const w of warnings) console.warn(`WARN  ${w}`)
  if (teaching.gaps.length) {
    console.warn(
      `WARN  ${teaching.gaps.length} topic(s) lack teaching material: ${teaching.gaps.join(', ')}`,
    )
  }

  if (errors.length) {
    for (const e of errors) console.error(`ERROR ${e}`)
    console.error(`\nBuild FAILED with ${errors.length} error(s). Nothing written.`)
    process.exit(1)
  }

  mkdirSync(OUT, { recursive: true })
  writeFileSync(`${OUT}/items.json`, `${JSON.stringify(items, null, 2)}\n`)
  writeFileSync(`${OUT}/topics.json`, `${JSON.stringify(topics, null, 2)}\n`)
  writeFileSync(`${OUT}/teaching.json`, `${JSON.stringify(teaching.entries, null, 2)}\n`)
  console.log(`\nBuild OK. Wrote ${OUT}/items.json, topics.json, teaching.json`)
}

if (process.argv[1] && process.argv[1].endsWith('build.js')) main()
