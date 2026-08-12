// Guards the Actions schema against the two things ChatGPT rejected outright
// during the spike, and against drifting away from the router it describes.
//
// The rejections were real and undocumented in the builder UI:
//   "description has length 321 exceeding limit of 300"
//   "object schema missing properties"
// Both cost a round trip through the GPT editor to discover, so they are checked
// here instead.

import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'

const SPEC = JSON.parse(readFileSync(new URL('../openapi.json', import.meta.url), 'utf8'))
const ROUTER = readFileSync(new URL('../src/index.js', import.meta.url), 'utf8')

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

test('every object schema declares properties', () => {
  const bare = []
  for (const [path, node] of walk(SPEC)) {
    if (node.type === 'object' && !node.properties && !node.additionalProperties) {
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

test('every operation is a GET, so ChatGPT raises no consent prompt', () => {
  for (const [route, methods] of Object.entries(SPEC.paths)) {
    assert.deepEqual(
      Object.keys(methods), ['get'],
      `${route} declares a non-GET method; a request body triggers the Allow prompt`,
    )
  }
})

test('no operation declares a request body', () => {
  for (const [route, methods] of Object.entries(SPEC.paths)) {
    for (const op of Object.values(methods)) {
      assert.ok(!op.requestBody, `${route} declares a requestBody, which triggers the Allow prompt`)
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
