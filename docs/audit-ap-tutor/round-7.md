# Round 7 — coverage and external currency

**Instruction that opened this round** (given twice, verbatim):

> "For all this auditing, you should not just focus on how accurate we are at the moment,
> but also do a larger-scale search to make sure we include all the information we need.
> If there's any new information we found or any new exam data or new knowledge we need
> added, that's definitely to be added as well: correctness, but also how much coverage we
> do and what external information should I add."

Rounds 1–6 asked *is what exists correct?* This round asked *is what exists enough, and is
it current?* Different question, different findings: **the largest ones were absences, not
defects.** Six rounds of correctness auditing could not have found them, because there was
nothing incorrect to find — the information simply was not there.

8 auditors, then 6 fixers on disjoint file sets. 19 commits. Tests 571 → 612, all passing.

## What the lens change bought

| Class | Found | Why correctness auditing missed it |
|---|---|---|
| Time-sensitive absence | No SAT test date or deadline anywhere in `sat/` | Nothing false was written; nothing was written at all |
| Stale external fact | Precalc CED refreshed 15 Jul 2026; README cited Oct 2025 | Correct when written |
| Dead external link | Practice-It listed live in `ap_csa/README.md` — dead since end-2025, and the repo's *own* reference doc already said so | Internal contradiction, but both files self-consistent |
| Newly published material | 2026 Precalc FRQ exists — the newest official anchor | Cannot audit for the absence of a thing you don't know published |
| Harmful content pattern | SAT keys were B=58%, D=0% | Every individual answer was correct |
| Method (not correctness) | Topic accuracy lifetime-cumulative → selector routes study *away* from decayed material | Every computed number was right; the wrong thing was being computed |

## The finding that outranks all of them

**GAP-1.** 86 commits unpushed at round start, and `origin/main` holds **zero files under
`worker/`**. Nine months of work — the Worker, the bank, the FRQ ingestion, six audit rounds
— exists on one laptop. Not a code defect; the largest risk in the project.
Reported to the user, not acted on: pushing is outward-facing and theirs to call.

## Fixed this round

**Content currency (`sat/`, first audit ever — 5 commits)**
- SAT-1 All 8 test dates + deadlines added, verified 12 Aug 2026. Target named: **Sat 6 Mar
  2027, register by Fri 19 Feb**. Two collisions surfaced that the repo had never stated.
- SAT-2 RW scored count 48 → **50** (spec: 25 operational × 2 modules), and every number
  keyed to it recomputed. Cross-check: the domain percentages land on exact integers
  against 50 (14+13+13+10), independent confirmation.
- SAT-3/4 Missing question ranges and domain percentages added; "~60% of Math" → **70%**.
- SAT-6 **Key rebalance.** A7/B34/C14/**D0** → A16/B12/C14/D15. Chi-square vs uniform
  46.89 → 0.61. Genuine rewrites: correct content moved *and* a new distractor authored
  into the vacated slot; every math item re-verified with python3.
- SAT-5/7 Imbalance recorded rather than papered over; 8 real table-based items added.
  Graphs/figures **not** faked with ASCII art — the gap is written down.
- SAT-9/10 Tailored Practice added; two unverifiable claims softened rather than repeated.

**External knowledge (2 commits)** — 2026 Precalc FRQ; corrected 2024 filenames (the
repo's own "same shape as 2025" claim was false, and following it hit a 404 — fixing it
doubles available Precalc calibration pairs); **Bluebook is student-accessible, not
teacher-gated**; CSA CED clarifications; score-distribution PDFs; exact back-catalogue
URLs including the `frq-comp-sci-a` stem trap; one consolidated parent download list.

**Scheduling (2 commits)** — Precalc's "few-week express plan" replaced with a nine-month
calendar, sibling to CSA's. Latest-safe window start **Mon 26 Apr 2027**; content hard
fail-by **15 Mar 2027**. Three findings beyond brief: `require_official_mock` means no join
code → readiness pinned at 0 regardless of score; recovery needs its own unspent official
paper, so a bad mock on/after **30 Apr 2027** is unrecoverable; `calibrated: false` is
hard-wired, so Precalc cannot print above 99%.

**Score value (1 commit)** — cancel (June 15, irreversible, free) and withhold (~July 6,
$10/score/recipient, reversible) deadlines; **UC awards zero credit for AP Precalculus
2024+**. Deliberately no credit table — it would drift and mislead; a pointer to College
Board's own Credit Policy Search instead.

**English (1 commit)** — two real teacher-authored files (10 essay prompts, an annotated
A-range sample) were referenced by *nothing* and absent from the upload list; now wired in,
with the 6 unbuilt real prompts developed. Three graded assessments got scaffolding.

**Method defects in the engine (6 commits, +41 tests)**
- METH-10 `picked` was computed on every answer and thrown away. The distractor *is* the
  misconception. Now persisted. Cheapest high-value fix in the project.
- METH-3 Selection now judges a topic on **recency-weighted** accuracy (`2^(-age/30)`,
  divisor floored at one fresh answer's weight). Scope held: `readiness.js` still sees
  unweighted lifetime accuracy, pinned by a test.
- METH-5 Spaced review was unreachable until *every* topic cleared 75%. Now 1 question in 3
  is reserved for a due review, deterministic (attempt count, no clock/RNG).
- METH-11 Pace measured against `pace_seconds_per_mcq`, a config key nothing read.
- GAP-5 Last-answer date, days-since, and gap ages now on the parent page — six weeks of
  silence used to render identically to a hard week.
- GAP-3 A walked-away sitting was the one gaming path the gates didn't close. Now surfaced,
  and a second concurrent paper refused.

**Resource hygiene (1 commit, dispatcher)** — Practice-It removed and replaced with
Bluebook; SAT book row given the edition discipline the file already applied to College
Panda (a pre-2024 Princeton Review drills the paper test).

## Corrections to my own audit data, made by fixers

Two of my briefing facts were wrong, and the fixer refused to propagate them:
- 1 May 2027 is **not** "inside the AP fortnight" — it is 10 days before Precalc. Real cost
  is the last free revision weekend, which is what got written.
- 21 May 2027 is **not** "mid-AP-season" — it is 9 days after CSA. So June 5 is a better
  fallback than I implied.

A fixer also deleted two filenames it had *inferred* from the 2025 pattern, on the grounds
that NEW-7's whole point is that the pattern doesn't hold across years — inferring was
self-refuting. Correct call.

## Process defect found in my own dispatch

Two agents reported a third clobbering their uncommitted work (one `git stash pop`
half-applied, one `git checkout`-shaped event). Nothing was lost — verified byte-identical
— but that was luck. **Six rounds in, shared-tree fixers still have no isolation.** Round 1
had the same failure. Either give concurrent fixers worktrees or forbid stash/checkout on
shared paths outright.

## Verified-correct, left alone

Auditors printed control-fetch evidence for these and I changed nothing: 54 RW / 44 Math /
98 questions, all timings and scales, adaptive structure, grid-in ratio, Desmos guidance;
CodingBat, CodeHS Cortado-vs-Nitro, Meltzer, UWorld, College Panda 3rd ed.; the Precalc
Chief Reader figures (1.28/6 in 2024, 1.93/6 in 2025 — exact to the digit); the 1/3/7/16/35
review intervals (checked against the literature: expanding-vs-equal shows mixed-to-no
benefit, and a 35-day ceiling against nine months is if anything *short*); the readiness
floors; the gap threshold of 2.

## Still open

- **GAP-1** — 104 commits unpushed. User's call.
- **GAP-2** — no evidence export.
- Precalc keying: ~32 of 36 on-exam items are keyable. Data entry, not authoring — and it
  is the gate that keeps Precalc readiness unmeasurable at any level of effort.
- FRQ calibration: unblocked, unimplemented; `calibrated: false` hard-coded at three sites.
- Deployment: live Worker and D1 still run pre-campaign code. `attempts.picked` needs
  `ALTER TABLE attempts ADD COLUMN picked TEXT` run against live D1 (`seed.sql`'s
  `CREATE TABLE IF NOT EXISTS` will *not* add it). `openapi.json` + `gpt-instructions.md`
  need re-pasting into the GPT.
- `openapi.json` blocks new status fields: pace and staleness had to land on `advisories`
  because an undeclared response field fails `openapi.test.js`.

**Campaign law, held for the seventh round:** auditing a round's own fix code finds new
defects. Round 7 found six method defects inside code that six prior rounds had passed.
