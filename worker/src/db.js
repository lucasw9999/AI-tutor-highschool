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

    /** Record that an item was handed out, and return the server-issued id. */
    async recordServe({ subject, item_id, served_at, mock_id = null }) {
      const r = await one(
        `INSERT INTO serves (subject, item_id, served_at, mock_id, logged)
         VALUES (?, ?, ?, ?, 0) RETURNING id`,
        subject, item_id, served_at, mock_id,
      )
      return r.id
    },

    serve(id) {
      return one(`SELECT * FROM serves WHERE id = ?`, id)
    },

    markServeLogged(id) {
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
     * unconditional markServeLogged() above cannot do this job: it changes a row
     * for BOTH racers, so its count carries no information, and one answer became
     * two attempt rows.
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

    endMock({ id, ended_at, composite_pct, blanks }) {
      return run(
        `UPDATE mocks SET ended_at = ?, composite_pct = ?, blanks = ? WHERE id = ?`,
        ended_at, composite_pct, blanks, id,
      )
    },
  }
}
