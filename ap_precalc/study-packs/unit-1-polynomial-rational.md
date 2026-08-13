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

**Worked example:** A shop charges \$5 for up to 10 items, then \$0.40 for each item beyond 10. Write $C(n)$ and find $C(25)$.
$$C(n)=\begin{cases} 5, & 0\le n\le 10\\ 5+0.40(n-10), & n>10\end{cases}$$
$C(25)=5+0.40(25-10)=5+0.40(15)=5+6=\mathbf{11}$ dollars. Note the $n-10$: the per-item charge starts counting only *after* the 10th item, so it multiplies the items in EXCESS of 10, not all 25.

**#1 mistake:** Using the wrong piece at a boundary — watch the **≤ vs <** at each breakpoint to see which rule owns the endpoint.

### 2.11 Model domain & range restrictions *(FRQ Q2 Part C points)*
**Plain language:** A model is only true over the inputs the situation actually allows, so the model is the formula *plus* its **valid domain and range** — give both.
- **Domain restriction** — from the context (time can't be negative; you can't have a fraction of a person), a math constraint (no division by zero / no log of ≤0), or an extreme-value clue.
- **Range restriction** — e.g., a count must be a whole number (round), or a quantity can't exceed a physical max.

**Worked example:** A 200-litre rain barrel drains at 8 L per minute, so $V(t)=200-8t$ litres after $t$ minutes. State the model's domain and range.
Algebraically $200-8t$ is defined for every real $t$, so nothing here is a *math* restriction — both ends come from the **context**: $t$ cannot be negative, and the barrel is empty when $200-8t=0 \Rightarrow t=25$, after which the formula would report a negative volume. **Domain: $0\le t\le 25$. Range: $0\le V\le 200$.**

**#1 mistake:** Handing in the formula and stopping. Q2's reasoning parts pay for *where the model is valid and why* — and "all real numbers" is almost always wrong on a context problem. Check **both** ends: the one the context sets ($t\ge 0$) and the one the model sets (where it stops describing the situation).

---

## 3. Graduated practice set
*(Work each before opening the solution.)*

**P1 (easy, no-calc).** Find the AROC of $f(x)=3x-7$ on [2, 6].
<details><summary>Solution</summary>

$\frac{f(6)-f(2)}{6-2}=\frac{11-(-1)}{4}=\frac{12}{4}=3.$ (For a line, AROC = slope, always 3.)
</details>
<!-- key: 3 -->
<!-- accept: AROC = 3 -->
<!-- accept: slope 3 -->
<!-- topic: 1.1 -->

**P2 (easy, no-calc).** State the end behavior of $f(x)=4x^4-x+2$ in limit notation.
<details><summary>Solution</summary>

Even degree, positive leading coeff: $\displaystyle\lim_{x\to-\infty}f(x)=\infty$ and $\displaystyle\lim_{x\to\infty}f(x)=\infty$.
</details>
<!-- topic: 1.3 -->
<!-- note: deliberately NOT keyed. What is being marked here is the limit NOTATION itself (the #1 mistake in 2.3, flagged by the Chief Reader both years), and "lim x->inf f(x) = inf" has too many correct spellings to enumerate — a right answer typed any other way would be marked wrong. The rubric is the right grader for notation. -->

**P3 (easy, no-calc).** Give the zeros and their multiplicities for $f(x)=(x+2)^3(x-1)^2$. Does the graph cross or bounce at each? Answer as a comma-separated list with one entry per zero, each written as the zero, then mult, then the multiplicity, then crosses or bounces (e.g. 5 mult 4 bounces).
<details><summary>Solution</summary>

$x=-2$, multiplicity 3 (odd → **crosses**). $x=1$, multiplicity 2 (even → **bounces**). Degree 5.
</details>
<!-- part 1: -2 mult 3 crosses -->
<!-- part 1: x=-2 mult 3 crosses -->
<!-- part 1: -2 multiplicity 3 crosses -->
<!-- part 2: 1 mult 2 bounces -->
<!-- part 2: x=1 mult 2 bounces -->
<!-- part 2: 1 multiplicity 2 bounces -->
<!-- format: Answer as a comma-separated list with one entry per zero, each written as the zero, then mult, then the multiplicity, then crosses or bounces (e.g. 5 mult 4 bounces). -->
<!-- topic: 1.4 -->

**P4 (medium, no-calc).** Is $g(x)=2x^4-x^2$ even, odd, or neither?
<details><summary>Solution</summary>

$g(-x)=2(-x)^4-(-x)^2=2x^4-x^2=g(x)$ → **even** (all even powers, y-axis symmetric).
</details>
<!-- key: even -->
<!-- accept: even function -->
<!-- accept: g is even -->
<!-- accept: it is even -->
<!-- topic: 1.5 -->

**P5 (medium, no-calc).** For $f(x)=\dfrac{x^2-x-6}{x^2-9}$: find holes, vertical asymptotes, and the horizontal asymptote. Answer as three comma-separated entries in this form: hole at x=5, VA at x=6, HA y=7 — your own numbers, and give the hole by its x-value only.
<details><summary>Solution</summary>

Factor: $\dfrac{(x-3)(x+2)}{(x-3)(x+3)}$. $(x-3)$ cancels → **hole at $x=3$** (y-value: $\frac{3+2}{3+3}=\frac{5}{6}$, hole at $(3,\frac56)$). Remaining denominator factor $(x+3)$ → **VA at $x=-3$**. Equal degrees (2 and 2) → **HA: y = 1** (ratio of leading coeffs 1/1).
</details>
<!-- part 1: hole at x=3 -->
<!-- part 1: hole: x=3 -->
<!-- part 2: VA at x=-3 -->
<!-- part 2: VA x=-3 -->
<!-- part 2: VA: x=-3 -->
<!-- part 2: vertical asymptote at x=-3 -->
<!-- part 3: HA y=1 -->
<!-- part 3: HA: y=1 -->
<!-- part 3: HA at y=1 -->
<!-- part 3: horizontal asymptote y=1 -->
<!-- format: Answer as three comma-separated entries in this form: hole at x=5, VA at x=6, HA y=7 — your own numbers, and give the hole by its x-value only. -->
<!-- topic: 1.6 -->

**P6 (medium, no-calc).** Find the slant asymptote of $f(x)=\dfrac{2x^2+3x-1}{x+2}$.
<details><summary>Solution</summary>

Long division: $2x^2+3x-1 \div (x+2)$. $2x^2\div x=2x$; $2x(x+2)=2x^2+4x$; subtract → $-x-1$. $-x\div x=-1$; $-1(x+2)=-x-2$; subtract → remainder 1. Quotient $2x-1$. **Slant asymptote: y = 2x − 1.**
</details>
<!-- key: y = 2x - 1 -->
<!-- accept: slant asymptote y = 2x - 1 -->
<!-- accept: slant asymptote: y = 2x - 1 -->
<!-- topic: 1.7 -->

**P7 (medium, no-calc).** $f$ is decreasing and concave up on [0, 8]. You estimate $f(4)$ using the secant from $x=0$ to $x=8$. Over- or under-estimate? And is $f$'s rate of change increasing or decreasing? Answer as two comma-separated words: overestimate or underestimate, then increasing or decreasing.
<details><summary>Solution</summary>

Concave up → secant lies **above** the curve → estimate is **too high (overestimate)**. Concave up → rate of change is **increasing** (becoming less negative). (This is exactly the Q3(C)(ii) / Q2(B)(iii) reasoning the exam loves.)
</details>
<!-- part 1: overestimate -->
<!-- part 1: over-estimate -->
<!-- part 1: too high -->
<!-- part 2: increasing -->
<!-- part 2: increases -->
<!-- part 2: rate increasing -->
<!-- part 2: rate of change increasing -->
<!-- format: Answer as two comma-separated words: overestimate or underestimate, then increasing or decreasing. -->
<!-- topic: 1.2 -->

**P8 (medium, calculator).** A song's daily plays follow $D(t)=at^2+bt+c$ with $D(0)=20$, $D(3)=44$, $D(6)=56$. Find $a, b, c$, then estimate $D(1.5)$ using the AROC from $t=0$ to $t=6$.
<details><summary>Solution</summary>

$c=20$. $9a+3b+20=44\Rightarrow 9a+3b=24\Rightarrow 3a+b=8$. $36a+6b+20=56\Rightarrow 36a+6b=36\Rightarrow 6a+b=6$. Subtract: $3a=-2\Rightarrow a=-\tfrac23\approx-0.667$, then $b=8-3a=10$, $c=20$. AROC on [0,6]: $\frac{56-20}{6}=6$. Linear estimate at $t=1.5$: $D(0)+6(1.5)=20+9=\mathbf{29}$. (Note: true $D(1.5)=-0.667(2.25)+10(1.5)+20\approx33.5$; the secant **underestimates** because the parabola opens down/concave down here.)
</details>
<!-- topic: 1.8 -->
<!-- note: deliberately NOT keyed. Four values, one of them exact only as -2/3 while the item allows a calculator, so a correct answer may legitimately be typed -2/3, -0.667, -0.67 or -.667 in any of four positions. Enumerating that safely runs past the parser's cap on accepted forms, and enumerating it UNsafely marks a right answer wrong. -->

**P9 (exam-level, calculator).** A drug's concentration in the blood $t$ hours after a single dose is modeled by $C(t)=\dfrac{24t}{t^2+4}$ mg/L, for $t\ge 0$. (a) Give the horizontal asymptote and say what it means about the drug. (b) Use a graphing calculator to find when the concentration is greatest, and that greatest concentration. (c) Find the AROC of $C$ on [0, 6]. Is $C$ increasing or decreasing at $t=6$? (d) State the domain restriction this model needs, and say where it comes from.
<details><summary>Solution</summary>

(a) $\deg N=1 < \deg D=2$ → **HA: y = 0**. In context: long after the dose the concentration decays toward 0 — the body clears the drug (it never quite reaches 0). Check: $C(100)\approx0.240$, $C(1000)\approx0.024$.
(b) Graph on $[0,20]$: the peak is at **$t=2$ hours**, where **$C=6$ mg/L**. **Check it by hand** — divide top and bottom by $t$: $C(t)=\dfrac{24}{t+4/t}$, which is largest when $t+\frac4t$ is smallest, i.e. when $t=\frac4t \Rightarrow t=2$, giving $C=\frac{24}{4}=6$ ✓. Both values are exact, so to 3 decimals they are 2.000 h and 6.000 mg/L.
(c) $C(0)=0$ and $C(6)=\frac{144}{40}=3.6$, so AROC $=\dfrac{3.6-0}{6-0}=\mathbf{0.6}$ mg/L per hour. But $C$ is **decreasing** at $t=6$: the peak was back at $t=2$, and $C(5.9)\approx3.649 > C(6)=3.6 > C(6.1)\approx3.553$. **A positive average rate of change over an interval says nothing about the direction at a point inside it** — the average is positive here only because of the climb from 0 to 6 mg/L in the first two hours.
(d) $t^2+4$ is never zero, so there is **no algebraic** exclusion — the restriction is **contextual: $t\ge 0$**, because $t$ counts hours since the dose and negative time is meaningless. (Realistically also an upper bound at the next dose, after which this model no longer describes the situation.)
</details>
<!-- topic: 1.11 -->
<!-- note: not keyable — four lettered sub-parts, and (a) and (d) ask what the asymptote MEANS and where the restriction COMES FROM. The parser refuses a key on both counts. -->

**P10 (exam-level, no-calc) — FRQ Q4 Symbolic style.** (a) Solve $\log_2(8x)=5$. (b) Condense $\log_3 x + 2\log_3 3$ into a single log. (c) Solve $e^{2x}-e^{x}-6=0$ for all real x.
<details><summary>Solution</summary>

(a) $8x=2^5=32\Rightarrow x=4$.
(b) $2\log_3 3=\log_3 9$, so $\log_3 x+\log_3 9=\log_3(9x)$.
(c) Quadratic-in-disguise: let $u=e^x$. $u^2-u-6=0\Rightarrow(u-3)(u+2)=0\Rightarrow u=3$ or $u=-2$. $e^x=3\Rightarrow x=\ln 3$. $e^x=-2$ impossible (exp is always positive). **x = ln 3.** (This "quadratic in $e^x$" was literally 2025 Q4(C).)
</details>
<!-- topic: 1.8 -->
<!-- note: not keyable — three lettered sub-parts, so what a student types is a worked solution rather than one answer. -->

**P11 (exam-level, calculator) — FRQ Q1 Function Concepts style.** $f$ is given by a table: $f(1)=8, f(2)=4, f(3)=2, f(4)=1$. (a) Compute $h=g\circ f$ at $x=2$ where $g(x)=x^2-3$. (b) Find $f^{-1}(2)$. (c) Which model best fits $f$ — linear, quadratic, or exponential — and justify.
<details><summary>Solution</summary>

(a) $f(2)=4$, so $h(2)=g(4)=4^2-3=13$.
(b) $f^{-1}(2)$ = the input giving output 2 → $f(3)=2$, so $f^{-1}(2)=3$.
(c) Ratios of successive outputs: $4/8=0.5$, $2/4=0.5$, $1/2=0.5$ — **constant ratio → exponential**. (Justify with the ratios, exactly as 2025 Q1(C)(ii) required. A *linear* model would need constant *differences*, not ratios.)
</details>
<!-- topic: 1.8 -->
<!-- note: not keyable — three lettered sub-parts, and (c) asks for a justification. -->

**P12 (exam-level, calculator).** For $f(x)=0.5x^3-2x^2-x+3$, use a graphing calculator to find all real zeros to 3 decimals, and state the end behavior in limit notation.
<details><summary>Solution</summary>

Graph/solve: zeros ≈ **$x\approx-1.273,\ 1.140,\ 4.133$** (calculator roots). **Check them:** sum $=-1.273+1.140+4.133=4.000$, which must equal $-\frac{b}{a}=-\frac{-2}{0.5}=4$ ✓; product $=(-1.273)(1.140)(4.133)\approx-5.998\approx-6$, which must equal $-\frac{d}{a}=-\frac{3}{0.5}=-6$ ✓. Always run **both** checks — the sum alone can agree while a root is still wrong. End behavior (odd degree, positive leading coeff $0.5x^3$): $\displaystyle\lim_{x\to\infty}f(x)=\infty,\ \displaystyle\lim_{x\to-\infty}f(x)=-\infty$.
</details>
<!-- topic: 1.4 -->
<!-- note: deliberately NOT keyed. The zeros alone would key cleanly, but the stem also demands end behavior in limit notation, which is the same unenumerable-notation problem as P2 — and the answer to a keyed item has to be the WHOLE response. -->

**P13 (medium, no-calc).** The graph of $f$ passes through the point $(2, 7)$, and $g(x)=2f(x+3)-1$. Find $g(-1)$.
<details><summary>Solution</summary>

Work the inside first: $g(-1)=2f(-1+3)-1=2f(2)-1$, and $f(2)=7$, so $g(-1)=2(7)-1=\mathbf{13}$.
Why $x=-1$ is the input that reaches $f(2)$: the $+3$ **inside** shifts the graph of $f$ **LEFT** 3 (inside changes are horizontal and backwards), so the point $(2,7)$ on $f$ moves to $x=2-3=-1$ on $g$. The outside $2\cdot$ then doubles the output and the $-1$ drops it 1: $(2,7)\mapsto(-1,13)$.
</details>
<!-- key: 13 -->
<!-- accept: g(-1) = 13 -->
<!-- topic: 1.9 -->

**P14 (medium, no-calc).** $f$ is piecewise-defined: $f(x)=3x+4$ for $x<2$, and $f(x)=x^2-1$ for $x\ge 2$. Find $f(2)+f(-1)$.
<details><summary>Solution</summary>

$x=2$: the interval $x\ge 2$ **owns the endpoint**, so use the second piece — $f(2)=2^2-1=3$.
$x=-1$: that is in $x<2$, so use the first piece — $f(-1)=3(-1)+4=1$.
$f(2)+f(-1)=3+1=\mathbf{4}$. (Take the boundary with the wrong piece and you get $f(2)=3(2)+4=10$ and a total of 11 — the **≤ vs <** check at the breakpoint is the whole question.)
</details>
<!-- key: 4 -->
<!-- accept: f(2) + f(-1) = 4 -->
<!-- topic: 1.10 -->

**P15 (medium, no-calc) — end behaviour from factored form.** Which pair of limit statements describes the end behaviour of $f(x)=(2-x)(x+3)^2$?
A) lim x→-∞ f(x) = -∞ and lim x→∞ f(x) = ∞   B) lim x→-∞ f(x) = ∞ and lim x→∞ f(x) = -∞   C) lim x→-∞ f(x) = ∞ and lim x→∞ f(x) = ∞   D) lim x→-∞ f(x) = -∞ and lim x→∞ f(x) = -∞
<details><summary>Solution</summary>

**Never expand the whole thing — find the leading term.** Multiply only the highest-degree piece of each factor: $(-x)\cdot(x^2)=-x^3$. So the degree is $1+2=3$ (**odd**, exponents **add**) and the leading coefficient is $-1$ (**negative**).
Odd degree with a negative leading coefficient means the two ends go **opposite** ways, with the right-hand end going **down**: $\displaystyle\lim_{x\to-\infty}f(x)=\infty$ and $\displaystyle\lim_{x\to\infty}f(x)=-\infty$.
Check with two big inputs: $f(-10)=(12)(49)=588$ (large positive on the left) and $f(10)=(-8)(169)=-1352$ (large negative on the right) ✓. Expanded, $f(x)=-x^3-4x^2+3x+18$ — same leading term.

Why the others are there: **A** is the odd-degree, *positive* shape — it reads the $2$ in $(2-x)$ as the leading piece and misses that $(2-x)$ contributes $-x$. That hidden minus sign is the whole question. **D** gets an even degree by **multiplying** the exponents ($1\times2=2$) instead of adding them; an even degree with a negative leading coefficient does send both ends to $-\infty$. **C** makes both errors at once — even degree *and* a positive leading coefficient.
</details>
<!-- key: B -->
<!-- practice: 3.A -->
<!-- topic: 1.3 -->

**P16 (medium, no-calc) — building a polynomial from its zeros.** $p$ is a polynomial of degree 3 with real coefficients. Its only zeros are $x=-2$ with multiplicity 1 and $x=3$ with multiplicity 2, and $p(0)=-18$. Which of these is $p(x)$?
A) (x + 2)(x - 3)^2   B) -(x - 2)(x + 3)^2   C) -(x + 2)^2(x - 3)   D) -(x + 2)(x - 3)^2
<details><summary>Solution</summary>

**A zero at $x=r$ is the factor $(x-r)$** — subtract the zero, don't copy its sign. So $x=-2$ gives $(x+2)$ and $x=3$ gives $(x-3)$, and the multiplicities are the exponents:
$$p(x)=a(x+2)(x-3)^2$$
The multiplicities already total $1+2=3$, which is the whole degree, so there is nothing left but the constant $a$ — and that is what $p(0)=-18$ pins down:
$$p(0)=a(0+2)(0-3)^2=a(2)(9)=18a=-18\Rightarrow a=-1$$
So $p(x)=-(x+2)(x-3)^2$. Check by expanding: $-(x+2)(x^2-6x+9)=-x^3+4x^2+3x-18$, whose value at $x=0$ is $-18$ ✓, and whose factored form still shows $x=-2$ once and $x=3$ twice ✓.

Why the others are there: **A** has the right factors but assumes the leading coefficient is $1$ and never uses $p(0)$ at all — $A(0)=(2)(9)=+18$, the wrong sign. **B** copies each zero's sign straight into the factor, so its zeros are $2$ and $-3$, not $-2$ and $3$ (and $B(0)=18$). **C** hangs the multiplicity on the wrong zero — it has $x=-2$ twice and $x=3$ once — and $C(0)=-(4)(-3)=12$, so it fails the $p(0)$ check as well. **Always test a candidate at $x=0$; it takes one line and it eliminates three of these.**
</details>
<!-- key: D -->
<!-- practice: 1.C -->
<!-- topic: 1.8 -->

**P17 (medium, calculator) — the range a context allows.** A poster must have an area of exactly 750 cm². If its width is $w$ cm then its height is $H(w)=\dfrac{750}{w}$ cm. The printer only accepts widths from 12 cm to 50 cm, so the model's domain is $12\le w\le 50$. What is the range of the model on that domain?
A) 0 < H ≤ 62.5   B) 15 ≤ H ≤ 750   C) 15 ≤ H ≤ 62.5   D) every real number except 0
<details><summary>Solution</summary>

**The range of a model is what the function actually outputs over the domain the context allows — so find the outputs at the ends of that domain.** $H(w)=750/w$ is decreasing for $w>0$ (a bigger width forces a shorter poster), so the two domain endpoints give the two range endpoints, swapped:
- $H(12)=750/12=62.5$ cm — the **tallest** poster (narrowest width);
- $H(50)=750/50=15$ cm — the **shortest** poster (widest width).

Nothing in between escapes those bounds, because $H$ is continuous and decreasing on $[12,50]$. **Range: $15\le H\le 62.5$.** Both numbers are exact, and both check against the area: $12\times62.5=750$ and $50\times15=750$ ✓.

Why the others are there: **A** takes the horizontal asymptote $y=0$ as the bottom of the range. That is where $H$ heads as $w\to\infty$ — but the printer stops at $w=50$, and the model never gets below $15$. **B** uses the area constant $750$ as the tallest height; a 750 cm poster would need a width of 1 cm, which the domain excludes. **D** is the range of $H(w)=750/w$ with **no domain restriction at all** — a true fact about the bare formula, and the wrong answer to a question about a model, which is exactly the "all real numbers" reflex that costs Q2 Part C points.
</details>
<!-- key: C -->
<!-- practice: 3.B -->
<!-- topic: 1.11 -->

**P18 (medium, no-calc) — every denominator zero is not an asymptote.** Which statement is true of the graph of $f(x)=\dfrac{x^3-x}{x^2-x}$?
A) It has holes at x = 0 and x = 1 and no vertical asymptote.   B) It has vertical asymptotes at x = 0 and x = 1 and no hole.   C) It has a hole at x = 0 and a vertical asymptote at x = 1.   D) It has no hole and no vertical asymptote, and its domain is every real number.
<details><summary>Solution</summary>

**Factor both, completely, before deciding anything.**
$$f(x)=\frac{x(x-1)(x+1)}{x(x-1)}$$
Both denominator factors cancel, so **both** denominator zeros are **holes** and there is **no vertical asymptote at all**. What is left is $f(x)=x+1$ — the graph is the straight line $y=x+1$ with two points punched out of it, at $(0,1)$ and $(1,2)$.
Check the limits: as $x\to0$ the outputs approach $1$, and as $x\to1$ they approach $2$. **A vertical asymptote needs the outputs to run off to $\pm\infty$; these stay perfectly finite**, which is what "removable" means.
Two holes still cost you the domain, though: $x=0$ and $x=1$ make the **original** denominator zero, so the domain is every real number **except 0 and 1**.

Why the others are there: **B** calls every denominator zero a vertical asymptote — this unit's #1 mistake, and the reason the factoring comes first. **C** cancels only the monomial $x$, reaches $\dfrac{x^2-1}{x-1}$, and stops factoring — the leftover $(x-1)$ is still common to both, so what looks like an asymptote is the second hole. **D** does simplify all the way to $x+1$ and then forgets where it came from: a cancelled factor is still barred from the domain, so the line is missing two of its points.
</details>
<!-- key: A -->
<!-- practice: 1.B -->
<!-- topic: 1.6 -->

**P19 (exam-level, no-calc) — complex zeros come in pairs.** $p$ is a polynomial of degree 5 with **real** coefficients. Two of its zeros are $x=2i$ and $x=1-i$. Counting multiplicity, exactly how many of $p$'s five zeros are real numbers?
A) 0   B) 1   C) 2   D) 3
<details><summary>Solution</summary>

**Real coefficients force every non-real zero to bring its conjugate.** So each given zero is really a pair:
- $x=2i$ forces $x=-2i$;
- $x=1-i$ forces $x=1+i$ — the conjugate flips the sign of the imaginary part only, so $1+i$, **not** $-1+i$.

That is **four** non-real zeros already. A degree-5 polynomial has exactly 5 zeros counting multiplicity, so $5-4=\mathbf{1}$ of them is real.
And it cannot be any other number: a fifth non-real zero would drag in a **sixth** zero as its conjugate, pushing the degree past 5. (Check the arithmetic: $(x-2i)(x+2i)=x^2+4$ and $(x-(1-i))(x-(1+i))=x^2-2x+2$, both with real coefficients, and their product $x^4-2x^3+6x^2-8x+8$ is degree 4 — leaving room for exactly one real factor $(x-r)$.)

Why the others are there: **D** counts only the two zeros the stem printed and forgets the conjugates entirely — $5-2=3$. **C** takes the conjugate of $2i$ but not of $1-i$, as if the pairing rule only applied to purely imaginary zeros — $5-3=2$, and 3 non-real zeros is impossible for real coefficients anyway. **A** allows the last zero to be non-real too, which is the same pairing rule ignored one final time; an odd-degree polynomial with real coefficients always has at least one real zero.
</details>
<!-- key: B -->
<!-- practice: 3.B -->
<!-- topic: 1.4 -->

**P20 (exam-level, calculator) — what a table says about concavity.** A function $f$ is given by a table of values at equally spaced inputs: $f(0)=8$, $f(2.5)=14.5$, $f(5)=19.2$, $f(7.5)=22.4$. A student estimates $f(2.5)$ by starting at $f(0)$ and applying $f$'s average rate of change on $[0, 7.5]$. Compared with the table's value of $f(2.5)$, that estimate is:
A) too high, and f is concave up on [0, 7.5]   B) too low, and f is concave up on [0, 7.5]   C) too high, and f is concave down on [0, 7.5]   D) too low, and f is concave down on [0, 7.5]
<details><summary>Solution</summary>

**Two separate claims, so settle them separately — and the table decides both.**

*Concavity first.* Average rate of change over each successive interval (all of them 2.5 wide):
$$\frac{14.5-8}{2.5}=2.6,\qquad \frac{19.2-14.5}{2.5}=1.88,\qquad \frac{22.4-19.2}{2.5}=1.28$$
The outputs are **increasing** (8 → 22.4) but the **rates are decreasing** (2.6 → 1.88 → 1.28): rising, and levelling off. Decreasing rate of change is **concave down**. Note that increasing and concave down happen together here — they are independent ideas.

*Now the estimate.* AROC on $[0,7.5]=\dfrac{22.4-8}{7.5}=\dfrac{14.4}{7.5}=1.92$, so the estimate is $8+1.92(2.5)=8+4.8=\mathbf{12.8}$, against the table's $f(2.5)=14.5$. The estimate is **too low** — by 1.7.

That is not a coincidence, and it is the general rule the FRQ pays for: on a **concave down** stretch the secant line lies **below** the curve, so any linear estimate taken from it is an **underestimate**. The table's own numbers show why — the function did most of its climbing early (2.6 per unit at the start), and the flat single average of 1.92 cannot keep up over the first interval.

Why the others are there: **C** has the concavity right and the direction memorized backwards — concave *up* is the one that overestimates. **B** has the direction right and reads the *outputs* going up as "concave up"; increasing is about the outputs, concavity is about the **rates**. **A** makes both errors at once, which is the standard chain "it's increasing, so it's concave up, so the secant is above" — the conflation the Chief Reader flags every year.
</details>
<!-- key: D -->
<!-- practice: 2.A -->
<!-- topic: 1.2 -->

**P21 (medium, no-calc) — a transformation moves the asymptote too.** The graph of $y=f(x)$ has a vertical asymptote at $x=2$. Where is the vertical asymptote of the graph of $y=f(2x)-5$?
A) x = 4   B) x = 2   C) x = 1   D) x = -3
<details><summary>Solution</summary>

**An asymptote is at an input the function cannot take, so ask which $x$ feeds the forbidden input into $f$.** The new graph evaluates $f$ at $2x$, and $f$ blows up when its input is 2:
$$2x=2\ \Rightarrow\ x=1$$
So the vertical asymptote is at $\mathbf{x=1}$. The $-5$ is **outside** $f$, a vertical shift, and shifting a graph down cannot move a vertical line sideways.
Sanity check with a concrete $f$: take $f(u)=\dfrac{1}{u-2}$, which has its asymptote at $u=2$. Then $f(2x)-5=\dfrac{1}{2x-2}-5$, whose denominator vanishes at $x=1$ ✓ — and the whole graph is the original squeezed **toward** the $y$-axis by a factor of $\tfrac12$, which is what carries the asymptote from 2 to 1.

Why the others are there: **A** multiplies by 2 instead of dividing — the "$f(2x)$ stretches by 2" mistake that section 2.9 names, when $f(bx)$ **compresses** by $1/|b|$. **B** treats the asymptote as a fixed feature of $f$ that transformations leave alone; the inside change moves it. **D** applies the $-5$ to the input, $2-5=-3$, reading an outside change as a horizontal one. Inside the parentheses is horizontal and backwards; outside is vertical.
</details>
<!-- key: C -->
<!-- practice: 1.C -->
<!-- topic: 1.9 -->

**P22 (medium, no-calc) — where an average rate of change vanishes.** For $f(x)=x^2-6x$, on which of these intervals is the average rate of change of $f$ equal to $0$?
A) [0, 3]   B) [1, 5]   C) [2, 6]   D) [-3, 3]
<details><summary>Solution</summary>

**Do the algebra once, in general, rather than four times.** On $[a,b]$,
$$\text{AROC}=\frac{f(b)-f(a)}{b-a}=\frac{(b^2-a^2)-6(b-a)}{b-a}=\frac{(b-a)(b+a)-6(b-a)}{b-a}=a+b-6$$
so the average rate of change is $0$ **exactly when $a+b=6$**, and only $[1,5]$ has endpoints that add to 6.
The same fact without any algebra: an average rate of change of $0$ means the numerator is $0$ — **no net change** — so the two endpoint outputs must be **equal**. And they are: $f(1)=1-6=-5$ and $f(5)=25-30=-5$ ✓. The parabola's axis is $x=3$, and $1$ and $5$ sit the same distance either side of it, so they land at the same height.
The other three, checked: $\dfrac{f(3)-f(0)}{3-0}=\dfrac{-9-0}{3}=-3$; $\dfrac{f(6)-f(2)}{6-2}=\dfrac{0-(-8)}{4}=2$; $\dfrac{f(3)-f(-3)}{3-(-3)}=\dfrac{-9-27}{6}=-6$.

Why the others are there: **A** ends at the vertex $x=3$, where the graph really is momentarily flat — but that is the rate at a single **instant**, not an average, and across the whole of $[0,3]$ the output fell from $0$ to $-9$, an average rate of $-3$. **C** ends at $x=6$, where $f(6)=0$: that is a zero of the **function**, and the question asks for a zero **rate of change**. The output changing from $-8$ to $0$ is a change of $+8$, not of nothing. **D** is symmetric about $x=0$, which would be the right instinct for $x^2$ — but this parabola's axis is $x=3$, so $-3$ and $3$ are nowhere near the same height ($27$ and $-9$), and the average rate is $-6$.
</details>
<!-- key: B -->
<!-- practice: 2.A -->
<!-- topic: 1.1 -->

**P23 (medium, no-calc) — "odd" is a definition, not an exponent.** Which of these expressions defines an **odd** function?
A) (x - 2)^3   B) 1/(x^2 - 4)   C) x^3 - x^2 + x   D) (x^2 + 1)/x
<details><summary>Solution</summary>

**Odd means $f(-x)=-f(x)$ for every $x$ in the domain. Test it; never eyeball it.**
Take **D**, $f(x)=\dfrac{x^2+1}{x}$. Substituting $-x$ changes only the denominator, because $(-x)^2=x^2$:
$$f(-x)=\frac{(-x)^2+1}{-x}=\frac{x^2+1}{-x}=-\frac{x^2+1}{x}=-f(x)$$
So **D is odd**, and its graph is symmetric about the **origin**. (Its domain, every real except $0$, is itself symmetric about $0$ — it has to be, or there would be an $x$ whose partner $-x$ has no output to compare with.) Spot-check with numbers: $f(2)=\frac52=2.5$ and $f(-2)=\frac{5}{-2}=-2.5$ ✓. An **even** top over an **odd** bottom is odd.

Why the others are there: **A** is a cube, and "odd exponent, so odd function" is the single most common wrong reason on this topic. An odd power gives origin symmetry only when it is **centred at the origin**; $(x-2)^3$ is centred at $x=2$. Test it: $f(-1)=(-3)^3=-27$, while $-f(1)=-(-1)^3=+1$. Not equal, so **neither** even nor odd. **B** *is* symmetric — about the **y-axis**, which is the definition of **even**: $f(-x)=\frac{1}{(-x)^2-4}=\frac{1}{x^2-4}=f(x)$. This catches two habits at once, remembering that there is symmetry without remembering which name goes with which, and reasoning "$\frac1x$ is odd, so $\frac{1}{x^2-4}$ must be" — the reciprocal of an **even** function is even. **C** has odd powers in two of its three terms, and a student who counts them calls it odd. One even term is enough to break it: $f(-x)=-x^3-x^2-x$ while $-f(x)=-x^3+x^2-x$, differing by $2x^2$. Numerically $f(1)=1$ and $f(-1)=-3$, but odd would need $f(-1)=-1$. **"Mostly odd" is not odd.**
</details>
<!-- key: D -->
<!-- practice: 3.A -->
<!-- topic: 1.5 -->

**P24 (exam-level, no-calc) — when a rational function has no asymptote at all.** The graph of $f(x)=\dfrac{x^4-1}{x^2+2}$ has which of the following?
A) a horizontal asymptote at y = 1   B) a slant asymptote y = x^2 - 2   C) neither a horizontal asymptote nor a slant asymptote   D) a horizontal asymptote at y = 0
<details><summary>Solution</summary>

**Compare the degrees first; the answer is decided before any dividing.** Here $\deg N=4$ and $\deg D=2$, so the top is bigger by **two**, not by one. That is the fourth case in section 2.7 and the only one that ends in nothing: a horizontal asymptote needs $\deg N\le\deg D$, and a slant asymptote needs $\deg N=\deg D+1$. Neither holds, so **C**.
What the graph does instead: divide, and $f(x)=x^2-2+\dfrac{3}{x^2+2}$. The remainder term dies away, so far from the origin $f$ behaves like the **parabola** $x^2-2$ — it runs off to $+\infty$ at both ends, and $\displaystyle\lim_{x\to\pm\infty}f(x)=\infty$. A graph that runs to infinity cannot be levelling off at a horizontal line, and it cannot be hugging a straight line either.
Watch it happen: $f(5)=\frac{624}{27}\approx23.1$, $f(10)=\frac{9999}{102}\approx98.0$, $f(100)\approx9998.0$. Those outputs are not approaching any number, and they are not approaching any line of the form $y=mx+b$ — divide by $x$ and $f(100)/100\approx100$, so there is no fixed slope to settle on.

Why the others are there: **A** takes the ratio of the leading coefficients, $1/1$, which is the rule for **equal** degrees — applied without ever checking that the degrees are equal. **D** is the opposite misreading, the $\deg N<\deg D$ rule, and behind it the reflex that a fraction must shrink as its denominator grows; the numerator here grows far faster. Both A and D also fail the one-second sanity check: $f(10)\approx98$ is nowhere near $1$ or $0$. **B** does the division correctly and then calls the quotient a slant asymptote regardless of what it is. **A slant asymptote is a LINE** — that is what "slant" means — and $x^2-2$ is a parabola. It is a true statement about the end behaviour wearing the wrong name, which is exactly why the degree check comes before the division.
</details>
<!-- key: C -->
<!-- practice: 2.A -->
<!-- topic: 1.7 -->

**P25 (medium, calculator) — the long run of an equal-degree model.** A tank holds 200 litres of water in which 5 grams of salt are dissolved. Brine carrying 0.25 grams of salt per litre is then pumped in at 1 litre per minute, and nothing leaves, so after $t$ minutes the salt concentration is $C(t)=\dfrac{5+0.25t}{200+t}$ grams per litre. As $t$ grows without bound, what happens to $C(t)$?
A) 0 g/L   B) 0.25 g/L   C) 0.025 g/L   D) no limiting value: the concentration increases without bound
<details><summary>Solution</summary>

**Write the model in standard form and the degrees are equal.** Numerator $0.25t+5$ and denominator $t+200$ are both degree 1, so the horizontal asymptote is the **ratio of the leading coefficients**: $\dfrac{0.25}{1}=0.25$. So $C(t)\to\mathbf{0.25}$ g/L.
Check it on a calculator, and watch it crawl: $C(0)=\frac{5}{200}=0.025$, $C(100)=\frac{30}{300}=0.100$, $C(1000)=\frac{255}{1200}=0.2125$, $C(10000)\approx0.2456$. Climbing towards $0.25$ and never reaching it — the asymptote is approached, not attained.
**And the answer makes physical sense, which is the check worth doing on a modelling item.** In the long run almost all of the liquid in the tank is brine that was pumped in, so the mixture must end up at the brine's own concentration, $0.25$ g/L. The original 5 g of salt and 200 L of water are a fixed head start that the growing pump-in eventually swamps.

Why the others are there: **A** applies the $\deg N<\deg D$ rule, or reasons "the volume $200+t$ grows without bound, so the concentration must go to $0$." The salt grows without bound too, and at a matched rate — this is why the degree comparison is done on the standard forms and not on a feeling about which part is bigger. **C** is $C(0)=5/200=0.025$: the concentration **now**, not in the long run. Evaluating at $t=0$ when the question asks about end behaviour is the commonest way to lose this point. **D** confuses the total salt with the concentration. The total salt $5+0.25t$ genuinely does increase without bound; the concentration is that total shared over a volume growing just as fast, and it is trapped below $0.25$ forever. Diluted salt and total salt are different quantities, and only one of them is a ratio.
</details>
<!-- key: B -->
<!-- practice: 3.B -->
<!-- topic: 1.7 -->

**P26 (exam-level, calculator) — building the second piece of a tariff.** A gym charges a flat \$27.50 a month for up to 8 visits, and \$3.75 for each visit beyond the 8th. Let $M(v)$ be the charge in dollars for a month with $v$ visits. Which pair gives the rule for $M(v)$ when $v>8$, together with the correct value of $M(14)$?
A) 27.50 + 3.75v, and M(14) = 80.00   B) 3.75(v - 8), and M(14) = 22.50   C) 27.50 + 3.75(v - 8), and M(14) = 50.00   D) 27.50 + 3.75(v - 8), and M(14) = 46.25
<details><summary>Solution</summary>

**The \$3.75 buys only the visits in EXCESS of 8, and the \$27.50 never goes away.** So the second piece keeps the flat fee and adds the per-visit charge on the excess count $v-8$:
$$M(v)=\begin{cases}27.50, & 0\le v\le 8\\ 27.50+3.75(v-8), & v>8\end{cases}$$
At $v=14$ the excess is $14-8=6$ visits, so $M(14)=27.50+3.75(6)=27.50+22.50=\mathbf{50.00}$ dollars. **C.**
**Two checks worth thirty seconds each.** First, the pieces must agree at the boundary or the bill would jump for no reason: the second rule at $v=8$ gives $27.50+3.75(0)=27.50$, the same as the flat fee ✓. Second, one extra visit must cost exactly \$3.75: $M(9)=27.50+3.75=31.25$, and $31.25-27.50=3.75$ ✓.

Why the others are there: **A** charges \$3.75 for **every** visit rather than only the ones past the 8th, which is this section's #1 modelling error — it gives $27.50+3.75(14)=80.00$, and it also breaks the boundary check badly ($M(8)$ would be $57.50$, over twice the flat fee for a month that is supposed to cost \$27.50). **B** drops the flat fee the moment the extra visits start, as if the two tiers **replaced** each other instead of stacking; $3.75(6)=22.50$ is less than the \$27.50 a member pays for **fewer** visits, so this rule charges more people less the more they come. **D** has the rule exactly right and then counts the excess wrong: "beyond the 8th" means the 9th through the 14th, and a student who computes that as $14-9=5$ gets $27.50+3.75(5)=46.25$. Count them — 9, 10, 11, 12, 13, 14 is **six** visits, and the count of integers from $9$ to $14$ is $14-9+1=6$, which is $14-8$. **This off-by-one at a breakpoint is the same ≤-versus-< care the boundary check enforces**, and it is why the algebra says $v-8$ and not $v-9$.
</details>
<!-- key: C -->
<!-- practice: 1.C -->
<!-- topic: 1.10 -->

**P27 (medium, no-calc) — making the two pieces meet.** A piecewise function is defined by $f(x)=2x+k$ for $x<5$ and $f(x)=x^2-4x$ for $x\ge 5$, where $k$ is a constant. For which value of $k$ is $f$ continuous at $x=5$ — that is, for which $k$ do the two pieces meet instead of leaving a jump?
A) k = -5   B) k = 0   C) k = 5   D) k = 15
<details><summary>Solution</summary>

**Evaluate both rules at the breakpoint and force them to agree.** The piece that owns $x=5$ is the second one, since $x\ge 5$ includes it:
$$f(5)=5^2-4(5)=25-20=5$$
The first rule never gets to $x=5$, but its outputs approach $2(5)+k=10+k$ as $x$ climbs towards 5, and that is the height the graph arrives at from the left. No jump means the two heights are the same number:
$$10+k=5\ \Longrightarrow\ k=\mathbf{-5}$$
Check it: with $k=-5$ the left rule is $2x-5$, which at $x=4.9$ gives $4.8$ and at $x=4.99$ gives $4.98$ — closing on $5$, exactly where the parabola piece starts. **A.**

Why the others are there: **D** solves $10+k=5$ by **adding** 10 instead of subtracting it, the single commonest slip in isolating a constant; $k=15$ makes the left side arrive at $25$ against the parabola's $5$, a jump of 20. **C** reads the constant $k$ as the piece's value at the breakpoint and copies $f(5)=5$ straight into it, forgetting that the $2x$ term contributes $10$ of its own; the left side then arrives at $15$. **B** matches the two rules at $x=0$ instead of at $x=5$ — both rules pass through the origin when $k=0$, which is a true and completely irrelevant fact, because $x=0$ is not where the pieces hand over. **Continuity is checked only at the breakpoint**; the left rule then arrives at $10$ against the parabola's $5$, a jump of 5.
</details>
<!-- key: A -->
<!-- practice: 1.A -->
<!-- topic: 1.10 -->

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
