// Worker entry point: routing, auth, and JSON shaping. All logic lives in the
// modules this imports, so it can be tested without a network or a database.

import { makeDb } from './db.js'
import {
  ApiError, handleNext, handleLog, handleTaught,
  handleMockStart, handleMockSubmit, handleStatus,
} from './api.js'
import CSA from '../config/ap_csa.json'
import PRECALC from '../config/ap_precalc.json'

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
 * Constant-time-ish comparison. Not defending against a remote timing attack on
 * a family study tool, but there is no reason to leak length or prefix either.
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
          const mockId = url.searchParams.get('m')
          return json(await handleNext({ db, subject, config, now, mockId: mockId ? Number(mockId) : null }))
        }

        case '/log': {
          const serveId = Number(url.searchParams.get('v'))
          if (!Number.isInteger(serveId) || serveId <= 0) throw new ApiError(400, 'v must be the serve id returned by /next')
          // `a` may legitimately be an empty string: that is a blank answer, and
          // it is different from the parameter being absent.
          const response = url.searchParams.get('a')
          if (response === null) throw new ApiError(400, 'a is required (use a= for a deliberate blank)')
          const hints = url.searchParams.get('h') === '1'
          const subject = url.searchParams.get('s')
          const config = CONFIGS[subject] ?? CSA
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
          return json(await handleMockStart({
            db, subject, config, now,
            section: url.searchParams.get('sec') ?? 'I',
            source: url.searchParams.get('src') ?? 'bank',
          }))
        }

        case '/mock/submit': {
          const mockId = Number(url.searchParams.get('m'))
          if (!Number.isInteger(mockId) || mockId <= 0) throw new ApiError(400, 'm must be the mock id from /mock/start')
          const subject = url.searchParams.get('s')
          return json(await handleMockSubmit({ db, mockId, config: CONFIGS[subject] ?? CSA, now }))
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
