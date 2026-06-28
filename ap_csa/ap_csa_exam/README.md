# AP CSA Exam-Prep Layer — Start Here

A drill-first, exam-condition system layered on top of `ap_csa/`. Its one job: close the gap between **covering the content** and **scoring a 5 under exam conditions**.

## The diagnosis

Lucas finished the `ap_csa/` content course (~100% coverage) but scored **~2–3 on an official College Board redesigned practice exam**. Research confirms the gap is **exam performance, not missing topics**. The two things that looked missing (HashMap / inheritance) are **genuinely off the redesigned exam** — they were removed in the 2025 redesign.

The real leak is converting "I know the concept" into points under exam conditions:

| Root cause | Why it matters |
|---|---|
| **Analyze Code = 37–53% of MCQ** | The single biggest slice. Knowing a concept does not equal simulating code execution accurately and fast. |
| **Pacing** | ~2 min 9 sec per MCQ. No guessing penalty — a blank is pure lost value. |
| **FRQ rubric precision** | Recurring point-losers: `==` vs `.equals`, off-by-one/bounds, ArrayList remove-while-iterating, non-`private` fields, 2D row/col order, null-guarding, leaving FRQs blank. |
| **Tutored practice ≠ independent performance** | Answering with hints never proved the skill cold, timed, under exam conditions. |

## The win condition (honest)

Nobody can literally guarantee a 5 — College Board has not yet published the redesigned score curve. The operational target is: **Lucas consistently scores in the 5 range on full, timed, official-style practice exams**, proven by four concrete metrics tracked in `exam-skill-tracker.md`:

1. ≥3 full timed mocks with weighted composite ~68%+ (estimate until CB publishes the real cutoff).
2. Analyze-Code MCQ accuracy ≥85% at pace (~2:09/question).
3. Each FRQ type averaging ≥85% of points across ≥3 attempts.
4. Full sections finished within time with ≤1 blank.

## File index

### Root

| File | What it is |
|---|---|
| **`exam-tutor-prompt.md`** | The AI examiner's instructions — present a question cold, diagnose the specific error pattern, micro-teach the missed point, grade FRQs point-by-point to rubric. Paste this as the system prompt. |
| **`exam-blueprint.md`** | Verified exam facts (42 MCQ + 4 FRQ, unit weights, practice weights, scoring), the 12-skill taxonomy, and the 3→5 gap analysis. |
| **`topic-coverage-matrix.md`** | All 53 CED topics (1.1–4.17) mapped to bank items that cover each, plus all 19 verbatim exclusions. The 100% coverage proof. |
| **`exam-skill-tracker.md`** | Persistent memory by exam skill and FRQ type: trace accuracy, pacing, per-FRQ scores, killer-error watchlist. Updated after every session. |
| **`diagnostic-exam.md`** | A timed mixed MCQ + one of each FRQ type → establishes the real baseline and a ranked leak list. Run this first. |

### `question-bank/`

| File | What it is |
|---|---|
| **`mcq-analyze-code.md`** | The biggest pack (37–53% of MCQ): hand-tracing loops, recursion, strings, arrays, objects. |
| **`mcq-unit-1.md`** | MCQ covering Unit 1 — Using Objects & Methods (15–25%). |
| **`mcq-unit-2.md`** | MCQ covering Unit 2 — Selection & Iteration (25–35%). |
| **`mcq-unit-3.md`** | MCQ covering Unit 3 — Class Creation (10–18%). |
| **`mcq-unit-4.md`** | MCQ covering Unit 4 — Data Collections (30–40%). |
| **`frq-q1-methods-control.md`** | Q1 Methods & Control Structures (7 pts): official model + rubric + original variants. |
| **`frq-q2-class-design.md`** | Q2 Class Design (7 pts): official model + rubric + original variants. |
| **`frq-q3-arraylist.md`** | Q3 Data Analysis w/ ArrayList (5 pts): official model + rubric + original variants. |
| **`frq-q4-2d-array.md`** | Q4 2D Array (6 pts): official model + rubric + original variants. |
| **`practice-exams.md`** | How to assemble, run, and log full timed mocks (42 MCQ + 4 FRQ, 90+90 min). The readiness keystone. |
| **`official-sources-index.md`** | Links to CED samples, the 2026 FRQ PDF, and AP Classroom. |

### `reference/`

| File | What it is |
|---|---|
| **`pacing-and-strategy.md`** | Section-level pacing plan, guessing rules, FRQ time allocation. |
| **`frq-rubric-and-penalties.md`** | The 7/7/5/6 rubric structure, penalty rules (cap 3/question; `==`-on-String costs; direct field access costs), and how to apply them. |
| **`killer-errors-cheatsheet.md`** | The single-page hit list of the most common point-losers, to review before every exam. |
| **`java-quick-reference-drills.md`** | Drills on the exact bounded library (String/Math/ArrayList/Integer/Double/File/Scanner/Object). Fixes `charAt` drift: the exam uses `substring(i, i+1)` for a single character. |
| **`question-sources-and-access.md`** | Redesign-aligned free + paid resources, what to avoid (still-inheritance editions), and exam logistics. |
| **`inheritance-hashmap-supplement.md`** | **For your school class only — NOT tested on the AP exam.** Light `extends`/`super`/override + `HashMap` basics for school safety. |

## How this complements `ap_csa/`

This subproject is a **drill layer**, not a replacement. The parent `ap_csa/` is the content tutor — it teaches concepts Socratically and tracks conceptual mastery. This layer assumes concepts are known and trains translating them into exam points under timed, rubric-graded conditions.

- Parent README and coverage map: [`../README.md`](../README.md), [`../csa-coverage-map.md`](../csa-coverage-map.md)
- Conceptual mastery tracker: [`../mastery-tracker.md`](../mastery-tracker.md)
- Content tutor (for gap-repair only): [`../tutor-prompt.md`](../tutor-prompt.md)

See `how-to-use.md` for exactly when to call which system.
