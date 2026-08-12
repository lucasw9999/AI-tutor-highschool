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
import { grade, MODEL_GRADED } from '../src/grade.js'

const SPEC = JSON.parse(readFileSync(new URL('../openapi.json', import.meta.url), 'utf8'))
const ROUTER = readFileSync(new URL('../src/index.js', import.meta.url), 'utf8')
const API_SRC = readFileSync(new URL('../src/api.js', import.meta.url), 'utf8')
const INSTRUCTIONS = readFileSync(new URL('../gpt-instructions.md', import.meta.url), 'utf8')
const CSA = JSON.parse(readFileSync(new URL('../config/ap_csa.json', import.meta.url), 'utf8'))
const PRECALC = JSON.parse(readFileSync(new URL('../config/ap_precalc.json', import.meta.url), 'utf8'))

const DESCRIPTION_LIMIT = 300

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
  for (const [path, node] of walk(SPEC)) {
    if (typeof node.description === 'string' && node.description.length > DESCRIPTION_LIMIT) {
      over.push(`${path} is ${node.description.length} chars`)
    }
  }
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

test('the server url is a placeholder until deploy, not a stale hostname', () => {
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
 */
const MUST_BE_IN_THE_INSTRUCTIONS = [
  'advisories',        // an unscored proctored sitting, and the burnout guard
  'what_100_means',    // the standard, written per subject from the config
  'criteria',          // the full bar, and whether a check was measured at all
  'next_thing_blocking',
  'counted',           // whether a mock can move readiness
  'composite_pct',     // null on an unscored sitting — never a zero
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

test('every field the student depends on is named in the instructions', () => {
  // Matched against the BACKTICKED names, not raw text: "correctly" contains
  // "correct" and "ungraded" contains "graded", so a substring search would pass
  // on prose that never tells the GPT the field exists.
  const named = backtickedIdentifiers(INSTRUCTIONS)
  const missing = MUST_BE_IN_THE_INSTRUCTIONS.filter((f) => !named.has(f))
  assert.deepEqual(
    missing, [],
    `the server sends these and gpt-instructions.md never mentions them, so the student never hears them: ${missing.join(', ')}`,
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

  // Precalc: all 48 items are constructed_model_graded, so 100% of answers come
  // back correct:null, graded:false, keyed:null, plus a note explaining why.
  const pq = record('Next', 'getNext', await call(env, '/next', { s: 'ap_precalc' }), 'getNext(ap_precalc)')
  const plogged = record('Log', 'logAnswer', await call(env, '/log', { s: 'ap_precalc', v: pq.serve, a: '3' }), 'logAnswer(ap_precalc)')
  assert.equal(plogged.correct, null, 'the shape the schema has to survive')
  assert.equal(plogged.graded, false)
  assert.ok(plogged.note, 'the server explains that this was not mechanically graded')

  record('Status', 'getStatus', await call(env, '/status', { s: 'ap_csa' }), 'getStatus')

  // A Precalc mock: nothing in it can be mechanically scored, so the composite
  // is computed over a subset and `scored`/`ungraded` are what explain the 0.
  const mock = record('MockStart', 'startMock', await call(env, '/mock/start', { s: 'ap_precalc', sec: 'I', src: 'bank' }), 'startMock')
  const mq = await call(env, '/next', { s: 'ap_precalc', m: mock.mock })
  await call(env, '/log', { s: 'ap_precalc', v: mq.body.serve, a: 'some work' })
  const submitted = record('MockSubmit', 'submitMock', await call(env, '/mock/submit', { s: 'ap_precalc', m: mock.mock }), 'submitMock')
  assert.equal(submitted.scored, 0, 'nothing in a Precalc sitting can be graded mechanically')

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
  const at = INSTRUCTIONS.indexOf(STATUS_CLAIM)
  assert.ok(at >= 0, `gpt-instructions.md no longer states which responses carry a status ("${STATUS_CLAIM}")`)
  const paragraph = INSTRUCTIONS.slice(at).split('\n\n')[0]

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

withSeed('the Precalculus warning in the instructions matches what the bank can actually be scored on', () => {
  const env = freshEnv()
  const claim = 'A Precalculus sitting drawn from this question bank is rubric-scored throughout'
  const gradeable = env.sqlite
    .prepare(`SELECT id, kind FROM items WHERE subject = 'ap_precalc'`)
    .all()
    .filter((r) => !MODEL_GRADED.has(r.kind))
    .map((r) => `${r.id} (${r.kind})`)

  if (gradeable.length) {
    assert.ok(
      !INSTRUCTIONS.includes(claim),
      `the bank now holds mechanically gradeable Precalc items (${gradeable.join(', ')}), so the instructions ` +
        `must stop telling him a Precalculus mock always comes back unscored`,
    )
  } else {
    assert.ok(
      INSTRUCTIONS.includes(claim),
      'every Precalc item is rubric-scored, so a Precalc mock can never produce a composite. The instructions ' +
        'have to warn him before he sits one, or a real 42-question effort comes back as "not scored" with no reason.',
    )
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
const INSTRUCTIONS_REASON_MARKERS = {
  short: /reach(ed)?[^.]*section/i,
  untimed: /clock|too long|overran|ran past|slack/i,
  ungraded: /graded mechanically/i,
  unsupplied: /bank\s+cannot\s+supply/i,
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

  // Four real, pairwise-distinct reasons exist today. Both places
  // gpt-instructions.md enumerates them have to name all four, not fewer.
  for (const [where, needle] of [
    ['the advisories bullet', 'A proctored sitting was recorded but not scored.'],
    ['the mock-exam walkthrough', '**If `counted` is false:**'],
  ]) {
    const at = INSTRUCTIONS.indexOf(needle)
    assert.ok(at >= 0, `gpt-instructions.md no longer has ${where} ("${needle}")`)
    const rest = INSTRUCTIONS.slice(at + 1)
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
  { what: 'Precalc I, no keyed item in the bank', subject: 'ap_precalc', section: 'I', config: PRECALC, n: 42, right: 0 },
  { what: 'Precalc II, rubric-scored throughout', subject: 'ap_precalc', section: 'II', config: PRECALC, n: 4, right: 0 },
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

/** Items where a bare letter is genuinely ambiguous, drawn from the shipped bank. */
function letterCollisions(sqlite) {
  const out = []
  const rows = sqlite.prepare(`SELECT id, kind, answer, options_json FROM items WHERE options_json IS NOT NULL`).all()
  for (const row of rows) {
    let options
    try { options = JSON.parse(row.options_json) } catch { continue }
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

withSeed('the answer form the instructions ask for is the one the grader can actually read', () => {
  const env = freshEnv()
  const collisions = letterCollisions(env.sqlite)

  assert.ok(
    collisions.length,
    'no shipped item collides a bare letter with an option label any more. The instructions warn him about this ' +
      'case, so if the bank really has stopped containing it, revisit that paragraph rather than deleting this test.',
  )

  for (const { item, id, letter } of collisions) {
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

  // And the instructions have to be teaching that exact form, not some other one.
  assert.ok(
    INSTRUCTIONS.includes(`"${MARKED_FORM('B')}"`),
    `gpt-instructions.md must tell him the marked form verbatim, e.g. "${MARKED_FORM('B')}"`,
  )
  assert.ok(
    SPEC.components.responses.Log.content['application/json'].schema.properties.graded_by.description
      .includes(MARKED_FORM('B')),
    'the unparsed field description must recommend the same form the instructions do',
  )
})
