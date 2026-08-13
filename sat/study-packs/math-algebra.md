# Math — Algebra (Digital SAT)

**Why this matters for your score:** Algebra is ~35% of SAT Math (13–15 questions) — and it's where 1500+ scorers bank time and lock in near-perfect Module-1 accuracy to earn the hard Module 2. These should become *automatic*. Miss one here and it's almost always a careless trap, not a knowledge gap. Learn the trap, never repeat it.

**How to use this:** Read each concept (30 sec), study the worked example, memorize the #1 trap. Then do the practice set timed-ish (~1.5 min/question). Check answers at the bottom. Every miss → re-read that topic's trap line out loud.

---

## 1. Linear equations in one variable

**Concept:** Isolate the variable. Distribute, combine like terms, move variables to one side, divide. One variable → usually one solution.

**Worked example:** Solve `3(x − 4) = 2x + 5`.
→ `3x − 12 = 2x + 5` → `x = 17`.

**Special cases (heavily tested):**
- `5x + 3 = 5x + 8` → `3 = 8` (false) → **no solution**.
- `5x + 3 = 5x + 3` → `3 = 3` (always true) → **infinitely many solutions**.

**#1 trap:** When the question says "no solution" or "infinitely many," it's testing whether the variable terms *cancel*. If the x-terms match on both sides, there's NO single answer — check the constants: constants differ → no solution; constants match → infinitely many.

---

## 2. Linear equations in two variables (lines)

**Concept:** Three forms, each reveals something:
- **Slope-intercept:** `y = mx + b` → slope `m`, y-intercept `b`.
- **Point-slope:** `y − y₁ = m(x − x₁)` → built from a point + slope.
- **Standard:** `Ax + By = C` → slope = `−A/B`, fast for x- and y-intercepts (set the other variable to 0).

**Worked example:** Line through `(2, 1)` with slope `3`: `y − 1 = 3(x − 2)` → `y = 3x − 5`.

**#1 trap:** Reading slope off standard form. In `Ax + By = C`, slope is **−A/B**, NOT A/B and NOT A. For `4x + 2y = 9`, slope = `−4/2 = −2`.

---

## 3. Linear functions & interpreting slope/intercept in context

**Concept:** In `y = mx + b` modeling a real situation: **slope `m` = rate of change** (per one unit of x); **y-intercept `b` = starting value** (when x = 0).

**Worked example:** A pool drains by `C = 500 − 25t` (gallons after t minutes).
- Slope `−25` = water leaves at **25 gallons per minute**.
- Intercept `500` = **starting amount**, 500 gallons.

**#1 trap:** Context questions ask what the number *means*, not its value. Always attach **units** and the **"per one unit of x"** idea to slope, and "**when x = 0**" to the intercept. If the answer choice doesn't have correct units, it's wrong.

---

## 4. Systems of two linear equations

**Concept:** Find the `(x, y)` satisfying both. Methods: **substitution**, **elimination**, or **graphing** (intersection point).

**Worked example (elimination):**
`2x + y = 7` and `x − y = 2`. Add → `3x = 9` → `x = 3` → `y = 1`. Solution `(3, 1)`.

**Number of solutions:**
- Lines **intersect once** (different slopes) → **one solution**.
- **Parallel** (same slope, different intercept) → **no solution**.
- **Same line** (same slope, same intercept) → **infinitely many**.

**#1 trap (the single most-tested algebra trap):** For "no solution," make the coefficients **proportional but the constants NOT**. Example: for `no solution` in `3x + ky = 5` and `6x + 4y = 11`, you need `3/6 = k/4` → `k = 2` (and constants `5/6 ≠ 11`✓). Same ratio across coefficients = parallel/identical; check the constant to tell "none" from "infinitely many."

---

## 5. Linear inequalities (one & two variables)

**Concept:** Solve like equations, but **flip the inequality sign when multiplying or dividing by a negative.** Two-variable inequalities (`y > mx + b`) describe a **shaded region**; systems of inequalities = overlap region.

**Worked example:** `−2x + 1 ≥ 7` → `−2x ≥ 6` → `x ≤ −3` (sign flipped on ÷ by −2).

**#1 trap:** Forgetting the **flip**. The instant you divide/multiply by a negative, reverse the symbol. Also: "at least" = `≥`, "at most" = `≤`, "more than" = `>`, "fewer than" = `<`. Misreading these wording cues loses easy points.

---

## 6. Absolute value

**Concept:** `|x|` = distance from 0, always ≥ 0. To solve `|expr| = k` (k ≥ 0): split into **two cases**, `expr = k` OR `expr = −k`.

**Worked example:** `|2x − 3| = 5` → `2x − 3 = 5` (x = 4) OR `2x − 3 = −5` (x = −1). Solutions: `x = 4, −1`.

**#1 trap:** `|expr| = negative` has **NO solution** (absolute value can't be negative). And don't forget the **second (negative) case** — dropping it is the classic miss. For inequalities: `|x| < k` → `−k < x < k` (between); `|x| > k` → `x < −k` OR `x > k` (outside).

---

## 🖥️ Desmos shortcuts (built-in, allowed on all Math questions)

- **Systems:** type both equations → the **intersection dot** is your `(x, y)`. Click it to read exact coordinates. Faster than elimination on ugly numbers.
- **"No solution" parameter questions:** type the equation with the unknown as a slider (e.g. `k`), then slide to see when lines coincide/separate. Or just set coefficient ratios equal by hand — usually faster.
- **Intercepts:** type the line, click where it crosses each axis.
- **Inequalities:** type `y > 2x + 1` and Desmos shades the region — great for "which point is a solution" questions; just see if the point lands in the shade.
- **When NOT to use it:** simple one-variable solves and "interpret the slope" questions are faster by hand. Desmos is for *verifying* and for messy numbers, not a crutch for every step.

---

## ✏️ Practice Set (12 questions — graduated easy → hard; MC + grid-in)

> Grid-in (student-produced response) = type your own answer, no choices. Do these timed-ish (~1.5 min each).
>
> **The MC answer letters are spread across A–D deliberately** — the real test has no letter pattern, so don't let one form here train a bad reflex.

**Q1 (MC).** If `4x − 7 = 2x + 9`, what is the value of `x`?
(A) 1  (B) −1  (C) 16  (D) 8

**Q2 (MC).** What is the slope of the line `3x + 6y = 12`?
(A) 3  (B) 1/2  (C) −1/2  (D) −3

**Q3 (grid-in).** A phone plan costs `C = 30 + 0.10m`, where `m` is minutes used. What is the cost, in dollars, for 200 minutes?

**Q4 (MC).** A line passes through `(0, 5)` and `(2, 11)`. What is its equation?
(A) y = 3x + 5  (B) y = 6x + 5  (C) y = 3x + 11  (D) y = 2x + 5

**Q5 (MC).** Solve: `−3x + 4 < 13`.
(A) x > −3  (B) x < −3  (C) x < 3  (D) x > −17/3

**Q6 (grid-in).** Solve the system: `x + 2y = 10` and `x − y = 1`. What is the value of `y`?

**Q7 (MC).** In the equation `T = 18 − 1.5h`, the temperature `T` (°C) is modeled over `h` hours. What does the number 1.5 represent?
(A) The starting temperature
(B) The temperature after 1 hour
(C) The temperature decreases 1.5°C per hour
(D) The total temperature change

**Q8 (MC).** For what value of `k` does the system below have **no solution**?
`2x + 3y = 8`  and  `4x + ky = 5`
(A) k = 3  (B) k = 12  (C) k = 3/2  (D) k = 6

**Q9 (grid-in).** If `|3x − 1| = 11` and `x > 0`, what is the value of `x`?

**Q10 (MC).** Which value of `x` satisfies `|x + 4| < 2`?
(A) −7  (B) −5  (C) −2  (D) 0

**Q11 (MC).** A food truck sells tacos at \$3 and burritos at \$5. To make at least \$150 in a day from `t` tacos and `b` burritos, which inequality models this?
(A) 3t + 5b ≤ 150  (B) 3t + 5b ≥ 150  (C) 5t + 3b ≥ 150  (D) 3t + 5b > 150

**Q12 (grid-in).** The system `6x + 2y = 14` and `3x + y = c` has infinitely many solutions. What is the value of `c`?

---

## ✅ Worked Answers

**Q1 — (D) 8.** `4x − 7 = 2x + 9` → `2x = 16` → `x = 8`. Check: 4(8)−7 = 25 and 2(8)+9 = 25 ✓. *(A) 1 and (B) −1 come from botching the constants (`9 − 7 = 2` instead of `9 + 7 = 16`); (C) 16 is stopping at `2x = 16` and forgetting to divide.*

**Q2 — (C) −1/2.** Standard form `Ax + By = C` → slope = `−A/B = −3/6 = −1/2`. *Trap caught: slope is −A/B, not 3.* Desmos check: type `3x + 6y = 12`, it's a downward line.

**Q3 — 50.** `C = 30 + 0.10(200) = 30 + 20 = 50`. Grid in **50**.

**Q4 — (A) y = 3x + 5.** Slope = `(11 − 5)/(2 − 0) = 6/2 = 3`; y-intercept is 5 (the point with x = 0). → `y = 3x + 5`. *(B) used run instead of slope.*

**Q5 — (A) x > −3.** `−3x < 9` → divide by −3 and **flip**: `x > −3`. Test it: x = 0 gives 4 < 13 ✓; x = −4 gives 16 < 13 ✗. *Trap caught: the flip.* *(B) is exactly the no-flip answer; (C) drops the minus sign and solves `3x < 9`; (D) x > −17/3 comes from **adding** 4 instead of subtracting it (`−3x < 17`) — and x = −4 satisfies it while failing the original inequality, so it's genuinely wrong.*

**Q6 — 3.** Subtract equations: `(x + 2y) − (x − y) = 10 − 1` → `3y = 9` → `y = 3`. Grid in **3**. *(Desmos: graph both, intersection at (4, 3).)*

**Q7 — (C).** Slope (−1.5) = rate of change per hour → temperature drops 1.5°C each hour. *(The starting value 18 is the intercept; don't confuse the two.)*

**Q8 — (D) k = 6.** No solution = parallel = proportional coefficients: `2/4 = 3/k` → `2k = 12` → `k = 6`. Check constants: `8/5` ≠ `2/4`, so it's truly "no solution," not "infinitely many." ✓ *(A) k = 3 just copies the coefficient across without scaling (3/3 = 1 ≠ ½). (B) k = 12 scales 3 by the wrong factor (×4 instead of ×2), giving 3/12 = ¼ ≠ ½. (C) k = 3/2 inverts the proportion (`2/4 = k/3`). All three leave the lines non-parallel, so the system would have exactly one solution.*

**Q9 — 4.** `3x − 1 = 11` → `x = 4`, or `3x − 1 = −11` → `x = −10/3`. Since `x > 0`, answer is **4**. *Trap caught: both cases considered, then filtered.*

**Q10 — (B) −5.** `|x + 4| < 2` → `−2 < x + 4 < 2` → `−6 < x < −2`. Only **−5** falls in that range. *(A) −7 is too low; (C) −2 and (D) 0 are not less than −2.)*

**Q11 — (B) 3t + 5b ≥ 150.** Tacos \$3 each (`3t`), burritos \$5 each (`5b`); "at least \$150" = `≥ 150`. *Trap caught: "at least" → ≥, and match price to correct item.*

**Q12 — 7.** Multiply the second equation by 2: `6x + 2y = 2c`. For infinitely many solutions it must be identical to `6x + 2y = 14`, so `2c = 14` → **c = 7**.

---

### Quick self-check after this set
- Missed a **slope-from-standard-form** one? → memorize **slope = −A/B**.
- Missed an **inequality**? → say "flip on negative" every time.
- Missed **no-solution / infinitely-many**? → coefficients proportional; constants decide which.
- Missed **absolute value**? → two cases, and `= negative` means no solution.

These four traps cause ~90% of avoidable Algebra misses. Drill them to zero and this whole domain becomes free points.
