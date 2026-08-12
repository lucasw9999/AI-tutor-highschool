# Unit 1: Polynomial and Rational Functions — Express Pack

## 1. Why it matters / exam weight
Biggest single chunk of the MCQ: **30–40% of Section I** (College Board, verified). Heavily feeds **FRQ Q1 (Function Concepts)**, **Q2 (Non-Periodic Modeling)**, and **Q4 (Symbolic Manipulation)** — the three highest-value places to gain points, and Q4/Q2 are exactly where most students bleed points. Master this unit and you've locked up the largest share of the exam.

---

## 2. The must-know concepts

### 2.1 Average Rate of Change (AROC) + the secant line
**Plain language:** AROC over [a, b] is the slope of the straight line (secant) connecting the two endpoints on the graph. It's "rise over run" for a function.

**Rule:**
$$\text{AROC}=\frac{f(b)-f(a)}{b-a}$$

**Worked example:** $f(x)=x^2$, find AROC on [1, 4].
$\dfrac{f(4)-f(1)}{4-1}=\dfrac{16-1}{3}=\dfrac{15}{3}=5.$

**#1 mistake:** Flipping the order — numerator must match the denominator's direction. Always (top output − bottom output) over (top input − bottom input).

---

### 2.2 Concavity + how AROC changes (the FRQ favorite)
**Plain language:** Concavity tells you whether the *rate of change itself* is speeding up or slowing down.
- **Concave UP** (curls upward, like a cup): rate of change is **increasing**.
- **Concave DOWN** (curls over, like a frown): rate of change is **decreasing**.

A secant line on a concave-**down** graph lies **below** the curve between the points → a linear estimate **underestimates** the true value there. (This exact reasoning was Q2(B)(iii) in BOTH 2024 and 2025.)

**Worked example:** $f$ is increasing and concave down on [0, 10]. You estimate $f(5)$ using the AROC from 0 to 10. Is your estimate too high or too low?
Concave down → secant is below the curve → estimate is **too low** (an underestimate).

**#1 mistake:** Confusing "increasing" with "concave up." A function can be increasing while concave down (rising but leveling off). *Increasing/decreasing* = is the output going up or down. *Concavity* = is the rate going up or down. They're independent.

---

### 2.3 Polynomial end behavior (degree + leading term)
**Plain language:** Far left and far right, a polynomial behaves like its **leading term** $a_nx^n$ only.

**Rules:**
| Degree | Leading coeff | As x→−∞ | As x→+∞ |
|---|---|---|---|
| Even | + | +∞ | +∞ |
| Even | − | −∞ | −∞ |
| Odd | + | −∞ | +∞ |
| Odd | − | +∞ | −∞ |

Write it in **limit notation**: $\displaystyle\lim_{x\to\infty}f(x)=\infty$, $\displaystyle\lim_{x\to-\infty}f(x)=-\infty$.

**Worked example:** End behavior of $f(x)=-2x^3+5x^2-1$.
Leading term $-2x^3$ (odd degree, negative coeff): $\displaystyle\lim_{x\to\infty}f(x)=-\infty$ and $\displaystyle\lim_{x\to-\infty}f(x)=+\infty$.

**#1 mistake (HUGE on the exam):** Bad **limit notation**. The Chief Reader flagged this BOTH years — students got the behavior right but lost the point. You need ALL FOUR pieces: the word **lim**, the **x→(±∞)** underneath, the **function**, and the **value**. "It goes to infinity" earns zero.

---

### 2.4 Real & complex zeros + multiplicity
**Plain language:** A zero is where $f(x)=0$ (an x-intercept if real). **Multiplicity** = how many times that factor repeats, and it controls how the graph behaves at that x-intercept.
- **Odd multiplicity** (1, 3, …): graph **crosses** the x-axis.
- **Even multiplicity** (2, 4, …): graph **touches and bounces** (tangent to axis).

A degree-$n$ polynomial has exactly $n$ zeros counting multiplicity and complex ones. **Complex (non-real) zeros come in conjugate pairs** ($a+bi$ with $a-bi$).

**Worked example:** $f(x)=(x-2)^2(x+1)$. Zeros and behavior?
$x=2$ (multiplicity 2 → **bounces**), $x=-1$ (multiplicity 1 → **crosses**). Degree = 3.

**#1 mistake:** Assuming every zero crosses the axis. Even multiplicity bounces — getting this wrong means you draw the graph wrong and miss MCQs that ask to match equations to graphs.

---

### 2.5 Even / odd functions (symmetry)
**Plain language:**
- **Even:** $f(-x)=f(x)$ → symmetric about the **y-axis** (e.g., $x^2$, $\cos$). Even-power terms only.
- **Odd:** $f(-x)=-f(x)$ → symmetric about the **origin** (e.g., $x^3$, $\sin$). Odd-power terms only.

**Worked example:** Is $f(x)=x^3-4x$ even, odd, or neither?
$f(-x)=(-x)^3-4(-x)=-x^3+4x=-(x^3-4x)=-f(x)$ → **odd**.

**#1 mistake:** Stopping after computing $f(-x)$ without comparing it to **both** $f(x)$ and $-f(x)$. If it matches neither, the answer is "neither."

---

### 2.6 Rational functions — vertical asymptotes & holes
**Plain language:** Factor top and bottom first.
- **Hole (removable):** a factor that cancels from both numerator and denominator. The hole is at that x-value.
- **Vertical asymptote (VA):** a factor in the denominator that does **NOT** cancel. Output → ±∞ there.

**Worked example:** $f(x)=\dfrac{(x-3)(x+1)}{(x-3)(x-5)}$.
$(x-3)$ cancels → **hole at $x=3$**. $(x-5)$ remains → **VA at $x=5$**. (Find the hole's y-value by plugging $x=3$ into the simplified form: $\frac{3+1}{3-5}=-2$, hole at $(3,-2)$.)

**#1 mistake:** Calling every denominator zero a vertical asymptote. If it cancels, it's a HOLE, not a VA. Always factor and cancel first.

---

### 2.7 Rational functions — horizontal & slant asymptotes + domain
**Plain language:** Compare the degrees of numerator (N) and denominator (D):
- **deg N < deg D** → horizontal asymptote **y = 0**.
- **deg N = deg D** → horizontal asymptote **y = ratio of leading coefficients**.
- **deg N = deg D + 1** → **slant (oblique) asymptote**; do polynomial long division, the quotient (drop remainder) is the line.
- **deg N > deg D + 1** → no horizontal/slant asymptote (end behavior follows the quotient polynomial).

**Domain:** all reals EXCEPT x-values that make the original denominator zero (holes AND VAs both excluded).

**Worked example:** Slant asymptote of $f(x)=\dfrac{x^2+1}{x-1}$.
Long division: $x^2+1 \div (x-1)=x+1$ remainder 2. Slant asymptote: **y = x + 1**.

**#1 mistake:** Reaching for a horizontal asymptote when the top degree is bigger. Equal degrees → ratio of leading coeffs (NOT y = 0); top one bigger → slant, do the division.

---

### 2.8 Equivalent representations (factored ↔ standard) + building/applying models
**Plain language:** Same function, different forms for different jobs:
- **Factored form** reveals **zeros** instantly: $f(x)=2(x-3)(x+1)$.
- **Standard form** reveals **end behavior / leading coefficient / y-intercept**: $f(x)=2x^2-4x-6$.

**Modeling (FRQ Q2 style):** Given data points, plug them into the model form to get a system of equations, then solve.
- 2 points + log/exp/linear model → 2 equations.
- 3 points + quadratic $at^2+bt+c$ → 3 equations (2025 Q2: solved to $a=-0.125,\ b=2.75,\ c=25$).

**Worked example:** Quadratic model through (0, 25), (2, 30), (4, 34).
From (0,25): $c=25$. From (2,30): $4a+2b+25=30 \Rightarrow 4a+2b=5$. From (4,34): $16a+4b+25=34 \Rightarrow 16a+4b=9$. Solve: double the first ($8a+4b=10$), subtract from second ($8a=-1$) → $a=-0.125$, then $b=2.75$.

**#1 mistake:** On modeling FRQs, students give answers with no work. Q2 is the 2nd-lowest-scoring FRQ. **Set up the equations explicitly**, and watch sign/decimal accuracy.

---

### 2.9 Transformations of functions
**Plain language:** Starting from $f(x)$, build $g(x)=a\,f(b(x-h))+k$:
- **k**: vertical shift (up if +).
- **h**: horizontal shift (RIGHT if $x-h$ with +h — opposite of intuition).
- **a**: vertical stretch (|a|>1) / compress; reflect over x-axis if a<0.
- **b**: horizontal stretch/compress by 1/|b|; reflect over y-axis if b<0.

**Worked example:** Describe $g(x)=-2f(x-3)+1$ vs $f$.
Right 3, vertical stretch ×2, reflect over x-axis, up 1.

**#1 mistake:** Inside-the-parentheses changes are **horizontal and backwards**: $f(x-3)$ moves RIGHT 3 (not left), and $f(2x)$ **compresses** by ½ (not stretch). Outside changes are vertical and behave normally.

---

### 2.10 Piecewise-defined functions *(easy to skip — and it's a named FRQ2 model type)*
**Plain language:** A **piecewise function** is built from different rules on **non-overlapping** intervals of the domain — one formula here, a different one there.

**Notation & evaluating:**
$$f(x)=\begin{cases} 2x+1, & x<0\\ x^2, & 0\le x\le 3\\ 5, & x>3\end{cases}$$
To evaluate, pick the piece whose interval contains the input: $f(-2)=2(-2)+1=-3$; $f(2)=2^2=4$; $f(10)=5$.

**What the exam asks:** evaluate at a point; identify which interval applies; **build a piecewise model from a context** ("charges \$5 up to 10 items, then \$0.40 each after" → a two-piece function); read/interpret a piecewise graph; check continuity at the breakpoints. The CED lists **piecewise-defined** as one of the FRQ Q2 modeling function types, so it can be the whole modeling question.

**#1 mistake:** Using the wrong piece at a boundary — watch the **≤ vs <** at each breakpoint to see which rule owns the endpoint.

### 2.11 Model domain & range restrictions *(FRQ Q2 Part C points)*
When you build a model for a real context, state its **valid domain/range**:
- **Domain restriction** — from the context (time can't be negative; you can't have a fraction of a person), a math constraint (no division by zero / no log of ≤0), or an extreme-value clue.
- **Range restriction** — e.g., a count must be a whole number (round), or a quantity can't exceed a physical max.

Justifying these limitations is exactly what FRQ Q2's reasoning parts reward — don't just give the formula, **say where it's valid and why.**

---

## 3. Graduated practice set
*(Work each before opening the solution.)*

**P1 (easy, no-calc).** Find the AROC of $f(x)=3x-7$ on [2, 6].
<details><summary>Solution</summary>

$\frac{f(6)-f(2)}{6-2}=\frac{11-(-1)}{4}=\frac{12}{4}=3.$ (For a line, AROC = slope, always 3.)
</details>

**P2 (easy, no-calc).** State the end behavior of $f(x)=4x^4-x+2$ in limit notation.
<details><summary>Solution</summary>

Even degree, positive leading coeff: $\displaystyle\lim_{x\to-\infty}f(x)=\infty$ and $\displaystyle\lim_{x\to\infty}f(x)=\infty$.
</details>

**P3 (easy, no-calc).** Give the zeros and their multiplicities for $f(x)=(x+2)^3(x-1)^2$. Does the graph cross or bounce at each?
<details><summary>Solution</summary>

$x=-2$, multiplicity 3 (odd → **crosses**). $x=1$, multiplicity 2 (even → **bounces**). Degree 5.
</details>

**P4 (medium, no-calc).** Is $g(x)=2x^4-x^2$ even, odd, or neither?
<details><summary>Solution</summary>

$g(-x)=2(-x)^4-(-x)^2=2x^4-x^2=g(x)$ → **even** (all even powers, y-axis symmetric).
</details>

**P5 (medium, no-calc).** For $f(x)=\dfrac{x^2-x-6}{x^2-9}$: find holes, vertical asymptotes, and the horizontal asymptote.
<details><summary>Solution</summary>

Factor: $\dfrac{(x-3)(x+2)}{(x-3)(x+3)}$. $(x-3)$ cancels → **hole at $x=3$** (y-value: $\frac{3+2}{3+3}=\frac{5}{6}$, hole at $(3,\frac56)$). Remaining denominator factor $(x+3)$ → **VA at $x=-3$**. Equal degrees (2 and 2) → **HA: y = 1** (ratio of leading coeffs 1/1).
</details>

**P6 (medium, no-calc).** Find the slant asymptote of $f(x)=\dfrac{2x^2+3x-1}{x+2}$.
<details><summary>Solution</summary>

Long division: $2x^2+3x-1 \div (x+2)$. $2x^2\div x=2x$; $2x(x+2)=2x^2+4x$; subtract → $-x-1$. $-x\div x=-1$; $-1(x+2)=-x-2$; subtract → remainder 1. Quotient $2x-1$. **Slant asymptote: y = 2x − 1.**
</details>

**P7 (medium, no-calc).** $f$ is decreasing and concave up on [0, 8]. You estimate $f(4)$ using the secant from $x=0$ to $x=8$. Over- or under-estimate? And is $f$'s rate of change increasing or decreasing?
<details><summary>Solution</summary>

Concave up → secant lies **above** the curve → estimate is **too high (overestimate)**. Concave up → rate of change is **increasing** (becoming less negative). (This is exactly the Q3(C)(ii) / Q2(B)(iii) reasoning the exam loves.)
</details>

**P8 (medium, calculator).** A song's daily plays follow $D(t)=at^2+bt+c$ with $D(0)=20$, $D(3)=44$, $D(6)=56$. Find $a, b, c$, then estimate $D(1.5)$ using the AROC from $t=0$ to $t=6$.
<details><summary>Solution</summary>

$c=20$. $9a+3b+20=44\Rightarrow 9a+3b=24\Rightarrow 3a+b=8$. $36a+6b+20=56\Rightarrow 36a+6b=36\Rightarrow 6a+b=6$. Subtract: $3a=-2\Rightarrow a=-\tfrac23\approx-0.667$, then $b=8-3a=10$, $c=20$. AROC on [0,6]: $\frac{56-20}{6}=6$. Linear estimate at $t=1.5$: $D(0)+6(1.5)=20+9=\mathbf{29}$. (Note: true $D(1.5)=-0.667(2.25)+10(1.5)+20\approx33.5$; the secant **underestimates** because the parabola opens down/concave down here.)
</details>

**P9 (exam-level, calculator).** A drug's concentration in the blood $t$ hours after a single dose is modeled by $C(t)=\dfrac{24t}{t^2+4}$ mg/L, for $t\ge 0$. (a) Give the horizontal asymptote and say what it means about the drug. (b) Use a graphing calculator to find when the concentration is greatest, and that greatest concentration. (c) Find the AROC of $C$ on [0, 6]. Is $C$ increasing or decreasing at $t=6$? (d) State the domain restriction this model needs, and say where it comes from.
<details><summary>Solution</summary>

(a) $\deg N=1 < \deg D=2$ → **HA: y = 0**. In context: long after the dose the concentration decays toward 0 — the body clears the drug (it never quite reaches 0). Check: $C(100)\approx0.240$, $C(1000)\approx0.024$.
(b) Graph on $[0,20]$: the peak is at **$t=2$ hours**, where **$C=6$ mg/L**. **Check it by hand** — divide top and bottom by $t$: $C(t)=\dfrac{24}{t+4/t}$, which is largest when $t+\frac4t$ is smallest, i.e. when $t=\frac4t \Rightarrow t=2$, giving $C=\frac{24}{4}=6$ ✓. Both values are exact, so to 3 decimals they are 2.000 h and 6.000 mg/L.
(c) $C(0)=0$ and $C(6)=\frac{144}{40}=3.6$, so AROC $=\dfrac{3.6-0}{6-0}=\mathbf{0.6}$ mg/L per hour. But $C$ is **decreasing** at $t=6$: the peak was back at $t=2$, and $C(5.9)\approx3.649 > C(6)=3.6 > C(6.1)\approx3.553$. **A positive average rate of change over an interval says nothing about the direction at a point inside it** — the average is positive here only because of the climb from 0 to 6 mg/L in the first two hours.
(d) $t^2+4$ is never zero, so there is **no algebraic** exclusion — the restriction is **contextual: $t\ge 0$**, because $t$ counts hours since the dose and negative time is meaningless. (Realistically also an upper bound at the next dose, after which this model no longer describes the situation.)
</details>

**P10 (exam-level, no-calc) — FRQ Q4 Symbolic style.** (a) Solve $\log_2(8x)=5$. (b) Condense $\log_3 x + 2\log_3 3$ into a single log. (c) Solve $e^{2x}-e^{x}-6=0$ for all real x.
<details><summary>Solution</summary>

(a) $8x=2^5=32\Rightarrow x=4$.
(b) $2\log_3 3=\log_3 9$, so $\log_3 x+\log_3 9=\log_3(9x)$.
(c) Quadratic-in-disguise: let $u=e^x$. $u^2-u-6=0\Rightarrow(u-3)(u+2)=0\Rightarrow u=3$ or $u=-2$. $e^x=3\Rightarrow x=\ln 3$. $e^x=-2$ impossible (exp is always positive). **x = ln 3.** (This "quadratic in $e^x$" was literally 2025 Q4(C).)
</details>

**P11 (exam-level, calculator) — FRQ Q1 Function Concepts style.** $f$ is given by a table: $f(1)=8, f(2)=4, f(3)=2, f(4)=1$. (a) Compute $h=g\circ f$ at $x=2$ where $g(x)=x^2-3$. (b) Find $f^{-1}(2)$. (c) Which model best fits $f$ — linear, quadratic, or exponential — and justify.
<details><summary>Solution</summary>

(a) $f(2)=4$, so $h(2)=g(4)=4^2-3=13$.
(b) $f^{-1}(2)$ = the input giving output 2 → $f(3)=2$, so $f^{-1}(2)=3$.
(c) Ratios of successive outputs: $4/8=0.5$, $2/4=0.5$, $1/2=0.5$ — **constant ratio → exponential**. (Justify with the ratios, exactly as 2025 Q1(C)(ii) required. A *linear* model would need constant *differences*, not ratios.)
</details>

**P12 (exam-level, calculator).** For $f(x)=0.5x^3-2x^2-x+3$, use a graphing calculator to find all real zeros to 3 decimals, and state the end behavior in limit notation.
<details><summary>Solution</summary>

Graph/solve: zeros ≈ **$x\approx-1.273,\ 1.140,\ 4.133$** (calculator roots). **Check them:** sum $=-1.273+1.140+4.133=4.000$, which must equal $-\frac{b}{a}=-\frac{-2}{0.5}=4$ ✓; product $=(-1.273)(1.140)(4.133)\approx-5.998\approx-6$, which must equal $-\frac{d}{a}=-\frac{3}{0.5}=-6$ ✓. Always run **both** checks — the sum alone can agree while a root is still wrong. End behavior (odd degree, positive leading coeff $0.5x^3$): $\displaystyle\lim_{x\to\infty}f(x)=\infty,\ \displaystyle\lim_{x\to-\infty}f(x)=-\infty$.
</details>

---

## 4. Quick self-check
1. **Q:** AROC formula? **A:** $\frac{f(b)-f(a)}{b-a}$ = slope of the secant line.
2. **Q:** Concave down means the rate of change is doing what? **A:** Decreasing (and a secant estimate is an *over*estimate where the curve is below it… careful: concave down → secant *below* curve → *under*estimate). Memorize: concave **down → underestimate**, concave **up → overestimate**.
3. **Q:** Multiplicity 2 at a zero — cross or bounce? **A:** Bounces (even multiplicity).
4. **Q:** $f(x)=x^5-x$: even, odd, or neither? **A:** Odd ($f(-x)=-f(x)$).
5. **Q:** Denominator factor that cancels with the numerator gives a ___? **A:** Hole (removable), not a vertical asymptote.
6. **Q:** deg N = deg D. Horizontal asymptote? **A:** y = ratio of leading coefficients (NOT y = 0).
7. **Q:** Constant *ratio* between successive equally-spaced outputs signals which model? **A:** Exponential. (Constant *difference* → linear.)
8. **Q:** $f(x-4)$ shifts the graph which way? **A:** Right 4 (inside changes are horizontal and backwards).

---

## 5. "Don't get these wrong" — Unit 1 exam traps
1. **Limit notation costs real points.** Saying "goes to infinity" earns zero. Write the full $\displaystyle\lim_{x\to\infty}f(x)=\infty$ with all four parts. Chief Reader flagged this BOTH 2024 and 2025.
2. **Concave up ≠ increasing.** They're separate ideas. A graph can rise while concave down (slowing growth). Concavity is about the *rate*, not the *direction*.
3. **Secant estimate direction:** concave **down → secant below → underestimate**; concave **up → secant above → overestimate**. This exact reasoning appears on Q2(B)(iii) every year and most students miss it.
4. **Hole vs. vertical asymptote:** ALWAYS factor and cancel first. A canceled factor = hole; a leftover denominator factor = VA. Don't call every denominator zero a VA.
5. **Horizontal asymptote with equal degrees is the leading-coefficient ratio**, not y = 0. Top degree bigger by 1 → do long division for a slant asymptote.
6. **Even multiplicity bounces, odd multiplicity crosses.** Mixing these up wrecks graph-matching MCQs.
7. **Transformations inside the parentheses are horizontal and reversed:** $f(x-h)$ moves right, $f(bx)$ compresses by $1/b$.
8. **Decimal accuracy (calculator FRQs):** keep full precision until the final answer, then give 3 decimals. Rounding intermediate steps loses the point.
9. **Modeling FRQs: show the equation setup.** No work = no credit, even with a right number. Q2 is the second-lowest-scoring FRQ — points are there for students who write the system.
10. **Quadratic-in-disguise:** $e^{2x}-e^x-6=0$ and similar — substitute $u=e^x$ (or $u=\sin x$), factor, then back-substitute and reject impossible values ($e^x>0$ always).
