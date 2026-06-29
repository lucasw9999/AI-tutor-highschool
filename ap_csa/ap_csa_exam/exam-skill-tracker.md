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

## (f) Readiness dashboard

> **Note:** The old course's "100% = covered topics" is explicitly NOT this metric. Covering topics produced a ~2–3. This dashboard is the only readiness measure that counts.

### Coverage prerequisite (check this first)

Before any mock counts toward the readiness bar, confirm every CED topic (1.1–4.17), all 5 Computational Thinking practices, all four FRQ-type variants, and all real MCQ styles have been drilled and measured. Drills, untimed work, and partial practice build skill but **never move the readiness number** — only full, timed mocks do.

| Prerequisite | Status | Notes |
|---|---|---|
| All CED topics (1.1–4.17) drilled | ⬜ | See `topic-coverage-matrix.md` |
| All 5 CT practices drilled | ⬜ | P1–P5; see (a) table above |
| All 4 FRQ-type variants drilled (≥3 attempts each) | ⬜ | Q1–Q4; see (d) table above |
| All MCQ styles drilled | ⬜ | Unit MCQ + Analyze-Code pack |

### Definition of 100% / Ready for a 5

**ALL of the following must be simultaneously true on the MOST RECENT 3 CONSECUTIVE full, timed mocks (90 min MCQ + 90 min FRQ each), all taken within the last ~6 weeks:**

| # | Criterion | Floor | Status | Evidence |
|---|---|---|---|---|
| 1 | **Composite ≥ 80%** of the weighted total (MCQ 55% + FRQ 45%). *(Conservative: historical CSA 5-cutoff has been ~65–72% composite; the extra cushion absorbs test-day variance and redesigned-curve uncertainty. This is an estimate, not a published number.)* | ≥ 80% | ⬜ | 0 / 3 qualifying mocks |
| 2a | **MCQ overall ≥ 80%** | ≥ 80% | ⬜ | No data yet |
| 2b | **Each unit (U1–U4) ≥ 75%** | ≥ 75% each | ⬜ | No data yet |
| 2c | **Analyze-Code (P3, 37–53% of MCQ) ≥ 85% at pace** (~2:09/question) | ≥ 85% | ⬜ | No data yet |
| 2d | **Each other practice (P1 Design, P2 Develop, P4 Document, P5 Responsible) ≥ 70%** | ≥ 70% each | ⬜ | No data yet |
| 3 | **Each FRQ type (Q1–Q4) ≥ 85% of its points**, graded STRICTLY to the official rubric — uncertain points are NOT awarded (Q1 ≥6/7, Q2 ≥6/7, Q3 ≥4.25/5, Q4 ≥5.1/6) | ≥ 85% each | ⬜ | No data yet |
| 4 | **Both sections completed within time, with 0–1 blanks** | ≤ 1 blank | ⬜ | No data yet |
| 5 | **At least 1 of the 3 qualifying mocks is built from OFFICIAL material** (CED samples / 2026 released FRQ / AP Classroom), not only the original bank | ≥ 1 official | ⬜ | No data yet |

**100% = ALL five criteria simultaneously green on the most recent 3 consecutive full timed mocks.** When any criterion is unmet, the tracker reads < 100% and names the specific unmet criterion. Do not declare "ready" on any subset.

**Honest caveat:** meeting all five criteria is the strongest real predictor of a 5, not a mathematical guarantee. The margin above the historical 5-cutoff is the insurance.

### Per-unit MCQ floor tracking

| Unit | Floor | Recent accuracy | Status |
|---|---|---|---|
| U1 Using Objects & Methods | ≥ 75% | — | ⬜ |
| U2 Selection & Iteration | ≥ 75% | — | ⬜ |
| U3 Class Creation | ≥ 75% | — | ⬜ |
| U4 Data Collections | ≥ 75% | — | ⬜ |

### Per-practice MCQ floor tracking

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
- Readiness bar: ≥80% composite on the most recent 3 consecutive full timed mocks (conservative — historical CSA 5-cutoff ~65–72% composite; the cushion absorbs redesigned-curve uncertainty). Re-baseline if College Board publishes an official cutoff for the redesigned exam.
