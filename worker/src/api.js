// The API surface, as pure handlers over a db object.
//
// EVERY ENDPOINT IS A GET WITH QUERY PARAMETERS, and no endpoint takes a request
// body. This addresses the complaint that killed the first prototype: "If every
// single time people have to keep clicking allow, allow, allow, that's not
// working."
//
// MEASURED BEHAVIOUR, not theory: ChatGPT prompts ONCE on the first call to a new
// domain, offering "Always allow". After that click it never prompts again -
// verified across getStatus, getNext and logAnswer in both the builder preview
// and the published GPT. An earlier version of this comment claimed a GET raises
// no prompt at all; that was wrong. Whether a request body would re-prompt on
// every call is untested, so the no-body design is kept as the conservative
// choice rather than a proven requirement.
//
// The design does rely on GETs being safe to repeat: every state change is
// idempotent per serve id, so a retried Action cannot double-count. /log spends
// its serve id with a single conditional UPDATE (db.claimServe) before it writes
// the attempt, so of two concurrent retries exactly one records an answer and the
// other is refused — a read-then-write guard let both through.
//
//
// The other governing rule: the model carries only what it cannot fake. It
// never supplies an item id, a timestamp, an elapsed time, or a verdict. It
// passes back the serve id the server issued and the raw text the student typed.

import { grade, MODEL_GRADED } from './grade.js'
import { computeReadiness } from './readiness.js'
import { pickNext } from './select.js'
import { detectGaps, reconcileGaps, clearsGap, buildLesson } from './teaching.js'

export class ApiError extends Error {
  constructor(status, message) {
    super(message)
    this.status = status
  }
}

/**
 * The config that governs a piece of evidence, derived from the DATA rather than
 * from what the caller said the subject was.
 *
 * `s` is model-supplied; the subject on a serve row or a mock row is not. When
 * they disagree the request is refused, because judging Precalc evidence against
 * CSA floors reports the wrong exam date, the wrong goal and the wrong per-unit
 * bar — a readiness claim about an exam the student is not sitting.
 *
 * Works with or without a `configs` map, so it does not depend on the router
 * being fixed too: with the map it derives the config, without it, it at least
 * refuses a config that belongs to another subject.
 */
function configFor({ subject, config = null, configs = null }) {
  const derived = configs ? configs[subject] : null
  if (configs && !derived) {
    throw new ApiError(400, `no readiness config for subject ${subject}`)
  }
  if (config && config.subject !== subject) {
    throw new ApiError(
      400,
      `this record belongs to ${subject} but the config supplied is for ${config.subject ?? 'an unnamed subject'}; ` +
        `pass s=${subject} — ${subject} evidence cannot be judged against another subject's standards`,
    )
  }
  const chosen = derived ?? config
  if (!chosen) throw new ApiError(400, `no readiness config supplied for subject ${subject}`)
  return chosen
}

/**
 * The zone the exams are actually sat in.
 *
 * days_to_exam is a count of calendar days, so it has to be computed in one fixed
 * zone. Subtracting UTC instants instead reports 22:00 and 03:00 on the same
 * Pacific evening as 1 day and 0 days out, and makes the night before the exam
 * indistinguishable from exam morning.
 */
const EXAM_ZONE = 'America/Los_Angeles'
const EXAM_ZONE_CALENDAR = new Intl.DateTimeFormat('en-CA', {
  timeZone: EXAM_ZONE, year: 'numeric', month: '2-digit', day: '2-digit',
})

/** Whole calendar days from `now` to the exam date, in the exam's own zone. */
export function daysToExam(examDate, now) {
  const today = EXAM_ZONE_CALENDAR.format(new Date(now))
  const exam = String(examDate).slice(0, 10)
  return Math.round((Date.parse(`${exam}T00:00:00Z`) - Date.parse(`${today}T00:00:00Z`)) / 86400000)
}

/** Newest resolution per topic, so spent evidence cannot re-open a closed gap. */
function resolvedSince(gaps) {
  const since = new Map()
  for (const g of gaps) {
    if (!g.cleared_at) continue
    const prev = since.get(g.topic)
    if (!prev || new Date(g.cleared_at) > new Date(prev)) since.set(g.topic, g.cleared_at)
  }
  return since
}

/**
 * Load the sitting a caller claims to be answering inside, and refuse it unless
 * it is real, this subject's, and still open.
 *
 * The mock id is one of the few things the model passes that it could invent, and
 * an unchecked one is the cheapest possible route to a false readiness number:
 * answers logged hours later against a submitted mock feed every per-unit floor
 * while the stored composite stays frozen at what was actually sat.
 */
async function requireOpenMock({ db, mockId, subject }) {
  const m = await db.mock(mockId)
  if (!m) throw new ApiError(404, `unknown mock ${mockId}`)
  if (m.subject !== subject) {
    throw new ApiError(409, `mock ${mockId} is an ${m.subject} sitting, not ${subject}`)
  }
  if (m.ended_at) {
    throw new ApiError(
      409,
      `mock ${mockId} was submitted at ${m.ended_at}. Answers logged after a sitting closes were not given under ` +
        `mock conditions, so they cannot be added to it — run /mock/start for a new sitting.`,
    )
  }
  return m
}

/**
 * How many gradeable questions of each kind the bank actually holds, per subject.
 *
 * Exam-tested topics only, because that is the whole world a sitting is drawn
 * from (see select.js's `universe`): a paper may not be padded from the
 * class-only corner of the bank, so that corner cannot make a section look
 * supplied either. An item with no answer key is counted out for the same
 * reason — grade.js reports it `unkeyed`, so it can never reach a composite.
 *
 * @returns {Map<string, number>} item kind -> how many the bank can ask and mark.
 */
function supplyOf({ items = [], topics = [] }) {
  const tested = new Set(topics.filter((t) => t.tested_on_exam !== 0).map((t) => t.id))
  const counts = new Map()
  for (const it of items) {
    // Mirrors select.js's isTested: with no topic metadata at all, nothing is
    // excluded, rather than everything being.
    if (tested.size && !tested.has(it.topic)) continue
    if (it.answer == null || String(it.answer).trim() === '') continue
    counts.set(it.kind, (counts.get(it.kind) ?? 0) + 1)
  }
  return counts
}

/** Everything the engines need for one subject, fetched concurrently. */
async function loadContext(db, subject, config) {
  const [items, attempts, topics, gaps, mocks, teachingRows] = await Promise.all([
    db.items(subject), db.attempts(subject), db.topics(subject),
    db.gaps(subject), db.mocks(subject), db.teaching(subject),
  ])
  return {
    items, attempts, gaps, mocks, config,
    supply: supplyOf({ items, topics }),
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

  // Checked before anything is written, so a bad mock id leaves no serve row.
  if (mockId != null) await requireOpenMock({ db, mockId, subject })

  // A gap with enough evidence but no lesson yet interrupts the drill. The
  // evidence is scoped to what has happened since the topic was last cleared:
  // misses that were already taught and re-tested cold are spent.
  const detected = detectGaps(ctx.attempts, { since: resolvedSince(ctx.gaps) })
  const { to_open, to_teach } = reconcileGaps({ detected, gaps: ctx.gaps })
  for (const g of to_open) {
    await db.openGap({ subject, topic: g.topic, opened_at: now })
    // The context was loaded before this write, and summarize() reads it. Without
    // this, the response that delivers a lesson for a gap reports no open gaps.
    ctx.gaps.push({ subject, topic: g.topic, opened_at: now, taught_at: null, cleared_at: null })
  }

  // A gap on a topic with no teaching material is flagged and then drilled
  // anyway. Returning the flag on its own used to stop the entire subject dead:
  // that topic stayed the pending lesson forever, so no question was served
  // again, for any topic, and nothing in the loop could clear it.
  const contentGaps = []
  const missingNote = (topics) =>
    `Evidence says ${topics.join(', ')} is a real gap, but no teaching material exists for it yet. ` +
    `Flagging that rather than explaining it blind — tell him the system owes him this one, and carry on below.`

  if (!mockId) {
    for (const pending of [...to_teach, ...to_open]) {
      const evidence = detected.find((d) => d.topic === pending.topic)
      const lesson = buildLesson({ topic: pending.topic, teaching: ctx.teaching, gap: evidence })
      if (lesson) {
        return {
          type: 'lesson',
          lesson,
          ...(contentGaps.length && { lesson_missing: contentGaps, note: missingNote(contentGaps) }),
          status: summarize({ ctx, now }),
        }
      }
      if (!contentGaps.includes(pending.topic)) contentGaps.push(pending.topic)
    }
  }

  // Inside a mock the selector samples the paper instead of teaching: a proctored
  // sitting stands in for the real exam, which is not aimed at his weakest topic,
  // his overdue reviews or his open gaps. Passing gaps: [] as well is deliberate
  // belt and braces on the one number that can move readiness.
  //
  // excludeItemIds is the sitting's own questions-in-flight. select.js decides a
  // repeat from ATTEMPT rows, which do not exist until /log, so between /next and
  // /log a question is servable again as far as it can see — and two /next calls
  // inside one sitting handed out the same item, sequentially and (at 200/200)
  // concurrently. Both then logged cleanly, and two attempt rows for one question
  // are not two questions of evidence: a duplicate buys a 37-of-42 sitting past
  // MIN_MOCK_COVERAGE, and a duplicated CORRECT answer adds to the numerator
  // without adding to the denominator. db.recordServe closes the concurrent half
  // of the same hole inside the INSERT.
  const inFlight = mockId == null ? null : await db.openServeItems({ subject, mockId })
  const choice = pickNext({
    ...ctx,
    gaps: mockId ? [] : ctx.gaps,
    now,
    ...(mockId != null && { sampling: 'mock', mockId, excludeItemIds: inFlight }),
  })
  if (!choice) throw new ApiError(409, 'every question is inside the no-repeat window; add items or wait')

  const serveId = await db.recordServe({ subject, item_id: choice.item.id, served_at: now, mock_id: mockId })
  // Lost the race for this item to a concurrent /next: nothing was written, and
  // asking again picks a different one, because by then the winner's serve row is
  // there to be excluded.
  if (serveId == null) {
    throw new ApiError(
      409,
      `another request was handed this question inside mock ${mockId} a moment ago and it is still unanswered. ` +
        `Nothing was recorded — ask for the next question again.`,
    )
  }
  return {
    type: 'question',
    serve: serveId,
    stem: choice.item.stem,
    options: choice.item.options,
    kind: choice.item.kind,
    topic: choice.item.topic,
    calc_allowed: choice.item.calc_allowed,
    why: choice.reason,
    ...(contentGaps.length && { lesson_missing: contentGaps, note: missingNote(contentGaps) }),
    status: summarize({ ctx, now }),
  }
}

/**
 * GET /log — grade and record one answer.
 *
 * The serve id is the only handle the model has, and it can be spent once.
 * Timing is derived here; hints are counted here; the verdict is computed here.
 */
export async function handleLog({ db, serveId, response, hints = 0, config, configs = null, now }) {
  const serve = await db.serve(serveId)
  if (!serve) throw new ApiError(404, `unknown serve id ${serveId}`)
  // Cheap early refusal for the ordinary replay, before any work is done. It is
  // NOT the guard that makes this safe — see the claim below.
  if (serve.logged) throw new ApiError(409, `serve ${serveId} was already logged`)

  // The subject comes from the serve row; the standards must follow it, not the
  // caller's `s`. Refused before anything is written, so the serve is not spent.
  const cfg = configFor({ subject: serve.subject, config, configs })

  const item = await db.item(serve.item_id)
  if (!item) throw new ApiError(500, `serve ${serveId} points at a missing item`)

  // A serve handed out inside a sitting can still be logged after that sitting
  // was submitted: requireOpenMock guards /next, and this was the other door.
  //
  // The answer is KEPT — he did the work, and a lost answer is its own small
  // lie — but it is recorded as ordinary practice: an answer typed after the
  // timer stopped, with the paper handed in, is not evidence about how he
  // performs under exam conditions. Filing it under the mock did exactly what
  // the stored composite cannot: readiness reads the judged window's evidence
  // as `attempts.filter((a) => ids.has(a.mock_id))`, so one untimed keystroke
  // hours later moved mcq_overall and a per-unit floor on a closed sitting.
  //
  // The decision is NOT made here. Reading the sitting and then inserting is a
  // read-then-write, and a first-time /log racing /mock/submit read the sitting
  // as open, filed its answer under the mock, and had it counted against a
  // composite that was already frozen — the same defect through a narrow window.
  // db.recordAttemptUnderOpenMock decides inside the INSERT, so the row can only
  // carry a mock id if the sitting was open at the instant it landed.
  const verdict = grade(item, response)
  const seconds = Math.max(0, Math.round((new Date(now) - new Date(serve.served_at)) / 1000))

  // Spend the serve BEFORE the attempt is written, with a conditional UPDATE that
  // reports whether it was this call that spent it.
  //
  // The check above is a read-then-write, and D1 offers no transaction here: two
  // concurrent /log calls on one serve id both read logged = 0, both pass, and one
  // answer becomes TWO attempt rows — which moves questions_answered, every
  // per-unit floor and the composite off a single keystroke. Every endpoint is a
  // GET that ChatGPT may retry, so this needed no unusual circumstances at all.
  // claimServe is a single statement, which D1 executes atomically, so exactly one
  // racer changes a row and the other is refused right here.
  //
  // The trade-off, taken deliberately: if this dies between the claim and the
  // insert, the answer is LOST rather than double-counted. That is the correct
  // direction. A lost answer can simply be asked again; a double-counted one
  // silently corrupts the only numbers that move readiness.
  if (!(await db.claimServe(serveId))) {
    throw new ApiError(409, `serve ${serveId} was already logged`)
  }

  const attempt = {
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
  }

  let mockId = null
  if (serve.mock_id == null) {
    await db.recordAttempt({ ...attempt, conditions: hints ? 'tutored' : 'cold', mock_id: null })
  } else {
    mockId = await db.recordAttemptUnderOpenMock({
      ...attempt, conditions_if_closed: hints ? 'tutored' : 'cold', mock_id: serve.mock_id,
    })
  }
  const conditions = mockId ? 'proctored_mock' : hints ? 'tutored' : 'cold'

  // Read the sitting only when it turned out to be closed, and only to tell him
  // when it was submitted. The row is what happened; this is the explanation.
  const closed = serve.mock_id != null && mockId == null ? await db.mock(serve.mock_id) : null

  // A cold, unaided correct answer after the lesson is what closes a gap.
  const gaps = await db.gaps(serve.subject)
  const open = gaps.find((g) => g.topic === item.topic && !g.cleared_at)
  const attemptRow = { ts: now, correct: verdict.correct, hints_used: hints ? 1 : 0, conditions }
  let gapClosed = null
  if (clearsGap(open, attemptRow)) {
    await db.clearGap({ subject: serve.subject, topic: item.topic, cleared_at: now })
    gapClosed = item.topic
  }

  const ctx = await loadContext(db, serve.subject, cfg)
  const graded = verdict.graded_by === 'server'

  // Notes accumulate, because two of them can be true at once: a demoted answer
  // on a model-graded item needs to say both things. Assembling them by
  // overwriting one `note` key silently dropped whichever came first.
  const notes = []
  if (serve.mock_id != null && mockId == null) {
    notes.push(
      `This question was handed out inside mock ${serve.mock_id}, which was submitted` +
      `${closed?.ended_at ? ` at ${closed.ended_at}` : ''}. ` +
      `Your answer is recorded and graded as ordinary practice, NOT as part of that sitting: work done after ` +
      `the timer stops is not proctored evidence, so the mock's score stays exactly as it was sat.`,
    )
  }
  if (verdict.graded_by === 'unkeyed') {
    notes.push('This item has no answer key yet, so your answer was recorded but not graded. That is a gap in the question bank, not a mistake by you.')
  }
  if (verdict.graded_by === 'model') {
    notes.push('Compare your work against the worked solution below. This is practice feedback and does not count toward readiness.')
  }
  // An unparsed verdict used to return correct: null with no note at all, so he
  // was told nothing: not right, not wrong, no reason, nothing to do next. The
  // wording does not promise a re-grade of THIS question — the serve is spent
  // and cannot be logged twice — only that the next one will read cleanly.
  if (verdict.graded_by === 'unparsed') {
    notes.push('I could not read that as one answer, so nothing was graded — it does not count as wrong either. '
      + 'Read the explanation below, and on the next one send just the letter ("B", not "B or C") so it can be graded.')
  }

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
    ...(notes.length && { note: notes.join(' ') }),
    status: summarize({ ctx, now }),
  }
}

/** GET /taught — the lesson was delivered; the gap now awaits a cold re-test. */
export async function handleTaught({ db, subject, topic, config, now }) {
  // The UPDATE behind markTaught matches on (subject, topic, cleared_at IS NULL),
  // so a topic name where an id belongs, or a topic with no open gap, silently
  // matches nothing. Reporting ok:true for that told the student his lesson was
  // registered while /next went on serving him the same lesson forever.
  const open = (await db.gaps(subject)).filter((g) => g.topic === topic && !g.cleared_at)
  if (!open.length) {
    throw new ApiError(
      404,
      `no open gap on "${topic}" for ${subject}, so there is no lesson to mark as delivered. ` +
        `Pass the topic id exactly as /next returned it in lesson.topic.`,
    )
  }
  await db.markTaught({ subject, topic, taught_at: now })
  const ctx = await loadContext(db, subject, config)
  return {
    ok: true,
    topic,
    next: `${topic} will come back with no hints. Getting one right unaided is what closes it.`,
    status: summarize({ ctx, now }),
  }
}

/**
 * The real time budget for a section, in minutes, from the subject's own table.
 *
 * `full` used to fall through to the MCQ branch and tell him a whole CSA sitting
 * was 90 minutes rather than 180 — half the exam, which under-times the sitting
 * and then leaves it short of the coverage a scored mock requires.
 */
function sectionMinutes(section, e = {}) {
  const mcq = e.mcq_minutes ?? (e.mcq_no_calc_minutes ?? 0) + (e.mcq_calc_minutes ?? 0)
  const frq = e.frq_minutes ?? (e.frq_calc_minutes ?? 0) + (e.frq_no_calc_minutes ?? 0)
  if (section === 'II') return frq
  if (section === 'full') return mcq + frq
  return mcq
}

/**
 * How far a sitting may run over its real time budget and still read as
 * exam-condition evidence, and how much of that budget one question may absorb.
 *
 * DELIBERATE DECISION, written out because this pair of numbers decides whether
 * an afternoon of genuine work counts as a mock:
 *
 * The server holds every timestamp involved — the mock's started_at, the
 * served_at behind each serve, each attempt's ts and its server-measured
 * `seconds` — and it holds the section's real budget in config.exam. Until this,
 * nothing compared them: 42 CSA questions "sat" across four hours with his notes
 * open scored exactly like 42 sat in ninety minutes, and six such afternoons
 * read as ready for an exam he would fail. Running the clock is the one part of
 * a mock the model was being trusted to police, and it is precisely the part the
 * server can verify.
 *
 * WHAT IS MEASURED, and why not simply ended_at - started_at: the interval that
 * matters is the one during which questions were in front of him, from the first
 * question handed out to the last answer recorded. /mock/submit is an
 * administrative call — the model may make it minutes or hours after the last
 * answer, and no advantage is available in that gap because nothing is
 * outstanding. Charging a late submit against the sitting would discard real
 * evidence, which is its own way of misreporting where he stands. Both ends come
 * from attempt rows the server timestamped itself (`ts`, and `ts - seconds` for
 * the serve), so this cannot be inflated or deflated by anything the model says.
 * It is also a lower bound on the true wall-clock sitting, i.e. it errs toward
 * counting his work rather than throwing it away.
 *
 * WHY 1.5x AND NOT LESS: a mock run at home through a chat window is not a
 * proctored room. Reading a question in a transcript, typing an answer, and the
 * model's own turn latency all cost time the real exam does not, and a human
 * needs the bathroom. 1.5x is 45 minutes of slack on a 90-minute section — about
 * 64 extra seconds on every one of 42 questions, generously more than that
 * overhead — so a sitting refused at this bar was not merely slow. WHY NOT MORE:
 * at 2x a 90-minute section becomes three hours, which is a different activity
 * with a different result, and calling it exam evidence is the overstatement this
 * whole system exists to prevent.
 *
 * WHY A PER-QUESTION CAP TOO: the total can stay inside the budget while one
 * question absorbs an hour — 41 answers at speed, then the last one looked up.
 * Half the section's entire budget on a single question is not thinking under
 * time pressure at any section shape (45 minutes of a 90-minute MCQ section, 45
 * of one Precalc FRQ set, 90 of a full sitting), and on the real exam it is not
 * survivable, so nothing legitimate is caught by it.
 *
 * WHAT HAPPENS THEN — disclosed, never discarded. The answers stay on the
 * record and still count as practice; the sitting is stored with no composite,
 * which is the existing mechanism for a sitting that cannot count (see
 * MIN_MOCK_COVERAGE): counted:false, a `basis` that says so in numbers, and an
 * advisory that resurfaces on every later response so it cannot quietly vanish.
 * Readiness reads `proctored && composite_pct != null`, so it does not move.
 */
export const MOCK_TIME_SLACK = 1.5
export const MAX_ITEM_SHARE_OF_BUDGET = 0.5

/**
 * What the clock says about one sitting, from the server's own timestamps.
 *
 * @returns {null|object} null when there is nothing to judge — no budget for the
 *          section, or no usable attempt timestamps — because inventing a
 *          verdict from missing evidence is the same failure in the other
 *          direction. Otherwise the measured interval, the longest single
 *          answer, and whether either is past its bar.
 */
function sittingTiming({ section, exam = {}, attempts = [] }) {
  const budget_minutes = sectionMinutes(section, exam)
  if (!budget_minutes) return null

  let firstServed = null
  let lastAnswer = null
  let longest_item_seconds = 0
  for (const a of attempts) {
    const ts = Date.parse(a.ts)
    if (!Number.isFinite(ts)) continue
    const took = Number.isFinite(Number(a.seconds)) ? Math.max(0, Number(a.seconds)) : 0
    const served = ts - took * 1000
    if (firstServed == null || served < firstServed) firstServed = served
    if (lastAnswer == null || ts > lastAnswer) lastAnswer = ts
    if (took > longest_item_seconds) longest_item_seconds = took
  }
  if (firstServed == null) return null

  const allowed_minutes = budget_minutes * MOCK_TIME_SLACK
  const item_cap_seconds = budget_minutes * 60 * MAX_ITEM_SHARE_OF_BUDGET
  const elapsed_minutes = (lastAnswer - firstServed) / 60000
  const over_total = elapsed_minutes > allowed_minutes
  const over_item = longest_item_seconds > item_cap_seconds
  return {
    budget_minutes, allowed_minutes, elapsed_minutes,
    longest_item_seconds, item_cap_seconds,
    over_total, over_item, untimed: over_total || over_item,
  }
}

/** The measured facts behind an untimed verdict, in the student's words. */
function timingFindings(t) {
  const out = []
  if (t.over_total) {
    out.push(
      `Its answers span ${Math.round(t.elapsed_minutes)} minutes from the first question being handed out to the ` +
      `last answer recorded, against the ${t.budget_minutes} minutes this section gets on the real exam — past the ` +
      `${Math.round(t.allowed_minutes)} minutes allowed for the ordinary overrun of sitting one at home.`,
    )
  }
  if (t.over_item) {
    out.push(
      `One question alone absorbed ${Math.round(t.longest_item_seconds / 60)} minutes, more than half the ` +
      `${t.budget_minutes} minutes the whole section gets.`,
    )
  }
  return out
}

/**
 * GET /mock/start — open a proctored sitting. Only these can move readiness.
 *
 * NOT refused when the bank cannot supply the section: FRQ practice against a
 * clock is real work, and refusing it would throw away evidence to protect a
 * number. What it cannot do is produce a composite — see sectionScoring, and
 * handleMockSubmit's `supplied` guard, which says so in the sitting's own basis
 * and in an advisory that resurfaces on every later response. Telling him HERE
 * as well, before he spends ninety minutes on it, would be better still, and is
 * left undone only because it needs a content read this handler does not have.
 */
export async function handleMockStart({ db, subject, section, source, config, now }) {
  if (!['I', 'II', 'full'].includes(section)) throw new ApiError(400, `section must be I, II or full`)
  if (!['bank', 'official'].includes(source)) throw new ApiError(400, `source must be bank or official`)
  const id = await db.startMock({ subject, section, started_at: now, proctored: 1, source })
  return {
    mock: id,
    section,
    source,
    timing: `${sectionMinutes(section, config.exam)} minutes`,
    rules: 'No hints, no notes, no going back to check answers. A mock only counts if it is run like the real thing.',
  }
}

/**
 * The share of a section a sitting has to actually cover before it is scored.
 *
 * Below this it is stored with no composite, which keeps it out of the qualifying
 * window entirely: three answers cannot stand in for a 42-question section, and
 * counting them as a logged proctored mock inflates the evidence trail.
 */
export const MIN_MOCK_COVERAGE = 0.9

/** How the bank labels the questions each half of an exam is made of. */
const PART_KIND = { mcq: 'mcq', frq: 'frq' }
const PART_NAME = { mcq: 'multiple choice', frq: 'free-response' }

/**
 * The halves a section is made of: [item kind, how many the real exam has of it].
 *
 * A section is not just a number of questions, it is a number of questions OF A
 * KIND, and that is the fact this file used to be missing. The selector filters a
 * sitting by topic and never by kind, so nothing anywhere connected `frq_count`
 * to whether the bank holds a single free-response item.
 */
function sectionParts(section, exam = {}) {
  const mcq = [PART_KIND.mcq, exam.mcq_count ?? (exam.mcq_no_calc_count != null || exam.mcq_calc_count != null
    ? (exam.mcq_no_calc_count ?? 0) + (exam.mcq_calc_count ?? 0)
    : null)]
  const frq = [PART_KIND.frq, exam.frq_count ?? null]
  if (section === 'I') return [mcq]
  if (section === 'II') return [frq]
  if (section === 'full') return [mcq, frq]
  return []
}

/** How many questions a section of this exam is expected to contain. */
function expectedQuestions(section, exam = {}) {
  const counted = sectionParts(section, exam).filter(([, n]) => n != null)
  return counted.length ? counted.reduce((total, [, n]) => total + n, 0) : null
}

/**
 * Why one half of a section cannot reach a composite, or null when it can.
 *
 * Deliberately worded to avoid the phrases the other unscored branches own
 * ("graded mechanically", "run against a clock", "short of the N% of the
 * section"): these are distinct reasons with distinct things to fix, and
 * gpt-instructions.md is checked against those markers.
 */
function partObstacle([kind, count], supply) {
  if (MODEL_GRADED.has(kind)) {
    return `its ${count} ${PART_NAME[kind]} question(s) are rubric-scored rather than mechanically marked, so they `
      + `cannot move readiness until the grader is calibrated`
  }
  const need = Math.ceil(count * MIN_MOCK_COVERAGE)
  const have = supply.get(kind) ?? 0
  if (have < need) {
    return `the bank holds ${have} exam-tested ${PART_NAME[kind]} question(s), short of the ${need} it takes to `
      + `cover the ${count} a sitting of it contains`
  }
  return null
}

/**
 * What a section can actually be scored on, measured against the bank rather
 * than against the exam table alone.
 *
 * THE DISTINCTION THIS DRAWS, and why the composite hangs off it:
 *
 * `expected` is what the REAL exam's section contains — a true fact about the
 * exam, and what the student should be told. `scorable` is how many of those
 * questions this system can actually put in front of him AND mark: the exam
 * table's count for each half of the section, but only for halves the bank can
 * supply and grade. Nothing checked that before, and both directions were
 * live defects:
 *
 *   sec=II claimed 4 (frq_count) while the bank holds ZERO free-response items.
 *   The selector filters by topic, not kind, so it served 4 multiple choice
 *   questions — 4 of 4, past MIN_MOCK_COVERAGE, composite 100, counted. Six
 *   such afternoons formed a COMPLETE qualifying window on 24 questions, which
 *   is the precise overstatement MIN_MOCK_COVERAGE was written to prevent.
 *
 *   sec=full claimed 46 while only 42 questions can be asked or marked, so a
 *   perfect paper scored 91.3 with 4 "blanks" it was never offered — three of
 *   them put max_blanks (1) out of reach and made `ready` unreachable that way.
 *
 * A section with NOTHING scorable gets no composite at all: that is the same
 * mechanism a sitting below MIN_MOCK_COVERAGE or one run without a clock
 * already goes through — recorded, disclosed, unable to move readiness — and
 * the answers are still kept as practice.
 *
 * @returns {{expected: number|null, scorable: number|null, obstacles: string[]}}
 *          `scorable` is null exactly when `expected` is (the exam table
 *          declares no count for this section, so there is nothing to measure
 *          against), and 0 when the section cannot be scored at all.
 */
function sectionScoring({ section, exam = {}, supply = new Map() }) {
  const parts = sectionParts(section, exam).filter(([, n]) => n != null)
  const expected = expectedQuestions(section, exam)
  if (!parts.length) return { expected, scorable: null, obstacles: [] }

  let scorable = 0
  const obstacles = []
  for (const part of parts) {
    const obstacle = partObstacle(part, supply)
    if (obstacle) obstacles.push(obstacle)
    else scorable += part[1]
  }
  return { expected, scorable, obstacles }
}

/** GET /mock/submit — close the sitting and score it from its own attempts. */
export async function handleMockSubmit({ db, mockId, config, configs = null, now }) {
  const m = await db.mock(mockId)
  if (!m) throw new ApiError(404, `unknown mock ${mockId}`)
  // Cheap early refusal for the ordinary replay. It is NOT the guard that makes
  // this safe — see the claim below.
  if (m.ended_at) throw new ApiError(409, `mock ${mockId} is already submitted`)

  // The sitting's own subject decides which standards apply, not the caller's `s`.
  const cfg = configFor({ subject: m.subject, config, configs })

  const ofThisMock = (rows) => rows.filter((a) => a.mock_id === Number(mockId))
  // Refused BEFORE the sitting is closed, so a mistaken submit on a sitting with
  // nothing in it leaves it open to be sat, rather than stranding it closed and
  // unscorable.
  if (!ofThisMock(await db.attempts(m.subject)).length) {
    throw new ApiError(409, `mock ${mockId} has no logged answers`)
  }

  // Close the sitting BEFORE reading the answers to be scored, with a conditional
  // UPDATE that reports whether it was this call that closed it.
  //
  // Both halves matter. The `if (m.ended_at)` above is a read-then-write with no
  // transaction available, so two concurrent submits both read the sitting as open
  // and both score it. And the close is what tells a concurrent /log that the
  // paper is in: reading the answers first left a window in which a first-time
  // /log filed an answer under a sitting whose composite had already been
  // computed, so readiness counted evidence the stored score never saw. Closing
  // first inverts that — an answer can only be filed under the mock while it is
  // open, so anything filed under it is already in the read below.
  if (!(await db.closeMock({ id: mockId, ended_at: now }))) {
    throw new ApiError(409, `mock ${mockId} is already submitted`)
  }

  const attempts = ofThisMock(await db.attempts(m.subject))

  // Composite counts only mechanically graded answers. Including model-graded or
  // unkeyed items would fold an ungraded zero into the score and understate it.
  const scored = attempts.filter((a) => a.graded_by === 'server')
  const right = scored.filter((a) => a.correct).length
  const ungraded = attempts.length - scored.length

  // What this section can actually be asked and marked from, read off the bank
  // rather than off the exam table alone. `expected` is what the real section
  // contains and is what he is told; `scorable` is what the composite may be
  // measured against. See sectionScoring for why they are not the same number.
  const [items, topics] = await Promise.all([db.items(m.subject), db.topics(m.subject)])
  const { expected, scorable, obstacles } = sectionScoring({
    section: m.section, exam: cfg.exam, supply: supplyOf({ items, topics }),
  })
  // A section with nothing scorable is not a paper this system can mark at all.
  const supplied = scorable == null || scorable > 0

  // Blanks count what the answer sheet would show, which is the same rule the
  // composite applies below: a question left empty and a question never reached
  // are both an unfilled bubble. Counting only the explicit ones let a 38-of-42
  // sitting report composite 90.5 (the 4 unreached scored as wrong) alongside
  // "0 blanks", so the max_blanks criterion was blind to exactly the four
  // questions the composite had just penalised — one fix, two stories.
  //
  // Measured against `scorable`, never against `expected`: a question the bank
  // cannot ask is not one he failed to reach. Counting the 4 free-response
  // questions of a full sitting as blanks put max_blanks (1) permanently out of
  // reach after three sittings, i.e. it made `ready` unreachable through sec=full.
  const unreached = scorable == null ? 0 : Math.max(0, scorable - attempts.length)
  const left = attempts.filter((a) => (a.response ?? '') === '').length
  const blanks = left + unreached

  // Three guards against three different false claims:
  //   1. `correct / answered` reads 100% on three questions out of 42, and six
  //      such sittings satisfy every composite criterion there is. A sitting that
  //      does not cover the section gets NO composite at all.
  //   2. Inside a sitting that does cover it, a question left unanswered is wrong,
  //      exactly as on the real exam. Dividing by what he happened to answer
  //      would quietly delete the ones he skipped.
  //   3. A section whose questions do not exist covers nothing, whatever it
  //      answered. sec=II counted 4 multiple choice answers as 4 of the 4
  //      questions "a section II sitting is expected to contain" and scored them
  //      100 — the coverage gate cannot do its job on a count the bank has no
  //      questions behind.
  const covered = scorable == null || attempts.length >= Math.ceil(scorable * MIN_MOCK_COVERAGE)
  const denominator = Math.max(scored.length, (scorable ?? 0) - ungraded)

  // The fourth guard: a sitting that was not run against a clock is not evidence
  // about how he performs under exam conditions, whatever it scores. See
  // MOCK_TIME_SLACK for the measurement and the reasoning behind the bar.
  const timing = sittingTiming({ section: m.section, exam: cfg.exam, attempts })
  const timed = !timing?.untimed

  const composite = supplied && covered && timed && denominator > 0 ? (right / denominator) * 100 : null

  // Answers of a kind this section does not contain, which is what an unsupplied
  // section is actually made of: reporting 4 multiple choice answers as "4 of the
  // 4 questions section II is expected to contain" IS the overstatement.
  const sectionKinds = new Set(sectionParts(m.section, cfg.exam).map(([kind]) => kind))
  const ofSection = attempts.filter((a) => sectionKinds.has(a.kind)).length

  const basis = []
  if (expected != null) {
    basis.push(ofSection === attempts.length
      ? `Answered ${attempts.length} of the ${expected} questions a section ${m.section} sitting is expected to contain.`
      : `Answered ${attempts.length} question(s), ${ofSection} of which are the kind a section ${m.section} sitting is `
        + `made of, against the ${expected} it is expected to contain.`)
  }
  if (ungraded) {
    basis.push(`${ungraded} response(s) need human or model grading and are excluded from the composite.`)
  }
  if (unreached) {
    const split = left ? ` (${left} left empty, ${unreached} never reached)` : ''
    // Only claim they counted as wrong when something was actually scored. On an
    // unscored sitting nothing was marked at all, and saying otherwise would be
    // its own small false statement.
    basis.push(composite == null
      ? `${unreached} question(s) were never reached, so the answer sheet shows ${blanks} blank(s)${split}.`
      : `${unreached} question(s) were never reached. Those count as blank AND as wrong, exactly as the real `
        + `answer sheet would read them, so the blank count is ${blanks}${split}.`)
  }
  // Every reason a sitting could not be scored is stated, because two of them can
  // be true at once: a short sitting that also took four hours is both, and
  // naming only one of them tells him to fix the wrong thing.
  if (composite == null) {
    if (!supplied) {
      basis.push(
        `A section ${m.section} sitting cannot be scored from this question bank at all: ${obstacles.join('; ')}. `
        + `This sitting is recorded but NOT scored and cannot count toward readiness. The answers stand as ordinary `
        + `practice — nothing is thrown away — but only a section the bank can both ask and mark can produce a composite.`,
      )
    }
    if (!covered) {
      basis.push(
        `That is short of the ${Math.round(MIN_MOCK_COVERAGE * 100)}% of the section a sitting has to cover, so this one is `
        + `recorded but NOT scored, and cannot count toward readiness. Practice sets are useful; they are not mocks.`,
      )
    }
    if (!timed) {
      basis.push(
        ...timingFindings(timing),
        `Work at that pace is untimed practice, not evidence about performance under exam conditions, so this `
        + `sitting is recorded but NOT scored and cannot count toward readiness. Nothing is thrown away — the answers `
        + `stand as ordinary practice, and pace is exactly what a mock is for — but a sitting has to be run against a `
        + `clock before it can move readiness. Re-sit one timed to turn this into a score.`,
      )
    }
    if (supplied && covered && timed) {
      basis.push('Nothing in this sitting could be graded mechanically, so it has no composite and cannot count toward readiness.')
    }
  } else {
    if (obstacles.length) {
      basis.push(
        `This composite is measured over the ${scorable} question(s) of the ${expected} a section ${m.section} sitting `
        + `contains that can actually be scored: ${obstacles.join('; ')}.`,
      )
    }
    basis.push(`Scored ${right} right out of ${denominator} — anything not answered counts as wrong, as on the exam.`)
    basis.push('Multiple choice only. Free response is scored separately and cannot move readiness until the grader is calibrated.')
  }

  await db.scoreMock({ id: mockId, composite_pct: composite, blanks })
  const ctx = await loadContext(db, m.subject, cfg)
  return {
    mock: Number(mockId),
    composite_pct: composite == null ? null : Number(composite.toFixed(1)),
    counted: composite != null,
    answered: attempts.length,
    expected,
    scored: scored.length,
    ungraded,
    blanks,
    basis: basis.join(' '),
    status: summarize({ ctx, now }),
  }
}

/**
 * Proctored sittings that were recorded and then not scored, with the reason.
 *
 * A sitting below MIN_MOCK_COVERAGE, one that was not run against a clock, or one
 * sat on a section the bank cannot supply, gets no composite, which keeps it out
 * of `proctored_mocks`, out of the qualifying window and out of every criterion —
 * so a genuine sitting where he reached 37 of 42 left no trace at all beyond
 * questions_answered. Running out of time is the single failure a mock exists to
 * expose, so it has to be reported rather than dropped. It still cannot be
 * scored: lowering the gate is what let three answers read as 100%.
 */
function unscoredSittings(ctx) {
  const out = []
  for (const m of ctx.mocks) {
    if (!m.proctored || !m.ended_at || m.composite_pct != null) continue
    const rows = ctx.attempts.filter((a) => a.mock_id === m.id)
    const { expected, scorable, obstacles } = sectionScoring({
      section: m.section, exam: ctx.config.exam, supply: ctx.supply,
    })
    const timing = sittingTiming({ section: m.section, exam: ctx.config.exam, attempts: rows })
    // A section the bank cannot supply was never scorable, whatever the clock or
    // the count says, so it is reported ahead of both.
    const unsupplied = scorable === 0 ? obstacles : null
    out.push({
      id: m.id,
      section: m.section,
      answered: rows.length,
      expected,
      scorable,
      // Four different reasons produce a null composite, and each has its own
      // thing to fix. Reported as one reason apiece, most fundamental first: a
      // sitting that was not run against a clock has no pace problem to work on
      // and no shortage of gradeable items to report — it was not a mock at all
      // — so saying "you ran out of time" or "nothing could be graded" about it
      // would be a false statement in its own right, exactly as saying either
      // about a fully-sat, fully-gradeable paper would be. And a section whose
      // questions do not exist has neither a pace nor a coverage problem: what
      // it answered was not that section's questions at all.
      unsupplied,
      untimed: !unsupplied && timing?.untimed ? timing : null,
      short: !unsupplied && !timing?.untimed && scorable != null
        && rows.length < Math.ceil(scorable * MIN_MOCK_COVERAGE),
    })
  }
  return out
}

/** The advisory that keeps an unscored sitting visible, in the words that fit it. */
function unscoredAdvisory(unscored) {
  const n = unscored.length
  const parts = [
    `${n} proctored sitting${n === 1 ? ' was' : 's were'} recorded but NOT scored, so ${n === 1 ? 'it is' : 'they are'} ` +
    `absent from the proctored mock count and from every readiness criterion.`,
  ]
  const unsupplied = unscored.filter((u) => u.unsupplied)
  if (unsupplied.length) {
    parts.push(
      `${unsupplied.map((u) => `#${u.id} (${u.answered} answered) was sat as section ${u.section}, which this question ` +
        `bank cannot be scored on: ${u.unsupplied.join('; ')}`).join('. ')}. Those answers stand as practice and ` +
      `nothing was deleted, but a section the bank cannot both ask and mark can never produce a composite, however ` +
      `many of these are sat.`,
    )
  }
  const untimed = unscored.filter((u) => u.untimed)
  if (untimed.length) {
    parts.push(
      `${untimed.map((u) => `#${u.id} answered ${u.answered}${u.expected == null ? '' : ` of ${u.expected}`} but ran ` +
        `${Math.round(u.untimed.elapsed_minutes)} minutes against a ${u.untimed.budget_minutes}-minute section` +
        `${u.untimed.over_item ? `, with one question alone taking ${Math.round(u.untimed.longest_item_seconds / 60)} minutes` : ''}`,
      ).join('; ')} — past the ${Math.round(MOCK_TIME_SLACK * 100) / 100}x of the budget a sitting may overrun and still ` +
      `count. Those answers stand as practice and nothing was deleted, but untimed work cannot be evidence about ` +
      `performance under exam conditions: re-sit one against a clock to turn it into a score.`,
    )
  }
  const short = unscored.filter((u) => u.short)
  if (short.length) {
    parts.push(
      `${short.map((u) => `#${u.id} reached ${u.answered} of ${u.scorable}`).join(', ')} — under the ` +
      `${Math.round(MIN_MOCK_COVERAGE * 100)}% of the section a scored sitting has to cover. Running out of time is ` +
      `exactly what a mock is for: treat that as a pace problem to work on, not as noise. Only a sitting that covers ` +
      `the section can produce a composite, so re-sit a full one to turn this into a score.`,
    )
  }
  const other = unscored.filter((u) => !u.short && !u.untimed && !u.unsupplied)
  if (other.length) {
    parts.push(
      `${other.map((u) => `#${u.id} (${u.answered} answered)`).join(', ')} had nothing that could be graded ` +
      `mechanically, so there was no composite to compute.`,
    )
  }
  return parts.join(' ')
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
  const daysLeft = daysToExam(ctx.config.exam_date, now)

  // The submit response says this once; the advisory is what makes it resurface.
  const unscored = unscoredSittings(ctx)
  const advisories = unscored.length ? [...r.advisories, unscoredAdvisory(unscored)] : r.advisories

  return {
    subject: ctx.config.display_name,
    readiness_pct: r.readiness_pct,
    ready: r.ready,
    goal: ctx.config.goal,
    exam_date: ctx.config.exam_date,
    days_to_exam: daysLeft,
    coverage: `${coverage.topics_drilled}/${coverage.topics_total} topics attempted`,
    questions_answered: ctx.attempts.length,
    proctored_mocks: ctx.mocks.filter((m) => m.proctored && m.composite_pct != null).length,
    next_thing_blocking: blocker ? `${blocker.label} — ${blocker.detail}` : null,
    open_gaps: openGaps,
    advisories,
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
    const readiness = computeReadiness({
      config, mocks: ctx.mocks, attempts: ctx.attempts, coverage, calibrated: false, now,
    })
    // The parent card lists scored mocks only, so an unscored sitting is invisible
    // there for the same reason it was invisible in the student's summary. Same
    // advisory, same wording, one surface fewer to be surprised by.
    const unscored = unscoredSittings(ctx)
    subjects.push({
      config,
      coverage,
      attempts: ctx.attempts,
      mocks: ctx.mocks,
      readiness: unscored.length
        ? { ...readiness, advisories: [...readiness.advisories, unscoredAdvisory(unscored)] }
        : readiness,
    })
  }
  return { subjects, now }
}
