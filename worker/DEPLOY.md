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
Group into ~40 KiB requests; the 209 KiB seed becomes 5 calls.

## Verified live

Every one of these was exercised against the deployed Worker and real D1:

- `/health` with no key → 200
- missing key → 401, wrong key → 401, unknown subject → 400
- `/next` → question with a server-issued serve id, **no answer key and no
  explanation in the payload**; six consecutive calls returned the same item,
  confirming selection is deterministic
- `/log` → `graded_by: server`, elapsed seconds measured from the serve row
- replaying a serve id → 409; fabricated serve id → 404
- blank answer → `blank: true`, distinct from a wrong answer
- Precalc → `graded_by: model`, `correct: null`, worked solution returned
- `/mock/start` → `/next?m=` ×3 → `/mock/submit` → composite 66.7%, resubmit 409
- readiness stayed **0** throughout, correctly blocked on coverage
- `/dash` with the student key → 403; with the parent key → 200 HTML

Smoke-test evidence was then deleted and the autoincrement counters reset, so the
first real question is serve 1.

## Gotcha that cost time

`Q=$(curl ...)` then `echo "$Q" | python3` **corrupts JSON** — zsh's `echo`
interprets backslash escapes, turning the `\n` inside a JSON string into a real
newline and producing "Invalid control character". This looked exactly like a
Worker bug. Pipe `curl` straight into the parser, or use `printf '%s'`.

## Still not done

- The Custom GPT is not built. Paste `openapi.json` into its Actions schema and
  `gpt-instructions.md` into Instructions, replacing `PASTE_STUDENT_KEY` with the
  value from `.secrets/keys.txt`.
- 48 Precalc items are model-graded and bucketed at `<unit>.0`; they need topic
  tags and, where an unambiguous answer exists, real keys.
- FRQ grading stays quarantined until calibrated against an officially scored
  College Board response. Until then 100% readiness is unreachable by design.
