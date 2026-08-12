// D1 access. Every read is scoped and indexed; every write is a single statement.
//
// Workers get 10ms of CPU per invocation. D1 round-trips are I/O rather than
// CPU, so the cost to watch is JSON parsing. items() parses three JSON columns
// on every row, eagerly, for the whole subject; attempts() has no LIMIT and
// no time window — it returns the subject's full history, oldest first. Both
// are fine at today's volume (measured ~13ms of JS CPU at 10,000 attempts,
// which is roughly 7 months out at 50 answers/day) but that is a real ceiling,
// not a hypothetical one, and it will need windowing before it is reached.

/**
 * Rows a readiness computation needs, and nothing more.
 *
 * `picked` is projected through a fixed alias whether or not the column exists,
 * so the row SHAPE never depends on whether the database has been migrated —
 * only the value does. See attemptsHavePicked().
 */
const ATTEMPT_COLS = (picked) => `a.id, a.ts, a.subject, a.item_id, a.topic, a.unit, a.practice,
  a.response, a.correct, a.graded_by, a.seconds, a.hints_used, a.conditions, a.mock_id,
  ${picked ? 'a.picked' : 'NULL'} AS picked,
  i.kind, i.calc_allowed`

/** The attempt columns every write names, in the order both INSERTs bind them. */
const ATTEMPT_WRITE_COLS = (picked) => [
  'ts', 'subject', 'item_id', 'topic', 'unit', 'practice', 'response', 'correct',
  'graded_by', 'seconds', 'hints_used', ...(picked ? ['picked'] : []),
]

export function makeDb(D1) {
  const all = async (sql, ...binds) => (await D1.prepare(sql).bind(...binds).all()).results ?? []
  const one = async (sql, ...binds) => await D1.prepare(sql).bind(...binds).first()
  const run = async (sql, ...binds) => await D1.prepare(sql).bind(...binds).run()

  /**
   * Whether THIS database's `attempts` table has the `picked` column yet.
   * Probed once per instance — i.e. at most once per request — and cached.
   *
   * WHY THIS IS ASKED AT ALL. schema.sql declares the column, but every CREATE
   * TABLE in that file is IF NOT EXISTS: that is what makes reloading it (and
   * seed.sql, which embeds it) safe against a database full of real evidence, and
   * it is also why an existing `attempts` table does not gain a column when the
   * schema does. The database therefore needs `ALTER TABLE attempts ADD COLUMN
   * picked TEXT` by hand, and in this deployment that ALTER is a manual step
   * through Cloudflare's REST API, because `wrangler d1 execute --remote` is
   * blocked here (see DEPLOY.md). So the code cannot assume it has happened.
   *
   * WHAT THE ALTERNATIVE COSTS. Naming an absent column in an INSERT makes SQLite
   * reject the whole statement, so a hard dependency turns EVERY /log into a 500
   * against an unmigrated database: the tutor would stop recording answers
   * altogether in order to record one extra letter about them. Losing evidence to
   * protect a detail about it is the wrong direction, and it is the failure this
   * project has hit before.
   *
   * IT IS NOT SILENT. The absence is logged with the exact remedy, the projection
   * above returns NULL rather than dropping the field, and the column is listed as
   * a pending migration at the top of schema.sql. What it will never do is decide
   * that an answer cannot be stored.
   *
   * The probe is a SELECT rather than a PRAGMA on purpose: `PRAGMA table_info` is
   * only conditionally available across drivers, while "does this column resolve"
   * is answered identically by every SQL engine either module runs against.
   */
  let picked = null
  const attemptsHavePicked = async () => {
    if (picked == null) {
      try {
        await all(`SELECT picked FROM attempts LIMIT 0`)
        picked = true
      } catch {
        picked = false
        console.warn(
          'attempts.picked is missing, so which option a wrong answer chose is not being recorded. ' +
          'Run: ALTER TABLE attempts ADD COLUMN picked TEXT',
        )
      }
    }
    return picked
  }

  return {
    async items(subject) {
      const rows = await all(`SELECT * FROM items WHERE subject = ?`, subject)
      return rows.map((r) => ({
        ...r,
        options: r.options_json ? JSON.parse(r.options_json) : null,
        answer_variants: r.answer_variants_json ? JSON.parse(r.answer_variants_json) : null,
        rubric: r.rubric_json ? JSON.parse(r.rubric_json) : null,
      }))
    },

    async item(id) {
      const r = await one(`SELECT * FROM items WHERE id = ?`, id)
      if (!r) return null
      return {
        ...r,
        options: r.options_json ? JSON.parse(r.options_json) : null,
        answer_variants: r.answer_variants_json ? JSON.parse(r.answer_variants_json) : null,
        rubric: r.rubric_json ? JSON.parse(r.rubric_json) : null,
      }
    },

    async attempts(subject) {
      return all(
        `SELECT ${ATTEMPT_COLS(await attemptsHavePicked())} FROM attempts a
         LEFT JOIN items i ON i.id = a.item_id
         WHERE a.subject = ? ORDER BY a.ts`,
        subject,
      )
    },

    topics(subject) {
      return all(`SELECT * FROM topics WHERE subject = ?`, subject)
    },

    teaching(subject) {
      return all(`SELECT * FROM teaching WHERE subject = ?`, subject)
    },

    gaps(subject) {
      return all(`SELECT * FROM gaps WHERE subject = ? ORDER BY opened_at`, subject)
    },

    mocks(subject) {
      return all(`SELECT * FROM mocks WHERE subject = ? ORDER BY started_at`, subject)
    },

    // --- writes ------------------------------------------------------------

    /**
     * Record that an item was handed out, and return the server-issued id.
     *
     * Inside a sitting the INSERT is CONDITIONAL: it refuses to hand out an item
     * that already has an unlogged serve on this paper, and reports that by
     * returning null.
     *
     * @returns {Promise<number|null>} the serve id, or null when this sitting
     *          already has that same item outstanding.
     *
     * WHY THE GUARD IS IN THE STATEMENT. A serve is invisible to the paper's own
     * no-repeat list until it is LOGGED — select.js can only see attempt rows —
     * so handleNext feeds it the sitting's open serves through `excludeItemIds`.
     * That read is a read-then-write, and there is no transaction here: two
     * concurrent /next calls both read no open serves, both pick the same item,
     * and both insert. Measured at 200/200 duplicates. This is claimServe's
     * argument applied to the serve table: because the check and the insert are
     * ONE statement, a second serve of an outstanding item cannot land, whatever
     * the interleaving, and the loser gets a 409 it can simply retry.
     *
     * Two attempt rows for one question under one mock are not two questions of
     * evidence: a duplicate buys a 37-of-42 sitting past MIN_MOCK_COVERAGE
     * (ceil(0.9 * 42) = 38), and since the denominator is
     * max(scored, scorable - ungraded) a duplicated CORRECT answer adds to the
     * numerator without adding to the denominator.
     *
     * This guard is the CONCURRENT half only, and it keys on `logged = 0`, so it
     * does not cover the window handleLog opens between spending the serve and
     * inserting the attempt — by then the serve is logged and this NOT EXISTS
     * matches nothing. openServeItems below is what closes that, by not filtering
     * on `logged` at all, so the selector never asks for the item in the first
     * place.
     *
     * OUTSIDE a sitting the insert is deliberately unconditional. There is no
     * paper for a duplicate to inflate, and a serve abandoned mid-question is
     * never cleaned up: guarding here would make that item permanently
     * unservable, and with the selector still free to pick it, every later /next
     * would refuse. Ordinary practice would degrade one abandoned question at a
     * time, with no way back.
     */
    async recordServe({ subject, item_id, served_at, mock_id = null }) {
      if (mock_id == null) {
        const r = await one(
          `INSERT INTO serves (subject, item_id, served_at, mock_id, logged)
           VALUES (?, ?, ?, NULL, 0) RETURNING id`,
          subject, item_id, served_at,
        )
        return r.id
      }
      const mock = Number(mock_id)
      const r = await one(
        `INSERT INTO serves (subject, item_id, served_at, mock_id, logged)
         SELECT ?, ?, ?, ?, 0
          WHERE NOT EXISTS (
            SELECT 1 FROM serves
             WHERE subject = ? AND logged = 0 AND mock_id = ? AND item_id = ?
          )
         RETURNING id`,
        subject, item_id, served_at, mock, subject, mock, item_id,
      )
      return r?.id ?? null
    },

    serve(id) {
      return one(`SELECT * FROM serves WHERE id = ?`, id)
    },

    /**
     * The items this sitting has handed out, answered or not.
     *
     * This paper's questions. select.js judges a repeat from attempt rows, and an
     * attempt row does not exist until /log has finished writing it, so without
     * this a question is servable again the moment it leaves the server — and two
     * /next calls inside one sitting handed out the same one. handleNext passes
     * these back as `excludeItemIds` so they are removed from every pool.
     *
     * DELIBERATELY NOT FILTERED ON `logged`. It used to be, and that left the
     * defect open through a narrower door: handleLog spends the serve FIRST
     * (claimServe flips `logged`) and inserts the attempt SECOND, so in between
     * the question belonged to no no-repeat list at all — `logged = 1` hid it from
     * this query, no attempt row existed for select.js's this-paper set, and
     * recordServe's NOT EXISTS guard keys on `logged = 0` too, so nothing refused
     * the re-serve. Measured at that park point: a 37-distinct paper came back as
     * 38 answers, cleared MIN_MOCK_COVERAGE and scored 90.5 instead of being
     * recorded as too short to count. An item this sitting has served is on this
     * paper whether or not its answer has landed yet.
     *
     * The cost of dropping it, taken deliberately: if a /log dies between spending
     * the serve and inserting the attempt — the lost-answer trade-off handleLog
     * takes on purpose — that question cannot be re-asked for the rest of the
     * sitting. The paper is one question shorter, which understates coverage. The
     * alternative overstates it.
     *
     * Scoped to ONE sitting on purpose, and that scope is now the only thing
     * bounding the query. Serves are never cleaned up, so excluding them
     * subject-wide would shrink the drillable bank by one item for every question
     * ever abandoned mid-answer, permanently — and, with the selector still free to
     * pick it, every later /next on it would be refused. Inside a sitting the set
     * dies with the paper. Ordinary practice never calls this at all: handleNext
     * only asks when there is a mockId.
     *
     * THE QUERY PLAN, since the previous note here described one the query never
     * had. idx_serves_open is (subject, logged, id) and nothing else on this table
     * is indexed, so this is `SEARCH serves USING INDEX idx_serves_open
     * (subject=?)` plus `USE TEMP B-TREE FOR DISTINCT`, with mock_id as an
     * UNINDEXED residual filter over every serve row for the subject — not just
     * the unlogged ones, and never narrowed to the sitting. Since serves are never
     * deleted that slice only grows: measured 0.56ms at 20,000 serve rows, against
     * a 10ms CPU budget, on /next inside a mock only. Fine now, linear in the
     * subject's whole serve history, and an index on (subject, mock_id) is what
     * fixes it when it stops being fine.
     *
     * The NAME is a leftover: nothing here is about a serve still being open any
     * more. Renaming it means touching api.js, its only caller, so it is left for
     * a change that owns both files — read it as "this paper's item ids".
     */
    async openServeItems({ subject, mockId }) {
      const rows = await all(
        `SELECT DISTINCT item_id FROM serves
          WHERE subject = ? AND mock_id = ?`,
        subject, Number(mockId),
      )
      return rows.map((r) => r.item_id)
    },

    /**
     * Deprecated alias for markServeLoggedUnsafe. Nothing in this codebase
     * calls it under this name any more — api.js spends a serve through
     * claimServe() below — but worker/tests/smoke.test.js still calls
     * `db.markServeLogged(id)` directly to seed `serves.logged` against real
     * SQLite, and that file belongs to a different fixing pass than this one.
     * Do not add a new caller under either name; use claimServe().
     */
    markServeLogged(id) {
      return this.markServeLoggedUnsafe(id)
    },

    /**
     * UNSAFE — unconditional, no guard against a second caller doing the same
     * thing to the same id. That is exactly the double-count race claimServe()
     * below exists to close: of two concurrent /log calls on one serve, this
     * method flips the row for BOTH of them, so a future `/log`-style caller
     * that reaches for this instead of claimServe() silently reinstates one
     * answer becoming two attempt rows. See claimServe() for the safe version.
     */
    markServeLoggedUnsafe(id) {
      return run(`UPDATE serves SET logged = 1 WHERE id = ?`, id)
    },

    /**
     * Spend a serve, and report whether THIS call was the one that spent it.
     *
     * @returns {Promise<number>} 1 when this call flipped the row, 0 when the
     *          serve was already logged (or does not exist).
     *
     * The `AND logged = 0` is the whole point. A single UPDATE is atomic in D1 —
     * there is no transaction available here — so of two concurrent /log calls on
     * one serve id exactly one changes a row and the other gets 0. The
     * unconditional markServeLoggedUnsafe() above cannot do this job: it changes a
     * row for BOTH racers, so its count carries no information, and one answer
     * became two attempt rows.
     *
     * The changed-row count sits in different places in the two drivers this runs
     * against: D1 exposes it as `meta.changes`, node:sqlite (which the tests drive
     * through a thin shim) as `changes`. Neither shape may be assumed.
     */
    async claimServe(id) {
      const r = await run(`UPDATE serves SET logged = 1 WHERE id = ? AND logged = 0`, id)
      return Number(r?.meta?.changes ?? r?.changes ?? 0)
    },

    async recordAttempt(a) {
      const cols = ATTEMPT_WRITE_COLS(await attemptsHavePicked())
      return run(
        `INSERT INTO attempts (${cols.join(', ')}, conditions, mock_id)
         VALUES (${cols.map(() => '?').join(',')},?,?)`,
        ...cols.map((c) => a[c] ?? null), a.conditions, a.mock_id,
      )
    },

    /**
     * Record an attempt and file it under `mock_id` ONLY if that sitting is still
     * open, deciding which inside the INSERT itself.
     *
     * @returns {Promise<number|null>} the mock id actually stored — the sitting
     *          when it was still open at insert time, null when it had already
     *          been submitted (or does not exist), in which case
     *          `conditions_if_closed` is stored instead of 'proctored_mock'.
     *
     * The subquery is the whole point, and it is claimServe's argument applied to
     * the other write. Deciding in JS — read the mock, see ended_at IS NULL, then
     * insert — is a read-then-write with no transaction available, so a first-time
     * /log racing /mock/submit reads the sitting as open, files its answer under
     * the mock, and the readiness engine counts that answer (it reads the window's
     * evidence as `attempts.filter((a) => ids.has(a.mock_id))`) while the stored
     * composite is frozen at what was scored a moment earlier. That is the
     * post-submit defect reopening through a narrow window.
     *
     * Because the filing decision and the insert are ONE statement, mock_id can
     * only come back set if the sitting was open at the instant the row landed.
     * handleMockSubmit closes the sitting before it reads the attempts it scores,
     * so an answer that was filed under the mock was necessarily already there to
     * be scored: the stored composite and the evidence readiness counts cannot
     * disagree, whatever the interleaving.
     *
     * The answer is never lost either way — a demoted row is still an attempt,
     * recorded as ordinary practice.
     */
    async recordAttemptUnderOpenMock(a) {
      const cols = ATTEMPT_WRITE_COLS(await attemptsHavePicked())
      const r = await one(
        `INSERT INTO attempts (${cols.join(', ')}, conditions, mock_id)
         SELECT ${cols.map(() => '?').join(',')},
                CASE WHEN m.id IS NULL THEN ? ELSE 'proctored_mock' END,
                m.id
           FROM (SELECT 1) LEFT JOIN mocks m ON m.id = ? AND m.ended_at IS NULL
         RETURNING mock_id`,
        ...cols.map((c) => a[c] ?? null), a.conditions_if_closed, a.mock_id,
      )
      return r?.mock_id ?? null
    },

    /**
     * Open a gap on a topic, unless one is already open on it.
     *
     * The PRIMARY KEY is (subject, topic, opened_at), so OR IGNORE alone does NOT
     * make this idempotent: every request carries its own millisecond clock, and
     * handleNext reads the gaps table and then writes it with no transaction
     * available. Two concurrent /next calls on one freshly evidenced gap therefore
     * wrote TWO rows, and `open_gaps` then listed the topic twice in every response
     * the model reads aloud to the student.
     *
     * The NOT EXISTS is inside the statement for the same reason claimServe's guard
     * is: because the check and the insert are one statement, a second open row
     * cannot land whatever the interleaving. OR IGNORE stays for the primary key —
     * a fresh gap opened at the same millisecond as a CLEARED row's opened_at would
     * otherwise raise a constraint error, which is the one case OR IGNORE was
     * already covering.
     */
    openGap({ subject, topic, opened_at }) {
      return run(
        `INSERT OR IGNORE INTO gaps (subject, topic, opened_at)
         SELECT ?,?,?
          WHERE NOT EXISTS (
            SELECT 1 FROM gaps WHERE subject = ? AND topic = ? AND cleared_at IS NULL
          )`,
        subject, topic, opened_at, subject, topic,
      )
    },

    /**
     * Mark the lesson delivered, and report whether THIS call marked it.
     *
     * @returns {Promise<number>} 1 when a row changed, 0 when there was no open gap
     *          on that topic to mark (a topic name where an id belongs, or a gap
     *          closed since the caller read it).
     *
     * The count is the point. handleTaught reads the open gaps and then writes, and
     * a /taught racing the /log that closes the gap matched nothing here — so
     * discarding the count reported ok:true and promised that the topic "will come
     * back with no hints" about a gap an unaided correct answer had already closed.
     */
    async markTaught({ subject, topic, taught_at }) {
      const r = await run(
        `UPDATE gaps SET taught_at = ? WHERE subject = ? AND topic = ? AND cleared_at IS NULL`,
        taught_at, subject, topic,
      )
      return Number(r?.meta?.changes ?? r?.changes ?? 0)
    },

    clearGap({ subject, topic, cleared_at }) {
      return run(
        `UPDATE gaps SET cleared_at = ? WHERE subject = ? AND topic = ? AND cleared_at IS NULL`,
        cleared_at, subject, topic,
      )
    },

    /**
     * Open a sitting, unless one on this subject is still open.
     *
     * @returns {Promise<number|null>} the mock id, or null when this subject
     *          already has a sitting that was started and never submitted.
     *
     * WHY THIS IS REFUSED AT ALL. An abandoned open sitting was invisible on every
     * surface: unscoredSittings skips a mock with no ended_at, proctored_mocks
     * counts only sittings with a composite, and nothing insisted the previous one
     * be finished. So "start a section, see it going badly, walk away, start
     * another" left no record anywhere — the one gaming path the coverage and
     * timing gates do not close, in a system whose whole premise is refusing
     * unearned claims. Answers already on the abandoned paper are not lost: they
     * are attempts, and submitting it scores whatever is on it, with the reason.
     *
     * WHY THE GUARD IS IN THE STATEMENT, like recordServe's and claimServe's.
     * Reading the mocks table and then inserting is a read-then-write, and D1
     * offers no transaction: two concurrent /mock/start calls would both see no
     * open sitting and both insert, which is exactly the state being refused.
     * Because the check and the insert are one statement, the second cannot land
     * whatever the interleaving, and the loser gets a 409 naming the sitting that
     * is open.
     *
     * Scoped to the SUBJECT: two exams are in progress, and a CSA paper on the
     * desk says nothing about a Precalculus one.
     */
    async startMock({ subject, section, started_at, proctored, source }) {
      const r = await one(
        `INSERT INTO mocks (subject, section, started_at, proctored, source)
         SELECT ?,?,?,?,?
          WHERE NOT EXISTS (SELECT 1 FROM mocks WHERE subject = ? AND ended_at IS NULL)
         RETURNING id`,
        subject, section, started_at, proctored, source, subject,
      )
      return r?.id ?? null
    },

    mock(id) {
      return one(`SELECT * FROM mocks WHERE id = ?`, id)
    },

    /**
     * Close a sitting, and report whether THIS call was the one that closed it.
     *
     * @returns {Promise<number>} 1 when this call closed the sitting, 0 when it
     *          was already submitted (or does not exist).
     *
     * The `AND ended_at IS NULL` is claimServe's guard on the other table, and it
     * is needed for the same reason: handleMockSubmit's `if (m.ended_at) throw` is
     * a read-then-write, D1 offers no transaction, so two concurrent submits both
     * read the sitting as open and both write a composite — and, worse, the close
     * is what tells a concurrent /log that the paper is in. A single UPDATE is
     * atomic, so exactly one submit closes the sitting and the other is refused.
     *
     * Closing is deliberately separate from scoring: the composite has to be
     * computed from attempts read AFTER the sitting is closed, or an answer that
     * landed in between would be filed under the mock and missing from the score.
     * If this dies between the two, the sitting stays closed with no composite —
     * recorded, disclosed as unscored, and unable to move readiness. That is the
     * safe direction: it understates rather than overstates.
     *
     * The changed-row count sits in different places in the two drivers this runs
     * against — D1 exposes it as `meta.changes`, node:sqlite as `changes`.
     */
    async closeMock({ id, ended_at }) {
      const r = await run(`UPDATE mocks SET ended_at = ? WHERE id = ? AND ended_at IS NULL`, ended_at, id)
      return Number(r?.meta?.changes ?? r?.changes ?? 0)
    },

    /**
     * Store what a closed sitting scored, and report whether THIS call stored it.
     *
     * @returns {Promise<number>} 1 when this call wrote the score, 0 when the
     *          sitting is not closed, or had already been scored by someone else.
     *
     * WHY IT IS CONDITIONAL. closeMock and this are two writes with a gap between
     * them, and the gap is where the composite, the blank count and a full
     * readiness recomputation happen — the most CPU-expensive stretch in the
     * request, so a Worker CPU kill lands there preferentially. That left
     * {ended_at set, composite_pct null, blanks null}: a sitting closed and never
     * scored, which handleMockSubmit can now finish on a later call. The guard is
     * what makes finishing it safe — two racing rescues both compute a composite,
     * and exactly one may store one, so the other is refused rather than allowed
     * to overwrite it.
     *
     * `blanks IS NULL` is the test for "never scored", not `composite_pct IS
     * NULL`: a sitting that WAS scored and legitimately produced no composite (too
     * little of the section reached, no clock, a section the bank cannot supply)
     * has a null composite too, and re-scoring those forever would reopen the
     * "already submitted" refusal that stops one sitting being counted twice. This
     * method is the only writer of `blanks`, so a NULL there means it never ran.
     */
    async scoreMock({ id, composite_pct, blanks }) {
      const r = await run(
        `UPDATE mocks SET composite_pct = ?, blanks = ?
          WHERE id = ? AND ended_at IS NOT NULL AND composite_pct IS NULL AND blanks IS NULL`,
        composite_pct, blanks, id,
      )
      return Number(r?.meta?.changes ?? r?.changes ?? 0)
    },
  }
}
