# Math — Advanced Math (Digital SAT)

**Why this matters for your score:** Advanced Math is ~**35% of the Math section** (the biggest math domain, tied with Algebra) — and it's where the *harder* Module-2 questions cluster. Master quadratics + functions + exponentials and you unlock the high-scoring half of Math. You finished Algebra 2, so this is mostly *recognition + accuracy*, not new learning. Desmos makes many of these near-instant.

---

## The must-know concepts

### 1. Quadratics — the three forms (know what each one *hands you*)
- **Standard:** `y = ax² + bx + c` → c is the y-intercept; vertex x = **−b/(2a)**.
- **Factored:** `y = a(x − p)(x − q)` → **roots/x-intercepts** are p and q (read them off instantly).
- **Vertex:** `y = a(x − h)² + k` → **vertex (h, k)**; axis of symmetry x = h.
**Discriminant** `b² − 4ac`: >0 → 2 real solutions; =0 → 1 (double) root; <0 → no real solutions.
**Worked example:** Number of real solutions of `2x² + 3x + 5 = 0`? → `b²−4ac = 9 − 40 = −31 < 0` → **none**.
**#1 trap:** mixing up which form gives what. If a question asks for the *vertex/min/max*, you want vertex form (or x = −b/2a); for *roots*, factored form.
**Desmos shortcut:** type the equation, read the x-intercepts (roots), vertex, and y-intercept straight off the graph. For "number of solutions," graph and count crossings.

### 2. Solving quadratics
Factoring → zero-product; or the **quadratic formula** `x = (−b ± √(b²−4ac)) / 2a`; or completing the square (for vertex). **Desmos: just graph and read the zeros** — fastest for ugly numbers.
**#1 trap:** forgetting the **± / second solution**, or sign slips completing the square.

### 3. Function notation, evaluation & transformations
`f(x)` is a machine: `f(3)` means plug in 3. `f(x) + k` shifts up k; `f(x − h)` shifts **right** h (backwards!); `−f(x)` flips over x-axis; `a·f(x)` stretches.
**Worked example:** If `f(x) = x² − 4` and `g(x) = f(x + 1)`, then `g(x) = (x+1)² − 4`. `g(2) = 9 − 4 = 5`.
**#1 trap:** inside-the-parentheses shifts are **horizontal and reversed** (`f(x−3)` → right 3).

### 4. Nonlinear systems
A line and a parabola (or two curves). Solve by substitution, or **Desmos: graph both, read intersection points**. "How many solutions?" = number of intersections.
**Worked example:** `y = x²` and `y = x + 2` → `x² = x + 2` → `x² − x − 2 = 0` → `(x−2)(x+1)=0` → x = 2, −1 → **2 solutions** (2,4) and (−1,1).

### 5. Exponential functions & growth/decay
`y = a · b^x`: **a** = starting value, **b** = growth factor. b > 1 → growth; 0 < b < 1 → decay. Percent growth r%: b = 1 + r/100; decay: b = 1 − r/100.
**Worked example:** $500 grows 4%/year → `y = 500(1.04)^t`. Decays 4%/year → `500(0.96)^t`.
**#1 trap:** confusing linear (adds a constant each step) vs exponential (multiplies by a constant each step); and using r instead of 1 ± r as the base.

### 6. Polynomials & rational expressions
Factor; **zeros** are where each factor = 0. A factor `(x − r)` ↔ root r ↔ the graph crosses/touches at x = r. **Remainder/factor theorem:** `(x − r)` is a factor ⇔ `f(r) = 0`.
**#1 trap:** with rational expressions, watch values that make a denominator 0 (excluded).

### 7. Radicals & rational exponents
`√x = x^(1/2)`, `x^(m/n) = ⁿ√(xᵐ)`. Solve radical equations by isolating and squaring — **then check for extraneous solutions** (squaring can create fake answers).
**#1 trap:** forgetting to check extraneous roots after squaring.

---

## Graduated practice (try, then check) — [C] = Desmos useful
**P1.** The function `f(x) = (x − 3)(x + 5)`. What is the x-coordinate of the vertex?
**P2.** `[grid-in]` `x² − 6x + 8 = 0`. What is the **sum** of the solutions?
**P3.** If `f(x) = 2x² − 8`, for what value(s) of x does `f(x) = 0`?
**P4 [C].** How many real solutions does `y = x² + 2` and `y = 1` share?
**P5.** A population of 200 bacteria triples every hour. Write the model and find the count after 3 hours.
**P6.** If `g(x) = x²` and `h(x) = g(x − 2) + 3`, what is `h(5)`?
**P7 [C].** Solve `x² + 4x − 6 = 2x + 2` (give all solutions, rounded to 0.01 if needed).
**P8.** `√(x + 6) = x`. Solve and check for extraneous roots.
**P9.** `f(x) = 2x² − 12x + 7`. What is the **minimum** value of `f`?
**P10.** `g(x) = 3^x` and `g(a) = 81`. What is `g(a + 1)`? `[GI]`
**P11.** A culture of 50 cells doubles every 6 hours. How many cells after 30 hours? `[GI]`
**P12.** `p(x) = x³ − 4x² + x + 6`, and `p(3) = 0`. Find **all** the roots.

### Answers
- **P1:** vertex x = average of roots = (3 + (−5))/2 = **−1**.
- **P2:** sum of roots = −b/a = **6** (roots are 2 and 4). *(Trick: you don't even need to factor — sum = −b/a.)*
- **P3:** `2x² = 8 → x² = 4 → x = ±2`.
- **P4:** `x² + 2 = 1 → x² = −1` → **0** real solutions (parabola sits above the line).
- **P5:** `y = 200·3^t`; after 3 hrs = `200·27 =` **5400**.
- **P6:** `h(5) = g(3) + 3 = 9 + 3 =` **12**.
- **P7:** `x² + 2x − 8 = 0 → (x+4)(x−2)=0 → x = −4, 2`.
- **P8:** square: `x + 6 = x² → x² − x − 6 = 0 → (x−3)(x+2)=0 → x = 3 or −2`. Check: x = 3 works (√9 = 3); x = −2 fails (√4 = 2 ≠ −2). **x = 3 only.**
- **P9:** **−11.** Vertex at x = −b/2a = 12/4 = **3**, then f(3) = 2(9) − 36 + 7 = **−11**. Since a = 2 > 0 the parabola opens **up**, so the vertex is a minimum. *(Check either side: f(2) = −9 and f(4) = −9, both above −11.)* *#1 trap: answering **3** — that's *where* the minimum happens, not the minimum value.*
- **P10:** **243.** `3^a = 81` so a = 4, and `g(5) = 3^5 = 243`. *Faster: g(a+1) = 3^(a+1) = 3^a · 3 = 81 · 3 = **243** — you never need to find a.*
- **P11:** **1600.** 30 ÷ 6 = **5** doublings → `50 · 2^5 = 50 · 32 =` **1600**. *#1 trap: using 30 as the exponent. The exponent is the number of **doubling periods**, not the number of hours.*
- **P12:** **x = 3, 2, −1.** `p(3) = 27 − 36 + 3 + 6 = 0`, so `(x − 3)` is a factor. Divide it out: `x³ − 4x² + x + 6 = (x − 3)(x² − x − 2) = (x − 3)(x − 2)(x + 1)`. Roots **3, 2, −1** — all three check to 0. *#1 trap: stopping at x = 3 once you've confirmed the given root; the question asks for **all** of them.*

## Don't get these wrong
1. **Roots vs vertex** — use factored form for roots, vertex form / −b/2a for the vertex.
2. **Sum of roots = −b/a, product = c/a** — huge time-savers; you often don't need to factor.
3. **Exponential base** = 1 ± rate, not the rate itself.
4. **Check extraneous roots** after squaring.
5. **Desmos** the messy ones — graph and read zeros/intersections instead of grinding algebra.
