# AP CSA Exam-Prep Layer — Start Here

A drill-first, exam-condition system layered on top of `ap_csa/`. Its one job: close the gap between **covering the content** and **scoring a 5 under exam conditions**.

> **You do NOT need to understand the readiness math.** Your whole job: open the examiner, answer the question it gives you (cold, with your reasoning), and paste back the one `TRACKER UPDATE` block it hands you. The examiner computes every score, streak, and gate and tells you the one number that matters and the one thing to do next. Criteria A–F live in `exam-skill-tracker.md §(f)` for the examiner to read — not for you to memorize.

---

### For the parent — the 3 things only an adult can do

> 🔴 **Before any of the three: send one email in the first week of school (~late Aug / early Sept 2026).** It is the earliest deadline attached to this project. Ask the **Foothill HS AP Coordinator**, **in writing**:
> 1. **Does Foothill administer the AP Computer Science A exam in May 2027?**
> 2. **Will Lucas be on the school's exam order for BOTH AP Computer Science A and AP Precalculus?**
> 3. **What is the school's own internal ordering deadline?**
>
> **If (1) is no, the search for a school that will host him starts in September, not November.** The Nov 13 order deadline belongs to a coordinator at a school that has *already agreed* to host him — and finding that person takes weeks. Nothing below can be done until (1) has an answer.
>
> 💵 **Every fee and every date for both exams lives in one table:** [`../../ap_precalc/README.md`](../../ap_precalc/README.md) → **MONEY AND DEADLINES** (base fee, late fee, cancellation fee, fee reduction, score-send and payment deadlines). It is deliberately the only place figures are printed, so they can't drift apart again.

1. **AP Classroom access** — the platform opened **July 1, 2026** and is live now. If Lucas is enrolled in an AP CSA course, get the **join code from his teacher in the first week of school**; students join class sections in My AP then. If his school does **not** offer AP CSA, see item 2 — an exam-only section gives him AP videos and *"some high-level course resources"* only; he **must be enrolled in a class section** to get the rest of AP Classroom (Progress Checks, Question Bank, full Practice Exams), and an exam-only registration does not provide that. In that case plan readiness around the official-anchor fallback in `exam-skill-tracker.md`.
2. **Exam registration** — **final ordering deadline: Nov 13, 2026, 11:59 PM ET** (preferred deadline Oct 2, 2026; +$40/exam after Nov 13 — the Oct 2 → Nov 13 window is free). **Parents and students cannot order directly, and this is two different errands with two different people:** only an **AP Coordinator** at a school that agrees to host can place the **exam order** (a seat on exam day); the **AP Classroom join code** is issued separately, by the audit-authorized **teacher** of a class section Lucas is enrolled in (see item 1 — it is not the coordinator's job). Confirm Foothill HS administers AP CSA; if not, search the **AP Course Ledger** at **`https://apcourseaudit.inflexion.org/ledger/`** (searchable by school, subject, city, state and country) and ask coordinators about an **exam-only section** — which secures a seat but, on its own, not the join code. Individual schools set their own earlier local deadlines, so start early.
   - ⚠️ **The ledger cannot answer the Foothill question in time — and may not open for you at all.** College Board refreshes it **each November** — i.e. right around the Nov 13 order deadline — so a lookup in **August or September 2026 shows 2025-26 offerings**, not the year Lucas will sit. Separately, a later check found the ledger gated behind a College Board **professional** login ("Session Expired / Please sign into your AP Professional Learning account"), which a parent does not have. Use the ledger to find *other* schools that have historically offered AP CSA **if it lets you in**, but the only instrument that answers "does Foothill administer AP CSA in May 2027" before Nov 13 is **a direct question to the AP Coordinator** (see the email above). *(Verified 12 August 2026.)*
   - **PLAUSIBLE — UNVERIFIED: a late path may exist.** The claim: a student whose school does not administer the exam can be added **after Nov 13 without the $40 late fee**, if the coordinator contacts AP Services and the student is in the order **by Mar 12, 2027**. **This could not be confirmed on 12 August 2026** — College Board's "Special Ordering Circumstances" page is a link index that defers to the AP Coordinator's Manual Part 1, and the exceptions the fees page *does* name are different ones (courses beginning after Nov 13; transfer students). **Treat it as unconfirmed and ask the AP Coordinator to verify it against the Manual before relying on it.** This escape hatch is load-bearing — plan as though **Nov 13 is the wall**.
   - Accommodations, if ever needed: request by **Jan 22, 2027**.
   - ⚠️ **AP Precalculus is Tue May 11, 2027 and AP CSA is Wed May 12, 2027 — back to back.** Register for both and plan the final week around both. Note that **Nov 13 is also the last day an exam can be canceled for free**: putting both on the order early risks the $40 unused-exam fee, not the whole base exam fee, if one is later dropped. Take that trade.
3. **Proctor a mock or two — enforce the conditions, but do NOT call time.** Sit nearby for at least one official-anchor mock and hold the line on the constraints that *are* real: **no notes, no compiler, no autocomplete, no phone.** Then deliberately say nothing about the clock. Verbatim from the official 2026 AP CSA Section II directions (verified 12 August 2026): *"The clock will turn red when 5 minutes remain—the proctor will not give you any time updates or warnings."* A parent holding a timer and calling "30 minutes left" trains a cue that will not exist on 12 May 2027 — he has to watch his own clock and learn to treat the clock turning red as his end-of-section sweep trigger (see `reference/exam-day-protocol.md` and `reference/pacing-and-strategy.md`). Run that way, this is the closest thing to real exam conditions available before May.

---

## The diagnosis

Lucas finished the `ap_csa/` content course (~100% coverage) but scored **~2–3 on an official College Board redesigned practice exam**. Research confirms the gap is **exam performance, not missing topics**. Of the two things that looked missing, **`HashMap`/`HashSet` genuinely are off the redesigned exam** — zero occurrences in the official CED (*Effective Fall 2025*; verified 12 August 2026). **Inheritance is only half off:** topic 1.12 *requires* the vocabulary — superclass, subclass, class hierarchy, and that every class in Java is a subclass of `Object` — at describe/identify level, and the CED excludes only *"designing and implementing inheritance relationships."* That in-scope half is now covered ([`../csa-coverage-map.md`](../csa-coverage-map.md) → **Inheritance**, plus `question-bank/mcq-unit-1.md` Q15 and Q23–Q25), and it is nowhere near large enough to account for a 2–3.

The real leak is converting "I know the concept" into points under exam conditions:

| Root cause | Why it matters |
|---|---|
| **Analyze Code = 37–53% of MCQ** | The single biggest slice. Knowing a concept does not equal simulating code execution accurately and fast. |
| **Pacing** | ~2 min 9 sec per MCQ. No guessing penalty — a blank is pure lost value. |
| **FRQ rubric precision** | Recurring point-losers: `==` vs `.equals`, off-by-one/bounds, ArrayList remove-while-iterating, non-`private` fields, 2D row/col order, null-guarding, leaving FRQs blank. |
| **Tutored practice ≠ independent performance** | Answering with hints never proved the skill cold, timed, under exam conditions. |

## The win condition (honest)

**What 100% means here:** NOT "covered the topics" — that's the old course's 100%, and it produced a 2–3. Here, 100% means scoring well into 5 territory with margin across repeated full timed mocks, strictly graded, with no untrained gaps in any unit, practice, or FRQ type. Only full timed mocks move the readiness number; drills do not.

The examiner tracks all of this automatically — you don't read or manage it directly. (For the curious or for a parent reviewing the system: the full hardened definition with all thresholds and gates lives in `exam-skill-tracker.md` §(f).)

**Honest caveat:** meeting that bar is the strongest real predictor of a 5, not a mathematical guarantee. The targets sit deliberately above the historical ~65–72% composite 5-cutoff as insurance against test-day variance and redesigned-curve uncertainty.

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
| **`exam-day-protocol.md`** | Exam-day and final-week execution guide: Bluebook setup, taper plan, test-day logistics, in-section strategy, and panic recovery. |
| **`inheritance-hashmap-supplement.md`** | **For your school class only — NOT tested on the AP exam.** Light `extends`/`super`/override + `HashMap` basics for school safety. |

## How this complements `ap_csa/`

This subproject is a **drill layer**, not a replacement. The parent `ap_csa/` is the content tutor — it teaches concepts Socratically and tracks conceptual mastery. This layer assumes concepts are known and trains translating them into exam points under timed, rubric-graded conditions.

- Parent README and coverage map: [`../README.md`](../README.md), [`../csa-coverage-map.md`](../csa-coverage-map.md)
- Conceptual mastery tracker: [`../mastery-tracker.md`](../mastery-tracker.md)
- Content tutor (for gap-repair only): [`../tutor-prompt.md`](../tutor-prompt.md)

See `how-to-use.md` for exactly when to call which system.
