# Deploy runbook

Live: **https://ap-tutor.lucasruomingwu.workers.dev**
Dashboard: `/dash?k=<PARENT_KEY>` · Health: `/health` (no key)

Access keys live in `.secrets/keys.txt` (gitignored, mode 600). They are not in
this repo and not in any transcript.

| Resource | Value |
|---|---|
| Account | `4d2d1850f893909b2785f8a92004f332` |
| D1 database | `ap-tutor` — `51bef13b-5610-4528-9d5f-7ff128aef8fc` |
| Worker | `ap-tutor` |

## How this was deployed, and why not with wrangler

Two environment constraints shaped this, both hit repeatedly:

1. **`wrangler login` and `wrangler dev` cannot run here.** Binding a loopback
   socket fails with `EPERM`, so the OAuth callback server and Miniflare both
   die. This is an OS-level block, not a sandbox flag — passing
   `dangerouslyDisableSandbox` failed identically.
2. **`wrangler d1 execute --remote` is blocked** even when `wrangler deploy`
   works.

So the deploy runs against Cloudflare's REST API **through an authenticated
browser session** (ego-browser), which needs no API token at all. That is
strictly better than creating one: no long-lived credential exists, nothing can
leak into a transcript, and there is nothing to revoke afterward.

`GET /api/v4/...` and `POST` both work from `dash.cloudflare.com` with
`credentials: 'include'`. No CSRF header is required. The session cookie is
HttpOnly, so it cannot be extracted for use from the shell — every request has to
originate inside the page.

## Re-deploying after a code change

```bash
npm test && npm run build && npm run seed:sql && npm run worker:check
```

**`npm run build` now exits 0.** It used to exit 1 and write nothing, because
ap_precalc content was incomplete. That is fixed: exam-tested topic coverage is
100%, every exam-tested topic has at least one KEYED item, and the bank holds 38
`mcq` + 4 `frq`, which is what `api.js` needs to cover both halves of a
42-question paper at its 90% floor. `--write-despite-incomplete` still exists as
an escape hatch (it changes what gets written, never the exit code) but is no
longer needed for a normal deploy. Run `npm run build` with no flag and read
"INCOMPLETE CONTENT" if it ever fails again — that list is generated from the
content, so it does not go stale the way a hand-written list here did, twice.

Then, from an ego-browser session logged into Cloudflare, upload
`/tmp/ap-tutor-build/index.js` with `PUT /api/v4/accounts/{acc}/workers/scripts/ap-tutor`
as multipart: a `metadata` part (`main_module`, `compatibility_date`, and the D1
+ `secret_text` bindings) and the module itself as
`application/javascript+module`.

**Bindings must be re-sent on every upload.** The API replaces the binding set
wholesale, so omitting `STUDENT_KEY` silently unsets it and every request starts
returning 401. Two ways to satisfy that:

- `{"type":"inherit","name":"STUDENT_KEY"}` — keeps the existing secret without
  knowing its value. Use this for an ordinary code deploy; the key never has to
  be read, so it cannot leak into a transcript.
- `{"type":"secret_text","name":"STUDENT_KEY","text":"<value>"}` — sets a new
  value. This is also **how you rotate a key**, because
  `PUT /workers/scripts/ap-tutor/secrets` returns **403 with an HTML body** from
  the dashboard origin (WAF-blocked, measured 13 Aug 2026). Re-uploading the
  script with the value inline is the working path.

Relative `fetch('/api/v4/...')` only works while the active tab is on
`dash.cloudflare.com`. If the tab has moved to another origin the request hits
that origin and comes back as HTML, which parses as
`SyntaxError: Unexpected token '<'`. Switch tabs first, or use an absolute URL.

## Reloading content

`seed.sql` is idempotent — every insert is an upsert and nothing in it touches
`attempts`, `serves`, `mocks` or `gaps`. Reloading is safe against a live
database with real evidence in it, and `tools/build/tests/to-sql.test.js`
asserts exactly that: it loads the real file, adds a column the way a later
migration would, writes one row into each of `attempts`, `serves`, `mocks` and
`gaps`, reloads twice, and then compares the evidence byte for byte — rows,
autoincrement counters, and the migration-added column included. It also asserts
no evidence table references a content table, because `INSERT OR REPLACE` is a
delete followed by an insert, so a cascading foreign key would erase attempts
silently.

**Split the file with `splitSqlStatements`, exported from
`tools/build/to-sql.js`.** Import it — do not re-derive it at deploy time. Two
things in this file break a splitter written from memory, and both are already
in it:

1. **A `;` inside a string literal.** The CSA stems contain Java, so
   `String csv = "red,green,blue,yellow";` ends a line with a semicolon *inside*
   a SQL literal. Cutting on lines that end in `;` cuts there.
2. **A `;` or a lone apostrophe inside a comment.** `schema.sql` is embedded
   here verbatim and its prose contains both — `-- ALTER TABLE attempts ADD
   COLUMN picked TEXT;` and `that column's absence`. Tracking quote state
   *without* tracking comments is not enough: that apostrophe reads as the start
   of a literal, and statement boundaries stop being seen until the next
   apostrophe. Parity is what decides it, so adding one apostrophe to any
   comment in the file inverts the state for everything after it — a pure
   documentation edit that takes the load from every item to none.

`splitSqlStatements` treats single-quoted literals (with `''` escaped), quoted
identifiers, `--` lines and `/* */` blocks as opaque. The test suite loads each
statement it returns on its own with `prepare()` — which compiles exactly one
statement, so anything glued on behind it would be skipped and the row counts
would not reconcile.

**Group whole statements into requests; never split a statement.** ~40 KiB per
request is a reasonable target for the small ones, but it is not achievable
across the board and never will be: three statements in the current file are
each larger than 40 KiB on their own (see the table), so each has to travel as a
request of its own, at roughly twice the target. A statement is indivisible.

**D1 rejects any single statement over 100,000 bytes**
([limits](https://developers.cloudflare.com/d1/platform/limits/)), and that
limit is per statement even inside a batch, so grouping cannot amortize it.
Nothing at load time will warn you: `node:sqlite` accepts a 140 KB statement
without complaint, so an over-limit file passes every test here and then fails
*partway through* the live load, leaving the database half-seeded. `npm run
seed:sql` therefore gates it, refuses to write the file if any statement is over,
and prints the largest statement as a percentage of the limit. If the gate ever
fires, lower the `chunk` size in `insertStatements()` and regenerate.

### The numbers, as measured

Every figure below is **checked by `tools/build/tests/to-sql.test.js` against the
real `worker/seed.sql`**, so it cannot go stale the way the hand-written figures
in this file did three times. If content is regenerated and a number moves, the
suite fails and names the new value — update the table, do not silence it.

| What | Measured |
|---|---|
| `seed.sql`, total | **420364 bytes** (410.5 KiB) |
| statements | **28** |
| largest statement | **93723 bytes** = 93.7% of the limit, 6277 bytes of headroom |
| statements over 40 KiB | **3**: 77993, 93723, 53088 bytes |
| that largest one, plus one more row shaped like the heaviest item in the bank (`pc-u1-p5`) | **136439 bytes** = 136.4% of the limit |
| a naive line-ending-in-`;` split of it | loads **56 of 336** items, fails **618 of 640** chunks |

### What a reload CANNOT do, and the migration the live database needed

Two things `seed.sql` will never do to a database that already exists, because
every `CREATE TABLE` in it is `IF NOT EXISTS` and every write is an upsert:

1. **Add a column.** An existing table does not gain one.
2. **Retire a row.** A `topics`, `items` or `teaching` row that the content no
   longer declares is not deleted, because the file only ever inserts. So a
   retired topic survives in D1 forever unless it is deleted by hand — and a
   retired *exam-tested* topic keeps counting toward `topics_total` in
   `coverageOf` (api.js), which pins readiness at 0 through the coverage
   criterion and inflates the dashboard's "N/M topics attempted" chip.

Both are permanent properties of the file, and both bit the live database once.
**Their migration has already been run** — `attempts.picked` exists and the four
`<unit>.0` placeholder topics are gone (see "Closed since the last deploy"), and
the current `seed.sql` carries 0 placeholder rows and 0 items pointing at one. So
do **not** run the block below against the live database again: step 1 fails with
"duplicate column name" and step 3 is a no-op. It is kept because the order is
the load-bearing part, and any future rebuild of this database, or any future
column, needs it. Run these against a D1 that has not had them, **in this
order**:

```sql
-- 1. attempts.picked, added to schema.sql after the table shipped. Check first:
--    SELECT picked FROM attempts LIMIT 0;   -- the same probe db.js uses
--    Skip this statement if it succeeds; SQLite has no ADD COLUMN IF NOT EXISTS,
--    so re-running it on a migrated database errors with "duplicate column name".
ALTER TABLE attempts ADD COLUMN picked TEXT;

-- 2. Reload the regenerated seed.sql (split with splitSqlStatements, whole
--    statements per request). This repoints every Precalc item from its <unit>.0
--    placeholder onto its real CED topic, so nothing references the placeholders
--    after this step.
--    ... seed.sql ...

-- 3. Delete the four placeholder topic rows the reload leaves behind. 1.0, 2.0
--    and 3.0 are tested_on_exam = 1, so leaving them caps Precalc coverage below
--    100% forever — which is the exact defect the build fix removed, undone by
--    stale rows. Do this AFTER step 2, never before: until the reload lands, the
--    Precalc items still point at these topics, and deleting them first would
--    orphan every one of them.
DELETE FROM topics WHERE subject = 'ap_precalc' AND id IN ('1.0', '2.0', '3.0', '4.0');
```

Then verify against the artifacts. **Numbers as deployed 13 Aug 2026** — read
them off `content/*.json` rather than trusting this list, which has drifted
before: `items` = 336, `topics` = 97, `teaching` = 97,
`SELECT count(*) FROM items i LEFT JOIN topics t ON t.id = i.topic AND
t.subject = i.subject WHERE t.id IS NULL` = 0, and for ap_precalc
`constructed` = 24, `constructed_model_graded` = 29, `mcq` = 38, `frq` = 4 (62
of the 95 keyed). All of that was confirmed live after the migration above.

**One honest consequence.** Any Precalc attempt logged before this migration was
recorded against a `<unit>.0` placeholder, and `attempts.topic` is stored as it
was at answer time. After step 3 that topic no longer exists, so the attempt
still sits in `attempts` — evidence is never rewritten — but it credits coverage
of nothing. Those answers were booked `graded_by: 'unkeyed'`, so they were
already excluded from every percentage; the only thing lost is the "topic
attempted" tick, and the question has to be answered again to earn it. Check
what is affected with:

```sql
SELECT a.item_id, a.topic, a.graded_by, count(*) FROM attempts a
  LEFT JOIN topics t ON t.id = a.topic AND t.subject = a.subject
 WHERE t.id IS NULL GROUP BY a.item_id, a.topic, a.graded_by;
```

Do **not** rewrite `attempts.topic` to match the item's new topic. That is
editing evidence to make a number look better, which is the thing this whole
system exists to prevent.

## Verified live

Every one of these was exercised against the deployed Worker and real D1, on
the code deployed at the time (before the mock coverage and timing gates
below existed — re-verify the mock-scoring line after this deploy, since it no
longer matches what current code would do):

- `/health` with no key → 200
- missing key → 401, wrong key → 401, unknown subject → 400
- `/next` → question with a server-issued serve id, **no answer key and no
  explanation in the payload**; six consecutive calls returned the same item,
  confirming selection is deterministic
- `/log` → `graded_by: server`, elapsed seconds measured from the serve row
- replaying a serve id → 409; fabricated serve id → 404
- blank answer → `blank: true`, distinct from a wrong answer
- Precalc → `graded_by: model`, `correct: null`, worked solution returned
- `/mock/start` → `/next?m=` ×3 → `/mock/submit` → composite 66.7%, resubmit
  409 — **stale as of this deploy**: `MIN_MOCK_COVERAGE` (worker/src/api.js)
  now requires ~90% of the section answered before any composite is computed,
  so 3 of a 42-question section comes back `counted:false` with a `basis`
  explaining the shortfall, not a percentage. `MOCK_TIME_SLACK` adds a second
  way a sitting can come back unscored even when it is fully answered: running
  the sitting's own clock past 1.5x the section's real time budget. Resubmit
  still 409 either way.
- readiness stayed **0** throughout, correctly blocked on coverage
- `/dash` with the student key → 403; with the parent key → 200 HTML

Smoke-test evidence was then deleted and the autoincrement counters reset, so the
first real question is serve 1.

## Gotcha that cost time

`Q=$(curl ...)` then `echo "$Q" | python3` **corrupts JSON** — zsh's `echo`
interprets backslash escapes, turning the `\n` inside a JSON string into a real
newline and producing "Invalid control character". This looked exactly like a
Worker bug. Pipe `curl` straight into the parser, or use `printf '%s'`.

## The Custom GPT

Built and live: **AP Tutor — Lucas**, `g-6a7c19f67c948191946881afd37043d0`,
visibility **Only me**. Instructions and Actions schema are loaded, and the full
loop was exercised in the published GPT, not just the builder preview.

### Three undocumented ChatGPT limits, all found the hard way

1. **Descriptions are capped at 300 characters.** Exceeding it fails the whole
   schema with `description has length 321 exceeding limit of 300`.
2. **Every `type: object` must declare `properties`.** A bare object is rejected.
3. **`$ref` is NOT resolved for parameters.** A `$ref` inside a `parameters`
   array yields `parameter has missing or non-string name; skipping`, then
   `skipping function due to errors` — silently disabling all six operations
   while the schema still looks valid. Parameters must be written inline even
   though the `$ref` is legal OpenAPI and resolves fine within the document.
   Response `$ref`s are followed correctly; only parameters are affected.

All three are enforced by `worker/tests/openapi.test.js`.

### The Instructions field is capped at 8000 characters

**This blocked a deploy on 13 Aug 2026 and is the fourth undocumented limit.**
ChatGPT rejects the whole draft above 8000 characters in the Instructions box.
The failure is nearly silent: autosave returns **422**, the **Update button stays
disabled**, and the only text on screen is a small "Error saving draft" plus
"GPT instructions cannot be longer than 8000 characters."

`gpt-instructions.md` had grown to a 13,277-character body — 66% over — so it
could not be installed at all, while the Worker and the schema deployed fine.
That is silent drift between conduct and contract, which is the exact thing the
doc-vs-schema tests exist to stop. `worker/tests/openapi.test.js` now gates the
length, so the build fails before a deploy can.

**The cap applies to the body that is pasted**, i.e. everything after the first
`---`; the preamble above it is for a human and is free. Substituting the real
32-character key for `PASTE_STUDENT_KEY` makes the installed text ~14 characters
longer than the file measures, so leave headroom rather than landing on 7999.

### Pasting it in, mechanically

The Instructions and Schema fields are React-controlled `<textarea>`s, and
setting `.value` through the native property setter **does not** make the editor
register a change — the content updates on screen and the Update button stays
disabled. Focus the field, select its own content with
`el.setSelectionRange(0, el.value.length)`, then send the text with CDP
`Input.insertText`, which fires an event React accepts. Do NOT use `Meta+a`
first: it does not scope to the field, and the insert then appends rather than
replaces, silently doubling the content.

Publish with the **Update** button in the editor's persistent header. Do not
click a "back" control first — the only back affordance is *Back to GPTs page*,
which navigates out and discards an unsaved draft.

### The consent prompt: what actually happens

The original assumption was that a GET with query parameters raises no prompt.
**That was wrong.** ChatGPT prompts once on the first call to a new domain,
showing the outgoing parameters and offering **Always allow**. After that one
click it never prompts again — verified across `getStatus`, `getNext` and
`logAnswer`, in both the builder preview and the published GPT.

So the requirement is met, but by "Always allow", not by the choice of method.
Whether a request body would re-prompt every time is untested; the no-body design
stays as the conservative choice rather than a proven necessity.

Note that the prompt **displays the outgoing query parameters, including the
access key**. Treat any screenshot or transcript of that prompt as exposing the
key. The first student key was rotated for exactly this reason.

**The student key was rotated again on 13 Aug 2026, for a second instance of the
same class.** The GPT stores the key in plaintext in its Instructions, so a
DOM snapshot of the editor — taken by an agent to find the Actions section —
printed the live key into a transcript. Rotating it is a script re-upload with
`{"type":"secret_text","name":"STUDENT_KEY","text":"<new>"}` plus
`{"type":"inherit","name":"PARENT_KEY"}`, then pasting the new key into the GPT
Instructions. Verified after: old key → 401, new key → 200, `/dash` still 200 on
the parent key and 403 on the student key.

**Do not snapshot the GPT editor page while the Instructions field is populated.**
Query the specific DOM nodes you need instead. This is the third distinct way
this one key has leaked, and all three were reading something that happened to
contain it rather than reading the key itself.

## Still not done
- **FRQ grading stays quarantined** until calibrated against an officially scored
  College Board response, so 100% readiness is unreachable by design. Measured
  13 Aug 2026: with a perfect record — 6 official mocks at 100, full coverage,
  no blanks — ap_precalc caps at **93%**, `ready: false`, `first_unmet: 'frq'`.
  `calibrated: false` is a literal at all three `computeReadiness` call sites,
  and flipping it changes nothing, because `grade.js` books every rubric item
  `{correct: 0, graded_by: 'model'}` and nothing ever writes a verdict back.
  Both locks understate rather than overstate, which is the correct direction.
- **Precalc topic ids are positional** — `<unit>.<index of the ### section>` in
  `parse-precalc-topics.js`. Inserting, removing or reordering a `###` heading in
  a study pack silently renumbers every topic after it and re-points every later
  item's tag at the wrong concept. Load-bearing fragility; the packs' own `2.N`
  headings already diverge from the ids in units 2 and 3.
- ap_precalc units 4.2 and 4.4 have no items. Class-only, off-exam, so they do
  not gate readiness.
- CSA's 20 free-response items all carry the FIRST topic their file declares,
  because the markdown declares topics per FRQ file rather than per item, so
  topic-level selection sees each question type as a single topic.

### Closed since the last deploy (13 Aug 2026)
- ap_precalc content was **the** blocker and no longer is. Exam-tested topic
  coverage 100% (33/33), every exam-tested topic has a KEYED item, and the bank
  holds 38 `mcq` + 4 `frq`. A section I sitting now assembles and scores —
  measured `counted: true`, `composite_pct: 90.5` on a 38-answer paper.
- The four `<unit>.0` placeholder topics are deleted from the live database.
- The three CSA letter-collision items are fixed in content: every
  letter-valued option now sits at the label whose letter it is, so the grader's
  two readings agree. 28 previously unreadable response forms now grade.
- `attempts.picked` exists in the live database.

