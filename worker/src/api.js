// The API surface, as pure handlers over a db object.
//
// EVERY ENDPOINT IS A GET WITH QUERY PARAMETERS. That is not a REST opinion —
// it is the fix for the blocking complaint that killed the first prototype:
// "If every single time people have to keep clicking allow, allow, allow, that's
// not working." ChatGPT raises a consent prompt for an Action that sends a
// request BODY, and does not for a GET with query parameters. So writes are
// GETs. Anything that changes state is idempotent per serve id, which is what
// makes that safe.
//
// The other governing rule: the model carries only what it cannot fake. It
// never supplies an item id, a timestamp, an elapsed time, or a verdict. It
// passes back the serve id the server issued and the raw text the student typed.

import { grade } from './grade.js'
import { computeReadiness } from './readiness.js'
import { pickNext } from './select.js'
import { detectGaps, reconcileGaps, clearsGap, buildLesson } from './teaching.js'

export class ApiError extends Error {
  constructor(status, message) {
    super(message)
    this.status = status
  }
}

/** Everything the engines need for one subject, fetched concurrently. */
async function loadContext(db, subject, config) {
  const [items, attempts, topics, gaps, mocks, teachingRows] = await Promise.all([
    db.items(subject), db.attempts(subject), db.topics(subject),
    db.gaps(subject), db.mocks(subject), db.teaching(subject),
  ])
  return {
    items, attempts, gaps, mocks, config,
    topicMeta: new Map(topics.map((t) => [t.id, t])),
    teaching: new Map(teachingRows.map((t) => [t.topic, t])),
    topics,
  }
}

function coverageOf({ attempts, topics }) {
  const tested = topics.filter((t) => t.tested_on_exam !== 0)
  const seen = new Set(attempts.map((a) => a.topic))
  return {
    topics_total: tested.length,
    topics_drilled: tested.filter((t) => seen.has(t.id)).length,
  }
}

/**
 * GET /next — hand out one question.
 *
 * Records a serve row first, so the elapsed time on the way back is measured
 * from the server's clock rather than reported by the model. The answer key is
 * deliberately absent from the response.
 */
export async function handleNext({ db, subject, config, now, mockId = null }) {
  const ctx = await loadContext(db, subject, config)
  if (!ctx.items.length) throw new ApiError(503, `no items loaded for ${subject}`)

  // A gap with enough evidence but no lesson yet interrupts the drill.
  const detected = detectGaps(ctx.attempts)
  const { to_open, to_teach } = reconcileGaps({ detected, gaps: ctx.gaps })
  for (const g of to_open) await db.openGap({ subject, topic: g.topic, opened_at: now })

  const pendingLesson = to_teach[0] ?? to_open[0]
  if (pendingLesson && !mockId) {
    const evidence = detected.find((d) => d.topic === pendingLesson.topic)
    const lesson = buildLesson({ topic: pendingLesson.topic, teaching: ctx.teaching, gap: evidence })
    if (lesson) {
      return { type: 'lesson', lesson, status: summarize({ ctx, now }) }
    }
    // No material for this topic: say so rather than skipping the gap silently.
    return {
      type: 'lesson_missing',
      topic: pendingLesson.topic,
      note: `Evidence says ${pendingLesson.topic} is a real gap, but no teaching material exists for it yet. Flagging rather than drilling it blind.`,
      status: summarize({ ctx, now }),
    }
  }

  const choice = pickNext({ ...ctx, now })
  if (!choice) throw new ApiError(409, 'every question is inside the no-repeat window; add items or wait')

  const serveId = await db.recordServe({ subject, item_id: choice.item.id, served_at: now, mock_id: mockId })
  return {
    type: 'question',
    serve: serveId,
    stem: choice.item.stem,
    options: choice.item.options,
    kind: choice.item.kind,
    topic: choice.item.topic,
    calc_allowed: choice.item.calc_allowed,
    why: choice.reason,
    status: summarize({ ctx, now }),
  }
}

/**
 * GET /log — grade and record one answer.
 *
 * The serve id is the only handle the model has, and it can be spent once.
 * Timing is derived here; hints are counted here; the verdict is computed here.
 */
export async function handleLog({ db, serveId, response, hints = 0, config, now }) {
  const serve = await db.serve(serveId)
  if (!serve) throw new ApiError(404, `unknown serve id ${serveId}`)
  if (serve.logged) throw new ApiError(409, `serve ${serveId} was already logged`)

  const item = await db.item(serve.item_id)
  if (!item) throw new ApiError(500, `serve ${serveId} points at a missing item`)

  const verdict = grade(item, response)
  const seconds = Math.max(0, Math.round((new Date(now) - new Date(serve.served_at)) / 1000))

  await db.recordAttempt({
    ts: now,
    subject: serve.subject,
    item_id: item.id,
    topic: item.topic,
    unit: item.unit,
    practice: item.practice,
    response: response ?? '',
    correct: verdict.correct,
    graded_by: verdict.graded_by,
    seconds,
    hints_used: hints ? 1 : 0,
    conditions: serve.mock_id ? 'proctored_mock' : hints ? 'tutored' : 'cold',
    mock_id: serve.mock_id,
  })
  await db.markServeLogged(serveId)

  // A cold, unaided correct answer after the lesson is what closes a gap.
  const gaps = await db.gaps(serve.subject)
  const open = gaps.find((g) => g.topic === item.topic && !g.cleared_at)
  const attemptRow = { ts: now, correct: verdict.correct, hints_used: hints ? 1 : 0, conditions: serve.mock_id ? 'proctored_mock' : hints ? 'tutored' : 'cold' }
  let gapClosed = null
  if (clearsGap(open, attemptRow)) {
    await db.clearGap({ subject: serve.subject, topic: item.topic, cleared_at: now })
    gapClosed = item.topic
  }

  const ctx = await loadContext(db, serve.subject, config)
  const graded = verdict.graded_by === 'server'
  return {
    // `correct` is only a claim when the server actually graded it. For
    // model-graded and unkeyed items it is null, so nothing downstream can read
    // a missing verdict as a wrong answer.
    correct: graded ? verdict.correct === 1 : null,
    graded,
    blank: verdict.blank,
    keyed: verdict.keyed,
    graded_by: verdict.graded_by,
    seconds,
    explanation: item.explanation,
    gap_closed: gapClosed,
    ...(verdict.graded_by === 'unkeyed' && {
      note: 'This item has no answer key yet, so your answer was recorded but not graded. That is a gap in the question bank, not a mistake by you.',
    }),
    ...(verdict.graded_by === 'model' && {
      note: 'Compare your work against the worked solution below. This is practice feedback and does not count toward readiness.',
    }),
    status: summarize({ ctx, now }),
  }
}

/** GET /taught — the lesson was delivered; the gap now awaits a cold re-test. */
export async function handleTaught({ db, subject, topic, config, now }) {
  await db.markTaught({ subject, topic, taught_at: now })
  const ctx = await loadContext(db, subject, config)
  return {
    ok: true,
    topic,
    next: `${topic} will come back with no hints. Getting one right unaided is what closes it.`,
    status: summarize({ ctx, now }),
  }
}

/** GET /mock/start — open a proctored sitting. Only these can move readiness. */
export async function handleMockStart({ db, subject, section, source, config, now }) {
  if (!['I', 'II', 'full'].includes(section)) throw new ApiError(400, `section must be I, II or full`)
  if (!['bank', 'official'].includes(source)) throw new ApiError(400, `source must be bank or official`)
  const id = await db.startMock({ subject, section, started_at: now, proctored: 1, source })
  const e = config.exam
  return {
    mock: id,
    section,
    source,
    timing: section === 'II' ? `${e.frq_minutes ?? e.frq_calc_minutes + e.frq_no_calc_minutes} minutes` : `${e.mcq_minutes ?? e.mcq_no_calc_minutes + e.mcq_calc_minutes} minutes`,
    rules: 'No hints, no notes, no going back to check answers. A mock only counts if it is run like the real thing.',
  }
}

/** GET /mock/submit — close the sitting and score it from its own attempts. */
export async function handleMockSubmit({ db, mockId, config, now }) {
  const m = await db.mock(mockId)
  if (!m) throw new ApiError(404, `unknown mock ${mockId}`)
  if (m.ended_at) throw new ApiError(409, `mock ${mockId} is already submitted`)

  const attempts = (await db.attempts(m.subject)).filter((a) => a.mock_id === Number(mockId))
  if (!attempts.length) throw new ApiError(409, `mock ${mockId} has no logged answers`)

  // Composite counts only mechanically graded answers. Including model-graded or
  // unkeyed items would fold an ungraded zero into the score and understate it.
  const scored = attempts.filter((a) => a.graded_by === 'server')
  const composite = scored.length ? (scored.filter((a) => a.correct).length / scored.length) * 100 : 0
  const blanks = attempts.filter((a) => (a.response ?? '') === '').length
  const ungraded = attempts.length - scored.length

  await db.endMock({ id: mockId, ended_at: now, composite_pct: composite, blanks })
  const ctx = await loadContext(db, m.subject, config)
  return {
    mock: Number(mockId),
    composite_pct: Number(composite.toFixed(1)),
    answered: attempts.length,
    scored: scored.length,
    ungraded,
    blanks,
    basis: ungraded
      ? `Scored on the ${scored.length} mechanically graded answers. ${ungraded} response(s) need human or model grading and are excluded.`
      : 'Multiple choice only. Free response is scored separately and cannot move readiness until the grader is calibrated.',
    status: summarize({ ctx, now }),
  }
}

/**
 * The always-visible summary.
 *
 * Attached to every response because of a specific complaint: "otherwise, you
 * just keep doing things, you don't know where you are, which is hard."
 */
export function summarize({ ctx, now }) {
  const coverage = coverageOf(ctx)
  const r = computeReadiness({
    config: ctx.config,
    mocks: ctx.mocks,
    attempts: ctx.attempts,
    coverage,
    calibrated: false,
    now,
  })
  const openGaps = ctx.gaps.filter((g) => !g.cleared_at).map((g) => g.topic)
  const blocker = r.criteria.find((c) => !c.met)
  const daysToExam = Math.ceil((new Date(ctx.config.exam_date) - new Date(now)) / 86400000)

  return {
    subject: ctx.config.display_name,
    readiness_pct: r.readiness_pct,
    ready: r.ready,
    goal: ctx.config.goal,
    exam_date: ctx.config.exam_date,
    days_to_exam: daysToExam,
    coverage: `${coverage.topics_drilled}/${coverage.topics_total} topics attempted`,
    questions_answered: ctx.attempts.length,
    proctored_mocks: ctx.mocks.filter((m) => m.proctored && m.composite_pct != null).length,
    next_thing_blocking: blocker ? `${blocker.label} — ${blocker.detail}` : null,
    open_gaps: openGaps,
    advisories: r.advisories,
  }
}

/** The full report: every criterion, met or not, with its evidence. */
export async function handleStatus({ db, subject, config, now }) {
  const ctx = await loadContext(db, subject, config)
  const coverage = coverageOf(ctx)
  const r = computeReadiness({ config, mocks: ctx.mocks, attempts: ctx.attempts, coverage, calibrated: false, now })
  return {
    ...summarize({ ctx, now }),
    criteria: r.criteria.map((c) => ({ requirement: c.label, met: c.met, evidence: c.detail })),
    what_100_means:
      `100% is not "finished the material." It means every criterion above holds at the same time: ` +
      `${config.readiness.consecutive_qualifying_mocks} proctored mocks spread over at least ` +
      `${config.readiness.window_span_days_min} days, at least one from official College Board material, ` +
      `a mean of ${config.readiness.composite_mean_min}%+ with no single sitting below ` +
      `${config.readiness.composite_floor_min}%, and every unit above ${config.readiness.per_unit_min}%.`,
  }
}

/**
 * Everything the parent dashboard needs, for every configured subject.
 *
 * Returns data only; rendering lives in dashboard.js so it can be tested without
 * a database.
 */
export async function handleDashboard({ db, configs, now }) {
  const subjects = []
  for (const [subject, config] of Object.entries(configs)) {
    const ctx = await loadContext(db, subject, config)
    const coverage = coverageOf(ctx)
    subjects.push({
      config,
      coverage,
      attempts: ctx.attempts,
      mocks: ctx.mocks,
      readiness: computeReadiness({
        config, mocks: ctx.mocks, attempts: ctx.attempts, coverage, calibrated: false, now,
      }),
    })
  }
  return { subjects, now }
}
