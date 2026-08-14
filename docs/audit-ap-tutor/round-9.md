# Round 9 — the consumer nobody audited

**Resumed campaign**, round 9 (8 prior rounds in this directory). Branch `perfect/audit-84629c6`.
Tests **699 → 809, all passing**. `Build OK` throughout. 19 commits. Tree clean.

**Stop reason: dispatcher context budget.** NOT convergence — round 9 was `rich`, and it ends
with a live open defect list. `--rounds 8` was requested; one round was executed.

## Agents: 22

Recon 1 · tool harvest 1 · audit 10 · fix 7 · confirm-fix 2 · regress 1 · critic 1. Two fixers
died on API timeouts and were re-dispatched (the expander fixer twice over the campaign).

## The headline: Confirm-fix and the critic both found what the round itself missed

Three defects were found *after* the fixers reported success. All three were of the founding
class, and all three were **invisible to a fully green suite**:

1. **`api.js:1301` — a deliberate blank stopped counting as a blank.** Introduced by this
   round's own `8505060`. `left` was narrowed to `onScored`, which excludes the free-response
   half — so an answer submitted as `a=` (a documented production input) vanished from the one
   criterion whose job is counting blanks. Measured on CSA, six sittings, all 42 MCQ correct and
   all 4 FRQ deliberately empty: **12 blanks / FAIL / readiness 89 → 0 blanks / MET / 94.**
   Overstatement to a parent, on strictly worse evidence. **No test in the repo failed when it
   was wrong** — the verifier proved that by reverting it and watching all 797 pass.
2. **50 correct answers refused by the expander fix.** `83d5cba` correctly stopped crediting
   order-swapped answers, but decided order-freedom per ITEM rather than per phrasing
   COMBINATION — so `"midline -2, amplitude 4, period 2pi/3"`, fully self-labelling and
   unambiguous, was marked wrong.
3. **`worker/src/grade.js` was in NEITHER the target list nor the exclusion list.** Never
   considered. It is the only module that decides right from wrong. The critic found a confirmed
   false negative there: `normalizeShort`/`canonAnswer` fold `$`, `\left`, `\right` and
   whitespace but **not Unicode lookalikes**. U+2212 vs ASCII hyphen refused **7 of 24** Precalc
   keyed items and **26 of 259** MCQ items — and seven shipped items *already carry* Unicode
   dashes in their own keys, so the reverse also bit: a student typing ASCII was refused on
   `csa-u2-q23` and `csa-u4-q2`. Fixed: **1,828 right short answers were being marked wrong and
   2,342 option texts stopped resolving; now 0 and 0**, with 0 wrong answers newly credited over
   77,558 verdicts.

**The lesson for aim:** round 9 audited the *producer* of answer keys from four lenses — the
expander, the Precalc keys, the CSA and SAT keys — and never audited the *consumer* that
compares them. Both fixer regressions and the critic's defect lived on that seam.

## Fixed and independently confirmed

- **`max_blanks` was unsatisfiable for Precalc by construction**, and the reason blamed the
  student: supply 38 vs `scorable` 42 meant `unreached = 4` forever, summing to ≥12 against
  `max_blanks: 1`. A perfect record read `ready: false` with *"At most 1 blank response across
  the window — 12 blanks"*. Now `askable` (what the bank can ask AND mark) separates from
  `scorable` (what the exam has): 0 blanks, criterion MET, readiness 86 → 93, and the shortfall
  is disclosed as a bank limitation in the basis, an advisory, and the parent card.
- **Its twin, worse:** `sec=full` HID the same gap as composite 100 / 0 blanks, because an
  unmarkable answer was counted twice in the student's favour — erasing a blank AND shrinking
  the divisor. On this bank that was the *only* path to satisfying `blanks`. Closed; the verifier
  bounded the relaxation (`askable ≥ ceil(scorable × 0.9)` by construction, so the divisor can
  shrink at most 10%, and the coverage gate got stricter, not looser).
- **The expander credited wrong answers**: order-swapped compound answers on 3 shipped items
  (including amplitude/midline swapped on `4sin(3x)-2`, *the* canonical error), and a bare-space
  separator that fused two answers into `5pi/6 - pi/4` — one number answering neither half.
- **The expander refused right answers**: the ordinary English list (`"4, -2, and 2pi/3"`) was
  never generated on any ≥3-part item, while 444 variants were spent on `", and "` at every gap,
  a form nobody types.
- **A comment one colon short of a key was silently dropped** — `<!-- part 3 2pi/3 -->` shipped an
  item keyed on 2 of its 3 parts with **zero build errors**, marking the complete correct answer
  wrong and crediting the incomplete one. Now a build error.
- **The SQL splitter that loads live D1 was not comment-aware** and already mis-split the shipped
  file into a seven-statement chunk; one apostrophe added to a `schema.sql` comment took the load
  from 336 items to **zero**. It also existed nowhere but a test helper and a prose paragraph.
  Now exported, comment-aware, and gated against D1's documented 100,000-byte statement limit
  (largest is 93.7% of it).
- **`select.js` printed a false clause to the student**: "weighted down" about a number that had
  gone *up* — 133 served reasons over a real-bank run. And the reserved spaced-review share
  delivered **~9% instead of ~33%**: four of five review intervals are shorter than
  `reuse_days`, so due reviews were silently dropped (146 of 240 reserved slots). Now 0 dropped,
  median wait 29 → 1 question.
- **`parse-frq.js` (583 lines, never code-audited in 8 rounds)**: three ways to silently drop
  frq-q3's shared `Book` class out of two student-facing stems — with a rubric point still
  reading "calls the provided `getPages()`", so the student lost a mark for not calling an
  accessor he was never shown.
- **The GPT instructions told the student a false fact about his own bank** (a letter-collision
  case that no longer exists in 259 items), never named `scored_out_of` — the field added
  *specifically* so the GPT would not contradict the server on the divisor — and its 8000-char
  gate was wrong by 15 in the unsafe direction. A guard meant to catch a false Precalc claim had
  been pinned to a literal the file abandoned, and passed vacuously through that claim's entire
  life.

## Verified clean (do not re-target)

All 22 Precalc unit-3/4 keys and all 19 unit-2 keys re-derived correct, no double-keys, no
dropped trig solutions. All 21 unit-1 keys correct. The 6 CSA keys outside the verified 218
correct, and the three new 1.12 items verified inside the CED's exclusion boundary against the
actual CED PDF. All 47 SAT letter keys plus every grid-in re-derived correct; the round-7
rebalance holds (χ² 0.614). `verify:keys` unchanged: 92 verified by execution, **0 miskeyed**.
D1's documented limits are not exceeded. Apportionment is clean (maxDev 1.3–1.7pp). Selector
determinism holds across all 10 scenarios after the review-share change.

**Methodological note worth carrying:** `sympy.solveset` silently dropped roots on both
trig-quadratic items checked (missing `x = π` where the factor never changes sign). Only a
fine-grid scan *plus* `sympy.solve` *plus* exact substitution recovered the full set. Never
re-derive a trig equation here with `solveset` alone.

## Process defect, third occurrence — now the campaign's most expensive gap

**Concurrent fixers share one working tree, and a broad `git add` swept two fixers' work into
siblings' commits.** `f2357f3` carries the entire `parse-frq.js` rewrite with no mention of it;
`e28f88e` carries the `gpt-instructions.md` + `openapi.test.js` work. Both fixers lost their
prepared commit messages — the full defect-by-defect reproduction records. One fixer's
`--amend` also landed on a sibling's commit and had to be surgically split back.
Rounds 1, 7 and 9 have all now lost work this way. **Next round: give every concurrent fixer
`isolation: "worktree"`, or serialise them.**

## Still open

- **`src=official` is self-certified by the student key.** `api.js:853` accepts `src=official`
  with no corroboration and `proctored: 1` hard-coded; `index.js:92` gates student-or-parent but
  does not restrict `sec`/`src` to the parent. `require_official_mock` — a readiness criterion —
  is satisfied by assertion from the party being measured. Masked today only by the
  `calibrated: false` hard-wire. **This is the live path to unearned readiness and should be
  round 10's second target.**
- `calibrated: false` hard-wired at all three `computeReadiness` sites; Precalc caps at 93% and
  `ready` is unreachable. Verified as the correct *safe* state (nothing writes a rubric verdict
  back), not a defect.
- Cross-surface rounding: one sitting reads 76.2 at submit, 76.1 at status, 76 on the parent chip.
  Needs `dashboard.js` + `openapi.test.js` together.
- CSA's 20 FRQ items all carry the first topic their file declares, and **Q4's five items are
  tagged 4.5 (1D arrays) when they are 2D and 4.13 exists**. Fix needs 3 files no fixer owned; a
  test now pins it *as a defect* so it fails the day the fix lands.
- `attempts.correct` is `INTEGER NOT NULL` with no partial-score column, so a 7-point FRQ answered
  6/7 is identical to 0/7.
- Precalc topic ids are positional — inserting a `###` heading silently re-points later tags.
- Two `ap_precalc.json` comments carry four false premises each (48 items vs 95; "33 topics have
  no items" vs zero).
- `parse-topics.js`'s `SENTINEL` is a raw NUL, so `file(1)` calls it `data` and BSD `grep` returns
  silence without `-a`.
- Precalc topics 4.2/4.4 have no items (class-only, off-exam).

## Coverage gaps

Still no CI, no linter, no type checker. TypeScript `checkJs --strict` produced 2,284 findings,
**0 genuine** — all inference noise from a deliberately untyped codebase. ESLint with a real
ruleset found 3 real issues in 163. `npm audit` remains inapplicable at zero dependencies.
`worker/src/index.js` is the least-covered file at 91.2%, and **its catch-all 500 handler has
never run under test**. `db.js` documents all six read-then-write races in prose; the gap is
guards, not discovery. `concurrency-and-resources` was assigned to no target this round.
1,423 lines of CSA FRQ rubric text still unread by any round — and that rubric is parsed, stored
in D1, and **read by no endpoint at all**, while `gpt-instructions.md` tells the GPT to score
against it.

## Round 10, in priority order

1. **`worker/src/grade.js` + `grade.test.js`** — the consumer, now audited once and immediately
   productive. Lens: `correctness`, `external-contract`. Pair with `parse-precalc.js`'s
   `isTypeable`.
2. **`src=official` self-certification**, before `calibrated` is ever unblocked.
3. `worker/src/index.js` — the auth boundary and the untested 500 path. `security` reached only
   the GPT contract this round.
