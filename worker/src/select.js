// What to ask next, and why.
//
// The selector is deterministic on purpose. Given the same history it makes the
// same choice — including when the bank arrives in a different order — so a
// disputed question can be replayed and explained. Every return value carries a
// `reason`, and the student reads it: api.js returns it as `/next`'s `why`, and
// gpt-instructions.md tells the tutor to tell him the `why`. (It does NOT reach
// the status view — `summarize` and `handleStatus` carry no reason field, only
// numbers and criteria.) He should never wonder why he is being asked something,
// and the reason must never claim more than the evidence supports.
//
// Priority order, highest first:
//   1. Re-test a taught gap cold. A gap closes only on an unaided correct answer.
//   2. Fill a coverage hole. A topic with no attempts is not a topic he knows.
//   3. Shore up the weakest topic, weighted by how much the exam cares.
//   4. Spaced review of something previously missed and now due.
//   5. Anything unseen, so the bank keeps moving.
//
// 3 and 4 are INTERLEAVED rather than strictly ordered: one ordinary-practice
// question in REVIEW_SHARE is reserved for a due review ahead of remediation,
// because a strict order starved review to the point of never running at all (see
// priority 4). The reserve is taken out of 3's share only — 1 and 2 keep theirs.
//
// "Weakest" is judged on RECENCY-WEIGHTED accuracy, not on lifetime accuracy: over
// a nine-month run a topic drilled to 100% in September still read 100% in May, so
// selecting on "below the floor" steered practice away from exactly the material
// he had had longest to forget. See topicStats.
//
// WHERE THE WEIGHTED FIGURE IS AND IS NOT SHOWN, precisely, because a looser
// version of this sentence has twice been read as a guarantee it is not. Every
// number COMPUTED BY readiness.js — the composite, mcq_overall, every per-unit
// floor, the parent dashboard — is the plain unweighted one, and readiness.js
// cannot see this module's weighting at all. But the weighted figure IS shown to
// the student, in the `reason` above: `statedPct` prints it, and it reaches him as
// `/next`'s `why`. That is deliberate — the number that chose the question is the
// number the sentence has to name — and it is only honest because `statedPct`
// never prints it alone: the lifetime figure, the answer count it rests on, and
// which way the weighting moved it all go in the same sentence.
//
// Each of those branches asks for a specific topic, and each draws from that
// topic's OWN pool: its never-asked items first, then its items whose reuse
// window has passed. A topic that has been used up must not fall through to a
// lower priority just because some other topic still has unseen items.
//
// Inside a proctored sitting (`sampling: 'mock'`) that order does not apply.
// Priorities 1, 3 and 4 are all remediation — they aim the paper at what he is
// worst at — and the exam he is preparing for is aimed at nothing. A sitting is
// sampled for breadth in proportion to exam weight instead, because the composite
// it produces is the only number that can move readiness. Four rules make that
// claim true rather than decorative:
//   - The whole paper is composed by that one rule, coverage holes included. A
//     coverage pass that runs FIRST orders by exam weight descending and walks
//     the heavy units until the paper is full, which shuts the lightest unit out
//     of the sitting entirely.
//   - The share is computed per UNIT, not per topic. exam_weight_low/high is a
//     unit weight replicated onto every topic row in that unit, so normalizing it
//     across topics gives a unit weight x topicCount — a 60% unit with one topic
//     loses to a 40% unit with three.
//   - It is apportioned over every exam-tested question this paper has not yet
//     asked, and freshness is decided AFTER the unit is chosen. Apportioning over
//     only the questions outside the reuse window instead makes that window a
//     filter on which UNITS may appear at all, and the selector works the heavy
//     units first, so theirs go stale first: seven days of ordinary CSA drilling
//     shut the heaviest unit on the exam out of the paper completely.
//   - It draws ONLY on material the exam tests, and refuses when that runs out.
//     Padding a paper from the class-only tiers puts material readiness
//     deliberately excludes into a composite that has no unit filter.
//
// The bank is FINITE, and that is a supply constraint, not an edge case. The 241
// seeded CSA items (221 mcq + 20 frq) at the ~50 answers a day db.js sizes itself
// for is five days of unique questions; a scored sitting needs 38 of them at once
// and readiness asks for six sittings. So this module has to answer "what do I
// serve when everything has been seen recently?", and the answer cannot be
// "nothing": refusing to serve turns into a 409 on every drill and every mock,
// i.e. the tutor stops working entirely for weeks. It serves the
// least-recently-seen item instead and SAYS, in the same `reason` the student
// reads, that this is a question he has already answered and therefore a memory
// check rather than fresh evidence. Two rules keep that honest: a repeat never
// displaces a fresh question WITHIN the pool being drawn from, and no item may
// appear twice on the SAME paper — the same question twice is not two questions of
// evidence, whatever the bank is short of.
//
// "Within the pool being drawn from" is the exact scope, and the qualifier is
// load-bearing. There are three pools, and the first is the default:
//   - Ordinary practice draws from the whole bank, so the rule is global: while
//     any item anywhere is outside the window, nothing inside it is served.
//   - Inside a sitting the pool is the topic the exam-weighted apportionment
//     landed on, so a unit whose own questions are all inside the window
//     contributes labelled repeats rather than nothing at all. The alternative is
//     a paper missing a unit, which is silent and scores him HIGH on the material
//     he skipped.
//   - On the RESERVED review slot the pool is the topic that has come due, for the
//     same reason and with the same labelling. Four of the five review intervals
//     are shorter than the reuse windows the configs ship, so a topic that comes
//     due on the early schedule has its own answered questions inside the window
//     by construction; under the global rule its due review was dropped in
//     silence. See serveReview. This is the ONLY place ordinary practice reaches
//     inside the window while something outside it exists, and it is bounded to one
//     question in REVIEW_SHARE.
//
// A degraded repeat is reported twice over: in the `reason` the student reads, and
// as `repeat: true` plus a `repeat_of` marker naming the earlier answer, which is
// the form a caller needs in order to store the distinction. See `serve()` for
// what api.js and db.js still owe that marker.

import { isServerGraded } from './grade.js'

const DAY_MS = 86400000

/**
 * Fallback no-repeat window, in days, when the subject's config names none.
 *
 * The right value is a property of the BANK, not of this code — roughly how long
 * the bank lasts at the volume the student actually drills at (the 241 seeded CSA
 * items at 10 a day is about three and a half weeks) — so it belongs in
 * worker/config/<subject>.json under readiness.reuse_days, where it can be sized
 * to the bank it governs. This constant only covers a config that has not said.
 * tools/build/validate.js re-states it, and a test fails if the two ever disagree.
 *
 * It is NOT the only thing a window has to be sized against. A window longer than
 * a review interval means a topic that comes due on that interval has its own
 * answered questions inside it, and every shipped window is longer than most of
 * the intervals — see serveReview, which is what stops that dropping the review.
 */
export const DEFAULT_REUSE_DAYS = 56

/** Days from `then` to `now`, positive when `then` is in the past. */
function ageDays(then, now) {
  return (new Date(now).getTime() - new Date(then).getTime()) / DAY_MS
}

/**
 * Whole CALENDAR days from `then` to `now`, in UTC. 0 means the same date.
 *
 * Elapsed hours are the wrong unit for the sentence the student reads. An answer
 * given at 20:00 yesterday is 16 hours old, and "you answered it today" about it
 * is a claim he can check and find false — which is the one thing the reason
 * must never be.
 */
function calendarDaysAgo(then, now) {
  return Math.floor(new Date(now).getTime() / DAY_MS) - Math.floor(new Date(then).getTime() / DAY_MS)
}

/** Expanding review intervals, in days, indexed by consecutive correct answers. */
const REVIEW_INTERVALS = [1, 3, 7, 16, 35]

export function reviewInterval(streak) {
  return REVIEW_INTERVALS[Math.min(streak, REVIEW_INTERVALS.length - 1)]
}

/**
 * How long an answer keeps half its weight, in days, in the accuracy that drives
 * SELECTION. No number readiness.js COMPUTES is weighted — the composite, every
 * per-unit floor and the dashboard are all plain unweighted percentages. The
 * weighted figure does reach the student, in this module's own `reason`, and never
 * without the lifetime figure beside it: see topicStats and statedPct.
 *
 * WHY THERE IS A HALF-LIFE AT ALL. Lifetime accuracy is the wrong question for
 * "what should he practise next?" over a nine-month run. A topic drilled to 100%
 * in September still read 100% in May, and because priority 3 selects on being
 * BELOW the floor, the selector then permanently stopped drilling exactly the
 * material he had had the longest to forget. That is not a missing feature; it is
 * study time routed away from the topics that need it most.
 *
 * WHY 30 DAYS. It is set against the schedule this module already runs on rather
 * than picked round: the spaced-review intervals top out at 35 days, so one
 * half-life is a little under the point at which the review schedule itself says
 * a topic is worth re-checking. Evidence from the previous month therefore counts
 * for about half, and September's work counts for about 0.4% by May — which is
 * the honest weight to put on "he could do this eight months ago".
 */
export const RECENCY_HALF_LIFE_DAYS = 30

/** How much of an answer still counts as evidence about today. 1 when just given. */
function recencyWeight(ts, now) {
  return 2 ** (-Math.max(0, ageDays(ts, now)) / RECENCY_HALF_LIFE_DAYS)
}

/**
 * Per-topic history: how many attempts, how many right, when it was last seen,
 * the current run of consecutive correct answers, and TWO percentages.
 *
 * `pct` is lifetime and unweighted — correct/n over the whole history. It is what
 * the module reports alongside the other one, and it is the shape every existing
 * consumer already expects.
 *
 * `recent_pct` is the same accuracy with each answer weighted by how long ago it
 * was given, and it is what SELECTION judges a topic on. Two properties make it
 * measure decay rather than merely re-describe the same ratio:
 *
 *   - Both halves of the fraction are weighted, so a topic whose answers are ALL
 *     equally old comes out at exactly its lifetime figure — PROVIDED they still
 *     weigh one answer's worth between them. Decay alone cannot move a ratio; the
 *     divisor floor below can, and does.
 *   - The divisor is therefore floored at ONE fresh answer's worth of weight.
 *     Below that the topic is scaled down in proportion to the evidence still
 *     standing: three right answers eight months ago carry 0.012 of an answer's
 *     worth of weight between them, so the topic reads ~1% rather than 100%. That
 *     floor is what makes "he has not touched this since September" visible, and
 *     it is why a topic he HAS worked recently is unaffected — one right answer
 *     today is a full answer's worth of weight, and still reads 100%. It is also
 *     why the bullet above is conditional: one correct and one wrong answer both
 *     60 days old weigh 0.5 between them, so that topic reads 25% against a
 *     lifetime 50% even though its two answers are the same age.
 *
 * WHAT THE FLOOR COSTS, recorded because it is a real consequence of a deliberate
 * choice and not a defect: it shrinks a low-confidence estimate toward 0%, not
 * toward a prior. So at equal exam weight a topic answered 3-for-3 eight months
 * ago (reads ~1%) outranks a topic answered 8 of 10 WRONG this morning (reads
 * 20%) — and keeps outranking it down to 7 of 10 wrong. The design goal, "go
 * re-prove old material", is defensible; encoding it as shrink-to-zero makes "you
 * have not proved this lately" strictly more urgent than "you demonstrably cannot
 * do this". A shrinkage estimator toward a prior mean would keep the decay and
 * order those two cases the other way round. NOT changed here: the formula is
 * documented to the digit in the bullets above and its worked example verifies,
 * so changing it is a design decision, not a fix.
 *
 * @param {string|null} now  The moment the weighting is relative to. Without it
 *        `recent_pct` is null rather than a number silently equal to `pct`: a
 *        recency-weighted percentage is a statement about a moment in time, and
 *        there is no honest value for it when no moment was given.
 */
export function topicStats(attempts, now = null) {
  const stats = new Map()
  // Only graded attempts carry a percentage or a streak; an ungraded one has no
  // verdict to record.
  const ordered = [...attempts].filter(isServerGraded).sort((a, b) => new Date(a.ts) - new Date(b.ts))
  for (const a of ordered) {
    if (a.topic == null) continue
    if (!stats.has(a.topic)) {
      stats.set(a.topic, { n: 0, correct: 0, streak: 0, last_ts: null, misses: 0, weight: 0, weighted_correct: 0 })
    }
    const s = stats.get(a.topic)
    s.n++
    if (a.correct) {
      s.correct++
      s.streak++
    } else {
      s.streak = 0
      s.misses++
    }
    if (now != null) {
      const w = recencyWeight(a.ts, now)
      s.weight += w
      if (a.correct) s.weighted_correct += w
    }
    s.last_ts = a.ts
  }
  for (const s of stats.values()) {
    s.pct = (s.correct / s.n) * 100
    s.recent_pct = now == null ? null : (s.weighted_correct / Math.max(1, s.weight)) * 100
  }
  return stats
}

/**
 * One ordinary-practice question in this many is reserved for a review that is
 * due, ahead of remediation. See the interleave below priority 3.
 */
export const REVIEW_SHARE = 3

/** Mean of a topic's [low, high] exam weight range, as a tie-breaker. */
function examWeight(topic, topicMeta) {
  const meta = topicMeta.get(topic)
  if (!meta) return 0
  const lo = meta.exam_weight_low ?? 0
  const hi = meta.exam_weight_high ?? lo
  return (lo + hi) / 2
}

/**
 * Choose the next item.
 *
 * @param {'mock'|null} sampling  'mock' samples a proctored sitting instead of
 *        teaching: the remediation priorities (1, 3, 4) are skipped and the WHOLE
 *        paper — coverage holes included — is drawn in proportion to exam weight,
 *        at unit granularity, over every exam-tested question this paper has not
 *        yet asked. Freshness is a preference inside the chosen topic, not a filter
 *        on which units may be sampled. `mockId` says which sitting, so the balance
 *        is measured over THIS paper rather than his whole history.
 * @param {number|null} reuseDays  Overrides readiness.reuse_days, for tests.
 * @param {Set<string>|string[]|null} excludeItemIds  Item ids that must not be
 *        served, whatever the pools say. This is the caller's window on serves it
 *        has handed out but not yet seen logged: an attempt row is the only thing
 *        this module can see, so without it two /next calls inside one sitting can
 *        hand out the same item. Removed from EVERY pool, in every branch,
 *        including the degraded-repeat path. Defaults to excluding nothing.
 * @returns {{item: object, reason: string, priority: string, conditions: string,
 *          repeat?: true, repeat_of?: {item_id: string, last_answered_at: string,
 *          days_since: number}}|null}
 *          `repeat: true` marks a question he has answered inside the no-repeat
 *          window, served because the pool it was drawn from had nothing fresher;
 *          `repeat_of` says which answer made it one — `days_since` in whole
 *          CALENDAR days, the same unit as the sentence in `reason`, so the two
 *          reports of that one fact cannot contradict each other. The `reason` says
 *          it in words too. null when there is no item left that this paper has not
 *          already asked — the bank being smaller than one sitting, which
 *          tools/build/validate.js fails the build over — or, inside a sitting, when
 *          the exam-tested bank is exhausted and the only thing left to serve would
 *          be off-syllabus.
 */
export function pickNext({
  items, attempts = [], gaps = [], topicMeta = new Map(), config, now, reuseDays = null,
  sampling = null, mockId = null, excludeItemIds = null,
}) {
  const inMock = sampling === 'mock'
  const reuseWindow = reuseDays ?? config?.readiness?.reuse_days ?? DEFAULT_REUSE_DAYS
  // `now` is what makes the accuracy in `stats` recency-aware: see topicStats.
  const stats = topicStats(attempts, now)
  // Coverage asks "has he tried this?", which an ungraded attempt still answers.
  const attempted = new Set(attempts.map((a) => a.topic))
  const excluded = excludeItemIds instanceof Set ? excludeItemIds : new Set(excludeItemIds ?? [])

  // An item answered recently is not evidence — he may just remember it.
  const lastSeen = new Map()
  for (const a of attempts) {
    const prev = lastSeen.get(a.item_id)
    if (!prev || new Date(a.ts) > new Date(prev)) lastSeen.set(a.item_id, a.ts)
  }
  /** When this item was last answered, as a number; -Infinity if never. */
  const seenAt = (it) => {
    const seen = lastSeen.get(it.id)
    return seen ? new Date(seen).getTime() : -Infinity
  }
  /**
   * Most-forgotten first, then exam weight, then id.
   *
   * Never-asked items sort ahead of every answered one, and among items that are
   * equally unseen this reduces to the exam-weight-then-id order the selector has
   * always used. It only starts to bite on a pool of reuse candidates, where the
   * question he is least likely to still remember is the only one that tells
   * anybody anything.
   */
  const byMostForgotten = (a, b) => seenAt(a) - seenAt(b)
    || examWeight(b.topic, topicMeta) - examWeight(a.topic, topicMeta)
    || a.id.localeCompare(b.id)

  // A question already on THIS paper is not servable at any price, however short
  // the bank is: asking it twice does not make it two questions of evidence, and
  // the composite this sitting produces is the only number that moves readiness.
  // An id the caller has already handed out is unservable for the same reason —
  // it is a question in flight that no attempt row has recorded yet.
  const thisPaper = new Set(
    inMock && mockId != null
      ? attempts.filter((a) => Number(a.mock_id) === Number(mockId)).map((a) => a.item_id)
      : [],
  )
  const servableAtAll = items.filter((it) => !thisPaper.has(it.id) && !excluded.has(it.id))

  const testedTopics = new Set(
    [...topicMeta.entries()].filter(([, m]) => m.tested_on_exam !== 0).map(([id]) => id),
  )
  const isTested = (topic) => testedTopics.size === 0 || testedTopics.has(topic)
  const onExam = (it) => isTested(it.topic)

  // Inside a sitting, exam-tested material is the whole world: a paper may not be
  // padded from the class-only corner of the bank, so that corner cannot count as
  // available either. Deciding the reuse window over the FULL bank would mean an
  // untouched unit 4 makes the bank look fresh while every question the sitting is
  // allowed to ask is inside the window — which read as "nothing servable" and
  // refused the second Precalc sitting at question one.
  const universe = inMock ? servableAtAll.filter(onExam) : servableAtAll
  /** Never answered, or answered long enough ago to be evidence again. */
  const isFresh = (it) => {
    const seen = lastSeen.get(it.id)
    return !seen || ageDays(seen, now) >= reuseWindow
  }
  const outsideWindow = universe.filter(isFresh)

  // The bank is worked through: nothing is outside the window. Serving a repeat
  // and labelling it beats serving nothing — a student who has answered
  // everything recently still needs practice, and a 409 gives him none.
  //
  // In ordinary practice this is decided GLOBALLY: while any item anywhere is
  // outside the window, a within-window item stays unservable, so a repeat can
  // never displace a fresh question. Inside a sitting that global rule cannot be
  // primary, because there it decides which UNITS may appear on the paper at all —
  // see the mock branch. `repeating` therefore says only whether the whole bank is
  // worked through, which is what the student-facing sentence in `serve` needs to
  // get right; whether a given serve is a repeat is a property of that ITEM.
  const repeating = !outsideWindow.length
  const servable = repeating ? universe : outsideWindow
  // Nothing left to ask. Outside a sitting that means the bank is smaller than one
  // paper. Inside one it also covers the exam-tested bank running out mid-paper,
  // which is the honest answer there: the lower class-only tiers exist so ordinary
  // practice never hits a 409, but handleMockSubmit scores every server-graded
  // answer in a sitting with no unit filter, so padding a paper from them puts
  // material readiness deliberately excludes straight into composite_pct. On
  // Precalc that was 6 of every 42 questions, on every sitting, under a reason
  // claiming the paper was weighted like the exam. A 409 he can act on beats a
  // quietly off-syllabus score.
  //
  // `universe` empty and `servable` empty are the same condition: `outsideWindow`
  // is a subset of `universe`, and `repeating` is exactly "that subset is empty".
  if (!universe.length) return null

  const unseen = servable.filter((it) => !lastSeen.has(it.id))
  /**
   * A choice, with the truth about reuse attached.
   *
   * Every return goes through here, so no branch can hand back a remembered
   * question dressed up as fresh evidence. The sentence lands in the `reason` the
   * status view and /next both show verbatim.
   *
   * The test is on the ITEM, not on whether the whole bank is worked through. In
   * ordinary practice the two coincide — nothing inside the window is servable
   * until everything is — but a sitting apportions the paper across units first
   * and prefers freshness inside the chosen topic, so it can reach for a
   * remembered question while other units still hold fresh ones. That is a real
   * trade (see the mock branch), and it is only an honest one if the question it
   * serves is labelled for what it is.
   *
   * The same fact also leaves in machine-readable form, as `repeat: true` plus a
   * `repeat_of` marker naming the earlier answer. Prose alone cannot be acted on,
   * and right now nothing acts on it: handleNext does not forward the flag,
   * recordAttempt stores no column for it, and handleMockSubmit counts a
   * remembered answer into composite_pct identically to a first-time one — so a
   * sitting made entirely of repeats can still qualify a student for the exam.
   * Closing that needs two changes outside this module:
   *   - api.js: forward `choice.repeat` / `choice.repeat_of` from handleNext onto
   *     the /log path, and exclude repeats from the scored set in
   *     handleMockSubmit (they are still attempts, and still practice — they are
   *     just not evidence about what he can do on an unseen question).
   *   - db.js: persist it, e.g. `attempts.is_repeat INTEGER NOT NULL DEFAULT 0`
   *     plus the prior answer's timestamp, so the exclusion is derivable from the
   *     stored row rather than re-derived from a reuse window that may since have
   *     been re-sized.
   */
  const serve = (choice) => {
    const seen = lastSeen.get(choice.item.id)
    if (!seen || ageDays(seen, now) >= reuseWindow) return choice
    const days = calendarDaysAgo(seen, now)
    const when = days <= 0 ? 'earlier today' : days === 1 ? 'yesterday' : `${days} days ago`
    // Only claim the whole bank is used up when it is. Inside a sitting the
    // shortage can be local to the topic the apportionment landed on, and telling
    // him the bank is empty when three other units still hold fresh questions is
    // a claim he can check and find false.
    const shortage = repeating
      ? 'the bank has nothing left that you have not already seen'
      : `every question left on ${choice.item.topic} is one you have answered recently`
    return {
      ...choice,
      repeat: true,
      // Whole CALENDAR days, the same unit as the sentence right beside it. These
      // are two reports of ONE fact — the human-readable one the student reads and
      // the machine-readable one a caller persists — and they may not disagree.
      // Fractional elapsed days made them: an answer given 16 hours ago is
      // `days_since: 0.667`, which a caller renders as "today" while the reason
      // says "yesterday". One of those is false whichever the student is shown.
      repeat_of: { item_id: choice.item.id, last_answered_at: seen, days_since: days },
      reason: `${choice.reason} You have answered this exact question before — you answered it ${when}, and ` +
        `${shortage}, so getting it right here is a memory check rather than fresh evidence.`,
    }
  }

  /**
   * The servable items for ONE topic, out of `pool`: its never-asked ones when it
   * still has any, then the ones whose reuse window has passed, and only then its
   * most-forgotten ones.
   *
   * Keyed on the topic itself, never on whether some OTHER topic still has
   * unseen items — a topic whose whole pool has been consumed has to stay
   * reachable, or the branch asking for it is silently skipped and the student
   * is sent somewhere he did not need to go. Sorted so that replaying the same
   * history picks the same item however the bank was ordered.
   *
   * `pool` defaults to `servable`, where the reuse decision has already been taken
   * globally and the second tier is therefore everything. A sitting passes
   * `universe` instead and relies on all three tiers, which is what keeps "a repeat
   * never displaces a fresh question" true of the pool actually being drawn from.
   */
  const poolFor = (topic, pool = servable) => {
    const own = pool.filter((it) => it.topic === topic)
    const never = own.filter((it) => !lastSeen.has(it.id))
    if (never.length) return never.sort((a, b) => a.id.localeCompare(b.id))
    const reusable = own.filter(isFresh)
    return (reusable.length ? reusable : own).sort(byMostForgotten)
  }

  /**
   * Everything servable when no particular topic is being asked for: on-exam
   * never-asked items first, then on-exam reusable ones, and only then class-only
   * material. Non-empty whenever `servable` is, which is checked above.
   *
   * Only ordinary practice reaches this, and the class-only tiers are the reason:
   * a drill has to hand back something rather than a 409, and any question beats
   * none. A sitting is scored, so it draws on `servable` directly, which inside a
   * mock already holds exam-tested material only.
   */
  const breadthPool = () => [unseen.filter(onExam), servable.filter(onExam), unseen, servable].find((p) => p.length)

  // 1. A gap that has been taught but never re-tested cold. Oldest first, so a
  //    long-open gap is not starved by a newer one. Deliberately not filtered by
  //    exam weight: a gap opens on any topic he misses twice, and it only closes
  //    on a cold correct answer on that same topic, so skipping class-only
  //    topics here would leave those gaps open forever.
  //
  //    Skipped inside a sitting: the real exam does not re-test his gaps.
  const openedAt = (g) => {
    const t = new Date(g.opened_at).getTime()
    return Number.isNaN(t) ? Infinity : t
  }
  const toRetest = inMock ? [] : gaps
    .filter((g) => g.taught_at && !g.cleared_at)
    .sort((a, b) => openedAt(a) - openedAt(b) || a.topic.localeCompare(b.topic))
  for (const g of toRetest) {
    const pool = poolFor(g.topic)
    if (pool.length) {
      return serve({
        item: pool[0],
        priority: 'gap_retest',
        conditions: 'cold',
        reason: `Re-testing ${g.topic} cold, with no hints, to confirm the explanation actually landed. This gap stays open until you get one right unaided.`,
      })
    }
  }

  // 2. A topic he has never attempted.
  //
  //    Skipped inside a sitting, and NOT because coverage is remediation — it is
  //    not, and a sitting does still fill a coverage hole. It is skipped here
  //    because this branch orders by exam weight DESCENDING and returns as soon
  //    as it finds anything, so on a bank where most topics are untouched it
  //    composes the entire paper on its own: heaviest unit until its items run
  //    out, then the next, and the lightest unit never gets a question at all. On
  //    the real CSA bank that gave the first mock of his life 40.5% unit 4, 28.6%
  //    unit 2, 31.0% unit 1 and 0.0% unit 3 — a fifth of the exam missing from
  //    the only measurement that moves readiness. The mock branch below fills the
  //    same holes through the weight-proportional ranking instead, and labels the
  //    pick `coverage` when the topic it lands on has never been attempted.
  const coverageReason = (topic) =>
    `First question on ${topic}. Until you have attempted it, it does not count as covered.`
  const untouched = inMock ? [] : unseen.filter((it) => onExam(it) && !attempted.has(it.topic))
  if (untouched.length) {
    untouched.sort((a, b) => examWeight(b.topic, topicMeta) - examWeight(a.topic, topicMeta) || a.id.localeCompare(b.id))
    const pick = untouched[0]
    return serve({
      item: pick,
      priority: 'coverage',
      conditions: 'cold',
      reason: coverageReason(pick.topic),
    })
  }

  // Everything below this line is remediation, and a proctored sitting must not
  // remediate. Priorities 3 and 4 aim the paper at his weakest topics and his
  // overdue reviews; the real AP exam is aimed at neither, so a sitting that is
  // aimed there scores him lower than the exam would — while /mock/start tells him
  // "a mock only counts if it is run like the real thing." The composite is the
  // only number that moves readiness, which is what makes this the one place where
  // aiming at a weakness does harm. Coverage (2, above) stays: a topic he has
  // never attempted is part of the paper, not a weakness being chased.
  if (inMock) {
    // The paper is apportioned over `universe`: ALL exam-tested material this
    // sitting has not already asked, whether or not it is inside the reuse window.
    // Freshness is decided AFTER the unit is chosen, by poolFor, which prefers a
    // never-asked question, then one whose window has passed, then the most
    // forgotten.
    //
    // Gating the apportionment on the reuse window instead — sampling only from
    // `servable` — turns a freshness preference into a filter on which UNITS may
    // appear on the paper at all, because the selector works the heavy units first
    // and their items therefore cross into the window first. On the real CSA bank
    // at 20 answers a day, seven days of ordinary drilling left unit 4 with 0 items
    // outside a 28-day window and 88 inside, while units 1-3 still held fresh ones:
    // the 38-question sitting came out u1 31.6% / u2 47.4% / u3 21.1% / u4 0.0%
    // against entitlements of 20.2 / 30.3 / 14.1 / 35.4, and two days later
    // 57.9 / 0.0 / 42.1 / 0.0. handleMockSubmit scores the whole paper into
    // composite_pct with no unit filter, so a student who could do units 1-3 and
    // not unit 4 — worth 72 on the real weighting, a clear fail — scored 89.5 and
    // cleared composite_floor_min on a paper that never asked the unit he cannot do.
    // Overstating readiness is the one failure this project cannot ship.
    //
    // The trade is deliberate and it is the cheaper one: a remembered question is
    // still practice, it is labelled a repeat in the `reason` and in `repeat_of`,
    // and a caller can exclude it from the score. A unit missing from the paper is
    // silent and inflates the only number that moves readiness.
    const topics = [...new Set(universe.map((it) => it.topic))]

    // Exam weight is a property of the UNIT. The bank replicates a unit's weight
    // onto every topic row inside it, so normalizing across TOPICS yields a share
    // proportional to weight x topicCount: on a 60%-one-topic against a
    // 40%-three-topic bank, the 60% unit took 13 of 40 questions.
    //
    // A topic row that names no unit stands alone: with nothing to group it with,
    // its weight really is its own.
    const unitOf = (topic) => {
      const unit = topicMeta.get(topic)?.unit
      return unit == null ? `topic:${String(topic)}` : `unit:${String(unit)}`
    }
    const unitTopics = new Map()
    for (const topic of topics) {
      if (!unitTopics.has(unitOf(topic))) unitTopics.set(unitOf(topic), [])
      unitTopics.get(unitOf(topic)).push(topic)
    }
    // The replicated weight is the same on every row of a unit; the maximum is
    // taken so that one malformed row cannot silently zero a unit out of the paper.
    const unitWeight = new Map(
      [...unitTopics].map(([unit, own]) => [unit, Math.max(...own.map((t) => examWeight(t, topicMeta)))]),
    )
    const total = [...unitWeight.values()].reduce((n, w) => n + w, 0)
    /** The share of the paper a unit's exam weight entitles it to. */
    const share = (unit) => (total > 0 ? unitWeight.get(unit) / total : 1 / unitTopics.size)

    // How much of THIS sitting each unit and each topic has taken so far, keyed on
    // the mock id so a term of ordinary drilling cannot distort the paper. The unit
    // comes from the topic row rather than the attempt's own `unit` column, so that
    // the tally and the entitlement are counted the same way.
    const askedInUnit = new Map()
    const askedOnTopic = new Map()
    let asked = 0
    for (const a of attempts) {
      if (a.mock_id == null || mockId == null || Number(a.mock_id) !== Number(mockId)) continue
      askedInUnit.set(unitOf(a.topic), (askedInUnit.get(unitOf(a.topic)) ?? 0) + 1)
      askedOnTopic.set(a.topic, (askedOnTopic.get(a.topic) ?? 0) + 1)
      asked++
    }

    // Apportion the paper across UNITS first, and only then choose a topic inside
    // the unit that is owed a question. Apportioning across topics — even after
    // dividing a unit's entitlement among its own topic rows — cannot be made to
    // track the exam at this paper length: 53 CSA topics against 42 questions
    // leaves every topic owed about half a question, and which halves round up
    // then depends on how many topic rows a unit happens to carry. It gave unit 1
    // four of 42 against the 20.2% it is entitled to. Four units against 42
    // questions rounds to within half a question of the real weighting.
    //
    // Deterministic, like every other branch — no RNG anywhere — so a disputed
    // sitting replays question for question. Keys are stringified because an item
    // may carry a NULL topic, and a bank defect must not crash the sitting.
    //
    // Two units owed the same share AND carrying the same exam weight are
    // interchangeable as far as the sample is concerned, and the order between them
    // used to fall through to the unit's NAME, which is arbitrary. Break that tie
    // on evidence quality instead: the unit that can still supply a never-asked
    // question goes first. It cannot distort the paper — the loser is owed exactly
    // as much and takes the next question — and it stops the paper serving a
    // remembered question ahead of a fresh one it could have had for nothing.
    const unitsWithNeverAsked = new Set(
      universe.filter((it) => !lastSeen.has(it.id)).map((it) => unitOf(it.topic)),
    )
    const [nextUnit] = [...unitTopics.keys()]
      .map((unit) => ({ unit, owed: share(unit) * (asked + 1) - (askedInUnit.get(unit) ?? 0) }))
      .sort((a, b) => b.owed - a.owed
        || unitWeight.get(b.unit) - unitWeight.get(a.unit)
        || Number(unitsWithNeverAsked.has(b.unit)) - Number(unitsWithNeverAsked.has(a.unit))
        || a.unit.localeCompare(b.unit))

    // Inside the unit, spread across its topics: the one this paper has asked
    // least, then by name. Not by exam weight — every topic row in a unit carries
    // the same replicated weight, so that comparison could never decide anything.
    const [nextTopic] = unitTopics.get(nextUnit.unit)
      .map((topic) => ({ topic, n: askedOnTopic.get(topic) ?? 0 }))
      .sort((a, b) => a.n - b.n || String(a.topic).localeCompare(String(b.topic)))

    const item = poolFor(nextTopic.topic, universe)[0]
    // A topic with no attempts behind it is a coverage hole wherever it turns up,
    // and saying so is more use to the student than the generic sampling sentence.
    // What has changed is only which topic gets asked: the apportionment above
    // chose it out of every unit the exam tests, so no unit can be walked past.
    if (!attempted.has(nextTopic.topic)) {
      return serve({
        item,
        priority: 'coverage',
        conditions: 'proctored_mock',
        reason: `${coverageReason(nextTopic.topic)} It comes up now because this sitting is drawn to spread across ` +
          `the paper the way the exam weights it.`,
      })
    }
    return serve({
      item,
      priority: 'mock_breadth',
      conditions: 'proctored_mock',
      reason: `Mock question on ${nextTopic.topic}, drawn to keep this sitting spread across the paper the way the ` +
        `exam weights it. A mock aimed at your weak spots would score you lower than the real exam will.`,
    })
  }

  // 3. The weakest topic that matters most. Ranked by shortfall against the
  //    per-unit floor, scaled by exam weight, so a weak heavily-tested topic
  //    outranks a weak footnote.
  //
  //    Judged on RECENT accuracy, not lifetime accuracy. See topicStats: over a
  //    nine-month run the lifetime figure keeps saying 100% about a topic he last
  //    saw in September, and because this branch selects on being BELOW the floor,
  //    that permanently steered practice away from the material with the longest
  //    time to decay. The reported percentages — every number in readiness.js, the
  //    status view and the dashboard — are unweighted and unchanged; this is the
  //    selector's own view of what he can do TODAY.
  const floor = config?.readiness?.per_unit_min ?? 70
  /** The accuracy selection judges a topic on; falls back to lifetime with no clock. */
  const held = (s) => s.recent_pct ?? s.pct
  /**
   * How a topic's accuracy is stated to the student.
   *
   * Both numbers, whenever they differ. The recency-weighted one is the one that
   * chose the question, so it has to be the one in the sentence — but a student
   * who has 100% of this topic's answers right can check "3%" and find it false,
   * and a reason he can catch out is worse than no reason. So the sentence says
   * what the number is, and what the raw record says, and why they differ.
   *
   * WHICH WAY they differ is part of that, and it is not a constant. `recent_pct`
   * is below `pct` when the topic has decayed, and ABOVE it whenever the misses
   * are older than the correct answers — which is the shape of every topic he has
   * pulled up, and which recency weighting guarantees for it. The sentence used to
   * say "weighted down" unconditionally: on the real CSA bank at 8 answers a day,
   * 133 of the reasons served in 90 days named a figure HIGHER than the lifetime
   * one and called it that lifetime figure weighted down. 72 is not 40 weighted
   * down; that is arithmetic he can check, in the one sentence that may never be
   * checkable and false.
   *
   * The direction is read off the ROUNDED pair, because the rounded pair is what
   * he is shown, and the explanation has to describe the numbers beside it rather
   * than the full-precision ones behind them.
   */
  const statedPct = (s) => {
    const recent = held(s).toFixed(0)
    const lifetime = s.pct.toFixed(0)
    if (recent === lifetime) return `${recent}%`
    const because = Number(recent) < Number(lifetime)
      ? `weighted down because an answer loses half its weight every ${RECENCY_HALF_LIFE_DAYS} days — work you have `
        + 'not repeated is not evidence about today'
      : `higher than that because an answer loses half its weight every ${RECENCY_HALF_LIFE_DAYS} days and the `
        + 'questions you missed on this are older than the ones you got right — the recent record is the better one'
    return `${recent}% on recent evidence (${lifetime}% across all ${s.n} answer(s) ever, ${because})`
  }
  const weak = [...stats.entries()]
    .filter(([topic, s]) => held(s) < floor && isTested(topic))
    .map(([topic, s]) => ({ topic, s, urgency: (floor - held(s)) * (1 + examWeight(topic, topicMeta)) }))
    .sort((a, b) => b.urgency - a.urgency || a.topic.localeCompare(b.topic))

  // 4. Spaced review: previously missed, correct since, and now due again.
  //    Restricted to topics the exam asks about, so a session is not spent
  //    reviewing material the readiness score deliberately ignores.
  //
  //    INTERLEAVED WITH 3, NOT RANKED BELOW IT. Strict ordering starved this
  //    branch to the point of never running: priority 3 returns on the first topic
  //    below the floor with a servable item, and poolFor falls back to the topic's
  //    whole item set, so it essentially always found one. Review was therefore
  //    unreachable until EVERY tested topic cleared the floor, which for most of a
  //    nine-month run is never — so the 1/3/7/16/35 schedule this module is built
  //    around did not execute at all.
  //
  //    One ordinary-practice question in REVIEW_SHARE is reserved for a due review
  //    instead. Reasons for that number, and what it actually delivers — the three
  //    quantities that used to stand here were all asserted rather than measured,
  //    and all three were false:
  //      - Remediation keeps the majority of the session while anything is
  //        genuinely below its floor, which is the right balance early on. That
  //        one holds: a reserve of one in three is a CEILING on review, not a
  //        quota.
  //      - It is a ceiling because a reserved slot with nothing due, or with
  //        nothing due that remediation is not already about to serve, goes back to
  //        remediation. Measured over the real banks at the ~8 answers a day the
  //        configs size themselves for, 90 days, 720 ordinary answers: review takes
  //        15.1% of them on CSA (1.2 a day, 84 of 240 reserved slots claimed, 148
  //        of the rest holding nothing but topics already below their floor) and
  //        22.1% on Precalc (1.8 a day). NOT "around 2-3 reviews a day"; and before
  //        serveReview's second pass it was 10.3% and 0.8 a day on CSA, because the
  //        reuse window was eating the queue.
  //      - A due review waits at most REVIEW_SHARE - 1 ordinary questions when it
  //        is at the head of the queue, so a 1-day interval survives one short
  //        session. Behind k other due topics it waits about k * REVIEW_SHARE, and
  //        a topic can drop into remediation's hands and back out while it waits.
  //        Measured on the same runs: median 1 question, worst 7 (CSA) and 25
  //        (Precalc). Before: median 29 and worst 135 on CSA, and counting every
  //        topic that came due rather than only the ones the reserve owed, median
  //        77 and worst 702 — reviews that came due in week two and were still
  //        waiting in week thirteen.
  //
  //    Which slot is the reserved one is a function of the recorded history —
  //    ordinary-practice attempts only, so a 42-answer paper cannot rotate the
  //    phase — and of nothing else. No clock, no counter, no RNG: replaying the
  //    same history serves the same question, which is the guarantee this module
  //    is built on.
  const due = [...stats.entries()]
    .filter(([topic, s]) => isTested(topic) && s.misses > 0 && s.last_ts && ageDays(s.last_ts, now) >= reviewInterval(s.streak))
    .sort((a, b) => ageDays(b[1].last_ts, now) - ageDays(a[1].last_ts, now) || a[0].localeCompare(b[0]))

  /**
   * The first due review that can actually be served, or null.
   *
   * On the reserved slot the topics remediation is about to serve are skipped. A
   * topic below its floor is not what the reserve exists for — priority 3 will
   * serve it in a moment, with a reason that describes it accurately — and
   * spending the reserved slot on it would relabel remediation as spaced review
   * and leave the actual review queue exactly as starved as before.
   *
   * TWO PASSES OVER THE QUEUE, and the second one is what makes this branch
   * reachable at all. The first draws from `servable`, where the reuse decision
   * has already been taken globally, so a due topic that still has a question he
   * has not answered recently is served with it — freshness first, and across the
   * whole queue, so a fresh review is never passed over for a repeat on a more
   * overdue topic.
   *
   * The second pass draws from the topic's OWN items instead, and only on the
   * reserved slot. It exists because four of the five review intervals — 1, 3, 7
   * and 16 days — are SHORTER than the reuse windows the configs ship (28 days on
   * CSA, 14 on Precalc). A topic that comes due on the early schedule therefore
   * has its own answered questions INSIDE the no-repeat window by construction,
   * and once its never-asked ones are gone `servable` holds none of them: the
   * first pass finds an empty pool and the due review is dropped in silence. That
   * is not a corner. Measured on the real banks at 8 answers a day for 90 days —
   * 720 ordinary questions, the run select.test.js drives — it emptied 146 of
   * CSA's 240 reserved slots and 125 of Precalc's, held the realized review share
   * to 10.3% against a ceiling of 33%, and left a due review the reserve was
   * responsible for waiting a median of 29 questions and a worst case of 135.
   * Counting every topic that came due, including the ones remediation was already
   * handling: median 77, worst 702, and 10 of the 47 that came due never reviewed
   * in 90 days. The 1/3/7/16/35 schedule this module is built around did not run.
   *
   * Serving the topic's own most-forgotten question instead is the same trade the
   * mock branch already makes, for the same reason and with the same two
   * safeguards. It is HONEST because `serve` labels it — `repeat: true`,
   * `repeat_of`, and a sentence saying he has answered this exact question before,
   * so a remembered answer is never sold as fresh evidence. It does not break the
   * no-repeat window's purpose, because `poolFor` still prefers a never-asked
   * question, then one whose window has passed, and only then the LEAST RECENTLY
   * SEEN of what is left — so a review is never served with the very question he
   * just answered while any alternative exists. And it is confined to the reserved
   * slot, which is the one question in REVIEW_SHARE the module has already decided
   * to spend on review whatever else was available: outside the reserve the global
   * rule stands unchanged, and a repeat never displaces a fresh question there.
   *
   * Deterministic in both passes: `due` is ordered by how overdue it is then by
   * name, `poolFor` sorts by least-recently-seen then exam weight then id, and
   * neither reads a clock beyond `now` or an RNG.
   *
   * One consequence worth naming, because it bounds how bad a reserved repeat can
   * be: it can never hand back a question he answered TODAY. `due` requires the
   * topic's most recent answer to be at least its review interval old, and no
   * question of that topic can have been answered more recently than that, so
   * whatever the second pass reaches for is at least one interval — one day at the
   * very shortest — behind him.
   */
  const serveReview = (reserved = false) => {
    const skip = reserved ? new Set(weak.map((w) => w.topic)) : new Set()
    for (const pool of reserved ? [servable, universe] : [servable]) {
      for (const [topic, s] of due) {
        if (skip.has(topic)) continue
        const own = poolFor(topic, pool)
        if (!own.length) continue
        // Whole CALENDAR days, the unit calendarDaysAgo exists for and the same
        // unit as the repeat sentence `serve` may append to this one. Elapsed days
        // rounded with toFixed(0) put "it has been 1 days" and "you answered it 2
        // days ago" in one sentence about one gap — and rounded a 36-hour gap down
        // to "1" while the calendar had already turned twice.
        const days = calendarDaysAgo(s.last_ts, now)
        // Only on the reserved slot, and only when something really is below its
        // floor: the student is looking at a review while the status view names a
        // weak topic, and the two have to agree about what is going on.
        const displaced = reserved ? weak[0] : null
        return serve({
          item: own[0],
          priority: 'review',
          conditions: 'cold',
          reason: `Spaced review of ${topic} — you missed it before, and it has been `
            + `${days === 1 ? '1 day' : `${days} days`}. Checking it stuck.`
            + (displaced
              ? ` ${displaced.topic} is at ${statedPct(displaced.s)} and is still the next thing to work on, but one `
                + `ordinary question in ${REVIEW_SHARE} is kept for a review that has come due: with remediation always `
                + `first, a review would never be served at all.`
              : ''),
        })
      }
    }
    return null
  }

  // Ordinary practice only: a sitting's answers are not part of the drill stream
  // the reserve is measured over, and every attempt counts toward the phase
  // whether or not it could be graded — this is a position in the session, not a
  // percentage.
  const drilled = attempts.filter((a) => a.mock_id == null).length
  if ((drilled + 1) % REVIEW_SHARE === 0) {
    const reserved = serveReview(true)
    if (reserved) return reserved
  }

  for (const w of weak) {
    const pool = poolFor(w.topic)
    if (pool.length) {
      return serve({
        item: pool[0],
        priority: 'weakest',
        conditions: 'cold',
        reason: `${w.topic} is at ${statedPct(w.s)}, below the ${floor}% this subject needs. Working it until it holds.`,
      })
    }
  }

  const review = serveReview()
  if (review) return review

  // 5. Keep moving through the bank. An on-exam question he answered long enough
  //    ago to have forgotten beats a never-asked class-only one, or the exam
  //    filter above evaporates the moment every on-exam item has been seen once.
  //    `servable` is non-empty here, checked above, so this always finds a pool.
  const pool = breadthPool()
  const pick = [...pool].sort(byMostForgotten)[0]
  // Only claim he is at every floor when that is true, and only call it fresh
  // ground when it IS fresh: branch 3 may have found a topic below its floor and
  // merely been unable to serve it, and once the whole bank is inside the window
  // there is no new ground left to offer. Both sentences reach the student verbatim.
  const stranded = weak[0]
  const ground = repeating ? `another go at ${pick.topic}` : `fresh ground on ${pick.topic}`
  return serve({
    item: pick,
    priority: 'breadth',
    conditions: 'cold',
    reason: stranded
      ? `${stranded.topic} is at ${statedPct(stranded.s)}, below the ${floor}% this subject needs, but it has no questions left that you have not just answered — so this is ${ground} in the meantime.`
      : `Everything is at or above its floor, so this is ${ground}.`,
  })
}
