# FRQ Rubric & Penalties

**Purpose:** Understand exactly how FRQs are scored so you earn every point you deserve and avoid the mechanical deductions that cost even correct code. Read this before every FRQ practice session; pair it with `killer-errors-cheatsheet.md` for the full point-protection picture.

---

## 1. FRQ Point Totals (25 points total)

| Question | Shape | Points | Structure |
|---|---|---|---|
| **Q1** | Methods & Control Structures | **7** | Part A (iterative/conditional + method calls) + Part B (String methods) |
| **Q2** | Class Design | **7** | Single part; design and implement a complete class |
| **Q3** | Data Analysis with ArrayList | **5** | Single part; ArrayList traversal + algorithm |
| **Q4** | 2D Array | **6** | Single part; 2D array traversal + algorithm |
| **Total** | — | **25** | All 4 FRQs assess Practice 2 (Develop Code: skills 2.A / 2.B / 2.C) |

**Section weighting:** Section II (FRQ) = 45% of the composite score. 25 raw FRQ points × the conversion factor drives roughly half your final grade.

---

## 2. How Points Are Awarded

FRQs are scored **point-by-point** by a human grader against a published rubric. Each rubric row targets a specific skill:

- **Correctness:** Does the code accomplish the stated requirement (right algorithm, right output, right return)?
- **Method use:** Did you call the correct provided methods rather than re-implementing them?
- **Encapsulation:** Are instance variables `private` (Q2)?
- **Structure:** Does the method/class header, return type, and parameter list match what was asked?
- **Data handling:** Correct traversal bounds, correct index access, correct data structure methods.

Each row is awarded independently — getting one row wrong does not prevent earning another. Always complete every part.

---

## 3. Penalty Rules (exact)

Three rules govern deductions. Know all three cold.

| Rule | Exact description |
|---|---|
| **Cap** | Penalties are capped at **3 points per question**. No single question loses more than 3 points from penalties, regardless of how many penalty-triggering errors appear. |
| **Earned-parts only** | A penalty is deducted only from parts of the question that earned credit. A penalty cannot reduce a question's score below 0, and it cannot be charged against a part that earned 0 points. |
| **Charged once** | A given penalty is charged **only once per question**, even if the same error appears multiple times in that question's response. |

**Practical consequence:** if you write `==` on Strings in three different places in Q1, that is one penalty charge — not three. But if you also directly access a private field in the same question, that is a second penalty charge (different error, different row).

---

## 4. What COSTS Points

These errors are penalized by rubric; they are not forgiven even when intent is clear.

| Error | Why it costs | Fix |
|---|---|---|
| Using `==` to compare String content | Tests reference identity, not content; logically wrong on AP CSA | Use `.equals()`: `if (s1.equals(s2))` |
| Directly accessing a `private` field from outside the class | Violates encapsulation; a defined rubric penalty | Use the provided accessor: `obj.getField()`, never `obj.field` from outside |
| Re-implementing a method the problem already provides | Indicates you ignored the provided API; rubric deducts for not using the given method | Read the class header — if `getScore()` exists, call it; do not copy its body |
| Non-`private` instance variables (Q2 Class Design) | Violates encapsulation; costs the encapsulation point explicitly | All instance variables must be `private`; constructors and methods are `public` |

---

## 5. What is FORGIVEN

Minor mechanical issues are forgiven when the **intent is unambiguous**. The grader reads for logic, not syntactic perfection.

| Issue | Forgiven condition |
|---|---|
| Missing semicolon `;` | Forgiven if intent is clear and it does not alter meaning |
| Missing closing brace `}` | Forgiven if the block structure is obvious from indentation and context |
| `=` used instead of `==` for a primitive comparison | Forgiven as a transcription typo if context makes the intended comparison obvious |
| Minor spelling/capitalization variation in a variable name | Forgiven if consistent within the response and unambiguous |
| Unnecessary `return` at end of a `void` method | Forgiven |

**What is NOT forgiven even as "minor syntax":** using `==` on Strings (this is a semantic error, not a syntax error), wrong method name, wrong return type, or code that would produce the wrong output.

---

## 6. Never Leave an FRQ Blank

> **Write the method header + a correct loop for partial credit.**

A blank answer scores exactly 0. A response with even one correct structural element (correct method signature, a correct loop, a correct method call) earns partial credit. The grader awards each rubric point independently.

**Minimum viable response when stuck:**
1. Write the correct method signature (return type, name, parameters).
2. Write a loop over the correct data structure with correct bounds.
3. Write a comment or incomplete body showing the intended logic.

Even if the body is wrong, a correct header + a correct loop can earn 1–2 points that a blank never gets.

---

## 7. Bluebook Exam Realism for FRQs

FRQ code is typed in a **plain text editor** in Bluebook — no compiler, no autocomplete, no syntax highlighting, no run button. Code is **hand-graded and never executed**.

**What this means:**
- You cannot rely on a red underline to catch a typo. Know your syntax cold.
- Indentation is your signal to the grader about block structure. Keep it clean and consistent — sloppy indentation can make a correct `if-else` look like two independent `if` statements.
- There is no "run it to check" safety net. Trace by hand before you write.

**Practice implication:** All FRQ practice should be typed in a plain editor (no IDE, no compile-and-run). This is the only way to build the muscle memory that transfers to the real exam.

---

## 8. Grader-Calibration Gate

**FRQ self-scores do not count toward readiness until this gate is passed.** Strict grading requires a calibrated grader — otherwise scores are presumed inflated.

> **This gate is passable today.** It does **not** wait on the 2026 Scoring Guidelines: officially scored sample responses with published point awards are already live on AP Central (verified 12 August 2026).

**Protocol:**

1. **Blind-grade an officially-scored sample response** before your FRQ self-scores feed the readiness bar. Use either:
   - a **CED sample-FRQ response** (MessageBuilder Q1, CupcakeMachine Q2, ItemInventory Q3, Schedule Q4 — official point awards are in the CED); **or**
   - a **2025 officially scored sample** — `ap25-apc-computer-science-a-q1.pdf` through `-q4.pdf` (real student responses with the official awards and reader commentary), graded against `ap25-sg-computer-science-a.pdf`; `ap25-cr-report-computer-science-a.pdf` and `ap25-computer-science-a-scoring-statistics.pdf` add context. **2024 and 2023 packages are posted too.**
     - ⚠️ **Apply the Q1/Q3/Q4 filter.** AP Central notes that after the 2025–26 revisions the 2023–25 materials **"do not completely align with the current AP CSA Exam"** — so calibrate on **Q1, Q3, Q4** and **skip Q2** (pre-redesign Q2 is inheritance-shaped). Old questions were 9 points each; score against **that year's own scoring guidelines** and run the ±1-point check against the award for the sample you actually graded.
   - a 2026 Scoring-Guidelines sample once posted (an upgrade, not a prerequisite).
2. **Grade it entirely before looking at the official award.** Then compare your score to the official award **on each FRQ individually**.
3. **Pass criterion:** your award must be **within ±1 point** of the official award on each FRQ. Landing off by 2 or more on any FRQ = gate not passed.
4. **If you are off by >1 point:** subtract the measured bias from your past self-scores and **do not count FRQ toward readiness** until you re-calibrate and pass.
5. **Re-test every 8 weeks** and **immediately after College Board posts the 2026 Scoring Guidelines** (watch URL below). The 2026 SG is the authoritative rubric once posted — re-run this gate against a 2026 SG sample as soon as it is available.

**Gate-B persistent-failure exit (if the gate fails twice consecutively):**

Failing twice in a row does not block FRQ readiness permanently. Instead:

- **Adopt bias correction:** subtract the measured bias from every FRQ self-score. The bias-corrected score is the score that counts going forward.
- **Accelerated re-test:** switch from the 8-week cycle to **every 4 weeks** until the gate passes.
- **Unstable bias:** if the bias differs substantially across FRQ types (e.g., over-awards Q2 but accurate on Q1/Q3/Q4), seek **one externally-graded FRQ** (AP teacher or vetted online provider) as a tiebreak, then apply per-type corrections.
- **Calibration standard:** the **CED sample rubrics and the 2025 scoring guidelines + officially scored samples** (`ap25-sg-*` graded with `ap25-apc-*`, **Q1/Q3/Q4 only**) are the calibration standards until the 2026 Scoring Guidelines post. Do NOT calibrate against the 2026 released FRQs (Account Q1, Bottle Q2, Attendance Q3, GameBoard Q4) while they lack official scoring guidelines — they are valid practice but their point awards are unverified.
- Once the gate passes (bias ≤ ±1 pt), resume the standard 8-week cadence.

Full gate-B logic and the authority to declare readiness live in `../exam-skill-tracker.md` §(f).

**Calibration log (update after each gate check):**

| Date | Sample used | Your score | Official award | Gap | Passed? |
|---|---|---|---|---|---|
| — | — | — | — | — | ⬜ |

**Status in `exam-skill-tracker.md`:** gate B in §(f) tracks this. The readiness bar cannot reach 100% until gate B shows ⬜ → ✅.

---

## 9. Monitor: 2026 Scoring Guidelines

The official College Board 2026 Scoring Guidelines are still unpublished as of **12 August 2026** (the URL returns 404). When they are posted — expected approximately fall 2026 — fold the exact rubric rows and penalty language from that document into this file. **This is an upgrade, not a blocker:** the 2025 scoring guidelines (`ap25-sg-computer-science-a.pdf`) plus the scored samples (`ap25-apc-*`) are already an official rubric-and-award pair, so §8's calibration gate runs now.

**Watch URL:** `https://apcentral.collegeboard.org/media/pdf/ap26-sg-computer-science-a.pdf`

Until then, this file reflects the rubric structure from the CED sample FRQ rubrics (MessageBuilder Q1, CupcakeMachine Q2, ItemInventory Q3, Schedule Q4), the **2025 scoring guidelines and scored samples** (Q1/Q3/Q4 — with AP Central's caveat that the 2023–25 materials "do not completely align with the current AP CSA Exam"), and the 2026 released FRQs (Account Q1, Bottle Q2, Attendance Q3, GameBoard Q4), which together are the best available rubric sources for the redesigned exam.

Also watch for the 2026 Chief Reader Report at: `https://apcentral.collegeboard.org/media/pdf/ap26-cr-report-computer-science-a.pdf`
