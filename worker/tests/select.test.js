import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { DatabaseSync } from 'node:sqlite'
import { pickNext, topicStats, reviewInterval } from '../src/select.js'
import { detectGaps, reconcileGaps, clearsGap, buildLesson } from '../src/teaching.js'

const NOW = '2027-03-01T12:00:00Z'
const CFG = { readiness: { per_unit_min: 75 } }

function ago(days) {
  return new Date(new Date(NOW).getTime() - days * 86400000).toISOString()
}

/** Three items each on three topics. */
const ITEMS = ['a', 'b', 'c'].flatMap((topic) =>
  [1, 2, 3].map((i) => ({ id: `${topic}${i}`, topic, unit: '1', kind: 'mcq', answer: 'A' })),
)

const META = new Map([
  ['a', { exam_weight_low: 30, exam_weight_high: 40, tested_on_exam: 1 }],
  ['b', { exam_weight_low: 10, exam_weight_high: 18, tested_on_exam: 1 }],
  ['c', { exam_weight_low: 25, exam_weight_high: 35, tested_on_exam: 1 }],
])

function attempt(item_id, topic, correct, daysAgo, extra = {}) {
  return { item_id, topic, correct, ts: ago(daysAgo), hints_used: 0, conditions: 'cold', ...extra }
}

/** The same three topics plus `d`, which the class covers but the exam does not. */
const META_WITH_CLASS_ONLY = new Map([...META, ['d', { exam_weight_low: 0, exam_weight_high: 0, tested_on_exam: 0 }]])
const ITEMS_WITH_CLASS_ONLY = [
  ...ITEMS,
  ...[1, 2, 3].map((i) => ({ id: `d${i}`, topic: 'd', unit: '4', kind: 'mcq', answer: 'A' })),
]

test('topicStats tracks streaks in chronological order', () => {
  const s = topicStats([
    attempt('a1', 'a', 0, 10),
    attempt('a2', 'a', 1, 5),
    attempt('a3', 'a', 1, 1),
  ])
  const a = s.get('a')
  assert.equal(a.n, 3)
  assert.equal(a.correct, 2)
  assert.equal(a.streak, 2, 'two correct since the last miss')
  assert.equal(a.misses, 1)
  assert.equal(a.last_ts, ago(1))
})

test('a miss resets the streak even when it arrives out of insertion order', () => {
  // Passed newest-first; the function must sort before walking.
  const s = topicStats([attempt('a2', 'a', 0, 1), attempt('a1', 'a', 1, 10)])
  assert.equal(s.get('a').streak, 0)
})

test('review intervals expand and then plateau', () => {
  assert.deepEqual([0, 1, 2, 3, 4, 5, 99].map(reviewInterval), [1, 3, 7, 16, 35, 35, 35])
})

test('selection priority', async (t) => {
  await t.test('an untested topic outranks everything, heaviest exam weight first', () => {
    const r = pickNext({ items: ITEMS, attempts: [], topicMeta: META, config: CFG, now: NOW })
    assert.equal(r.priority, 'coverage')
    assert.equal(r.item.topic, 'a', 'topic a carries the most exam weight')
    assert.match(r.reason, /does not count as covered/)
  })

  await t.test('a taught-but-unconfirmed gap outranks even a coverage hole', () => {
    const gaps = [{ topic: 'b', opened_at: ago(9), taught_at: ago(8), cleared_at: null }]
    const r = pickNext({ items: ITEMS, attempts: [], gaps, topicMeta: META, config: CFG, now: NOW })
    assert.equal(r.priority, 'gap_retest')
    assert.equal(r.item.topic, 'b')
    assert.equal(r.conditions, 'cold')
    assert.match(r.reason, /no hints/)
  })

  await t.test('an untaught gap does NOT trigger a re-test — the lesson comes first', () => {
    const gaps = [{ topic: 'b', opened_at: ago(9), taught_at: null, cleared_at: null }]
    const r = pickNext({ items: ITEMS, attempts: [], gaps, topicMeta: META, config: CFG, now: NOW })
    assert.notEqual(r.priority, 'gap_retest')
  })

  await t.test('with coverage complete, the weakest weighted topic is chosen', () => {
    // b is weaker in raw percent, but a is weak too and matters far more.
    const attempts = [
      attempt('a1', 'a', 0, 20),
      attempt('a2', 'a', 1, 19),
      attempt('b1', 'b', 0, 18),
      attempt('b2', 'b', 0, 17),
      attempt('c1', 'c', 1, 16),
      attempt('c2', 'c', 1, 15),
    ]
    const r = pickNext({ items: ITEMS, attempts, topicMeta: META, config: CFG, now: NOW })
    assert.equal(r.priority, 'weakest')
    assert.equal(r.item.topic, 'b', 'b at 0% outranks a at 50% despite lower weight')
    assert.match(r.reason, /below the 75%/)
  })

  await t.test('exam weight breaks the tie between two equally weak topics', () => {
    const attempts = [
      attempt('a1', 'a', 0, 20),
      attempt('b1', 'b', 0, 18),
      attempt('c1', 'c', 1, 16),
      attempt('c2', 'c', 1, 15),
      attempt('c3', 'c', 1, 14),
    ]
    const r = pickNext({ items: ITEMS, attempts, topicMeta: META, config: CFG, now: NOW })
    assert.equal(r.item.topic, 'a', 'both at 0%; a carries more exam weight')
  })

  await t.test('a previously missed topic comes back for spaced review when due', () => {
    // Everything above the floor, but topic a was missed once long ago.
    const attempts = [
      attempt('a1', 'a', 0, 40),
      attempt('a2', 'a', 1, 39),
      attempt('a3', 'a', 1, 38),
      attempt('a1', 'a', 1, 37),
      ...['b', 'c'].flatMap((tp) => [1, 2, 3].map((i) => attempt(`${tp}${i}`, tp, 1, 30))),
    ]
    const r = pickNext({ items: ITEMS, attempts, topicMeta: META, config: CFG, now: NOW, reuseDays: 20 })
    assert.equal(r.priority, 'review')
    assert.equal(r.item.topic, 'a')
    assert.match(r.reason, /missed it before/)
  })

  await t.test('a recently answered item is not served while ANY item is outside the window', () => {
    // Eight of the nine were answered three days ago. The ninth must be the pick:
    // an item inside the no-repeat window is never preferred over a fresh one.
    const attempts = ITEMS.filter((it) => it.id !== 'b3').map((it) => attempt(it.id, it.topic, 1, 3))
    const r = pickNext({ items: ITEMS, attempts, topicMeta: META, config: CFG, now: NOW, reuseDays: 56 })
    assert.equal(r.item.id, 'b3', 'the one never-asked item beats eight three-day-old ones')
    assert.notEqual(r.repeat, true)
    assert.doesNotMatch(r.reason, /answered this exact question/)
  })

  // Rewritten from an earlier version that called pickNext five times with the
  // SAME array object, which could only ever catch a clock or RNG read. The real
  // risk is input-order sensitivity: an unsorted `pool[0]` returns a different
  // item when the bank arrives in a different order, which breaks the replay
  // guarantee in the module header.
  await t.test('the same history yields the same question however the bank is ordered', () => {
    // Four items per topic, so the pools below hold more than one candidate and
    // an unsorted pick is visible.
    const items = ['a', 'b', 'c'].flatMap((topic) =>
      [1, 2, 3, 4].map((i) => ({ id: `${topic}${i}`, topic, unit: '1', kind: 'mcq', answer: 'A' })),
    )
    const scenarios = [
      {
        name: 'gap re-test drawn from reused items',
        args: {
          attempts: [1, 2, 3, 4].map((i) => attempt(`b${i}`, 'b', 0, 60)),
          gaps: [{ topic: 'b', opened_at: ago(59), taught_at: ago(58), cleared_at: null }],
        },
      },
      {
        name: 'weakest topic',
        args: {
          attempts: [
            attempt('a1', 'a', 0, 20), attempt('a2', 'a', 1, 19),
            attempt('b1', 'b', 0, 18), attempt('b2', 'b', 0, 17),
            attempt('c1', 'c', 1, 16), attempt('c2', 'c', 1, 15),
          ],
        },
      },
      {
        name: 'spaced review drawn from reused items',
        args: {
          reuseDays: 20,
          attempts: [
            attempt('a1', 'a', 0, 40), attempt('a2', 'a', 1, 39),
            attempt('a3', 'a', 1, 38), attempt('a4', 'a', 1, 37),
            ...['b', 'c'].flatMap((tp) => [1, 2, 3, 4].map((i) => attempt(`${tp}${i}`, tp, 1, 30))),
          ],
        },
      },
    ]
    for (const s of scenarios) {
      const base = { topicMeta: META, config: CFG, now: NOW, ...s.args }
      const orders = {
        given: items,
        reversed: [...items].reverse(),
        rotated: [...items.slice(5), ...items.slice(0, 5)],
      }
      const picked = Object.entries(orders).map(([label, order]) => {
        const r = pickNext({ ...base, items: order })
        return `${label}=${r.priority}:${r.item.id}`
      })
      const distinct = new Set(picked.map((p) => p.split('=')[1]))
      assert.equal(distinct.size, 1, `${s.name}: order-dependent — ${picked.join(', ')}`)
    }
  })

  await t.test('a topic not tested on the exam is skipped for coverage', () => {
    const meta = new Map([...META, ['d', { exam_weight_low: 0, tested_on_exam: 0 }]])
    const items = [...ITEMS, { id: 'd1', topic: 'd', unit: '4', kind: 'mcq', answer: 'A' }]
    const r = pickNext({ items, attempts: [], topicMeta: meta, config: CFG, now: NOW })
    assert.notEqual(r.item.topic, 'd', 'class-only material must not drive exam coverage')
  })

  await t.test('every choice carries a reason the student can read', () => {
    const r = pickNext({ items: ITEMS, attempts: [], topicMeta: META, config: CFG, now: NOW })
    assert.ok(r.reason.length > 20)
    assert.ok(r.priority)
  })
})

// ---------------------------------------------------------------------------
// A partially consumed bank. Every test above starts from a virgin bank, where
// the unseen pool covers every item and the reuse fallback is never exercised.
// These drive the case the student actually reaches after a few weeks: some
// topics used up, others barely touched.
// ---------------------------------------------------------------------------

test('selection on a partially consumed bank', async (t) => {
  await t.test('a taught gap is re-tested from reusable items when its topic has no unseen ones', () => {
    // Every b item was answered 60 days ago — past the reuse window, so all
    // three are servable again. a and c are still untouched, so the global
    // unseen pool is not empty; only b's share of it is.
    const attempts = [1, 2, 3].map((i) => attempt(`b${i}`, 'b', 0, 60))
    const gaps = [{ topic: 'b', opened_at: ago(59), taught_at: ago(58), cleared_at: null }]
    const r = pickNext({ items: ITEMS, attempts, gaps, topicMeta: META, config: CFG, now: NOW })
    assert.equal(r.priority, 'gap_retest', 'an open taught gap outranks a coverage hole on another topic')
    assert.equal(r.item.topic, 'b')
  })

  await t.test('the weakest topic is served from reusable items when it has no unseen ones', () => {
    const attempts = [
      ...[1, 2, 3].map((i) => attempt(`b${i}`, 'b', 0, 60)), // b at 0%, whole topic consumed
      attempt('a1', 'a', 1, 60),
      attempt('c1', 'c', 1, 60),
    ]
    const r = pickNext({ items: ITEMS, attempts, topicMeta: META, config: CFG, now: NOW })
    assert.equal(r.priority, 'weakest')
    assert.equal(r.item.topic, 'b', 'b is at 0% and its questions are reusable again')
  })

  await t.test('a due review is served from reusable items when its topic has no unseen ones', () => {
    const attempts = [
      attempt('a1', 'a', 0, 40), attempt('a2', 'a', 1, 39),
      attempt('a3', 'a', 1, 38), attempt('a1', 'a', 1, 37), // a at 75%: at the floor, not below it
      attempt('b1', 'b', 1, 30), attempt('c1', 'c', 1, 30),
    ]
    const r = pickNext({ items: ITEMS, attempts, topicMeta: META, config: CFG, now: NOW, reuseDays: 20 })
    assert.equal(r.priority, 'review')
    assert.equal(r.item.topic, 'a')
    assert.match(r.reason, /missed it before/)
  })

  await t.test('within a topic, a never-asked question is preferred over one due for reuse', () => {
    const attempts = [attempt('b1', 'b', 0, 60), attempt('b2', 'b', 0, 59)]
    const gaps = [{ topic: 'b', opened_at: ago(58), taught_at: ago(57), cleared_at: null }]
    const r = pickNext({ items: ITEMS, attempts, gaps, topicMeta: META, config: CFG, now: NOW })
    assert.equal(r.item.id, 'b3', 'b1 and b2 are reusable, but b3 has never been asked')
  })

  await t.test('with two taught gaps open, the one opened first is re-tested first', () => {
    // Passed newest-first; the oldest gap must still win, or a long-open gap can
    // be starved indefinitely by newer ones.
    const gaps = [
      { topic: 'c', opened_at: ago(4), taught_at: ago(3), cleared_at: null },
      { topic: 'b', opened_at: ago(9), taught_at: ago(8), cleared_at: null },
    ]
    const r = pickNext({ items: ITEMS, attempts: [], gaps, topicMeta: META, config: CFG, now: NOW })
    assert.equal(r.priority, 'gap_retest')
    assert.equal(r.item.topic, 'b', 'b has been open five days longer than c')
  })

  await t.test('breadth does not claim everything is at its floor when a weak topic merely ran out of questions', () => {
    // b is at 0%, but all three b items were answered three days ago, so none
    // can be served yet. The student must not be told he is above every floor.
    const attempts = [
      ...[1, 2, 3].map((i) => attempt(`b${i}`, 'b', 0, 3)),
      attempt('a1', 'a', 1, 3),
      attempt('c1', 'c', 1, 3),
    ]
    const r = pickNext({ items: ITEMS, attempts, topicMeta: META, config: CFG, now: NOW })
    assert.equal(r.priority, 'breadth')
    assert.doesNotMatch(r.reason, /at or above its floor/, 'b is at 0% against a floor of 75')
    assert.match(r.reason, /^b is at 0%, below the 75%/)
    assert.match(r.reason, /no questions left/)
  })

  await t.test('breadth prefers a reusable on-exam question over an unseen class-only one', () => {
    // All nine on-exam items are past the reuse window; only the class-only
    // topic still has never-asked items. The exam filter must survive that.
    const attempts = ITEMS.map((it) => attempt(it.id, it.topic, 1, 60))
    const r = pickNext({
      items: ITEMS_WITH_CLASS_ONLY, attempts, topicMeta: META_WITH_CLASS_ONLY, config: CFG, now: NOW,
    })
    assert.equal(r.priority, 'breadth')
    assert.notEqual(r.item.topic, 'd', 'class-only material must not displace nine available on-exam questions')
  })

  await t.test('spaced review does not spend the session on class-only material', () => {
    const attempts = [
      attempt('d1', 'd', 0, 40), attempt('d2', 'd', 1, 39), // d is missed-then-correct and due
      attempt('a1', 'a', 1, 30), attempt('a2', 'a', 1, 30), // a3 is still unasked
      ...['b', 'c'].flatMap((tp) => [1, 2, 3].map((i) => attempt(`${tp}${i}`, tp, 1, 30))),
    ]
    const r = pickNext({
      items: ITEMS_WITH_CLASS_ONLY, attempts, topicMeta: META_WITH_CLASS_ONLY, config: CFG, now: NOW,
    })
    assert.notEqual(r.priority, 'review', 'a topic the exam excludes from readiness must not drive review')
    assert.equal(r.item.id, 'a3', 'the on-exam question comes first')
  })

  await t.test('a taught gap on class-only material is still re-tested, or it could never close', () => {
    // Deliberately NOT filtered by tested_on_exam: gaps open on any topic the
    // student misses twice, and a gap only closes on a cold correct answer on
    // that same topic. Filtering here would leave it open forever.
    const attempts = [attempt('d1', 'd', 0, 10), attempt('d2', 'd', 0, 9)]
    const gaps = [{ topic: 'd', opened_at: ago(9), taught_at: ago(8), cleared_at: null }]
    const r = pickNext({
      items: ITEMS_WITH_CLASS_ONLY, attempts, gaps, topicMeta: META_WITH_CLASS_ONLY, config: CFG, now: NOW,
    })
    assert.equal(r.priority, 'gap_retest')
    assert.equal(r.item.id, 'd3')
  })
})

// ---------------------------------------------------------------------------
// An EXHAUSTED bank. The bank is finite and the no-repeat window is long, so
// this state is reached in the first week of ordinary use, not in some corner
// case: 218 CSA items at 50 answers a day is four days of unique questions.
// Refusing to serve anything is the one response the student cannot use, so the
// selector degrades to the least-recently-seen item and SAYS it is a repeat.
// ---------------------------------------------------------------------------

test('an exhausted bank degrades to a labelled repeat instead of refusing to work', async (t) => {
  await t.test('every item inside the window still yields a question, never null', () => {
    const attempts = ITEMS.map((it) => attempt(it.id, it.topic, 1, 3))
    const r = pickNext({ items: ITEMS, attempts, topicMeta: META, config: CFG, now: NOW, reuseDays: 56 })
    assert.notEqual(r, null, 'a student who has answered everything recently still needs practice')
    assert.ok(r.item, 'a real item, not an empty shell')
  })

  await t.test('the repeat is labelled in the reason, so a remembered answer is not sold as fresh evidence', () => {
    const attempts = ITEMS.map((it) => attempt(it.id, it.topic, 1, 3))
    const r = pickNext({ items: ITEMS, attempts, topicMeta: META, config: CFG, now: NOW, reuseDays: 56 })
    assert.equal(r.repeat, true)
    assert.match(r.reason, /answered this exact question before/i)
    assert.match(r.reason, /memory check|not fresh evidence/i)
  })

  await t.test('the least-recently-seen item is the one served', () => {
    // Staggered ages, all inside a 56-day window. b2 is the most forgotten.
    const ages = { a1: 1, a2: 2, a3: 3, b1: 10, b2: 40, b3: 20, c1: 5, c2: 6, c3: 7 }
    const attempts = ITEMS.map((it) => attempt(it.id, it.topic, 1, ages[it.id]))
    const r = pickNext({ items: ITEMS, attempts, topicMeta: META, config: CFG, now: NOW, reuseDays: 56 })
    assert.equal(r.item.id, 'b2', `expected the 40-day-old question, got ${r.item.id}`)
  })

  await t.test('the degraded pick is deterministic however the bank is ordered', () => {
    const ages = { a1: 1, a2: 2, a3: 3, b1: 10, b2: 40, b3: 20, c1: 5, c2: 6, c3: 7 }
    const attempts = ITEMS.map((it) => attempt(it.id, it.topic, 1, ages[it.id]))
    const picks = [ITEMS, [...ITEMS].reverse(), [...ITEMS.slice(4), ...ITEMS.slice(0, 4)]].map(
      (order) => pickNext({ items: order, attempts, topicMeta: META, config: CFG, now: NOW, reuseDays: 56 }).item.id,
    )
    assert.equal(new Set(picks).size, 1, `order-dependent: ${picks.join(', ')}`)
  })

  await t.test('the no-repeat window is read from config, not hardcoded', () => {
    const attempts = ITEMS.map((it) => attempt(it.id, it.topic, 1, 4))
    const short = { readiness: { per_unit_min: 75, reuse_days: 3 } }
    const long = { readiness: { per_unit_min: 75, reuse_days: 56 } }
    assert.notEqual(
      pickNext({ items: ITEMS, attempts, topicMeta: META, config: short, now: NOW }).repeat, true,
      'a 3-day window makes a 4-day-old question fresh again',
    )
    assert.equal(
      pickNext({ items: ITEMS, attempts, topicMeta: META, config: long, now: NOW }).repeat, true,
      'a 56-day window does not',
    )
  })

  await t.test('an explicit reuseDays argument still overrides the config', () => {
    const attempts = ITEMS.map((it) => attempt(it.id, it.topic, 1, 4))
    const cfg = { readiness: { per_unit_min: 75, reuse_days: 56 } }
    assert.notEqual(pickNext({ items: ITEMS, attempts, topicMeta: META, config: cfg, now: NOW, reuseDays: 3 }).repeat, true)
  })
})

// ---------------------------------------------------------------------------
// The whole real bank, served the way the student will actually serve it.
//
// These run over the real bank rather than a fixture, because the defects they
// pin are properties of the SIZE and SHAPE of the shipped bank against the
// shipped standards, and a three-item fixture cannot express them.
//
// The bank is reconstructed from worker/seed.sql — the exact statements D1 is
// loaded with — and NOT from content/topics.json. The JSON carries
// `tested_on_exam: false` where the database carries the integer 0, and the
// selector's test is `m.tested_on_exam !== 0`, under which `false` reads as
// TESTED. A JSON-backed fixture therefore reports every class-only topic as
// exam-tested and is structurally blind to the off-syllabus defect below.
// ---------------------------------------------------------------------------

const ROOT = new URL('../../', import.meta.url)
const CONFIG = {
  ap_csa: JSON.parse(readFileSync(new URL('worker/config/ap_csa.json', ROOT), 'utf8')),
  ap_precalc: JSON.parse(readFileSync(new URL('worker/config/ap_precalc.json', ROOT), 'utf8')),
}
/** The share of a section a sitting has to cover before api.js will score it. */
const MIN_MOCK_COVERAGE = 0.9

const SEEDED = new DatabaseSync(':memory:')
SEEDED.exec(readFileSync(new URL('worker/seed.sql', ROOT), 'utf8'))

function bankOf(subject) {
  const items = SEEDED.prepare(
    'SELECT id, subject, topic, unit, practice, kind, answer, calc_allowed FROM items WHERE subject = ? ORDER BY id',
  ).all(subject)
  const topics = SEEDED.prepare('SELECT * FROM topics WHERE subject = ? ORDER BY id').all(subject)
  return { items, topics, topicMeta: new Map(topics.map((t) => [t.id, t])), config: CONFIG[subject] }
}

/** Items the exam actually tests — the only material a sitting may be built from. */
function onExamItems({ items, topicMeta }) {
  return items.filter((it) => topicMeta.get(it.topic)?.tested_on_exam !== 0)
}

/**
 * The unit shares a sitting is entitled to, as percentages, from the same
 * per-topic weights the selector reads. `tested_on_exam = 0` units are entitled
 * to nothing: the exam does not ask about them.
 */
function entitlements({ topics }) {
  const byUnit = new Map()
  for (const t of topics) {
    if (t.tested_on_exam === 0) continue
    const w = ((t.exam_weight_low ?? 0) + (t.exam_weight_high ?? t.exam_weight_low ?? 0)) / 2
    byUnit.set(t.unit, Math.max(byUnit.get(t.unit) ?? 0, w))
  }
  const total = [...byUnit.values()].reduce((n, w) => n + w, 0)
  const out = new Map()
  for (const [unit, w] of byUnit) out.set(unit, total > 0 ? (w / total) * 100 : (1 / byUnit.size) * 100)
  return out
}

const DAY_MS = 86400000

/**
 * Sit one whole paper, recording each answer exactly as api.js would, and return
 * the items served in order. Stops early — and says where — if the selector
 * refuses.
 */
function sitPaper({ bank, attempts, mockId, questions, startMs, accuracy = null }) {
  const { items, topicMeta, config } = bank
  const paper = []
  const perUnit = new Map()
  let refusedAt = null
  for (let q = 0; q < questions; q++) {
    const now = new Date(startMs + q * 120000).toISOString()
    const r = pickNext({ items, attempts, gaps: [], topicMeta, config, now, sampling: 'mock', mockId })
    if (!r) { refusedAt = q + 1; break }
    paper.push({ ...r.item, priority: r.priority, reason: r.reason, repeat: r.repeat === true })
    // Correctness is a pure function of the unit and of how many of that unit's
    // questions have already been asked, so the ONLY thing that can move the
    // score across sittings is which units the paper drew from. A knowledge
    // profile that never changes must not produce a moving composite. The
    // distribution is Bresenham's: over k questions of a unit known to `p`,
    // exactly round(k * p) come out right, wherever on the paper they land.
    const seen = perUnit.get(r.item.unit) ?? 0
    perUnit.set(r.item.unit, seen + 1)
    const p = accuracy?.[r.item.unit] ?? 0
    const correct = accuracy == null ? q % 5 !== 0 : Math.round((seen + 1) * p) > Math.round(seen * p)
    attempts.push({
      item_id: r.item.id, topic: r.item.topic, unit: r.item.unit, response: 'A',
      correct, ts: now, hints_used: 0, conditions: 'proctored_mock',
      graded_by: 'server', kind: r.item.kind, mock_id: mockId,
    })
  }
  return { paper, refusedAt }
}

/**
 * Drill `answers` ordinary practice questions, `perDay` a day, THROUGH THE
 * SELECTOR'S OWN PATH, and return the history that produces.
 *
 * A history has to be built this way rather than hand-written, because what makes
 * a bank partially worn is precisely which items the selector itself chose and in
 * what order: it works the heavy units first, so their items pass into the reuse
 * window well before the light ones. Seeding a synthetic history cannot reproduce
 * that skew, and the skew is the whole defect.
 */
function drillDays({ bank, answers, perDay = 20, startMs }) {
  const { items, topicMeta, config } = bank
  const attempts = []
  for (let i = 0; i < answers; i++) {
    const now = new Date(startMs + Math.floor(i / perDay) * DAY_MS + (i % perDay) * 60000).toISOString()
    const r = pickNext({ items, attempts, gaps: [], topicMeta, config, now })
    assert.notEqual(r, null, `ordinary drilling refused after ${attempts.length} answers`)
    attempts.push({
      item_id: r.item.id, topic: r.item.topic, unit: r.item.unit, response: 'A',
      correct: i % 5 !== 0, ts: now, hints_used: 0, conditions: 'cold',
      graded_by: 'server', kind: r.item.kind,
    })
  }
  return { attempts, endedMs: startMs + Math.ceil(answers / perDay) * DAY_MS }
}

/** How many of a unit's on-exam items are inside / outside the reuse window. */
function windowCensus({ bank, attempts, atMs }) {
  const { items, topicMeta, config } = bank
  const lastSeen = new Map()
  for (const a of attempts) {
    const prev = lastSeen.get(a.item_id)
    if (!prev || new Date(a.ts) > new Date(prev)) lastSeen.set(a.item_id, a.ts)
  }
  const census = new Map()
  for (const it of onExamItems({ items, topicMeta })) {
    const seen = lastSeen.get(it.id)
    const outside = !seen || (atMs - new Date(seen).getTime()) / DAY_MS >= config.readiness.reuse_days
    const c = census.get(it.unit) ?? { outside: 0, inside: 0 }
    c[outside ? 'outside' : 'inside']++
    census.set(it.unit, c)
  }
  return census
}

/** Realized unit shares of one paper, as percentages. */
function unitShares(paper) {
  const counts = new Map()
  for (const it of paper) counts.set(it.unit, (counts.get(it.unit) ?? 0) + 1)
  const out = new Map()
  for (const [unit, n] of counts) out.set(unit, (n / paper.length) * 100)
  return out
}

test('the real bank keeps serving after it has been worked through', async (t) => {
  for (const subject of ['ap_csa', 'ap_precalc']) {
    await t.test(`${subject}: 20 answers a day for 21 days never runs out of questions`, () => {
      const { items, topicMeta, config } = bankOf(subject)
      const start = new Date('2026-09-01T12:00:00Z').getTime()
      const attempts = []
      let repeats = 0
      for (let day = 0; day < 21; day++) {
        for (let n = 0; n < 20; n++) {
          const now = new Date(start + day * DAY_MS + n * 60000).toISOString()
          const r = pickNext({ items, attempts, gaps: [], topicMeta, config, now })
          assert.notEqual(
            r, null,
            `${subject} bricked on day ${day} after ${attempts.length} answers — api.js turns this into a 409 for ` +
              'every drill AND every mock until the window passes',
          )
          if (r.repeat) {
            repeats++
            assert.match(r.reason, /answered this exact question before/i, 'a repeat must say so')
          }
          attempts.push({
            item_id: r.item.id, topic: r.item.topic, unit: r.item.unit, response: 'A',
            correct: attempts.length % 5 !== 0, ts: now, hints_used: 0, conditions: 'cold',
            graded_by: 'server', kind: r.item.kind,
          })
        }
      }
      assert.equal(attempts.length, 420)
      assert.ok(repeats > 0, 'precondition: this volume must actually exhaust the bank, or the test proves nothing')
    })
  }
})

test('every mock the readiness config requires can actually be sat', async (t) => {
  // total_logged_mocks_min sittings, each needing ceil(mcq_count * 0.9) answers
  // before api.js will score it, one a week. CSA demanded 6 x 38 = 228 distinct
  // servings from a 218-item bank, so the sixth sitting used to die at question
  // 29 — no composite, and total_logged_mocks_min unreachable forever.
  //
  // The length a sitting can honestly reach is capped by the ON-EXAM bank, not
  // by the whole bank: a paper may not be padded with material readiness
  // deliberately excludes, and a paper may not ask the same question twice, so
  // one sitting can be at most as long as the count of exam-tested items.
  // Precalc ships 36 of them against a 38-question Section I sitting — a
  // content shortfall the build already reports as an error (33 exam-tested
  // Precalc topics have no items at all). The selector's job there is to refuse
  // at 36, not to invent two questions out of unit 4.
  for (const subject of ['ap_csa', 'ap_precalc']) {
    await t.test(`${subject}: all ${CONFIG[subject].readiness.total_logged_mocks_min} sittings reach the length the bank allows`, () => {
      const bank = bankOf(subject)
      const { config, topicMeta } = bank
      const needed = Math.ceil(config.exam.mcq_count * MIN_MOCK_COVERAGE)
      const supply = onExamItems(bank).length
      const reachable = Math.min(needed, supply)
      const start = new Date('2026-09-01T12:00:00Z').getTime()
      const attempts = []
      for (let mock = 1; mock <= config.readiness.total_logged_mocks_min; mock++) {
        const { paper, refusedAt } = sitPaper({
          bank, attempts, mockId: mock, questions: needed, startMs: start + mock * 7 * DAY_MS,
        })
        assert.equal(
          paper.length, reachable,
          `${subject} sitting ${mock} served ${paper.length} of the ${reachable} its on-exam bank can supply` +
            (refusedAt ? ` (refused at question ${refusedAt})` : ''),
        )
        assert.equal(
          new Set(paper.map((it) => it.id)).size, reachable,
          `sitting ${mock} asked a question twice — the same item twice is not two questions of evidence`,
        )
        for (const it of paper) {
          assert.notEqual(
            topicMeta.get(it.topic)?.tested_on_exam, 0,
            `sitting ${mock} served ${it.id} on class-only topic ${it.topic}; handleMockSubmit scores every ` +
              'server-graded answer in the sitting, so this lands in composite_pct',
          )
        }
        if (reachable < needed) {
          assert.equal(
            refusedAt, reachable + 1,
            `${subject} can only supply ${reachable} on-exam questions, so the sitting must refuse at ${reachable + 1} ` +
              'rather than pad the paper with untested material',
          )
        }
      }
    })
  }
})

// ---------------------------------------------------------------------------
// A proctored sitting samples the paper; it does not remediate
// ---------------------------------------------------------------------------

test('sampling: mock skips the remediation priorities', async (t) => {
  await t.test('a taught gap is NOT re-tested inside a sitting', () => {
    const gaps = [{ topic: 'b', opened_at: ago(9), taught_at: ago(8), cleared_at: null }]
    const base = { items: ITEMS, attempts: [], gaps, topicMeta: META, config: CFG, now: NOW }
    assert.equal(pickNext(base).priority, 'gap_retest', 'ordinary practice still re-tests it')
    assert.notEqual(
      pickNext({ ...base, sampling: 'mock', mockId: 7 }).priority, 'gap_retest',
      'a sitting stands in for the real exam, which does not re-test his gaps',
    )
  })

  await t.test('the weakest topic does NOT drive a sitting', () => {
    const attempts = [
      attempt('a1', 'a', 0, 20), attempt('a2', 'a', 1, 19),
      attempt('b1', 'b', 0, 18), attempt('b2', 'b', 0, 17),
      attempt('c1', 'c', 1, 16), attempt('c2', 'c', 1, 15),
    ]
    const base = { items: ITEMS, attempts, topicMeta: META, config: CFG, now: NOW }
    assert.equal(pickNext(base).priority, 'weakest', 'ordinary practice still works the weak topic')
    const inMock = pickNext({ ...base, sampling: 'mock', mockId: 7 })
    assert.equal(inMock.priority, 'mock_breadth')
    assert.doesNotMatch(inMock.reason, /below the/, 'a sitting is not justified as remediation')
  })

  await t.test('a due spaced review does NOT drive a sitting', () => {
    const attempts = [
      attempt('a1', 'a', 0, 40), attempt('a2', 'a', 1, 39),
      attempt('a3', 'a', 1, 38), attempt('a1', 'a', 1, 37),
      ...['b', 'c'].flatMap((tp) => [1, 2, 3].map((i) => attempt(`${tp}${i}`, tp, 1, 30))),
    ]
    const base = { items: ITEMS, attempts, topicMeta: META, config: CFG, now: NOW, reuseDays: 20 }
    assert.equal(pickNext(base).priority, 'review', 'ordinary practice still reviews it')
    assert.equal(pickNext({ ...base, sampling: 'mock', mockId: 7 }).priority, 'mock_breadth')
  })

  await t.test('a sitting still fills a topic he has never attempted', () => {
    // Coverage is not remediation: a topic with no attempts is part of the exam
    // and a sitting that skipped it would not be a sitting of the paper.
    const r = pickNext({ items: ITEMS, attempts: [], topicMeta: META, config: CFG, now: NOW, sampling: 'mock', mockId: 7 })
    assert.equal(r.priority, 'coverage')
  })

  await t.test('the paper spreads across topics in proportion to exam weight', () => {
    // Four items a topic, every one answered 60 days ago, so nothing is unseen
    // and everything is servable again. b is at 0% — under ordinary practice it
    // would take every question in the sitting.
    const items = ['a', 'b', 'c'].flatMap((topic) =>
      [1, 2, 3, 4].map((i) => ({ id: `${topic}${i}`, topic, unit: '1', kind: 'mcq', answer: 'A' })),
    )
    const history = items.map((it) => attempt(it.id, it.topic, it.topic === 'b' ? 0 : 1, 60))
    assert.equal(
      pickNext({ items, attempts: history, topicMeta: META, config: CFG, now: NOW }).item.topic, 'b',
      'ordinary practice works the weak topic; the sitting below must not',
    )

    let attempts = history
    const sat = []
    const servedIds = []
    for (let i = 0; i < 6; i++) {
      const r = pickNext({ items, attempts, topicMeta: META, config: CFG, now: NOW, sampling: 'mock', mockId: 7 })
      assert.equal(r.priority, 'mock_breadth')
      sat.push(r.item.topic)
      servedIds.push(r.item.id)
      // Answered inside the sitting, exactly as api.js would have recorded it.
      attempts = [...attempts, attempt(r.item.id, r.item.topic, 1, 0, { mock_id: 7, conditions: 'proctored_mock' })]
    }

    const count = (topic) => sat.filter((x) => x === topic).length
    assert.deepEqual([...new Set(sat)].sort(), ['a', 'b', 'c'], `every topic must appear: ${sat.join(', ')}`)
    assert.ok(count('a') > count('b'), `a is worth 35% and b 14%: ${sat.join(', ')}`)
    assert.ok(count('c') >= count('b'), `c is worth 30% and b 14%: ${sat.join(', ')}`)
    assert.equal(new Set(servedIds).size, 6, `no question may be asked twice in one sitting: ${servedIds.join(', ')}`)
  })

  await t.test('the same sitting replays identically however the bank is ordered', () => {
    const attempts = ITEMS.map((it) => attempt(it.id, it.topic, 1, 60))
    const picks = [ITEMS, [...ITEMS].reverse(), [...ITEMS.slice(4), ...ITEMS.slice(0, 4)]].map(
      (order) => pickNext({ items: order, attempts, topicMeta: META, config: CFG, now: NOW, sampling: 'mock', mockId: 7 }).item.id,
    )
    assert.equal(new Set(picks).size, 1, `order-dependent: ${picks.join(', ')}`)
  })
})

// ---------------------------------------------------------------------------
// What a WHOLE paper looks like.
//
// Every test above serves a sitting one question at a time and asks whether that
// one question was reasonable. None of them asks the question the module header
// actually claims to answer — "is the finished paper a sample of the exam?" — and
// that is where the damage is, because handleMockSubmit scores the whole paper
// into composite_pct, and composite_pct is the only number that moves readiness.
// A sitting that shuts a unit out, or over-serves a unit because it happens to
// carry more topic rows, produces a score about a different exam.
//
// The papers below are 42 questions — a full sitting's mcq_count. That used to
// be exactly what api.js required of a section 'full' sitting:
// ceil((mcq_count + frq_count) * 0.9) = ceil(46 * 0.9) = 42. Since 18add4f,
// coverage is measured against `scorable`, not that raw exam-table total: CSA's
// frq half is rubric-scored (MODEL_GRADED), so it contributes nothing to
// `scorable`, leaving scorable = mcq_count = 42 and a real requirement of
// ceil(42 * 0.9) = 38. 42 is still used here because it is a whole, realistic
// full sitting to sample from — comfortably above the 38 now required, not
// pinned to it.
// ---------------------------------------------------------------------------

/** ceil((mcq_count + frq_count) * 0.9) — a whole full-paper sitting's worth of
 *  questions, no longer the exact figure api.js requires (see the comment
 *  above); it is comfortably above that lower, scorable-based bar. */
function fullPaperLength(config) {
  return Math.ceil((config.exam.mcq_count + config.exam.frq_count) * MIN_MOCK_COVERAGE)
}

test('a full sitting samples the exam rather than a corner of it', async (t) => {
  await t.test('CSA: no exam-tested unit is shut out of the first mock he ever sits', () => {
    // The paper the coverage branch used to compose on its own: ordered by exam
    // weight descending, it walked unit 4 then 2 then 1 and never reached unit 3
    // — 14% of the exam, 9 topics, 29 items — so the first mock of his life
    // scored him on three quarters of the syllabus and called it a composite.
    const bank = bankOf('ap_csa')
    const { paper } = sitPaper({
      bank, attempts: [], mockId: 1, questions: fullPaperLength(bank.config),
      startMs: new Date('2026-09-01T12:00:00Z').getTime(),
    })
    assert.equal(paper.length, 42, 'a full sitting is 42 questions')
    const shares = unitShares(paper)
    for (const unit of entitlements(bank).keys()) {
      assert.ok(
        (shares.get(unit) ?? 0) > 0,
        `unit ${unit} got none of the 42 questions: ${[...shares].map(([u, s]) => `u${u} ${s.toFixed(1)}%`).join(', ')}`,
      )
    }
  })

  for (const subject of ['ap_csa', 'ap_precalc']) {
    await t.test(`${subject}: realized unit shares track the exam's unit weights`, () => {
      // Tolerance: 5 percentage points. A 42-question paper cannot land on an
      // arbitrary share exactly — one question is 2.4 points — and the readiness
      // engine's own max_decline_between_mocks is 5, so a composition error
      // larger than that can manufacture a "decline" on its own.
      const bank = bankOf(subject)
      const owed = entitlements(bank)
      const attempts = []
      const start = new Date('2026-09-01T12:00:00Z').getTime()
      for (let mock = 1; mock <= 3; mock++) {
        const { paper } = sitPaper({
          bank, attempts, mockId: mock, questions: fullPaperLength(bank.config),
          startMs: start + mock * 7 * DAY_MS,
        })
        const shares = unitShares(paper)
        for (const [unit, want] of owed) {
          const got = shares.get(unit) ?? 0
          assert.ok(
            Math.abs(got - want) <= 5,
            `sitting ${mock} unit ${unit}: served ${got.toFixed(1)}%, entitled ${want.toFixed(1)}% — ` +
              `${[...shares].map(([u, s]) => `u${u} ${s.toFixed(1)}%`).join(', ')}`,
          )
        }
      }
    })
  }

  await t.test('CSA: a knowledge profile that never changes produces a composite that never moves', () => {
    // The whole point of the composition rules. He knows exactly as much on the
    // day of sitting 3 as on the day of sitting 1; the readiness engine reads a
    // drop of more than max_decline_between_mocks as evidence he is getting
    // worse, and a single sitting below composite_floor_min as a hard fail. Both
    // of those must be caused by HIM, never by which units the paper drew from.
    const bank = bankOf('ap_csa')
    const accuracy = { 1: 0.9, 2: 0.7, 3: 0.4, 4: 0.7 }
    const attempts = []
    const start = new Date('2026-09-01T12:00:00Z').getTime()
    const composites = []
    for (let mock = 1; mock <= 3; mock++) {
      const { paper } = sitPaper({
        bank, attempts, mockId: mock, questions: fullPaperLength(bank.config),
        startMs: start + mock * 7 * DAY_MS, accuracy,
      })
      const ofThis = attempts.filter((a) => a.mock_id === mock)
      composites.push((ofThis.filter((a) => a.correct).length / paper.length) * 100)
    }
    // What the exam's own weights say this profile is worth.
    const owed = entitlements(bank)
    const expected = [...owed].reduce((s, [unit, pct]) => s + (pct / 100) * accuracy[unit] * 100, 0)
    const worstDrop = Math.max(...composites.slice(1).map((c, i) => composites[i] - c))
    const tolerance = bank.config.readiness.max_decline_between_mocks
    assert.ok(
      worstDrop <= tolerance,
      `composites ${composites.map((c) => c.toFixed(1)).join(' / ')} — worst drop ${worstDrop.toFixed(1)} pts against ` +
        `a ${tolerance}-point tolerance, with ZERO change in what the student knows`,
    )
    for (const c of composites) {
      assert.ok(
        Math.abs(c - expected) <= 5,
        `composite ${c.toFixed(1)} against the ${expected.toFixed(1)} this profile is worth on the real weighting; ` +
          `all three: ${composites.map((x) => x.toFixed(1)).join(' / ')}`,
      )
    }
  })

  await t.test('a unit does not get a bigger share of the paper for having more topic rows', () => {
    // exam_weight_low/high is a UNIT weight, replicated onto every topic in that
    // unit. Normalizing it across TOPICS therefore hands a unit a share
    // proportional to weight x topicCount: the heavy unit below is worth 60% of
    // the exam and carries one topic, the light unit 40% across three, so
    // topic-granular arithmetic serves the heavy unit 1/(1+3)... of nothing like
    // 60%. Every fixture above has one topic per unit, which is exactly why none
    // of them can see this.
    const heavy = { unit: 'H', exam_weight_low: 60, exam_weight_high: 60, tested_on_exam: 1 }
    const light = { unit: 'L', exam_weight_low: 40, exam_weight_high: 40, tested_on_exam: 1 }
    const topicMeta = new Map([['h1', heavy], ['l1', light], ['l2', light], ['l3', light]])
    const items = [...topicMeta].flatMap(([topic, meta]) =>
      Array.from({ length: 40 }, (_, i) => ({ id: `${topic}-${String(i + 1).padStart(2, '0')}`, topic, unit: meta.unit, kind: 'mcq', answer: 'A' })),
    )
    // Coverage pre-satisfied and long past the reuse window, so the paper is
    // composed entirely by the breadth rule.
    const attempts = [...topicMeta.keys()].map((topic) => attempt(`${topic}-01`, topic, 1, 100))
    const paper = []
    for (let q = 0; q < 40; q++) {
      const r = pickNext({ items, attempts, topicMeta, config: CFG, now: NOW, sampling: 'mock', mockId: 7 })
      assert.equal(r.priority, 'mock_breadth')
      paper.push(r.item)
      attempts.push(attempt(r.item.id, r.item.topic, 1, 0, { mock_id: 7, conditions: 'proctored_mock' }))
    }
    const served = (unit) => paper.filter((it) => it.unit === unit).length
    assert.ok(
      Math.abs(served('H') - 24) <= 2,
      `the 60% unit was served ${served('H')} of 40 questions, not ~24 — the 40% unit took ${served('L')}`,
    )
  })

  await t.test('a proctored sitting is never padded with material the exam does not test', () => {
    // Precalc: 48 items on 4 topics, and topic 4.0 (unit 4, tested_on_exam 0)
    // holds 12 of them. A full paper wants 42 and the on-exam bank has 36, so
    // the lower fallback tiers used to make up the difference out of unit 4 —
    // with the sitting's "the way the exam weights it" reason attached, on every
    // single sitting. handleMockSubmit scores every server-graded answer in a
    // sitting with no unit filter, so that lands straight in composite_pct.
    const bank = bankOf('ap_precalc')
    const supply = onExamItems(bank).length
    assert.equal(supply, 36, 'precondition: the on-exam Precalc bank is shorter than one full paper')
    const { paper, refusedAt } = sitPaper({
      bank, attempts: [], mockId: 1, questions: fullPaperLength(bank.config),
      startMs: new Date('2026-09-01T12:00:00Z').getTime(),
    })
    for (const it of paper) {
      assert.notEqual(
        bank.topicMeta.get(it.topic)?.tested_on_exam, 0,
        `${it.id} is on class-only topic ${it.topic}, and it was served inside a proctored sitting`,
      )
    }
    assert.equal(paper.length, supply, 'the paper is as long as the on-exam bank allows and no longer')
    assert.equal(refusedAt, supply + 1, 'and then it refuses, rather than reaching for untested material')
  })

  await t.test('an exhausted bank still never asks the same question twice on one paper', () => {
    // A heavy unit with a thin bank is the case where the no-repeat-on-one-paper
    // rule is the ONLY thing standing between the student and a duplicate: unit
    // H is worth 80% of the exam and holds four questions, so the breadth rule
    // wants to serve it nine times out of twelve. Everything has been answered
    // inside the reuse window, so every serve is a degraded repeat and the pool
    // sort alone will happily hand back an item already on this paper.
    const heavy = { unit: 'H', exam_weight_low: 80, exam_weight_high: 80, tested_on_exam: 1 }
    const light = { unit: 'L', exam_weight_low: 20, exam_weight_high: 20, tested_on_exam: 1 }
    const topicMeta = new Map([['h1', heavy], ['l1', light]])
    const items = [
      ...Array.from({ length: 4 }, (_, i) => ({ id: `h1-${i + 1}`, topic: 'h1', unit: 'H', kind: 'mcq', answer: 'A' })),
      ...Array.from({ length: 20 }, (_, i) => ({ id: `l1-${String(i + 1).padStart(2, '0')}`, topic: 'l1', unit: 'L', kind: 'mcq', answer: 'A' })),
    ]
    let attempts = items.map((it) => attempt(it.id, it.topic, 1, 3))
    const paper = []
    for (let q = 0; q < 12; q++) {
      const r = pickNext({ items, attempts, topicMeta, config: CFG, now: NOW, sampling: 'mock', mockId: 7, reuseDays: 56 })
      assert.notEqual(r, null, `refused at question ${q + 1} with 24 items in the bank`)
      assert.equal(r.repeat, true, 'precondition: the whole bank is inside the reuse window')
      paper.push(r.item.id)
      attempts = [...attempts, attempt(r.item.id, r.item.topic, 1, 0, { mock_id: 7, conditions: 'proctored_mock' })]
    }
    assert.equal(new Set(paper).size, 12, `a question was asked twice on one paper: ${paper.join(', ')}`)
  })

  await t.test('precalc: an exhausted bank yields a whole paper of distinct questions', () => {
    const bank = bankOf('ap_precalc')
    const supply = onExamItems(bank).length
    const seed = bank.items.map((it) => ({
      item_id: it.id, topic: it.topic, unit: it.unit, response: 'A', correct: true,
      ts: new Date(new Date('2026-09-01T12:00:00Z').getTime() - 3 * DAY_MS).toISOString(),
      hints_used: 0, conditions: 'cold', graded_by: 'server', kind: it.kind,
    }))
    const { paper } = sitPaper({
      bank, attempts: seed, mockId: 1, questions: supply,
      startMs: new Date('2026-09-01T12:00:00Z').getTime(),
    })
    assert.equal(paper.length, supply)
    assert.ok(paper.every((it) => it.repeat), 'precondition: every serve here is a degraded repeat')
    assert.equal(new Set(paper.map((it) => it.id)).size, supply, 'a question was asked twice on one paper')
  })

  await t.test("exam weight breaks a tie between two units owed the same share", () => {
    // Unit `z` is worth half the exam, `b` and `c` a quarter each. After 7
    // questions filed under this sitting — 3 in z, 1 in b, 3 in c — z and b are
    // owed exactly 1.0 of the eighth question each, and the heavier unit must take
    // it. The unit names are chosen so that the alphabet DISAGREES with the
    // weighting: without the exam-weight comparison the tie falls through to the
    // name and 'b' wins.
    const meta = (unit, w) => ({ unit, exam_weight_low: w, exam_weight_high: w, tested_on_exam: 1 })
    const topicMeta = new Map([['zt', meta('z', 50)], ['bt', meta('b', 25)], ['ct', meta('c', 25)]])
    const items = [...topicMeta].flatMap(([topic, m]) =>
      Array.from({ length: 8 }, (_, i) => ({ id: `${topic}${i + 1}`, topic, unit: m.unit, kind: 'mcq', answer: 'A' })),
    )
    const mine = { mock_id: 7, conditions: 'proctored_mock' }
    const attempts = [
      ...[1, 2, 3].map((i) => attempt(`zt${i}`, 'zt', 1, 0, mine)),
      attempt('bt1', 'bt', 1, 0, mine),
      ...[1, 2, 3].map((i) => attempt(`ct${i}`, 'ct', 1, 0, mine)),
    ]
    const r = pickNext({ items, attempts, topicMeta, config: CFG, now: NOW, sampling: 'mock', mockId: 7 })
    assert.equal(r.item.topic, 'zt', 'units z and b are both owed 1.0; z carries twice the exam weight')
  })

  await t.test('a sitting replays identically however the real bank is ordered', () => {
    const bank = bankOf('ap_csa')
    const shuffled = [...bank.items]
    // A fixed, reproducible shuffle — a seeded walk, not Math.random, so a
    // failure can be replayed.
    for (let i = shuffled.length - 1, k = 7; i > 0; i--) {
      k = (k * 48271) % 2147483647
      const j = k % (i + 1)
      ;[shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]]
    }
    const orders = {
      given: bank.items,
      reversed: [...bank.items].reverse(),
      rotated: [...bank.items.slice(37), ...bank.items.slice(0, 37)],
      shuffled,
    }
    const papers = Object.entries(orders).map(([label, items]) => {
      const { paper } = sitPaper({
        bank: { ...bank, items }, attempts: [], mockId: 1, questions: fullPaperLength(bank.config),
        startMs: new Date('2026-09-01T12:00:00Z').getTime(),
      })
      return [label, paper.map((it) => it.id).join(',')]
    })
    assert.equal(
      new Set(papers.map(([, p]) => p)).size, 1,
      `order-dependent paper: ${papers.map(([l, p]) => `${l}=${p.slice(0, 60)}...`).join(' | ')}`,
    )
  })
})

// ---------------------------------------------------------------------------
// A PARTIALLY WORN bank, sat as a paper.
//
// Every sitting above starts from a virgin history or a wholly exhausted one, and
// those are the two states in which the reuse window CANNOT distort a paper: in
// the first nothing is inside the window, in the second everything is, so either
// way every unit is equally available. The state the student is actually in after
// a week is neither. He has worked the heavy units hardest — the selector sent him
// there — so their items cross into the reuse window FIRST, while the light units
// still hold never-asked ones.
//
// In that state a global "serve nothing inside the window while anything outside
// it exists" rule stops being a freshness preference and becomes a filter on which
// UNITS may appear on the paper at all. handleMockSubmit scores the whole paper
// into composite_pct with no unit filter, so a unit absent from the paper is a
// unit absent from the only number that moves readiness — and the number comes out
// HIGH, because the unit he cannot do was never asked. That is an overstatement of
// readiness produced by the composition rule, which is the one failure this
// module's header promises it does not have.
// ---------------------------------------------------------------------------

test('a sitting on a partially worn bank is still a sample of the whole exam', async (t) => {
  const START = new Date('2026-09-01T12:00:00Z').getTime()
  /** ceil(mcq_count * 0.9) — what api.js actually requires before it will score. */
  const scoredLength = (config) => Math.ceil(config.exam.mcq_count * MIN_MOCK_COVERAGE)

  // 140 and 180 answers at 20 a day are 7 and 9 days of ordinary drilling against
  // CSA's 28-day reuse window — the first fortnight of use, at well under the ~50
  // answers a day db.js sizes itself for. At 140 one unit has no item outside the
  // window; at 180, two do.
  for (const answers of [140, 180]) {
    await t.test(`${answers} answers of drilling later, unit shares still track the exam's weights`, () => {
      const bank = bankOf('ap_csa')
      const owed = entitlements(bank)
      const { attempts, endedMs } = drillDays({ bank, answers, startMs: START })
      const census = windowCensus({ bank, attempts, atMs: endedMs })
      const stale = [...census].filter(([, c]) => c.outside === 0).map(([u]) => u)
      const fresh = [...census].filter(([, c]) => c.outside > 0).map(([u]) => u)
      assert.ok(
        stale.length > 0 && fresh.length > 0,
        `precondition: after ${answers} answers some unit must be wholly inside the reuse window while another is ` +
          `not, or this test proves nothing — ${[...census].map(([u, c]) => `u${u} out=${c.outside} in=${c.inside}`).join(', ')}`,
      )

      const questions = scoredLength(bank.config)
      const { paper, refusedAt } = sitPaper({
        bank, attempts, mockId: 1, questions, startMs: endedMs,
      })
      assert.equal(paper.length, questions, `the sitting served ${paper.length} of ${questions}${refusedAt ? ` (refused at ${refusedAt})` : ''}`)
      const shares = unitShares(paper)
      const table = [...owed.keys()].map((u) => `u${u} ${(shares.get(u) ?? 0).toFixed(1)}%`).join(' / ')
      for (const [unit, want] of owed) {
        const got = shares.get(unit) ?? 0
        assert.ok(
          Math.abs(got - want) <= 5,
          `unit ${unit}: served ${got.toFixed(1)}% of the paper, entitled to ${want.toFixed(1)}% — ${table}. ` +
            `Units wholly inside the reuse window: ${stale.length ? stale.map((u) => `u${u}`).join(', ') : 'none'}. ` +
            'A unit missing from the paper is missing from composite_pct, and the score comes out high.',
        )
      }
    })
  }

  await t.test('a fixed knowledge profile scores what it is worth, not what the paper happened to ask', () => {
    // He is good at units 1-3 and cannot do unit 4 — which is 35.4% of the exam,
    // the heaviest unit there is. On the real weighting that profile is worth about
    // 72, comfortably under composite_floor_min 78. A paper that omits unit 4
    // scores him around 90 and qualifies him for an exam he would fail.
    const bank = bankOf('ap_csa')
    const accuracy = { 1: 0.9, 2: 0.9, 3: 0.9, 4: 0.4 }
    const owed = entitlements(bank)
    const worth = [...owed].reduce((s, [unit, pct]) => s + (pct / 100) * accuracy[unit] * 100, 0)
    const { attempts, endedMs } = drillDays({ bank, answers: 140, startMs: START })
    const { paper } = sitPaper({
      bank, attempts, mockId: 1, questions: scoredLength(bank.config), startMs: endedMs, accuracy,
    })
    const mine = attempts.filter((a) => a.mock_id === 1)
    const composite = (mine.filter((a) => a.correct).length / paper.length) * 100
    assert.ok(
      Math.abs(composite - worth) <= 5,
      `composite ${composite.toFixed(1)} against the ${worth.toFixed(1)} this profile is worth on the real ` +
        `weighting; unit shares ${[...unitShares(paper)].sort().map(([u, s]) => `u${u} ${s.toFixed(1)}%`).join(' / ')}. ` +
        `composite_floor_min is ${bank.config.readiness.composite_floor_min}.`,
    )
  })

  await t.test('a question the worn unit has already answered recently is served as a labelled repeat', () => {
    // The other half of the same fix. Letting a unit whose own items are all inside
    // the reuse window back onto the paper is only honest if the questions it
    // contributes are labelled for what they are: a remembered answer is practice,
    // not evidence about an unseen question. Selling one as fresh would replace one
    // overstatement with another.
    const bank = bankOf('ap_csa')
    const { attempts, endedMs } = drillDays({ bank, answers: 140, startMs: START })
    const census = windowCensus({ bank, attempts, atMs: endedMs })
    const stale = new Set([...census].filter(([, c]) => c.outside === 0).map(([u]) => u))
    assert.ok(stale.size > 0, 'precondition: some unit is wholly inside the reuse window')
    const { paper } = sitPaper({
      bank, attempts, mockId: 1, questions: scoredLength(bank.config), startMs: endedMs,
    })
    const fromStale = paper.filter((it) => stale.has(it.unit))
    assert.ok(fromStale.length > 0, `precondition: the paper drew on unit(s) ${[...stale].join(', ')}`)
    for (const it of fromStale) {
      assert.equal(it.repeat, true, `${it.id} is inside the reuse window but was not flagged as a repeat`)
      assert.match(it.reason, /answered this exact question before/i, `${it.id}: ${it.reason}`)
      assert.match(it.reason, /memory check|not fresh evidence/i, `${it.id}: ${it.reason}`)
    }
    // And the other direction: a unit that still has never-asked items must supply
    // one, not a repeat, so freshness stays a real preference inside the pool.
    const freshUnits = new Set([...census].filter(([, c]) => c.outside > 0).map(([u]) => u))
    const fromFresh = paper.filter((it) => freshUnits.has(it.unit))
    assert.ok(fromFresh.length > 0, 'precondition: the paper also drew on a unit with items outside the window')
    assert.ok(
      fromFresh.some((it) => !it.repeat),
      'every question from a unit with fresh items left was a repeat — a repeat displaced a fresh question',
    )
  })
  await t.test('a never-asked question wins an otherwise arbitrary tie between two units', () => {
    // Two units, identical exam weight, one item each, and the paper has asked
    // neither — so they are owed exactly the same share and the tie used to fall
    // through to the unit NAME. Unit A sorts first alphabetically but its only
    // question was answered an hour ago; unit B's has never been asked. Preferring
    // B costs the sample nothing, because A is owed just as much and takes the very
    // next question — and it means the paper does not open with a remembered
    // question when a fresh one was there for nothing.
    const meta = (unit) => ({ unit, exam_weight_low: 25, exam_weight_high: 25, tested_on_exam: 1 })
    const topicMeta = new Map([['at', meta('A')], ['bt', meta('B')]])
    const items = [
      { id: 'a1', topic: 'at', unit: 'A', kind: 'mcq', answer: 'A' },
      { id: 'b1', topic: 'bt', unit: 'B', kind: 'mcq', answer: 'A' },
    ]
    const args = {
      items, attempts: [attempt('a1', 'at', 1, 1 / 24)], topicMeta, config: CFG, now: NOW,
      sampling: 'mock', mockId: 7, reuseDays: 28,
    }
    const first = pickNext(args)
    assert.equal(first.item.id, 'b1', 'unit A sorts first by name, but its question is an hour old')
    assert.notEqual(first.repeat, true)
    // And the loser is not dropped: it takes the next question, as a labelled repeat.
    const second = pickNext({
      ...args,
      attempts: [...args.attempts, attempt('b1', 'bt', 1, 0, { mock_id: 7, conditions: 'proctored_mock' })],
    })
    assert.equal(second.item.id, 'a1', 'unit A is owed just as much and takes the next question')
    assert.equal(second.repeat, true, 'and it is labelled, because he answered it an hour ago')
  })
})

// ---------------------------------------------------------------------------
// The reason the student reads, and the flag the caller acts on
// ---------------------------------------------------------------------------

test('a degraded repeat is reported in words AND in a shape a caller can persist', async (t) => {
  await t.test('the flag carries which answer made it a repeat, not just a boolean', () => {
    // `repeat: true` on its own has no consumer: handleNext does not forward it,
    // recordAttempt stores no marker, and the mock composite counts a remembered
    // answer identically to a first-time one. The value below is what api.js
    // needs in order to persist that distinction — see the module header.
    const attempts = ITEMS.map((it) => attempt(it.id, it.topic, 1, 3))
    const r = pickNext({ items: ITEMS, attempts, topicMeta: META, config: CFG, now: NOW, reuseDays: 56 })
    assert.equal(r.repeat, true)
    assert.equal(r.repeat_of.item_id, r.item.id, 'the flag names the item it is a repeat of')
    assert.equal(r.repeat_of.last_answered_at, ago(3), 'and when he last answered it')
    assert.equal(r.repeat_of.days_since, 3)
  })

  await t.test('a fresh serve carries neither the flag nor the marker', () => {
    const r = pickNext({ items: ITEMS, attempts: [], topicMeta: META, config: CFG, now: NOW })
    assert.equal(r.repeat, undefined)
    assert.equal(r.repeat_of, undefined, 'a caller keying on presence must not see one on fresh evidence')
  })

  await t.test('an answer from yesterday evening is not described as answered today', () => {
    // NOW is noon UTC. Sixteen hours earlier is 20:00 the previous calendar day,
    // which is 0.67 days — and "you answered it today" about yesterday evening
    // is a statement the student can check and find false.
    const items = [
      { id: 'x1', topic: 'a', unit: '1', kind: 'mcq', answer: 'A' },
      { id: 'x2', topic: 'a', unit: '1', kind: 'mcq', answer: 'A' },
    ]
    const attempts = [attempt('x1', 'a', 1, 16 / 24), attempt('x2', 'a', 1, 2 / 24)]
    const r = pickNext({ items, attempts, topicMeta: META, config: CFG, now: NOW, reuseDays: 56 })
    assert.equal(r.item.id, 'x1', 'the 16-hour-old question is the more forgotten one')
    assert.equal(r.repeat, true)
    assert.doesNotMatch(r.reason, /answered it today/, 'it was answered at 20:00 the day before')
    assert.match(r.reason, /yesterday/)
  })

  await t.test('an answer from earlier the same day IS described as today', () => {
    const items = [{ id: 'x1', topic: 'a', unit: '1', kind: 'mcq', answer: 'A' }]
    const r = pickNext({
      items, attempts: [attempt('x1', 'a', 1, 2 / 24)], topicMeta: META, config: CFG, now: NOW, reuseDays: 56,
    })
    assert.equal(r.repeat, true)
    assert.match(r.reason, /today/)
    assert.doesNotMatch(r.reason, /yesterday/)
  })

  await t.test('breadth calls fresh ground fresh, and a repeat another go', () => {
    // One sentence, two states, and the wrong one contradicts the repeat
    // sentence appended right after it — "fresh ground on a ... you have
    // answered this exact question before".
    const fresh = pickNext({
      items: ITEMS,
      attempts: ['a', 'b', 'c'].map((tp) => attempt(`${tp}1`, tp, 1, 3)),
      topicMeta: META, config: CFG, now: NOW, reuseDays: 56,
    })
    assert.equal(fresh.priority, 'breadth')
    assert.notEqual(fresh.repeat, true)
    assert.match(fresh.reason, /fresh ground on/)

    const worn = pickNext({
      items: ITEMS, attempts: ITEMS.map((it) => attempt(it.id, it.topic, 1, 3)),
      topicMeta: META, config: CFG, now: NOW, reuseDays: 56,
    })
    assert.equal(worn.priority, 'breadth')
    assert.equal(worn.repeat, true)
    assert.match(worn.reason, /another go at/)
    assert.doesNotMatch(worn.reason, /fresh ground/, 'a question he answered three days ago is not fresh ground')
  })
})

// ---------------------------------------------------------------------------
// excludeItemIds — the caller's window on serves that have not been logged yet.
//
// A serve is invisible to the selector until an attempt row exists for it, so
// two /next calls inside one sitting can hand out the same item. api.js closes
// that by passing the ids it has already served and not yet seen logged; the
// selector's part of the contract is to drop them from EVERY pool.
// ---------------------------------------------------------------------------

test('excludeItemIds removes an item from every pool', async (t) => {
  const base = { topicMeta: META, config: CFG, now: NOW }

  await t.test('a coverage pick skips an excluded item', () => {
    const r = pickNext({ ...base, items: ITEMS, attempts: [], excludeItemIds: ['a1'] })
    assert.equal(r.priority, 'coverage')
    assert.equal(r.item.id, 'a2', 'still topic a, but not the excluded question')
  })

  await t.test('a Set and an array are both accepted', () => {
    const asArray = pickNext({ ...base, items: ITEMS, attempts: [], excludeItemIds: ['a1', 'a2'] })
    const asSet = pickNext({ ...base, items: ITEMS, attempts: [], excludeItemIds: new Set(['a1', 'a2']) })
    assert.equal(asArray.item.id, 'a3')
    assert.equal(asSet.item.id, 'a3')
  })

  await t.test('the default excludes nothing', () => {
    assert.equal(pickNext({ ...base, items: ITEMS, attempts: [] }).item.id, 'a1')
    assert.equal(pickNext({ ...base, items: ITEMS, attempts: [], excludeItemIds: [] }).item.id, 'a1')
  })

  await t.test('a gap re-test skips an excluded item', () => {
    const gaps = [{ topic: 'b', opened_at: ago(9), taught_at: ago(8), cleared_at: null }]
    const r = pickNext({ ...base, items: ITEMS, attempts: [], gaps, excludeItemIds: ['b1'] })
    assert.equal(r.priority, 'gap_retest')
    assert.equal(r.item.id, 'b2')
  })

  await t.test('the weakest topic skips an excluded item', () => {
    const attempts = [
      attempt('b1', 'b', 0, 60), attempt('b2', 'b', 0, 59),
      attempt('a1', 'a', 1, 58), attempt('c1', 'c', 1, 57),
    ]
    const r = pickNext({ ...base, items: ITEMS, attempts, excludeItemIds: ['b3'] })
    assert.equal(r.priority, 'weakest')
    assert.equal(r.item.topic, 'b')
    assert.notEqual(r.item.id, 'b3')
  })

  await t.test('a mock pick skips an excluded item', () => {
    const r = pickNext({ ...base, items: ITEMS, attempts: [], sampling: 'mock', mockId: 7, excludeItemIds: ['a1', 'a2'] })
    assert.equal(r.item.id, 'a3')
  })

  await t.test('an excluded item is not served even when the whole bank is inside the reuse window', () => {
    // The degraded-repeat path is the one that reaches for anything at all, so
    // it is the one where a double-serve would otherwise slip through.
    const ages = { a1: 1, a2: 2, a3: 3, b1: 10, b2: 40, b3: 20, c1: 5, c2: 6, c3: 7 }
    const attempts = ITEMS.map((it) => attempt(it.id, it.topic, 1, ages[it.id]))
    const args = { ...base, items: ITEMS, attempts, reuseDays: 56 }
    assert.equal(pickNext(args).item.id, 'b2', 'precondition: b2 is the most forgotten')
    assert.equal(pickNext({ ...args, excludeItemIds: ['b2'] }).item.id, 'b3')
  })

  await t.test('excluding the whole bank returns null rather than a question already in flight', () => {
    const r = pickNext({ ...base, items: ITEMS, attempts: [], excludeItemIds: ITEMS.map((it) => it.id) })
    assert.equal(r, null)
  })
})

// ---------------------------------------------------------------------------
// Teaching
// ---------------------------------------------------------------------------

test('gap detection', async (t) => {
  await t.test('one miss is a slip, not a gap', () => {
    assert.deepEqual(detectGaps([attempt('a1', 'a', 0, 1)]), [])
  })

  await t.test('two DISTINCT misses on one topic is a gap', () => {
    const g = detectGaps([attempt('a1', 'a', 0, 2), attempt('a2', 'a', 0, 1)])
    assert.equal(g.length, 1)
    assert.equal(g[0].topic, 'a')
    assert.equal(g[0].distinct_misses, 2)
  })

  await t.test('missing the SAME item twice is not two gaps', () => {
    const g = detectGaps([attempt('a1', 'a', 0, 2), attempt('a1', 'a', 0, 1)])
    assert.deepEqual(g, [], 'one confusing question is not broad confusion')
  })

  await t.test('gaps are ranked by how much evidence there is', () => {
    const g = detectGaps([
      attempt('a1', 'a', 0, 5), attempt('a2', 'a', 0, 4),
      attempt('b1', 'b', 0, 3), attempt('b2', 'b', 0, 2), attempt('b3', 'b', 0, 1),
    ])
    assert.deepEqual(g.map((x) => x.topic), ['b', 'a'])
  })
})

test('gap reconciliation delivers a lesson once, not on every encounter', () => {
  const detected = [{ topic: 'a', distinct_misses: 2 }, { topic: 'b', distinct_misses: 2 }]
  const gaps = [
    { topic: 'a', opened_at: ago(5), taught_at: ago(4), cleared_at: null },
    { topic: 'c', opened_at: ago(9), taught_at: ago(8), cleared_at: ago(2) },
  ]
  const r = reconcileGaps({ detected, gaps })
  assert.deepEqual(r.to_open.map((x) => x.topic), ['b'], 'only b lacks a row')
  assert.deepEqual(r.to_teach.map((x) => x.topic), [], 'a was already taught')
  assert.deepEqual(r.open.map((x) => x.topic), ['a'], 'c is cleared and stays closed')
})

test('a gap closes only on an unaided correct answer after the lesson', async (t) => {
  const gap = { topic: 'a', opened_at: ago(5), taught_at: ago(4), cleared_at: null }

  await t.test('cold correct after teaching closes it', () => {
    assert.equal(clearsGap(gap, attempt('a3', 'a', 1, 1)), true)
  })

  await t.test('correct WITH a hint does not close it', () => {
    assert.equal(clearsGap(gap, attempt('a3', 'a', 1, 1, { hints_used: 1 })), false)
  })

  await t.test('correct while tutored does not close it', () => {
    assert.equal(clearsGap(gap, attempt('a3', 'a', 1, 1, { conditions: 'tutored' })), false)
  })

  await t.test('a wrong answer does not close it', () => {
    assert.equal(clearsGap(gap, attempt('a3', 'a', 0, 1)), false)
  })

  await t.test('a correct answer from BEFORE the lesson does not close it', () => {
    assert.equal(clearsGap(gap, attempt('a3', 'a', 1, 6)), false, 'must post-date the teaching')
  })

  await t.test('an untaught gap cannot be closed by a lucky correct answer', () => {
    const untaught = { topic: 'a', opened_at: ago(5), taught_at: null, cleared_at: null }
    assert.equal(clearsGap(untaught, attempt('a3', 'a', 1, 1)), false)
  })
})

test('a lesson carries the idea, an example, and the mistake actually made', () => {
  const teaching = new Map([['a', { plain_idea: 'idea', worked_example: 'example', common_mistake: 'trap' }]])
  const lesson = buildLesson({ topic: 'a', teaching, gap: { distinct_misses: 3 } })
  assert.equal(lesson.plain_idea, 'idea')
  assert.equal(lesson.worked_example, 'example')
  assert.equal(lesson.common_mistake, 'trap')
  assert.match(lesson.why_now, /3 different questions/)
  assert.match(lesson.then, /no hints/)
})

test('a missing lesson returns null instead of pretending to teach', () => {
  assert.equal(buildLesson({ topic: 'nope', teaching: new Map(), gap: {} }), null)
})
