import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { validate, feasibility, MIN_MOCK_COVERAGE, ASSUMED_REUSE_DAYS, readinessConfigs } from '../validate.js'
import { buildTeaching } from '../parse-teaching.js'
import { MIN_MOCK_COVERAGE as API_MIN_MOCK_COVERAGE } from '../../../worker/src/api.js'
import { DEFAULT_REUSE_DAYS } from '../../../worker/src/select.js'

/**
 * No readiness configs, for the item-level checks below.
 *
 * The feasibility gate judges a whole SUBJECT'S BANK against that subject's
 * readiness config ("can 218 items supply six 38-question sittings?"), so a
 * two-item fixture is not a claim it can answer. These calls pass no configs; the
 * gate has its own tests further down, including one over the real bank.
 */
const NO_BANK = []

const TOPICS = [
  { id: '1.3', subject: 'ap_csa', unit: '1', ek: 'Integer division truncates' },
  { id: '1.5', subject: 'ap_csa', unit: '1', ek: 'Casting' },
]

function item(over = {}) {
  return {
    id: 'csa-ac-q1',
    subject: 'ap_csa',
    kind: 'mcq',
    stem: 'What is printed?',
    options: { A: '1', B: '2', C: '3', D: '4' },
    answer: 'C',
    explanation: 'because',
    topic: '1.3',
    practice: 'P3',
    allowOffSyllabus: false,
    ...over,
  }
}

test('a clean item produces no errors', () => {
  assert.deepEqual(validate([item()], TOPICS, NO_BANK).errors, [])
})

test('missing tags are errors', () => {
  const { errors } = validate([item({ topic: null, practice: null })], TOPICS, NO_BANK)
  assert.equal(errors.filter((e) => /missing topic/.test(e)).length, 1)
  assert.equal(errors.filter((e) => /missing practice/.test(e)).length, 1)
})

test('unparsed options are an error', () => {
  assert.match(validate([item({ options: null })], TOPICS, NO_BANK).errors.join('|'), /could not parse options/)
})

test('an answer key outside the options is an error', () => {
  assert.match(
    validate([item({ answer: 'E' })], TOPICS, NO_BANK).errors.join('|'),
    /answer key E is not one of the options/,
  )
})

test('an unknown topic is an error', () => {
  assert.match(
    validate([item({ topic: '9.9' })], TOPICS, NO_BANK).errors.join('|'),
    /topic 9\.9 is not in the coverage matrix/,
  )
})

test('an empty stem is an error', () => {
  assert.match(validate([item({ stem: '   ' })], TOPICS, NO_BANK).errors.join('|'), /empty stem/)
})

test('off-syllabus constructs in the stem are errors', () => {
  assert.match(
    validate([item({ stem: 'String s = "x"; s.charAt(0);' })], TOPICS, NO_BANK).errors.join('|'),
    /off-syllabus/,
  )
})

test('off-syllabus in options is an error too', () => {
  assert.match(
    validate([item({ options: { A: 'new HashMap<>()', B: 'b', C: 'c', D: 'd' } })], TOPICS, NO_BANK).errors.join('|'),
    /off-syllabus/,
  )
})

test('explanations may discuss banned constructs', () => {
  assert.deepEqual(
    validate([item({ explanation: 'charAt is not on the Quick Reference' })], TOPICS, NO_BANK).errors,
    [],
  )
})

test('allow-offsyllabus suppresses the check for that item', () => {
  assert.deepEqual(
    validate([item({ stem: 'Which returns one character? s.charAt(0)', allowOffSyllabus: true })], TOPICS, NO_BANK)
      .errors,
    [],
  )
})

test('skewed answer distribution is a warning, not an error', () => {
  const items = Array.from({ length: 25 }, (_, n) => item({ id: `q${n}`, answer: 'A' }))
  const { errors, warnings } = validate(items, TOPICS, NO_BANK)
  assert.deepEqual(errors, [])
  assert.match(warnings.join('|'), /answer A/)
})

test('a topic with no items is a warning', () => {
  assert.match(validate([item()], TOPICS, NO_BANK).warnings.join('|'), /topic 1\.5 has no items/)
})

test('duplicate item ids are an error', () => {
  assert.match(validate([item(), item()], TOPICS, NO_BANK).errors.join('|'), /duplicate item id/)
})

test('duplicate topic ids (same subject) are an error', () => {
  // topics has PRIMARY KEY (subject, id) and to-sql.js emits INSERT OR REPLACE
  // for topics exactly as it does for items, so a copy-pasted row here means D1
  // receives one row fewer than the build reports writing — the same failure
  // mode the item-id duplicate gate above exists to catch, unguarded for topics.
  const dup = [
    { id: '1.3', subject: 'ap_csa', unit: '1', ek: 'Integer division truncates' },
    { id: '1.3', subject: 'ap_csa', unit: '1', ek: 'Integer division truncates, again' },
  ]
  assert.match(validate([item()], dup, NO_BANK).errors.join('|'), /duplicate topic id/)
})

test('the same topic id in two different subjects is not a duplicate', () => {
  // Topic ids are only unique WITHIN a subject (42 of 48 Precalc ids collide
  // with CSA ids), so this must not be flagged.
  const topics = [
    { id: '1.1', subject: 'ap_csa', ek: 'CSA idea' },
    { id: '1.1', subject: 'ap_precalc', ek: 'Precalc idea' },
  ]
  const errors = validate([], topics, NO_BANK).errors
  assert.deepEqual(errors.filter((e) => /duplicate topic id/.test(e)), [])
})

// --- letter-valued options that collide with an option label (N7) ---------

test('an option whose text is a bare letter matching a DIFFERENT option label is an error', () => {
  // Mirrors the shipped csa-ac-q14: option C's text is "B", which is also
  // label B's letter. The grader cannot tell whether a response of "B" means
  // "select B by letter" or "select C by its text" — so this must be flagged.
  const { errors } = validate(
    [item({ options: { A: 'A', B: 'An ArithmeticException is thrown.', C: 'B', D: 'Nothing.' }, answer: 'C' })],
    TOPICS,
    NO_BANK,
  )
  const hit = errors.filter((e) => e.includes('csa-ac-q1') && /disambiguat/.test(e))
  assert.equal(hit.length, 1, `expected exactly one disambiguation error, got ${JSON.stringify(errors)}`)
  assert.match(hit[0], /\bC\b/, 'must name the offending option letter')
  assert.match(hit[0], /"B"/, 'must quote the offending option text')
})

test('a lowercase letter option still collides (case-insensitive)', () => {
  // Mirrors the shipped csa-ac-q33: option A's text is "c", colliding with
  // label C even though the case differs.
  const { errors } = validate(
    [item({ options: { A: 'c', B: 'bc', C: 'An empty string.', D: 'Exception thrown.' }, answer: 'D' })],
    TOPICS,
    NO_BANK,
  )
  assert.ok(
    errors.some((e) => e.includes('csa-ac-q1') && /disambiguat/.test(e)),
    `expected a disambiguation error, got ${JSON.stringify(errors)}`,
  )
})

test('an option matching its OWN label is not ambiguous and is not an error', () => {
  // Reading "A" as a letter and matching "A" as text both land on option A —
  // there is nothing to disambiguate, so this must not be flagged.
  const { errors } = validate([item({ options: { A: 'A', B: 'b text', C: 'c text', D: 'd text' } })], TOPICS, NO_BANK)
  assert.deepEqual(errors.filter((e) => /disambiguat/.test(e)), [])
})

test('a bare letter option that names no label at all is not an error', () => {
  // Mirrors the shipped csa-ac-q30: option D's text is "e", but there is no
  // label E in a 4-option item, so a response of "e" is never ambiguous.
  const { errors } = validate(
    [item({ options: { A: 'def', B: 'ef', C: 'cdef', D: 'e' }, answer: 'B' })],
    TOPICS,
    NO_BANK,
  )
  assert.deepEqual(errors.filter((e) => /disambiguat/.test(e)), [])
})

test('a model-graded item is never flagged, even carrying a colliding options field', () => {
  const modelGraded = item({
    kind: 'constructed_model_graded',
    answer: null,
    practice: null,
    options: { A: 'A', B: 'B', C: 'A' },
    solution: 'the worked solution',
  })
  const { errors } = validate([modelGraded], TOPICS, NO_BANK)
  assert.deepEqual(errors.filter((e) => /disambiguat/.test(e)), [])
})

// --- teaching ---

const T_ITEMS = [
  { id: 'a', topic: '1.3', explanation: '17/5 is 3 because integer division drops the remainder.' },
  { id: 'b', topic: '1.3', explanation: 'Multiplication binds before addition.' },
  { id: 'c', topic: '1.5', explanation: null },
]

test('buildTeaching uses the EK as plain_idea and the first explanation as the worked example', () => {
  const e = buildTeaching(TOPICS, T_ITEMS).entries.find((x) => x.topic === '1.3')
  assert.equal(e.plain_idea, 'Integer division truncates')
  assert.equal(e.worked_example, '17/5 is 3 because integer division drops the remainder.')
  // CSA's source (topic-coverage-matrix.md) has no genuine "common mistake" label,
  // so this must stay null rather than silently becoming item b's UNRELATED
  // explanation — see tools/build/tests/parse-teaching.test.js for the full
  // regression coverage of this guarantee.
  assert.equal(e.common_mistake, null)
  assert.equal(e.complete, true)
})

test('buildTeaching flags topics with no usable explanations as gaps', () => {
  const { entries, gaps } = buildTeaching(TOPICS, T_ITEMS)
  const e = entries.find((x) => x.topic === '1.5')
  assert.equal(e.worked_example, null)
  assert.equal(e.complete, false)
  assert.deepEqual(gaps, ['1.5'])
})

test('buildTeaching returns one entry per topic', () => {
  assert.equal(buildTeaching(TOPICS, T_ITEMS).entries.length, 2)
})

// --- feasibility: can the bank supply what the readiness config demands? ----
//
// The campaign already gates "an exam-tested topic with no items". This is the
// same question one level up, and nothing asked it: CSA demands 6 scored mocks of
// 38 answered questions each, which is 228 servings from a 218-item bank, and the
// no-repeat window used to be longer than the whole mock schedule. The standard
// was therefore arithmetically unsatisfiable, and the only symptom was a 409.

/** A subject config shaped like worker/config/<subject>.json. P = 36 here. */
function standards({ exam = {}, readiness = {} } = {}) {
  return {
    subject: 'ap_test',
    exam: { mcq_count: 40, frq_count: 0, ...exam },
    readiness: {
      total_logged_mocks_min: 3,
      consecutive_qualifying_mocks: 3,
      window_span_days_max: 42,
      reuse_days: 14,
      composite_mean_min: 80,
      ...readiness,
    },
  }
}

const bank = (n, over = {}) => Array.from({ length: n }, (_, i) => (
  { id: `t${i}`, subject: 'ap_test', kind: 'mcq', answer: 'A', topic: '1.1', ...over }
))

test('feasibility: a bank that can supply the standard is judged silently', () => {
  const f = feasibility(bank(108), standards())
  assert.deepEqual(f.errors, [])
  assert.deepEqual(f.warnings, [])
})

test('feasibility: a bank too small for ONE sitting is an error with the arithmetic in it', () => {
  const { errors } = feasibility(bank(35), standards())
  assert.equal(errors.length, 1, JSON.stringify(errors))
  assert.match(errors[0], /\b35\b/, 'must name the bank size')
  assert.match(errors[0], /\b36\b/, 'must name how many distinct questions a sitting needs')
  assert.match(errors[0], /exam\.mcq_count/, 'must name the config key that sets the demand')
  assert.match(errors[0], /total_logged_mocks_min/, 'must name the criterion that becomes unreachable')
})

test('feasibility: a bank with nothing mechanically gradable can never produce a composite', () => {
  const { errors } = feasibility(
    bank(108, { kind: 'constructed_model_graded', answer: null }),
    standards(),
  )
  assert.equal(errors.length, 1, JSON.stringify(errors))
  assert.match(errors[0], /mechanic/i)
  assert.match(errors[0], /composite/)
  assert.match(errors[0], /constructed_model_graded/, 'must name the kinds that are actually in the bank')
})

test('feasibility: an unkeyed MCQ does not count as mechanically gradable', () => {
  const { errors } = feasibility(bank(108, { answer: '  ' }), standards())
  assert.equal(errors.length, 1, JSON.stringify(errors))
  assert.match(errors[0], /composite/)
})

test('feasibility: a reuse window covering the whole qualifying span forces disjoint sittings', () => {
  // 3 qualifying sittings inside 42 days is one every 21 days; a 56-day window
  // means none of them may re-ask an earlier one's question, so they need
  // 3 x 36 = 108 distinct items and 80 will not do.
  const { errors } = feasibility(bank(80), standards({ readiness: { reuse_days: 56 } }))
  const hit = errors.filter((e) => /reuse_days/.test(e))
  assert.equal(hit.length, 1, JSON.stringify(errors))
  assert.match(hit[0], /consecutive_qualifying_mocks/)
  assert.match(hit[0], /window_span_days_max/)
  assert.match(hit[0], /\b108\b/, 'must name the requirement')
  assert.match(hit[0], /\b80\b/, 'must name the supply')
  assert.match(hit[0], /\b21\b/, 'must name the window that would fix it')
})

test('feasibility: the same bank is fine once the window is sized below that span', () => {
  const { errors } = feasibility(bank(80), standards({ readiness: { reuse_days: 21 } }))
  assert.deepEqual(errors, [], 'a sitting three weeks after another may re-ask its questions')
})

test('feasibility: a config that states no window is judged on the selector\'s fallback', () => {
  const { errors } = feasibility(bank(80), standards({ readiness: { reuse_days: undefined } }))
  assert.match(errors.join('|'), /reuse_days/, `${ASSUMED_REUSE_DAYS}-day fallback covers the whole span`)
})

test('feasibility: needing more servings than the bank holds is a WARNING, not an error', () => {
  // Reuse ACROSS sittings weeks apart is ordinary test practice, and the selector
  // labels a repeat that is still inside the window. So this is worth saying and
  // is not a failure — and it must never be "fixed" by lowering the mock count.
  const { errors, warnings } = feasibility(bank(40), standards())
  assert.deepEqual(errors, [])
  assert.equal(warnings.length, 1, JSON.stringify(warnings))
  assert.match(warnings[0], /total_logged_mocks_min/)
  assert.match(warnings[0], /\b108\b/)
  assert.match(warnings[0], /\b40\b/)
})

test('feasibility: a subject with no items in this build is not judged', () => {
  // build.js has its own gate for a configured subject that parsed to nothing;
  // this one must not double-report it as an impossible bank.
  const f = feasibility([], standards())
  assert.deepEqual([...f.errors, ...f.warnings], [])
})

// --- feasibility: a config with a missing or misshapen "exam" block must not
// gate silently. mcq/frq both resolve to null when the block is absent or its
// keys are misnamed, `questions` is then 0, and an early return used to skip
// every check with no error and no warning — a gate that quietly stops gating.

test('feasibility: a config with a typo\'d exam block ("exams" not "exam") is an explicit ERROR, not silence', () => {
  // Exactly the shipped-config risk: CSA uses exam.mcq_count, Precalc uses
  // exam.mcq_no_calc_count + exam.mcq_calc_count — a third subject getting the
  // key wrong is plausible, and nothing else validates a config's shape.
  const { errors, warnings } = feasibility(bank(10), { subject: 'x', exams: { mcq_count: 40 } })
  assert.equal(warnings.length, 0, JSON.stringify(warnings))
  assert.equal(errors.length, 1, JSON.stringify(errors))
  assert.match(errors[0], /\bx\b/, 'must name the config')
  assert.match(errors[0], /exam/i, 'must name the field it expected')
})

test('feasibility: a config with no exam block at all is an explicit ERROR, not silence', () => {
  const { errors, warnings } = feasibility(bank(10), { subject: 'y', readiness: { total_logged_mocks_min: 3 } })
  assert.equal(warnings.length, 0, JSON.stringify(warnings))
  assert.equal(errors.length, 1, JSON.stringify(errors))
  assert.match(errors[0], /\by\b/)
})

test('feasibility: an exam block present but not resolving to any questions is an ERROR when readiness is present', () => {
  // The block exists (so it is not "missing entirely") but its keys inside
  // are wrong, so mcq/frq both resolve to null/0 just the same.
  const { errors } = feasibility(
    bank(10),
    { subject: 'z', exam: { count: 40 }, readiness: { total_logged_mocks_min: 3 } },
  )
  assert.equal(errors.length, 1, JSON.stringify(errors))
  assert.match(errors[0], /\bz\b/)
})

test('feasibility: a null config is an explicit ERROR, not silence', () => {
  const { errors, warnings } = feasibility(bank(10), null)
  assert.equal(warnings.length, 0, JSON.stringify(warnings))
  assert.equal(errors.length, 1, JSON.stringify(errors))
})

test('feasibility runs from validate() over every configured subject', () => {
  const items = [{ id: 'x1', subject: 'ap_test', kind: 'mcq', answer: 'A', topic: '1.3', stem: 's', practice: 'P1', options: { A: 'a', B: 'b', C: 'c', D: 'd' } }]
  const topics = [{ id: '1.3', subject: 'ap_test', ek: 'idea' }]
  const { errors } = validate(items, topics, [standards()])
  assert.match(errors.join('|'), /a scored sitting needs/, 'the gate must be wired into validate(), not just exported')
})

test('the shipped configs and the shipped bank are judged against each other', () => {
  // Pins what the gate actually says about real content. If a bank grows or a
  // threshold moves, this test is where the new arithmetic gets read out.
  const root = new URL('../../../', import.meta.url)
  const items = JSON.parse(readFileSync(new URL('content/items.json', root), 'utf8'))
  const configs = readinessConfigs()
  assert.deepEqual(configs.map((c) => c.subject).sort(), ['ap_csa', 'ap_precalc'])

  const csa = feasibility(items.filter((i) => i.subject === 'ap_csa'), configs.find((c) => c.subject === 'ap_csa'))
  assert.deepEqual(csa.errors, [], 'CSA can assemble and score every sitting its config asks for')
  assert.equal(csa.warnings.length, 1, JSON.stringify(csa.warnings))
  assert.match(csa.warnings[0], /ap_csa/)
  assert.match(csa.warnings[0], /total_logged_mocks_min/, '6 sittings x 42 questions is 252 servings from 218 items')

  const pc = feasibility(items.filter((i) => i.subject === 'ap_precalc'), configs.find((c) => c.subject === 'ap_precalc'))
  assert.equal(pc.errors.length, 1, JSON.stringify(pc.errors))
  assert.match(pc.errors[0], /ap_precalc/)
  assert.match(pc.errors[0], /composite/, 'all 48 Precalc items are model-graded, so no sitting can be scored')
})

test('the gate cannot drift from the thresholds it is judging against', () => {
  // Both numbers live in worker/src and are re-stated here so the content build
  // does not have to import the Worker. Re-stated, not guessed: if either moves,
  // this fails rather than the gate quietly judging against a stale figure.
  assert.equal(MIN_MOCK_COVERAGE, API_MIN_MOCK_COVERAGE, 'api.js decides when a sitting is scored')
  assert.equal(ASSUMED_REUSE_DAYS, DEFAULT_REUSE_DAYS, 'select.js decides the window when a config states none')
})
