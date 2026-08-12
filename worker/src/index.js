// Worker entry point: routing, auth, and JSON shaping. All logic lives in the
// modules this imports, so it can be tested without a network or a database.
//
// Every route is a GET and none reads a request body. ChatGPT prompts once per
// domain and then honours "Always allow" — see the note in api.js for what was
// actually measured versus what was originally assumed.

import { makeDb } from './db.js'
import {
  ApiError, handleNext, handleLog, handleTaught,
  handleMockStart, handleMockSubmit, handleStatus, handleDashboard,
} from './api.js'
import { renderDashboard } from './dashboard.js'
// The import attributes are required by Node, which runs the router's own tests
// (tests/openapi.test.js exercises this module directly). esbuild inlines these
// two JSON files into the bundle either way — the deployed output is identical
// with or without the attribute, which `wrangler deploy --dry-run` confirms.
import CSA from '../config/ap_csa.json' with { type: 'json' }
import PRECALC from '../config/ap_precalc.json' with { type: 'json' }

const CONFIGS = { ap_csa: CSA, ap_precalc: PRECALC }

const JSON_HEADERS = {
  'content-type': 'application/json; charset=utf-8',
  // Answers and readiness numbers must never be cached by an intermediary.
  'cache-control': 'no-store',
}

function json(body, status = 200) {
  return new Response(JSON.stringify(body, null, 1), { status, headers: JSON_HEADERS })
}

/**
 * Compares two keys without short-circuiting on the first differing character.
 *
 * It is NOT constant time and does not hide key length: a length mismatch
 * returns immediately, so the comparison leaks how long the expected key is.
 * That is an accepted limit for a two-person study tool served over TLS —
 * nothing here defends against a remote timing attack — but the guarantee is
 * only "no early exit inside a same-length comparison", and the next reader
 * should not assume more than that.
 */
function keyMatches(given, expected) {
  if (!expected || !given || given.length !== expected.length) return false
  let diff = 0
  for (let i = 0; i < given.length; i++) diff |= given.charCodeAt(i) ^ expected.charCodeAt(i)
  return diff === 0
}

function requireSubject(url) {
  const s = url.searchParams.get('s')
  const config = CONFIGS[s]
  if (!config) throw new ApiError(400, `s must be one of: ${Object.keys(CONFIGS).join(', ')}`)
  return { subject: s, config }
}

/**
 * Read the mock id. Optional on /next, required on /mock/submit — but in both
 * cases an unparseable value is a client error, not something to bind and let
 * the driver fail on (NaN) or bind successfully as a mock that cannot exist (0,
 * which recorded a whole proctored sitting as if it were cold practice).
 *
 * An empty value means "not in a mock": ChatGPT does send empty parameters for
 * the optional ones it decides to leave out, and that is not an error.
 */
function readMockId(url, { required }) {
  const raw = url.searchParams.get('m')
  if (raw === null || raw.trim() === '') {
    if (required) throw new ApiError(400, 'm must be the mock id from /mock/start')
    return null
  }
  const id = Number(raw)
  if (!Number.isInteger(id) || id <= 0) throw new ApiError(400, 'm must be the mock id from /mock/start')
  return id
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url)
    const path = url.pathname.replace(/\/+$/, '') || '/'

    // The server owns the clock. Nothing downstream may supply a timestamp.
    const now = new Date().toISOString()

    if (path === '/health') {
      return json({ ok: true, now, subjects: Object.keys(CONFIGS) })
    }

    const key = url.searchParams.get('k') ?? ''
    const isStudent = keyMatches(key, env.STUDENT_KEY)
    const isParent = keyMatches(key, env.PARENT_KEY)
    if (!isStudent && !isParent) {
      return json({ error: 'bad or missing key' }, 401)
    }

    const db = makeDb(env.DB)

    try {
      switch (path) {
        case '/next': {
          const { subject, config } = requireSubject(url)
          return json(await handleNext({ db, subject, config, now, mockId: readMockId(url, { required: false }) }))
        }

        case '/log': {
          const serveId = Number(url.searchParams.get('v'))
          if (!Number.isInteger(serveId) || serveId <= 0) throw new ApiError(400, 'v must be the serve id returned by /next')
          // `a` may legitimately be an empty string: that is a blank answer, and
          // it is different from the parameter being absent.
          const response = url.searchParams.get('a')
          if (response === null) throw new ApiError(400, 'a is required (use a= for a deliberate blank)')
          const hints = url.searchParams.get('h') === '1'
          // No default subject. Substituting one config for another silently
          // rewrites the exam date, the goal and every readiness threshold the
          // answer is judged against, and the response looks entirely normal.
          const { config } = requireSubject(url)
          return json(await handleLog({ db, serveId, response, hints, config, now }))
        }

        case '/taught': {
          const { subject, config } = requireSubject(url)
          const topic = url.searchParams.get('t')
          if (!topic) throw new ApiError(400, 't (topic) is required')
          return json(await handleTaught({ db, subject, topic, config, now }))
        }

        case '/status': {
          const { subject, config } = requireSubject(url)
          return json(await handleStatus({ db, subject, config, now }))
        }

        case '/mock/start': {
          const { subject, config } = requireSubject(url)
          // Both are declared required in the schema and neither may be guessed:
          // a College Board sitting quietly stored as 'bank' never satisfies
          // require_official_mock, and readiness stays capped with no diagnostic.
          // Read inline so the schema-vs-router drift check can see them.
          const section = url.searchParams.get('sec')
          if (!section) throw new ApiError(400, 'sec is required: I, II or full')
          const source = url.searchParams.get('src')
          if (!source) throw new ApiError(400, 'src is required: official or bank')
          return json(await handleMockStart({ db, subject, config, now, section, source }))
        }

        case '/mock/submit': {
          const mockId = readMockId(url, { required: true })
          const { config } = requireSubject(url)
          return json(await handleMockSubmit({ db, mockId, config, now }))
        }

        case '/dash': {
          // Parent-only: the dashboard shows the whole evidence trail at once.
          if (!isParent) throw new ApiError(403, 'the dashboard requires the parent key')
          const data = await handleDashboard({ db, configs: CONFIGS, now })
          return new Response(renderDashboard(data), {
            status: 200,
            headers: { 'content-type': 'text/html; charset=utf-8', 'cache-control': 'no-store' },
          })
        }

        default:
          return json({ error: `no route for ${path}` }, 404)
      }
    } catch (err) {
      if (err instanceof ApiError) return json({ error: err.message }, err.status)
      // Surface the message rather than a bare 500 — this is a two-person tool
      // and a silent failure costs more than the information leak.
      return json({ error: `server error: ${err.message}` }, 500)
    }
  },
}
