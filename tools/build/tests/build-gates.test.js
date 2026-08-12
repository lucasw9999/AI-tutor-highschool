// The gates that stop a broken question bank from being reported as "Build OK".
//
// Every check here exists because the build once printed success over content a
// student could not actually study from: 48 Precalc items and 48 Precalc topics
// never went through validate() at all, so an empty stem, a duplicated id, or a
// topic no item can reach were all invisible.
//
// Content is never mutated: the real repo files are read, and the one file under
// test is text-patched in memory before compile() sees it.
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { spawnSync } from 'node:child_process'
import { existsSync, mkdtempSync, readFileSync, rmSync, symlinkSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { compile, summary, incompleteReport } from '../build.js'
import { validate } from '../validate.js'

const read = (f) => readFileSync(f, 'utf8')
const U1 = 'ap_precalc/study-packs/unit-1-polynomial-rational.md'
/** Unit 4 is class-only, so its bucket is the one that must NOT be exam-tested. */
const U4 = 'ap_precalc/study-packs/unit-4-parametric-vectors-matrices.md'

/** A readFile that serves the real repo, with `file`'s text rewritten in memory. */
function patched(file, patch) {
  return (f) => (f.endsWith(file) ? patch(read(file)) : read(f))
}

/** Errors are long once the coverage gate speaks; keep failure messages readable. */
const brief = (errors) => errors.slice(0, 6).join('\n  ')

// --- B1: validation must cover every subject, not just CSA -----------------

test('B1: a Precalc item with an empty stem is a build ERROR', () => {
  // Blank the P1 prompt but keep its header, exactly the shape a hand edit produces.
  const r = compile(patched(U1, (t) => t.replace(/^(\*\*P1\b[^*]*\*\*).*$/m, '$1')))
  const blank = r.items.find((i) => i.id === 'pc-u1-p1')
  assert.equal(blank.stem, '', 'precondition: the patch must produce a genuinely empty stem')
  assert.ok(
    r.errors.some((e) => e.includes('pc-u1-p1') && /empty stem/.test(e)),
    `expected an empty-stem error for pc-u1-p1, got:\n  ${brief(r.errors)}`,
  )
})

test('B1: two Precalc items sharing an id is a build ERROR, not a silent lost item', () => {
  // to-sql.js emits INSERT OR REPLACE, so a duplicate id means D1 receives one
  // row fewer than the summary claims to have written.
  const r = compile(patched(U1, (t) => t.replace(/^\*\*P12\b/m, '**P3')))
  assert.equal(r.items.filter((i) => i.id === 'pc-u1-p3').length, 2, 'precondition: the id must collide')
  assert.ok(
    r.errors.some((e) => e.includes('pc-u1-p3') && /duplicate item id/.test(e)),
    `expected a duplicate-id error, got:\n  ${brief(r.errors)}`,
  )
})

test('B1: MCQ-shaped checks do not falsely flag model-graded Precalc items', () => {
  const r = compile()
  const falsePositive = /missing practice tag|could not parse options|no answer key|not one of the options/
  const wrong = r.errors.filter((e) => /^pc-u\d-p\d+/.test(e) && falsePositive.test(e))
  assert.deepEqual(wrong, [], 'model-graded items are not MCQs and must not be judged as if they were')
})

// --- B2: topic bookkeeping must be keyed by subject ------------------------

test('B2: a Precalc topic with no items still warns when CSA has an item at the same id', () => {
  // 42 of 48 Precalc topic ids collide with CSA ids, so a global key masked them.
  const topics = [
    { id: '1.1', subject: 'ap_csa', ek: 'CSA idea' },
    { id: '1.1', subject: 'ap_precalc', ek: 'Precalc idea' },
  ]
  const items = [
    {
      id: 'csa-q1', subject: 'ap_csa', kind: 'mcq', topic: '1.1', practice: 'P3',
      stem: 'What is printed?', options: { A: 'a', B: 'b', C: 'c', D: 'd' }, answer: 'A',
    },
  ]
  // A 1-item fixture is not a claim about either subject's whole bank, so pass
  // NO_BANK explicitly rather than fall through validate()'s default of reading
  // the real worker/config/*.json off disk — see the next test for what that
  // default mixes into a result nobody asked it for.
  const { errors, warnings } = validate(items, topics, [])
  assert.deepEqual(errors, [])
  const noItems = warnings.filter((w) => /has no items/.test(w))
  assert.equal(noItems.length, 1, `expected exactly one has-no-items warning, got ${JSON.stringify(noItems)}`)
  assert.match(noItems[0], /ap_precalc/)
})

test('B2: an item may not borrow a topic id that exists only in another subject', () => {
  const topics = [
    { id: '1.5', subject: 'ap_csa', ek: 'CSA only' },
    { id: '2.1', subject: 'ap_precalc', ek: 'Precalc only' },
  ]
  const items = [
    { id: 'pc-x', subject: 'ap_precalc', kind: 'constructed_model_graded', topic: '1.5', stem: 's', solution: 'sol' },
  ]
  // A 1-item fixture tagged ap_precalc is not a claim about ap_precalc's whole
  // bank, so feasibility must not run over it — pass NO_BANK explicitly rather
  // than fall through validate()'s default of reading the real worker/config/*.json
  // off disk, which would mix that subject's real feasibility findings into a
  // result this test never asked about.
  const { errors } = validate(items, topics, [])
  assert.deepEqual(
    errors,
    ['pc-x: topic 1.5 is not in the coverage matrix for ap_precalc'],
    `expected exactly the cross-subject topic error, got ${JSON.stringify(errors)}`,
  )
})

// --- B3: an exam-tested topic with no items is unreachable readiness -------

test('B3: an exam-tested topic with no items of its own is a build ERROR', () => {
  const r = compile()
  const expected = r.topics
    .filter((t) => t.tested_on_exam)
    .filter((t) => r.items.some((i) => i.subject === t.subject))
    .filter((t) => !r.items.some((i) => i.subject === t.subject && i.topic === t.id))
    .map((t) => `${t.subject}:${t.id}`)
    .sort()
  assert.deepEqual(
    r.unreachable.map((u) => `${u.subject}:${u.id}`).sort(),
    expected,
    'compile() must report exactly the exam-tested topics no item can reach',
  )
  assert.ok(expected.length > 0, 'precondition: current content has unreachable topics')
  const text = r.errors.join('\n')
  for (const u of r.unreachable) {
    assert.ok(text.includes(u.id), `unreachable topic ${u.id} must be named in the error output`)
  }
})

test('B3: the exam-tested Precalc topics with no items are exactly the ones the gate reports', () => {
  // This test used to assert that EVERY exam-tested Precalc concept topic is
  // unreachable, because all 48 items sat in the <unit>.0 untagged buckets. Its own
  // comment said the gap "shrinks only when Precalc items get real topic tags" —
  // the packs now carry those tags, so the snapshot has been replaced by the
  // invariant it was standing in for: the gate names exactly the exam-tested topics
  // no item of the subject can reach, the tagged ones are off that list, and no CSA
  // topic is on it.
  //
  // The `<unit>.0` placeholder buckets are no longer on this list either, and the
  // test below is the one that holds them off it: a bucket is declared only where an
  // item actually lands, so an empty one cannot be counted as an unreachable topic.
  const r = compile()
  const noItems = (t) => !r.items.some((i) => i.subject === t.subject && i.topic === t.id)
  const expected = r.topics
    .filter((t) => t.subject === 'ap_precalc' && t.tested_on_exam)
    .filter(noItems)
    .map((t) => t.id)
    .sort()
  assert.deepEqual(r.unreachable.filter((u) => u.subject === 'ap_precalc').map((u) => u.id).sort(), expected)

  const tagged = [...new Set(r.items.filter((i) => i.subject === 'ap_precalc').map((i) => i.topic))]
  assert.ok(tagged.some((id) => !id.endsWith('.0')), 'precondition: the packs tag items at real topic ids')
  for (const id of tagged) {
    assert.ok(!expected.includes(id), `topic ${id} has items, so the gate must not call it unreachable`)
  }
  assert.deepEqual(
    r.unreachable.filter((u) => u.subject === 'ap_csa'),
    [],
    'CSA has an item on every one of its exam-tested topics; the gate must stay silent for it',
  )
})

test('B3: a <unit>.0 bucket is declared only where an item actually lands in it', () => {
  // A PHANTOM TOPIC IS A PERMANENT CAP ON COVERAGE. precalcUnitBuckets() used to
  // mint a `<unit>.0` topic for every unit that had any item at all, whether or not
  // an item still LANDED in that bucket, and marked the units 1-3 buckets
  // tested_on_exam. That was harmless only while every Precalc item was untagged.
  // Once the packs carried real topic tags the buckets emptied out, and 1.0, 2.0 and
  // 3.0 became three exam-tested topics that no item can ever reach — while the
  // coverage criterion needs every exam-tested topic attempted before it will pass.
  // Precalc coverage was therefore capped below 100% by construction, forever, and
  // the build reported the cap as a content gap ("8 exam-tested topic(s) have NO
  // items") when three of the eight were the build's own invention.
  const r = compile()
  const phantom = r.topics
    .filter((t) => t.untagged_bucket)
    .filter((b) => !r.items.some((i) => i.subject === b.subject && i.topic === b.id))
    .map((b) => `${b.id} (tested_on_exam=${b.tested_on_exam})`)
  assert.deepEqual(
    phantom, [],
    'a placeholder bucket no item lands in is a topic no student can ever attempt; it must not be declared at all',
  )
  // Said as a fact about today's content too, so this cannot pass by the buckets
  // merely being renamed: every Precalc item carries a real CED topic id.
  assert.deepEqual(
    r.items.filter((i) => i.subject === 'ap_precalc' && i.topic.endsWith('.0')).map((i) => i.id), [],
    'precondition: the packs tag every item, so no bucket should have anything in it',
  )

  // THE BUCKET'S LEGITIMATE PURPOSE IS UNCHANGED. It exists so per-unit readiness
  // works immediately for an item that is not topic-tagged yet, so drop one tag and
  // the bucket must come back exactly as before: declared, marked as a bucket, and
  // exam-tested for a unit that is on the exam.
  const u1 = compile(patched(U1, (t) => t.replace('<!-- topic: 1.1 -->', '')))
  assert.equal(
    u1.items.filter((i) => i.subject === 'ap_precalc' && i.topic === '1.0').length, 1,
    'precondition: the untagged item must fall into the 1.0 bucket',
  )
  const b1 = u1.topics.find((t) => t.subject === 'ap_precalc' && t.id === '1.0')
  assert.ok(b1, 'a bucket that holds an item must still be declared, or that item has no topic row at all')
  assert.equal(b1.untagged_bucket, true)
  assert.equal(b1.unit, '1')
  assert.equal(b1.tested_on_exam, true, 'unit 1 is on the exam, so items parked in its bucket must count')
  assert.equal(u1.precalcUntagged, 1, 'and the build must still report exactly how many items are waiting')

  // Unit 4 is class-only: its bucket must exist when an item lands in it and must
  // still be excluded from the exam, or an untagged unit-4 item would invent an
  // exam-tested topic that readiness then demands coverage of.
  const u4 = compile(patched(U4, (t) => t.replace(/<!-- topic: 4\.\d+ -->/, '')))
  assert.equal(
    u4.items.filter((i) => i.subject === 'ap_precalc' && i.topic === '4.0').length, 1,
    'precondition: the untagged unit-4 item must fall into the 4.0 bucket',
  )
  const b4 = u4.topics.find((t) => t.subject === 'ap_precalc' && t.id === '4.0')
  assert.ok(b4, 'the unit-4 bucket must be declared when an item lands in it')
  assert.equal(b4.tested_on_exam, false, 'unit 4 is class-only; its bucket may never be exam-tested')
  assert.deepEqual(
    u4.unreachable.filter((u) => u.id === '4.0'), [],
    'a class-only bucket must never be reported as an unreachable exam-tested topic',
  )
})


test('B4: a teaching row with every content field null is a build ERROR', () => {
  // Injected: a concept section carrying none of the three labels. teaching.js only
  // guards against a MISSING row, so an all-null row returns a truthy lesson with
  // three empty fields and the "no teaching material yet" safeguard never fires.
  const r = compile(
    patched(U1, (t) =>
      t.replace('## 3. Graduated practice set', '### 2.99 A section with no labelled fields\n\nprose only\n\n## 3. Graduated practice set')),
  )
  const blank = r.blankTeaching.filter((t) => t.subject === 'ap_precalc')
  assert.ok(blank.length > 0, 'precondition: the injected section must yield an all-null teaching row')
  for (const t of blank) {
    assert.ok(
      r.errors.some((e) => e.includes(`${t.subject}:${t.topic}`) && /no teaching content/.test(e)),
      `blank teaching row ${t.subject}:${t.topic} must be an error, got:\n  ${brief(r.errors)}`,
    )
  }
})

test('B4: the real content ships exactly one all-blank teaching row, and it errors', () => {
  // ap_precalc 1.11 ("Model domain & range restrictions") has plain_idea,
  // worked_example and common_mistake all null in the pack.
  const r = compile()
  assert.deepEqual(r.blankTeaching.map((t) => `${t.subject}:${t.topic}`), ['ap_precalc:1.11'])
  assert.ok(r.errors.some((e) => e.includes('1.11') && /no teaching content/.test(e)))
})

test('B4: a topic that has items must have a teaching row of its own', () => {
  // The <unit>.0 buckets used to hold all 48 Precalc items and so proved this gate
  // on real content. The packs now tag their items, so a bucket holds items only
  // when a tag is missing — which is exactly when the gate should speak. Both
  // halves are pinned: remove one tag in memory and the gate must name the bucket,
  // and on the real content a bucket is reported if and only if it has items.
  const r = compile(patched(U1, (t) => t.replace('<!-- topic: 1.1 -->', '')))
  const bucketed = r.items.filter((i) => i.subject === 'ap_precalc' && i.topic === '1.0')
  assert.equal(bucketed.length, 1, 'precondition: the untagged item must fall into the 1.0 bucket')
  assert.ok(
    r.topicsMissingTeaching.some((t) => t.id === '1.0' && t.subject === 'ap_precalc'),
    'bucket 1.0 carries an item but has no teaching row, and must be reported',
  )
  assert.ok(
    r.errors.some((e) => e.includes('1.0') && /no teaching row/.test(e)),
    `expected a missing-teaching-row error for 1.0, got:\n  ${brief(r.errors)}`,
  )

  const real = compile()
  for (const b of real.topics.filter((t) => t.untagged_bucket)) {
    const hasItems = real.items.some((i) => i.subject === b.subject && i.topic === b.id)
    assert.equal(
      real.topicsMissingTeaching.some((t) => t.subject === b.subject && t.id === b.id),
      hasItems,
      `bucket ${b.id} is reported when it has items and only then (has items: ${hasItems})`,
    )
  }
})

// --- B5: the output must not understate what was written -------------------

test('B5: the per-subject table reports rows written and rows complete separately', () => {
  const r = compile()
  const rows = summary(r)
  const pc = r.teaching.filter((t) => t.subject === 'ap_precalc')
  // Every row written reaches teaching.json and D1, complete or not, so the output
  // must not report only the complete count as it once did ("teaching= 36" while 44
  // rows shipped).
  assert.equal(rows.ap_precalc.teachingWritten, pc.length)
  assert.equal(rows.ap_precalc.teachingComplete, pc.filter((t) => t.complete !== false).length)
  assert.ok(
    rows.ap_precalc.teachingWritten > rows.ap_precalc.teachingComplete,
    `precondition: some Precalc teaching rows are still incomplete (written ${rows.ap_precalc.teachingWritten}, complete ${rows.ap_precalc.teachingComplete})`,
  )
})

test('B5: the INCOMPLETE list names every class of gap, not just untagged items', () => {
  const r = compile()
  const lines = incompleteReport(r).join('\n')
  // The untagged-items line was unconditional when all 48 Precalc items were
  // bucketed at <unit>.0. They now carry real topic tags, and a disclosure that
  // went on claiming untagged items would be false — so it is asserted to be
  // present exactly when there are untagged items, and its absence is proved to be
  // a fact about the content rather than a line that stopped being printed.
  if (r.precalcUntagged) assert.match(lines, /bucketed at <unit>\.0/, 'untagged items')
  else assert.doesNotMatch(lines, /bucketed at <unit>\.0/, 'no item is untagged, so nothing may claim otherwise')
  const withUntagged = incompleteReport(compile(patched(U1, (t) => t.replace('<!-- topic: 1.1 -->', '')))).join('\n')
  assert.match(withUntagged, /bucketed at <unit>\.0/, 'an untagged item must still be disclosed')
  assert.match(withUntagged, /no teaching row/, 'and so must the bucket it lands in, which has no teaching row')
  assert.match(lines, /1\.11/, 'the blank teaching row')
  assert.match(lines, /cannot reach readiness|unreachable/, 'unreachable exam-tested topics')
  for (const u of r.unreachable) {
    assert.ok(lines.includes(u.id), `unreachable topic ${u.id} must appear in the INCOMPLETE list`)
  }
})

// --- B6: "faithful compile" and "complete content" are separate questions ---
//
// The completeness gates above are correct and stay hard errors: ap_precalc has 33
// exam-tested topics with no items, so its readiness can never exceed 8.3%. But the
// failing build also refused to write anything, which stranded content fixes that
// were already correct in the markdown (a wrong answer key, a false arithmetic
// check, 92 backtick-corrupted MCQ options) in the compiler and out of the DB.
//
// So the CLI grows ONE explicit opt-in flag: write the artifacts anyway, still fail,
// still print every ERROR. These tests pin both halves — the default must stay
// byte-for-byte "nothing written", and the flag must never be reachable by accident.
const ROOT = fileURLToPath(new URL('../../..', import.meta.url))
const BUILD = fileURLToPath(new URL('../build.js', import.meta.url))
const FLAG = '--write-despite-incomplete'
const ARTIFACTS = ['items.json', 'topics.json', 'teaching.json']

/**
 * A throwaway cwd that reads the REAL content (the parsers resolve every path
 * relative to cwd) but whose `content/` output directory is not the repo's, so a
 * test can watch what the CLI writes without touching the checked-in artifacts.
 */
function sandbox(t) {
  const dir = mkdtempSync(join(tmpdir(), 'ap-build-gate-'))
  for (const d of ['ap_csa', 'ap_precalc']) symlinkSync(join(ROOT, d), join(dir, d))
  t.after(() => rmSync(dir, { recursive: true, force: true }))
  return dir
}

function runBuild(dir, { args = [], env = {} } = {}) {
  const p = spawnSync(process.execPath, [BUILD, ...args], {
    cwd: dir, encoding: 'utf8', env: { ...process.env, ...env },
  })
  return { ...p, output: `${p.stdout}${p.stderr}` }
}

/** Just the ERROR lines, so "did any gate go quiet?" is directly comparable. */
const errorLines = (out) => out.split('\n').filter((l) => l.startsWith('ERROR ')).sort()

const wroteFiles = (dir) => ARTIFACTS.filter((f) => existsSync(join(dir, 'content', f)))

test('B6: by default a failing build still writes absolutely nothing', (t) => {
  const dir = sandbox(t)
  const r = runBuild(dir)

  assert.equal(r.status, 1, `expected exit 1, got ${r.status}\n${r.output}`)
  assert.match(r.stderr, /Nothing written\./)
  assert.deepEqual(wroteFiles(dir), [], 'the default invocation must not write an artifact')
  assert.equal(existsSync(join(dir, 'content')), false, 'not even the output directory')
  assert.ok(errorLines(r.output).length > 0, 'the gates must still speak')
  assert.match(r.output, /exam-tested topic\(s\) have NO items/, 'the coverage gate')
  assert.doesNotMatch(r.output, /Build OK/)
})

test(`B6: ${FLAG} writes the artifacts and STILL fails`, (t) => {
  const dir = sandbox(t)
  const r = runBuild(dir, { args: [FLAG] })

  assert.notEqual(r.status, 0, `incomplete content must never exit 0\n${r.output}`)
  assert.deepEqual(wroteFiles(dir), ARTIFACTS, 'all three artifacts must be written')

  const expected = compile()
  for (const [file, key] of [['items.json', 'items'], ['topics.json', 'topics'], ['teaching.json', 'teaching']]) {
    const written = JSON.parse(readFileSync(join(dir, 'content', file), 'utf8'))
    assert.ok(Array.isArray(written), `${file} must be a JSON array`)
    assert.equal(written.length, expected[key].length, `${file} must hold every compiled row`)
  }

  // The write is not permission to ship: the output has to say so, loudly.
  assert.match(r.output, /INCOMPLETE/)
  assert.match(r.output, /must not be deployed/i)
  assert.doesNotMatch(r.output, /Build OK/, 'an incomplete build is never OK')
})

test(`B6: ${FLAG} downgrades no gate — the ERROR lines are identical either way`, (t) => {
  const strict = runBuild(sandbox(t))
  const forced = runBuild(sandbox(t), { args: [FLAG] })

  assert.deepEqual(
    errorLines(forced.output),
    errorLines(strict.output),
    'writing anyway must not silence, soften or reword a single gate',
  )
  assert.ok(errorLines(strict.output).length >= 6, 'precondition: the real content trips several gates')
})

test('B6: nothing but the explicit flag can force a write', (t) => {
  // No env backdoor, no near-miss spelling, no bare "--force". If a CI job or a
  // stray variable could trip this, artifacts would leak out silently.
  for (const attempt of [
    { env: { WRITE_DESPITE_INCOMPLETE: '1' } },
    { env: { BUILD_WRITE_DESPITE_INCOMPLETE: 'true' } },
    { env: { FORCE: '1', CI: 'true', BUILD_FORCE: '1' } },
    { args: ['--force'] },
    { args: ['--write'] },
    { args: ['-w'] },
  ]) {
    const dir = sandbox(t)
    const r = runBuild(dir, attempt)
    assert.equal(r.status, 1, `${JSON.stringify(attempt)} must still fail\n${r.output}`)
    assert.deepEqual(wroteFiles(dir), [], `${JSON.stringify(attempt)} must not write anything`)
  }
})

// --- B7: free response reaches the build at all ----------------------------
//
// 45% of the CSA exam score and all 25 of its free-response points used to stop
// at the markdown: parse-mcq.js names five mcq-*.md files, nothing named
// frq-q*.md, and the summary line reported a healthy "items= 218" with not one
// free-response question in it. These pin the wiring, and pin that it cannot
// half-land.

const Q1 = 'frq-q1-methods-control.md'

test('B7: the compiled CSA bank holds all 20 free-response items, five per question type', () => {
  const r = compile()
  const frq = r.items.filter((i) => i.subject === 'ap_csa' && i.kind === 'frq')
  assert.equal(frq.length, 20)
  assert.equal(r.frq.items, 20)
  assert.deepEqual(r.frq.byType, { Q1: 5, Q2: 5, Q3: 5, Q4: 5 })
  // 7 + 7 + 5 + 6 = the 25 free-response points of one real paper, five papers over.
  assert.equal(r.frq.points, 125)
  for (const it of frq) {
    assert.ok(it.rubric.criteria.length === it.points, `${it.id} rubric must itemize every point`)
    assert.equal(it.answer, null, `${it.id} is rubric-scored`)
    assert.ok(it.explanation, `${it.id} needs a worked solution — build.js requires one of every model-graded item`)
  }
})

test('B7: an FRQ item takes its unit from the topics table, as to-sql.js does', () => {
  const r = compile()
  const units = new Map(r.topics.filter((t) => t.subject === 'ap_csa').map((t) => [t.id, t.unit]))
  for (const it of r.items.filter((i) => i.kind === 'frq')) {
    assert.ok(it.unit, `${it.id} must land in a unit or it is invisible to every per-unit floor`)
    assert.equal(it.unit, units.get(it.topic), `${it.id}: unit must come from the topic row, not the id's prefix`)
  }
})

test('B7: the free-response items trip no gate — the build is no worse for having them', () => {
  const r = compile()
  const named = r.errors.filter((e) => /csa-frq-/.test(e))
  assert.deepEqual(named, [], 'every FRQ item must satisfy validate() and the model-graded contract')
})

test('B7: the per-subject summary breaks items down by kind', () => {
  // A single total is exactly what let "items= 218" look healthy while the
  // free-response half of the exam was missing entirely.
  const rows = summary(compile())
  assert.equal(rows.ap_csa.itemsByKind.frq, 20)
  assert.equal(rows.ap_csa.itemsByKind.mcq, 221)
  for (const [, c] of Object.entries(rows)) {
    assert.equal(
      Object.values(c.itemsByKind).reduce((n, x) => n + x, 0), c.items,
      'the per-kind counts must account for every item of the subject',
    )
  }
})

test('B7: the INCOMPLETE list discloses that FRQ topics are tagged per file, not per item', () => {
  const lines = incompleteReport(compile()).join('\n')
  assert.match(lines, /free-response item\(s\) carry the FIRST topic their file declares/)
  assert.match(lines, /1\.15, 1\.13, 4\.8, 4\.5/, 'and names the four topics that carries')
})

test('B7: teaching rows are untouched by FRQ ingestion', () => {
  // buildTeaching takes a topic's FIRST item explanation as its worked example. An
  // MCQ's answer-key rationale is a worked example of that one topic; an FRQ's
  // sample solution is a whole class spanning several. So the MCQ must stay first.
  const r = compile()
  for (const topic of ['1.15', '1.13', '4.8', '4.5']) {
    const row = r.teaching.find((t) => t.subject === 'ap_csa' && t.topic === topic)
    const firstMcq = r.items.find((i) => i.subject === 'ap_csa' && i.kind === 'mcq' && i.topic === topic && i.explanation)
    assert.equal(row.worked_example, firstMcq.explanation, `topic ${topic}'s worked example must stay its first MCQ`)
  }
})

test('B7: a refused FRQ parse is a build ERROR and yields NO free-response items', () => {
  // parse-frq.js does not return a partial bank, and build.js must not invent one:
  // a bank silently missing one of twenty FRQs is the failure mode that shipped 22
  // of 48 Precalc items under a "success" line.
  const r = compile(patched(Q1, (t) => t.replace(/### Practice FRQ 5 — [\s\S]*?(?=## \(c\))/, '')))
  assert.equal(r.items.filter((i) => i.kind === 'frq').length, 0, 'all or nothing')
  assert.equal(r.frq.items, 0)
  assert.ok(
    r.errors.some((e) => /FRQ ingestion refused/.test(e) && e.includes(Q1)),
    `expected the refusal to be a build error, got:\n  ${brief(r.errors)}`,
  )
})

test('B7: the MCQ bank is unchanged by the FRQ wiring', () => {
  // The two parsers read different files; if this number moves, one of them has
  // started reading the other's content.
  //
  // 218 -> 221: mcq-unit-1.md gained Q23-Q25 on the in-scope half of topic 1.12
  // (superclass/subclass/class-hierarchy vocabulary, and that every class is a
  // subclass of Object). The CED excludes DESIGNING and IMPLEMENTING inheritance
  // relationships; the vocabulary is required Unit 1 content, and the bank used to
  // carry one item on it. Moving this literal is bank growth, not a downgraded gate
  // — the FRQ total above and every content gate are untouched.
  const r = compile()
  assert.equal(r.items.filter((i) => i.subject === 'ap_csa' && i.kind === 'mcq').length, 221)
})
