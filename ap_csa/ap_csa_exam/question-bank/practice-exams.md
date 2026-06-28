# Full Timed Mock Exams — Assembly, Timing, and Results Log

**Purpose.** This file is the readiness keystone. The §12 readiness bar requires ≥3 full, timed practice exams with a weighted composite in the estimated 5-range. This file tells you how to assemble a mock, run it under real conditions, score it, and log the result so `../exam-skill-tracker.md` stays current.

**Cross-links:** official sources → [`official-sources-index.md`](official-sources-index.md) · skill tracker → [`../exam-skill-tracker.md`](../exam-skill-tracker.md) · pacing strategy → [`../reference/pacing-and-strategy.md`](../reference/pacing-and-strategy.md) · FRQ rubric rules → [`../reference/frq-rubric-and-penalties.md`](../reference/frq-rubric-and-penalties.md) · sourcing/alignment guide → [`../reference/question-sources-and-access.md`](../reference/question-sources-and-access.md)

---

## 1. Exam format (official, redesigned CED Effective Fall 2025)

| Section | Questions | Time | Score weight |
|---|---|---|---|
| **Section I — MCQ** | **42 questions** | **90 min** | **55%** |
| **Section II — FRQ** | **4 questions** | **90 min** | **45%** |
| **Total** | — | **3 hrs** | 100% |

**FRQ point totals:** Q1 Methods & Control Structures (7 pts) + Q2 Class Design (7 pts) + Q3 Data Analysis w/ ArrayList (5 pts) + Q4 2D Array (6 pts) = **25 pts raw**.

**Java Quick Reference provided throughout both sections. No calculator. No autocomplete, no compiler (Bluebook digital editor).**

---

## 2. Sourcing options (pick the best one available)

### Option A — AP Classroom full practice exam (preferred)

If you have AP Classroom access via a join code from an AP-authorized teacher or online provider, use the **full secure practice exam** directly. It is the closest available analog to the real exam — same item bank, same interface, same item types.

Do not assemble from the bank when AP Classroom is available; just use it.

> AP Classroom access is teacher-gated. See `../reference/question-sources-and-access.md` for the enrollment path.

---

### Option B — Assembled from this repo's bank (when AP Classroom is unavailable)

Build a 42-MCQ set by sampling from the unit-weight and skill-weight targets below, then add one FRQ from each of the four FRQ banks.

#### MCQ sampling targets (42 questions total)

| Unit | Exam weight | Target questions | Source file |
|---|---|---|---|
| U1 Using Objects & Methods | 15–25% | 7–10 questions | `mcq-unit-1.md` |
| U2 Selection & Iteration | 25–35% | 10–15 questions | `mcq-unit-2.md` |
| U3 Class Creation | 10–18% | 4–8 questions | `mcq-unit-3.md` |
| U4 Data Collections | 30–40% | 12–17 questions | `mcq-unit-4.md` |

Additionally, ensure the assembled set hits **Analyze-Code (P3) at 37–53% of MCQ items** (≈16–22 of the 42 questions). Draw these from `mcq-analyze-code.md` and count the `[practice P3]` tags in the unit banks to hit this target. Practice P2 (Develop Code) should be 22–38% (≈9–16 questions).

**Suggested quick assembly (42 questions):**
- Take all or most items from `mcq-analyze-code.md` that cover Analyze-Code items not already in the unit banks — fill to ~18 P3 items.
- From `mcq-unit-1.md`: pick 8 items.
- From `mcq-unit-2.md`: pick 12 items.
- From `mcq-unit-3.md`: pick 5 items.
- From `mcq-unit-4.md`: pick 17 items (largest unit — do not undersample it).
- Check the `[practice P.]` tags as you pick; redistribute if Analyze-Code count falls outside 16–22.

#### FRQ selection (4 questions)

Take one FRQ from each bank. For the first mock, use the official models (not a practice variant) so you get rubric benchmarking against an official problem:

| Q | Type | Source |
|---|---|---|
| Q1 | Methods & Control Structures (7 pts) | `frq-q1-methods-control.md` — section (a) official models, or any section (b) practice FRQ |
| Q2 | Class Design (7 pts) | `frq-q2-class-design.md` — section (a) official models, or any section (b) practice FRQ |
| Q3 | Data Analysis w/ ArrayList (5 pts) | `frq-q3-arraylist.md` — section (a) official models, or any section (b) practice FRQ |
| Q4 | 2D Array (6 pts) | `frq-q4-2d-array.md` — section (a) official models, or any section (b) practice FRQ |

Rotate to different problems on each subsequent mock — do not repeat the same FRQ twice.

---

### Option C — CED sample set (20 MCQ + 4 FRQ, ready-made)

The CED PDF (pp. 149–180) contains a pre-assembled sample form: **20 sample MCQ** (one per core skill, covering all units and all 5 practices) + the **4 sample FRQs** (MessageBuilder Q1, CupcakeMachine Q2, ItemInventory Q3, Schedule Q4) with official answers and scoring criteria.

**Use this form when:**
- You want a ready-made mock without assembly effort.
- You want the official College Board worked examples as your calibration standard.

**Limitation:** 20 MCQ takes ~43 min (not 90 min); it is a half-length Section I. Score it against the scoring table below adjusted to 20 questions, and note the shorter format in the results log. Use it as "Mock 0" (calibration) rather than counting it toward the ≥3 full-length readiness requirement.

**Source:** <https://apcentral.collegeboard.org/media/pdf/ap-computer-science-a-course-and-exam-description.pdf> pp. 149–180. Also see [`official-sources-index.md`](official-sources-index.md).

---

## 3. Timing protocol

Run each section as a timed, uninterrupted block. Replicate Bluebook conditions as closely as possible.

### Before starting

- Print or open the mock in a clean environment. No IDE, no autocomplete.
- Have the Java Quick Reference available (the reference page provided on the actual exam). It is reproduced in `../reference/java-quick-reference-drills.md`.
- Set a timer for **90 minutes**. Do not pause it.
- Do not consult notes, solutions, or external references during either section.

### Section I — MCQ (90 min)

- Target pace: **≤129 seconds per question** (90 min ÷ 42 = 128.6 s, leaving ~1 min to review).
- Mark difficult questions and move on; return if time allows.
- **No guessing penalty — never leave a question blank.** A blank is pure lost value.
- Record your answer for every question.

### Break

Take a 10-minute break between sections (mirrors the real exam).

### Section II — FRQ (90 min)

- Allocate roughly: Q1 ~20 min, Q2 ~22 min, Q3 ~18 min, Q4 ~22 min, review ~8 min.
- Write in a plain text editor with no compiler, no syntax highlighting, no autocomplete.
- **Never leave an FRQ blank.** Even a partial, commented skeleton earns partial credit. A blank earns zero.
- Use clean indentation — the digital exam reader uses indentation as a signal of intent.
- Grade yourself point-by-point after the section using the rubric in `../reference/frq-rubric-and-penalties.md`.

---

## 4. Scoring

### Step 1 — MCQ raw score

Count correct answers. Each correct MCQ = 1 point. Incorrect and blank = 0.

**MCQ raw score:** ___ / 42

### Step 2 — FRQ raw score

Grade each FRQ against the official rubric. Use `../reference/frq-rubric-and-penalties.md` for the penalty rules.

| FRQ | Max pts | Your score |
|---|---|---|
| Q1 Methods & Control Structures | 7 | — |
| Q2 Class Design | 7 | — |
| Q3 Data Analysis w/ ArrayList | 5 | — |
| Q4 2D Array | 6 | — |
| **Total FRQ raw** | **25** | — |

### Step 3 — Weighted composite

The College Board converts MCQ and FRQ scores to a common scale and weights them 55%/45%. This simplified formula is a close approximation:

```
MCQ score (0–100 scale) = (MCQ raw / 42) × 100
FRQ score (0–100 scale) = (FRQ raw / 25) × 100
Composite = (MCQ score × 0.55) + (FRQ score × 0.45)
```

**Example:** 32/42 MCQ + 18/25 FRQ → MCQ = 76.2, FRQ = 72.0 → Composite = 76.2 × 0.55 + 72.0 × 0.45 = **41.9 + 32.4 = 74.3%**

### Step 4 — Estimated AP score

**Estimated 5-range cutoff: ~68% composite.** This is an estimate based on historical AP exam patterns. The College Board has not yet published the score curve for the redesigned exam. Re-baseline when the official curve is published.

| Estimated composite | Estimated AP score |
|---|---|
| ≥ ~68% | 5 (estimate) |
| ~55–67% | 4 (estimate) |
| ~42–54% | 3 (estimate) |
| ~28–41% | 2 (estimate) |
| < ~28% | 1 (estimate) |

> **These cutoffs are estimates until College Board publishes the redesigned score distribution.** Monitor: `apstudents.collegeboard.org/about-ap-scores/score-distributions` (CSA columns blank as of mid-2026; expected later summer 2026). When the real curve is published, update the tracker table and re-score any past mocks.

---

## 5. Results log

Fill one row after each mock. Use this to track progress toward the ≥3-full-mock readiness requirement and to feed the skill tables in `../exam-skill-tracker.md`.

| # | Date | Form used | MCQ raw | MCQ % | FRQ raw | FRQ % | Composite | Est. AP score | Weakest area (unit or FRQ type) | Tracker updated? |
|---|---|---|---|---|---|---|---|---|---|---|
| 1 | | | — / 42 | | — / 25 | | | | | ⬜ |
| 2 | | | — / 42 | | — / 25 | | | | | ⬜ |
| 3 | | | — / 42 | | — / 25 | | | | | ⬜ |
| 4 | | | — / 42 | | — / 25 | | | | | ⬜ |
| 5 | | | — / 42 | | — / 25 | | | | | ⬜ |

**"Tracker updated?"** = did you transfer the mock's MCQ accuracy by unit, FRQ scores by type, pacing result (finished in time / blanks), and any new killer-errors into `../exam-skill-tracker.md`? The tracker is worthless if the transfer is skipped.

**Readiness gate:** "≥3 full timed practice exams with composite ≥ ~68%" is metric #1 in `../exam-skill-tracker.md` §(f). You must also meet metrics 2–4 (Analyze-Code ≥85% at pace; each FRQ type ≥85% across ≥3 attempts; no time-outs with ≤1 blank). All four must be green before declaring readiness.

---

## 6. After each mock — review protocol

1. **MCQ review.** For every wrong answer, identify the specific error pattern (trace error, sign flip, off-by-one, etc.) and update the killer-error watchlist in `../exam-skill-tracker.md`. Do not just read the correct answer and move on — diagnose the error.

2. **FRQ review.** Re-read each rubric point you missed. If a penalty applied (`==` on Strings, non-`private` fields, re-implementing a provided method, blank question), add it to the watchlist if it is not already there.

3. **Pacing review.** Did you finish Section I within 90 min with ≤1 blank? If not, the pacing problem takes priority over content review.

4. **Priority for next session.** Log the weakest area in the results table. Weight the next two weeks toward that unit or FRQ type.

5. **Transfer to tracker.** Mark the "Tracker updated?" checkbox only after you have transferred accuracy, scores, pacing, and killer-error data into `../exam-skill-tracker.md`. Do not check it off first.
