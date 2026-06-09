# Desmos Calculator Skills for SAT Math

**Why this matters for your score:** On the Digital SAT, the Desmos graphing calculator is built into Bluebook and allowed on *every* Math question. A student who can graph fast turns 60-second algebra problems into 10-second "look at the screen" problems — and never makes a sign error. For a 1500+ target, Desmos fluency is worth roughly 3-6 extra Math questions on a tight clock. Learn it by doing the questions below; the rule is taught on each miss.

> **How to use this:** Open the built-in Desmos at **desmos.com/calculator** and actually type every example. Do the practice sets, then check the worked answers. If you miss one, re-read the boxed rule above that question type. Don't read this like a book — keep the calculator open.

---

## 0. The 10 Desmos moves that matter (cheat sheet)

| You want to… | Do this in Desmos |
|---|---|
| Solve one equation | Move all to one side `= 0`, or graph both sides; read the **x-intercept / intersection** |
| Solve a system | Type both equations; click the **intersection dot** |
| Find zeros / roots | Graph; click where curve crosses x-axis |
| Find vertex / min / max | Graph; click the **turning point** |
| Evaluate f(5) | Define `f(x)=…`, then type `f(5)` on a new line |
| Solve an inequality | Graph with `<`, `>`, `≤`, `≥`; read the **shaded region** or compare two curves |
| Fit a line/curve to data | Type a **table**, then a regression like `y_1 ~ a x_1 + b` |
| Test a relationship with a parameter | Add a **slider** (type a letter like `a`); drag it |
| Find where two graphs meet at a specific y | Add the line `y = (number)` and click intersections |
| Read exact coordinates | **Click any point** — Desmos shows the (x, y) to high precision |

**Golden rule:** *If a question gives you an equation, a system, a "for what value of x," a vertex/max/min, or data — graph it. If it's a quick arithmetic or one-step plug-in, just do it by hand.* Deciding fast is the skill.

---

## 1. Solving a single equation by graphing

> **RULE — "Set it to zero OR graph both sides."** To solve `LEFT = RIGHT`:
> - **Method A (intersection):** Type `y = LEFT` and `y = RIGHT` as two lines. The **x-coordinate** of the intersection is your solution.
> - **Method B (zeros):** Rewrite as `LEFT − RIGHT = 0`, type `y = LEFT − RIGHT`, and read the **x-intercepts**.
>
> Method A is usually faster because you don't have to do algebra first.

### Worked Example 1 — Solve `2x + 7 = 3x − 5`
1. Line 1: `y = 2x + 7`
2. Line 2: `y = 3x - 5`
3. Click the intersection dot → Desmos shows `(12, 31)`.
4. **Answer: x = 12.** (The y-value 31 is irrelevant; only x is the solution.)

### Worked Example 2 — Solve `x² − 6x + 4 = 0` (the messy one)
By hand this needs the quadratic formula. In Desmos:
1. Type `y = x^2 - 6x + 4`
2. Click both x-intercepts → `(0.764, 0)` and `(5.236, 0)`.
3. **Answer: x ≈ 0.76 or x ≈ 5.24.** For a grid-in, click the point to read more decimals and enter `5.236`.

> **MISS-FIX:** If you typed both sides and got *no* intersection, the lines are parallel → **no solution**. If they're the same line (infinitely many intersections), → **infinitely many solutions**. SAT loves testing exactly this.

---

## 2. Solving systems by intersection

> **RULE — "Two equations, click the dot."** Type both equations exactly as given (any form: `y=`, standard form `Ax+By=C`, even a curve). Desmos draws both. Click the intersection point(s); the (x, y) shown is the solution to the system. For "how many solutions," just **count the intersection dots**.

### Worked Example 3 — Solve the system
`y = 2x − 1` and `y = x² − 4`
1. Line 1: `y = 2x - 1`
2. Line 2: `y = x^2 - 4`  *(type it as-is — Desmos handles it)*
3. Click intersections → `(3, 5)` and `(-1, -3)`.
4. **Answer:** (x, y) = (3, 5) and (−1, −3). If the question asks "what is the *positive* value of x," answer **3**. *(Check by hand: x²−4 = 2x−1 → x²−2x−3 = 0 → (x−3)(x+1)=0 → x = 3 or −1.)*

> **MISS-FIX:** Don't waste time substituting by hand. If the SAT asks for *only* one coordinate (e.g., "the value of y when x > 0"), read it straight off the dot. If it asks "how many real solutions," count dots: 0, 1, or 2.

---

## 3. Zeros, vertex, min/max

> **RULE — "Click the feature you need."** After graphing, Desmos labels special points when you click near them:
> - **x-intercepts (zeros/roots)** — where it crosses the x-axis.
> - **y-intercept** — where it crosses the y-axis (the constant when x=0).
> - **Vertex / minimum / maximum** — the turning point of a parabola or curve.
>
> The **vertex** answers "minimum value," "maximum height," "least cost," etc.

### Worked Example 4 — "A ball's height is `h = −16t² + 48t + 5`. What is its maximum height?"
1. Type `y = -16x^2 + 48x + 5` (use x for t; Desmos graphs in x).
2. Click the top turning point → `(1.5, 41)`.
3. **Answer: maximum height = 41** (at t = 1.5 s). The question asks for *height*, so answer **41**, not 1.5.

> **MISS-FIX — read the question's units:** The vertex gives *(x, y)*. "When is it highest?" → the **x**-value (1.5 s). "What is the highest it gets?" → the **y**-value (41). Mixing these up is the #1 Desmos error.

---

## 4. Evaluating functions (define once, reuse)

> **RULE — "Define f(x)=…, then type f(number)."** Once you write `f(x) = …` on one line, you can type `f(3)`, `f(-2)`, `f(a)` on later lines and Desmos prints the value. Great for "f(g(2))" composition and table-filling.

### Worked Example 5 — If `f(x) = 3x² − 5x + 2`, find `f(4) − f(1)`
1. Line 1: `f(x) = 3x^2 - 5x + 2`
2. Line 2: `f(4)` → Desmos shows `30`.
3. Line 3: `f(1)` → shows `0`.
4. **Answer: 30 − 0 = 30.** (Or just type `f(4) - f(1)` on one line → `30`.)

---

## 5. Inequalities

> **RULE — "Graph the inequality; read the shading."** Type the inequality directly (`y > 2x + 1`, `y ≤ x^2 − 4`). Desmos shades the solution region. For a **system of inequalities**, type both; the **overlap** (darkest region) is the solution set. To find boundary x-values for a one-variable inequality, graph both sides as curves and see **where one is above the other**.

### Worked Example 6 — "For what values of x is `x² − 4 < 0`?"
1. Type `y = x^2 - 4`.
2. See where the curve is **below** the x-axis (y < 0): between the roots.
3. Click roots → `(-2, 0)` and `(2, 0)`.
4. **Answer: −2 < x < 2.**

> **MISS-FIX:** "Below the x-axis" = the part where y is negative = your `< 0` solution. Strict `<` → open interval (don't include the endpoints); `≤` → include them.

---

## 6. Tables, sliders, and regressions (the data section)

> **RULE — "Data → table → regression."** Problem-Solving & Data Analysis often gives a scatterplot or table and asks for a line/curve of best fit, a prediction, or a rate. In Desmos:
> 1. Click **`+` → Table**. Enter the data in columns `x_1`, `y_1`.
> 2. On a new line, type a model with a **tilde** `~`:
>    - Line: `y_1 ~ a x_1 + b`
>    - Quadratic: `y_1 ~ a x_1^2 + b x_1 + c`
>    - Exponential: `y_1 ~ a b^{x_1}`
> 3. Desmos returns the best-fit parameters (`a`, `b`, …) and an `R²`.

> **RULE — Sliders for "which value makes it true."** If you type a letter Desmos doesn't recognize (like `a` in `y = a x + 3`), it offers **"add slider."** Click it, then drag `a` to see the line change live — perfect for "which value of k gives exactly one solution" questions (watch the curves until they just touch).

### Worked Example 7 — Best-fit prediction
Data: (1, 5), (2, 8), (3, 11), (4, 14). "Predict y when x = 10."
1. Table: `x_1 = 1,2,3,4` and `y_1 = 5,8,11,14`.
2. New line: `y_1 ~ a x_1 + b` → Desmos gives `a = 3, b = 2` (so `y = 3x + 2`).
3. New line: `3(10) + 2` → **32.**
4. **Answer: 32.**

> **MISS-FIX:** Use `~` (tilde), **not** `=`, for regression. With `=` Desmos thinks you're defining an equation and won't fit anything.

---

## 7. WHEN to use Desmos vs. by-hand (judgment = points)

| Use Desmos | Do it by hand (faster) |
|---|---|
| Quadratics / messy roots | One-step solve (e.g., `3x = 21`) |
| Any system of equations | Plug a given x into a formula |
| "Maximum / minimum / vertex" | Simplify an expression (no number wanted) |
| Data tables → line/curve of fit | Mean/median of a tiny list |
| "How many solutions?" | Percent / ratio you can do in your head |
| Inequalities with a region | Pure-symbol algebra ("solve for y in terms of x") |
| Anything where you'd otherwise factor | Geometry where Desmos can't draw the figure |

> **The 70-minute clock truth:** Desmos saves time on hard questions and *prevents arithmetic mistakes* on medium ones. But typing a graph for `12 + 8 = ?` wastes 15 seconds. Default to Desmos for **equations, systems, graphs, and data**; default to your head/pencil for **one-step arithmetic and symbol manipulation**.

---

## Practice Set A — Solve / systems / zeros (do in Desmos)

1. Solve `5x − 3 = 2x + 12`.
2. Solve `x² + x − 12 = 0`.
3. System: `y = −x + 4` and `y = x² − 2`. Find both solutions.
4. How many real solutions does `x² + 4 = 0` have?
5. The profit is `P = −2x² + 40x − 50`. What number of units x maximizes profit, and what is the max profit?
6. If `f(x) = 2^x`, find `f(5) − f(3)`.

## Practice Set B — Inequalities / data / judgment

7. For what values of x is `x² − 9 ≥ 0`?
8. Data: (0, 100), (1, 80), (2, 64), (3, 51.2). Fit `y_1 ~ a b^{x_1}` and predict y at x = 5 (round to nearest whole number).
9. For what value of k does `y = x² + k` touch the line `y = 4x` at exactly one point? (Hint: slider on k.)
10. Should you use Desmos for "Simplify `(3x²y)(2xy³)`"? Why or why not?

---

## Worked Answers

**A1.** Lines `y=5x-3`, `y=2x+12`; intersection `(5, 22)` → **x = 5.**

**A2.** Graph `y=x^2+x-12`; x-intercepts at `(-4,0)` and `(3,0)` → **x = −4 or x = 3.**

**A3.** Type both; intersections **(−3, 7)** and **(2, 2)**. *(By hand: −x+4 = x²−2 → x²+x−6 = 0 → (x+3)(x−2)=0 → x = −3 or 2; plug each into the line y = −x+4 → (−3, 7) and (2, 2). The clicked Desmos dots match.)*

**A4.** Graph `y=x^2+4`; it never crosses the x-axis → **0 real solutions.** (Vertex at (0,4), entirely above the axis.)

**A5.** Graph `y=-2x^2+40x-50`; vertex `(10, 150)` → **x = 10 units, max profit = 150.**

**A6.** Define `f(x)=2^x`; `f(5)=32`, `f(3)=8` → **32 − 8 = 24.**

**B7.** Graph `y=x^2-9`; it's ≥ 0 (on/above x-axis) outside the roots `(-3,0)`,`(3,0)` → **x ≤ −3 or x ≥ 3.** (Closed because of `≥`.)

**B8.** Table the four points; `y_1 ~ a b^{x_1}` gives `a = 100, b = 0.8` (it's `100·0.8^x`). At x = 5: `100(0.8)^5 = 32.768` → **33.**

**B9.** Graph `y=x^2+k` and `y=4x`; add a slider on `k`. Drag until they just touch (tangent) → at **k = 4** the parabola meets the line at exactly one point `(2, 8)`. (Check: x²+4 = 4x → x²−4x+4 = 0 → (x−2)²=0, one solution. ✓)

**B10.** **No — do it by hand.** It's pure symbol manipulation with no numeric answer to read off a graph: `(3x²y)(2xy³) = 6x³y⁴`. Desmos can't simplify an expression to a tidy monomial faster than you can. Save it for equations, graphs, and data.

---

### One-page mental checklist for test day
- See an **equation**? → graph both sides, click intersection.
- See a **system** or "**how many solutions**"? → type both, count/click dots.
- See **"maximum/minimum/vertex/greatest/least"**? → graph, click turning point, read the **right coordinate**.
- See a **table or scatterplot**? → table + `~` regression.
- See a **"for what value of k…"**? → slider.
- See **one-step arithmetic or pure algebra**? → pencil; don't open a graph.
- Always **click the point** to get exact decimals for grid-ins.
