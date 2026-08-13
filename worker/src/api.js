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

/**
 * Whole calendar days from a stored timestamp to `now`, in the exam's own zone.
 *
 * The same unit and the same zone as days_to_exam, deliberately: "9 days ago" and
 * "72 days to the exam" appear side by side on the parent's page, and two
 * different definitions of a day between them would make the pair not add up.
 */
function calendarDaysSince(then, now) {
  const from = EXAM_ZONE_CALENDAR.format(new Date(then))
  const to = EXAM_ZONE_CALENDAR.format(new Date(now))
  return Math.round((Date.parse(`${to}T00:00:00Z`) - Date.parse(`${from}T00:00:00Z`)) / 86400000)
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

/**
 * How many items the bank holds that a proctored paper may actually be drawn
 * from, i.e. exam-tested ones.
 *
 * Mirrors select.js's `isTested`, including its one deliberate quirk: with no
 * topic metadata at all nothing is excluded rather than everything. Used to say
 * WHY a sitting ran out of questions, so the number in the refusal is the same
 * one the selector was working from.
 */
function examTestedCount({ items = [], topics = [] }) {
  const tested = new Set(topics.filter((t) => t.tested_on_exam !== 0).map((t) => t.id))
  return tested.size ? items.filter((it) => tested.has(it.topic)).length : items.length
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
  const sitting = mockId == null ? null : await requireOpenMock({ db, mockId, subject })

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
  // The sitting's own questions-in-flight, which are unservable: select.js decides
  // a repeat from ATTEMPT rows, which do not exist until /log, so between /next and
  // /log a question is servable again as far as it can see — and two /next calls
  // inside one sitting handed out the same item, sequentially and (at 200/200)
  // concurrently. Both then logged cleanly, and two attempt rows for one question
  // are not two questions of evidence: a duplicate buys a 37-of-42 sitting past
  // MIN_MOCK_COVERAGE, and a duplicated CORRECT answer adds to the numerator
  // without adding to the denominator. db.recordServe closes the concurrent half
  // of the same hole inside the INSERT.
  const inFlight = mockId == null ? null : await db.openServeItems({ subject, mockId })

  // How much of the section this paper already holds, per half. A sitting is a
  // fixed number of questions OF A KIND and nothing used to bound it at either
  // (see sectionFill): the paper simply kept growing, and both the coverage claim
  // in its basis and the divisor its composite was taken over grew with it.
  //
  // A question that was handed out and not yet answered counts toward the bound —
  // it is on the paper, on screen — so the last question of a section cannot be
  // issued twice over. `inFlight` is every item this paper has been served
  // (db.openServeItems deliberately does not filter on `logged`), so the ones still
  // outstanding are the served items no attempt row has answered yet.
  //
  // This is still a read-then-write, so two simultaneous /next calls at the
  // boundary can put one answer more on the paper than the section holds;
  // handleMockSubmit's divisor is written to survive that rather than to assume it
  // cannot happen.
  const kindOf = new Map(ctx.items.map((it) => [it.id, it.kind]))
  const paperAttempts = ctx.attempts.filter((a) => Number(a.mock_id) === Number(mockId))
  const answeredIds = new Set(paperAttempts.map((a) => a.item_id))
  const paper = sitting == null ? null : sectionFill({
    section: sitting.section,
    exam: config?.exam,
    attempts: paperAttempts,
    inFlightKinds: (inFlight ?? []).filter((id) => !answeredIds.has(id)).map((id) => kindOf.get(id) ?? null),
  })

  if (paper?.full) {
    throw new ApiError(
      409,
      `mock ${mockId} already holds all ${paper.expected} question(s) a section ${sitting.section} sitting contains, so ` +
        `there is no further question to hand out: a paper cannot be longer than the section it is a sitting of, and an ` +
        `extra answer is not an extra question of evidence — it would be counted against a section that does not have ` +
        `it. Nothing was recorded. Submit it with submitMock to score what is on it.`,
    )
  }

  // Which halves of the exam this sitting is closed to. The selector filters by
  // topic and never by kind, so both of these have to be said here:
  //
  //   A half that is already COMPLETE. Without it a `full` sitting whose 42
  //   multiple choice questions are all answered goes on being served multiple
  //   choice — the 43rd, 44th, 45th and 46th answers silently standing in for the
  //   four free-response questions it never asked.
  //
  //   A half this section does not have AT ALL. Filtering on the full halves
  //   alone could not see this: a section I sitting has no frq part, so 'frq' was
  //   never in that set and a MULTIPLE CHOICE sitting could be handed a
  //   free-response question. It fills no half of the paper (sectionFill credits
  //   an answer only to its own kind's part), it is booked graded_by 'model' so
  //   nothing can mark it, and it comes off the composite's numerator for
  //   nothing. Section II inverted is the same defect: an mcq is not a
  //   free-response paper.
  //
  //   A kind that is no half of the EXAM at all. This clause used to be absent,
  //   with the reason written down: "every Precalc item is
  //   `constructed_model_graded`", so no such answer could ever be marked, so none
  //   could ever reach a composite, so leaving them servable cost nothing and kept
  //   timed practice available on a bank that cannot supply its own section (see
  //   handleMockStart). That premise died when the Precalc packs gained `kind: mcq`
  //   and a per-problem answer key: a keyed `constructed` item IS server-graded, and
  //   a 42-answer section I sitting made of 22 multiple choice questions and 20
  //   keyed short-answer drills passed the coverage gate and scored 100 — because
  //   `covered` counts attempts of any kind and `right` counted every server-graded
  //   answer on the paper. A drill is not a question section I contains, and it may
  //   not stand in for one.
  //
  // The allowance the dead premise was protecting survives, narrowed to the fact it
  // was justified by: while the bank holds not ONE question of any half this section
  // is made of, the sitting cannot produce a composite whatever is served on it
  // (sectionScoring gives every such half an obstacle, so `scorable` is 0 and
  // handleMockSubmit's `supplied` guard refuses the score and says so). Practice
  // under a clock is real work and is kept. The moment one exam-shaped question of
  // its own halves exists, the paper is drawn from those and nothing else.
  const examHalves = sectionParts('full', config?.exam).map(([kind]) => kind)
  const sittingHalves = new Set(sitting ? sectionParts(sitting.section, config?.exam).map(([kind]) => kind) : examHalves)
  const ownHalvesInBank = sitting == null
    ? 0
    : examTestedCount({ items: ctx.items.filter((it) => sittingHalves.has(it.kind)), topics: ctx.topics })
  const closed = new Set([
    ...(paper?.parts.filter((p) => p.full).map((p) => p.kind) ?? []),
    ...examHalves.filter((kind) => !sittingHalves.has(kind)),
    ...(ownHalvesInBank > 0 ? ctx.items.map((it) => it.kind).filter((kind) => !sittingHalves.has(kind)) : []),
  ])
  const unservable = paper == null ? null : [
    ...inFlight,
    ...(closed.size ? ctx.items.filter((it) => closed.has(it.kind)).map((it) => it.id) : []),
  ]

  const choice = pickNext({
    ...ctx,
    gaps: mockId ? [] : ctx.gaps,
    now,
    ...(mockId != null && { sampling: 'mock', mockId, excludeItemIds: unservable }),
  })
  if (!choice) {
    // WHAT NULL ACTUALLY MEANS, because this used to name a cause that cannot
    // produce it and a remedy that never works. select.js returns null only when
    // there is nothing left it MAY serve: every exam-tested item is either
    // already on this paper, in flight, or of a kind whose half of the section is
    // complete. It is NOT "everything is inside the no-repeat window" — when the
    // whole bank is inside that window the selector serves a labelled repeat
    // instead of nothing (its `repeating` branch), so that state never reaches
    // here. And waiting is not a remedy: the this-paper exclusion is
    // unconditional, so the identical call is refused a day, a month or a year
    // later. Reproduced on a fresh database: the first-ever Precalc sitting
    // served all 36 exam-tested items, and the 37th /next was told to wait.
    //
    // The word "wait" is deliberately absent below: the GPT relays this message
    // to the student mid-sitting, and it must not hand him an instruction that
    // cannot work.
    const done = paper?.parts.filter((p) => p.full) ?? []
    const owed = paper?.parts.filter((p) => !p.full) ?? []
    // Counted over the items this SECTION may draw from, not over the whole bank.
    // A section I paper cannot be handed the bank's free-response items at all, so
    // saying "all 286 exam-tested question(s) ... are on it already" of a 42-answer
    // paper would be untrue twice over — it is not 286 questions, and the ones it
    // never saw are not on it.
    const eligible = { ...ctx, items: ctx.items.filter((it) => !closed.has(it.kind)) }

    // NOTHING has been asked, so nothing can have been "asked already": this bank
    // cannot put a single question on this section. Its own sentence, because the
    // remedy is different in kind — not submit what is on the paper (there is no
    // paper), and not sit it differently, but content of that kind, which does not
    // exist yet. Reachable since a sitting may only draw from the halves its own
    // section has: a section II sitting on a bank with no free-response item used to
    // be quietly handed multiple choice instead.
    if (mockId != null && paper.parts.length && !paperAttempts.length && !inFlight.length) {
      throw new ApiError(
        409,
        `mock ${mockId} cannot be given a single question: a section ${sitting.section} sitting is ` +
          `${describeParts(paper.parts.map((p) => [p.kind, p.count]))}, and this bank holds ` +
          `${examTestedCount(eligible)} exam-tested question(s) it may put on that section. Nothing was recorded, and ` +
          `nothing is on the paper to submit. Only items of the kind(s) that section is made of can make it sittable; ` +
          `no other kind may stand in for them.`,
      )
    }
    const clauses = done.length
      ? [`its ${describeParts(done.map((p) => [p.kind, p.count]))} are all on it already`]
      : [`all ${examTestedCount(eligible)} exam-tested question(s) this bank can put on a section ${sitting?.section} ` +
         `paper for ${subject} are on it already, and no question may appear twice on one paper`]
    if (owed.length) {
      clauses.push(`the ${describeParts(owed.map((p) => [p.kind, p.count - p.answered]))} it still owes cannot be drawn ` +
        `from this bank`)
    }
    throw new ApiError(
      409,
      mockId == null
        ? `no question can be served for ${subject}: the bank holds ${ctx.items.length} item(s) and every one of them is ` +
          `excluded from this request.`
        : `mock ${mockId} has already been asked every question this bank can put on a section ${sitting.section} paper: ` +
          `${clauses.join('; and ')}. Nothing was recorded — submit it with submitMock and score what is on it. Only new ` +
          `items in the bank can make the next paper longer.`,
    )
  }

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
    // WHICH option he chose, as the grader read it — the misconception itself,
    // not just the fact of a miss. grade.js has always computed this and nothing
    // stored it, so every answer threw away the difference between "he does not
    // understand short-circuit evaluation" and "he misread the question". Null
    // whenever there was no option to record (a blank, an unreadable response, an
    // unkeyed item, model-graded work, any non-mcq item), never guessed.
    picked: verdict.picked ?? null,
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
  // The read above is a read-then-write, and D1 offers no transaction: a /taught
  // racing the /log that closes the gap — every endpoint is a GET ChatGPT may
  // retry — read it as open and then matched no row. Discarding the changed-row
  // count reported ok:true and promised a cold re-test of a gap an unaided correct
  // answer had already closed, which is the same false success the 404 above
  // exists to prevent.
  if (!(await db.markTaught({ subject, topic, taught_at: now }))) {
    throw new ApiError(
      404,
      `the open gap on "${topic}" for ${subject} closed before this lesson could be marked as delivered — an ` +
        `unaided correct answer got there first, so there is nothing left to re-test. Nothing was recorded.`,
    )
  }
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
 * WHY A PER-QUESTION CAP TOO, AND WHY ONE BREAK IS FORGIVEN: the total can stay
 * inside the budget while the paper is set down for an hour at a time — 41
 * answers at speed, then one question left open all evening. But what the server
 * can actually measure is the interval from a question being HANDED OUT to its
 * answer arriving, which is serve-to-answer latency and not time on task: fifty
 * minutes on the clock behind one question is a student who ate dinner just as
 * readily as one who looked the answer up, and nothing here can tell them apart.
 * So the cap is applied to PACE rather than to presence: the single longest
 * interval is forgiven outright, as the one break MOCK_TIME_SLACK is already
 * written to budget for, and the cap then falls on the longest interval that is
 * left. Half the section's entire budget on a second question, after a break has
 * already been allowed for, is not one interruption at any section shape (45
 * minutes of a 90-minute MCQ section, 45 of one Precalc FRQ set, 90 of a full
 * sitting) — it is an afternoon spent with the paper open. The total-time bar is
 * what still refuses a genuinely untimed sitting: a four-hour "90-minute
 * section" runs past its allowance whether the time went into one question or
 * forty-two.
 *
 * WHAT THAT DELIBERATELY LETS THROUGH, at the size it actually is: the question
 * the forgiven break was spent on may have been looked up rather than thought
 * about — and it is not only that one question. The cap on the interval that
 * follows is HALF the section's budget while the total-time bar allows one and a
 * half times it, so intervals at the cap stack MOCK_TIME_SLACK /
 * MAX_ITEM_SHARE_OF_BUDGET deep before anything refuses the sitting: at most 3
 * such intervals as these two constants stand, i.e. about 7.1 points of a
 * 42-question composite, not the 2.4 an earlier version of this comment claimed.
 * Measured: [45, 45, 45] minutes is 135 minutes exactly and is COUNTED, while a
 * fourth such interval runs the total past its allowance and is refused.
 * Intervals shorter than the cap are bounded by the total-time bar alone.
 *
 * WHY THE BARS STAY THERE ANYWAY, with the alternative measured rather than
 * assumed: capping the SUM of the non-forgiven intervals is what would make a
 * one-question claim true, and it throws out the honest sittings first. At the
 * real exam pace this config already states — 129 seconds a question on CSA — 42
 * questions of genuine work sum to 90 minutes of serve-to-answer intervals,
 * twice the cap, so every properly paced paper would be refused as untimed.
 * Discarding real work is the failure this campaign has hit three times, so the
 * exposure is disclosed instead of paid for that way. What still bounds it is the
 * total: the sitting, breaks included, has to fit inside 1.5x of the real budget.
 * worker/tests/api.test.js pins both the permitted run and the refused one
 * against these two constants, so this paragraph cannot drift from the
 * arithmetic.
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
 *          direction. Otherwise the measured interval, the two longest single
 *          answers, and whether either bar is past.
 */
function sittingTiming({ section, exam = {}, attempts = [] }) {
  const budget_minutes = sectionMinutes(section, exam)
  if (!budget_minutes) return null

  let firstServed = null
  let lastAnswer = null
  const spans = []
  for (const a of attempts) {
    const ts = Date.parse(a.ts)
    if (!Number.isFinite(ts)) continue
    const took = Number.isFinite(Number(a.seconds)) ? Math.max(0, Number(a.seconds)) : 0
    const served = ts - took * 1000
    if (firstServed == null || served < firstServed) firstServed = served
    if (lastAnswer == null || ts > lastAnswer) lastAnswer = ts
    spans.push(took)
  }
  if (firstServed == null) return null
  spans.sort((x, y) => y - x)

  const allowed_minutes = budget_minutes * MOCK_TIME_SLACK
  const item_cap_seconds = budget_minutes * 60 * MAX_ITEM_SHARE_OF_BUDGET
  const elapsed_minutes = (lastAnswer - firstServed) / 60000
  const over_total = elapsed_minutes > allowed_minutes
  // The single longest interval is the forgiven break; the cap falls on the next
  // one. See MOCK_TIME_SLACK: what is measured is how long a question sat on
  // screen, not how long he worked on it, so one long interval is exactly what
  // the slack is already written to cover.
  const break_seconds = spans[0] ?? 0
  const longest_item_seconds = spans[1] ?? 0
  const over_item = longest_item_seconds > item_cap_seconds
  // EVERY interval past the cap, not just the two longest. The pace clause named
  // spans[0] and spans[1] and then asserted "so the paper was put down twice",
  // which on [200, 60, 55] minutes is a count it had not measured: the paper was
  // put down at least three times.
  const long_item_seconds = spans.filter((s) => s > item_cap_seconds)
  return {
    budget_minutes, allowed_minutes, elapsed_minutes,
    break_seconds, longest_item_seconds, long_item_seconds, item_cap_seconds,
    over_total, over_item, untimed: over_total || over_item,
  }
}

/**
 * The measured facts behind an untimed verdict, as clauses that read in the
 * middle of a sentence.
 *
 * Shared by the submit basis and the advisory that resurfaces afterwards, so the
 * two surfaces cannot tell him different things about the same sitting. Each
 * clause is emitted ONLY for the bar it actually breached: the advisory used to
 * print the elapsed-versus-allowance sentence unconditionally, so a sitting
 * refused purely on the per-question rule was told its 118 minutes were "past
 * the 1.5x" of 90 — arithmetically false, about numbers he can check himself.
 */
function timingClauses(t) {
  const out = []
  if (t.over_total) {
    out.push(
      `its answers span ${Math.round(t.elapsed_minutes)} minutes from the first question being handed out to the ` +
      `last answer recorded, against the ${t.budget_minutes} minutes this section gets on the real exam — past the ` +
      `${Math.round(t.allowed_minutes)} minutes allowed for the ordinary overrun of sitting one at home`,
    )
  }
  if (t.over_item) {
    // The count and the intervals behind it are the MEASURED ones — every span
    // past the cap — because "the paper was put down twice" was a claim about a
    // number this function had not counted.
    const minutes = (t.long_item_seconds ?? []).map((s) => Math.round(s / 60))
    const n = minutes.length
    const list = n > 1 ? `${minutes.slice(0, -1).join(', ')} and ${minutes.at(-1)}` : `${minutes[0]}`
    out.push(
      `${n} of its questions sat unanswered for ${list} minutes — one break is forgiven, and ` +
      `${n === 2 ? 'the one interval left after that is' : `each of the ${n - 1} intervals left after that is`} more ` +
      `than half the ${t.budget_minutes} minutes the whole section gets, so the paper was put down at least ${n} times`,
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
  // Refused inside the INSERT (see db.startMock), so no interleaving can open a
  // paper over a sitting that holds an answer either. A sitting that was walked
  // away from has to be submitted — which scores whatever is on it, with the
  // reason — before another can be opened, or the abandoned one leaves no trace of
  // how it was going. An EMPTY open sitting deliberately blocks nothing: submit
  // refuses a paper with no answers, so blocking on one would deadlock the subject.
  const id = await db.startMock({ subject, section, started_at: now, proctored: 1, source })
  if (id == null) {
    // Only a sitting holding at least one ANSWER can be what blocked this, so the
    // refusal is written to name that sitting and how much is on it. An open
    // sitting with nothing on it does not block anything — see db.startMock for why
    // it must not.
    const [answers, mocks] = await Promise.all([db.attempts(subject), db.mocks(subject)])
    const open = mocks
      .filter((m) => !m.ended_at && answers.some((a) => a.mock_id === m.id))
      .sort((a, b) => new Date(a.started_at) - new Date(b.started_at))[0]
    const on = answers.filter((a) => a.mock_id === open?.id).length
    throw new ApiError(
      409,
      `mock ${open?.id} is a ${subject} sitting that was started${open?.started_at ? ` at ${open.started_at}` : ''} and `
        + `never submitted, with ${on} answer(s) on it, so a second one cannot be opened. Nothing was recorded. Submit `
        + `that one with submitMock and the same mock id — it will be scored from the answers already on it, and a short `
        + `or slow sitting is still recorded with the reason it could not count. Starting a fresh sitting instead would `
        + `leave those answers absent from the mock count and from every criterion, which is how a section that went `
        + `badly disappears.`,
    )
  }
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

/** `4 free-response question(s)`, for a refusal or a basis that has to name a half. */
function describeParts(pairs) {
  return pairs.map(([kind, n]) => `${n} ${PART_NAME[kind] ?? kind} question(s)`).join(' and ')
}

/**
 * How much of each half of a section a set of answers actually fills.
 *
 * A section is not a number of questions, it is a number of questions OF A KIND
 * (see sectionParts), and NOTHING used to hold a sitting to either bound. Two
 * live defects, one root:
 *
 *   A `full` CSA paper is 42 multiple choice plus 4 free-response. /next drew
 *   from all 218 mcq items with no cap at all, so the paper could be answered 46
 *   times — every answer multiple choice — and the basis then reported "Answered
 *   46 of the 46 questions a section full sitting is expected to contain": the
 *   free-response half claimed as sat, and never asked. That is the sec=II
 *   overstatement inverted, with extra mcq standing in for the frq half.
 *
 *   Answer it 50 times and the same sentence read "Answered 50 of the 46", while
 *   the composite's divisor (max(scored, scorable - ungraded)) climbed past the
 *   42 questions the sitting could actually be scored on — so `scored_out_of`
 *   and the sentence explaining it stated two different numbers.
 *
 * An answer fills only the part its OWN kind belongs to, and a part cannot be
 * filled past the number of questions the real exam has of it. Answers of a kind
 * the section does not contain fill nothing, which is what makes the basis
 * unable to claim a half that was never asked.
 *
 * @param {string[]} inFlightKinds  Kinds of the questions this paper has been
 *        handed but not yet seen answered. Counted toward `full` so a serve
 *        cannot be issued for a half that is already spoken for.
 * @returns {{parts: Array<{kind: string, count: number, answered: number,
 *          credited: number, full: boolean}>, credited: number, expected: number|null,
 *          full: boolean}}
 */
function sectionFill({ section, exam = {}, attempts = [], inFlightKinds = [] }) {
  const tally = (rows, key) => {
    const counts = new Map()
    for (const row of rows) counts.set(key(row), (counts.get(key(row)) ?? 0) + 1)
    return counts
  }
  const answeredOf = tally(attempts, (a) => a.kind)
  const flyingOf = tally(inFlightKinds, (k) => k)

  const parts = sectionParts(section, exam).filter(([, n]) => n != null).map(([kind, count]) => {
    const answered = answeredOf.get(kind) ?? 0
    return {
      kind, count, answered,
      credited: Math.min(answered, count),
      full: answered + (flyingOf.get(kind) ?? 0) >= count,
    }
  })
  const expected = expectedQuestions(section, exam)
  return {
    parts,
    credited: parts.reduce((total, p) => total + p.credited, 0),
    expected,
    // A paper cannot be longer than the section it is a sitting of, whatever the
    // kinds involved: this is what stops a sec=II sitting the bank cannot supply
    // (whose frq part therefore never fills) growing without limit.
    full: expected != null && attempts.length + inFlightKinds.length >= expected,
  }
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
 *   sec=II claimed 4 (frq_count) while the bank held ZERO free-response items.
 *   The selector filters by topic, not kind, so it served 4 multiple choice
 *   questions — 4 of 4, past MIN_MOCK_COVERAGE, composite 100, counted. Six
 *   such afternoons formed a COMPLETE qualifying window on 24 questions, which
 *   is the precise overstatement MIN_MOCK_COVERAGE was written to prevent.
 *
 *   sec=full claimed 46 while only 42 questions can be asked or marked, so a
 *   perfect paper scored 91.3 with 4 "blanks" it was never offered — three of
 *   them put max_blanks (1) out of reach and made `ready` unreachable that way.
 *
 * The bank now holds the free-response half (20 items), so section II can be
 * ASKED; it still cannot be MARKED, because every rubric item is model-graded and
 * the grader is not calibrated. That keeps `scorable` at 0 for section II and at
 * mcq_count for a full sitting, by a different clause of partObstacle — supply is
 * no longer what is missing there, marking is.
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
  // A sitting that was closed and SCORED is finished; replaying the submit must
  // not rescore it. But a sitting that was closed and never scored — the scoring
  // write died in the gap after the close, which is where the composite, the blank
  // count and a whole readiness recomputation happen, so a CPU kill lands there
  // preferentially — used to be refused here forever, stranding a real 42-question
  // sitting with no composite and no way to produce one. `blanks` is what tells
  // the two apart: db.scoreMock is its only writer, so a NULL there means the
  // score was never written, while a sitting that was scored and legitimately
  // produced no composite (short, untimed, unsupplied) still has a blank count.
  const scored_already = m.ended_at != null && (m.composite_pct != null || m.blanks != null)
  if (scored_already) throw new ApiError(409, `mock ${mockId} is already submitted`)
  const rescuing = m.ended_at != null

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
  // Both halves matter. The `if (scored_already)` above is a read-then-write with
  // no transaction available, so two concurrent submits both read the sitting as
  // open and both score it. And the close is what tells a concurrent /log that the
  // paper is in: reading the answers first left a window in which a first-time
  // /log filed an answer under a sitting whose composite had already been
  // computed, so readiness counted evidence the stored score never saw. Closing
  // first inverts that — an answer can only be filed under the mock while it is
  // open, so anything filed under it is already in the read below.
  //
  // A rescue skips this: the paper was handed in when it was handed in, and moving
  // ended_at would rewrite when the sitting ended. Its mutex is the conditional
  // scoring write instead, which is equally a single statement.
  if (!rescuing && !(await db.closeMock({ id: mockId, ended_at: now }))) {
    throw new ApiError(409, `mock ${mockId} is already submitted`)
  }

  const attempts = ofThisMock(await db.attempts(m.subject))

  // Composite counts only mechanically graded answers. Including model-graded or
  // unkeyed items would fold an ungraded zero into the score and understate it.
  const scored = attempts.filter((a) => a.graded_by === 'server')
  // Two different things used to be told as one. `ungraded` is everything the
  // composite cannot include, and the basis described the whole of it as needing
  // "human or model grading" — including the responses grade.js could not read as
  // one answer, which NO grader will ever look at: the serve is spent, the question
  // is gone, and /log has already told him the opposite ("I could not read that as
  // one answer ... send just the letter"). Two surfaces, the same two rows,
  // contradictory statements. The total is unchanged, so the divisor below is too.
  const unparsed = attempts.filter((a) => a.graded_by === 'unparsed').length
  const awaitingGrader = attempts.length - scored.length - unparsed
  const ungraded = awaitingGrader + unparsed


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

  // THE PAPER PROPER: the answers that are questions this section is made of.
  //
  // A section is a number of questions OF A KIND (see sectionParts), and every
  // number below this line is a claim about that section. An answer of any other
  // kind is work he did — it stays recorded, it stays in `answered`, `scored` and
  // `ungraded`, and it still counts as practice — but it is not one of the
  // section's questions, so it cannot fill the coverage this sitting is judged on,
  // cannot enter the composite's numerator, and cannot be one of the questions the
  // composite is divided by. Measured pre-fix on a bank of 42 keyed multiple choice
  // items and 20 keyed short-answer drills: a 42-answer section I sitting came back
  // counted:true, composite_pct:100, scored_out_of:42 having asked 22 of the
  // section's 42 multiple choice questions. That is this project's founding failure
  // — a number that means less than it says — reached through a different door.
  //
  // handleNext now refuses to serve such an item into a sitting whose own halves
  // the bank can supply, so on a paper assembled after this fix the two sets are
  // identical. This is not therefore belt and braces: a sitting can be OPEN with
  // drills already on it when the exam-shaped content lands, and from that moment
  // its paper is mixed. That paper is honestly refused a composite here, through
  // the coverage reason that already exists.
  //
  // Nothing is set aside when the exam table declares no count for this section:
  // there is no half to test a kind against, and `expected` and `scorable` are
  // null there too, so none of the arithmetic below can run anyway.
  const sectionKinds = new Set(
    sectionParts(m.section, cfg.exam).filter(([, n]) => n != null).map(([kind]) => kind),
  )
  const onSection = sectionKinds.size ? attempts.filter((a) => sectionKinds.has(a.kind)) : attempts
  const aside = attempts.length - onSection.length
  const asideKinds = [...new Set(
    attempts.filter((a) => !sectionKinds.has(a.kind)).map((a) => a.kind ?? 'unlabelled'),
  )].sort()
  const marked = onSection.filter((a) => a.graded_by === 'server')
  const right = marked.filter((a) => a.correct).length
  // The section's own answers that came back unmarkable, which is what comes off
  // the divisor. Counted over the paper proper for the same reason `right` is: a
  // drill nobody could mark is not one of the section's questions going unmarked.
  const unmarkable = onSection.length - marked.length

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
  const unreached = scorable == null ? 0 : Math.max(0, scorable - onSection.length)
  const left = onSection.filter((a) => (a.response ?? '') === '').length
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
  const covered = scorable == null || onSection.length >= Math.ceil(scorable * MIN_MOCK_COVERAGE)
  // The questions this sitting was actually scored against: the section's markable
  // questions, less the answers that came back unmarkable — and never fewer than
  // the answers that WERE marked, because a paper cannot be scored over fewer
  // questions than it had marked on it. handleNext bounds a paper at its section,
  // so the second term normally wins; the max is what keeps this honest when a
  // lost /next race puts one answer more on the paper than the section holds.
  //
  // Whatever it works out to, it is the ONLY divisor stated anywhere: the sentence
  // that explains the composite is derived from it below rather than from
  // `scorable`, which is how one string came to report a composite "measured over
  // the 42 question(s)" and then "Scored 40 right out of 43" — 95.2 and 93.0, two
  // divisors 2.2 points apart, about a number the student can check himself.
  const denominator = Math.max(marked.length, (scorable ?? 0) - unmarkable)

  // The fourth guard: a sitting that was not run against a clock is not evidence
  // about how he performs under exam conditions, whatever it scores. See
  // MOCK_TIME_SLACK for the measurement and the reasoning behind the bar.
  const timing = sittingTiming({ section: m.section, exam: cfg.exam, attempts })
  const timed = !timing?.untimed

  const composite = supplied && covered && timed && denominator > 0 ? (right / denominator) * 100 : null

  // How much of each half of the section these answers actually fill. A section is
  // a number of questions OF A KIND, so 46 multiple choice answers do not cover a
  // full sitting's 42 mcq + 4 frq, and 50 of them are not "50 of the 46": see
  // sectionFill, which does the counting for the serve path too.
  const fill = sectionFill({ section: m.section, exam: cfg.exam, attempts })

  const basis = []
  if (expected != null) {
    // The plain sentence only when the section has ONE half and every answer
    // counted toward it. Otherwise the halves are stated one by one, because that
    // is the only form that cannot claim a part which was never asked: a full CSA
    // paper made entirely of multiple choice reported "Answered 46 of the 46
    // questions a section full sitting is expected to contain" while zero of its
    // four free-response questions had been sat.
    basis.push(fill.parts.length === 1 && fill.credited === attempts.length
      ? `Answered ${attempts.length} of the ${expected} questions a section ${m.section} sitting is expected to contain.`
      : `Answered ${attempts.length} question(s) against the ${expected} a section ${m.section} sitting is expected to `
        + `contain, which fill it as `
        + `${fill.parts.map((p) => `${p.credited} of its ${p.count} ${PART_NAME[p.kind] ?? p.kind} question(s)`).join(' and ')}.`)
  }

  if (awaitingGrader) {
    basis.push(`${awaitingGrader} response(s) need human or model grading and are excluded from the composite.`)
  }
  if (unparsed) {
    basis.push(
      `${unparsed} response(s) could not be read as one answer, so nothing was graded on them and no grader is coming `
      + `for them either — they are excluded from the composite, and they were not counted wrong.`,
    )
  }
  // Answers of a kind this section does not contain, named as practice rather than
  // as a fault: he gave them, they are kept, and what they are not is questions
  // this section is made of. Stating the count is also what stops `answered` and
  // the halves sentence above reading as a contradiction — 42 answered, 22 of the
  // 42 multiple choice questions filled, and nothing to account for the other 20.
  //
  // Deliberately NOT a fifth reason a sitting goes unscored: it is a fact about the
  // paper, true whether or not a composite came out, and the reason such a paper
  // gets no composite is the coverage shortfall that already exists and already has
  // its own words. See the `composite == null` block below, whose branches are
  // counted from this source by worker/tests/openapi.test.js.
  if (aside) {
    basis.push(
      `${aside} of those answer(s) — ${asideKinds.join('/')} items — fill no half of a section ${m.section} paper, so `
      + `they count as ordinary practice and are left out of this sitting's coverage and its composite. Nothing he `
      + `answered was thrown away.`,
    )
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
        `The clock on this sitting does not read as exam conditions: ${timingClauses(timing).join('; and ')}.`,
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
      // Stated over the divisor the composite was ACTUALLY taken over, never over
      // `scorable`: the two differ whenever an answer came back unmarkable (42
      // markable questions, 4 unmarkable answers, so 38), and printing `scorable`
      // here put two divisors in one string. Both deductions are named, so the
      // number can be reconstructed rather than merely believed.
      const deducted = (scorable ?? denominator) - denominator
      basis.push(
        `This composite is measured over the ${denominator} question(s) of the ${expected} a section ${m.section} sitting `
        + `contains that this paper could be scored on: ${obstacles.join('; ')}`
        + (deducted > 0 ? `; and ${deducted} more of them came back as answers no grader can mark` : '')
        + (deducted < 0
          ? `; and this sitting logged ${-deducted} markable answer(s) more than the section has questions, every one `
            + `of which is in that divisor`
          : '')
        + `.`,
      )
    }
    basis.push(`Scored ${right} right out of ${denominator} — anything not answered counts as wrong, as on the exam.`)
    basis.push('Multiple choice only. Free response is scored separately and cannot move readiness until the grader is calibrated.')
  }

  // The scoring write is conditional on the sitting still being unscored, which is
  // what lets a rescue of a stranded sitting be safe: of two racing rescues
  // exactly one stores a composite, and the other is refused here rather than
  // overwriting it. On the ordinary path the close above already guaranteed this
  // caller is alone, so a 0 here means another request got in first either way.
  if (!(await db.scoreMock({ id: mockId, composite_pct: composite, blanks }))) {
    throw new ApiError(409, `mock ${mockId} was scored by another request`)
  }
  const ctx = await loadContext(db, m.subject, cfg)
  return {
    mock: Number(mockId),
    composite_pct: composite == null ? null : Number(composite.toFixed(1)),
    counted: composite != null,
    answered: attempts.length,
    expected,
    // The number composite_pct was ACTUALLY divided by, which is neither
    // `answered` nor `expected` and could not be recovered from either. A full
    // CSA sitting reported answered:42, expected:46, composite_pct:100, and the
    // only statement of the real divisor was a sentence inside `basis` — so a
    // model doing the arithmetic a fifteen-year-old would do reached 91.3 and
    // either contradicted the server or caveated a perfect paper. `expected`
    // stays the real section's size, because that is the true fact about the
    // exam; this is what the score was measured over. Null with the composite:
    // there was no division, and a 0 here would read as one.
    scored_out_of: composite == null ? null : denominator,
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
 * A sitting below MIN_MOCK_COVERAGE, one that was not run against a clock, one
 * sat on a section the bank cannot supply, or one whose scoring write never
 * landed, gets no composite, which keeps it out of `proctored_mocks`, out of the
 * qualifying window and out of every criterion — so a genuine sitting where he
 * reached 37 of 42 left no trace at all beyond questions_answered. Running out of
 * time is the single failure a mock exists to expose, so it has to be reported
 * rather than dropped. It still cannot be scored: lowering the gate is what let
 * three answers read as 100%. The one exception is the sitting that was never
 * scored at all, which is not a verdict but an unfinished write, and says so.
 */
function unscoredSittings(ctx) {
  const out = []
  for (const m of ctx.mocks) {
    if (!m.proctored || !m.ended_at || m.composite_pct != null) continue
    const rows = ctx.attempts.filter((a) => a.mock_id === m.id)
    const { expected, scorable, obstacles } = sectionScoring({
      section: m.section, exam: ctx.config.exam, supply: ctx.supply,
    })
    // Coverage is judged over the answers that ARE questions this section contains,
    // exactly as handleMockSubmit judges it, and the count printed below is that
    // same number. Judging on rows.length while the basis judged on the section's
    // own answers would put this surface and the submit basis one call apart on the
    // same sitting: "#7 reached 42 of 42" against "short of the 90%".
    const sectionKinds = new Set(
      sectionParts(m.section, ctx.config.exam).filter(([, n]) => n != null).map(([kind]) => kind),
    )
    const onSection = sectionKinds.size ? rows.filter((a) => sectionKinds.has(a.kind)) : rows
    const timing = sittingTiming({ section: m.section, exam: ctx.config.exam, attempts: rows })
    // Closed, and never scored at all: the scoring write died in the gap after the
    // close (see db.scoreMock, the only writer of `blanks`, so a NULL there means
    // it never ran). No verdict has been reached about this sitting yet, so every
    // OTHER reason would be an invention — a sitting with 42 mechanically graded
    // answers was disclosed as having "had nothing that could be graded
    // mechanically", which is the reason a Precalc paper gets, not this one.
    const unscored_write = m.blanks == null
    // A section the bank cannot supply was never scorable, whatever the clock or
    // the count says, so it is reported ahead of both.
    const unsupplied = !unscored_write && scorable === 0 ? obstacles : null
    // What a verdict WOULD say about the sitting that has not reached one.
    //
    // This is the one branch with no established verdict, and it used to sign off
    // with "Nothing is wrong with the sitting itself" — without consulting the
    // sectionScoring and sittingTiming results computed three lines above. A
    // stranded 10-of-42 sitting was therefore told to re-submit and that nothing
    // was wrong with it, and the advisory after the re-submit said "#7 reached 10
    // of 42 — under the 90%": two surfaces, one sitting, one call apart. The
    // unfinished write is still the state to report, and re-submitting is still
    // the way out, but what will happen then has to be said in the same breath.
    const still_fails = !unscored_write ? [] : [
      ...(scorable === 0 ? [`section ${m.section} cannot be scored from this question bank at all`] : []),
      ...(scorable > 0 && onSection.length < Math.ceil(scorable * MIN_MOCK_COVERAGE)
        ? [`it covers ${onSection.length} of ${scorable}, under the ${Math.round(MIN_MOCK_COVERAGE * 100)}% of the section a `
          + `scored sitting has to reach`]
        : []),
      ...(timing?.untimed ? ['its clock does not read as exam conditions'] : []),
    ]
    out.push({
      id: m.id,
      section: m.section,
      answered: rows.length,
      // How much of the section itself it reached: `answered` counts every answer
      // filed under the sitting, and on a paper that also holds work of a kind this
      // section does not contain those are two different numbers. The shortfall
      // advisory quotes this one, because it is the one the gate was applied to.
      on_section: onSection.length,
      gradeable: rows.filter((a) => a.graded_by === 'server').length,
      expected,
      scorable,
      still_fails,
      // Five different reasons produce a null composite, and each has its own
      // thing to fix. `unscored_write` and `unsupplied` are reported ALONE and
      // ahead of the rest: a sitting that was never scored has no established
      // verdict to report, and a sitting whose questions do not exist has neither
      // a pace nor a coverage problem — what it answered was not that section's
      // questions at all, so saying "you ran out of time" or "nothing could be
      // graded" about either would be a false statement in its own right. The
      // remaining reasons can hold at once and are each reported when they do —
      // see `short`.
      unscored_write,
      unsupplied,
      untimed: !unscored_write && !unsupplied && timing?.untimed ? timing : null,
      // Deliberately NOT suppressed by `untimed`: a 12-of-42 sitting that also
      // took four hours is short AND untimed, and a timed re-sit of 12 questions
      // still produces no composite. Suppressing one of the two told him to fix
      // the wrong thing, while the submit basis named both — two surfaces, one
      // sitting, contradictory instructions.
      short: !unscored_write && !unsupplied && scorable != null
        && onSection.length < Math.ceil(scorable * MIN_MOCK_COVERAGE),
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
  const unscored_write = unscored.filter((u) => u.unscored_write)
  if (unscored_write.length) {
    // "Nothing is wrong with the sitting itself" is claimed only when the gates it
    // has not been judged against yet would actually pass it. See `still_fails`.
    const doomed = unscored_write.filter((u) => u.still_fails?.length)
    parts.push(
      `${unscored_write.map((u) => `#${u.id} (${u.answered} answered, ${u.gradeable} of them mechanically gradeable) ` +
        `was closed but never scored — the scoring step did not finish`).join('. ')}. No answer was lost: submit it ` +
      `again with submitMock and the same mock id, and it will be scored from the answers already on it.` +
      (doomed.length
        ? ` That will not produce a composite, though: ${doomed.map((u) => `#${u.id} because ${u.still_fails.join(', and ')}`).join('; ')}. ` +
          `Submitting it again records that verdict rather than changing it — nothing is thrown away, and the answers ` +
          `stand as practice.`
        : ` Nothing is wrong with the sitting itself.`),
    )
  }

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
    // Named from the SAME clauses the submit basis uses, each emitted only for the
    // bar it actually breached. This surface used to state the elapsed span
    // against the allowance unconditionally, so a sitting refused purely on the
    // per-question rule was told its 118 minutes were past the 1.5x of 90 — false
    // arithmetic, riding on every response the student sees afterwards.
    const alsoShort = untimed.filter((u) => u.short).map((u) => `#${u.id}`)
    parts.push(
      `${untimed.map((u) => `#${u.id} answered ${u.answered}${u.expected == null ? '' : ` of ${u.expected}`}, but ` +
        `${timingClauses(u.untimed).join('; and ')}`).join('. ')}. ` +
      `Those answers stand as practice and nothing was deleted, but untimed work cannot be evidence about ` +
      `performance under exam conditions: re-sit one against a clock to turn it into a score` +
      // A sitting that is ALSO short does not become a score by being timed, so
      // the instruction cannot stop at the clock.
      (alsoShort.length
        ? `, though ${alsoShort.join(', ')} ${alsoShort.length === 1 ? 'has' : 'have'} to cover the section as well — ` +
          `a timed sitting that stops short still gets no composite.`
        : `.`),
    )
  }
  const short = unscored.filter((u) => u.short)
  if (short.length) {
    parts.push(
      // `on_section`, not `answered`: the gate was applied to the questions this
      // section is made of, so that is the number this sentence has to quote, and
      // where the two differ the difference is stated rather than left to look like
      // a miscount.
      `${short.map((u) => `#${u.id} reached ${u.on_section} of ${u.scorable}` +
        (u.answered > u.on_section
          ? ` (its other ${u.answered - u.on_section} answer(s) are of a kind a section ${u.section} paper does not ` +
            `contain, so they stand as practice and fill none of it)`
          : '')).join(', ')} — under the ` +
      `${Math.round(MIN_MOCK_COVERAGE * 100)}% of the section a scored sitting has to cover. Running out of time is ` +
      `exactly what a mock is for: treat that as a pace problem to work on, not as noise. Only a sitting that covers ` +
      `the section can produce a composite, so re-sit a full one to turn this into a score.`,
    )
  }
  const other = unscored.filter((u) => !u.short && !u.untimed && !u.unsupplied && !u.unscored_write)
  if (other.length) {
    parts.push(
      `${other.map((u) => `#${u.id} (${u.answered} answered)`).join(', ')} had nothing that could be graded ` +
      `mechanically, so there was no composite to compute.`,
    )
  }
  return parts.join(' ')
}

/**
 * How long the student may go without answering anything before the silence is
 * reported rather than left to look like a slow week.
 *
 * WHY SEVEN DAYS. Every spaced-review interval but the last two (16 and 35 days)
 * is shorter than a week, so at seven days everything he has ever missed and not
 * re-confirmed is overdue by construction — the schedule itself says so. It is
 * also a sixth of readiness.freshness_days (42), the point at which his most
 * recent mock stops counting at all, so a week is the largest gap that cannot
 * start eroding the evidence trail. And it is the unit a parent checks: a day or
 * two is a weekend, a week is a change of behaviour.
 *
 * The number below the threshold is still computed and still shown on the parent
 * page; what the threshold decides is when the student is TOLD.
 */
export const SILENCE_DAYS = 7

/**
 * How many timed multiple-choice answers it takes before a pace figure is treated
 * as a measurement, and how far over the exam's own pace it has to sit before the
 * student is told.
 *
 * PACE_SAMPLE_MIN = 10, because a median over two or three answers is noise, and
 * "not yet measurable" rather than a guess is this project's standing rule
 * everywhere else (see the pending criteria).
 *
 * PACE_OVER_MULTIPLE = 1.25, and it is not arbitrary. What the server can measure
 * is serve-to-answer latency, which includes reading the question in a chat
 * transcript and typing an answer — overhead the real exam does not have (the same
 * overhead MOCK_TIME_SLACK budgets 1.5x for across a whole sitting). A quarter of
 * the exam's per-question pace is 32 seconds on CSA's 129, generously more than
 * that overhead; and being 25% over the exam's own pace means a 42-question
 * section takes 113 minutes against the 90 it gets, i.e. he does not finish. Below
 * that bar the number is reported to the parent and no advisory is raised, so an
 * honest few seconds of chat overhead does not become a nag.
 *
 * PACE_WINDOW keeps the measurement about the present. Pace is a skill that
 * improves; a median over nine months would keep reporting September.
 */
export const PACE_SAMPLE_MIN = 10
export const PACE_OVER_MULTIPLE = 1.25
const PACE_WINDOW = 40

/** The middle value, which one abandoned question cannot drag. */
function median(xs) {
  const sorted = [...xs].sort((a, b) => a - b)
  const mid = Math.floor(sorted.length / 2)
  return sorted.length % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2
}

/**
 * The seconds the real exam allows for THIS question, or null when its config
 * says nothing.
 *
 * The two configs state it differently and both have to work: CSA has one
 * `pace_seconds_per_mcq`, Precalculus has separate no-calculator and calculator
 * paces (134 and 185), because its two multiple-choice parts are timed
 * differently. So the target is per QUESTION, from the item's own calc_allowed,
 * rather than one number per subject.
 */
function paceTargetSeconds(exam = {}, attempt = {}) {
  if (exam.pace_seconds_per_mcq != null) return exam.pace_seconds_per_mcq
  if (attempt.calc_allowed && exam.pace_seconds_calc != null) return exam.pace_seconds_calc
  return exam.pace_seconds_no_calc ?? null
}

/**
 * How fast he is actually answering, against the pace the exam allows.
 *
 * `pace_seconds_per_mcq` (and Precalc's two split values) sat in the configs and
 * were read NOWHERE in worker/src. Per-question `seconds` fed the total-time gate
 * and the per-item break cap, both of which are ADMISSION tests on a sitting —
 * they decide whether a mock counts — and neither is feedback. So a student could
 * clear every gate while being consistently half a minute a question too slow,
 * and never be told the one thing that would cost him the grade on the day.
 *
 * WHAT IS MEASURED, and what is left out. The median serve-to-answer time over his
 * most recent multiple-choice answers: median rather than mean because one
 * question left on screen over dinner is not his pace, and the timing gate already
 * judges those. Blanks are excluded (they take no time and would flatter him),
 * hinted answers are excluded (that interval contains a lesson), and non-mcq work
 * is excluded (a rubric question has no per-question pace). Both drills and
 * proctored answers count: pace is a habit, and a habit that only appears in
 * mocks is not one.
 *
 * @returns {null|object} null when nothing here can be measured — no timed mcq
 *          answers, or a config with no pace at all. `measured` says whether the
 *          sample is big enough to draw a conclusion from, `over` whether it is
 *          past the bar at which the student is told.
 */
function paceOf({ attempts = [], exam = {} }) {
  const usable = attempts.filter((a) => (
    a.kind === 'mcq'
    && !a.hints_used
    && (a.response ?? '') !== ''
    && Number.isFinite(Number(a.seconds)) && Number(a.seconds) > 0
    && paceTargetSeconds(exam, a) != null
  ))
  const recent = usable.slice(-PACE_WINDOW)
  if (!recent.length) return null

  const seconds = Math.round(median(recent.map((a) => Number(a.seconds))))
  const target = Math.round(median(recent.map((a) => paceTargetSeconds(exam, a))))
  const questions = expectedQuestions('I', exam)
  const budget_minutes = sectionMinutes('I', exam) || null
  const measured = recent.length >= PACE_SAMPLE_MIN
  return {
    n: recent.length,
    seconds,
    target_seconds: target,
    over_by_seconds: seconds - target,
    projected_minutes: questions ? Math.round((seconds * questions) / 60) : null,
    section_questions: questions,
    budget_minutes,
    measured,
    over: measured && seconds > target * PACE_OVER_MULTIPLE,
  }
}

/** The pace sentence the student reads. Only raised when `pace.over`. */
function paceAdvisory(pace) {
  const projection = pace.projected_minutes && pace.budget_minutes && pace.section_questions
    ? ` At that pace a ${pace.section_questions}-question section takes about ${pace.projected_minutes} minutes `
      + `against the ${pace.budget_minutes} minutes it gets, so you would run out of time before the end.`
    : ''
  return `Pace: the middle answer of your last ${pace.n} multiple-choice questions took ${pace.seconds} seconds, `
    + `against the ${pace.target_seconds} seconds one question gets on the real exam — ${pace.over_by_seconds} seconds `
    + `over.${projection} That measurement is from the server's own clock and includes reading the question here and `
    + `typing the answer, which the real exam does not, so a small overrun is expected and is not reported; this is `
    + `past that. Pace is trainable, and it is the one thing a mock cannot tell you after the fact.`
}

/** When he last answered anything, in the same calendar unit as days_to_exam. */
function lastAnswerOf(attempts, now) {
  let latest = null
  for (const a of attempts) {
    if (!a.ts) continue
    if (latest == null || new Date(a.ts) > new Date(latest)) latest = a.ts
  }
  if (latest == null) return null
  const days = calendarDaysSince(latest, now)
  // `stale` is decided HERE, against SILENCE_DAYS, so the parent page does not need
  // its own copy of the threshold to know when to say the card is out of date.
  return { at: latest, days, on: String(latest).slice(0, 10), stale: days >= SILENCE_DAYS }
}

/** The silence sentence. Only raised past SILENCE_DAYS. */
function silenceAdvisory(last) {
  return `Nothing has been recorded for ${last.days} days — the last answer was on ${last.on}. Every readiness number `
    + `below is therefore a snapshot of ${last.on} rather than of today, and ${last.days} days is longer than every `
    + `spaced-review interval but the last two, so everything previously missed is now overdue. Nothing here can tell `
    + `a planned break apart from having stopped: one answer puts the measurement back in the present.`
}

/** Every open gap with its age, so "a gap is open" can be told from "for two months". */
function openGapAges(gaps = [], now) {
  return gaps
    .filter((g) => !g.cleared_at)
    .map((g) => ({
      topic: g.topic,
      opened_at: g.opened_at,
      days_open: g.opened_at ? calendarDaysSince(g.opened_at, now) : null,
      taught: g.taught_at != null,
    }))
    .sort((a, b) => (b.days_open ?? 0) - (a.days_open ?? 0) || String(a.topic).localeCompare(String(b.topic)))
}

/**
 * Proctored sittings that were STARTED and never submitted, once they are older
 * than the section's own time budget.
 *
 * This was invisible everywhere. unscoredSittings skips a mock with no ended_at,
 * proctored_mocks counts only sittings with a composite, and nothing else looked
 * at the mocks table — so a section abandoned mid-paper left no trace on any
 * surface the student or parent sees, while every FINISHED failure mode (short,
 * untimed, unsupplied, unscored) produces a loud advisory. Start a section, see it
 * going badly, walk away, start another: a system built on refusing unearned
 * claims was silent about the one action that quietly discards evidence.
 *
 * THE THRESHOLD IS THE SECTION'S OWN BUDGET, and the wording is exactly that. Up
 * to it, an open sitting is a sitting in progress, which is not a thing to report;
 * past it the paper cannot still be being sat to time, whatever else is true. The
 * measurement is from started_at, which the server wrote itself.
 *
 * Refusing a SECOND open sitting on the same subject is the other half, and it
 * lives in db.startMock's statement — see handleMockStart.
 */
function unfinishedSittings(ctx, now) {
  const out = []
  for (const m of ctx.mocks) {
    if (!m.proctored || m.ended_at || !m.started_at) continue
    const budget_minutes = sectionMinutes(m.section, ctx.config?.exam)
    const open_minutes = Math.round((new Date(now) - new Date(m.started_at)) / 60000)
    if (!budget_minutes || !(open_minutes > budget_minutes)) continue
    out.push({
      id: m.id,
      section: m.section,
      started_at: m.started_at,
      answered: ctx.attempts.filter((a) => a.mock_id === m.id).length,
      open_minutes,
      budget_minutes,
    })
  }
  return out
}

/**
 * The sentence for a sitting that was started and never finished.
 *
 * Two shapes, because the remedy differs and neither may be stated about the other:
 * a sitting with answers on it has to be SUBMITTED (which scores whatever is on
 * it, with the reason, and is what unblocks the subject), while an EMPTY one cannot
 * be submitted at all — handleMockSubmit refuses a sitting with no logged answers —
 * and blocks nothing either. Telling him to submit an empty paper would be an
 * instruction that cannot work, which is the one thing these strings must not be.
 */
function unfinishedAdvisory(unfinished) {
  const n = unfinished.length
  const where = (u) => `#${u.id} (section ${u.section}, opened ${u.started_at}) has been open ${u.open_minutes} `
    + `minutes, past the ${u.budget_minutes} minutes section ${u.section} gets on the real exam`
  const sat = unfinished.filter((u) => u.answered > 0)
  const empty = unfinished.filter((u) => !u.answered)
  const parts = [
    `${n} proctored sitting${n === 1 ? ' was' : 's were'} started and never submitted.`,
    ...(sat.length
      ? [`${sat.map((u) => `${where(u)}, with ${u.answered} answer(s) on it`).join('; ')}. An unsubmitted sitting is `
        + `scored as nothing and counts as nothing: it is absent from the proctored mock count and from every `
        + `criterion, so walking away from a section leaves no record of how it was going. Submit it with submitMock `
        + `and it will be scored from the answers already on it — a short or slow sitting is still recorded, with the `
        + `reason. No new sitting on this subject can be started until it is submitted.`]
      : []),
    ...(empty.length
      ? [`${empty.map((u) => `${where(u)}, with no answers on it at all`).join('; ')}. There is nothing on it to `
        + `score, so it cannot be submitted and it blocks nothing — a new sitting can be started whenever he is ready. `
        + `It is reported only so that an open sitting is never something the record quietly forgets.`]
      : []),
  ]
  return parts.join(' ')
}

/**
 * Everything the summary and the parent page both need computed off one context,
 * so the two surfaces cannot describe the same evidence differently.
 */
function signalsOf({ ctx, now }) {
  return {
    unscored: unscoredSittings(ctx),
    unfinished: unfinishedSittings(ctx, now),
    pace: paceOf({ attempts: ctx.attempts, exam: ctx.config?.exam }),
    last_answer: lastAnswerOf(ctx.attempts, now),
    open_gaps: openGapAges(ctx.gaps, now),
  }
}

/** The advisories every surface raises, in the order they matter to the student. */
function signalAdvisories(signals) {
  return [
    ...(signals.unscored.length ? [unscoredAdvisory(signals.unscored)] : []),
    ...(signals.unfinished.length ? [unfinishedAdvisory(signals.unfinished)] : []),
    ...(signals.last_answer && signals.last_answer.days >= SILENCE_DAYS ? [silenceAdvisory(signals.last_answer)] : []),
    ...(signals.pace?.over ? [paceAdvisory(signals.pace)] : []),
  ]
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

  // The submit response says the unscored part once; the advisory is what makes it
  // resurface — along with everything else the recorded evidence says and no
  // number in this object can: a sitting left open, a fortnight of silence, a pace
  // that will not finish the paper. See signalsOf.
  const advisories = [...r.advisories, ...signalAdvisories(signalsOf({ ctx, now }))]

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
    // advisories, same wording, one surface fewer to be surprised by.
    const signals = signalsOf({ ctx, now })
    subjects.push({
      config,
      coverage,
      attempts: ctx.attempts,
      mocks: ctx.mocks,
      // The parent page is a SNAPSHOT with no dates on it, which is how six weeks
      // of silence came to look exactly like a hard week: the same 0%, the same
      // blocker, the same chips. These are what let it say when, and for how long.
      // Computed here rather than in dashboard.js, which renders and never derives.
      last_answer: signals.last_answer,
      pace: signals.pace,
      open_gaps: signals.open_gaps,
      unfinished_sittings: signals.unfinished,
      readiness: {
        ...readiness,
        // Every advisory is passed through verbatim so the two surfaces cannot word
        // the same judgement differently — EXCEPT the unfinished sitting, which this
        // card renders as a fact line of its own with the numbers laid out. The same
        // sitting stated twice on one page is noise, and the paragraph is written for
        // the student ("submit it with submitMock"), not for the parent reading a card.
        advisories: [...readiness.advisories, ...signalAdvisories({ ...signals, unfinished: [] })],
      },
    })
  }
  return { subjects, now }
}
