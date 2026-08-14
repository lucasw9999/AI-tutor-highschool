/**
 * Parse ap_csa/ap_csa_exam/question-bank/frq-q*.md into items of kind 'frq'.
 *
 * WHY THIS EXISTS. Free response is 45% of the AP CSA exam score and all 25 of
 * its points, and the compiled bank held ZERO items of kind 'frq'. The content
 * was never missing: the four files below carry 20 finished original practice
 * FRQs — five per exam question type, each with a stem, the provided element or
 * class, a sample solution, an itemized rubric at the correct point value, a
 * trace check and the penalty-cap policy. parse-mcq.js hardcodes five mcq-*.md
 * files, so nothing in the build ever opened them. This is an INGESTION job.
 *
 * THE REAL FORMAT, as it is written rather than as one might assume:
 *
 *   # FRQ Bank — Q1: Methods & Control Structures (7 points)     <- em dash
 *   ...
 *   **Cross-links:** ... topic map → [...](...) (topics 1.15, 2.9, 2.10).
 *   ## (a) Official models to study        <- 2 College Board references, no items
 *   ## (b) Original practice FRQs
 *   > Grading note ... Penalty cap = 3 per question, earned-parts only, ...
 *   [optionally: one element class shared by named items — frq-q3's `Book`]
 *   ### Practice FRQ 1 — `TripLog` (7 points)  · *an optional note*
 *   <stem: prose, provided helpers, part markers, skeletons, examples>
 *   #### Sample solution
 *   ```java ... ```
 *   [optionally: > **Why backward?** ... a note about the solution]
 *   #### Rubric (7 points)
 *   **Part A — `countLongTrips` (4 points)**     <- Q1 ONLY; Q2-Q4 have one table
 *   | Pt | Criterion |
 *   | 1 | Declares and initializes a counter to 0 |
 *   **Trace check.** ...
 *   ---
 *   ## (c) Signature point-losers for Q1        <- reference table, no items
 *
 * THREE CONVENTIONS THAT BREAK A NAIVE PARSER:
 *
 *   1. A rubric criterion may contain UNESCAPED pipes inside an inline code span:
 *      frq-q4's borderSum point 4 is `r == 0 || r == grid.length - 1 || c == 0 ||
 *      c == grid[0].length - 1`. There is not one escaped pipe (\|) in any of the
 *      four files, so parse-topics.js's splitRow — written for the matrix, which
 *      escapes them — would shred that row into eight cells and truncate the
 *      criterion mid-code. splitCells() below tracks backtick spans instead.
 *   2. Q1's 7 points are TWO tables (4 + 3) numbered 1..7 across both; Q2, Q3 and
 *      Q4 have a single undivided table. A per-table 1..N assumption loses three
 *      points per Q1 item.
 *   3. frq-q3 defines its provided `Book` class ONCE in the section preamble,
 *      outside any item, and states in prose which items it belongs to ("provided
 *      for FRQs 1 and 3"). Dropping it would ship two stems that call getPages()
 *      with nothing defining it.
 *
 * AND THE DISCIPLINE: this parser REFUSES to report success on a partial parse.
 * Every count it expects is asserted — five practice FRQs per file, 20 in all,
 * rubric points equal to the question's value and numbered 1..N without gaps, the
 * number of rubric part tables the slot has and their points summing to the total,
 * one sample solution, exactly one trace check, a stem, a penalty policy, a
 * declared topic list, the shared element class reaching the items FRQ_FILES says
 * it reaches, and every fenced Java block classified as either provided or
 * to-be-implemented and not both. Any violation collects into one FrqParseError
 * listing all of them; nothing partial is ever returned.
 *
 * WHAT "SILENT" MEANT HERE, because three rounds of counts never caught it: every
 * check above used to be phrased as "if the thing is there, it must be right",
 * which cannot see the thing GOING AWAY. Deleting frq-q3's shared `Book` class —
 * or just its closing fence — parsed clean at 20 items and 125 points with two
 * stems calling an accessor nothing defined. Merging Q1's two rubric tables into
 * one parsed clean with parts=[]. Both are now counted against FRQ_FILES, which
 * states the structure each file is supposed to have, so absence is as loud as
 * malformation.
 */

/**
 * The four files, the exam question slot each one is, what that slot is worth,
 * how many rubric part tables each of its items must have, and which of its items
 * the section-(b) shared element class belongs to.
 *
 * THIS TABLE IS THE AUTHORITY, and naming the right authority is the point of
 * this comment. The FRQ point split is written in three places — here,
 * worker/config/ap_csa.json `exam.frq_points`, and tools/build/tests/
 * parse-frq.test.js — and only this one has any effect. Nothing at runtime reads
 * `exam.frq_points`: if the config drifts, the markdown is still validated
 * against this table, the build reports OK and writes artifacts, and only
 * `node --test tools/build/tests/parse-frq.test.js` objects. If THIS table drifts,
 * the build fails with sixteen structural violations and writes nothing. So the
 * test that asserts the two agree is not a redundant restatement of a stronger
 * check — it is the only check there is, and the config must be edited together
 * with this table, never instead of it.
 */
export const FRQ_FILES = [
  { file: 'frq-q1-methods-control.md', slot: 'Q1', points: 7, parts: 2, sharedFor: [] },
  { file: 'frq-q2-class-design.md', slot: 'Q2', points: 7, parts: 0, sharedFor: [] },
  { file: 'frq-q3-arraylist.md', slot: 'Q3', points: 5, parts: 0, sharedFor: [1, 3] },
  { file: 'frq-q4-2d-array.md', slot: 'Q4', points: 6, parts: 0, sharedFor: [] },
]

/** Five original practice FRQs per question type, twenty in all. */
export const FRQ_PER_FILE = 5
export const FRQ_TOTAL = FRQ_FILES.length * FRQ_PER_FILE

/** Raised instead of returning a partial parse. Carries every violation found. */
export class FrqParseError extends Error {
  constructor(violations) {
    const list = [].concat(violations)
    super(
      `FRQ ingestion refused: ${list.length} structural violation(s) — nothing partial is returned.\n  ` +
      list.join('\n  '),
    )
    this.name = 'FrqParseError'
    this.violations = list
  }
}

/**
 * Split a markdown table row into cells on pipes that are NOT inside an inline
 * code span, honouring an escaped pipe as literal text.
 *
 * This is the whole reason a rubric row can say `a || b` and survive. An odd
 * number of backticks leaves the span open and yields too few cells, which the
 * caller reports as a malformed row rather than silently accepting.
 */
export function splitCells(line) {
  const cells = []
  let cell = ''
  let inCode = false
  for (let i = 0; i < line.length; i++) {
    const ch = line[i]
    if (ch === '\\' && line[i + 1] === '|') {
      cell += '|'
      i++
    } else if (ch === '`') {
      inCode = !inCode
      cell += ch
    } else if (ch === '|' && !inCode) {
      cells.push(cell)
      cell = ''
    } else {
      cell += ch
    }
  }
  cells.push(cell)
  return cells
}

/** The content cells of a `| a | b |` row: the outer empties dropped, trimmed. */
function rowCells(line) {
  const cells = splitCells(line.trim())
  return cells.slice(1, -1).map((c) => c.trim())
}

const isTableRow = (l) => l.trim().startsWith('|')
const isTableRule = (l) => /^\|[\s:|-]+\|$/.test(l.trim())

/**
 * Every top-level fenced block in `lines`, in order, as {lang, code}.
 *
 * Only fences at the START of a line count, so a fence indented into a list item
 * or quoted inside a `>` blockquote never opens a block. Nothing in the four files
 * exercises that today, and the comment that used to live here claimed otherwise:
 * frq-q3's `> **Equivalent forward pattern**` blockquote is the only blockquoted
 * fence in all four files, and it sits AFTER the trace check, in the rubric region,
 * which is never passed to this function — its text reaches the student through
 * `notes`. The line-start rule is kept because the alternative is a fence matcher
 * that a quoted example can prise open, not because the content needs it yet.
 *
 * `unterminated` is REPORTED rather than thrown so each caller can say out loud
 * what a half-open fence means for its own region — and every caller must, because
 * an unterminated fence yields ZERO blocks. That is how a dropped closing fence in
 * the section-(b) preamble made a shared element class vanish out of two stems
 * without one count changing.
 */
function fencedBlocks(lines) {
  const out = []
  let open = null
  for (const line of lines) {
    if (open === null) {
      const m = line.match(/^```(\S*)\s*$/)
      if (m) open = { lang: m[1], body: [] }
      continue
    }
    if (/^```\s*$/.test(line)) {
      out.push({ lang: open.lang, code: open.body.join('\n'), fenced: ['```' + open.lang, ...open.body, '```'].join('\n') })
      open = null
      continue
    }
    open.body.push(line)
  }
  return { blocks: out, unterminated: open !== null }
}

/** Consecutive `>` lines, joined and unquoted, in order. */
function blockquotes(lines) {
  const out = []
  let cur = null
  for (const line of lines) {
    if (line.startsWith('>')) {
      const text = line.replace(/^>\s?/, '')
      cur = cur ?? []
      cur.push(text)
    } else if (line.trim() === '' && cur) {
      // A blank line inside a blockquote ends it; markdown needs the '>' to continue.
      out.push(cur.join('\n').trim())
      cur = null
    } else if (cur) {
      out.push(cur.join('\n').trim())
      cur = null
    }
  }
  if (cur) out.push(cur.join('\n').trim())
  return out.filter(Boolean)
}

const trimBlank = (lines) => {
  let a = 0
  let b = lines.length
  while (a < b && lines[a].trim() === '') a++
  while (b > a && lines[b - 1].trim() === '') b--
  return lines.slice(a, b)
}

/** Drop the `---` item separator and any blank lines around it. */
function dropSeparator(lines) {
  const out = [...lines]
  while (out.length && (out[out.length - 1].trim() === '' || /^-{3,}\s*$/.test(out[out.length - 1]))) out.pop()
  return out
}

/** The section between `## (x) ...` and the next `## `, as lines. */
function section(lines, marker) {
  const start = lines.findIndex((l) => l.startsWith(marker))
  if (start === -1) return null
  const rest = lines.slice(start + 1)
  const end = rest.findIndex((l) => /^## /.test(l))
  return end === -1 ? rest : rest.slice(0, end)
}

/** The two official College Board tasks section (a) points at. */
function officialModels(lines) {
  const models = []
  let cur = null
  for (const line of lines) {
    const h = line.match(/^###\s+Model\s+(\d+)\s+—\s+(.+?)\s*$/)
    if (h) {
      cur = { n: Number(h[1]), title: h[2], source: null, source_label: null }
      models.push(cur)
      continue
    }
    if (!cur) continue
    const src = line.match(/^-\s+\*\*Source:\*\*\s*(.+?)\s*<(https?:[^>]+)>/)
    if (src) {
      cur.source_label = src[1].replace(/\.\s*$/, '').trim()
      cur.source = src[2]
    }
  }
  return models
}

/**
 * Classify a fenced Java block by the convention the files actually use:
 * a provided element/helper says its body is "not shown"; a skeleton the student
 * must fill says "to be implemented".
 *
 * Both failure modes are returned as their own label rather than a bare null,
 * because the caller's message has to say WHICH convention broke.
 *
 *   'unmarked'  — says neither. The convention changed, and guessing would be the
 *                 silent partial parse this module exists to prevent.
 *   'ambiguous' — says BOTH. This one used to resolve to whichever regex was
 *                 tested first, which was /not shown/: a Part B skeleton carrying
 *                 the note "uses the provided helpers, whose bodies are not shown"
 *                 was filed as code the student had been HANDED, with no
 *                 violation, when it is the signature he must WRITE. A block that
 *                 answers "which is it?" both ways does not have an answer.
 */
function classifyJava(code) {
  const provided = /not shown/.test(code)
  const skeleton = /to be implemented/.test(code)
  if (provided && skeleton) return 'ambiguous'
  if (provided) return 'provided'
  if (skeleton) return 'skeleton'
  return 'unmarked'
}

/** Why a block could not be classified, in the words of the convention it broke. */
const UNCLASSIFIED_WHY = {
  unmarked:
    'says neither "not shown" (code provided to be called) nor "to be implemented" (the signature the student writes)',
  ambiguous:
    'says BOTH "not shown" and "to be implemented", so which one it is cannot be read — taking whichever phrase ' +
    'matches first would file the signature the student must WRITE among the code he was HANDED',
}

/** Parse one file. Violations are appended to `violations`; items are returned. */
function parseOne(text, filename, spec, violations) {
  const say = (msg) => violations.push(`${filename}: ${msg}`)
  const lines = text.split('\n')

  // --- the file's own header: which slot it is, and what it is worth ---------
  const h1 = text.match(/^#\s+FRQ Bank\s+[—–-]\s+(Q\d)\s*:\s*(.+?)\s*\((\d+)\s+points?\)\s*$/m)
  let title = null
  if (!h1) {
    say('no "# FRQ Bank — Q<n>: <title> (<n> points)" heading — cannot tell which exam question this file is')
  } else {
    title = h1[2].trim()
    if (h1[1] !== spec.slot) say(`heading says ${h1[1]}, expected ${spec.slot}`)
    if (Number(h1[3]) !== spec.points) {
      say(
        `heading says ${h1[3]} points, expected ${spec.points} — FRQ_FILES in tools/build/parse-frq.js is the ` +
        `authority on what ${spec.slot} is worth (worker/config/ap_csa.json exam.frq_points re-states it for the ` +
        'Worker, but nothing reads that at build time). Fix the heading, or change FRQ_FILES and the config together.',
      )
    }
  }

  // --- the topics the file declares it covers -------------------------------
  const topicLine = text.match(/topic map\s*→[^\n]*?\(topics\s+([0-9.,\s]+)\)/)
  const topics = topicLine ? topicLine[1].split(',').map((t) => t.trim()).filter(Boolean) : []
  if (!topics.length) {
    say(
      'the Cross-links line declares no topics — expected "topic map → [...](../topic-coverage-matrix.md) ' +
      '(topics 1.15, 2.9, 2.10)". Every item needs a topic that exists in the coverage matrix.',
    )
  }

  // --- (a) the official models, and (b) the practice FRQs -------------------
  const a = section(lines, '## (a)')
  const models = a ? officialModels(a) : []
  if (!a) say('no "## (a) Official models to study" section')
  else if (models.length !== 2) say(`section (a) cites ${models.length} official model(s), expected 2`)
  for (const m of models) {
    if (!m.source) say(`official model ${m.n} ("${m.title}") has no <https://...> source link`)
  }

  const b = section(lines, '## (b)')
  const meta = { slot: spec.slot, points: spec.points, title, topics, models, sharedProvidedFor: [] }
  if (!b) {
    say('no "## (b) Original practice FRQs" section — no practice FRQ can be read')
    return { items: [], meta }
  }

  // The grading note states the penalty policy once for every rubric in the file.
  const note = blockquotes(b).find((q) => /^Grading note/.test(q))
  const cap = note?.match(/Penalty cap\s*=\s*(\d+)\s+per question/)
  if (!note) say('section (b) has no "> Grading note ..." blockquote, so no rubric carries a penalty policy')
  else if (!cap) say(`the grading note states no penalty cap ("Penalty cap = N per question"): "${note.slice(0, 60)}..."`)

  // --- the item blocks, and the preamble that may hold a shared class -------
  const heads = []
  b.forEach((l, i) => {
    if (/^### Practice FRQ /.test(l)) heads.push(i)
  })
  if (heads.length !== FRQ_PER_FILE) {
    say(`found ${heads.length} practice FRQ(s), expected ${FRQ_PER_FILE}`)
  }

  // The shared element class, and the three ways it used to go missing in silence.
  //
  // THE SENTENCE IS THE GATE, not the block. Everything here used to hang off
  // `if (shared.blocks.length)` — the applicability check, the classification
  // check, all of it — so the gate opened only when a block was FOUND, and every
  // way of losing the block took the checks with it. Deleting the class, or just
  // its closing fence, or tagging the fence ```Java, each parsed clean at 20 items
  // and 125 points while csa-frq-q3-p1 and -p3 shipped stems with nothing defining
  // the `getPages()` their own rubric point 3 requires them to call. So: an
  // unterminated fence is reported, a preamble that PROMISES a class must carry a
  // ```java one, and what the prose says must match what FRQ_FILES declares — the
  // last of which is the only thing that can notice the sentence and the class
  // being deleted together, leaving nothing in the markdown to disagree with.
  const preamble = trimBlank(b.slice(0, heads.length ? heads[0] : b.length).filter((l) => !l.startsWith('>')))
  const shared = fencedBlocks(preamble)
  if (shared.unterminated) {
    say(
      'an unterminated code fence in the section (b) preamble — a half-open fence yields NO blocks, so the shared ' +
      'element class would silently reach none of the items whose stems call it',
    )
  }
  const applies = preamble.join(' ').match(/provided for FRQs?\s+([\d\s,and]+?)\s*\(/i)
  const sharedJava = shared.blocks.filter((blk) => blk.lang === 'java')
  let sharedFor = []
  let sharedText = null
  if (applies || shared.blocks.length) {
    sharedText = dropSeparator(trimBlank(preamble)).join('\n').trim()
    sharedFor = applies ? (applies[1].match(/\d+/g) ?? []).map(Number) : []
    if (!sharedFor.length) {
      say(
        'section (b) provides a shared element class but never says which practice FRQs it belongs to — expected ' +
        '"... is provided for FRQs 1 and 3 (...)". Guessing would either hide the class from an item that calls it ' +
        'or attach it to items that do not.',
      )
    }
    for (const n of sharedFor) {
      if (n < 1 || n > FRQ_PER_FILE) say(`the shared element class is declared for FRQ ${n}, which does not exist`)
    }
    if (!sharedJava.length && !shared.unterminated) {
      say(
        `section (b) says a shared element class is provided for FRQ(s) ${sharedFor.join(', ') || '(unstated)'}, but ` +
        'the preamble holds no fenced ```java block — those stems would name a class nothing defines. ' +
        (shared.blocks.length
          ? `The preamble's ${shared.blocks.length} fenced block(s) are tagged [${
            shared.blocks.map((blk) => blk.lang || '(none)').join(', ')}], not "java", so nothing inventoried them.`
          : 'The preamble holds no fenced block at all.'),
      )
    }
    for (const blk of sharedJava) {
      const kind = classifyJava(blk.code)
      if (kind !== 'provided' && kind !== 'skeleton') {
        say(`unclassified java block in the shared element class: it ${UNCLASSIFIED_WHY[kind]}`)
      }
    }
  }
  if (sharedFor.join(',') !== spec.sharedFor.join(',')) {
    say(
      `section (b)'s shared element class reaches FRQ(s) [${sharedFor.join(', ') || 'none'}], but FRQ_FILES declares ` +
      `[${spec.sharedFor.join(', ') || 'none'}] for ${spec.slot} — the prose and the parser's own table must agree, ` +
      'or a stem ships calling a class nothing defines (or is handed one it never mentions)',
    )
  }
  meta.sharedProvidedFor = sharedFor

  const items = []
  heads.forEach((start, k) => {
    const end = k + 1 < heads.length ? heads[k + 1] : b.length
    const item = parseItem({
      header: b[start],
      body: dropSeparator(b.slice(start + 1, end)),
      index: k + 1,
      spec,
      filename,
      title,
      topics,
      penalty: { cap: cap ? Number(cap[1]) : null, policy: note ?? null },
      shared: sharedFor.includes(k + 1) ? { text: sharedText, blocks: shared.blocks } : null,
      violations,
    })
    if (item) items.push(item)
  })

  return { items, meta }
}

/** Parse one `### Practice FRQ n — ...` block into an item. */
function parseItem({ header, body, index, spec, filename, title, topics, penalty, shared, violations }) {
  const h = header.match(/^### Practice FRQ (\d+)\s+—\s+(.*?)\((\d+)\s+points?\)(.*)$/)
  const number = h ? Number(h[1]) : index
  const id = `csa-frq-${spec.slot.toLowerCase()}-p${number}`
  const say = (msg) => violations.push(`${id}: ${msg}`)

  if (!h) {
    violations.push(`${filename}: unreadable practice FRQ heading "${header.trim()}"`)
    return null
  }
  if (number !== index) say(`is the ${index}${index === 1 ? 'st' : 'th'} practice FRQ in ${filename} but is numbered ${number}`)
  if (Number(h[3]) !== spec.points) say(`heading says ${h[3]} points, expected ${spec.points}`)
  const name = h[2].replace(/`/g, '').trim()
  const aside = h[4].replace(/^\s*·\s*/, '').trim()

  // --- regions: stem | sample solution | rubric ----------------------------
  const solAt = body.findIndex((l) => /^#### Sample solution\s*$/.test(l))
  const rubAt = body.findIndex((l) => /^#### Rubric\s*\((\d+)\s+points?\)\s*$/.test(l))
  const headings = body.filter((l) => /^#### /.test(l)).length
  if (solAt === -1) say('no "#### Sample solution" section — a model-graded item needs a worked solution')
  if (rubAt === -1) say('no "#### Rubric (N points)" section — nothing states how the points are earned')
  if (headings > 2) say(`${headings} "#### " sections, expected exactly Sample solution and Rubric`)
  if (rubAt !== -1) {
    const stated = Number(body[rubAt].match(/\((\d+)\s+points?\)/)[1])
    if (stated !== spec.points) say(`rubric heading says ${stated} points, expected ${spec.points}`)
  }

  const stemEnd = solAt !== -1 ? solAt : (rubAt !== -1 ? rubAt : body.length)
  const stemLines = trimBlank(body.slice(0, stemEnd))
  const solEnd = rubAt !== -1 ? rubAt : body.length
  const solLines = solAt !== -1 ? trimBlank(body.slice(solAt + 1, Math.max(solAt + 1, solEnd))) : []
  const rubLines = rubAt !== -1 ? trimBlank(body.slice(rubAt + 1)) : []

  // --- stem ----------------------------------------------------------------
  const ownStem = stemLines.join('\n').trim()
  const stem = shared ? `${shared.text}\n\n${ownStem}` : ownStem
  if (!ownStem) say('empty stem — the prompt between the heading and the sample solution is missing')

  const stemCode = fencedBlocks(stemLines)
  if (stemCode.unterminated) say('an unterminated code fence in the stem')
  const provided = []
  const skeleton = []
  for (const blk of [...(shared?.blocks ?? []), ...stemCode.blocks]) {
    if (blk.lang !== 'java') continue
    const kind = classifyJava(blk.code)
    if (kind === 'provided') provided.push(blk.code)
    else if (kind === 'skeleton') skeleton.push(blk.code)
    else {
      say(`unclassified java block in the stem — it ${UNCLASSIFIED_WHY[kind]}:\n      ${blk.code.split('\n')[0]}`)
    }
  }

  // --- sample solution, and the notes that explain it ----------------------
  const solCode = fencedBlocks(solLines)
  const solution = solCode.blocks.filter((blk) => blk.lang === 'java').map((blk) => blk.fenced).join('\n\n')
  if (!solution) say('the sample solution section holds no fenced java block')
  const notes = [...blockquotes(solLines), ...blockquotes(rubLines)]

  // --- rubric --------------------------------------------------------------
  const parts = []
  const criteria = []
  let part = null
  let trace = null
  for (const line of rubLines) {
    const p = line.match(/^\*\*Part ([A-Z])\s+—\s+`([^`]+)`\s+\((\d+)\s+points?\)\*\*\s*$/)
    if (p) {
      part = `Part ${p[1]}`
      parts.push({ label: part, method: p[2], points: Number(p[3]) })
      continue
    }
    const t = line.match(/^\*\*Trace check\.\*\*\s*(.*)$/)
    if (t) {
      // Last write used to win, so a second trace check discarded the first without
      // a word — out of `trace_check` AND out of `explanation`, which /log returns
      // to the student. Everything else in this file that appears twice is a
      // violation; this is one too, and the FIRST is kept so the report is stable.
      if (trace !== null) {
        say(
          'two "**Trace check.**" paragraphs — one of them would be silently discarded, along with whatever it says ' +
          `about the rubric. Keep one. The second reads: "${t[1].trim().slice(0, 60)}..."`,
        )
      } else {
        trace = t[1].trim()
      }
      continue
    }
    if (!isTableRow(line)) continue
    if (isTableRule(line)) continue
    const cells = rowCells(line)
    // A "| Pt | Criterion |" row is the column contract, never a point, wherever it
    // appears: Q1's rubric is two tables, so an item legitimately carries two of
    // them. This used to be a one-shot latch that only a RECOGNIZED part header
    // reset, which meant an unrecognized part header turned the second table's
    // header row into 'malformed rubric row (2 cell(s), expected "| point |
    // criterion |")' — a true refusal, pointed at the wrong line, blaming a row
    // that has exactly the 2 cells it is accused of lacking. The part headers are
    // counted against FRQ_FILES below, which is the check that actually belongs.
    if (cells.length === 2 && /^pt$/i.test(cells[0]) && /^criterion$/i.test(cells[1])) continue
    if (cells.length !== 2 || !/^\d+$/.test(cells[0]) || !cells[1]) {
      say(`malformed rubric row (${cells.length} cell(s), expected "| point | criterion |"): ${line.trim()}`)
      continue
    }
    criteria.push({ point: Number(cells[0]), part, criterion: cells[1] })
  }

  if (criteria.length !== spec.points) {
    say(`${criteria.length} rubric point(s) for a ${spec.points}-point question — every point must be itemized`)
  }
  const numbers = criteria.map((c) => c.point)
  const expected = Array.from({ length: criteria.length }, (_, k) => k + 1)
  if (criteria.length && numbers.join(',') !== expected.join(',')) {
    say(`rubric points [${numbers.join(', ')}] must be numbered 1..${spec.points} in order, across both parts if split`)
  }
  // How many part tables this slot has is declared, not inferred. "Part points sum
  // to the total" was a CONDITIONAL invariant — it only ran `if (parts.length)` —
  // so merging Q1's two tables into one, an ordinary-looking formatting cleanup,
  // parsed with ZERO violations: 7 rows numbered 1..7, parts empty, every criterion
  // belonging to no part. Zero parts was indistinguishable from a single undivided
  // table, and which part a point belongs to is how a student is told which half of
  // the question he lost it in.
  if (parts.length !== spec.parts) {
    say(
      `${parts.length} rubric part header(s) ("**Part A — \`method\` (N points)**"), expected ${spec.parts} for ` +
      `${spec.slot} — ` + (spec.parts
        ? `a ${spec.slot} rubric is ${spec.parts} tables whose points sum to ${spec.points}, numbered 1..${spec.points} ` +
          'across both; one undivided table loses which part each point belongs to'
        : `a ${spec.slot} rubric is one undivided table of ${spec.points} points`),
    )
  }
  if (parts.length) {
    const sum = parts.reduce((n, x) => n + x.points, 0)
    if (sum !== spec.points) {
      say(`part points ${parts.map((x) => x.points).join(' + ')} = ${sum}, but the question is worth ${spec.points}`)
    }
    for (const x of parts) {
      const n = criteria.filter((c) => c.part === x.label).length
      if (n !== x.points) say(`${x.label} claims ${x.points} points but its table itemizes ${n}`)
    }
  }
  if (!trace) {
    say('no "**Trace check.**" paragraph — nothing checks the sample solution against its own rubric')
  }

  // What the student is shown after answering: the worked solution, the notes
  // that explain why it is written that way, and the trace that proves it earns
  // every rubric point. build.js requires a model-graded item to carry one.
  const explanation = [solution, ...notes, trace ? `**Trace check.** ${trace}` : null]
    .filter(Boolean)
    .join('\n\n')

  return {
    id,
    subject: 'ap_csa',
    number,
    question_type: spec.slot,
    label: `${spec.slot} ${title ?? spec.slot} · ${name}`,
    name,
    aside: aside || null,
    kind: 'frq',
    stem,
    provided,
    skeleton,
    // Rubric-scored by the model against the rubric below; there is no key, and
    // pretending otherwise would have grade.js mark every response wrong.
    answer: null,
    options: null,
    points: spec.points,
    rubric: {
      question_type: spec.slot,
      total_points: spec.points,
      penalty_cap: penalty.cap,
      penalty_policy: penalty.policy,
      parts,
      criteria,
    },
    solution,
    explanation,
    trace_check: trace ?? null,
    notes,
    // The markdown declares topics per FILE, not per item, and for Q4 the first of
    // them is the WRONG one. See parseFrqAll: this is a known, unfixed defect.
    topic: topics[0] ?? null,
    topics,
    practice: null,
    source_file: filename,
    allowOffSyllabus: false,
  }
}

/**
 * Parse ONE FRQ file. `filename` must be one of FRQ_FILES — the slot, point value,
 * rubric part count and shared-class applicability all come from that table, so an
 * unknown file is refused rather than guessed.
 *
 * Returns `{ items, meta }`, where `meta` is `{ slot, points, title, topics,
 * models, sharedProvidedFor }`. parseFrqAll spreads that same `meta` alongside
 * `items` into each `byFile` entry.
 */
export function parseFrqFile(text, filename) {
  const spec = FRQ_FILES.find((f) => f.file === filename)
  if (!spec) {
    throw new FrqParseError([
      `unknown FRQ file: ${filename} — add it to FRQ_FILES with its exam slot and point value first`,
    ])
  }
  const violations = []
  const parsed = parseOne(text, filename, spec, violations)
  if (violations.length) throw new FrqParseError(violations)
  return parsed
}

/**
 * Parse every FRQ file. `readBankFile(filename)` returns the markdown for a bare
 * filename, so the caller owns the bank directory.
 *
 * Returns `{ items, byFile }`. THE TOPIC CAVEAT, stated plainly: the markdown
 * tags topics per FILE (each file's Cross-links line, cross-checked against the
 * "Bank Item(s)" column of topic-coverage-matrix.md), never per item. So each
 * item carries its file's whole declared list in `topics`, and `topic` — the one
 * column the items table has — is the FIRST topic that list declares. That is the
 * document's own ordering, not a mapping invented here, and for three of the four
 * files it is also true of every item: every Q1 Part B is a String method (1.15),
 * every Q2 item writes a constructor (1.13), every Q3 item calls ArrayList methods
 * (4.8). build.js reports the 20 items as not individually topic-tagged, the same
 * way it reports the Precalc <unit>.0 buckets, rather than presenting a per-item
 * tag the content does not state.
 *
 * KNOWN DEFECT, Q4, UNFIXED — this justification does NOT hold for frq-q4-2d-array
 * and the comment here used to claim it did ("every Q4 item runs a standard array
 * algorithm, 4.5"). Q4's first-declared topic is 4.5 "Standard Array Algorithms",
 * which is the ONE-dimensional topic, and all five of its items are 2D: countEven,
 * columnMax, countAvailable, heaviestColumn, borderSum. The same file declares 4.13
 * "2D Array Algorithms ... sum, count, find max/min in 2D", which describes them
 * exactly. So a quarter of the free-response bank — of the section that is 45% of
 * the exam — points topic-level selection at the wrong topic. It is coarse for
 * Q1-Q3; for Q4 it is wrong.
 *
 * THE FIX, and why it is not in this commit. This parser is the right place for the
 * READ, not the invention: it must not mint 4.13 out of prose that does not say it.
 * The cheapest correct fix is content-side and spans five files, three of which are
 * outside this module's ownership, so it has to land as one coordinated change:
 *
 *   1. each `### Practice FRQ n` heading states its own topic, e.g. a trailing
 *      "· topic 4.13"  (the 4 markdown files);
 *   2. parseItem reads it, strips it out of `aside`, and REFUSES both a heading
 *      that states none and a topic outside the file's declared list, so the tag
 *      stays a read of the content and drift stays loud  (this file);
 *   3. build.js:284-290 — its INCOMPLETE disclosure says these items "carry the
 *      FIRST topic their file declares" and prints `frq.primaryTopics` as evidence.
 *      Both become false the moment step 1 lands;
 *   4. tools/build/tests/build-gates.test.js:689-693 pins that wording AND the
 *      exact list `1.15, 1.13, 4.8, 4.5`, so it moves with build.js;
 *   5. worker/seed.sql is a COMMITTED artifact holding every item's topic column,
 *      and to-sql.test.js round-trips it against content/items.json. It must be
 *      regenerated (`npm run seed:sql`) in the same change, or the suite fails.
 *
 * Steps 1 and 2 were built and tested; they are not shipped because 3-5 are not
 * this module's to change, and half of them would leave npm test red.
 *
 * Throws FrqParseError, listing every violation found across all four files,
 * instead of returning fewer items than the content holds.
 */
export function parseFrqAll(readBankFile) {
  const violations = []
  const byFile = new Map()
  const items = []
  for (const spec of FRQ_FILES) {
    let text = null
    try {
      text = readBankFile(spec.file)
    } catch (err) {
      violations.push(`${spec.file}: could not be read (${err.message})`)
      continue
    }
    const { items: fileItems, meta } = parseOne(text, spec.file, spec, violations)
    byFile.set(spec.file, { ...meta, items: fileItems })
    items.push(...fileItems)
  }

  const seen = new Set()
  for (const it of items) {
    if (seen.has(it.id)) violations.push(`${it.id}: two practice FRQs compiled to the same id`)
    seen.add(it.id)
  }
  if (items.length !== FRQ_TOTAL) {
    violations.push(
      `${items.length} FRQ item(s) parsed in total, expected ${FRQ_TOTAL} ` +
      `(${FRQ_PER_FILE} per question type x ${FRQ_FILES.length} question types)`,
    )
  }
  const totalPoints = items.reduce((n, it) => n + it.points, 0)
  const wanted = FRQ_FILES.reduce((n, f) => n + f.points * FRQ_PER_FILE, 0)
  if (totalPoints !== wanted) violations.push(`FRQ items total ${totalPoints} points, expected ${wanted}`)

  if (violations.length) throw new FrqParseError(violations)
  return { items, byFile }
}
