# AP Precalculus — Must-Memorize Reference Sheet

**Why this matters:** AP Precalc gives you almost no formula sheet. Section I Part A (29 no-calculator questions, ~44% of your score) and FRQ Q3/Q4 (no calculator) assume you have these cold. Memorize this and you stop losing easy points. (Exam covers Units 1–3 only; Unit 4 is class-required but not tested.)

---

## 1. The Unit Circle (memorize this first)

Coordinates on the unit circle are **(cos θ, sin θ)**. `tan θ = sin θ / cos θ = y/x`.

| Degrees | Radians | cos (x) | sin (y) | tan |
|--------:|:-------:|:-------:|:-------:|:-------:|
| 0°   | 0      | 1            | 0            | 0          |
| 30°  | π/6    | √3/2         | 1/2          | √3/3      |
| 45°  | π/4    | √2/2         | √2/2         | 1          |
| 60°  | π/3    | 1/2          | √3/2         | √3        |
| 90°  | π/2    | 0            | 1            | undefined  |
| 120° | 2π/3   | −1/2         | √3/2         | −√3       |
| 135° | 3π/4   | −√2/2        | √2/2         | −1         |
| 150° | 5π/6   | −√3/2        | 1/2          | −√3/3     |
| 180° | π      | −1           | 0            | 0          |
| 210° | 7π/6   | −√3/2        | −1/2         | √3/3      |
| 225° | 5π/4   | −√2/2        | −√2/2        | 1          |
| 240° | 4π/3   | −1/2         | −√3/2        | √3        |
| 270° | 3π/2   | 0            | −1           | undefined  |
| 300° | 5π/3   | 1/2          | −√3/2        | −√3       |
| 315° | 7π/4   | √2/2         | −√2/2        | −1         |
| 330° | 11π/6  | √3/2         | −1/2         | −√3/3     |
| 360° | 2π     | 1            | 0            | 0          |

**Memory hooks:**
- **Sine values 0→90°** go `0, ½, √2/2, √3/2, 1` (i.e. √0/2, √1/2, √2/2, √3/2, √4/2). **Cosine is the same list reversed.**
- **Sign by quadrant — "All Students Take Calculus":** Q1 all +; Q2 **S**in +; Q3 **T**an +; Q4 **C**os +.
- **Reciprocals:** csc = 1/sin, sec = 1/cos, cot = 1/tan = cos/sin.
- **Reference angle** = acute angle to the x-axis; find the value there, then fix the sign by quadrant.

*Use it:* `cos(5π/6)` is Q2 → reference π/6 → cos = √3/2 → Q2 cos is negative → **−√3/2**.

---

## 2. Exponent Rules

For any base `a` (≠0) and real `m, n`:

| Rule | Formula |
|---|---|
| Product | aᵐ · aⁿ = aᵐ⁺ⁿ |
| Quotient | aᵐ / aⁿ = aᵐ⁻ⁿ |
| Power of a power | (aᵐ)ⁿ = aᵐⁿ |
| Power of a product | (ab)ⁿ = aⁿbⁿ |
| Zero exponent | a⁰ = 1 |
| Negative exponent | a⁻ⁿ = 1/aⁿ |
| Fractional exponent | a^(m/n) = ⁿ√(aᵐ) = (ⁿ√a)ᵐ |

*Use it:* `8^(2/3) = (³√8)² = 2² = 4`.

---

## 3. Logarithm Rules

`logₐ b = c` **means** `aᶜ = b`. (`ln = logₑ`, `log` with no base = log₁₀.)

| Rule | Formula |
|---|---|
| Product | logₐ(xy) = logₐx + logₐy |
| Quotient | logₐ(x/y) = logₐx − logₐy |
| Power | logₐ(xⁿ) = n·logₐx |
| Change of base | logₐx = (log x)/(log a) = (ln x)/(ln a) |
| Identities | logₐ1 = 0, logₐa = 1, logₐ(aˣ) = x, a^(logₐx) = x |

**Inverses:** `y = aˣ` and `y = logₐx` are inverse functions (reflect over `y = x`).

*Use it:* solve `2ˣ = 10` → `x = log₂10 = ln10 / ln2 ≈ 3.32`. (Calculator Part B / FRQ Q2.)

---

## 4. Key Trig Identities

**Pythagorean (memorize #1; the others = divide it):**
- sin²θ + cos²θ = 1
- 1 + tan²θ = sec²θ
- 1 + cot²θ = csc²θ

**Sum & Difference:**
- sin(α ± β) = sin α cos β ± cos α sin β
- cos(α ± β) = cos α cos β ∓ sin α sin β  *(signs flip: + inside → − outside)*
- tan(α ± β) = (tan α ± tan β) / (1 ∓ tan α tan β)

**Double-Angle:**
- sin(2θ) = 2 sin θ cos θ
- cos(2θ) = cos²θ − sin²θ = 2cos²θ − 1 = 1 − 2sin²θ  *(pick the form that matches what you're given)*
- tan(2θ) = 2 tan θ / (1 − tan²θ)

*Use it (FRQ Q4 symbolic):* simplify `(1 − cos²θ)/sin θ` → `sin²θ/sin θ` → **sin θ**.

---

## 5. Function Transformations

Start with `y = f(x)`. Transformed form: **`y = a · f(b(x − h)) + k`**

| Change | Effect | Direction |
|---|---|---|
| `+k` (outside) | vertical shift | up if k>0, down if k<0 |
| `−h` (inside) | horizontal shift | right if h>0, left if h<0 *(opposite of sign!)* |
| `a` (multiply outside) | vertical stretch (\|a\|>1) / shrink (\|a\|<1) | flip over x-axis if a<0 |
| `b` (multiply inside) | horizontal stretch (\|b\|<1) / shrink (\|b\|>1) | flip over y-axis if b<0 |

- Inside changes (h, b) act **horizontally and "backwards"**; outside changes (a, k) act **vertically and intuitively**.
- **Even** function: `f(−x) = f(x)` (symmetric over y-axis). **Odd:** `f(−x) = −f(x)` (symmetric about origin).

**For sinusoids `y = a·sin(b(x − h)) + k`:** amplitude = `|a|`, **period = 2π/|b|** (or 360°/|b|), midline `y = k`, phase shift = `h`.

*Use it:* `y = 3 sin(2(x − π/4)) + 1` → amplitude 3, period π, midline y=1, shifted π/4 right.

---

## 6. Asymptote Rules

**Rational function `f(x) = p(x)/q(x)`** (degrees: n = top, m = bottom):
- **Vertical asymptote (VA):** where denominator = 0 *and* numerator ≠ 0 (factor & cancel first; a canceled factor is a **hole**, not a VA).
- **Horizontal asymptote (HA):**
  - n < m → **y = 0**
  - n = m → **y = (ratio of leading coefficients)**
  - n > m → **no HA**; if n = m+1 there's a **slant/oblique asymptote** (do polynomial division, use the quotient).

**Exponential `y = a·bˣ + k`:** horizontal asymptote at **y = k**.
**Logarithmic `y = a·logₐ(x − h) + k`:** vertical asymptote at **x = h**.
**Tangent `y = tan x`:** VAs where cos x = 0, i.e. `x = π/2 + nπ`.

*Use it:* `f(x) = (2x² + 1)/(x² − 4)` → same degree → HA `y = 2`; VAs at `x = ±2`.

---

## 7. Sequences (nth-term)

> **Scope note:** Only **sequences** (nth-term + common difference/ratio) are on the AP exam. The **series-SUM formulas below are NOT tested** (CED Topic 2.1: "series are formally outside the scope of this framework") — learn them only if your *class* requires it; don't study them for the AP exam.

**Arithmetic** (common difference `d`, linear growth — adds each step):
- nth term: **aₙ = a₁ + (n − 1)d**
- ◽ *(class-only, not on AP exam)* sum: Sₙ = (n/2)(a₁ + aₙ)

**Geometric** (common ratio `r`, exponential growth — multiplies each step):
- nth term: **aₙ = a₁ · r^(n−1)**
- ◽ *(class-only, not on AP exam)* sum: Sₙ = a₁(1 − rⁿ)/(1 − r); infinite sum (|r|<1): a₁/(1 − r)

*Use it:* 3, 6, 12, 24… is geometric (r = 2) → a₅ = 3·2⁴ = **48**.

---

### 30-Second Pre-Exam Self-Quiz
1. cos(2π/3) = ? → **−1/2**
2. logₐ(x³y) = ? → **3logₐx + logₐy**
3. Period of `y = 4cos(3x)`? → **2π/3**
4. HA of `(3x+1)/(x−5)`? → **y = 3**
5. aₙ for 3, 6, 12, 24…? → **aₙ = 3·2^(n−1)** (nth-term — sequences, not series, are what's tested)

*All formulas verified against the official CED. Practice the no-calculator sections (Part A + FRQ Q3/Q4) until these are automatic — that's where this sheet wins you the most points.*
