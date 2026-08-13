# Unit 2: Exponential and Logarithmic Functions — Express Pack

> **For Lucas. Goal: A in class + 4/5 on the AP exam. This is a fast catch-up, not a textbook. Learn by doing — read each concept once, then go straight to the practice.**

---

## 1. Why it matters / exam weight

Unit 2 is **one of the two heaviest MCQ units (25–40% of the multiple-choice section).** Exponential/log questions show up everywhere on the no-calculator Part A *and* power FRQ Q2 (Non-Periodic Modeling) and FRQ Q4 (Symbolic Manipulation) — the two **lowest-scoring** free-response questions on the whole exam. Master logs and you move the needle on a 4→5 more than any other unit.

---

## 2. The must-know concepts

### 2.1 Arithmetic vs. Geometric Sequences

**Plain language:** A sequence is a list of numbers following a rule. **Arithmetic** = you *add* the same number each step (constant difference). **Geometric** = you *multiply* by the same number each step (constant ratio). Arithmetic ↔ linear; geometric ↔ exponential.

**Formulas** (note AP uses *k* as the term index, often starting at *k* = 0 or *k* = 1 — read the problem):
- Arithmetic: $a_n = a_0 + dn$ (or $a_1 + (n-1)d$). Common difference $d = a_{n+1}-a_n$.
- Geometric: $g_n = g_0\cdot r^{\,n}$ (or $g_1\cdot r^{\,n-1}$). Common ratio $r = \dfrac{g_{n+1}}{g_n}$.

**Worked example:** Geometric sequence with $g_1 = 5$, $g_4 = 135$. Find the rule.
- $g_4 = g_1 r^{3} \Rightarrow 135 = 5r^3 \Rightarrow r^3 = 27 \Rightarrow r = 3$.
- Rule: $g_n = 5\cdot 3^{\,n-1}$.

**#1 mistake:** Mixing up the indexing. If it starts at $a_0$, the $n$-th listed term uses exponent/multiplier $n$; if it starts at $a_1$, use $n-1$. Always check what the first term's index is.

---

### 2.2 Linear vs. Exponential Change (the core distinction)

**Plain language:** Linear functions change by a **constant amount** over equal-length input intervals (add the same thing). Exponential functions change by a **constant proportion/ratio** (multiply by the same factor). This is the #1 conceptual idea the exam tests — including FRQ Q1 2025, which asked students to identify a table as exponential by checking ratios.

**Rule (how to tell from a table with equally spaced x):**
- Equal **differences** in y → **linear**.
- Equal **ratios** of successive y's → **exponential**.

**Worked example:** Which model fits? x = 0,1,2,3 → y = 4, 6, 9, 13.5.
- Differences: +2, +3, +4.5 → not constant → not linear.
- Ratios: 6/4 = 1.5, 9/6 = 1.5, 13.5/9 = 1.5 → constant → **exponential**, $y = 4(1.5)^x$.

**#1 mistake:** Only checking differences and declaring "not linear, so I don't know." The exam wants you to immediately test the **ratio** next. Constant ratio = exponential, full stop.

---

### 2.3 Exponential Functions: Growth, Decay, Base, Transformations

**Plain language:** $f(x) = a\cdot b^{x}$. Here $a$ = initial value (y-intercept, the value at $x=0$), $b$ = base = the growth/decay factor. $b>1$ → **growth**; $0<b<1$ → **decay**. The graph has a **horizontal asymptote** (default $y=0$).

**Key facts:**
- General form with shift: $f(x) = a\cdot b^{\,x} + k$ → horizontal asymptote is $y = k$.
- Percent rate: $b = 1 + r$. So 7% growth → $b=1.07$; 7% decay → $b=0.93$.
- $e \approx 2.718$; "continuous" growth uses $f(x)=a\,e^{kt}$.
- Exponential functions are **always concave up** when $a>0$ (the rate of change is itself growing/shrinking proportionally).

**Worked example:** A \$2000 investment grows 5% per year. Value after $t$ years, and after 10 years?
- $V(t) = 2000(1.05)^t$.
- $V(10) = 2000(1.05)^{10} \approx 2000(1.6289) \approx \$3257.79$.

**#1 mistake:** Writing the decay base wrong. "Decreases 12% per year" is $b = 1 - 0.12 = 0.88$, **not** $0.12$. And the asymptote of $a\cdot b^x + k$ is $y=k$, not $y=0$.

---

### 2.4 Function Composition

**Plain language:** $(f\circ g)(x) = f(g(x))$ — do the **inside first**, feed its output into the outside function. Order matters; $f(g(x)) \neq g(f(x))$ in general.

**Worked example:** $f(x)=x^2+1$, $g(x)=2^x$. Find $f(g(3))$.
- Inside: $g(3) = 2^3 = 8$.
- Outside: $f(8) = 8^2+1 = 65$.

**#1 mistake (this is an FRQ Q1 staple):** Composing in the wrong order, or — with a graph/table — misreading which value to look up. For $h(3)=g(f(3))$, you find $f(3)$ FIRST (from the graph/table), then plug that into $g$. Track inside-out.

---

### 2.5 Inverse Functions

**Plain language:** The inverse $f^{-1}$ undoes $f$: it swaps inputs and outputs. If $(a,b)$ is on $f$, then $(b,a)$ is on $f^{-1}$. A function has an inverse only if it's **one-to-one** (passes the horizontal line test). To find it algebraically: swap $x$ and $y$, solve for $y$.

**Key facts:**
- $f(f^{-1}(x)) = x$ and $f^{-1}(f(x)) = x$.
- Graphs of $f$ and $f^{-1}$ are reflections across $y = x$.
- $f^{-1}(c)$ = "the input that makes $f$ output $c$." (Reading inverse VALUES off a table/graph is an FRQ Q1 task — don't compute, just look up backwards.)
- **Exponential and logarithmic functions are inverses of each other.**

**Worked example:** $f(x) = 2^x - 5$. Find $f^{-1}(x)$.
- $y = 2^x - 5 \Rightarrow$ swap: $x = 2^y - 5 \Rightarrow x+5 = 2^y \Rightarrow y = \log_2(x+5)$.
- $f^{-1}(x) = \log_2(x+5)$.

**#1 mistake:** Confusing $f^{-1}(x)$ with $\dfrac{1}{f(x)}$. The inverse is NOT the reciprocal. Also, when asked "does $f$ have an inverse?", justify with the **horizontal line test / one-to-one**, not the vertical line test (that just checks it's a function at all).

---

### 2.6 Logarithmic Functions & Graphs

**Plain language:** A log answers "what exponent?" $\log_b x = y$ means $b^y = x$. It's the inverse of $b^x$. $\log$ (no base) = base 10; $\ln$ = base $e$.

**Key facts (the fundamental equivalence — memorize cold):**
$$\boxed{\,\log_b x = y \iff b^y = x\,}$$
- Domain of $\log_b x$ is $x>0$ (you can't take the log of 0 or a negative). Range is all reals.
- **Vertical asymptote at $x = 0$** (for the parent function).
- $\log_b 1 = 0$, $\log_b b = 1$.
- As $x\to\infty$, $\log_b x \to \infty$ but **slowly**; it is **concave down** (for $b>1$) — increasing at a decreasing rate.

**Worked example:** Evaluate $\log_2 32$ and $\ln(e^4)$.
- $\log_2 32$: "2 to what power is 32?" $2^5=32$, so $=5$.
- $\ln(e^4) = 4$ (log and exp same base undo each other).

**#1 mistake:** Forgetting the **domain restriction**. $\log(x-3)$ requires $x>3$. On modeling FRQs, ignoring domain on a log model loses points.

---

### 2.7 Properties / Rules of Logs (the FRQ Q4 bread-and-butter)

**Plain language:** Three rules turn products into sums, quotients into differences, and exponents into coefficients. Used to **condense** to a single log or **expand** — both directions appear on FRQ Q4.

**Rules** (valid for $M,N>0$):
| Rule | Form |
|---|---|
| Product | $\log_b(MN) = \log_b M + \log_b N$ |
| Quotient | $\log_b\!\frac{M}{N} = \log_b M - \log_b N$ |
| Power | $\log_b(M^p) = p\log_b M$ |
| Change of base | $\log_b x = \dfrac{\ln x}{\ln b} = \dfrac{\log x}{\log b}$ |

**Worked example:** Condense $3\log x + \log y - 2\log z$ into a single log.
- Power rule first: $\log x^3 + \log y - \log z^2$.
- Product/quotient: $\log\!\left(\dfrac{x^3 y}{z^2}\right)$.

**#1 mistake:** Inventing fake rules. $\log(M+N) \neq \log M + \log N$, and $\dfrac{\log M}{\log N} \neq \log M - \log N$. The sum rule applies to the log of a **product**, never a sum. Also apply the power rule **before** combining.

---

### 2.8 Solving Exponential & Logarithmic Equations

**Plain language:** To solve for a variable in an exponent, take a log of both sides. To solve a log equation, exponentiate (rewrite in exponential form) — then **check for extraneous solutions** (domain!).

**Two core moves:**
- Exponential: $b^{x}=c \Rightarrow x = \log_b c = \dfrac{\ln c}{\ln b}$.
- Logarithmic: $\log_b x = c \Rightarrow x = b^{c}$. Combine multiple logs into one first.

**Worked example A (no calc):** Solve $5\cdot 3^{x}=45$.
- $3^x = 9 = 3^2 \Rightarrow x = 2$.

**Worked example B (calc, 3 decimals):** Solve $4^{x}=20$.
- $x = \dfrac{\ln 20}{\ln 4} = \dfrac{2.9957}{1.3863} \approx 2.161$.

**Worked example C (quadratic-in-disguise — this was 2025 FRQ Q4):** Solve $e^{2x}-e^{x}-12=0$.
- Let $u=e^x$: $u^2-u-12=0 \Rightarrow (u-4)(u+3)=0 \Rightarrow u=4$ or $u=-3$.
- $e^x = 4 \Rightarrow x=\ln 4$. ($e^x=-3$ is **rejected** — $e^x$ is never negative.)

**#1 mistake:** Not checking domain after solving log equations — solutions that make any log's argument $\le 0$ must be thrown out. And on Part A, leave exact ($\ln 4$, not 1.386).

---

### 2.9 Exponential & Logarithmic Modeling

**Plain language:** Fit a model to data/context, then use it to predict or interpret. **Exponential model** $y=ab^t$ when there's a constant percent rate. **Logarithmic model** $y=a+b\ln(t+c)$ when growth is fast-then-leveling. This is FRQ Q2 territory (the second-hardest FRQ).

**How to build from data:** Plug given points to get equations, solve for the parameters. Two unknowns → two points.

**Worked example (log model, like 2024 FRQ Q2):** $G(t)=a+b\ln(t+1)$ with $G(0)=40$ and $G(91)=76$.
- $t=0$: $a + b\ln(1) = a + 0 = 40 \Rightarrow a=40$.
- $t=91$: $40 + b\ln(92) = 76 \Rightarrow b = \dfrac{36}{\ln 92} \approx \dfrac{36}{4.5218} \approx 7.961$.
- Model: $G(t)=40+7.961\ln(t+1)$.

**#1 mistake (loses the most FRQ points):** Failing to **explain reasoning** about concavity / model limits. E.g., "the average rate of change estimate is *less than* the true value because the graph is **concave down**, so the secant line lies below the curve." Memorize this concavity-vs-secant argument — it's near-zero-scoring on the exam, so it's free points if you nail it.

---

### 2.15 Semi-Log Plots (Linearizing Data)

**Plain language:** A **semi-log plot** puts the y-axis on a **log scale** (and x linear). On this plot, **exponential data becomes a straight line.** That's the whole point: it's a visual test for "is this exponential?"

> **Exam scope (important):** On the AP exam, semi-log means the **log scale is on the y-axis ONLY, to linearize EXPONENTIAL data.** Putting the *x*-axis on a log scale (to linearize logarithmic data) and full **log-log** plots are **OUT of scope** — don't study them. The exam writes the linearized form as $y=(\log_n b)x+\log_n a$ for a log base $n>1$.

**The math (know why it works):** Take $y = a\cdot b^{x}$ and log both sides:
$$\log y = \log a + (\log b)\,x.$$
This is **linear in** $x$: $Y = mx + B$ where $Y=\log y$, slope $m=\log b$, intercept $B=\log a$.

**Key facts:**
- A straight line on a semi-log plot ⟺ data is **exponential**.
- The **slope** equals $\log b$ → recover the base: $b = 10^{\text{slope}}$ (or $e^{\text{slope}}$ if using $\ln$).
- The **y-intercept** of the line equals $\log a$ → $a = 10^{\text{intercept}}$.

**Worked example:** A semi-log plot ($\log_{10} y$ vs $x$) is a line through $(0, 1)$ and $(2, 3)$. Find the exponential model.
- Slope $=\dfrac{3-1}{2-0}=1=\log b \Rightarrow b=10^{1}=10$.
- Intercept $=1=\log a \Rightarrow a=10^{1}=10$.
- Model: $y = 10\cdot 10^{x}$.

**#1 mistake:** Thinking the points on a semi-log plot are the actual data values. They're the **logs** of the data. Slope is $\log b$, not $b$ — you must un-log to recover the base and initial value.

---

### 2.16 Model Error & Residuals (EK 2.6.B — easy points the exam likes)

**Plain language:** Once you fit a model, you judge how good it is.
- **Error (residual)** at a point = **predicted − actual** value. Positive error = the model **overestimates** there; negative = **underestimates**.
- **Residual plot test:** a model is **appropriate only if the residual plot has NO pattern** (points scattered randomly around 0). A clear pattern (curve, fan shape) means the model type is wrong. *(This is a classic MCQ.)*
- **Context can make an over- or under-estimate preferable.** The exam may ask which is "better" for a situation — e.g., for ordering enough supplies, an **overestimate** is safer; there isn't a universal "right" choice, it depends on the scenario. Justify with the context.

**Worked example:** A model predicts 84.2 thousand downloads on day 30; the app actually had 88.0 thousand. Find the error and say whether the model over- or underestimates.
Error $=$ predicted $-$ actual $=84.2-88.0=\mathbf{-3.8}$ thousand. The error is **negative**, so the model **underestimates** on day 30.
And one error is not a verdict on the model *type*: if the residuals on days 10, 20, 30, 40 ran $+2.1,\ -0.9,\ -3.8,\ -7.2$ — sliding steadily downward instead of scattering about 0 — that **pattern** says the wrong family of function was fitted, however small any single error looks.

**#1 mistake:** Calling a model "good" because the curve looks close, ignoring the residual plot — or saying an estimate is "wrong" when the question wants *over vs under* and *why that's appropriate here*.

---

## 3. Graduated Practice Set (easy → exam-level)

> Try each before opening the solution. Tags: **[NC]** = no-calculator (Part A style), **[C]** = calculator allowed (Part B style); the word after that is the **difficulty** (Easy → Med → Hard → Exam-level), same convention as the Unit 3 pack.

---

**P1 [NC] — Easy — Linear vs. exponential.** A table: x = 0,1,2,3 → y = 50, 40, 32, 25.6. Linear or exponential? Write the model. Answer as two comma-separated entries: the model type, then the model — e.g. quadratic, y=2x^2+1.

<details><summary>Solution</summary>

Differences: −10, −8, −6.4 → not constant → not linear. Ratios: 40/50 = 0.8, 32/40 = 0.8, 25.6/32 = 0.8 → constant → **exponential**. Initial value 50, base 0.8: $y = 50(0.8)^x$.
</details>
<!-- part 1: exponential -->
<!-- part 2: y=50(0.8)^x -->
<!-- part 2: 50(0.8)^x -->
<!-- part 2: y=50*0.8^x -->
<!-- part 2: 50*0.8^x -->
<!-- part 2: y=50*(0.8)^x -->
<!-- part 2: 50*(0.8)^x -->
<!-- format: Answer as two comma-separated entries: the model type, then the model — e.g. quadratic, y=2x^2+1. -->
<!-- topic: 2.2 -->

---

**P2 [NC] — Easy — Geometric sequence.** $g_1 = 7$, common ratio $r = 2$. Find $g_5$ and a formula for $g_n$.

<details><summary>Solution</summary>

$g_n = 7\cdot 2^{\,n-1}$. $g_5 = 7\cdot 2^{4} = 7\cdot 16 = 112$.
</details>
<!-- topic: 2.1 -->
<!-- note: deliberately NOT keyed. 7*2^(n-1) has correct forms a string match cannot reconcile — 3.5*2^n is the same sequence, and a required shape stated in the stem would hand over the a_1-vs-a_0 indexing that IS the skill (see 2.1's #1 mistake). g_5 alone is not the whole answer the stem asks for. -->

---

**P3 [NC] — Easy — Evaluate logs.** Compute (a) $\log_3 81$, (b) $\log_5 \frac{1}{25}$, (c) $\ln e^{7}$.

<details><summary>Solution</summary>

(a) $3^4 = 81 \Rightarrow 4$. (b) $5^{-2} = \frac{1}{25} \Rightarrow -2$. (c) $7$.
</details>
<!-- topic: 2.6 -->
<!-- note: not keyable — three lettered sub-parts. -->

---

**P4 [NC] — Easy — Exponential ↔ log form.** Rewrite $\log_2 x = 5$ in exponential form and solve.

<details><summary>Solution</summary>

$x = 2^5 = 32$.
</details>
<!-- topic: 2.6 -->
<!-- note: deliberately NOT keyed. "x = 2^5 = 32" is one natural chain and "2^5 = x, 32" is another, and no required shape can be stated in the stem without giving away the b^c = x equivalence the item exists to test. -->

---

**P5 [NC] — Easy/Med — Solve a clean exponential.** Solve $2^{3x} = 16$.

<details><summary>Solution</summary>

$16 = 2^4$, so $3x = 4 \Rightarrow x = \dfrac{4}{3}$.
</details>
<!-- key: 4/3 -->
<!-- accept: \dfrac{4}{3} -->
<!-- accept: \frac{4}{3} -->
<!-- topic: 2.8 -->

---

**P6 [C] — Med — Exponential growth model.** A town of 12,000 grows 3% per year. Population after 8 years (round to whole)? When does it reach 18,000?

<details><summary>Solution</summary>

$P(t)=12000(1.03)^t$. $P(8)=12000(1.03)^8 \approx 12000(1.26677) \approx \mathbf{15{,}201}$.
Reach 18,000: $1.03^t = 1.5 \Rightarrow t = \dfrac{\ln 1.5}{\ln 1.03} \approx \dfrac{0.405465}{0.029559} \approx \mathbf{13.717}$ years.
</details>
<!-- topic: 2.3 -->
<!-- note: deliberately NOT keyed. The population is five figures, so a correct answer is as likely to be typed "15,201" as "15201" — and a comma cannot appear inside one part of a compound key, because it is also how the parts are separated. Marking a right answer wrong over a thousands separator is exactly the defect this bank must not ship. -->

---

**P7 [NC] — Med — Condense logs.** Write as one logarithm: $\dfrac{1}{2}\log x + 2\log y - \log z$.

<details><summary>Solution</summary>

$\log x^{1/2} + \log y^2 - \log z = \log\!\left(\dfrac{\sqrt{x}\,y^2}{z}\right)$.
</details>
<!-- topic: 2.7 -->
<!-- note: deliberately NOT keyed. log(sqrt(x)y^2/z) is equally correct as log(x^(1/2)y^2/z), log((x^0.5)(y^2)/z) and half a dozen other typeable spellings, none of them enumerable with confidence. -->

---

**P8 [NC] — Med — Solve a log equation (watch domain).** Solve $\log_2(x) + \log_2(x-2) = 3$.

<details><summary>Solution</summary>

Combine: $\log_2[x(x-2)] = 3 \Rightarrow x(x-2) = 2^3 = 8 \Rightarrow x^2 - 2x - 8 = 0 \Rightarrow (x-4)(x+2)=0$.
$x = 4$ or $x = -2$. Domain requires $x>2$, so reject $x=-2$. **$x = 4$.**
</details>
<!-- key: 4 -->
<!-- accept: 4 only -->
<!-- topic: 2.8 -->

---

**P9 [NC] — Med/Hard — Composition + inverse (FRQ Q1 flavor).** $f(x)=\ln x$, $g(x)=e^{x}+1$. Find (a) $f(g(0))$, (b) $g^{-1}(x)$.

<details><summary>Solution</summary>

(a) $g(0)=e^0+1=2$; $f(2)=\ln 2 \approx 0.693$ (or leave exact $\ln 2$).
(b) $y=e^x+1 \Rightarrow$ swap: $x=e^y+1 \Rightarrow x-1=e^y \Rightarrow y=\ln(x-1)$. So $g^{-1}(x)=\ln(x-1)$.
</details>
<!-- topic: 2.5 -->
<!-- note: not keyable — two lettered sub-parts. (Its other half, composition, is topic 2.4, which no practice item in this pack covers.) -->

---

**P10 [C] — Hard — Semi-log plot.** Data plotted as $\log_{10}y$ vs $x$ lies on a line through $(0, 0.301)$ and $(4, 1.505)$. Find the exponential model $y=ab^x$.

<details><summary>Solution</summary>

Slope $=\dfrac{1.505-0.301}{4-0}=\dfrac{1.204}{4}=0.301=\log_{10}b \Rightarrow b=10^{0.301}\approx 2$.
Intercept $=0.301=\log_{10}a \Rightarrow a=10^{0.301}\approx 2$.
Model: $y = 2\cdot 2^{x}$.
</details>
<!-- key: y = 2(2)^x -->
<!-- accept: y = 2*2^x -->
<!-- accept: y = 2(2^x) -->
<!-- accept: y = 2^(x+1) -->
<!-- accept: a=2, b=2 -->
<!-- topic: 2.10 -->

---

**P11 [NC] — Exam-level — FRQ Q4-style (Symbolic Manipulation).** (a) Solve $e^{x+2}=7$ exactly. (b) Rewrite $\log_3(9x^4) - \log_3(x)$ as a single logarithm in simplest form. (c) Solve $e^{2x} - 5e^{x} + 6 = 0$ exactly.

<details><summary>Solution</summary>

(a) $x+2 = \ln 7 \Rightarrow x = \ln 7 - 2$.
(b) $\log_3\!\dfrac{9x^4}{x} = \log_3(9x^3) = \log_3 9 + \log_3 x^3 = 2 + 3\log_3 x$.
(c) Let $u=e^x$: $u^2-5u+6=0 \Rightarrow (u-2)(u-3)=0 \Rightarrow e^x=2$ or $e^x=3 \Rightarrow x=\ln 2$ or $x=\ln 3$.
*(Show every step — answers without work earn 0 on Q4.)*
</details>
<!-- topic: 2.7 -->
<!-- note: not keyable — three lettered sub-parts, and Q4 is scored on the work, not the final line. -->

---

**P12 [C] — Exam-level — FRQ Q2-style (Non-Periodic Modeling).** Downloads of an app are modeled by $D(t)=a+b\ln(t+1)$ thousand downloads, $t$ = days. $D(0)=10$ and $D(30)=58$.
(a) Find $a$ and $b$.
(b) Find the average rate of change of $D$ from $t=0$ to $t=30$.
(c) The true number of downloads at $t=15$ is *greater* than the value predicted by the average rate of change line from (b). Explain why, using concavity.

<details><summary>Solution</summary>

(a) $D(0)=a+b\ln 1 = a = 10$. $D(30)=10+b\ln 31 = 58 \Rightarrow b=\dfrac{48}{\ln 31}\approx\dfrac{48}{3.4340}\approx 13.978$.
(b) AROC $=\dfrac{D(30)-D(0)}{30-0}=\dfrac{58-10}{30}=\dfrac{48}{30}=\mathbf{1.6}$ thousand/day.
(c) $D$ is a logarithmic function with $b>0$, so it is **increasing and concave down**. A concave-down curve lies **above** its secant line between the two endpoints. The average-rate line is that secant from $t=0$ to $t=30$, so at the interior point $t=15$ the actual curve value is **greater than** the linear estimate. *(This explanation is the part most students lose — say "concave down → curve above secant.")*
</details>
<!-- topic: 2.9 -->
<!-- note: not keyable — three lettered sub-parts, and (c) asks for an explanation. -->

---

**P13 [NC] — Med — Composition.** $f(x)=\ln x$ and $g(x)=e^{2x}$. Find $f(g(3))$.

<details><summary>Solution</summary>

Inside first: $g(3)=e^{2\cdot 3}=e^{6}$. Then the outside: $f(e^{6})=\ln(e^{6})=\mathbf{6}$ (same base — $\ln$ and $e^x$ undo each other).
Order matters, and the other composition is a different number: $g(f(3))=e^{2\ln 3}=(e^{\ln 3})^{2}=3^{2}=9$. So $f(g(3))=6$ while $g(f(3))=9$ — always work inside-out from the value the stem names.
</details>
<!-- key: 6 -->
<!-- accept: f(g(3)) = 6 -->
<!-- topic: 2.4 -->

---

**P14 [C] — Med — Model error & residuals.** Daily active users, in thousands, are modeled by $U(t)=12(1.5)^t$ with $t$ in weeks. At $t=4$ the app actually had 58.5 thousand users. Find the model's error at $t=4$, where error $=$ predicted $-$ actual. Give the number only.

<details><summary>Solution</summary>

Predicted: $U(4)=12(1.5)^4=12(5.0625)=60.75$.
Error $=60.75-58.5=\mathbf{2.25}$ (thousand users). It is **positive**, so the model **overestimates** at $t=4$.
A single error never settles whether the model TYPE is right — that is the **residual plot's** job: residuals scattered about 0 with no pattern → the exponential model is appropriate; a curve or a fan shape → the wrong family was fitted, no matter how small this one error is.
</details>
<!-- key: 2.25 -->
<!-- topic: 2.11 -->

---

> **Exam-format questions (P15–P28).** P15–P27 are **multiple choice**, written to the May 2027 paper: MCQ Part A is 29 questions with **no calculator** and Part B is 13 **with** a calculator, so these run 9 no-calc to 4 calculator. Pick a letter, then read why the other three are there — every wrong option is a mistake someone actually makes. P28 is the **free-response** question Unit 2 owns: **Q2 Modeling a Non-Periodic Context**, which is sat **with a calculator** on the real exam.

**P15 [NC] — Med — sequences, and which index you are standing on.** A geometric sequence has $g_3 = 12$ and $g_6 = 96$. What is $g_1$?
A) 1.5   B) 3   C) 6   D) -44
<details><summary>Solution</summary>

From $g_3$ to $g_6$ is **three** steps, so $g_6 = g_3\cdot r^{3}$: $96 = 12r^3 \Rightarrow r^3 = 8 \Rightarrow r = 2$ (the only real cube root).
From $g_3$ back to $g_1$ is **two** steps, so divide by $r$ twice: $g_1 = \dfrac{12}{2^2} = \mathbf{3}$.
Check: 3, 6, **12**, 24, 48, **96** ✓ — $g_3 = 12$ and $g_6 = 96$, as the stem says.

Why the others are there: **C** steps back only once and reports $g_2 = 6$ — off-by-one on the index, which is this topic's #1 mistake. **A** reuses the *gap* of 3 on the way back and divides by $r$ three times, $12/8 = 1.5$; that sequence has $g_3 = 6$, not 12. **D** treats the sequence as **arithmetic**: $d = (96-12)/3 = 28$, so $g_1 = 12 - 2(28) = -44$. The differences really are constant for 12, 40, 68, 96 — but the stem says *geometric*, so it is the **ratio** that is fixed, not the difference.
</details>
<!-- key: B -->
<!-- practice: 1.A -->
<!-- topic: 2.1 -->

---

**P16 [NC] — Med — reading an exponential graph straight off its equation.** $f(x) = 5(0.4)^{x} - 3$. Which statement describes the graph of $f$?
A) Decreasing, with horizontal asymptote $y = 0$   B) Increasing, with horizontal asymptote $y = -3$   C) Decreasing, with horizontal asymptote $y = -3$   D) Decreasing, with horizontal asymptote $y = 5$
<details><summary>Solution</summary>

Two separate reads, and the exam scores them separately.
**Direction, from the base.** $b = 0.4$ and $0 < b < 1$, so $f$ is **decreasing** for every $x$.
**Asymptote, from the shift.** $a\cdot b^{x}$ flattens toward 0, so $a\cdot b^{x} + k$ flattens toward $k$. Here $k = -3$: as $x\to\infty$, $5(0.4)^x \to 0$ and $f(x)\to\mathbf{-3}$.
Check: $f(10) = 5(0.4)^{10} - 3 = 5(0.00010486) - 3 \approx -2.99948$ — sinking onto $y=-3$ from above ✓.

Why the others are there: **A** gives the *parent* function's asymptote and forgets the vertical shift, which is the #1 mistake for this topic. **D** reads the coefficient 5 as the asymptote; 5 is not even the $y$-intercept, since $f(0) = 5 - 3 = 2$. **B** reads $0.4$ as a growth factor because it is positive — growth needs $b > 1$, and $0.4$ is decay.
</details>
<!-- key: C -->
<!-- practice: 3.A -->
<!-- topic: 2.3 -->

---

**P17 [NC] — Med/Hard — inverse of a shifted exponential.** $f(x) = 3^{\,x-1} + 4$. Which of these is $f^{-1}(x)$?
A) $\log_3(x-1)+4$   B) $\dfrac{1}{3^{\,x-1}+4}$   C) $\log_3(x-4)-1$   D) $\log_3(x-4)+1$
<details><summary>Solution</summary>

Swap and solve, one layer at a time — **undo the outside operation first**.
$y = 3^{\,x-1}+4 \Rightarrow$ swap: $x = 3^{\,y-1}+4 \Rightarrow x-4 = 3^{\,y-1} \Rightarrow \log_3(x-4) = y-1 \Rightarrow y = \log_3(x-4)+\mathbf{1}$.
Check the definition, don't just trust the algebra: with $x = 13$, $f^{-1}(13) = \log_3 9 + 1 = 2+1 = 3$, and $f(3) = 3^{2}+4 = 13$ ✓.

Why the others are there: **B** is the **reciprocal** $1/f(x)$, not the inverse — the #1 mistake for this topic ($1/f(13) = 1/13$, nowhere near 3). **C** subtracts the 1 instead of adding it, moving the inner shift across the wrong way; $f(\log_3 9 - 1) = f(1) = 3^{0}+4 = 5 \neq 13$. **A** shuffles the two constants into the log without ever solving — it is what you write if you pattern-match "$-1$ inside, $+4$ outside" straight over; $f(\log_3 12 + 4) \approx f(6.262) = 328$, not 13.
</details>
<!-- key: D -->
<!-- practice: 1.C -->
<!-- topic: 2.5 -->

---

**P18 [NC] — Med — domain and asymptote of a reflected log.** $g(x) = \log_2(3-x)$. What is the domain of $g$, and the equation of its vertical asymptote?
A) $x < 3$, asymptote $x = 3$   B) $x > 3$, asymptote $x = 3$   C) $x > -3$, asymptote $x = -3$   D) all real numbers, asymptote $x = 0$
<details><summary>Solution</summary>

A log's argument must be **positive**, so set the inside $> 0$ and solve: $3 - x > 0 \Rightarrow 3 > x \Rightarrow \mathbf{x < 3}$.
The asymptote sits where the argument hits **0**: $3 - x = 0 \Rightarrow \mathbf{x = 3}$. As $x\to 3^{-}$ the argument shrinks to 0 and $\log_2$ of it dives to $-\infty$.
Check: $g(2) = \log_2 1 = 0$ ✓ defined; $g(2.9) = \log_2 0.1 \approx -3.32$ (heading down) ✓; $g(4) = \log_2(-1)$, undefined ✓.

Why the others are there: **B** solves $3-x>0$ as though the $-x$ were a $+x$ and lands on the wrong side of 3; at $x=4$ the function does not exist. **C** reads the $3$ as a horizontal shift of $\log_2(x+3)$ and answers for that function instead — but $x = 4$ is greater than $-3$ and still undefined here. **D** gives the *parent* $\log_2 x$'s asymptote and forgets the domain restriction altogether, which is this topic's #1 mistake.
</details>
<!-- key: A -->
<!-- practice: 3.A -->
<!-- topic: 2.6 -->

---

**P19 [NC] — Med/Hard — condense to one logarithm.** For $x > 0$, which single logarithm equals $3\log_2 x - \log_2(x+4)$?
A) $\log_2\!\dfrac{3x}{x+4}$   B) $\dfrac{\log_2 x^3}{\log_2 (x+4)}$   C) $\log_2(x^3 - x - 4)$   D) $\log_2\!\dfrac{x^3}{x+4}$
<details><summary>Solution</summary>

**Power rule first, then combine** — that order is the whole trick.
$3\log_2 x = \log_2 x^{3}$ (the coefficient becomes an **exponent**), and a **difference** of logs is the log of a **quotient**:
$\log_2 x^3 - \log_2(x+4) = \log_2\!\dfrac{x^{3}}{x+4}$.
Check at $x = 4$: the original is $3\log_2 4 - \log_2 8 = 6 - 3 = 3$, and $\log_2\frac{64}{8} = \log_2 8 = 3$ ✓.

Why the others are there — all three are the fake rules this topic warns about, and the check at $x=4$ kills each one. **A** multiplies the 3 in as a coefficient instead of raising to a power: $\log_2\frac{12}{8} \approx 0.585$. **B** turns a *difference of logs* into a *quotient of logs*; $\frac{\log_2 64}{\log_2 8} = \frac{6}{3} = 2$, and $\frac{\log M}{\log N}\neq \log M-\log N$. **C** subtracts the arguments instead of dividing them: $\log_2(64-4-4) = \log_2 56 \approx 5.807$.
</details>
<!-- key: D -->
<!-- practice: 1.B -->
<!-- topic: 2.7 -->

---

**P20 [C] — Hard — building a log model and predicting with it.** A restocked lake's fish population is modeled by $P(t) = a + b\ln(t+1)$, where $t$ is years since the restocking. $P(0) = 800$ and $P(4) = 1300$. To the nearest whole fish, what does the model predict for $t = 9$?
A) 1483   B) 1515   C) 1925   D) 2385
<details><summary>Solution</summary>

**Use $t=0$ first — it kills $b$**, because $\ln(0+1) = \ln 1 = 0$:
$P(0) = a + b\ln 1 = a = \mathbf{800}$.
Then $P(4) = 800 + b\ln 5 = 1300 \Rightarrow b = \dfrac{500}{\ln 5} = \dfrac{500}{1.60944} \approx 310.667$.
Now evaluate at $t=9$, remembering the **$+1$ inside**: $P(9) = 800 + 310.667\ln(10) = 800 + 310.667(2.302585) \approx 1515.3 \to \mathbf{1515}$.
Don't round $b$ to a couple of decimals on the way through — carry it, and round only at the end.

Why the others are there: **A** drops the $+1$ at the last step and uses $\ln 9$ instead of $\ln 10$ ($800 + 310.667(2.1972) \approx 1483$) — the single most common slip on a $\ln(t+1)$ model. **C** extrapolates **linearly** at the average rate of $500/4 = 125$ fish per year, giving $800 + 125(9) = 1925$; a log curve is concave down, so its growth is already slowing and the straight line overshoots. **D** fits an **exponential** $800r^{t}$ instead of the log model the stem hands you: $r = (1300/800)^{1/4} \approx 1.129$ and $800(1.129)^{9} \approx 2385$ — right technique, wrong family of function.
</details>
<!-- key: B -->
<!-- practice: 1.C -->
<!-- topic: 2.9 -->

---

**P21 [NC] — Hard — quadratic in disguise, and the root you must throw away.** Solve $e^{2x} - 3e^{x} - 10 = 0$.
A) $x = 5$ only   B) $x = \ln 5$ and $x = \ln 2$   C) $x = \ln 5$ only   D) $x = \ln 5$ and $x = -\ln 2$
<details><summary>Solution</summary>

Let $u = e^{x}$, so $e^{2x} = (e^{x})^{2} = u^{2}$:
$u^{2} - 3u - 10 = 0 \Rightarrow (u-5)(u+2) = 0 \Rightarrow u = 5$ or $u = -2$.
Now **undo the substitution and test both**. $e^{x} = 5 \Rightarrow x = \ln 5$. And $e^{x} = -2$ is **impossible** — $e^{x}$ is positive for every real $x$, so that root is rejected, not converted.
So there is exactly **one** solution, $x = \ln 5$ (leave it exact; this is a no-calculator question).
Check: $e^{2\ln 5} - 3e^{\ln 5} - 10 = 25 - 15 - 10 = 0$ ✓.

Why the others are there: **B** keeps the rejected root and quietly drops its minus sign, reading $e^x = -2$ as $x = \ln 2$; substituting gives $4 - 6 - 10 = -12$, not 0. **D** keeps it and reads $\ln(-2)$ as $-\ln 2$, which is $\ln\frac12$ — substituting gives $0.25 - 1.5 - 10 = -11.25$, not 0. Neither is a near miss; both are answers to a different equation. **A** solves the quadratic correctly and then forgets that $u$ was $e^{x}$, reporting $u = 5$ as $x$.
</details>
<!-- key: C -->
<!-- practice: 1.A -->
<!-- topic: 2.8 -->

---

**P22 [C] — Hard — a ratio over a three-year step is not a yearly rate.** A chemical's mass is recorded every three years: at $x = 0, 3, 6, 9$ years the mass is $240, 168, 117.6, 82.32$ grams. The data is exponential. What is the decay factor **per year**, rounded to three decimal places?
A) 0.888   B) 0.900   C) 0.700   D) 0.233
<details><summary>Solution</summary>

The ratios confirm it is exponential: $168/240 = 0.7$, $117.6/168 = 0.7$, $82.32/117.6 = 0.7$ — constant. But each of those ratios spans **three** years, so 0.7 is the *three-year* factor, not the yearly one.
Write $y = 240b^{x}$ with $x$ in years. Then $b^{3} = 0.7$, so
$b = 0.7^{1/3} = 0.887904\ldots \to \mathbf{0.888}$.
Check: $240(0.887904)^{3} = 168.0$ ✓, and $240(0.887904)^{9} = 82.32$ ✓.

Why the others are there: **C** reports the three-year ratio as the yearly factor — the whole point of the question; $240(0.7)^{3} = 82.32$, which is the mass after **nine** years, not three. **B** spreads the 30% loss evenly as 10% a year, $1 - 0.30/3 = 0.900$; that is linear thinking applied to a ratio, and it predicts $240(0.9)^{9} = 92.98$ g at year 9 instead of 82.32. **D** divides the ratio by the step, $0.7/3 \approx 0.233$, treating a multiplier as though it were a difference; the mass would be down to 3 g by year 3.
</details>
<!-- key: A -->
<!-- practice: 2.A -->
<!-- topic: 2.2 -->

---

## 4. Quick Self-Check (rapid Q&A)

1. **Q:** Table has equal y-ratios over equal x-steps — linear or exponential? **A:** Exponential.
2. **Q:** "Decreases 8% per year" → base $b=$? **A:** $0.92$.
3. **Q:** $\log_b x = y$ is equivalent to what exponential statement? **A:** $b^y = x$.
4. **Q:** Domain of $\log(x-4)$? **A:** $x>4$.
5. **Q:** Does $\log(M+N)=\log M+\log N$? **A:** No — the product rule is for $\log(MN)$.
6. **Q:** Change of base: $\log_5 30 = $? **A:** $\dfrac{\ln 30}{\ln 5}$ (≈ 2.113).
7. **Q:** On a semi-log plot, exponential data looks like…? **A:** A straight line; slope $=\log b$, intercept $=\log a$.
8. **Q:** $f(x)=b^x$ and $g(x)=\log_b x$ relate how? **A:** They are inverses (reflections over $y=x$).

---

## 5. "Don't Get These Wrong" — Unit 2 Exam Traps

1. **Decay base.** "Decreases 12%" → $b = 0.88$, not $0.12$ and not $-0.12$.
2. **Asymptote shift.** $a\cdot b^x + k$ has horizontal asymptote $y=k$ (not always $0$). A log $\log_b(x-h)$ has **vertical** asymptote $x=h$.
3. **Fake log rules.** No splitting $\log(M+N)$; the power rule moves the exponent to the **front** as a coefficient; $\dfrac{\log M}{\log N}\neq \log M-\log N$.
4. **Extraneous log solutions.** Always re-check that every solution keeps log arguments positive — toss the ones that don't.
5. **$e^x = $ negative is impossible.** In quadratic-in-disguise problems, reject any solution where $e^x$ (or $b^x$) comes out $\le 0$.
6. **Composition order.** $f(g(x))$: inside first. With a graph/table, look up the inner value before plugging into the outer.
7. **Inverse ≠ reciprocal.** $f^{-1}(x)\neq \dfrac{1}{f(x)}$. To justify an inverse exists, cite **one-to-one / horizontal line test**.
8. **Exact vs. decimal.** No-calculator (Part A) and FRQ Q4: leave exact ($\ln 7$, $\log_2 5$). Calculator parts/FRQ Q1–Q2: round to **3 decimals**, and don't round intermediate steps (it changes the answer and loses the point).
9. **Concavity reasoning on FRQ Q2.** The average-rate (secant) line is **below** a concave-down curve and **above** a concave-up curve. State this explicitly — it's the highest-value, most-missed explanation in the unit.
10. **Semi-log misread.** Plotted points are $\log y$, not $y$. Slope is $\log b$ — un-log it ($b=10^{\text{slope}}$) to get the real base.
