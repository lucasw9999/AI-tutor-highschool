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
npm test && { npm run build -- --write-despite-incomplete; npm run seed:sql && npm run worker:check; }
```

**`npm run build` with no flag exits 1 and writes nothing today, by design.**
Content validation gates the build on completeness, and ap_precalc is not
complete: 33 of its 36 exam-tested topics have no items at all, none of its 48
items can be graded mechanically, four topics have items but no teaching row,
one teaching row (1.11) is entirely blank, and three CSA items (csa-ac-q14,
csa-ac-q33, csa-u2-q7) have an option whose text collides with another
option's label. Run `npm run build` alone to see the current, authoritative
list under "INCOMPLETE CONTENT" — it is generated from the content itself, so
it will not go stale the way a hand-written list here would.

`--write-despite-incomplete` writes `content/items.json`, `topics.json` and
`teaching.json` from the markdown anyway, so a real fix elsewhere in the
content is not stranded behind an unrelated gap (see the flag's own comment in
`tools/build/build.js`). **It still exits 1 and prints "Build FAILED"** — the
flag changes what gets written, not the exit code — so the command above
deliberately runs it inside `{ ; }` rather than chaining it with `&&`. A bare
`&&` here stops before `seed:sql` and `worker:check` ever run, which is exactly
what the literal old command did: silently skip both with no error at all.

Shipping on these artifacts means ap_precalc readiness stays effectively
unreachable (see "Still not done" below), which is the same thing
gpt-instructions.md already discloses to the student for the Precalc mock
specifically. Re-run `npm run build` with no flag after any content fix — once
these gaps are closed it exits 0, and the flag above can come out again.

Then, from an ego-browser session logged into Cloudflare, upload
`/tmp/ap-tutor-build/index.js` with `PUT /api/v4/accounts/{acc}/workers/scripts/ap-tutor`
as multipart: a `metadata` part (`main_module`, `compatibility_date`, and the D1
+ `secret_text` bindings) and the module itself as
`application/javascript+module`.

**Bindings must be re-sent on every upload.** The API replaces the binding set
wholesale, so omitting `STUDENT_KEY` silently unsets it and every request starts
returning 401.

## Reloading content

`seed.sql` is idempotent — every insert is an upsert and nothing in it touches
`attempts`, `serves`, `mocks` or `gaps`. Reloading is safe against a live
database with real evidence in it, and a test asserts that property.

**Split statements with a quote-aware splitter.** Naively cutting on lines that
end in `;` corrupts the payload: the CSA stems contain Java, so
`String csv = "red,green,blue,yellow";` ends a line with a semicolon *inside* a
SQL string literal. Track single-quote state and treat `''` as an escaped quote.
Group into ~40 KiB requests to keep the call count low — recompute how many
that is for whatever `seed.sql` weighs today (currently ~359 KiB; it changes
every time content is regenerated, so do not assume a fixed call count).
Measured, not guessed: a naive line-ending-in-`;` split of the current file
loads **9 of 289 items** and fails 618 of its 639 chunks.
`tools/build/tests/to-sql.test.js` loads the real file one statement at a time
through the quote-aware splitter and counts every row back out of the database.

### What a reload CANNOT do, and the migration the live database needs

Two things `seed.sql` will never do to a database that already exists, because
every `CREATE TABLE` in it is `IF NOT EXISTS` and every write is an upsert:

1. **Add a column.** An existing table does not gain one.
2. **Retire a row.** A `topics`, `items` or `teaching` row that the content no
   longer declares is not deleted, because the file only ever inserts. So a
   retired topic survives in D1 forever unless it is deleted by hand — and a
   retired *exam-tested* topic keeps counting toward `topics_total` in
   `coverageOf` (api.js), which pins readiness at 0 through the coverage
   criterion and inflates the dashboard's "N/M topics attempted" chip.

Both apply right now. Run these against the deployed D1, **in this order**:

```sql
-- 1. attempts.picked, added to schema.sql after the table shipped. Check first:
--    SELECT picked FROM attempts LIMIT 0;   -- the same probe db.js uses
--    Skip this statement if it succeeds; SQLite has no ADD COLUMN IF NOT EXISTS,
--    so re-running it on a migrated database errors with "duplicate column name".
ALTER TABLE attempts ADD COLUMN picked TEXT;

-- 2. Reload the regenerated seed.sql (quote-aware split, ~40 KiB batches). This
--    repoints every Precalc item from its <unit>.0 placeholder onto its real CED
--    topic, so nothing references the placeholders after this step.
--    ... seed.sql ...

-- 3. Delete the four placeholder topic rows the reload leaves behind. 1.0, 2.0
--    and 3.0 are tested_on_exam = 1, so leaving them caps Precalc coverage below
--    100% forever — which is the exact defect the build fix removed, undone by
--    stale rows. Do this AFTER step 2, never before: until the reload lands, the
--    Precalc items still point at these topics, and deleting them first would
--    orphan every one of them.
DELETE FROM topics WHERE subject = 'ap_precalc' AND id IN ('1.0', '2.0', '3.0', '4.0');
```

Then verify against the artifacts: `items` = 289, `topics` = 97, `teaching` =
97, `SELECT count(*) FROM items i LEFT JOIN topics t ON t.id = i.topic AND
t.subject = i.subject WHERE t.id IS NULL` = 0, and
`SELECT count(*) FROM items WHERE subject='ap_precalc' AND kind='constructed'`
= 19. The whole sequence has been rehearsed against a copy of the deployed seed
in `node:sqlite`: it lands exactly on the artifacts and disturbs no row of
`attempts` or `serves`.

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

## Still not done
- ap_precalc content is the real blocker on readiness: 33 of its 36
  exam-tested topics have no items at all, and none of its 48 items
  (`constructed_model_graded` throughout, all bucketed at `<unit>.0` rather
  than tagged to a real topic) can be graded mechanically, so no Precalc mock
  can ever produce a composite until items are tagged and, where an
  unambiguous answer exists, keyed. Four topics (1.0, 2.0, 3.0, 4.0) have
  items but no teaching row, and one teaching row (1.11) is entirely blank.
  `npm run build` regenerates this exact list under "INCOMPLETE CONTENT" from
  the content itself — read it there rather than trusting this paragraph,
  which will drift the way it already did once.
- Three CSA items (csa-ac-q14, csa-ac-q33, csa-u2-q7) have an option whose
  text is itself another option's label. grade.js and gpt-instructions.md
  handle the ambiguity at answer time (ask for "choice B", not a bare letter);
  the content fix is to reword those options so the collision stops existing.
- FRQ grading stays quarantined until calibrated against an officially scored
  College Board response. Until then 100% readiness is unreachable by design.
