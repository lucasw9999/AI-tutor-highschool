// D1 access. Every read is scoped and indexed; every write is a single statement.
//
// Workers get 10ms of CPU per invocation. D1 round-trips are I/O rather than
// CPU, so the cost to watch is JSON parsing. items() parses three JSON columns
// on every row, eagerly, for the whole subject; attempts() has no LIMIT and
// no time window — it returns the subject's full history, oldest first. Both
// are fine at today's volume (measured ~13ms of JS CPU at 10,000 attempts,
// which is roughly 7 months out at 50 answers/day) but that is a real ceiling,
// not a hypothetical one, and it will need windowing before it is reached.

/** Rows a readiness computation needs, and nothing more. */
const ATTEMPT_COLS = `a.id, a.ts, a.subject, a.item_id, a.topic, a.unit, a.practice,
  a.response, a.correct, a.graded_by, a.seconds, a.hints_used, a.conditions, a.mock_id,
  i.kind, i.calc_allowed`

export function makeDb(D1) {
  const all = async (sql, ...binds) => (await D1.prepare(sql).bind(...binds).all()).results ?? []
  const one = async (sql, ...binds) => await D1.prepare(sql).bind(...binds).first()
  const run = async (sql, ...binds) => await D1.prepare(sql).bind(...binds).run()

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

    attempts(subject) {
      return all(
        `SELECT ${ATTEMPT_COLS} FROM attempts a
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
     * max(scored, expected - ungraded) a duplicated CORRECT answer adds to the
     * numerator without adding to the denominator.
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
     * The items this sitting has handed out and not yet seen answered.
     *
     * The questions in flight. select.js judges a repeat from attempt rows, which
     * do not exist until /log, so between /next and /log a question is servable
     * again as far as the selector can see — and two /next calls inside one
     * sitting handed out the same one. handleNext passes these back as
     * `excludeItemIds` so they are removed from every pool.
     *
     * Scoped to ONE sitting on purpose. Serves outside a sitting are never
     * cleaned up, so excluding them subject-wide would shrink the drillable bank
     * by one item for every question ever abandoned mid-answer, permanently.
     * Inside a sitting the set dies with the paper.
     *
     * Reads on the (subject, logged, id) prefix of idx_serves_open.
     */
    async openServeItems({ subject, mockId }) {
      const rows = await all(
        `SELECT DISTINCT item_id FROM serves
          WHERE subject = ? AND logged = 0 AND mock_id = ?`,
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

    recordAttempt(a) {
      return run(
        `INSERT INTO attempts
           (ts, subject, item_id, topic, unit, practice, response, correct,
            graded_by, seconds, hints_used, conditions, mock_id)
         VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?)`,
        a.ts, a.subject, a.item_id, a.topic, a.unit, a.practice, a.response,
        a.correct, a.graded_by, a.seconds, a.hints_used, a.conditions, a.mock_id,
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
      const r = await one(
        `INSERT INTO attempts
           (ts, subject, item_id, topic, unit, practice, response, correct,
            graded_by, seconds, hints_used, conditions, mock_id)
         SELECT ?,?,?,?,?,?,?,?,?,?,?,
                CASE WHEN m.id IS NULL THEN ? ELSE 'proctored_mock' END,
                m.id
           FROM (SELECT 1) LEFT JOIN mocks m ON m.id = ? AND m.ended_at IS NULL
         RETURNING mock_id`,
        a.ts, a.subject, a.item_id, a.topic, a.unit, a.practice, a.response,
        a.correct, a.graded_by, a.seconds, a.hints_used, a.conditions_if_closed, a.mock_id,
      )
      return r?.mock_id ?? null
    },

    openGap({ subject, topic, opened_at }) {
      return run(
        `INSERT OR IGNORE INTO gaps (subject, topic, opened_at) VALUES (?,?,?)`,
        subject, topic, opened_at,
      )
    },

    markTaught({ subject, topic, taught_at }) {
      return run(
        `UPDATE gaps SET taught_at = ? WHERE subject = ? AND topic = ? AND cleared_at IS NULL`,
        taught_at, subject, topic,
      )
    },

    clearGap({ subject, topic, cleared_at }) {
      return run(
        `UPDATE gaps SET cleared_at = ? WHERE subject = ? AND topic = ? AND cleared_at IS NULL`,
        cleared_at, subject, topic,
      )
    },

    async startMock({ subject, section, started_at, proctored, source }) {
      const r = await one(
        `INSERT INTO mocks (subject, section, started_at, proctored, source)
         VALUES (?,?,?,?,?) RETURNING id`,
        subject, section, started_at, proctored, source,
      )
      return r.id
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
