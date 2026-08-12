# Unit 4: Functions Involving Parameters, Vectors, and Matrices — Express Pack

> **Important:** This unit is **NOT on the AP exam** (the AP Precalculus exam tests Units 1–3 only). You need this for the **class grade (the A)**, not for AP-format FRQ drilling. So this pack is the most condensed of the set: learn the concepts and the mechanics, do the practice, move on. No timed-FRQ rehearsal needed.

---

## 1. Why it matters / exam weight

Pure **class-test material**: parametric equations, conics, vectors, and matrices. It's mechanical and formula-driven — the good news is that means it's **very learnable fast**: nail the formulas + plug-and-chug, and these chapter tests are easy A's. Zero AP-exam weight.

---

## 2. The must-know concepts

### A. Parametric functions

**Plain language:** Instead of `y = f(x)`, both `x` and `y` are written in terms of a third variable `t` (often "time"): `x = f(t)`, `y = g(t)`. As `t` increases, the point `(x, y)` traces a path — this captures **direction and timing**, which a plain `y = f(x)` can't.

**Key rules:**
- **Eliminate the parameter** to get a regular x-y equation: solve one equation for `t`, substitute into the other.
- **Direction of motion:** plug in increasing `t` values; the order of points shows which way the curve is traced.

**Worked example:** `x = t + 1`, `y = t² ` for `t` in `[-2, 2]`. Eliminate `t`:
- From the first: `t = x − 1`.
- Substitute: `y = (x − 1)²`. → a parabola with vertex at `(1, 0)`.
- Direction: at `t = −2`, `(x,y) = (−1, 4)`; at `t = 0`, `(1, 0)`; at `t = 2`, `(3, 4)`. So it moves **left-to-right** through the vertex.

**#1 mistake:** Forgetting the **domain restriction**. The parameter's range limits which part of the curve exists. Here `t ∈ [−2,2]` means `x ∈ [−1, 3]` only — not the whole parabola.

---

### B. Parametric rates of change (concept only, no derivatives needed)

**Plain language:** In a parametric path, `x` and `y` each change as `t` changes. Compare their **average rates of change over a `t`-interval**.

**Key rule:** Average rate of change of `x` (or `y`) on `[t₁, t₂]` = `(x(t₂) − x(t₁)) / (t₂ − t₁)`. The *overall* direction tendency uses both: if `y` is increasing while `x` is increasing, the path goes up-and-right.

**Worked example:** `x = t²`, `y = 3t`. On `t ∈ [1, 3]`:
- ARoC of `x` = `(9 − 1)/(3 − 1) = 4`.
- ARoC of `y` = `(9 − 3)/(3 − 1) = 3`.
- Both positive → point moves right and up over this interval.

**#1 mistake:** Treating `t` like `x`. The rate of `y` with respect to `t` is **not** the slope of the curve; it's how fast `y` changes per unit `t`.

---

### C. Parametric circles & lines (memorize these templates)

**Key rules:**
- **Circle**, center `(h, k)`, radius `r`:  `x = h + r·cos t`, `y = k + r·sin t`, `t ∈ [0, 2π)`.
- **Line** through `(x₀, y₀)` with direction `(a, b)`:  `x = x₀ + a·t`, `y = y₀ + b·t`.

**Worked example:** Circle centered `(2, −1)`, radius 3:
`x = 2 + 3cos t`, `y = −1 + 3sin t`. Check: `(x−2)² + (y+1)² = 9cos²t + 9sin²t = 9`. ✓

**#1 mistake:** Putting `sin` on `x` and `cos` on `y`, or forgetting to add the center `(h, k)`. Convention: `cos → x`, `sin → y`.

---

### D. Implicitly defined functions

**Plain language:** An equation like `x² + y² = 25` defines a relationship between `x` and `y` without `y` being isolated. It may **fail the vertical line test** (not a function), so you often split it into pieces.

**Key rule:** To check if it's a function of `x`, see whether each `x` gives **one** `y`. To find `y` explicitly, solve for `y` (may yield `±`).

**Worked example:** `x² + y² = 25` → `y = ±√(25 − x²)`. The `+` branch is the top semicircle (a function); the full circle is **not** a function of `x`.

**#1 mistake:** Dropping the `±` when solving — that silently throws away half the graph.

---

### E. Conic sections (the formula table — memorize)

**Plain language:** Curves you get from slicing a cone: circle, ellipse, parabola, hyperbola. You identify them from their standard-form equations.

| Conic | Standard form (centered at `(h,k)`) | Tell-tale sign |
|---|---|---|
| **Circle** | `(x−h)² + (y−k)² = r²` | both squared, **same coeff**, `+` |
| **Ellipse** | `(x−h)²/a² + (y−k)²/b² = 1` | both squared, **different** coeffs, **same sign**, `+` |
| **Parabola** | `y = a(x−h)² + k` (or `x = a(y−k)²+h`) | **only one** variable squared |
| **Hyperbola** | `(x−h)²/a² − (y−k)²/b² = 1` | both squared, **opposite signs** (a `−`) |

**Quick ID from `Ax² + Cy² + … = 0`:** compare `A` and `C`: equal → circle; same sign, unequal → ellipse; one is zero → parabola; opposite signs → hyperbola.

**Worked example — complete the square:** `x² + y² − 6x + 4y − 12 = 0`.
- Group: `(x² − 6x) + (y² + 4y) = 12`.
- Complete squares: `(x² − 6x + 9) + (y² + 4y + 4) = 12 + 9 + 4`.
- → `(x − 3)² + (y + 2)² = 25`. **Circle**, center `(3, −2)`, radius `5`.

**#1 mistake:** When completing the square, forgetting to **add the same number to the right side**. And missing that **equal coefficients = circle** vs. unequal = ellipse.

---

### F. Vectors

**Plain language:** A vector has **magnitude (length) and direction**. Written in components `⟨a, b⟩` (from initial to terminal point).

**Key rules:**
- **From two points** `P(x₁,y₁)` to `Q(x₂,y₂)`:  `⟨x₂−x₁, y₂−y₁⟩`.
- **Magnitude:**  `‖⟨a, b⟩‖ = √(a² + b²)`.
- **Add / subtract:** componentwise:  `⟨a,b⟩ + ⟨c,d⟩ = ⟨a+c, b+d⟩`.
- **Scalar multiple:**  `k⟨a, b⟩ = ⟨ka, kb⟩`.
- **Unit vector** (length 1) in direction of **v**:  `v / ‖v‖`.
- **Dot product:**  `⟨a,b⟩ · ⟨c,d⟩ = ac + bd` (a scalar). Vectors are **perpendicular** when dot product = 0.

**Worked example:** `u = ⟨3, −4⟩`, `v = ⟨1, 2⟩`.
- `u + v = ⟨4, −2⟩`.
- `‖u‖ = √(9 + 16) = √25 = 5`.
- Unit vector of `u` = `⟨3/5, −4/5⟩`.
- `u · v = (3)(1) + (−4)(2) = 3 − 8 = −5` (not perpendicular).

**#1 mistake:** Subtracting points in the wrong order (`initial − terminal` instead of `terminal − initial`) — flips the vector's direction.

---

### G. Vector-valued functions

**Plain language:** A function whose **output is a vector** that changes with `t`: `p(t) = ⟨x(t), y(t)⟩`. This is just the parametric idea written in vector form — the position of a moving object at time `t`.

**Key rule:** Evaluate by plugging in `t`. The path traced is identical to the parametric curve `x = x(t)`, `y = y(t)`.

**Worked example:** `p(t) = ⟨2t, t² − 1⟩`. At `t = 3`: `p(3) = ⟨6, 8⟩` — the object is at point `(6, 8)`.

**#1 mistake:** Confusing the **position vector** (where it is) with a direction/velocity vector. `p(t)` here gives location.

---

### H. Matrices: operations

**Plain language:** A rectangular grid of numbers. Add/subtract entry-by-entry; multiply rows-by-columns.

**Key rules:**
- **Add / subtract:** only if **same dimensions**; do it entrywise.
- **Scalar multiply:** multiply every entry.
- **Matrix multiply** `A·B`: defined only when **columns of A = rows of B**. Entry `(i,j)` = (row `i` of A) · (column `j` of B). **Not commutative:** `AB ≠ BA` in general.

For 2×2:
`[[a,b],[c,d]] · [[e,f],[g,h]] = [[ae+bg, af+bh], [ce+dg, cf+dh]]`.

**Worked example:** `[[1,2],[3,4]] · [[5,6],[7,8]]`:
- Top-left: `1·5 + 2·7 = 19`. Top-right: `1·6 + 2·8 = 22`.
- Bottom-left: `3·5 + 4·7 = 43`. Bottom-right: `3·6 + 4·8 = 50`.
- → `[[19, 22], [43, 50]]`.

**#1 mistake:** Multiplying matrices **entrywise** (like addition). Matrix multiplication is row-into-column dot products, and **order matters**.

---

### I. Determinant & inverse of a 2×2 matrix

**Key rules** for `A = [[a, b], [c, d]]`:
- **Determinant:**  `det(A) = ad − bc`.
- **Inverse:**  `A⁻¹ = (1/det(A)) · [[d, −b], [−c, a]]` — **swap a↔d, negate b and c, divide by det.**
- **No inverse** when `det(A) = 0` (matrix is "singular").
- The **identity** matrix `I = [[1,0],[0,1]]`: `A·I = A`, and `A·A⁻¹ = I`.

**Worked example:** `A = [[4, 3], [2, 1]]`.
- `det = (4)(1) − (3)(2) = 4 − 6 = −2`.
- `A⁻¹ = (1/−2)·[[1, −3], [−2, 4]] = [[−1/2, 3/2], [1, −2]]`.
- Check `det ≠ 0` ✓, so the inverse exists.

**#1 mistake:** Forgetting to **divide by the determinant**, or mis-placing the swap/negate pattern. Memorize: *"swap the diagonal, negate the off-diagonal, over det."*

---

### J. Linear transformations & matrices as functions

**Plain language:** A 2×2 matrix can act as a **function** that takes an input vector and outputs a transformed vector: `A·v`. Geometrically it rotates / scales / reflects / shears the plane. The **determinant = area scaling factor** (and a negative det means orientation flips).

**Key rule:** Apply the transformation by computing `A·⟨x, y⟩` (treat the vector as a column).

**Worked example:** `A = [[0, −1], [1, 0]]` (a 90° rotation). Transform `v = ⟨2, 0⟩`:
`A·v = ⟨(0)(2) + (−1)(0), (1)(2) + (0)(0)⟩ = ⟨0, 2⟩`. → point `(2,0)` rotated 90° CCW to `(0, 2)`. ✓

**#1 mistake:** Writing the vector as a row and multiplying on the wrong side. For `A·v`, the vector is a **column on the right**.

---

### K. Matrices modeling contexts (transition / Leslie-style)

**Plain language:** A matrix can encode how a system moves between states each step (e.g., population, market share). Multiply the **state vector** by the **transition matrix** to advance one step; multiply repeatedly (or use `Aⁿ`) for `n` steps.

**Key rule:** `next state = A · current state`. For `n` steps: `Aⁿ · (initial state)`.

**Worked example:** City/suburb populations. `A = [[0.9, 0.2], [0.1, 0.8]]`, start `⟨100, 50⟩` (city, suburb):
- After 1 step: `A·⟨100,50⟩ = ⟨0.9·100 + 0.2·50, 0.1·100 + 0.8·50⟩ = ⟨100, 50⟩`... let's recompute: `⟨90 + 10, 10 + 40⟩ = ⟨100, 50⟩`. (This start happens to be steady.) Try start `⟨100, 0⟩`: `A·⟨100,0⟩ = ⟨90, 10⟩` — 90 stay in city, 10 move to suburb.

**#1 mistake:** Multiplying in the wrong order or transposing the transition matrix — columns must match how the state vector is laid out (here columns = "where you're coming from").

---

## 3. Graduated practice set

> Work each, then check. (Calculator fine for arithmetic on the harder ones; the no-calc skill here is setting up the right formula.)

**P1 (easy).** Find the magnitude of `v = ⟨6, 8⟩`.
<details><summary>Solution</summary>`‖v‖ = √(6² + 8²) = √(36+64) = √100 = 10`.</details>
<!-- key: 10 -->
<!-- accept: |v| = 10 -->
<!-- accept: ||v|| = 10 -->
<!-- topic: 4.6 -->

**P2 (easy).** Compute `det([[5, 2], [3, 4]])`.
<details><summary>Solution</summary>`(5)(4) − (2)(3) = 20 − 6 = 14`.</details>
<!-- key: 14 -->
<!-- accept: det = 14 -->
<!-- topic: 4.9 -->

**P3 (easy).** Eliminate the parameter: `x = 2t`, `y = t − 3`.
<details><summary>Solution</summary>`t = x/2` → `y = x/2 − 3`. A line, slope ½, y-intercept −3.</details>
<!-- key: y = x/2 - 3 -->
<!-- accept: y = 0.5x - 3 -->
<!-- accept: y = (1/2)x - 3 -->
<!-- accept: y = (x/2) - 3 -->
<!-- accept: y = x/2 - 3, slope 1/2, y-intercept -3 -->
<!-- topic: 4.1 -->

**P4 (medium).** `u = ⟨2, −3⟩`, `w = ⟨−1, 4⟩`. Find `2u − w` and `u · w`.
<details><summary>Solution</summary>`2u = ⟨4, −6⟩`; `2u − w = ⟨4−(−1), −6−4⟩ = ⟨5, −10⟩`.  Dot: `(2)(−1)+(−3)(4) = −2 −12 = −14`.</details>
<!-- topic: 4.6 -->
<!-- note: deliberately NOT keyed. Half the answer is a vector, and its components are separated by a comma — which is also how a compound key separates its parts, so "<5,-10>" cannot be one part. Nor can the bracket style be pinned down: <5,-10>, (5,-10) and 5i-10j are all the same right answer. -->

**P5 (medium).** Write parametric equations for the circle centered `(−3, 4)` with radius 6.
<details><summary>Solution</summary>`x = −3 + 6cos t`, `y = 4 + 6sin t`, `t ∈ [0, 2π)`.</details>
<!-- topic: 4.3 -->
<!-- note: deliberately NOT keyed. "x = -3 + 6cos t" is equally correctly typed 6cos(t) - 3, 6*cos(t)-3, -3+6cos(t), and the pair has to be given together. -->

**P6 (medium).** Identify the conic and give its center/radius: `4x² + 4y² − 16x + 8y − 20 = 0`.
<details><summary>Solution</summary>Both squared, equal coeffs (4 and 4) → **circle**. Divide by 4: `x² + y² − 4x + 2y − 5 = 0`. Complete the square: `(x−2)² + (y+1)² = 5 + 4 + 1 = 10`. Center `(2, −1)`, radius `√10`.</details>
<!-- topic: 4.5 -->
<!-- note: deliberately NOT keyed. The centre is a parenthesised pair whose comma cannot sit inside one part of a compound key, and the radius is sqrt(10) in four typeable spellings. -->

**P7 (medium).** Find the inverse of `A = [[2, 1], [5, 3]]`.
<details><summary>Solution</summary>`det = (2)(3) − (1)(5) = 1`. `A⁻¹ = (1/1)·[[3, −1], [−5, 2]] = [[3, −1], [−5, 2]]`.</details>
<!-- topic: 4.9 -->
<!-- note: deliberately NOT keyed. A matrix answer is commas and brackets all the way down — [[3,-1],[-5,2]], [3 -1; -5 2] and a two-line layout are the same right answer. -->

**P8 (medium).** Multiply `[[1, 0], [2, 3]] · [[4, 5], [6, 7]]`.
<details><summary>Solution</summary>Row1: `[1·4+0·6, 1·5+0·7] = [4, 5]`. Row2: `[2·4+3·6, 2·5+3·7] = [8+18, 10+21] = [26, 31]`. → `[[4, 5], [26, 31]]`.</details>
<!-- topic: 4.8 -->
<!-- note: deliberately NOT keyed — a matrix answer, same as P7. -->

**P9 (exam-level).** Identify the conic: `9x² − 4y² + 36x − 8y − 4 = 0`. (Just classify and give the center.)
<details><summary>Solution</summary>`x²` coeff `+9`, `y²` coeff `−4` → **opposite signs → hyperbola**. Group: `9(x²+4x) − 4(y²+2y) = 4` → `9(x+2)² − 4(y+1)² = 4 + 36 − 4 = 36`. Divide by 36: `(x+2)²/4 − (y+1)²/9 = 1`. **Hyperbola**, center `(−2, −1)`, opens left/right.</details>
<!-- topic: 4.5 -->
<!-- note: deliberately NOT keyed — the centre is a parenthesised pair, as in P6. -->

**P10 (exam-level).** A particle moves with `p(t) = ⟨t − 1, t²⟩`. (a) Where is it at `t = 2`? (b) Find the average rate of change of the y-coordinate on `[0, 2]`. (c) Eliminate the parameter.
<details><summary>Solution</summary>(a) `p(2) = ⟨1, 4⟩`, i.e. point `(1, 4)`. (b) `(y(2)−y(0))/(2−0) = (4 − 0)/2 = 2`. (c) `t = x + 1` → `y = (x+1)²`.</details>
<!-- topic: 4.7 -->
<!-- note: not keyable — three lettered sub-parts. (Its (b) is topic 4.2, which no practice item in this pack covers.) -->

**P11 (exam-level).** Transition matrix `A = [[0.7, 0.4], [0.3, 0.6]]`, current state `⟨60, 40⟩`. Find the next state.
<details><summary>Solution</summary>`A·⟨60,40⟩ = ⟨0.7·60 + 0.4·40, 0.3·60 + 0.6·40⟩ = ⟨42 + 16, 18 + 24⟩ = ⟨58, 42⟩`.</details>
<!-- topic: 4.11 -->
<!-- note: deliberately NOT keyed — a vector answer, as in P4. -->

**P12 (exam-level).** Apply the linear transformation `A = [[2, 0], [0, 3]]` (a scaling) to the unit square's corner `⟨1, 1⟩`, and state the area scaling factor.
<details><summary>Solution</summary>`A·⟨1,1⟩ = ⟨2, 3⟩`. Area scale factor = `det(A) = (2)(3) − 0 = 6` (the unit square's area is multiplied by 6).</details>
<!-- topic: 4.10 -->
<!-- note: deliberately NOT keyed — half the answer is the vector <2,3>, as in P4. -->

---

## 4. Quick self-check (rapid Q&A)

1. **Q:** Magnitude formula for `⟨a, b⟩`? **A:** `√(a² + b²)`.
2. **Q:** Two vectors are perpendicular when their ____ is zero. **A:** dot product.
3. **Q:** `det([[a,b],[c,d]])` = ? **A:** `ad − bc`.
4. **Q:** A 2×2 matrix has **no** inverse exactly when ____. **A:** its determinant = 0.
5. **Q:** In `Ax² + Cy² + … = 0`, opposite signs on A and C means which conic? **A:** hyperbola.
6. **Q:** Parametric circle of radius `r`, center `(h,k)`? **A:** `x = h + r cos t`, `y = k + r sin t`.
7. **Q:** Is matrix multiplication commutative? **A:** No — `AB ≠ BA` in general.
8. **Q:** How do you eliminate a parameter? **A:** Solve one equation for `t`, substitute into the other.

---

## 5. "Don't get these wrong" — Unit 4 traps

1. **Matrix multiplication is NOT entrywise.** It's row-into-column dot products, and **order matters** (`AB ≠ BA`). The #1 unit error.
2. **Inverse formula — don't forget to divide by the determinant**, and get the swap/negate pattern right: swap the main diagonal, negate the off-diagonal, divide by `det`.
3. **Completing the square for conics:** add the completing number to **both sides**. And equal squared-coefficients = **circle**, unequal-but-same-sign = **ellipse** (students mix these up).
4. **`cos → x`, `sin → y`** for parametric circles, and **add the center**. Don't swap them.
5. **Vector from points = terminal − initial.** Reversing the order flips the vector.
6. **Keep the `±` when solving an implicit equation for `y`** — otherwise you lose half the curve, and may wrongly call a non-function a function.
7. **Parametric domain:** the range of `t` restricts the curve — don't graph the whole underlying shape if `t` is bounded.
8. **Determinant = area scaling factor** of a linear transformation (negative det → orientation flips). Easy conceptual question to miss.

---

*File covers all 14 CED topics (4.1–4.14) condensed for class mastery. Not AP-exam tested — learn it for the A and move on.*
