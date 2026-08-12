# Exam Skill Tracker — AP CSA Exam Performance

**The persistent memory.** The examiner reads this at the start of each session, logs results at the end, and updates all tables as performance data comes in.

- **Goal:** Score a **5** on the AP CSA exam (May 2027)
- **Status legend:** ⬜ not started · 🟡 learning · 🟠 shaky · 🟢 solid · ⭐ mastered
- **This tracker:** exam skill, FRQ, pacing, and killer-errors — NOT content topics
- **Content mastery:** see [`../mastery-tracker.md`](../mastery-tracker.md) (read both at each session)
- **Real baseline:** `diagnostic-exam.md` is the authoritative current-state measure — do NOT rely on prior "~100% coverage" claim (§14 of design spec)
- **Last session:** _(none yet — start with the diagnostic)_

---

## (a) MCQ accuracy by Computational Thinking Practice

Exam weight: **P3 dominates** (37–53% of MCQ section) — the single biggest lever.

| Practice | Exam weight | Status | Recent accuracy | Notes |
|---|---|---|---|---|
| **P1 Design Code** — choose algorithms, design solutions | 2–10% | ⬜ | — | e.g., "which design/algorithm fits this spec" |
| **P2 Develop Code** — write/complete code | 22–38% | ⬜ | — | All 4 FRQs assess P2 exclusively |
| **P3 Analyze Code** — hand-trace, predict output | **37–53%** | ⬜ | — | The biggest MCQ slice; target ≥85% at pace |
| **P4 Document Code** — describe behavior, preconditions | 10–15% | ⬜ | — | "What does this code do?" / state postcondition |
| **P5 Use Computers Responsibly** — ethics, bias, privacy | 2–10% | ⬜ | — | Topics 4.1 (data ethics) + 3.2 (IP/reliability) |

---

## (b) MCQ accuracy by unit

Exam unit weights below; Unit 4 is the largest slice — weight study accordingly.

| Unit | Exam weight | Status | Recent accuracy | Notes |
|---|---|---|---|---|
| **U1** — Using Objects & Methods | 15–25% | ⬜ | — | Strings, casting, Math, constructors, null |
| **U2** — Selection & Iteration | 25–35% | ⬜ | — | Loops, booleans, De Morgan, off-by-one |
| **U3** — Class Creation | 10–18% | ⬜ | — | Encapsulation, `this`, static, scope |
| **U4** — Data Collections | **30–40%** | ⬜ | — | Arrays, ArrayList, 2D, files, sorting, recursion (trace) |

---

## (c) Pacing

**Target:** ≈ **129 seconds (2:09) per MCQ** (90 min ÷ 42 questions, leaving ~1 min to review).
No guessing penalty — a blank is pure lost value. Mark-and-move; never leave a question blank.

| Metric | Target | Recent | Notes |
|---|---|---|---|
| Avg seconds / MCQ | ≤ 129 s | — | Log each timed set |
| Questions left blank in a 42-MCQ set | 0 | — | Any blank = immediate pacing drill |
| Section I finished within 90 min | Yes | — | Track ✓ / ✗ each mock |

---

## (d) FRQ type — best and recent scores

| FRQ type | Points | Status | Best score | Recent score | Notes |
|---|---|---|---|---|---|
| **Q1** Methods & Control Structures | /7 | ⬜ | — / 7 | — / 7 | Part A iterative/conditional; Part B String methods |
| **Q2** Class Design | /7 | ⬜ | — / 7 | — / 7 | Full class: fields, ctor, accessors, mutators |
| **Q3** Data Analysis w/ ArrayList | /5 | ⬜ | — / 5 | — / 5 | ArrayList traversal, algorithms, file input |
| **Q4** 2D Array | /6 | ⬜ | — / 6 | — / 6 | Row/col indexing, nested loops, algorithms |

_Target per type: ≥85% of points averaged across ≥3 attempts (= ≥6/7, ≥6/7, ≥4.25/5, ≥5.1/6)._

---

## (e) Killer-error watchlist

One row per recurring error pattern. Status advances from ⬜ → 🟢 / ⭐ as the error is eradicated across ≥3 consecutive correct reps. Demote on a miss.

| Error | Status | Miss count | Last seen | Notes |
|---|---|---|---|---|
| **`==` instead of `.equals()` on Strings** | ⬜ | 0 | — | `==` compares references; `.equals()` compares content; costs a point in any FRQ that tests String equality |
| **Off-by-one / array bounds** | ⬜ | 0 | — | Upper bound is `arr.length - 1`; loop condition `<` not `<=`; `StringIndexOutOfBoundsException` |
| **ArrayList remove while iterating** | ⬜ | 0 | — | Forward removal shifts indices → skips elements; use backward traversal or index-tracking |
| **Non-`private` instance fields** | ⬜ | 0 | — | FRQ rubric: instance variables must be `private`; costs the encapsulation point in Q2/class-design |
| **2D row/col order confusion** | ⬜ | 0 | — | `grid[row][col]`; rows = `grid.length`; cols = `grid[0].length`; row-major vs col-major traversal |
| **Missing null-guard** | ⬜ | 0 | — | Check `!= null` before calling methods on object references; NullPointerException is a run-time error |
| **`== null` vs null-safe method call** | ⬜ | 0 | — | Distinct from the above: `x == null` is correct syntax to test for null (not a style error); know when each is needed |
| **Writing recursive code** | ⬜ | 0 | — | Recursion is **trace-only** on the exam (CED exclusion); writing it in an FRQ wastes time and earns no points |
| **`charAt` instead of `substring`** | ⬜ | 0 | — | `charAt` is NOT on the Java Quick Reference; single char = `substring(i, i+1)` (returns a String, not a `char`) |

---

## (f) Readiness dashboard — Definition of 100% / Ready for a 5

> **Note:** "100% = ready for a 5" is NOT topic coverage. Covering topics produced a ~2–3. This section is the only readiness measure that counts. The per-practice / per-unit / per-FRQ tables below feed criteria 2 and 3 of the bar.

**A. Coverage prerequisite** — must be satisfied before any mock counts toward the readiness number. Every CED topic (1.1–4.17), all 5 Computational Thinking practices, all 4 FRQ-type variants, and all MCQ styles must have been drilled and measured. Drills, untimed work, and partial practice build skill but **never move the readiness number** — only full timed mocks do.

| Prerequisite | Status | Notes |
|---|---|---|
| All CED topics (1.1–4.17) drilled | ⬜ | See `topic-coverage-matrix.md` |
| All 5 CT practices drilled | ⬜ | P1–P5; see (a) table above |
| All 4 FRQ-type variants drilled (≥3 attempts each) | ⬜ | Q1–Q4; see (d) table above |
| All MCQ styles drilled | ⬜ | Unit MCQ + Analyze-Code pack |

**B. Grader-calibration gate** — must pass before any FRQ self-score counts toward the bar. The grader (examiner) must BLIND-grade an officially-scored sample response and land **within ±1 point** of the official award on each FRQ. **This gate is passable today — it does NOT wait on the 2026 Scoring Guidelines.** Acceptable calibration sources:

- a **CED sample-FRQ response** (MessageBuilder Q1, CupcakeMachine Q2, ItemInventory Q3, Schedule Q4 — official awards are in the CED); **or**
- the **2025 officially scored samples**, live on AP Central as of 12 August 2026: `ap25-apc-computer-science-a-q1.pdf` … `-q4.pdf` (real responses with official awards) graded against `ap25-sg-computer-science-a.pdf`, with `ap25-cr-report-computer-science-a.pdf` and `ap25-computer-science-a-scoring-statistics.pdf` as context. **2024 and 2023 packages are also posted, and the exact filenames are now listed** in `reference/question-sources-and-access.md` — including the trap that the 2024/2023 *question papers* are `ap24-frq-comp-sci-a.pdf` / `ap23-frq-comp-sci-a.pdf`, not the `computer-science-a` stem. With the filter applied that is **9 usable rubric-plus-award pairs** (3 years × Q1/Q3/Q4), so this gate has plenty of fresh material for every 8-week re-test. ⚠️ AP Central notes the 2023–25 materials **"do not completely align with the current AP CSA Exam"** after the 2025–26 revisions, so **apply the repo's Q1/Q3/Q4 filter and skip Q2**; run the ±1-point check against that year's own rubric and award; **or**
- once posted, a 2026 Scoring-Guidelines sample (an upgrade, not a prerequisite).

Re-test **every 8 weeks** and **immediately after College Board posts the 2026 Scoring Guidelines**. If off by >1 point, FRQ scores are presumed inflated: subtract the measured bias and do not count FRQ toward readiness until re-calibrated. (See "Gate-B persistent-failure exit" in the Resilience & fallbacks block below for what to do if the gate fails twice in a row.)

| Gate B check | Status | Last calibrated | Bias measured |
|---|---|---|---|
| Grader within ±1 pt of official sample | ⬜ | — | — |

**C. The bar** — evaluated on the **most recent 3 consecutive QUALIFYING full timed mocks** (90-min MCQ + 90-min FRQ). A mock is *qualifying* only if: it is fully **logged** (every started timed mock is logged — no cherry-picking; a mock that misses any criterion **breaks the 3-consecutive streak**, which restarts at the next mock); the 3 **span ≥10 days** (durability, not a hot streak); they fall **within ~6 weeks**; they are drawn from a **total of ≥6 logged mocks** (see Resilience & fallbacks below for the reduced-confidence floor); they reuse **no item seen in the prior 8 weeks**; and the window includes **≥1 mock from official material** (≥1 **proctored** official mock if obtainable; see Resilience & fallbacks for the official-anchor fallback when AP Classroom is unavailable). On those 3 mocks, ALL of the following must hold:

| # | Criterion | Floor | Status | Evidence |
|---|---|---|---|---|
| 1 | **Composite** (MCQ 55% + FRQ 45%): **mean of the 3 ≥ 82%, lowest of the 3 ≥ 78%, and no mock more than 5 points below the one before it** (non-declining). | mean ≥82%, floor ≥78%, non-declining | ⬜ | 0 / 3 qualifying mocks |
| 2a | **MCQ overall ≥ 80%** | ≥ 80% | ⬜ | No data yet |
| 2b | **Each unit (U1–U4) ≥ 75%** | ≥ 75% each | ⬜ | No data yet |
| 2c | **Analyze-Code (P3) ≥ 85% at pace** — each P3 item answered in ≤129 s; a P3 item taking >180 s counts as wrong for the at-pace check | ≥ 85% | ⬜ | No data yet |
| 2d | **Each other practice (P1 Design, P2 Develop, P4 Document, P5 Responsible) ≥ 70%** | ≥ 70% each | ⬜ | No data yet |
| 3 | **Each FRQ type (Q1–Q4) ≥ 85% of its points**, strict-graded by a **calibrated** grader (gate B passed; uncertain → point NOT awarded). (Q1 ≥6/7, Q2 ≥6/7, Q3 ≥4.25/5, Q4 ≥5.1/6) | ≥ 85% each | ⬜ | No data yet |
| 4 | **Both sections completed in time, ≤ 1 blank** | ≤ 1 blank | ⬜ | No data yet |
| 5 | **Difficulty check:** if (mean composite on original-bank mocks − composite on the official-material mock) **> 7 points**, the bank is presumed easier → the bar becomes **the official mock's composite ≥ 80%** (not the average) and **2 of the 3** mocks must be official until a later window shows gap ≤ 7. | gap ≤ 7 (or elevated bar applies) | ⬜ | No data yet |

**D. Freshness** — a 100% reading **expires after 6 weeks**. If the exam is farther out, it reads **"provisional-ready,"** re-confirmed by **1 fresh qualifying mock every 4 weeks**; **≥1 qualifying mock must fall within the final 2 weeks** before the exam.

| Freshness check | Status | Last qualifying mock | Next required |
|---|---|---|---|
| Reading current (≤6 weeks) | ⬜ | — | — |
| Final-2-week mock (if exam ≤2 weeks out) | ⬜ | — | — |

**E. Burnout guard** — if composite **drops ≥8 points across 2 consecutive mocks while topic mastery is unchanged**, treat it as **fatigue, not skill regression** → prescribe a **3–5 day rest / light review**, do NOT add drilling. (Burnout = a *drop*. A *flat* score below the bar is a plateau — handled separately in the Resilience & fallbacks block below.)

| Burnout check | Status | Notes |
|---|---|---|
| No ≥8-point drop across 2 consecutive mocks (or prescribed rest taken) | ⬜ | — |

**F. Recalibration (within 1 week of CB posting the 2026 score distribution / raw→5 conversion):** read the official composite needed for a 5 (`C5`); set the **bar = C5 + 8 points, floored at 78%** (never lower it below 78% without a second confirming source); **re-score all logged past mocks** against the official conversion (windows that no longer pass drop readiness below 100%); replace the estimated composite→score table and the CED-derived rubric with the official ones, then re-run gate B. (If the 2026 data has NOT posted by ~6 weeks before the exam — ≈ late March 2027 — see the "No-posting freeze" in the Resilience & fallbacks block below.)

| Recalibration check | Status | Notes |
|---|---|---|
| Official 2026 score distribution published | ⬜ | Two places to look, and the **per-subject PDF is the one this repo previously never named**: `apcentral.collegeboard.org/media/pdf/ap26-computer-science-a-score-distributions.pdf` (404 as of 12 August 2026), plus `apstudents.collegeboard.org/about-ap-scores/score-distributions`. The 2025 baseline is live now — `ap25-computer-science-a-score-distributions.pdf`, titled "2025 Student Score Distributions – AP® Computer Science A" (verified 12 August 2026); the Precalc twin is `ap25-precalculus-score-distributions.pdf`. These are posted **per subject, per year**, and they carry the official 1–5 spread that `C5` is read from. Pull the 2025 pair now so the comparison is ready the day 2026 posts. ⚠️ 2025 is a **pre-redesign** distribution for CSA — treat it as context for the shape of the curve, not as his cutoff; **the 2026 CSA distribution is the first one measured on the redesigned exam** and is the one criterion F actually needs. |
| Bar updated to C5 + 8 pts (floor 78%) | ⬜ | — |
| All logged mocks re-scored against official conversion | ⬜ | — |
| Gate B re-run against 2026 Scoring Guidelines | ⬜ | Watch `apcentral.collegeboard.org/media/pdf/ap26-sg-computer-science-a.pdf` — re-confirmed 404 on 12 August 2026, along with `ap26-cr-report-*`, `ap26-apc-*-q1` and `ap26-*-scoring-statistics` for **both** subjects. AP Central lists 2026 as free-response questions only. |

---

### Resilience & fallbacks

These rules ensure a genuinely-ready student is never blocked by an unsatisfiable requirement. Reduced-confidence readings are labeled honestly — never upgraded to "high-confidence 5."

**1. Minimum-viable readiness (relaxes criterion C's ≥6 mocks)**

≥6 logged mocks is the high-confidence target. If 6 is genuinely infeasible on time, a **reduced-confidence "likely-5 (reduced sample)"** reading may be declared under these conditions — ALL other A–F criteria unchanged:

- **Floor:** ≥4 logged mocks with **3 consecutive qualifying**.
- **Span and freshness:** the 3 consecutive mocks still span ≥10 days; the window still falls within ~6 weeks; ≥1 mock falls within the final 2 weeks before the exam.
- **Gate B still required;** ≥1 official-material mock still required.
- **Splitting one mock** across two sittings (Section I one day, Section II the next) is a **last resort** — flag it explicitly in the results log; it does not count as a full mock toward the consecutive streak without that flag.
- **Label:** this reading is **"likely-5, reduced sample"** — never "high-confidence 5." Document the reason in the log.

**2. Official-anchor fallback (when AP Classroom is unobtainable)**

**First choice, if the teacher's join code exists:** AP Classroom's full **Practice Exam** (alongside its Bluebook-Style Assessments) is an official full-length mock and satisfies criterion C directly — verified 12 August 2026. Use the fallback below only when AP Classroom genuinely cannot be obtained.

> ⚠️ **The ungated Bluebook practice route does NOT satisfy this criterion.** `bluebook.collegeboard.org/students/practice` is student-accessible with only his own College Board account (verified 12 August 2026 — see `reference/question-sources-and-access.md`), and it is the right way to rehearse the exam application early. But what it offers is a **test preview** — a short, unscored, untimed tool tour — **not a full-length mock.** It is a realism prerequisite, never an official anchor. Do not log it as a mock.

Satisfies criterion C's ≥1 official-material mock requirement and criterion 5's difficulty-gap check:

- **Official-material mock:** the **2026 released FRQs run as a timed Section II** (Account Q1, Bottle Q2, Attendance Q3, GameBoard Q4) PLUS the **CED 20-MCQ sample set run timed and prorated to the 42-question/90-min scale** together constitute one official anchor. Log as "official anchor = 2026 FRQ + CED MCQ set."
- **Difficulty-gap (criterion 5) with no full-length official MCQ:** compute the gap on the **FRQ percentage only** — (mean bank FRQ %) − (official FRQ %). If that FRQ-only gap > 7, the elevated-bar rule applies to the FRQ side (official FRQ% must be ≥80%; ≥2 of 3 qualifying mocks must be official-anchor mocks until the gap closes). The MCQ gap is left blank/unmeasured; note this in the results log.
- **Reconciliation with Option C ("doesn't count"):** the CED 20-MCQ set does **not** count as a qualifying full-length mock on its own. Under this fallback only — when it is the **only official MCQ available** — it serves as the MCQ anchor for the official-material requirement and the difficulty-gap calculation. If AP Classroom becomes available, switch to it immediately.

**3. Gate-B persistent-failure exit (in criterion B)**

If the grader-calibration gate fails **twice consecutively**, do not block FRQ readiness permanently:

- **Adopt bias correction:** subtract the measured bias from every FRQ self-score. The bias-corrected score is the score that counts going forward.
- **Accelerated re-test schedule:** re-test the gate every **4 weeks** (not 8) until it passes.
- **Unstable bias:** if the measured bias differs substantially across FRQ types (e.g., over-awards Q2 but is accurate on Q1/Q3/Q4), seek **one externally-graded FRQ** (AP teacher or a vetted online provider) as a tiebreak. Apply per-type corrections as appropriate.
- **Calibration standard:** the **CED sample rubrics and the 2025 scoring guidelines + officially scored samples** (`ap25-sg-*` with `ap25-apc-*`, Q1/Q3/Q4 only — Q2 is pre-redesign) are the calibration standards until the 2026 Scoring Guidelines post. Do NOT calibrate against the 2026 released FRQs (Account, Bottle, Attendance, GameBoard) while they lack official scoring guidelines — those problems are valid practice material, but their point awards are unverified.
- Once the gate passes (bias within ±1 pt), resume normal 8-week re-test cadence.

**4. Plateau guard (distinct from burnout guard E)**

Burnout = a *drop* ≥8 pts. Plateau = *flat* below the bar. If the composite mean stays **flat (±3 pts) and below the readiness bar across ≥3 mocks over ≥4 weeks** with topic mastery unchanged, stop repeating the same drill mix. Escalate in order:

1. Run a focused re-diagnostic on the **lowest unmet criterion** (use `diagnostic-exam.md` or a targeted unit drill).
2. Route the weakest unit/practice/FRQ type to the **content tutor** (`../tutor-prompt.md`) as a content gap — the examiner cannot fix what it hasn't diagnosed as a knowledge hole.
3. Acquire fresh official-style material (AP Classroom / Albert.io) to rule out **bank-overfit** (scoring well on the bank but stalling on fresh material).
4. If the plateau is pacing-driven (finishing but just under the composite bar), switch to **pace-only drills** for 1–2 weeks before the next full mock.

Log the tactic change in the session log with a note: "plateau guard triggered — escalation step N."

**5. No-posting freeze (in criterion F)**

Recalibration against the 2026 official data is an **upgrade, not a precondition**. If the 2026 Scoring Guidelines and/or score curve have NOT posted by **~6 weeks before the exam (≈ late March 2027)**:

- **Freeze the conservative bar as final:** mean ≥82% / floor ≥78% composite; CED-derived rubric for gate B.
- **Never lower a threshold** for lack of official data. The conservative bar was set with margin for exactly this uncertainty.
- Continue watching the URLs in criterion F. If the data posts before the exam, run the recalibration then.
- Do not hold readiness hostage to a posting that may not come on time.

---

**100% — "Exam-ready: high-confidence 5"** = A–F all satisfied. Below that, the tracker reads a number <100 and **names the specific unmet criterion.** Do not declare ready on any subset.

**Honest caveat:** meeting all criteria A–F is the strongest real predictor of a 5, not a mathematical guarantee. The margins (mean ≥82% vs the ~65–72% historical 5-line; ±1-pt grader calibration; ≥6 mocks) are the insurance against test-day variance and curve uncertainty.

### Per-unit MCQ floor tracking

*(feeds criterion 2b above)*

| Unit | Floor | Recent accuracy | Status |
|---|---|---|---|
| U1 Using Objects & Methods | ≥ 75% | — | ⬜ |
| U2 Selection & Iteration | ≥ 75% | — | ⬜ |
| U3 Class Creation | ≥ 75% | — | ⬜ |
| U4 Data Collections | ≥ 75% | — | ⬜ |

### Per-practice MCQ floor tracking

*(feeds criteria 2c and 2d above)*

| Practice | Floor | Recent accuracy | Status |
|---|---|---|---|
| P1 Design Code | ≥ 70% | — | ⬜ |
| P2 Develop Code | ≥ 70% | — | ⬜ |
| P3 Analyze Code | ≥ 85% | — | ⬜ |
| P4 Document Code | ≥ 70% | — | ⬜ |
| P5 Use Computers Responsibly | ≥ 70% | — | ⬜ |

---

## (g) Session log (newest on top)

> Format: `date · worked on ___ · MCQ accuracy ___ · FRQ scores ___ · killer-errors triggered ___ · next ___`

- _(empty — first entry after the diagnostic)_

---

## Notes

- The examiner reads **both** this file (exam skill performance) **and** [`../mastery-tracker.md`](../mastery-tracker.md) (content mastery) at the start of each session.
- This tracker — not the prior "100% coverage" claim — plus the diagnostic are the real baseline. The old claim is unverified; start from the diagnostic output.
- All pacing targets assume the digital Bluebook format (90 min Section I, 90 min Section II; Java Quick Reference provided throughout; no calculator).
- **Exam day, for final-week planning (verified 12 August 2026):** College Board labels sittings **Session 1 / Session 2**, "replacing the former morning and afternoon designations," "to prevent the disclosure of secure exam content across time zones." Lower-48 start times are unchanged — **Session 1 = 8 a.m. local, Session 2 = 12 p.m. local.** AP Precalculus is **Session 1, Tue 11 May 2027**; **AP CSA is Session 2, Wed 12 May 2027** — about **30 hours apart, not ~24.** Schedule criterion D's final-2-week mock so the last full CSA mock does not land the day before the Precalc sitting. A per-school start-time lookup tool is "coming this fall"; until then confirm the local start time with the AP Coordinator.
- Readiness bar: the full A–F definition lives in §(f) above — it is the single source of truth. Do not restate thresholds elsewhere.
