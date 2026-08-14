// Guards the Actions schema against the two things ChatGPT rejected outright
// during the spike, and against drifting away from the router it describes.
//
// The rejections were real and undocumented in the builder UI:
//   "description has length 321 exceeding limit of 300"
//   "object schema missing properties"
// Both cost a round trip through the GPT editor to discover, so they are checked
// here instead.
//
// The second job of this file is the doc-vs-code contract. gpt-instructions.md is
// the LIVE tutor's conduct, and a false sentence in it reaches a fifteen-year-old
// with nothing in between: no runtime check can catch "a mean of 82%" written
// about the exam whose bar is 70. So the instructions are treated as an artefact
// under test — every field name they cite has to exist, every field the student
// must hear about has to be cited, and the per-subject thresholds may not be
// recited at all, because the server writes them from the config.

import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync, existsSync } from 'node:fs'
import { DatabaseSync } from 'node:sqlite'
import worker from '../src/index.js'
import { handleMockStart, handleMockSubmit, MIN_MOCK_COVERAGE, MOCK_TIME_SLACK } from '../src/api.js'
import { makeDb } from '../src/db.js'
import { grade, MODEL_GRADED, isServerGraded } from '../src/grade.js'
import { breakdown } from '../src/readiness.js'

const SPEC = JSON.parse(readFileSync(new URL('../openapi.json', import.meta.url), 'utf8'))
const ROUTER = readFileSync(new URL('../src/index.js', import.meta.url), 'utf8')
const API_SRC = readFileSync(new URL('../src/api.js', import.meta.url), 'utf8')
const INSTRUCTIONS = readFileSync(new URL('../gpt-instructions.md', import.meta.url), 'utf8')
const CSA = JSON.parse(readFileSync(new URL('../config/ap_csa.json', import.meta.url), 'utf8'))
const PRECALC = JSON.parse(readFileSync(new URL('../config/ap_precalc.json', import.meta.url), 'utf8'))

const DESCRIPTION_LIMIT = 300

// --- what is actually PASTED into the Custom GPT ------------------------------
//
// gpt-instructions.md is two documents in one file. Everything after the first
// `---` is the body that goes into the Instructions box; everything above it is
// instructions-for-Luyao that the model never sees, and the file says so about
// itself.
//
// Every check about what the MODEL is told therefore has to read the BODY. Reading
// the whole file looks equivalent and is not: a required field named only in the
// preamble satisfies a whole-file search and reaches the model never. That is not
// hypothetical — a length cut relocated the `proctored_mocks` caveat out of the
// body and up into the preamble, and no test noticed, because they all read
// `INSTRUCTIONS`.
const BODY_SEPARATOR = '\n---\n'

function pasteableBody(md) {
  const i = md.indexOf(BODY_SEPARATOR)
  if (i === -1) {
    throw new Error('gpt-instructions.md has no `---` separator, so the pasteable body cannot be identified')
  }
  return md.slice(i + BODY_SEPARATOR.length).replace(/^\n+/, '')
}

const BODY = pasteableBody(INSTRUCTIONS)

/**
 * The access key as COMMITTED, and its length as INSTALLED.
 *
 * These are different, and the difference is load-bearing: the repo commits a
 * placeholder and the GPT holds a real 32-character key (worker/DEPLOY.md), so the
 * text ChatGPT measures is longer than the text this file measures. KEY_LENGTH is
 * named rather than folded into a hardcoded deduction so that rotating to a longer
 * key WIDENS the deduction here instead of silently re-breaking the cap gate.
 */
const KEY_PLACEHOLDER = 'PASTE_STUDENT_KEY'
const KEY_LENGTH = 32

/** How long the pasted body is once the real key replaces every placeholder. */
function installedLength(body) {
  const substitutions = body.split(KEY_PLACEHOLDER).length - 1
  return body.length + substitutions * (KEY_LENGTH - KEY_PLACEHOLDER.length)
}

/** Walk every node, yielding [path, value] for each object. */
function* walk(node, path = '$') {
  if (node && typeof node === 'object') {
    yield [path, node]
    for (const [k, v] of Object.entries(node)) {
      yield* walk(v, `${path}.${k}`)
    }
  }
}

test('no description exceeds ChatGPT\'s 300-character limit', () => {
  const over = []
  const lengths = []
  for (const [path, node] of walk(SPEC)) {
    if (typeof node.description !== 'string') continue
    lengths.push([node.description.length, path])
    if (node.description.length > DESCRIPTION_LIMIT) {
      over.push(`${path} is ${node.description.length} chars`)
    }
  }
  // Printed, not asserted: a description one clause from the limit is not a defect,
  // but it is the thing that breaks next, and nothing else in the repo records how
  // close the tightest ones are running.
  const tightest = lengths.sort((a, b) => b[0] - a[0]).slice(0, 3)
  console.log(
    `descriptions closest to the ${DESCRIPTION_LIMIT}-character limit: ` +
      tightest.map(([n, p]) => `${p} (${n}, ${DESCRIPTION_LIMIT - n} spare)`).join('; '),
  )
  assert.deepEqual(over, [], `descriptions over ${DESCRIPTION_LIMIT}:\n${over.join('\n')}`)
})

/** A schema's declared types, as a list — 3.1 allows `type: ["string", "null"]`. */
function typesOf(schema) {
  if (!schema || schema.type === undefined) return []
  return Array.isArray(schema.type) ? schema.type : [schema.type]
}

test('every object schema declares properties', () => {
  const bare = []
  for (const [path, node] of walk(SPEC)) {
    // A nullable object still has to declare its properties, so this looks at
    // every declared type rather than only at `type: "object"`.
    //
    // The `additionalProperties` escape hatch is UNVERIFIED against the real
    // builder. What was observed live was the flat rejection "object schema
    // missing properties" on a node with neither; nothing has ever been pasted
    // into a GPT with `additionalProperties: true` and no `properties`, so
    // whether ChatGPT accepts that form is not known. No such node exists in the
    // schema today, and one should be proven on a throwaway GPT before it does.
    if (typesOf(node).includes('object') && !node.properties && !node.additionalProperties) {
      bare.push(path)
    }
  }
  assert.deepEqual(bare, [], `bare object schemas ChatGPT will reject:\n${bare.join('\n')}`)
})

test('every operation has an operationId, and they are unique', () => {
  const ids = []
  for (const [route, methods] of Object.entries(SPEC.paths)) {
    for (const [method, op] of Object.entries(methods)) {
      assert.ok(op.operationId, `${method.toUpperCase()} ${route} has no operationId`)
      ids.push(op.operationId)
    }
  }
  assert.equal(new Set(ids).size, ids.length, `duplicate operationIds: ${ids.join(', ')}`)
})

test('every operation is a GET, keeping the consent prompt to one Always-allow click', () => {
  for (const [route, methods] of Object.entries(SPEC.paths)) {
    assert.deepEqual(
      Object.keys(methods), ['get'],
      `${route} declares a non-GET method; only GET is verified against the consent flow`,
    )
  }
})

test('no operation declares a request body', () => {
  for (const [route, methods] of Object.entries(SPEC.paths)) {
    for (const op of Object.values(methods)) {
      assert.ok(!op.requestBody, `${route} declares a requestBody; the no-body design is deliberate`)
    }
  }
})

// --- drift checks against the actual router -------------------------------

test('every documented path is a real route in index.js', () => {
  for (const route of Object.keys(SPEC.paths)) {
    assert.ok(
      ROUTER.includes(`case '${route}':`),
      `openapi.json documents ${route} but index.js has no case for it`,
    )
  }
})

/**
 * Routes served by the Worker that are deliberately NOT Actions.
 * /health runs before auth; /dash is a parent-only HTML page opened in a browser,
 * not something the GPT should ever call.
 */
const NOT_ACTIONS = ['/health', '/dash']

test('every route in index.js is documented, except the deliberate non-Actions', () => {
  const cases = [...ROUTER.matchAll(/case '([^']+)':/g)].map((m) => m[1])
  const documented = new Set(Object.keys(SPEC.paths))
  for (const route of cases) {
    if (NOT_ACTIONS.includes(route)) continue
    assert.ok(documented.has(route), `index.js serves ${route} but openapi.json does not document it`)
  }
  assert.ok(ROUTER.includes("path === '/health'"))
  for (const route of NOT_ACTIONS) {
    assert.ok(!documented.has(route), `${route} must not be exposed as an Action`)
  }
})

test('the dashboard route is gated on the parent key', () => {
  const dash = ROUTER.slice(ROUTER.indexOf("case '/dash':"))
  assert.match(dash.slice(0, 400), /isParent/, 'the dashboard must check for the parent key')
})

test('every query parameter the schema declares is one the router actually reads', () => {
  const read = new Set([...ROUTER.matchAll(/searchParams\.get\('([^']+)'\)/g)].map((m) => m[1]))
  const resolve = (p) => (p.$ref ? SPEC.components.parameters[p.$ref.split('/').pop()] : p)

  for (const [route, methods] of Object.entries(SPEC.paths)) {
    for (const op of Object.values(methods)) {
      for (const raw of op.parameters ?? []) {
        const p = resolve(raw)
        assert.equal(p.in, 'query', `${route} declares a non-query parameter`)
        assert.ok(read.has(p.name), `${route} documents "${p.name}" but the router never reads it`)
      }
    }
  }
})

test('the key parameter is required on every operation', () => {
  const resolve = (p) => (p.$ref ? SPEC.components.parameters[p.$ref.split('/').pop()] : p)
  for (const [route, methods] of Object.entries(SPEC.paths)) {
    for (const op of Object.values(methods)) {
      const names = (op.parameters ?? []).map((p) => resolve(p)).filter((p) => p.required).map((p) => p.name)
      assert.ok(names.includes('k'), `${route} does not require the access key`)
    }
  }
})

// Named for what it checks, not for what it once checked: the deploy has happened,
// so the live hostname is now the expected value and the placeholder is the
// pre-deploy one. Both are accepted; what is refused is a non-https url and a
// malformed host.
test('servers[0].url is https and either the deploy placeholder or a plain hostname', () => {
  const url = SPEC.servers[0].url
  assert.match(url, /^https:\/\//, 'must be https')
  assert.ok(
    url.includes('REPLACE_AT_DEPLOY') || /^https:\/\/[a-z0-9-]+\.[a-z0-9.-]+$/.test(url),
    `server url looks malformed: ${url}`,
  )
})

test('every $ref resolves', () => {
  const missing = []
  for (const [path, node] of walk(SPEC)) {
    if (typeof node.$ref !== 'string') continue
    const parts = node.$ref.replace(/^#\//, '').split('/')
    let cur = SPEC
    for (const part of parts) cur = cur?.[part]
    if (cur === undefined) missing.push(`${path} -> ${node.$ref}`)
  }
  assert.deepEqual(missing, [], `unresolved refs:\n${missing.join('\n')}`)
})

test('the answer key is documented as post-answer only', () => {
  const log = SPEC.components.responses.Log.content['application/json'].schema
  assert.match(log.properties.keyed.description, /after the student has answered/i)
})

test('no parameter uses $ref — ChatGPT does not resolve them', () => {
  // Found live in the GPT builder, and undocumented: a $ref inside a parameters
  // array produces "parameter has missing or non-string name; skipping",
  // followed by "skipping function due to errors" — silently disabling every
  // operation. Parameters must be written inline even though the $ref is valid
  // OpenAPI and resolves correctly within the document.
  for (const [route, methods] of Object.entries(SPEC.paths)) {
    for (const [method, op] of Object.entries(methods)) {
      for (const p of op.parameters ?? []) {
        assert.ok(!p.$ref, `${method.toUpperCase()} ${route} uses a parameter $ref; inline it`)
        assert.equal(typeof p.name, 'string', `${route} has a parameter with no string name`)
      }
    }
  }
})

test('the shared parameters block is gone, so no one can reintroduce a ref', () => {
  assert.equal(SPEC.components.parameters, undefined)
})

// --- the instructions have to FIT in a Custom GPT ----------------------------
//
// ChatGPT caps a Custom GPT's Instructions field at 8000 characters and rejects
// the whole draft above it: the editor refuses to save, the Update button stays
// disabled, and the only visible symptom is `422` on an autosave request plus the
// line "GPT instructions cannot be longer than 8000 characters."
//
// Measured on 13 Aug 2026, and this file is the reason the gate exists: the body
// had grown to 13,292 characters — 66% over the cap — so it could not be pasted
// into the GPT AT ALL. A deploy therefore shipped a Worker whose behavioural
// contract could not be installed alongside it, and the GPT kept running the
// previous, much shorter instructions while the schema moved on. Silent drift
// between the two is exactly what the doc-vs-schema tests below exist to stop, so
// it is worth failing the build for.
//
// The cap applies to what is PASTED, which is the body after the human-facing
// preamble (everything up to and including the first `---`). The preamble is
// instructions-for-Luyao, never for the model.
//
// AND IT APPLIES TO THE TEXT AS INSTALLED, not as committed. This gate used to
// measure `body.length` with the 17-character `PASTE_STUDENT_KEY` placeholder in
// place and compare it against a flat 8000, while the GPT holds a real
// 32-character key: a 15-character understatement, in the direction that breaks
// the paste. A body measured at 7,995 passed and installed as 8,010 — ChatGPT
// 422s, the Update button stays disabled, and the only symptom is that the live
// tutor keeps running the previous instructions. The cap is therefore deducted
// from, per substitution, so a longer key makes the gate STRICTER on its own.
//
// (worker/DEPLOY.md rounds this to "~14 characters". It is 15: the placeholder is
// 17 long, not 18. The number is derived here rather than transcribed for exactly
// that reason.)
test('gpt-instructions.md fits the 8000-character Custom GPT limit as installed', () => {
  const CAP = 8000
  assert.ok(
    BODY.startsWith('You are'),
    `the body after the first \`---\` should be the text pasted into the GPT, but it starts: ${BODY.slice(0, 60)}`,
  )

  // Precondition, so the substitution cannot silently stop being measured: with
  // zero placeholders in the body this degrades to exactly the gate that was
  // wrong, and reports a pass it has not earned.
  const substitutions = BODY.split(KEY_PLACEHOLDER).length - 1
  assert.ok(
    substitutions >= 1,
    `the body no longer passes \`${KEY_PLACEHOLDER}\` to the GPT at all, so this gate is measuring the wrong text. ` +
      'Either the key moved (to an Actions Authentication header, say), in which case delete the deduction and this ' +
      'precondition together, or the body lost the access key and every call will 401.',
  )

  const installed = installedLength(BODY)
  const deduction = installed - BODY.length
  console.log(
    `gpt-instructions.md: body ${BODY.length} chars as committed, ${installed} as installed ` +
      `(+${deduction} over ${substitutions} key substitution(s)), ${CAP - installed} of real headroom`,
  )
  assert.ok(
    installed <= CAP,
    `the pasteable body measures ${BODY.length} characters here but installs as ${installed} once the real ` +
      `${KEY_LENGTH}-character key replaces \`${KEY_PLACEHOLDER}\` — over ChatGPT's ${CAP} limit by ` +
      `${installed - CAP}. ChatGPT will refuse to save the draft and the Update button stays disabled, so this ` +
      'cannot be installed. Cut it, or move reference material into the free preamble.',
  )
})

// --- gpt-instructions.md against the schema ----------------------------------
//
// The instructions are the GPT's conduct and the schema is its only contract, so
// a sentence about a field that does not exist is a live instruction to do
// something impossible, and a field the student must hear about that no sentence
// mentions is simply never surfaced. Both failed in production: `advisories` was
// described nowhere and read out never.

/** Every name the schema actually defines: fields, query parameters, enum values, operations. */
function schemaVocabulary() {
  // `null` and the booleans are values the instructions have to be able to name.
  const names = new Set(['null', 'true', 'false'])
  for (const [, node] of walk(SPEC)) {
    if (node.properties) for (const k of Object.keys(node.properties)) names.add(k)
    if (Array.isArray(node.enum)) for (const v of node.enum) if (typeof v === 'string') names.add(v)
    if (typeof node.operationId === 'string') names.add(node.operationId)
    if (node.in === 'query' && typeof node.name === 'string') names.add(node.name)
  }
  return names
}

/**
 * Identifiers the instructions quote in backticks.
 *
 * The convention the file states about itself: backticks are for a field, a query
 * parameter or an operation, and for nothing else. That is what makes this check
 * possible at all — prose in backticks would have to be allow-listed one phrase
 * at a time, and the allow-list is exactly where a stale field name would hide.
 */
function backtickedIdentifiers(md) {
  const found = new Set()
  for (const [, span] of md.matchAll(/`([^`\n]+)`/g)) {
    for (const token of span.split(/[^A-Za-z0-9_]+/)) {
      // Lower-camel or snake only: PASTE_STUDENT_KEY is a placeholder, not a field.
      if (/^[a-z][a-zA-Z0-9_]*$/.test(token)) found.add(token)
    }
  }
  return found
}

test('every field the instructions name in backticks exists in the schema', () => {
  const vocabulary = schemaVocabulary()
  const unknown = [...backtickedIdentifiers(INSTRUCTIONS)].filter((t) => !vocabulary.has(t)).sort()
  assert.deepEqual(
    unknown, [],
    `gpt-instructions.md tells the GPT to read fields the schema does not define: ${unknown.join(', ')}. ` +
      'Backticks in that file are for field, parameter and operation names only — quote anything else.',
  )
})

/**
 * Fields whose absence from the instructions means the student is never told.
 *
 * Each one carries a truth that no other field carries, so a GPT that has never
 * been told the field exists cannot recover it: `advisories` is the only place an
 * unscored sitting resurfaces, `basis` the only reason a mock did not count,
 * `what_100_means` the only per-subject statement of the standard.
 *
 * This list used to be exhaustive on the REASON fields and empty on the
 * ARITHMETIC ones, which is the wrong half to have covered in a project whose
 * founding failure was a number: a tutor told only `composite_pct` and `basis`
 * has to recover the divisor by parsing prose, which is the exact behaviour
 * `scored_out_of` was added to prevent. The arithmetic half is now named too, and
 * so are the three fields whose own schema descriptions are direct orders to the
 * model that nothing in the instructions was passing on.
 */
const MUST_BE_IN_THE_INSTRUCTIONS = [
  'advisories',        // an unscored proctored sitting, and the burnout guard
  'what_100_means',    // the standard, written per subject from the config
  'criteria',          // the full bar, and whether a check was measured at all
  'next_thing_blocking',
  'counted',           // whether a mock can move readiness
  'composite_pct',     // null on an unscored sitting — never a zero
  'scored_out_of',     // the divisor it was ACTUALLY taken over, and neither
                       // `answered` nor `expected`: a GPT doing the obvious
                       // arithmetic instead contradicts the server out loud
  'ungraded',          // "Say how many when reporting the score" — its own words
  'readiness_pct',     // the number the whole project exists to stop overstating
  'ready',             // "While this is false, never tell him he is ready"
  'proctored_mocks',   // scored sittings only, so an unscored one is missing
  'keyed',             // the right answer, revealed only after he has answered —
                       // nothing told the tutor to show it to him at all
  'basis',             // why it was, or was not, scored
  'timing',            // the section's real time budget, read aloud
  'rules',
  'graded',            // false means no verdict was reached
  'graded_by',         // which of the three no-verdict reasons applies
  'correct',           // null is not "wrong"
  'note',
  'explanation',
  'lesson_missing',    // a real gap with no written material
  'status',
]

test('every field the student depends on is named in the pasted body', () => {
  // Matched against the BACKTICKED names, not raw text: "correctly" contains
  // "correct" and "ungraded" contains "graded", so a substring search would pass
  // on prose that never tells the GPT the field exists.
  //
  // And matched against the BODY, not the file: the preamble is never pasted, so a
  // field named only up there is a field the model is never told about. See
  // pasteableBody — `proctored_mocks` reached exactly that state.
  const named = backtickedIdentifiers(BODY)
  const missing = MUST_BE_IN_THE_INSTRUCTIONS.filter((f) => !named.has(f))
  assert.deepEqual(
    missing, [],
    `the server sends these and the PASTED body of gpt-instructions.md never mentions them, so the student never ` +
      `hears them: ${missing.join(', ')}. Naming one in the preamble does not count — that text is not pasted.`,
  )
})

/**
 * Thresholds that differ between the two exams, and so may never be recited.
 *
 * The instructions used to state CSA's bar — a mean of 82%, no sitting below 78%,
 * every unit above 75% — as if it were the standard. Precalculus is judged at 70,
 * 65 and 65, so the GPT was stating a false standard for one of the two exams
 * every time it explained itself. handleStatus writes `what_100_means` from the
 * subject's own config; the instructions must send the model there instead.
 */
const PER_SUBJECT_THRESHOLDS = [
  'composite_mean_min', 'composite_floor_min', 'mcq_overall_min', 'per_unit_min',
  'dominant_practice_min', 'other_practice_min', 'no_calc_min', 'calc_min', 'frq_min_pct',
]

test('the instructions recite no per-subject threshold, because the two exams do not share them', () => {
  const recited = []
  for (const config of [CSA, PRECALC]) {
    for (const key of PER_SUBJECT_THRESHOLDS) {
      const value = config.readiness[key]
      if (value == null) continue
      if (new RegExp(`\\b${value}\\s*%`).test(INSTRUCTIONS)) {
        recited.push(`${value}% (${config.subject}.readiness.${key})`)
      }
    }
  }
  assert.deepEqual(
    recited, [],
    `gpt-instructions.md states a threshold the config owns: ${recited.join(', ')}. ` +
      'These differ per exam, so a recited number is false for the other one — have the GPT read what_100_means and criteria.',
  )
})

test('the summary status and the full report describe every shared field identically', () => {
  // Two copies exist because ChatGPT is only trusted to resolve the $refs already
  // shipped and proven in the builder; the copies are pinned to each other here
  // so the /status report can never describe `advisories` differently from the
  // summary attached to every other response.
  const summary = SPEC.components.schemas.Status.properties
  const report = SPEC.components.responses.Status.content['application/json'].schema.properties
  for (const [field, schema] of Object.entries(summary)) {
    assert.deepEqual(report[field], schema, `status.${field} is described differently in the two Status schemas`)
  }
  assert.deepEqual(
    Object.keys(report), [...Object.keys(summary), 'criteria', 'what_100_means'],
    'the full report is the summary plus criteria and what_100_means, in that order',
  )
})

// --- the schema against the bodies the router actually returns --------------
//
// The schema is the GPT's ONLY contract. Where it disagrees with the router the
// GPT acts on the schema, so a field the server can return as null but the
// schema types as a bare boolean is read as `false` — "you got it wrong". That
// is the regression commit ad61feb fixed in the router and never propagated
// here, so these tests drive the real handlers through the real router and
// compare every emitted field against what the schema promises.

const SEED = new URL('../seed.sql', import.meta.url)
const seeded = existsSync(SEED)
const withSeed = seeded ? test : test.skip
if (!seeded) console.warn('worker/seed.sql missing — run `npm run seed:sql` first; skipping router contract tests')

/** The subset of the D1 binding db.js uses, over node:sqlite. */
function d1(sqlite) {
  return {
    prepare(sql) {
      const stmt = sqlite.prepare(sql)
      let args = []
      const api = {
        bind(...a) {
          args = a.map((v) => (typeof v === 'boolean' ? (v ? 1 : 0) : v))
          return api
        },
        all: async () => ({ results: stmt.all(...args) }),
        first: async () => stmt.all(...args)[0] ?? null,
        run: async () => stmt.run(...args),
      }
      return api
    },
  }
}

const STUDENT_KEY = 'test-student-key'

/** A fixed server clock, for the serves these tests create directly. */
const NOW = '2027-03-01T12:00:00Z'

/**
 * Whether grade.js will mark this item mechanically — the grader's own rule
 * (MODEL_GRADED plus a usable key), applied to the row as the DATABASE holds it.
 *
 * Asked of the database on purpose. "The parser produced a key" and "the key
 * reached the item the Worker serves" are different claims, and only the second
 * one decides whether a right answer is marked right.
 */
const isKeyed = (row) => !MODEL_GRADED.has(row.kind) && String(row.answer ?? '').trim() !== ''

/** A Worker env with the real schema, the real seeded content, and real keys. */
function freshEnv() {
  const sqlite = new DatabaseSync(':memory:')
  sqlite.exec(readFileSync(SEED, 'utf8'))
  return { DB: d1(sqlite), STUDENT_KEY, PARENT_KEY: 'test-parent-key', sqlite }
}

/** Call the Worker exactly as Cloudflare does. Pass k: undefined to omit the key. */
async function call(env, path, params = {}) {
  const url = new URL(`https://ap-tutor.test${path}`)
  for (const [k, v] of Object.entries({ k: STUDENT_KEY, ...params })) {
    if (v !== undefined) url.searchParams.set(k, String(v))
  }
  const res = await worker.fetch(new Request(url), env)
  return { status: res.status, body: await res.json() }
}

const responseSchema = (name) => SPEC.components.responses[name].content['application/json'].schema

/** Follow $refs until a real schema node is reached. */
function deref(node) {
  let cur = node
  while (cur && typeof cur.$ref === 'string') {
    cur = cur.$ref.replace(/^#\//, '').split('/').reduce((o, part) => o?.[part], SPEC)
  }
  return cur ?? {}
}

const JS_TO_OPENAPI = { string: ['string'], boolean: ['boolean'], number: ['number', 'integer'] }

/**
 * Every disagreement between a real response body and the schema documenting it.
 * Only checks the direction that can mislead the GPT: something the server sent
 * that the schema does not describe, or describes as a different (non-null) type.
 */
function contractProblems(value, schema, where) {
  const s = deref(schema)
  const types = typesOf(s)

  if (value === null) {
    return types.includes('null') ? []
      : [`${where} is null in a real response but the schema declares ${JSON.stringify(s.type)}`]
  }
  if (Array.isArray(value)) {
    return value.flatMap((v, i) => contractProblems(v, s.items ?? {}, `${where}[${i}]`))
  }
  if (typeof value === 'object') {
    const problems = []
    for (const [k, v] of Object.entries(value)) {
      if (!s.properties?.[k]) {
        problems.push(`${where}.${k} is returned by the server but is not declared in the schema`)
        continue
      }
      problems.push(...contractProblems(v, s.properties[k], `${where}.${k}`))
    }
    return problems
  }
  if (!types.length) return []
  const want = JS_TO_OPENAPI[typeof value] ?? []
  if (!types.some((t) => want.includes(t))) {
    return [`${where} is ${typeof value} (${JSON.stringify(value)}) but declared ${JSON.stringify(s.type)}`]
  }
  if (types.includes('integer') && !types.includes('number') && !Number.isInteger(value)) {
    return [`${where} is ${value} but declared an integer`]
  }
  return []
}

/**
 * Drive the real router through every operation and both grading paths, and
 * return each 200 body tagged with the response schema that documents it.
 *
 * Shared by the tests below so the schema, the descriptions and the instructions
 * are all judged against the SAME real bodies rather than against three
 * hand-written fixtures that can each drift on their own.
 */
async function realResponses(env) {
  const seen = []
  /** Record one real 200 body against the response schema its operation advertises. */
  const record = (response, op, res, where) => {
    assert.equal(res.status, 200, `${where} did not succeed: ${JSON.stringify(res.body)}`)
    seen.push({ response, op, where, body: res.body })
    return res.body
  }

  // CSA: keyed multiple choice, graded mechanically. correct is a real boolean.
  const q = record('Next', 'getNext', await call(env, '/next', { s: 'ap_csa' }), 'getNext(ap_csa)')
  const logged = record('Log', 'logAnswer', await call(env, '/log', { s: 'ap_csa', v: q.serve, a: 'B' }), 'logAnswer(ap_csa)')
  assert.equal(logged.graded, true)

  // Precalc: 19 of the 48 items now carry answer keys and grade server-side; the
  // other 29 are model-graded. Both shapes are recorded, because both are real and
  // the schema has to survive each of them.
  //
  // RETIRED ASSERTIONS: `assert.equal(plogged.correct, null)` and
  // `assert.equal(plogged.graded, false)` on whatever /next happened to serve. They
  // held only because NO Precalc item had an answer key, so every Precalc answer was
  // ungraded by construction. Asserting that of an arbitrary served item now demands
  // that the keys not work. What replaces them: the served item is looked up in the
  // DATABASE and held to the shape its own kind requires, and then BOTH shapes are
  // provoked deliberately — a model-graded item for the nullable one the schema
  // needs, and a keyed one answered with its own key for the graded one.
  const pdb = makeDb(env.DB)
  const pq = record('Next', 'getNext', await call(env, '/next', { s: 'ap_precalc' }), 'getNext(ap_precalc)')
  const pserved = env.sqlite.prepare(
    `SELECT i.kind, i.answer FROM serves s JOIN items i ON i.id = s.item_id WHERE s.id = ?`,
  ).get(pq.serve)
  // Answered with the served item's OWN key when it has one, for the same reason as
  // the mock below: the literal this used to send ('3') is a right answer only for
  // whichever item selection happens to serve first, and an answer of the wrong
  // shape for an `mcq` is booked `unparsed` — which would make the keyed branch
  // below fail for a reason that has nothing to do with the schema.
  const pAnswer = isKeyed(pserved) ? pserved.answer : 'my working, in prose'
  const plogged = record('Log', 'logAnswer', await call(env, '/log', { s: 'ap_precalc', v: pq.serve, a: pAnswer }), 'logAnswer(ap_precalc)')
  if (isKeyed(pserved)) {
    assert.equal(plogged.graded, true, 'a keyed Precalc item must be graded, not routed to the model')
    assert.equal(typeof plogged.correct, 'boolean', 'and it must reach a real verdict')
    assert.equal(plogged.correct, true, 'and its own key must be marked RIGHT')
  } else {
    assert.equal(plogged.correct, null, 'the server must not claim a verdict it did not reach')
    assert.equal(plogged.graded, false)
  }

  // The UNGRADED shape, provoked rather than hoped for: correct:null, graded:false,
  // keyed:null, plus a note. This is the body that proves the schema declares those
  // fields nullable, so it may not depend on which item selection chose.
  const modelGraded = env.sqlite.prepare(
    `SELECT id FROM items WHERE subject = 'ap_precalc' AND kind = 'constructed_model_graded' LIMIT 1`,
  ).get()
  assert.ok(modelGraded, 'the bank must still hold model-graded Precalc work')
  const mgServe = await pdb.recordServe({ subject: 'ap_precalc', item_id: modelGraded.id, served_at: NOW })
  const ungraded = record(
    'Log', 'logAnswer',
    await call(env, '/log', { s: 'ap_precalc', v: mgServe, a: 'my working, in prose' }),
    'logAnswer(ap_precalc, model-graded)',
  )
  assert.equal(ungraded.correct, null, 'the nullable shape the schema has to survive')
  assert.equal(ungraded.graded, false)
  assert.ok(ungraded.note, 'the server explains that this was not mechanically graded')

  // THE GRADED shape, and the point of the whole keying exercise: a Precalc key
  // read back out of the DATABASE marks its own answer RIGHT, through the real
  // router. A key that survived the parser but not JSON and SQL escaping would mark
  // a correct answer wrong, silently, in front of him.
  const keyedItem = env.sqlite.prepare(
    `SELECT id, answer FROM items WHERE subject = 'ap_precalc'
       AND kind NOT IN ('frq', 'constructed_model_graded') AND trim(coalesce(answer, '')) <> '' LIMIT 1`,
  ).get()
  assert.ok(keyedItem, 'the seed must carry the keyed Precalc items, or none of the keying reached runtime')
  const keyedServe = await pdb.recordServe({ subject: 'ap_precalc', item_id: keyedItem.id, served_at: NOW })
  const gradedRight = record(
    'Log', 'logAnswer',
    await call(env, '/log', { s: 'ap_precalc', v: keyedServe, a: keyedItem.answer }),
    'logAnswer(ap_precalc, keyed)',
  )
  assert.equal(gradedRight.graded, true, `${keyedItem.id}: a keyed Precalc item must grade server-side`)
  assert.equal(
    gradedRight.correct, true,
    `${keyedItem.id}: the key as the database holds it (${JSON.stringify(keyedItem.answer)}) marked its own answer WRONG`,
  )

  record('Status', 'getStatus', await call(env, '/status', { s: 'ap_csa' }), 'getStatus')

  // A Precalc mock. It still cannot be COUNTED, and the reason is not that nothing
  // in it can be marked: it is that the bank cannot supply a full 42-question
  // multiple choice half or a 4-question free-response one, so the sitting can never
  // reach the coverage floor.
  //
  // RETIRED ASSERTION: `assert.equal(submitted.scored, 0, 'nothing in a Precalc
  // sitting can be graded mechanically')`. With 19 keyed items a Precalc sitting can
  // now contain graded answers, so `scored` is a function of what was served — and
  // it is derived from the served item here instead of being pinned at zero, while
  // `counted` and `composite_pct`, which are what actually reach him, stay pinned.
  //
  // RETIRED RESPONSE: the literal `'some work'`. That was written when a Precalc
  // sitting could only be served model-graded drills, for which any prose is a
  // legitimate answer. A section I paper is now served `mcq` items, and 'some work'
  // against a four-option key is correctly booked `unparsed` — the never-mark-a-
  // right-answer-wrong guarantee doing its job — so `scored` was 0 while `isKeyed`
  // said 1. The served item is therefore looked up BEFORE the answer is sent and
  // answered with its own key, as smoke.test.js already does. Sending a wrong-shaped
  // answer here would have quietly turned this into a test that a keyed mock
  // question is NOT scored.
  const mock = record('MockStart', 'startMock', await call(env, '/mock/start', { s: 'ap_precalc', sec: 'I', src: 'bank' }), 'startMock')
  const mq = await call(env, '/next', { s: 'ap_precalc', m: mock.mock })
  assert.equal(mq.body.type, 'question', `a Precalc sitting must be servable: ${JSON.stringify(mq.body)}`)
  const mockServed = env.sqlite.prepare(
    `SELECT i.kind, i.answer FROM serves s JOIN items i ON i.id = s.item_id WHERE s.id = ?`,
  ).get(mq.body.serve)
  const mockAnswer = isKeyed(mockServed) ? mockServed.answer : 'my working, in prose'
  const mockLogged = await call(env, '/log', { s: 'ap_precalc', v: mq.body.serve, a: mockAnswer })
  // The answer sent is the right one for the item served, so a keyed question inside
  // a mock has to reach a verdict — not be declined as unreadable.
  assert.equal(
    mockLogged.body.graded, isKeyed(mockServed),
    `a mock question of kind ${mockServed.kind} answered with ${JSON.stringify(mockAnswer)} must be graded exactly ` +
      'when it carries a key; anything else means the answer form and the grader disagree',
  )
  if (isKeyed(mockServed)) {
    assert.equal(mockLogged.body.correct, true, 'and its own key must be marked RIGHT, inside a mock as anywhere else')
  }
  const submitted = record('MockSubmit', 'submitMock', await call(env, '/mock/submit', { s: 'ap_precalc', m: mock.mock }), 'submitMock')
  assert.equal(
    submitted.scored, isKeyed(mockServed) ? 1 : 0,
    'a Precalc sitting scores exactly the answers whose items carry a key, and no others',
  )
  assert.equal(submitted.counted, false, 'and it still cannot count: neither half of its paper can be supplied')
  assert.equal(submitted.composite_pct, null, 'an uncounted sitting has no composite, and 0 is not one')

  // The teaching interrupt: two distinct misses on one topic returns a lesson
  // instead of a question, which is a different shape under the same schema —
  // and only then is there an open gap for markTaught to close out.
  const db = makeDb(env.DB)
  const topic = env.sqlite.prepare(
    `SELECT t.topic FROM teaching t JOIN items i ON i.subject = t.subject AND i.topic = t.topic
     WHERE t.subject = 'ap_csa' GROUP BY t.topic HAVING COUNT(DISTINCT i.id) >= 2 LIMIT 1`,
  ).get().topic
  const missable = env.sqlite.prepare(
    `SELECT id, unit, practice FROM items WHERE subject = 'ap_csa' AND topic = ? LIMIT 2`,
  ).all(topic)
  for (const item of missable) {
    await db.recordAttempt({
      ts: new Date().toISOString(), subject: 'ap_csa', item_id: item.id, topic,
      unit: item.unit, practice: item.practice, response: 'A', correct: 0, graded_by: 'server',
      seconds: 30, hints_used: 0, conditions: 'cold', mock_id: null,
    })
  }
  const lesson = record('Next', 'getNext', await call(env, '/next', { s: 'ap_csa' }), 'getNext(lesson)')
  assert.equal(lesson.type, 'lesson', 'two misses on one topic must interrupt with a lesson')
  record('Taught', 'markTaught', await call(env, '/taught', { s: 'ap_csa', t: topic }), 'markTaught')

  return seen
}

withSeed('every field the router returns is declared, and every null field is declared nullable', async () => {
  const problems = []
  for (const { response, where, body } of await realResponses(freshEnv())) {
    problems.push(...contractProblems(body, responseSchema(response), where))
  }
  assert.deepEqual(problems, [], `the GPT is told something the server does not do:\n${problems.join('\n')}`)
})

const hasText = (v) => typeof v === 'string' && v.trim() !== ''

/**
 * Every emitted field whose schema says nothing about what it means.
 *
 * A description is not decoration: it is the only place the GPT is told that a
 * null composite is "not scored" rather than zero, or that an advisory has to be
 * read aloud. `advisories` shipped as the one undescribed field in the whole
 * schema, and the GPT duly never mentioned it — the round-2 fix that made an
 * unscored sitting visible reached the student nowhere. So an emitted field with
 * no description is a defect, checked against real bodies so the requirement
 * lands on the fields that actually reach the model.
 */
function descriptionProblems(value, schema, where) {
  const s = deref(schema)
  const problems = hasText(s.description) ? [] : [where]
  if (Array.isArray(value)) {
    const items = deref(s.items ?? {})
    // Scalar entries carry the array's own description; object entries need theirs.
    for (const [i, v] of value.entries()) {
      if (v !== null && typeof v === 'object') problems.push(...descriptionProblems(v, items, `${where}[${i}]`))
    }
  } else if (value !== null && typeof value === 'object') {
    for (const [k, v] of Object.entries(value)) {
      if (s.properties?.[k]) problems.push(...descriptionProblems(v, s.properties[k], `${where}.${k}`))
    }
  }
  return problems
}

withSeed('every field the router returns carries a description the GPT can act on', async () => {
  const problems = []
  for (const { response, where, body } of await realResponses(freshEnv())) {
    problems.push(...descriptionProblems(body, responseSchema(response), where))
  }
  assert.deepEqual(problems, [], `fields the server sends with nothing said about them:\n${problems.join('\n')}`)
})

// The claim that made this test necessary: gpt-instructions.md said "Every
// response includes a `status` object", and handleMockStart returns none — while
// handleStatus returns the summary at the TOP level rather than nested. Both
// exceptions are now named in the instructions, and named exceptions rot, so the
// paragraph naming them is compared against what the handlers really send.
const STATUS_CLAIM = 'No nested `status`'

withSeed('the responses that carry no nested status are exactly the ones the instructions except', async () => {
  const at = BODY.indexOf(STATUS_CLAIM)
  assert.ok(at >= 0, `the pasted body no longer states which responses carry a status ("${STATUS_CLAIM}")`)
  const paragraph = BODY.slice(at).split('\n\n')[0]

  const operations = Object.values(SPEC.paths).flatMap((methods) => Object.values(methods)).map((op) => op.operationId)
  const claimed = operations.filter((op) => paragraph.includes(op)).sort()

  const responses = await realResponses(freshEnv())
  const without = [...new Set(responses.filter((r) => !('status' in r.body)).map((r) => r.op))].sort()

  assert.deepEqual(
    claimed, without,
    'gpt-instructions.md names these operations as returning no nested status summary, but the router disagrees. ' +
      'Whichever changed, both have to say the same thing: the GPT is told to show a status on every response.',
  )
})

// The same paragraph also enumerates what `startMock` DOES return, and that half
// was wrong: it said "reports only its `mock` id, `timing` and `rules`" while
// handleMockStart returns five fields. The two it omitted are not filler —
// `source`'s own description carries a fact the student needs ("Readiness needs an
// official sitting inside the judged window"), and both configs set
// require_official_mock, so a `bank` sitting can never satisfy that criterion
// however well it goes. A tutor never told to read the field cannot warn him.
//
// So the list is checked against the REAL handler's own keys rather than against a
// count typed in here: a sixth field added to handleMockStart fails this test
// until the sentence names it.
const STARTMOCK_CLAIM = '`startMock` reports only its'

test('the startMock exception names every field startMock actually returns', async () => {
  const at = BODY.indexOf(STARTMOCK_CLAIM)
  assert.ok(at >= 0, `the pasted body no longer enumerates what startMock returns ("${STARTMOCK_CLAIM}")`)
  const sentence = BODY.slice(at).split(/\n\n/)[0]

  const returned = Object.keys(await handleMockStart({
    db: { async startMock() { return 1 } },
    subject: 'ap_csa', section: 'I', source: 'bank', config: CSA, now: '2027-03-01T12:00:00Z',
  }))
  const named = backtickedIdentifiers(sentence)
  const unnamed = returned.filter((f) => !named.has(f))
  assert.deepEqual(
    unnamed, [],
    `handleMockStart returns ${returned.join(', ')} and the sentence enumerating them omits ${unnamed.join(', ')}, ` +
      'so the GPT is told a shorter response arrives than really does and never reads the rest.',
  )
})

test('the instructions warn that a bank sitting can never satisfy the official-mock criterion', () => {
  // Driven off the configs, not off a belief about them: while either exam
  // requires an official sitting, the body has to say a `bank` one cannot be it,
  // and while neither does, the body may not claim otherwise.
  const requiring = [CSA, PRECALC].filter((c) => c.readiness.require_official_mock).map((c) => c.subject)
  const named = backtickedIdentifiers(BODY)
  const warns = /`official`[^.]*`source`[^.]*`bank`|`bank`[^.]*never satisf/i.test(BODY)

  if (requiring.length) {
    assert.ok(
      named.has('official') && named.has('bank'),
      `${requiring.join(' and ')} require an official sitting, so the body has to name both \`official\` and ` +
        '`bank` — a real College Board paper logged as `bank` leaves readiness capped with no diagnostic',
    )
    assert.ok(
      warns,
      `${requiring.join(' and ')} set require_official_mock, so the body must tell him a \`source\` of \`bank\` can ` +
        'never satisfy it. Without that he sits mock after mock and readiness never moves.',
    )
  } else {
    assert.ok(
      !warns,
      'no config requires an official sitting any more, so the body must stop telling him a bank sitting cannot count',
    )
  }
})

// --- the answer keys, all the way through the database ----------------------
//
// THE WORST DEFECT THIS PROJECT CAN SHIP IS MARKING A RIGHT ANSWER WRONG. A key
// that survives the parser but not JSON and SQL escaping does exactly that: the
// grader compares what he typed against whatever landed in the `answer` column,
// and a mangled key marks him wrong silently, with no signal anywhere that the
// content and the verdict have come apart.
//
// Nothing exercised the Precalc keys against the seeded database before these
// tests. The parser tests stop at the item object, grade.js's own tests use
// fixtures and the shipped CSA bank, and the router tests asserted that a Precalc
// answer is never graded at all — which was true only while no Precalc item had a
// key, and is the assertion the keys retired. So the whole production path is
// driven here: seed.sql -> node:sqlite -> db.js -> the real router -> grade.js,
// on real content, with the responses a student would actually type.

/** Every Precalc item in the seed that grade.js will mark mechanically. */
function keyedPrecalc(sqlite) {
  return sqlite.prepare(
    `SELECT id, topic, unit, kind, answer, answer_variants_json FROM items
      WHERE subject = 'ap_precalc' AND kind NOT IN ('frq', 'constructed_model_graded')
        AND trim(coalesce(answer, '')) <> '' ORDER BY id`,
  ).all()
}

withSeed('every accepted form of a keyed Precalc answer is marked RIGHT by the key the database holds', async () => {
  const env = freshEnv()
  const db = makeDb(env.DB)
  const keyed = keyedPrecalc(env.sqlite)
  assert.ok(
    keyed.length >= 19,
    `the seed carries ${keyed.length} keyed Precalc item(s); the packs key 19, so anything less means the seed is ` +
      'stale and the keys have not reached runtime',
  )

  // Read back through db.js, not straight off the row, so the JSON columns are
  // parsed by the same code the Worker runs.
  const misses = []
  let forms = 0
  for (const row of keyed) {
    const item = await db.item(row.id)
    assert.equal(item.answer, row.answer, `${row.id}: db.js must hand the grader the stored key verbatim`)
    // The canonical key AND every alternate form the pack declares acceptable.
    // Exhaustive on purpose: the variants exist precisely because a student writes
    // "AROC = 3" and not "3", and each one is a separate chance to mark him wrong.
    for (const form of [item.answer, ...(item.answer_variants ?? [])]) {
      forms++
      const r = grade(item, form)
      if (!(r.graded_by === 'server' && r.correct === 1)) {
        misses.push(`${row.id}: ${JSON.stringify(form)} -> graded_by=${r.graded_by} correct=${r.correct}`)
      }
    }
  }
  assert.deepEqual(
    misses, [],
    `a form the content itself declares CORRECT was not credited against the key in the database — this is the ` +
      `false-negative defect, on real content:\n  ${misses.slice(0, 20).join('\n  ')}`,
  )
  assert.ok(forms > keyed.length, `precondition: the keys carry alternate forms (${forms} forms over ${keyed.length} items)`)
})

withSeed('a keyed Precalc item goes through the real router and lands as countable evidence', async () => {
  const env = freshEnv()
  const db = makeDb(env.DB)
  const keyed = new Map(keyedPrecalc(env.sqlite).map((r) => [r.id, r]))

  // Every one of them, served by handing the real /log a real serve — so the
  // assertion covers the whole keyed bank rather than whichever item the selector
  // happened to reach first.
  for (const [id, row] of keyed) {
    const serveId = await db.recordServe({ subject: 'ap_precalc', item_id: id, served_at: NOW })
    const res = await call(env, '/log', { s: 'ap_precalc', v: serveId, a: row.answer })
    assert.equal(res.status, 200, `${id}: /log failed: ${JSON.stringify(res.body)}`)
    assert.equal(res.body.graded, true, `${id}: a keyed item must be graded server-side, not routed to the model`)
    assert.equal(res.body.correct, true, `${id}: the stored key ${JSON.stringify(row.answer)} did not match itself`)
    assert.equal(res.body.graded_by, 'server', `${id}: graded_by must say who reached the verdict`)
  }

  // The stored evidence, which is the only thing any number is computed from.
  const rows = (await db.attempts('ap_precalc')).filter((a) => keyed.has(a.item_id))
  assert.equal(rows.length, keyed.size, 'every graded answer must be recorded as an attempt')
  for (const a of rows) {
    assert.equal(a.graded_by, 'server', `${a.item_id}: the attempt must be booked as a server verdict`)
    assert.equal(a.correct, 1, `${a.item_id}: a right answer must be recorded as right`)
    assert.ok(isServerGraded(a), `${a.item_id}: readiness must be able to count this attempt`)
    // The TASK-1 payoff, at runtime: a real CED topic, never a `<unit>.0` bucket.
    assert.match(a.topic, /^\d+\.\d+$/, `${a.item_id}: the attempt must carry a topic`)
    assert.doesNotMatch(a.topic, /\.0$/, `${a.item_id}: evidence must land on a real topic, not a placeholder bucket`)
    assert.ok(a.unit, `${a.item_id}: a NULL unit is invisible to every per-unit floor`)
  }

  // And therefore a TOPIC PERCENTAGE exists — the number that was unmeasurable at
  // any effort while every Precalc item was model-graded and bucketed at <unit>.0.
  const byTopic = breakdown(rows.filter(isServerGraded), 'topic')
  const topics = Object.keys(byTopic).sort()
  assert.ok(topics.length >= 10, `only ${topics.length} Precalc topic(s) can be measured: ${topics.join(', ')}`)
  for (const [topic, cell] of Object.entries(byTopic)) {
    assert.equal(cell.pct, 100, `${topic}: every answer given was the item's own key, so the topic must read 100%`)
    assert.ok(cell.n > 0)
  }
})

withSeed('the selector actually serves keyed Precalc items to the student', async () => {
  // The two tests above prove the key works when the item is put in front of him.
  // This proves the item IS put in front of him: /next is the only way he ever
  // receives one, and a keyed bank the selector never reaches measures nothing.
  const env = freshEnv()
  const db = makeDb(env.DB)
  const seen = { keyed: 0, model: 0 }

  for (let i = 0; i < 24; i++) {
    const q = await call(env, '/next', { s: 'ap_precalc' })
    assert.equal(q.status, 200, `/next failed: ${JSON.stringify(q.body)}`)
    if (q.body.type !== 'question') continue
    const item = await db.item((await db.serve(q.body.serve)).item_id)
    assert.ok(!('answer' in q.body), 'the /next payload must not leak the answer key')

    const keyed = isKeyed(item)
    const response = keyed ? item.answer : 'here is my working'
    const r = await call(env, '/log', { s: 'ap_precalc', v: q.body.serve, a: response })
    assert.equal(r.status, 200, `/log failed: ${JSON.stringify(r.body)}`)
    if (keyed) {
      seen.keyed++
      assert.equal(r.body.graded, true, `${item.id}: served by the selector and then not graded`)
      assert.equal(r.body.correct, true, `${item.id}: its own key was marked wrong after a real /next`)
    } else {
      seen.model++
      assert.equal(r.body.graded, false, `${item.id}: nothing may claim a verdict on model-graded work`)
      assert.equal(r.body.correct, null)
    }
  }

  assert.ok(seen.keyed > 0, `24 real drill turns served no keyed Precalc item at all (model-graded: ${seen.model})`)
  assert.ok(seen.model > 0, `precondition: the bank still holds model-graded Precalc work (keyed: ${seen.keyed})`)
})

// --- the instructions may not deny what the bank actually holds ---------------
//
// THE TEST THAT USED TO LIVE HERE FAILED SILENTLY FOR THE WHOLE LIFE OF THE DEFECT
// IT EXISTED TO CATCH, and that is the reason this one is shaped differently.
//
// It asserted the ABSENCE of one literal sentence — 'A Precalculus sitting drawn
// from this question bank is rubric-scored throughout' — whenever the bank held
// mechanically gradeable Precalc items. Commit c109802 landed the keyed Precalc
// content and, in the same commit, REWORDED the claim to "The Precalculus bank
// holds no multiple-choice and no free-response questions ... `counted` comes back
// false on it". From that moment the bank held 62 gradeable Precalc items, the
// instructions asserted the opposite in front of a fifteen-year-old, and this test
// PASSED — because it was looking for a sentence the file had stopped using.
//
// A guard that cannot fail is worse than no guard: it reports safety it is not
// providing. So the fact comes from the SEEDED DATABASE (what the student can
// actually be handed), the forbidden shape is a negation or universal quantifier
// governing what the bank can ask or mark rather than one spelling of it, and
// every wording that has actually shipped is kept below as a fixture that each
// pattern is REQUIRED to catch. A pattern that stops catching its fixtures fails
// this test rather than quietly matching nothing.

/**
 * Wordings of a false claim about the bank that have really been in this file.
 *
 * Not history for its own sake: these are the non-vacuity proof. Every pattern in
 * BANK_CLAIMS has to catch the fixtures it names, so the patterns cannot decay
 * into a set that matches nothing — which is precisely how the previous version of
 * this test came to pass on a false file.
 */
const SHIPPED_FALSE_CLAIMS = {
  // dd4c906..0a50e4f — the one literal the previous test looked for.
  'rubric-scored throughout':
    'A Precalculus sitting drawn from this question bank is rubric-scored throughout, so it can never produce a composite.',
  // c109802 — the reword that slipped past it, while the keys were landing.
  'holds no askable questions':
    'The Precalculus bank holds no multiple-choice and no free-response questions — so a Precalculus sitting cannot supply either half of the paper, and `counted` comes back false on it.',
  // Live until this round, in both places the unscored reasons are enumerated.
  'bank cannot supply the section':
    'nothing in it could be graded mechanically; the bank cannot supply that section at all (nothing re-sitting can fix).',
}

/**
 * A fact the shipped bank establishes, and the claim shape that contradicts it.
 *
 * `holds` is measured against the seeded database the Worker really serves from,
 * so the guard follows the content instead of the wording. `contradicted` is
 * matched per SENTENCE — a claim is made in a sentence, and that bounds the match
 * so it cannot bridge two unrelated ones. `instead` is the true statement the body
 * has to be making in its place; a required literal is safe in that direction,
 * because rewording it FAILS loudly rather than passing silently.
 */
const BANK_CLAIMS = [
  {
    fact: 'the Precalculus bank holds items grade.js marks mechanically',
    holds: (sqlite) => sqlite
      .prepare(`SELECT id, kind FROM items WHERE subject = 'ap_precalc'`)
      .all()
      .filter((r) => !MODEL_GRADED.has(r.kind))
      .map((r) => `${r.id} (${r.kind})`),
    // "Precalculus ... is rubric-scored throughout" / "the Precalculus bank holds
    // no <askable thing>" / "a Precalculus sitting can never be scored". The
    // negation has to govern what the BANK does, which is what keeps the body's
    // true "never assume a Precalculus answer went unmarked" — an order to the
    // model, not a claim about the content — out of it.
    contradicted: /precalc\w*[^.]*?(?:\brubric-scored throughout\b|\b(?:holds|has|contains|carries|keys)\s+(?:no|none|zero|not one)\b|\bcan\s?never\s+(?:be\s+)?(?:scored|graded|marked|produce)\b)/i,
    catches: ['rubric-scored throughout', 'holds no askable questions'],
    instead: 'Many Precalculus items now carry an answer key',
    because: 'a Precalculus section I sitting of 38 keyed answers comes back counted:true, composite_pct 90.5',
  },
  {
    fact: 'both banks hold free-response items, so section II can be ASKED',
    holds: (sqlite) => sqlite
      .prepare(`SELECT id, subject FROM items WHERE kind = 'frq' ORDER BY id`)
      .all()
      .map((r) => `${r.id} (${r.subject})`),
    // The label the body used to hang on the `unsupplied` unscored reason, in both
    // places it enumerates them. api.js says the opposite outright, and so does its
    // own basis text: the free-response questions EXIST and are "rubric-scored
    // rather than mechanically marked". A tutor paraphrasing "cannot supply" tells
    // him the bank has no free-response questions — false, and it can serve him one
    // as a drill next turn.
    contradicted: /\b(?:bank|it|this)\s+cannot\s+supply\b|\bcannot\s+supply\s+(?:that|the|this|either)\b|\b(?:bank|banks)\s+(?:holds|has|contains)\s+(?:no|zero|not one)\s+free[- ]response\b/i,
    catches: ['holds no askable questions', 'bank cannot supply the section'],
    instead: 'rubric-scored',
    because: "the server's own basis says they are rubric-scored rather than mechanically marked, not absent",
  },
]

/** The body's sentences, flattened — a claim is made in a sentence. */
const sentencesOf = (text) => text.replace(/\s+/g, ' ').split(/(?<=[.!?])\s+/)

test('every forbidden bank claim is a pattern that really catches the wordings that shipped', () => {
  // The non-vacuity half, run first and without the database: if a pattern stops
  // matching the sentence it was written for, it is no longer a guard, and this is
  // the failure the previous version of this test could not produce.
  for (const claim of BANK_CLAIMS) {
    for (const name of claim.catches) {
      const fixture = SHIPPED_FALSE_CLAIMS[name]
      assert.ok(fixture, `BANK_CLAIMS names a fixture "${name}" that SHIPPED_FALSE_CLAIMS does not define`)
      assert.match(
        fixture, claim.contradicted,
        `the pattern guarding "${claim.fact}" no longer catches the wording that actually shipped ("${name}"), so it ` +
          'guards nothing. This is the exact failure mode of the phrase-match it replaced.',
      )
    }
  }
  // And no pattern may be dead weight: every fixture has to be caught by someone.
  const covered = new Set(BANK_CLAIMS.flatMap((c) => c.catches))
  const orphans = Object.keys(SHIPPED_FALSE_CLAIMS).filter((n) => !covered.has(n))
  assert.deepEqual(orphans, [], `these false claims once shipped and nothing guards against them now: ${orphans}`)
})

withSeed('the instructions deny nothing the shipped bank actually holds', () => {
  const env = freshEnv()
  const sentences = sentencesOf(BODY)

  for (const claim of BANK_CLAIMS) {
    const holds = claim.holds(env.sqlite)
    const denials = sentences.filter((s) => claim.contradicted.test(s))

    if (holds.length) {
      assert.deepEqual(
        denials, [],
        `${holds.length} item(s) in the shipped bank establish that ${claim.fact} — ${claim.because} — and the ` +
          `PASTED body denies it:\n  ${denials.join('\n  ')}\nThe items: ${holds.slice(0, 8).join(', ')}` +
          `${holds.length > 8 ? `, +${holds.length - 8} more` : ''}`,
      )
      assert.ok(
        BODY.includes(claim.instead),
        `the bank establishes that ${claim.fact}, so the body has to SAY so — it no longer contains ` +
          `"${claim.instead}". Removing the true statement is the other half of this defect: he is then told ` +
          'nothing at all about it and the GPT falls back on whatever it assumes.',
      )
    } else {
      // The bank really can be emptied of these, and then the warning is the thing
      // that must be present: a real 42-question effort otherwise comes back "not
      // scored" with no reason he was ever given.
      assert.ok(
        denials.length,
        `nothing in the bank establishes that ${claim.fact} any more, so the body has to warn him BEFORE he sits one ` +
          'rather than staying silent about it',
      )
    }
  }
})

// --- the unscored-mock reasons the instructions enumerate, against the real branches --
//
// gpt-instructions.md used to say a sitting goes unscored for "either" of two
// reasons — too little of the section reached, or nothing gradeable — in both
// the advisories bullet and the mock-exam walkthrough (Q4-X1). handleMockSubmit
// then grew a THIRD, textually distinct branch: a sitting whose clock ran past
// MOCK_TIME_SLACK, or that spent too long on one item. Reproduced live: 40 of 42
// CSA answers, all correct, all reached, fully gradeable, spanning 245 minutes
// against a 90-minute budget — `counted:false` with a basis about the clock,
// matching neither reason the doc enumerated at the time.
//
// Commit 18add4f then added a FOURTH: a section the bank cannot supply at all
// (sec=II on a bank holding zero free-response items) also leaves a sitting
// recorded but unscored, through its own `supplied` guard and its own basis
// text (Q4-X5). The THIRD-branch fix above still passed after that commit only
// because none of its three scenarios happened to exercise section II — proof
// that a hardcoded scenario/marker count cannot catch the next branch either.
//
// So the count this test requires is no longer typed in by hand: it is read
// out of handleMockSubmit's own source, one entry per `if (...) { ...
// basis.push(` inside the `composite == null` block. If a fifth branch lands
// there without a matching marker, scenario and doc update, the comparison
// below fails immediately, rather than the doc quietly falling behind a third
// time.
function unscoredBranchCount(src) {
  const start = src.indexOf('if (composite == null) {')
  const end = src.indexOf('} else {', start)
  assert.ok(start >= 0 && end > start, "handleMockSubmit's unscored-reason block moved or was renamed; update this derivation")
  const block = src.slice(start, end)
  return [...block.matchAll(/if\s*\([^){]*\)\s*\{\s*basis\.push\(/g)].length
}

// Four scenarios are driven through the REAL handler, not strings invented
// here, so a future branch merge or rename breaks this test instead of leaving
// the doc quietly wrong again the way it did twice already. Matched against the
// server's own `basis` text.
const UNSCORED_BRANCH_MARKERS = {
  short: /short of the \d+% of the section/i,
  untimed: /run against a clock/i,
  ungraded: /graded mechanically/i,
  unsupplied: /cannot be scored from this question bank at all/i,
}

// The same four reasons, matched against gpt-instructions.md's own wording
// instead — a different audience (a fifteen-year-old, not the server's basis
// string), so the phrasing differs, but the SET has to be the same size as
// UNSCORED_BRANCH_MARKERS, enforced below.
//
// `unsupplied` used to read /bank\s+cannot\s+supply/i, which PINNED A FALSE LABEL
// IN PLACE: both banks hold free-response items (CSA 20, Precalc 4), so nothing is
// unsupplied — the server's own basis says the questions "are rubric-scored rather
// than mechanically marked". The marker now follows the server's word, and the
// supply framing is separately forbidden by BANK_CLAIMS above, which is what stops
// this from being a marker that merely moved.
const INSTRUCTIONS_REASON_MARKERS = {
  short: /reach(ed)?[^.]*section/i,
  untimed: /clock|too long|overran|ran past|slack/i,
  ungraded: /graded mechanically/i,
  unsupplied: /rubric-scored[^.]*\bmark/i,
}

test('the number of reasons api.js can leave a sitting unscored matches what this file checks for', () => {
  const found = unscoredBranchCount(API_SRC)
  assert.equal(
    found, Object.keys(UNSCORED_BRANCH_MARKERS).length,
    `handleMockSubmit now has ${found} branch(es) that leave a sitting unscored, but this file only names ` +
      `${Object.keys(UNSCORED_BRANCH_MARKERS).length} (${Object.keys(UNSCORED_BRANCH_MARKERS).join(', ')}). Add a ` +
      'marker here, a scenario below, and a matching update to gpt-instructions.md before this can pass again.',
  )
  assert.equal(
    Object.keys(INSTRUCTIONS_REASON_MARKERS).length, Object.keys(UNSCORED_BRANCH_MARKERS).length,
    'UNSCORED_BRANCH_MARKERS and INSTRUCTIONS_REASON_MARKERS must name the same set of reasons',
  )
})

withSeed('every real reason a mock sitting can go unscored is named in gpt-instructions.md', async () => {
  const env = freshEnv()
  const db = makeDb(env.DB)
  const now = '2027-03-01T12:00:00Z'
  const anyItemId = (await db.items('ap_csa'))[0].id
  const expected = CSA.exam.mcq_count // section I, this subject's own count
  const coveredCount = Math.ceil(expected * MIN_MOCK_COVERAGE)

  /** Log `n` mechanically-uniform attempts, evenly spanning `minutes`, under one fresh mock. */
  async function sit({ section = 'I', n, minutes, gradedBy }) {
    const mock = await db.startMock({ subject: 'ap_csa', section, started_at: now, proctored: 1, source: 'bank' })
    const start = new Date(now).getTime()
    for (let i = 0; i < n; i++) {
      const ts = new Date(start + (minutes * 60000 * i) / Math.max(n - 1, 1)).toISOString()
      await db.recordAttempt({
        ts, subject: 'ap_csa', item_id: anyItemId, topic: 'unit1', unit: '1', practice: 'P1',
        response: 'A', correct: 1, graded_by: gradedBy, seconds: 5, hints_used: 0,
        conditions: 'proctored_mock', mock_id: mock,
      })
    }
    const submitted = await handleMockSubmit({ db, mockId: mock, config: CSA, now })
    assert.equal(submitted.counted, false, `scenario should be unscored: ${JSON.stringify(submitted)}`)
    return submitted.basis
  }

  // Under coverage, fast: only the "short" branch can fire.
  const short = await sit({ n: Math.max(1, coveredCount - 1), minutes: 5, gradedBy: 'server' })
  // Covers the section, but the sitting's clock ran past MOCK_TIME_SLACK.
  const untimed = await sit({ n: coveredCount + 2, minutes: CSA.exam.mcq_minutes * MOCK_TIME_SLACK + 20, gradedBy: 'server' })
  // Covers the WHOLE section inside budget, but nothing on the paper was mechanically graded.
  const ungraded = await sit({ n: expected, minutes: 5, gradedBy: 'model' })
  // Section II: the CSA bank holds zero free-response items, so this section can
  // never be scored at all, whatever it answers or how fast (Q4-X5).
  const unsupplied = await sit({ section: 'II', n: 1, minutes: 5, gradedBy: 'server' })

  const bases = { short, untimed, ungraded, unsupplied }
  for (const [name, text] of Object.entries(bases)) {
    for (const [branch, marker] of Object.entries(UNSCORED_BRANCH_MARKERS)) {
      assert.equal(
        marker.test(text), branch === name,
        `the "${name}" scenario's basis ${marker.test(text) ? 'unexpectedly matches' : 'should match'} ` +
          `the "${branch}" branch:\n${text}`,
      )
    }
  }

  // Four real, pairwise-distinct reasons exist today. Both places the PASTED body
  // enumerates them have to name all four, not fewer — read from the body, because
  // a reason named only in the preamble is a reason the model never hears.
  for (const [where, needle] of [
    ['the advisories bullet', 'A proctored sitting was recorded but not scored.'],
    ['the mock-exam walkthrough', '**If `counted` is false:**'],
  ]) {
    const at = BODY.indexOf(needle)
    assert.ok(at >= 0, `the pasted body no longer has ${where} ("${needle}")`)
    const rest = BODY.slice(at + 1)
    const end = rest.search(/\n- \*\*|\n\n/)
    const paragraph = end === -1 ? rest : rest.slice(0, end)

    for (const [name, marker] of Object.entries(INSTRUCTIONS_REASON_MARKERS)) {
      assert.match(paragraph, marker, `${where} must name the "${name}" reason`)
    }
  }
})

// --- the divisor composite_pct was actually taken over (Q4-A6) ---------------
//
// `expected` is the REAL section's size, and the composite is not divided by it:
// it is divided by the questions this bank can both ask and mark, less the
// answers that still need model grading. So a full CSA sitting reports
// answered:42, expected:46, composite_pct:100 — and a GPT doing the obvious
// arithmetic ("42 of 46, yet 100%?") either contradicts the server or reports a
// correct score with a false caveat. The true divisor used to appear ONLY inside
// the `basis` prose, so the model had to parse a sentence to recover a number it
// should simply be handed. `scored_out_of` is that number.
//
// What is pinned here is the IDENTITY, not the field's presence: a divisor that
// disagrees with composite_pct would be worse than no divisor at all. Driven
// through the real handler over the real schema and the real seeded bank, on
// every section shape both configs offer.

/** Any real item of this subject, to hang the sitting's attempts on. */
const anyItem = (sqlite, subject) =>
  sqlite.prepare(`SELECT id, topic, unit, practice FROM items WHERE subject = ? LIMIT 1`).get(subject)

/**
 * Sit one proctored mock and submit it through the real handler.
 *
 * `ungraded` answers are filed as model-graded (no verdict), and `right` of the
 * remaining server-graded ones are correct — which is what lets the divisor be
 * driven away from `answered`, from `scored` and from `expected` all at once.
 *
 * A model-graded row stores `correct: 0`, which is what grade.js really writes
 * for rubric-scored work: the column is NOT NULL, and the zero is inert because
 * every reader filters on graded_by first.
 */
async function sitAndSubmit(env, { subject, section, config, n, right = 0, ungraded = 0, minutes = 5 }) {
  const db = makeDb(env.DB)
  const now = '2027-03-01T12:00:00Z'
  const item = anyItem(env.sqlite, subject)
  const mock = await db.startMock({ subject, section, started_at: now, proctored: 1, source: 'bank' })
  const start = new Date(now).getTime()
  for (let i = 0; i < n; i++) {
    const model = i < ungraded
    await db.recordAttempt({
      ts: new Date(start + (minutes * 60000 * i) / Math.max(n - 1, 1)).toISOString(),
      subject, item_id: item.id, topic: item.topic, unit: item.unit, practice: item.practice,
      response: 'A', correct: model ? 0 : (i - ungraded < right ? 1 : 0),
      graded_by: model ? 'model' : 'server', seconds: 5, hints_used: 0,
      conditions: 'proctored_mock', mock_id: mock,
    })
  }
  const body = await handleMockSubmit({ db, mockId: mock, config, now })
  // `right` read back out of the database rather than trusted from the loop
  // above, so the identity is checked against the stored evidence.
  const scoredRight = env.sqlite
    .prepare(`SELECT count(*) n FROM attempts WHERE mock_id = ? AND graded_by = 'server' AND correct = 1`)
    .get(mock).n
  return { body, right: scoredRight }
}

/** The divisor and the right-answer count the handler states in its own prose. */
const basisArithmetic = (basis) => /Scored (\d+) right out of (\d+)/.exec(basis)

/**
 * How many of the section this bank can ask AND mark, read back out of the real
 * basis text — so the printed table reports the handler's own number rather than
 * a second copy of sectionScoring's arithmetic that could drift from it.
 */
function scorableFrom(body) {
  const measured = /measured over the (\d+) question\(s\) of the (\d+)/.exec(body.basis)
  if (measured) return Number(measured[1])
  if (/cannot be scored from this question bank at all/.test(body.basis)) return 0
  return body.expected
}

// Every section shape both configs offer, plus the mixes that pull the divisor
// away from every other number in the response. `scored_out_of === expected`
// would pass on some of these and fail on the CSA `full` rows; `=== answered`
// and `=== scored` each fail on the 40-answer rows.
const DIVISOR_SCENARIOS = [
  { what: 'CSA I, whole section, all marked', subject: 'ap_csa', section: 'I', config: CSA, n: 42, right: 40 },
  { what: 'CSA I, four answers need model grading', subject: 'ap_csa', section: 'I', config: CSA, n: 42, right: 36, ungraded: 4 },
  { what: 'CSA I, under coverage', subject: 'ap_csa', section: 'I', config: CSA, n: 10, right: 10 },
  { what: 'CSA I, past the clock', subject: 'ap_csa', section: 'I', config: CSA, n: 42, right: 42, minutes: CSA.exam.mcq_minutes * MOCK_TIME_SLACK + 20 },
  { what: 'CSA II, bank holds no free response', subject: 'ap_csa', section: 'II', config: CSA, n: 4, right: 4 },
  { what: 'CSA full, 42 of the 46 askable', subject: 'ap_csa', section: 'full', config: CSA, n: 42, right: 40 },
  { what: 'CSA full, two never reached', subject: 'ap_csa', section: 'full', config: CSA, n: 40, right: 38 },
  { what: 'CSA full, two unreached and four unmarked', subject: 'ap_csa', section: 'full', config: CSA, n: 40, right: 34, ungraded: 4 },
  { what: 'Precalc I, bank supplies no multiple choice', subject: 'ap_precalc', section: 'I', config: PRECALC, n: 42, right: 0 },
  { what: 'Precalc II, bank supplies no free response', subject: 'ap_precalc', section: 'II', config: PRECALC, n: 4, right: 0 },
  { what: 'Precalc full, neither half scorable', subject: 'ap_precalc', section: 'full', config: PRECALC, n: 42, right: 0 },
]

withSeed('composite_pct is exactly right over scored_out_of, on every section shape both configs offer', async () => {
  const rows = []
  let differsFromExpected = 0

  for (const scenario of DIVISOR_SCENARIOS) {
    const { body, right } = await sitAndSubmit(freshEnv(), scenario)
    const arithmetic = basisArithmetic(body.basis)
    rows.push({
      shape: `${scenario.subject} ${scenario.section}`,
      what: scenario.what,
      answered: body.answered,
      expected: body.expected,
      scorable: scorableFrom(body),
      denominator: arithmetic ? Number(arithmetic[2]) : null,
      right,
      composite_pct: body.composite_pct,
      scored_out_of: body.scored_out_of,
    })

    const where = `${scenario.what}: ${JSON.stringify(body)}`

    // Null exactly when there is no composite — never 0, which would read as
    // "divided by nothing" and never as "there was no division".
    assert.equal(
      body.scored_out_of == null, body.composite_pct == null,
      `scored_out_of and composite_pct must be null together — ${where}`,
    )
    if (body.composite_pct == null) {
      assert.equal(body.scored_out_of, null, `an unscored sitting has no divisor — ${where}`)
      continue
    }

    assert.ok(Number.isInteger(body.scored_out_of), `a question count is a whole number — ${where}`)
    assert.ok(body.scored_out_of > 0, `a composite divided by ${body.scored_out_of} could not exist — ${where}`)
    assert.ok(body.right === undefined, 'right is not part of the contract; it is derived from the evidence')

    // THE identity. Rounded to the one decimal the response carries, and to
    // nothing else: the divisor has to reproduce the number the GPT was given.
    assert.equal(
      Number(((right / body.scored_out_of) * 100).toFixed(1)), body.composite_pct,
      `${right} right / ${body.scored_out_of} does not give composite_pct ${body.composite_pct} — ${where}`,
    )

    // The prose and the field cannot tell the student two different stories,
    // which is the whole reason the field exists.
    assert.ok(arithmetic, `a scored sitting states its arithmetic in basis — ${where}`)
    assert.equal(Number(arithmetic[2]), body.scored_out_of, `basis divides by a different number — ${where}`)
    assert.equal(Number(arithmetic[1]), right, `basis counts a different number right — ${where}`)

    if (body.scored_out_of !== body.expected) differsFromExpected++

    // And the schema has to describe the value the server just sent.
    assert.deepEqual(
      contractProblems(body, responseSchema('MockSubmit'), scenario.what), [],
      `the GPT is told something the server does not do — ${where}`,
    )
  }

  console.log(`\nQ4-A6 — the composite's real divisor, per section shape:`)
  console.table(rows)

  assert.ok(
    differsFromExpected > 0,
    'no scenario exercised a divisor that differs from `expected`, so this test cannot tell the new field from the ' +
      'old one. The CSA `full` rows are supposed to: 46 expected, 42 askable.',
  )
})

test('scored_out_of is declared nullable, because an unscored sitting has no divisor', () => {
  const field = responseSchema('MockSubmit').properties.scored_out_of
  assert.ok(field, 'handleMockSubmit returns scored_out_of, so the schema has to declare it')
  assert.deepEqual(
    typesOf(field).slice().sort(), ['integer', 'null'],
    'typed as a bare integer, a null divisor is read as 0 — the same misreading composite_pct was fixed for',
  )
  assert.match(
    field.description, /null/i,
    'the description is the only place the GPT is told what an absent divisor means',
  )
})

withSeed('every lesson field the bank can leave empty is declared nullable', () => {
  // buildLesson serves a PARTIALLY filled teaching row from whatever fields it
  // has, and the bank ships rows with no common_mistake (CSA's source names no
  // genuine one) and rows with no plain_idea or worked_example. Typed as a bare
  // string, the GPT is told those always arrive — and gpt-instructions.md has it
  // present all three, so the missing one gets filled in from memory. Unverified
  // remediation is exactly what this system exists not to produce.
  const env = freshEnv()
  const lesson = SPEC.components.schemas.Lesson.properties
  const anyContent = `(COALESCE(plain_idea, '') <> '' OR COALESCE(worked_example, '') <> '' OR COALESCE(common_mistake, '') <> '')`
  for (const field of ['plain_idea', 'worked_example', 'common_mistake']) {
    // Mirrors buildLesson's own rule: a row with nothing in it is not a lesson at
    // all, so only rows that DO ship count as evidence that the field can be null.
    const { n } = env.sqlite
      .prepare(`SELECT count(*) n FROM teaching WHERE COALESCE(${field}, '') = '' AND ${anyContent}`)
      .get()
    if (!n) continue
    assert.ok(
      typesOf(lesson[field]).includes('null'),
      `${n} teaching rows ship a lesson with no ${field}, so the schema must declare it nullable`,
    )
    assert.match(
      lesson[field].description, /null/i,
      `${field} can arrive null, so its description has to tell the GPT what to do then — not invent one`,
    )
  }
})

// --- the router's own input validation --------------------------------------

withSeed('/log and /mock/submit refuse a missing or misspelled subject rather than defaulting to CSA', async () => {
  const env = freshEnv()
  const q = await call(env, '/next', { s: 'ap_precalc' })

  // Before this was fixed, `CONFIGS[subject] ?? CSA` answered a Precalc serve
  // with the CSA config: wrong exam date, wrong goal, and readiness judged
  // against CSA's much higher thresholds.
  const noSubject = await call(env, '/log', { v: q.body.serve, a: '3' })
  assert.equal(noSubject.status, 400, `s is required; got ${JSON.stringify(noSubject.body)}`)
  assert.match(noSubject.body.error, /s must be one of/)

  const typo = await call(env, '/log', { s: 'ap_precalculus', v: q.body.serve, a: '3' })
  assert.equal(typo.status, 400, 'a misspelled subject must not be silently substituted')

  const submitNoSubject = await call(env, '/mock/submit', { m: 1 })
  assert.equal(submitNoSubject.status, 400, `s is required; got ${JSON.stringify(submitNoSubject.body)}`)

  // And the honest path still reports the subject that was actually asked for.
  const ok = await call(env, '/log', { s: 'ap_precalc', v: q.body.serve, a: '3' })
  assert.equal(ok.status, 200)
  assert.equal(ok.body.status.subject, PRECALC.display_name)
  assert.equal(ok.body.status.exam_date, PRECALC.exam_date)
})

withSeed('/mock/start requires the section and the source it declares as required', async () => {
  const env = freshEnv()
  const noSection = await call(env, '/mock/start', { s: 'ap_csa', src: 'official' })
  assert.equal(noSection.status, 400, `sec is required; got ${JSON.stringify(noSection.body)}`)

  // A real College Board sitting stored as 'bank' can never satisfy
  // require_official_mock, so readiness stays capped with no diagnostic.
  const noSource = await call(env, '/mock/start', { s: 'ap_csa', sec: 'I' })
  assert.equal(noSource.status, 400, `src is required; got ${JSON.stringify(noSource.body)}`)

  const both = await call(env, '/mock/start', { s: 'ap_csa', sec: 'I', src: 'official' })
  assert.equal(both.status, 200, JSON.stringify(both.body))
})

withSeed('/next validates the mock id instead of binding NaN or zero', async () => {
  const env = freshEnv()

  const notANumber = await call(env, '/next', { s: 'ap_csa', m: 'abc' })
  assert.equal(notANumber.status, 400, `a client error must not surface as a 500: ${JSON.stringify(notANumber.body)}`)
  assert.doesNotMatch(notANumber.body.error, /server error/, 'no driver internals for a bad parameter')

  // m=0 bound successfully and recorded the whole sitting as conditions:'cold'
  // with mock_id 0, then /mock/submit 400'd — the proctored evidence was gone.
  const zero = await call(env, '/next', { s: 'ap_csa', m: '0' })
  assert.equal(zero.status, 400, `mock ids start at 1; got ${JSON.stringify(zero.body)}`)

  // An absent mock id is a normal cold question, and ChatGPT is free to send an
  // empty parameter for "not in a mock" — neither is an error.
  assert.equal((await call(env, '/next', { s: 'ap_csa' })).status, 200)
  assert.equal((await call(env, '/next', { s: 'ap_csa', m: '' })).status, 200)

  const mock = await call(env, '/mock/start', { s: 'ap_csa', sec: 'I', src: 'bank' })
  const inMock = await call(env, '/next', { s: 'ap_csa', m: mock.body.mock })
  assert.equal(inMock.status, 200)
})

withSeed('an unauthenticated call gets 401 before it reaches the database', async () => {
  const env = freshEnv()
  const anonymous = await call(env, '/next', { s: 'ap_csa', k: undefined })
  assert.equal(anonymous.status, 401)
  const wrong = await call(env, '/next', { s: 'ap_csa', k: 'not-the-key' })
  assert.equal(wrong.status, 401)
})

// --- mock timing, which the GPT reads aloud as the student's time limit -----
//
// gpt-instructions.md has the GPT announce this number, so an understated
// budget stops the student at half time, blanks the rest of the paper, and the
// depressed composite feeds the only number that moves readiness.
//
// These are the published College Board budgets, written out rather than
// recomputed from the config, so the test pins reality and not the code:
//   AP CSA        90 min MCQ + 90 min FRQ = 180
//   AP Precalc    65 + 40 = 105 MCQ, 35 + 35 = 70 FRQ = 175
const EXAM_MINUTES = {
  ap_csa: { I: 90, II: 90, full: 180 },
  ap_precalc: { I: 105, II: 70, full: 175 },
}

const SUBJECTS = { ap_csa: CSA, ap_precalc: PRECALC }
const timingDb = { async startMock() { return 1 } }

async function minutesFor(subject, section) {
  const r = await handleMockStart({
    db: timingDb, subject, section, source: 'bank',
    config: SUBJECTS[subject], now: '2027-03-01T12:00:00Z',
  })
  const m = /^(\d+) minutes$/.exec(r.timing)
  assert.ok(m, `timing must be a plain minute count the GPT can read aloud, got ${JSON.stringify(r.timing)}`)
  return Number(m[1])
}

test('every section the schema offers is a section the timing table covers', () => {
  const sec = SPEC.paths['/mock/start'].get.parameters.find((p) => p.name === 'sec')
  assert.deepEqual(sec.schema.enum, Object.keys(EXAM_MINUTES.ap_csa))
  assert.deepEqual(Object.keys(EXAM_MINUTES.ap_precalc), Object.keys(EXAM_MINUTES.ap_csa))
})

test('a single-section mock reports that section\'s real budget', async () => {
  for (const subject of Object.keys(SUBJECTS)) {
    for (const section of ['I', 'II']) {
      assert.equal(
        await minutesFor(subject, section), EXAM_MINUTES[subject][section],
        `${subject} section ${section} timing`,
      )
    }
  }
})

// Fixed by commit 143ac30: handleMockStart used to compute timing as
// `section === 'II' ? frq : mcq`, so the 'full' the schema advertises fell to
// the MCQ branch — 90 minutes for CSA instead of 180, 105 for Precalc instead
// of 175. sectionMinutes in src/api.js now returns `mcq + frq` for 'full'.
test('a full sitting reports both section budgets', async () => {
  for (const subject of Object.keys(SUBJECTS)) {
    assert.equal(await minutesFor(subject, 'full'), EXAM_MINUTES[subject].full, `${subject} full sitting timing`)
  }
})

// --- the answer form the instructions ask for, against the real grader --------
//
// The instructions used to tell the GPT to "ask him for a single letter" after an
// unparsed answer. On the shipped items where one option's TEXT is a single
// letter, a bare letter is precisely the ambiguous form the grader declines: 'B'
// can mean the option labelled B or the option whose text reads B, and grade.js
// refuses to guess rather than mark a right answer wrong. So the instruction
// prescribed the one shape that cannot work, on exactly the items that need it.
//
// The form the instructions now teach is checked against the grader itself, on
// every colliding item the seed actually contains.
const MARKED_FORM = (letter) => `choice ${letter}`

/** Items where a bare letter is genuinely ambiguous, drawn from a set of items. */
function letterCollisions(rows) {
  const out = []
  for (const row of rows) {
    let options
    try { options = typeof row.options_json === 'string' ? JSON.parse(row.options_json) : row.options } catch { continue }
    if (!options || typeof options !== 'object') continue
    const labels = new Set(Object.keys(options).map((l) => l.toUpperCase()))
    for (const [label, text] of Object.entries(options)) {
      if (typeof text !== 'string') continue
      const asLetter = text.trim().toUpperCase()
      // A collision needs the text to name a letter that is a real label on this
      // item, and a DIFFERENT one from the option's own label. 'e' as the text of
      // option D on a four-option item names nothing, so it is not ambiguous.
      if (!/^[A-E]$/.test(asLetter)) continue
      if (!labels.has(asLetter) || asLetter === label.toUpperCase()) continue
      out.push({ item: { kind: row.kind, answer: row.answer, options }, id: row.id, letter: asLetter })
    }
  }
  return out
}

/**
 * A synthetic item that IS ambiguous: option C's text reads "B", so a bare "B"
 * names two different options on the same question.
 *
 * The shipped bank used to contain three of these (csa-ac-q14, csa-ac-q33,
 * csa-u2-q7) and this test drew its fixtures from them. The content has since been
 * fixed — those items' options were reordered so every letter-text sits on its own
 * label — which is a better bank and a WORSE fixture, because it left the grader's
 * refusal proved only by content that no longer exists.
 *
 * So the grader's contract is proved here instead, on an item that cannot be fixed
 * out from under it, and the bank is separately swept for a relapse below.
 */
const AMBIGUOUS = {
  kind: 'mcq',
  answer: 'C',
  options: { A: 'A four-element array', B: 'An index out of bounds', C: 'B', D: 'Nothing.' },
}

withSeed('the answer form the instructions ask for is the one the grader can actually read', () => {
  const env = freshEnv()

  // RETIRED PRECONDITION: `assert.ok(collisions.length, 'no shipped item collides a
  // bare letter with an option label any more...')`, over the shipped bank.
  //
  // Its own message asked for exactly this: the bank really has stopped containing
  // the case, so the paragraph is revisited rather than the test deleted. The
  // grader's two obligations are now proved on a fixture that is ambiguous BY
  // CONSTRUCTION, so no content fix can take the proof away, and the sweep over the
  // shipped bank is kept as a relapse guard: if a colliding item ever comes back,
  // the grader must still decline the bare letter rather than guess. Both directions
  // stay pinned, and neither depends on the bank staying broken.
  const fixtures = letterCollisions([{ ...AMBIGUOUS, id: 'FIXTURE(ambiguous by construction)' }])
  assert.equal(
    fixtures.length, 1,
    'precondition: the fixture must be genuinely ambiguous, or this test proves nothing about the grader',
  )
  const shipped = letterCollisions(
    env.sqlite.prepare(`SELECT id, kind, answer, options_json FROM items WHERE options_json IS NOT NULL`).all(),
  )

  for (const { item, id, letter } of [...fixtures, ...shipped]) {
    // The shape that fails, and why the instruction to send "just the letter" was wrong.
    assert.equal(
      grade(item, letter).graded_by, 'unparsed',
      `${id}: a bare "${letter}" is ambiguous here, so the grader must decline it rather than score it`,
    )
    // The shape gpt-instructions.md prescribes instead.
    const marked = grade(item, MARKED_FORM(letter))
    assert.equal(
      marked.graded_by, 'server',
      `${id}: gpt-instructions.md tells him to write "${MARKED_FORM(letter)}", and the grader did not read it`,
    )
    assert.equal(marked.picked, letter, `${id}: "${MARKED_FORM(letter)}" must resolve to ${letter}`)
  }

  // And the instructions have to be teaching that exact form, not some other one —
  // in the PASTED body, since a form taught only in the preamble is taught to nobody.
  assert.ok(
    BODY.includes(`"${MARKED_FORM('B')}"`),
    `the pasted body must tell him the marked form verbatim, e.g. "${MARKED_FORM('B')}"`,
  )
  assert.ok(
    SPEC.components.responses.Log.content['application/json'].schema.properties.graded_by.description
      .includes(MARKED_FORM('B')),
    'the unparsed field description must recommend the same form the instructions do',
  )
})

// The PRESCRIPTION above survived the content fix. The DIAGNOSIS printed beside it
// did not, and nothing here could tell: the body said "On some CSA items an
// option's text is itself a letter, so a bare 'B' is ambiguous and comes back
// `unparsed`", and told the GPT to demand the marked form "on any item whose option
// text is a lone letter" — a trigger condition that has been unreachable since the
// content fix reordered csa-ac-q14, csa-ac-q33 and csa-u2-q7.
//
// Swept through the real grade.js: 259 shipped items carry options_json, ZERO
// letter collisions remain, and all 1036 bare letters over every option of every
// one of them come back graded_by:'server'. So the body was stating a false fact
// about the student's own bank, in the one file that reaches him with nothing in
// between — and the test above had moved its proof to a synthetic fixture, which is
// right for the grader's contract and left the CLAIM unguarded.
//
// This is that guard, in the direction the other one cannot cover: the body may
// assert a collision in the bank only while the bank actually has one.
const CLAIMS_A_LETTER_COLLISION = [
  /an? option'?s?(?: own)? text is (?:itself )?(?:a )?(?:lone |single )?letter/i,
  /item whose option text is a (?:lone|single) letter/i,
  /bare "?[A-E]"? is ambiguous/i,
]

/** The sentences that shipped this claim, as the non-vacuity proof for the above. */
const SHIPPED_COLLISION_CLAIMS = [
  'On some CSA items an option\'s text is itself a letter, so a bare "B" is ambiguous and comes back `unparsed`.',
  'Ask for that after any `unparsed`, and on any item whose option text is a lone letter.',
]

withSeed('the body claims a letter collision in the bank only while the bank has one', () => {
  // Non-vacuity first: each pattern has to catch a sentence that really shipped,
  // and each shipped sentence has to be caught by something. Without this the
  // whole check degrades into the absence-of-a-literal shape that let the stale
  // Precalculus claim live (see BANK_CLAIMS).
  for (const shipped of SHIPPED_COLLISION_CLAIMS) {
    assert.ok(
      CLAIMS_A_LETTER_COLLISION.some((p) => p.test(shipped)),
      `nothing here catches a sentence this file really shipped, so this guards nothing: ${shipped}`,
    )
  }
  for (const pattern of CLAIMS_A_LETTER_COLLISION) {
    assert.ok(
      SHIPPED_COLLISION_CLAIMS.some((s) => pattern.test(s)),
      `${pattern} matches none of the wordings that shipped, so it is dead weight pretending to be a guard`,
    )
  }

  const env = freshEnv()
  const withOptions = env.sqlite
    .prepare(`SELECT id, kind, answer, options_json FROM items WHERE options_json IS NOT NULL`)
    .all()
  const shipped = letterCollisions(withOptions)
  const claims = CLAIMS_A_LETTER_COLLISION.filter((p) => p.test(BODY))

  if (shipped.length) {
    assert.ok(
      claims.length,
      `${shipped.length} shipped item(s) collide a bare letter with an option label ` +
        `(${shipped.map((c) => `${c.id}/${c.letter}`).join(', ')}), so the body has to warn him that a bare letter ` +
        'will be declined on them — otherwise he sends one, gets `unparsed`, and is told nothing about why',
    )
  } else {
    assert.deepEqual(
      claims.map(String), [],
      `no shipped item collides a bare letter with an option label — swept ${withOptions.length} item(s) carrying ` +
        'options through grade.js — so the body may not tell him his bank contains one. It is the only file that ' +
        'reaches him unmediated, and the prescription (a marked letter, last) stands on its own: the real and only ' +
        'remaining cause of `unparsed` is prose with no trailing letter.',
    )
  }
})
