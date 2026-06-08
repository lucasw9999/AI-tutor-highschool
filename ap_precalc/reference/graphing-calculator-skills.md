# Graphing-Calculator Skills the AP Precalculus Exam Expects (TI-84 *or* the built-in Desmos)

**Why this matters:** ~37.5% of your AP Precalc score sits on calculator-active sections (MC Part B + FRQ Q1 & Q2). Those questions are *designed* to be slow or impossible by hand — they reward fast, correct calculator moves. Knowing the exact button paths is free points toward your A and 4/5.

> **Which calculator?** On the AP Precalc exam you may use an **approved physical graphing calculator (e.g., TI-84)**, **and/or** the **built-in Desmos graphing calculator inside Bluebook** — College Board's words: "in place of or in addition to a handheld." Since the **Desmos calculator is always there in Bluebook (free, nothing to buy/charge), practice with Desmos too** — the *moves* below (graph, find zeros/intersections, regressions) are the same idea in either tool; only the button paths differ. The skills, not the device, are what score points.

---

## The exam at a glance (calculator policy — May 2027)

| Section | Questions | Calculator? | Worth |
|---|---|---|---|
| **MC Part A** | 29 | ❌ No calc | ~43.75% |
| **MC Part B** | 13 | ✅ Calc available | ~18.75% |
| **FRQ Q1** Function Concepts | 1 | ✅ Graphing calc | } ~18.75% |
| **FRQ Q2** Modeling Non-Periodic Context | 1 | ✅ Graphing calc | } |
| **FRQ Q3** Modeling Periodic Context | 1 | ❌ No calc | } ~18.75% |
| **FRQ Q4** Symbolic Manipulation | 1 | ❌ No calc | } |

- Tests **Units 1–3 only** (Unit 4 is class-only, NOT on the AP exam).
- MC is in **Bluebook**; FRQs are **handwritten** on paper. Practice writing your calculator setup + result by hand.
- **You may bring two calculators.** Bring fresh/charged batteries.

### The 6 capabilities College Board says you MUST be able to do (verbatim from the CED)
1. Find **real zeros** of functions
2. Find **points of intersection** of graphs
3. Find **minima/maxima** of functions
4. Find **numerical solutions** to equations in one variable
5. Find **regression equations** (linear, quadratic, cubic, quartic, exponential, logarithmic, sinusoidal) and **plot residuals**
6. Perform **matrix operations** (multiplication, inverses)

> The CED stresses: technology does **not** replace algebra. On no-calc parts you must do zeros/solving by hand. Use the calculator only where it's allowed.

---

## 0. SET THIS BEFORE YOU TOUCH ANYTHING (the #1 silent score-killer)

**Angle mode:** Press `MODE`. The AP Precalc world defaults to **RADIAN** for analytic trig. But READ THE PROBLEM — if it gives degrees, switch to DEGREE. Wrong mode = every trig answer wrong with zero partial credit on MC.

- Rule of thumb: angles written as multiples of π → RADIAN. Angles like 30°, 45° → DEGREE.
- A modeling context (e.g., daylight hours, tides) is almost always **RADIAN**.

**Other quick setup:**
- `MODE` → make sure you're in **FUNC** (function) mode, not PAR/POL/SEQ.
- Clear old plots: `Y=` then clear any leftover equations; `2nd → Y=` (STAT PLOT) → turn off stray plots if you get "Invalid Dim" errors.

---

## 1. Graph a function & pick a sane window

1. `Y=` → type the function (use `X,T,θ,n` for x).
2. `ZOOM → 6` (ZStandard) for a quick −10..10 look.
3. Adjust with `WINDOW` (set Xmin/Xmax/Ymin/Ymax to fit the context — e.g., if t is years 0–20, set Xmin=0, Xmax=20).
4. `ZOOM → 0` (ZoomFit) auto-fits y to the current x-range — great when you've set a context domain.

**Exponents/fractions pitfalls:**
- `2^(x+1)` — **always parenthesize** the whole exponent. `2^x+1` means (2^x)+1.
- `(x+3)/(x-2)` — parenthesize numerator AND denominator.
- Negatives: use the **(-)** key for "negative," the `−` key only for subtraction. `(-)3^2` vs `-3^2` matters.

---

## 2. Find ZEROS (x-intercepts / roots)

`2nd → TRACE` (CALC) → **2: zero**
1. **Left Bound?** move cursor just left of the crossing, `ENTER`.
2. **Right Bound?** move just right, `ENTER`.
3. **Guess?** `ENTER`. → root appears at bottom.
- Repeat for each zero (do them one at a time).
- Use this to **solve any equation f(x)=0**.

## 3. Find INTERSECTION (solve f(x)=g(x))

Enter both as `Y1` and `Y2`. `2nd → TRACE` → **5: intersect**
1. **First curve?** `ENTER` (it's on Y1).
2. **Second curve?** `ENTER` (it's on Y2).
3. **Guess?** move near the crossing, `ENTER`. → x and y of intersection.
- This is *the* move for "for what value does A equal B" modeling questions. Faster and safer than rearranging to =0.

## 4. Find MAX / MIN

`2nd → TRACE` → **4: maximum** (or **3: minimum**)
1. Left Bound, Right Bound, Guess (same 3-step rhythm as zeros).
- Use for "greatest value," "lowest point," "when is the population highest," etc.
- Gives both the x (when) and y (the value).

## 5. Solve an equation NUMERICALLY (no graph needed)

**Easiest = put both sides in Y= and use intersect (§3).** Alternative built-in solvers:
- `MATH → 0: Solver` (Equation Solver): enter as `0 = expression`, put cursor on X, `ALPHA → ENTER` (SOLVE). Give a guess near the root.
- `MATH → B: Solve(` (newer TI-84 Plus CE OS) for direct solving.

## 6. EVALUATE a function at a value

Three ways — fastest first:
- **Table:** `2nd → GRAPH` (TABLE); or `2nd → WINDOW` (TBLSET) → set Indpnt: Ask, then type x-values.
- **On the graph:** `2nd → TRACE → 1: value`, type the x, `ENTER`.
- **Direct:** store the value, `5 → X` (`STO►`), then type the expression on the home screen.

---

## 7. REGRESSIONS — the modeling FRQ (Q2) workhorse

This is the single most testable calculator skill for FRQ Q2 (non-periodic modeling). You must be **fluent** at: enter data → run regression → write the model → use it.

### One-time setup
`2nd → 0` (CATALOG) → scroll to **DiagnosticOn** → `ENTER` `ENTER` (turns on r and r² so you can judge fit).

### Enter the data
1. `STAT → 1: Edit`
2. Type x-values into **L1**, y-values into **L2** (line them up!).
3. To clear a list first: arrow up onto the **L1** header → `CLEAR` → `ENTER` (do NOT press DEL — that deletes the list).

### Run the regression
`STAT → CALC →` pick the model:

| Model | Menu item | Use when data is… |
|---|---|---|
| Linear | **4: LinReg(ax+b)** | constant rate / straight-line |
| Quadratic | **5: QuadReg** | one hump/valley, symmetric |
| Cubic | **6: CubicReg** | one S-curve / 2 turns |
| Quartic | **7: QuartReg** | up to 3 turns |
| Exponential | **0: ExpReg** | constant % growth/decay |
| Logarithmic | **9: LnReg** | fast then flattening |
| Sinusoidal | **C: SinReg** | repeating waves (rare on calc FRQ; periodic FRQ Q3 is *no-calc*) |

**Pro move (so it auto-stores into Y1):** after choosing, the screen shows `LinReg(ax+b)`. Add the store target:
`LinReg(ax+b) L1, L2, Y1` — get Y1 via `VARS → Y-VARS → 1:Function → 1:Y1`. Then `ENTER`. Now the model is graphed and usable for zero/intersect/value.

### Read & write the model
- The screen gives `a`, `b`, (`c`, `d`…). Write the equation **with at least 3 decimal places** — round only your final answer, never mid-problem. (FRQ rubrics deduct for premature rounding.)
- Example output → write `y = 2.413(1.057)^x` for ExpReg, or `y = 0.842x² − 3.11x + 5.6` for QuadReg.

### Residuals (the CED explicitly expects this)
After any regression, the calculator stores residuals in a list called **RESID**.
- Quick plot: `2nd → Y=` (STAT PLOT) → Plot1 On → Type: scatter → Ylist = **RESID** (`2nd → STAT → RESID`) → `ZOOM 9` (ZoomStat).
- **Judging fit:** random/patternless residuals = good model; a clear curve/pattern in residuals = wrong model type. You may have to justify your model choice this way in writing.

### Then USE the model
Almost every modeling FRQ follows with: "predict the value at x = …" or "find when y = …". Do **not** retype the model — it's in Y1:
- Predict a value → Table or `CALC → value` (§6).
- Find when it hits a target → store the target as Y2 and `intersect` (§3), or use `zero` on Y1 − target.

---

## 8. Trig on the calculator (right mode = right answer)

- **Evaluate:** check MODE first. `SIN(π/6)` in RADIAN = 0.5; in DEGREE you'd type `SIN(30)`.
- **Inverse trig:** `2nd → SIN/COS/TAN` gives sin⁻¹/cos⁻¹/tan⁻¹. Output is an **angle** — in the current mode's units. The calculator returns only the **principal value**; for a modeling context you may need to add the period or reflect to get the angle they want.
- **No `csc/sec/cot` keys:** compute as reciprocals — `csc(x)=1/sin(x)`, `sec(x)=1/cos(x)`, `cot(x)=1/tan(x)`. Parenthesize: `1/sin(x)`.
- **π:** use the `2nd → ^` (π) key, not 3.14.
- Note: the **periodic modeling FRQ (Q3) is NO-calculator** — so practice sinusoids (amplitude, midline, period, phase shift) by hand. The calculator helps you *check*, not solve, those.

---

## 9. Matrices (Units allow it; lighter weight on exam)

`2nd → x⁻¹` (MATRIX) → **EDIT** to enter `[A]`, `[B]` (set dimensions first).
- Multiply: home screen `[A][B]`.
- Inverse: `[A]` then `x⁻¹` key.
- Used for linear-transformation / state-prediction problems.

---

## 10. Common pitfalls that quietly cost points

- **Wrong angle mode** — re-check `MODE` at the start of every trig problem. The biggest avoidable loss.
- **Rounding too early** — keep full precision in the calc; round only the final reported answer to **3 decimals** (state your rounding on FRQs).
- **Missing parentheses** on exponents, fractions, and negatives (§1).
- **"ERR: NO SIGN CHANGE"** on zero/solver — your bounds don't actually bracket a root; re-bracket so the function changes sign across the interval.
- **"ERR: INVALID DIM"** — a leftover STAT PLOT is on with empty lists; turn off plots (`2nd Y=`).
- **"ERR: WINDOW RANGE"** — Xmin ≥ Xmax (or Ymin ≥ Ymax); fix the WINDOW.
- **Picking the wrong regression** — let the **context** (constant rate? constant %? waves?) and **residual pattern** decide, not just r².
- **Forgetting to show work on FRQs** — even with a calculator, write what you did: "Using SinReg / zero feature, x ≈ …". A bare number can lose justification points.
- **Domain mismatch in modeling** — set your WINDOW/table to the problem's real domain (years, hours), not −10..10.
- **Degree-vs-radian on inverse trig** — sin⁻¹ output is in whatever mode you're in; double-check.
- **Deleting a list with DEL** instead of clearing it — re-create with `STAT → 5: SetUpEditor`.

---

## 11. 60-second pre-exam calculator checklist
1. `MODE` → confirm **RADIAN** (switch per problem if degrees).
2. `MODE` → **FUNC** mode.
3. `Y=` cleared of old equations.
4. `2nd Y=` → all STAT PLOTS off (unless doing residuals).
5. `DiagnosticOn` set (for r, r²).
6. Fresh batteries / charged.
7. Know the 3-step rhythm cold: **Left bound → Right bound → Guess** (works for zero, max, min, intersect).

---

*Verified against the College Board AP Precalculus Course and Exam Description (effective through May 2026) and AP Central exam pages. Button paths are for the TI-84 Plus / TI-84 Plus CE; TI-Nspire and Casio equivalents differ in menus but have all six required capabilities.*
