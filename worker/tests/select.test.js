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

  await t.test('the same history always yields the same question', () => {
    const attempts = [attempt('a1', 'a', 0, 20), attempt('b1', 'b', 0, 18)]
    const runs = Array.from({ length: 5 }, () =>
      pickNext({ items: ITEMS, attempts, topicMeta: META, config: CFG, now: NOW }).item.id,
    )
    assert.equal(new Set(runs).size, 1, `nondeterministic: ${runs.join(',')}`)
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
