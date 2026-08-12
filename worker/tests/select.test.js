import { test } from 'node:test'
import assert from 'node:assert/strict'
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

  await t.test('a recently answered item is never re-served inside the reuse window', () => {
    const attempts = ITEMS.map((it) => attempt(it.id, it.topic, 1, 3))
    const r = pickNext({ items: ITEMS, attempts, topicMeta: META, config: CFG, now: NOW, reuseDays: 56 })
    assert.equal(r, null, 'bank exhausted rather than recycling a 3-day-old question')
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
