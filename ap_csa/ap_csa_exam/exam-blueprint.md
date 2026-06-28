# AP CSA Exam Blueprint

**Course:** AP Computer Science A — Redesigned (Effective Fall 2025, CED V.1)
**Target:** Score 5 on the May 2027 exam · Digital (Bluebook) · Java Quick Reference provided · No calculator

---

## (a) Exam at a Glance

| | Section I — MCQ | Section II — FRQ |
|---|---|---|
| **Questions** | 42 | 4 |
| **Time** | 90 min | 90 min |
| **Weight** | 55% | 45% |
| **Format** | Multiple choice, no penalty for guessing | Written Java code |
| **Tools** | Java Quick Reference (whole exam) | Java Quick Reference (whole exam) |

**Total:** 3 hours. Fully digital in **Bluebook**. No calculator.

**FRQ point totals:** Q1 = 7 pts · Q2 = 7 pts · Q3 = 5 pts · Q4 = 6 pts = **25 pts**

---

## (b) Unit MCQ Weights

| Unit | Topic | Weight |
|---|---|---|
| U1 | Using Objects & Methods | 15–25% |
| U2 | Selection & Iteration | 25–35% |
| U3 | Class Creation | 10–18% |
| U4 | Data Collections | 30–40% |

Unit 4 is the single biggest unit — nearly a third to two-fifths of the MCQ section. Weight study time accordingly.

---

## (c) The 5 Computational Thinking Practices and 12 Skills

### MCQ Practice Weights

| Practice | Description | MCQ Weight |
|---|---|---|
| **P1** | Design Code | 2–10% |
| **P2** | Develop Code | 22–38% |
| **P3** | Analyze Code | **37–53%** |
| **P4** | Document Code | 10–15% |
| **P5** | Use Computers Responsibly | 2–10% |

**P3 Analyze Code dominates the MCQ section.** Knowing a concept is not enough — you must simulate code execution accurately under time pressure.

All 4 FRQs assess **P2 Develop Code** (skills 2.A, 2.B, 2.C).

### All 12 Skills

| Skill | Description | Practice |
|---|---|---|
| 1.A | Determine an appropriate program design to solve a problem or accomplish a task | P1 |
| 1.B | Determine code that would be used to complete code segments | P1 |
| 2.A | Write program code to create objects of a class and call methods | P2 |
| 2.B | Write program code to define a new type by creating a class | P2 |
| 2.C | Write program code to satisfy method specifications using expressions, conditional statements, and iterative statements | P2 |
| 3.A | Evaluate output, expressions, and objects | P3 |
| 3.B | Determine the result or output based on statement execution order in a code segment | P3 |
| 3.C | Evaluate program code that includes String, 1D array, ArrayList, or 2D array traversals | P3 |
| 3.D | Trace through algorithms to determine the result of execution | P3 |
| 4.A | Explain the behavior of a given segment of program code | P4 |
| 4.B | Describe the initial conditions that must be met for a program segment to work as intended or described | P4 |
| 5.A | Explain the impact of computing systems and artifacts on society, economy, or culture | P5 |

---

## (d) The 4 FRQ Shapes

| # | Type | Points | Structure |
|---|---|---|---|
| **Q1** | Methods & Control Structures | 7 | **Part A:** iterative/conditional logic + method calls; **Part B:** String method usage |
| **Q2** | Class Design | 7 | Write a complete class (constructor + methods, all instance vars `private`) |
| **Q3** | Data Analysis with ArrayList | 5 | Traverse, filter, or aggregate an `ArrayList<E>` |
| **Q4** | 2D Array | 6 | Traverse rows/cols, process a grid |

**FRQ total: 25 points.** Official score examples (CED samples): MessageBuilder (Q1), CupcakeMachine (Q2), ItemInventory (Q3), Schedule (Q4). Released 2026 FRQs: Account (Q1), Bottle (Q2), Attendance (Q3), GameBoard (Q4).

**Recurring FRQ point-losers to drill:**
- `==` instead of `.equals()` on Strings
- Off-by-one or out-of-bounds array indices (`arr[arr.length]`)
- Removing from an `ArrayList` while iterating forward (use reverse traversal or index adjustment)
- Instance variables not declared `private`
- 2D array row/col confusion (`grid[row][col]`, `grid.length` = rows, `grid[0].length` = cols)
- Missing null guard before calling methods on an object reference
- Leaving an FRQ entirely blank (partial credit is always better than zero)

---

## (e) Why 100% Coverage Still Scores 2–3: The 3→5 Gap

Finishing the AP CSA content course puts all concepts in memory — but **the exam tests execution under pressure**, not recall. Three leaks drive the gap:

### 1. Analyze Code is 37–53% of MCQ

The single biggest practice slice. You must **hand-trace code mentally** — stepping through loops, conditionals, recursive calls, and String/array/ArrayList operations — and arrive at the correct output or state. Knowing what a method does is different from simulating it line by line, correctly, in under 2 minutes 9 seconds.

**Target to close this gap:** Analyze-Code MCQ accuracy ≥85% at ~2:09/question pace.

### 2. Pacing (~2 min 9 sec per MCQ)

42 questions in 90 minutes = **~2:09 each, no extensions**. There is no guessing penalty, so leaving a blank is pure lost value — always mark an answer. Pacing pressure triggers errors even on known concepts. Timed drills under exam conditions are the only fix.

### 3. FRQ Rubric Precision

FRQs are graded point-by-point to a strict rubric. Common ways to lose points on code you mostly know:

- Writing syntactically illegal Java (mismatched braces, missing semicolons) — on Bluebook, code is never compiled; intent must be clear from clean, indented code
- Re-implementing a method the problem already gave you (costs the re-use point)
- Accessing a private field directly from outside the class instead of using an accessor
- Minor logic errors that cause off-by-one failures at boundaries

**Target:** each FRQ type averaging ≥85% of points across ≥3 attempts.

### Readiness Bar (all four must be met, not just composite)

| Metric | Target |
|---|---|
| Full timed practice exams | ≥3 exams with weighted composite in estimated 5-range |
| Analyze-Code MCQ accuracy | ≥85% at ~2:09/question pace |
| Each FRQ type | Average ≥85% of available points across ≥3 attempts |
| Section completion | Both 90-min sections finished within time with ≤1 blank |

---

## (f) Scoring Caveat

**The only published AP CSA score distribution is from the OLD exam** (pre-redesign; 2025: 5 = 25.6%). The College Board has **not yet published** a score curve or raw→5 mapping for the redesigned exam (effective Fall 2025).

Historically, AP CSA has required roughly **65–70% of the composite** to earn a 5. This blueprint uses **~68% as an estimated readiness cutoff** — treat it as a planning estimate, not a guarantee.

**Update this file when College Board publishes:**
- The redesigned-exam score distribution (watch `apstudents.collegeboard.org/about-ap-scores/score-distributions` — CSA columns blank as of 2026-06-27; expected later in summer 2026)
- The 2026 Scoring Guidelines (watch `apcentral.collegeboard.org/media/pdf/ap26-sg-computer-science-a.pdf` — 404 as of 2026-06-27; expected ~fall 2026)

Until the real curve is published, readiness is determined by the **four-metric bar** in §(e), not just composite score.

---

## Quick-Reference: Numbers to Memorize

| Fact | Value |
|---|---|
| MCQ count / time / weight | 42 / 90 min / 55% |
| FRQ count / time / weight | 4 / 90 min / 45% |
| FRQ point split | 7 / 7 / 5 / 6 = 25 |
| Biggest MCQ practice (P3) | 37–53% |
| Biggest MCQ unit (U4) | 30–40% |
| Pace per MCQ | ~2 min 9 sec |
| Skills count | 12 (1.A–5.A) |
