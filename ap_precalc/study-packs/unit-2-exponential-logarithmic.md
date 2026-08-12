# Unit 2: Exponential and Logarithmic Functions — Express Pack

> **For Lucas. Goal: A in class + 4/5 on the AP exam. This is a fast catch-up, not a textbook. Learn by doing — read each concept once, then go straight to the practice.**

---

## 1. Why it matters / exam weight

Unit 2 is **one of the two heaviest MCQ units (27–40% of the multiple-choice section).** Exponential/log questions show up everywhere on the no-calculator Part A *and* power FRQ Q2 (Non-Periodic Modeling) and FRQ Q4 (Symbolic Manipulation) — the two **lowest-scoring** free-response questions on the whole exam. Master logs and you move the needle on a 4→5 more than any other unit.

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

**#1 mistake:** Calling a model "good" because the curve looks close, ignoring the residual plot — or saying an estimate is "wrong" when the question wants *over vs under* and *why that's appropriate here*.

---

## 3. Graduated Practice Set (easy → exam-level)

> Try each before opening the solution. Tags: **[NC]** = no-calculator (Part A style), **[C]** = calculator allowed (Part B style).

---

**P1 [NC] — Linear vs. exponential.** A table: x = 0,1,2,3 → y = 50, 40, 32, 25.6. Linear or exponential? Write the model.

<details><summary>Solution</summary>

Differences: −10, −8, −6.4 → not constant → not linear. Ratios: 40/50 = 0.8, 32/40 = 0.8, 25.6/32 = 0.8 → constant → **exponential**. Initial value 50, base 0.8: $y = 50(0.8)^x$.
</details>

---

**P2 [NC] — Geometric sequence.** $g_1 = 7$, common ratio $r = 2$. Find $g_5$ and a formula for $g_n$.

<details><summary>Solution</summary>

$g_n = 7\cdot 2^{\,n-1}$. $g_5 = 7\cdot 2^{4} = 7\cdot 16 = 112$.
</details>

---

**P3 [NC] — Evaluate logs.** Compute (a) $\log_3 81$, (b) $\log_5 \frac{1}{25}$, (c) $\ln e^{7}$.

<details><summary>Solution</summary>

(a) $3^4 = 81 \Rightarrow 4$. (b) $5^{-2} = \frac{1}{25} \Rightarrow -2$. (c) $7$.
</details>

---

**P4 [NC] — Exponential ↔ log form.** Rewrite $\log_2 x = 5$ in exponential form and solve.

<details><summary>Solution</summary>

$x = 2^5 = 32$.
</details>

---

**P5 [NC] — Solve a clean exponential.** Solve $2^{3x} = 16$.

<details><summary>Solution</summary>

$16 = 2^4$, so $3x = 4 \Rightarrow x = \dfrac{4}{3}$.
</details>

---

**P6 [C] — Exponential growth model.** A town of 12,000 grows 3% per year. Population after 8 years (round to whole)? When does it reach 18,000?

<details><summary>Solution</summary>

$P(t)=12000(1.03)^t$. $P(8)=12000(1.03)^8 \approx 12000(1.26677) \approx \mathbf{15{,}201}$.
Reach 18,000: $1.03^t = 1.5 \Rightarrow t = \dfrac{\ln 1.5}{\ln 1.03} \approx \dfrac{0.405465}{0.029559} \approx \mathbf{13.717}$ years.
</details>

---

**P7 [NC] — Condense logs.** Write as one logarithm: $\dfrac{1}{2}\log x + 2\log y - \log z$.

<details><summary>Solution</summary>

$\log x^{1/2} + \log y^2 - \log z = \log\!\left(\dfrac{\sqrt{x}\,y^2}{z}\right)$.
</details>

---

**P8 [NC] — Solve a log equation (watch domain).** Solve $\log_2(x) + \log_2(x-2) = 3$.

<details><summary>Solution</summary>

Combine: $\log_2[x(x-2)] = 3 \Rightarrow x(x-2) = 2^3 = 8 \Rightarrow x^2 - 2x - 8 = 0 \Rightarrow (x-4)(x+2)=0$.
$x = 4$ or $x = -2$. Domain requires $x>2$, so reject $x=-2$. **$x = 4$.**
</details>

---

**P9 [NC] — Composition + inverse (FRQ Q1 flavor).** $f(x)=\ln x$, $g(x)=e^{x}+1$. Find (a) $f(g(0))$, (b) $g^{-1}(x)$.

<details><summary>Solution</summary>

(a) $g(0)=e^0+1=2$; $f(2)=\ln 2 \approx 0.693$ (or leave exact $\ln 2$).
(b) $y=e^x+1 \Rightarrow$ swap: $x=e^y+1 \Rightarrow x-1=e^y \Rightarrow y=\ln(x-1)$. So $g^{-1}(x)=\ln(x-1)$.
</details>

---

**P10 [C] — Semi-log plot.** Data plotted as $\log_{10}y$ vs $x$ lies on a line through $(0, 0.301)$ and $(4, 1.505)$. Find the exponential model $y=ab^x$.

<details><summary>Solution</summary>

Slope $=\dfrac{1.505-0.301}{4-0}=\dfrac{1.204}{4}=0.301=\log_{10}b \Rightarrow b=10^{0.301}\approx 2$.
Intercept $=0.301=\log_{10}a \Rightarrow a=10^{0.301}\approx 2$.
Model: $y = 2\cdot 2^{x}$.
</details>

---

**P11 [NC] — FRQ Q4-style (Symbolic Manipulation).** (a) Solve $e^{x+2}=7$ exactly. (b) Rewrite $\log_3(9x^4) - \log_3(x)$ as a single logarithm in simplest form. (c) Solve $e^{2x} - 5e^{x} + 6 = 0$ exactly.

<details><summary>Solution</summary>

(a) $x+2 = \ln 7 \Rightarrow x = \ln 7 - 2$.
(b) $\log_3\!\dfrac{9x^4}{x} = \log_3(9x^3) = \log_3 9 + \log_3 x^3 = 2 + 3\log_3 x$.
(c) Let $u=e^x$: $u^2-5u+6=0 \Rightarrow (u-2)(u-3)=0 \Rightarrow e^x=2$ or $e^x=3 \Rightarrow x=\ln 2$ or $x=\ln 3$.
*(Show every step — answers without work earn 0 on Q4.)*
</details>

---

**P12 [C] — FRQ Q2-style (Non-Periodic Modeling).** Downloads of an app are modeled by $D(t)=a+b\ln(t+1)$ thousand downloads, $t$ = days. $D(0)=10$ and $D(30)=58$.
(a) Find $a$ and $b$.
(b) Find the average rate of change of $D$ from $t=0$ to $t=30$.
(c) The true number of downloads at $t=15$ is *greater* than the value predicted by the average rate of change line from (b). Explain why, using concavity.

<details><summary>Solution</summary>

(a) $D(0)=a+b\ln 1 = a = 10$. $D(30)=10+b\ln 31 = 58 \Rightarrow b=\dfrac{48}{\ln 31}\approx\dfrac{48}{3.4340}\approx 13.978$.
(b) AROC $=\dfrac{D(30)-D(0)}{30-0}=\dfrac{58-10}{30}=\dfrac{48}{30}=\mathbf{1.6}$ thousand/day.
(c) $D$ is a logarithmic function with $b>0$, so it is **increasing and concave down**. A concave-down curve lies **above** its secant line between the two endpoints. The average-rate line is that secant from $t=0$ to $t=30$, so at the interior point $t=15$ the actual curve value is **greater than** the linear estimate. *(This explanation is the part most students lose — say "concave down → curve above secant.")*
</details>

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
