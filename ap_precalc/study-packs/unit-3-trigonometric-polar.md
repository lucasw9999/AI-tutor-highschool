# Unit 3: Trigonometric and Polar Functions — Express Pack

*AP Precalculus · Lucas · target: A in class + 4/5 on exam. Condensed, exam-driven, problem-first. Exam tests Units 1–3 ONLY.*

---

## 1. Why it matters / exam weight

Unit 3 is **30–35% of the MCQ** — the single biggest function-type category (Trig & Polar) on the exam. It owns **FRQ Q3 (Modeling a Periodic Context, no-calc)** outright and supplies the trig half of **FRQ Q4 (Symbolic Manipulation, no-calc)** — and Q4 is the **lowest-scoring FRQ both years** (mean 1.28/6 in 2024, 1.93/6 in 2025). Master this unit and you separate yourself from the 4s. **Calculator must be in RADIAN mode all year.**

---

## 2. The must-know concepts

> Mental model for the whole unit: **angle in → number out**. Radians are the language; the unit circle is the dictionary; sinusoids are radians wrapped onto a graph; identities are algebra rules for trig; polar is "distance-and-angle" instead of "x-and-y."

### 2.1 Radians & the unit circle (the foundation — memorize cold)

**Plain idea:** A radian measures angle by arc length on a circle of radius 1. Once around = 2π radians = 360°. On the unit circle, the point at angle θ is **(cos θ, sin θ)**.

**Key rules:**
- Convert: **radians = degrees · π/180**; **degrees = radians · 180/π**.
- **cos θ = x-coordinate, sin θ = y-coordinate, tan θ = sin θ / cos θ = y/x.**
- Signs by quadrant: "**All Students Take Calculus**" → QI all+, QII sin+, QIII tan+, QIV cos+.
- Memorize QI exact values:

| θ | 0 | π/6 | π/4 | π/3 | π/2 |
|---|---|-----|-----|-----|-----|
| sin | 0 | 1/2 | √2/2 | √3/2 | 1 |
| cos | 1 | √3/2 | √2/2 | 1/2 | 0 |
| tan | 0 | √3/3 | 1 | √3 | undef |

**Worked example — exact value of cos(5π/6):**
5π/6 is in QII (between π/2 and π). Reference angle = π − 5π/6 = π/6. cos is **negative** in QII. cos(π/6) = √3/2 → **cos(5π/6) = −√3/2.**

**#1 mistake:** Wrong sign because you skipped the quadrant check. Always do **reference angle first, then slap on the quadrant sign.**

---

### 2.2 Sinusoidal functions: amplitude, period, midline, phase shift

**Plain idea:** Sine and cosine make repeating "waves." Four numbers fully describe any wave.

**Key form:** **f(x) = a·sin(b(x − c)) + d** (cosine identical).
- **Amplitude = |a|** = (max − min)/2 (height from midline to peak).
- **Midline = d** = (max + min)/2 (the horizontal center line).
- **Period = 2π/|b|** (how long one full cycle takes). So **b = 2π/period.**
- **Phase shift = c** (horizontal shift; the inside is b(x − c), NOT bx − c).
- Negative *a* flips the wave upside down.

**Worked example — build the sinusoid:** Max 18, min 0, one full cycle every 2 units, max occurs at x = 1.
- d = (18+0)/2 = **9**; a = (18−0)/2 = **9**; b = 2π/2 = **π**.
- Cosine peaks at its shift, and the max is at x = 1, so **f(x) = 9 cos(π(x − 1)) + 9.**

**#1 mistake:** Forgetting to **factor b out** before reading the phase shift. In sin(πx − π) the shift is c where πx − π = π(x − 1) → shift = 1, not π.

---

### 2.2b The five key points + midline, over TWO cycles (FRQ Q3 **Part A** — scorable points you can't skip)
FRQ Q3 **Part A literally asks you to identify and plot the coordinates of five labeled points on the sinusoid and draw its midline, across *two full cycles*.** It's procedural points (skills 2.A/2.B) that students leave on the table by jumping to the equation.

**Plain idea:** A sinusoid's graph is five landmark points per cycle, spaced a **quarter period** apart, alternating between the midline and an extreme. Pin down the midline, the amplitude and the quarter period and the picture draws itself — twice, because Part A asks for two cycles.

**The five points within one cycle** are at the **quarter-period** marks: **max → midline (going down) → min → midline (going up) → max.** Steps:
1. Midline **d = (max+min)/2** (draw this horizontal line); amplitude **a = (max−min)/2**; period **P**; quarter-period **= P/4**.
2. Start at a known point (e.g., a max at t₀). Step forward by **P/4** each time, alternating value: **max (d+a) → midline (d) → min (d−a) → midline (d) → max (d+a)** — that's one cycle (5 points). Continue another full period for the **second cycle**.

**Worked example:** max 40, min 2, period 60, max at t = 0.
d = 21, a = 19, quarter-period = 15. Points: **(0, 40) → (15, 21) → (30, 2) → (45, 21) → (60, 40)** [cycle 1], then **(75, 21) → (90, 2) → (105, 21) → (120, 40)** [cycle 2]. Draw the midline at **y = 21**.

**#1 mistake:** plotting only one cycle, or forgetting to **draw/label the midline** — both are explicitly required.

---

### 2.3 Sinusoidal behavior on an interval + concavity ↔ rate of change (FRQ Q3 gold)

**Plain idea:** On any piece of a wave the exam asks two things: is the function **positive/negative** and **increasing/decreasing**, AND is the **rate of change increasing or decreasing** (concavity — no calculus needed, just read the curve).

**Key rules:**
- **Concave down** (like a hilltop, ∩) → graph curving downward → **rate of change is decreasing.**
- **Concave up** (like a valley, ∪) → **rate of change is increasing.**
- A function can be *increasing* while its *rate of change is decreasing* (rising but leveling off near a peak). These are independent — say BOTH.

**Worked example:** On an interval a sinusoid is below the midline and heading from the midline down toward the minimum. Describe it.
→ Function is **negative and decreasing**; it's the valley region so it's **concave up**, meaning the **rate of change is increasing** (the descent is slowing as it nears the bottom).

**#1 mistake:** Conflating "decreasing" (the value going down) with "rate of change decreasing" (the slope getting smaller). Different claims — Chief Reader flags this every year.

---

### 2.4 The tangent function

**Plain idea:** tan θ = sin θ/cos θ. It has **no amplitude**, repeats every **π** (not 2π), and shoots to ±∞ (vertical asymptotes) where cos = 0.

**Key rules:**
- **Period = π.** General form y = a·tan(b(x − c)) + d has period **π/|b|.**
- **Vertical asymptotes** at x = π/2 + πk (where cos = 0); zeros where sin = 0 (x = πk).
- Always **increasing** between consecutive asymptotes; concavity flips sign at each zero.

**Worked example — period of y = tan(2x):** period = π/|2| = **π/2.** Asymptotes where 2x = π/2 + πk → x = π/4 + πk/2.

**#1 mistake:** Using 2π/b (the sine rule) for tangent's period. Tangent's base period is **π.**

---

### 2.5 Inverse trig functions (and their restricted ranges)

**Plain idea:** arcsin/arccos/arctan undo trig, but only on a restricted piece so the answer is unique. **The range restriction is the whole game.**

**Key rules (memorize the output intervals):**
- **arcsin x** (sin⁻¹): range **[−π/2, π/2]** (QI & QIV).
- **arccos x** (cos⁻¹): range **[0, π]** (QI & QII).
- **arctan x** (tan⁻¹): range **(−π/2, π/2).**
- Domain of arcsin/arccos is **[−1, 1]** only.

**Worked example — exact value of arcsin(−1/2):**
Need an angle in [−π/2, π/2] with sine −1/2. That's **−π/6.** (Not 7π/6 — out of range.)

**#1 mistake:** Giving an answer outside the inverse function's range (e.g., arccos returning a negative angle). arccos output is **never negative.**

---

### 2.6 Solving trig equations

**Plain idea:** Find ALL angles that work, not just the one the calculator/unit circle hands you. Sine/cosine repeat every 2π; tangent every π.

**Key recipe:**
1. Isolate the trig function.
2. Find the reference solution(s) in one cycle (use the unit circle or inverse).
3. Add the period: **+2πk** for sin/cos, **+πk** for tan, k any integer.
4. Watch for a **second solution per cycle** (sin and cos hit most values twice).

**Worked example — solve 2 sin x = √3 (all solutions):**
sin x = √3/2 → in [0, 2π): x = **π/3** and x = **2π/3** (sine positive in QI and QII).
All solutions: **x = π/3 + 2πk** and **x = 2π/3 + 2πk.**

**#1 mistake:** Reporting only one solution. sin x = √3/2 has **two** per cycle. Forgetting the "+2πk / +πk" loses the generality point.

---

### 2.7 Secant, cosecant, cotangent (reciprocals)

**Plain idea:** Just flips. **sec = 1/cos, csc = 1/sin, cot = 1/tan = cos/sin.**

**Key rules:**
- **sec** pairs with **cos** (asymptotes where cos = 0); **csc** pairs with **sin**; **cot** pairs with **tan** but has period **π** and decreasing branches.
- They're undefined wherever the denominator trig function is 0.

**Worked example — sec(π/3):** sec = 1/cos. cos(π/3) = 1/2 → **sec(π/3) = 2.**

**#1 mistake:** Mixing up the pairs — **sec goes with cos** (both start with the "co"-cross-up rule: se**c**↔**c**os... easiest is just memorize sec=1/cos, csc=1/sin).

---

### 2.8 Trig identities (Pythagorean, sum/difference, double-angle)

**Plain idea:** Algebra rewrite rules. The exam's #1 use: simplify a messy expression to "a single term" or solve an equation by substituting an identity.

**Key identities (the must-haves):**
- **Pythagorean:** sin²θ + cos²θ = 1 → also **1 − sin²θ = cos²θ**, **1 + tan²θ = sec²θ**, **1 + cot²θ = csc²θ.**
- **Double-angle:** sin 2θ = 2 sin θ cos θ; cos 2θ = cos²θ − sin²θ = 1 − 2sin²θ = 2cos²θ − 1.
- **Sum/difference:** sin(A±B) = sin A cos B ± cos A sin B; cos(A±B) = cos A cos B ∓ sin A sin B.

**Worked example — simplify k(x) = [(1 − sin²x)/sin x]·sec x to a single term in tan x:**
1 − sin²x = cos²x, and sec x = 1/cos x.
→ (cos²x / sin x)·(1/cos x) = cos x / sin x = **1/tan x** (= cot x). *(This is the actual 2024 FRQ Q4B answer.)*

**#1 mistake:** Reaching for sum/double-angle when a **Pythagorean swap** (1 − sin²x = cos²x) is what's needed. Look for "1 ± (squared trig)" patterns first.

---

### 2.9 Polar coordinates & polar graphs

**Plain idea:** Locate a point by **distance r from origin and angle θ**, instead of (x, y). A polar function r = f(θ) traces a curve as θ sweeps around.

**Key conversions:**
- **x = r cos θ, y = r sin θ** (polar → rectangular).
- **r = √(x² + y²), θ = arctan(y/x)** (rectangular → polar; mind the quadrant).
- Common shapes: **r = a** (circle), **r = a cos θ / a sin θ** (circle through origin), **r = a ± b cos θ / a ± b sin θ** (limaçon; cardioid when a = b), **r = a cos(nθ)** (rose).

**Worked example — convert (r, θ) = (4, 2π/3) to rectangular:**
x = 4 cos(2π/3) = 4·(−1/2) = **−2**; y = 4 sin(2π/3) = 4·(√3/2) = **2√3.** Point: **(−2, 2√3).**

**#1 mistake:** Letting the calculator drift into **degree mode** — every polar/trig value comes out wrong. Lock RADIAN mode.

---

### 2.10 Rates of change in polar functions

**Plain idea:** As θ increases, watch whether **r (distance from origin) grows or shrinks**, and how fast. The exam asks this verbally — "is the distance from the origin increasing?" — and via average rate of change of r.

**Key rules:**
- **Average rate of change of r over [θ₁, θ₂] = (r(θ₂) − r(θ₁)) / (θ₂ − θ₁).**
- r **increasing** on an interval → curve spiraling **outward** (away from origin); r **decreasing** → moving **inward**.
- If r is increasing but its *rate* of increase is shrinking, the curve still goes out, just leveling off (same concavity logic as 2.3).
- **r can be negative**: a negative r plots the point in the **opposite** direction (θ + π).

**Worked example — for r = 3 + 2cos θ, is the distance from origin increasing on (0, π)?**
r(0) = 3 + 2(1) = 5; r(π) = 3 + 2(−1) = 1. As θ goes 0 → π, cos θ decreases from 1 to −1, so r **decreases** from 5 to 1 → the point moves **toward** the origin. Average rate of change = (1 − 5)/(π − 0) = **−4/π ≈ −1.27.**

**#1 mistake:** Confusing "r increasing" with "the curve moving up." In polar, increasing r means moving **away from the origin**, regardless of direction.

---

## 3. Graduated practice set (easy → exam-level)

Work each before opening the solution. **[NC]** = no calculator, **[C]** = calculator OK.

---

**P1 [NC] — Easy.** Convert 135° to radians and find cos(135°) exactly. Answer as two comma-separated entries in that order, writing pi as pi and any square root as sqrt (e.g. 5pi/6, sqrt(3)/2).

<details><summary>Solution</summary>

135° · π/180 = **3π/4.** QII, reference angle π/4, cos negative → cos(3π/4) = **−√2/2.**
</details>
<!-- part 1: 3pi/4 -->
<!-- part 1: 3π/4 -->
<!-- part 2: -sqrt(2)/2 -->
<!-- part 2: -sqrt2/2 -->
<!-- part 2: -√2/2 -->
<!-- part 2: -(sqrt(2))/2 -->
<!-- part 2: -1/sqrt(2) -->
<!-- format: Answer as two comma-separated entries in that order, writing pi as pi and any square root as sqrt (e.g. 5pi/6, sqrt(3)/2). -->
<!-- topic: 3.1 -->

---

**P2 [NC] — Easy.** State amplitude, midline, and period of f(x) = 4 sin(3x) − 2. Answer as three comma-separated values in the order amplitude, midline, period — values only, writing pi as pi (e.g. 5, 1, pi/2).

<details><summary>Solution</summary>

Amplitude = |4| = **4.** Midline = **−2** (so y = −2). Period = 2π/3.
Max = −2 + 4 = 2; min = −2 − 4 = −6.
</details>
<!-- part 1: 4 -->
<!-- part 1: amplitude 4 -->
<!-- part 1: amp 4 -->
<!-- part 2: -2 -->
<!-- part 2: y=-2 -->
<!-- part 2: midline -2 -->
<!-- part 3: 2pi/3 -->
<!-- part 3: 2π/3 -->
<!-- part 3: period 2pi/3 -->
<!-- format: Answer as three comma-separated values in the order amplitude, midline, period — values only, writing pi as pi (e.g. 5, 1, pi/2). -->
<!-- topic: 3.2 -->

---

**P3 [NC] — Easy/Med.** Solve cos x = −1/2 for all real x.

<details><summary>Solution</summary>

cos negative in QII and QIII. Reference angle π/3.
x = π − π/3 = **2π/3** and x = π + π/3 = **4π/3** in [0, 2π).
All: **x = 2π/3 + 2πk** and **x = 4π/3 + 2πk.**
</details>
<!-- topic: 3.7 -->
<!-- note: deliberately NOT keyed. The answer is a general solution, and "+2pik", "+2kpi", "+2(pi)k", "+2npi", "for any integer k" are all the same correct answer typed differently — the generality is the point (see trap 3) and no enumeration of it is safe. -->

---

**P4 [NC] — Med.** Find the period and the vertical asymptotes of y = tan(x − π/4).

<details><summary>Solution</summary>

b = 1 → period = π/1 = **π.** Asymptotes where the inside hits π/2 + πk:
x − π/4 = π/2 + πk → **x = 3π/4 + πk.**
</details>
<!-- topic: 3.5 -->
<!-- note: deliberately NOT keyed. Half the answer is an asymptote FAMILY (3pi/4 + pik), which has the same unenumerable "+pik" problem as P3. -->

---

**P5 [NC] — Med.** Evaluate arccos(−√3/2) and arctan(−1) exactly. Answer as two comma-separated exact values in that order, writing pi as pi (for example pi/3, or -pi/3).

<details><summary>Solution</summary>

arccos range [0, π]; need cos = −√3/2 → **5π/6.**
arctan range (−π/2, π/2); need tan = −1 → **−π/4.**
</details>
<!-- part 1: 5pi/6 -->
<!-- part 1: 5π/6 -->
<!-- part 2: -pi/4 -->
<!-- part 2: -π/4 -->
<!-- format: Answer as two comma-separated exact values in that order, writing pi as pi (for example pi/3, or -pi/3). -->
<!-- topic: 3.6 -->

---

**P6 [NC] — Med.** Simplify (sin x · csc x) + tan x · cot x.

<details><summary>Solution</summary>

sin x · csc x = sin x · (1/sin x) = 1. tan x · cot x = tan x · (1/tan x) = 1.
Sum = **2.**
</details>
<!-- key: 2 -->
<!-- accept: = 2 -->
<!-- topic: 3.8 -->

---

**P7 [C] — Med.** A Ferris wheel: riders board at height 2 m, the wheel's max height is 40 m, and one revolution takes 60 s. Write a sinusoid h(t) (t in seconds, boarding at t = 0 at the bottom).

<details><summary>Solution</summary>

min = 2, max = 40 → midline d = (2+40)/2 = **21**; amplitude a = (40−2)/2 = **19**; period 60 → b = 2π/60 = **π/30**. Boarding at the **minimum** at t = 0 → use **−cos**:
**h(t) = −19 cos((π/30) t) + 21.**
Check: h(0) = −19 + 21 = 2 ✓; half-cycle (t=30) gives 40 ✓.
</details>
<!-- topic: 3.2 -->
<!-- note: deliberately NOT keyed. -19cos((pi/30)t)+21 is also correctly written 21-19cos(pi t/30), 19sin((pi/30)(t-15))+21 and several more — every one of them a right answer a string match would call wrong. -->

---

**P8 [NC] — Med/Hard.** Solve 2 sin²x − sin x − 1 = 0 on [0, 2π). Answer as a comma-separated list of the exact solutions, writing pi as pi (e.g. pi/4, 3pi/4).

<details><summary>Solution</summary>

Quadratic in sin x: let u = sin x → 2u² − u − 1 = 0 → (2u + 1)(u − 1) = 0 → u = −1/2 or u = 1.
sin x = 1 → x = **π/2.**
sin x = −1/2 → QIII/QIV → x = **7π/6, 11π/6.**
Solutions: **π/2, 7π/6, 11π/6.**
</details>
<!-- part 1: pi/2 -->
<!-- part 1: π/2 -->
<!-- part 1: x=pi/2 -->
<!-- part 2: 7pi/6 -->
<!-- part 2: 7π/6 -->
<!-- part 2: x=7pi/6 -->
<!-- part 3: 11pi/6 -->
<!-- part 3: 11π/6 -->
<!-- part 3: x=11pi/6 -->
<!-- format: Answer as a comma-separated list of the exact solutions, writing pi as pi (e.g. pi/4, 3pi/4). -->
<!-- topic: 3.7 -->

---

**P9 [C] — Hard.** Convert the rectangular point (−3, 3) to polar with r > 0 and θ in [0, 2π).

<details><summary>Solution</summary>

r = √((−3)² + 3²) = √18 = **3√2.** Point is in QII (x<0, y>0).
arctan(3/−3) = arctan(−1) = −π/4, but adjust to QII → θ = π − π/4 = **3π/4.**
Polar: **(3√2, 3π/4).**
</details>
<!-- topic: 3.10 -->
<!-- note: deliberately NOT keyed. The natural way to write a polar point is the parenthesised pair "(3sqrt2, 3pi/4)" — and a compound key cannot hold a bracket that opens in one part and closes in another, while an atomic key would have to enumerate parenthesised x unparenthesised x three spellings of 3sqrt2 x exact-vs-decimal by hand. -->

---

**P10 [C] — Hard / polar rate.** For r = 4 sin θ on [0, π/2], find the average rate of change of r with respect to θ.

<details><summary>Solution</summary>

r(0) = 4 sin 0 = 0; r(π/2) = 4 sin(π/2) = 4.
Avg rate = (4 − 0)/(π/2 − 0) = 4/(π/2) = **8/π ≈ 2.546.**
Positive → distance from origin is increasing on this interval.
</details>
<!-- key: 8/pi -->
<!-- accept: 8/π -->
<!-- accept: \dfrac{8}{\pi} -->
<!-- accept: 2.546 -->
<!-- accept: 2.5465 -->
<!-- accept: 2.55 -->
<!-- accept: 8/pi = 2.546 -->
<!-- topic: 3.11 -->

---

**P11 [NC] — FRQ Q4 style (Symbolic Manipulation).**
(a) Solve 4 cos²x = 1 on [0, π).
(b) Rewrite k(x) = (1 − cos²x)/(sin x cos x) as a single term in tan x.
(c) Find all x where m(x) = 2 cos x − √3 = 0.

<details><summary>Solution</summary>

**(a)** cos²x = 1/4 → cos x = ±1/2. On [0, π): cos x = 1/2 → x = **π/3**; cos x = −1/2 → x = **2π/3**.
**(b)** 1 − cos²x = sin²x → sin²x/(sin x cos x) = sin x/cos x = **tan x.**
**(c)** cos x = √3/2 → QI/QIV → x = **π/6 + 2πk** and **x = 11π/6 + 2πk** (equivalently −π/6 + 2πk).
*Q4 rule: SHOW EVERY STEP — exact values, no decimals, or you earn nothing.*
</details>
<!-- topic: 3.9 -->
<!-- note: not keyable — three lettered sub-parts, and (c) is a general solution besides. -->

---

**P12 [NC] — FRQ Q3 style (Modeling a Periodic Context).**
A pendulum's horizontal displacement from center is +6 cm at t = 0, swings to −6 cm, and completes one full back-and-forth cycle every 4 seconds.
(a) Write d(t) = a sin(b(t + c)) + d (or a cosine) modeling displacement.
(b) On the interval where the pendulum moves from center toward the −6 cm extreme, state whether d is positive/negative and increasing/decreasing.
(c) State the concavity there and whether the rate of change is increasing or decreasing.

<details><summary>Solution</summary>

**(a)** max 6, min −6 → midline d = 0, amplitude a = 6; period 4 → b = 2π/4 = **π/2**. Starts at max → use **cosine**: **d(t) = 6 cos((π/2) t).**
**(b)** Moving from center (0) down toward −6: d is **negative and decreasing.**
**(c)** This is the approach to the minimum (valley) → **concave up** → the **rate of change is increasing** (slope going from steeply negative back toward 0... it's becoming less negative, i.e., increasing). 

*Grader note: state BOTH the sign behavior AND the concavity/rate-of-change behavior — they are separate points, and "concave up ⇒ rate of change increasing" must be said explicitly.*
</details>
<!-- topic: 3.4 -->
<!-- note: not keyable — three lettered sub-parts, and (a) is a sinusoid with several correct forms. -->

---

**P13 [NC] — Med — five key points.** $f(x)=4\sin(\pi x/3)-1$ is graphed over two full cycles starting at $x=0$. Give the $x$-value of the first minimum. Give the $x$-value only.

<details><summary>Solution</summary>

Period $=2\pi/(\pi/3)=6$, so the quarter-period step is $6/4=1.5$. Midline $d=-1$; amplitude $a=4$, so the max is $-1+4=3$ and the min is $-1-4=-5$.
A plain sine starts **on the midline going up**, so cycle 1's five key points are
$(0,-1) \to (1.5,\,3) \to (3,-1) \to (\mathbf{4.5},\,-5) \to (6,-1)$,
and cycle 2 continues $(7.5,\,3) \to (9,-1) \to (10.5,\,-5) \to (12,-1)$ — two full cycles end at $x=12$.
First minimum: $x=\mathbf{4.5}$ (where $f=-5$). Check: $\sin(\pi(4.5)/3)=\sin(3\pi/2)=-1$, so $f(4.5)=4(-1)-1=-5$ ✓.
On the real Part A, draw and label the midline $y=-1$ too — that is a separate point.
</details>
<!-- key: 4.5 -->
<!-- accept: 9/2 -->
<!-- accept: (4.5, -5) -->
<!-- topic: 3.3 -->

---

> **Exam-format questions (P14–P27).** P14–P25 are **multiple choice**, written to the May 2027 paper: Part A is 29 questions with **no calculator** and Part B is 13 **with** a calculator, so these run 8 no-calc to 4 calculator. Pick a letter, then read why the other three are there — every wrong option is a mistake someone actually makes. P26–P27 are the two **free-response** questions Unit 3 owns: **Q3 Modeling a Periodic Context** and **Q4 Symbolic Manipulation**, both **no calculator** on the real exam.

**P14 [NC] — Med — the unit circle.** In standard position, the terminal ray of the angle θ = 7π/6 meets the unit circle at which point?
A) (-√3/2, -1/2)   B) (-1/2, -√3/2)   C) (√3/2, -1/2)   D) (-√3/2, 1/2)
<details><summary>Solution</summary>

7π/6 is just past π, so it is in **QIII** — and in QIII *both* coordinates are negative. Reference angle = 7π/6 − π = **π/6**. On the unit circle the point is (cos θ, sin θ), and cos(π/6) = √3/2, sin(π/6) = 1/2, so cos(7π/6) = −√3/2 and sin(7π/6) = −1/2 → **(−√3/2, −1/2).**

Why the others are there: **B** is the terminal point of 4π/3 — it uses π/3's values (1/2, √3/2) in π/6's place. **C** has QIV's signs (x positive, y negative) and **D** has QII's; both skipped the quadrant check, which is this unit's #1 mistake.
</details>
<!-- key: A -->
<!-- practice: 1.B -->
<!-- topic: 3.1 -->

---

**P15 [NC] — Med — phase shift.** The graph of f(x) = 4 sin(2x − π/3) is the graph of y = 4 sin(2x) shifted horizontally. By how much, and in which direction?
A) π/3 to the left   B) π/3 to the right   C) π/6 to the left   D) π/6 to the right
<details><summary>Solution</summary>

**Factor b out of the inside before reading any shift.** 2x − π/3 = 2(x − π/6), which is b(x − c) with b = 2 and c = **π/6**. A positive c is a shift to the **right**, so the graph moves **π/6 to the right.**
Check: f(π/6) = 4 sin(0) = 0, and y = 4 sin(2x) is 0 at x = 0 — the zero moved from 0 to π/6, one π/6 step right.

Why the others are there: **B** reads c straight off the un-factored form and reports π/3 — the #1 mistake for this topic. **C** has the right size and the wrong direction (a minus inside does not mean "left"). **A** makes both errors at once.
</details>
<!-- key: D -->
<!-- practice: 1.C -->
<!-- topic: 3.2 -->

---

**P16 [NC] — Med — the five key points.** g(x) = 3 cos(πx/2) + 1. For x ≥ 0, which of these is the **first minimum point** on the graph of g?
A) (2, -2)   B) (2, -3)   C) (1, 1)   D) (4, -2)
<details><summary>Solution</summary>

Period = 2π/(π/2) = **4**, so the quarter-period step is **1**. Midline d = **1**, amplitude a = **3**, so max = 1 + 3 = **4** and min = 1 − 3 = **−2**.
A plain cosine starts **at its maximum**, so cycle 1's five key points are (0, 4) → (1, 1) → **(2, −2)** → (3, 1) → (4, 4). The minimum sits **half a period** after the maximum: **(2, −2).**
Check: g(2) = 3 cos(π) + 1 = −3 + 1 = −2 ✓.

Why the others are there: **C** is the quarter-period point, which is on the *midline*, not at the minimum. **B** forgets the midline and uses −a = −3 as the minimum value instead of d − a = −2. **D** places the minimum a *full* period after the maximum, where the graph is back at its maximum (g(4) = 4).
</details>
<!-- key: A -->
<!-- practice: 2.B -->
<!-- topic: 3.3 -->

---

**P17 [NC] — Med/Hard — behaviour vs. rate of change.** A sinusoid rises from its midline up to its maximum. On that interval, which statement is true of the function and of its rate of change?
A) decreasing, rate of change increasing   B) increasing, rate of change increasing   C) increasing, rate of change constant   D) increasing, rate of change decreasing
<details><summary>Solution</summary>

Two separate claims, and the exam scores them separately.
The value is still going up, so the function is **increasing**. But that stretch of the curve is the approach to a peak — a hilltop, so **concave down** — and the slope shrinks from its steepest at the midline to 0 at the maximum. So the **rate of change is decreasing**: rising, but levelling off.

Why the others are there: **B** is the classic conflation of "increasing" with "rate of change increasing" — the Chief Reader flags it every year. **A** reads "rate of change decreasing" as "the function is decreasing". **C** treats the rise as a straight line; only a linear function has a constant rate of change.
</details>
<!-- key: D -->
<!-- practice: 3.A -->
<!-- topic: 3.4 -->

---

**P18 [NC] — Med — tangent's period.** The graph of y = tan(3x) has a vertical asymptote at x = π/6. Which is the **next** vertical asymptote to the right of it?
A) x = π/3   B) x = π/2   C) x = 5π/6   D) x = 7π/6
<details><summary>Solution</summary>

Tangent's asymptotes sit exactly **one period** apart, and tangent's period is **π/|b| = π/3** — not 2π/|b|. So the next one is π/6 + π/3 = **π/2.**
Check: 3(π/2) = 3π/2 and cos(3π/2) = 0, so tan(3x) is undefined there ✓. The full family is x = π/6 + kπ/3.

Why the others are there: **A** is where tan(3x) *equals zero*, not where it blows up — 3(π/3) = π, and tan π = 0. **C** is one period too far: it comes from using the sine/cosine rule 2π/|b| = 2π/3 as the spacing. **D** uses the *parent* function's spacing of π and skips two asymptotes.
</details>
<!-- key: B -->
<!-- practice: 3.A -->
<!-- topic: 3.5 -->

---

**P19 [NC] — Med/Hard — inverse trig ranges.** What is the exact value of arcsin(sin(5π/6))?
A) π/6   B) π/3   C) 5π/6   D) -π/6
<details><summary>Solution</summary>

Work from the inside out. 5π/6 is in QII with reference angle π/6, and sine is positive there, so sin(5π/6) = **1/2.**
Now arcsin(1/2) must land inside arcsin's range **[−π/2, π/2]**, and the only angle there with sine 1/2 is **π/6.**
So arcsin(sin(5π/6)) = **π/6** — arcsin does *not* hand back the angle you started with, because 5π/6 is outside its range.

Why the others are there: **C** assumes arcsin undoes sin for every input, ignoring the restriction that makes arcsin a function at all. **B** uses √3/2 for sin(5π/6) — that is cos(π/6), not sin(5π/6). **D** has the right reference angle with the wrong sign; the sine here was positive.
</details>
<!-- key: A -->
<!-- practice: 1.C -->
<!-- topic: 3.6 -->

---

**P20 [NC] — Med — reciprocal functions.** What is the exact value of csc(4π/3)?
A) -2   B) -2√3/3   C) -√3/2   D) 2√3/3
<details><summary>Solution</summary>

**csc = 1/sin.** 4π/3 is in QIII with reference angle π/3, and sine is negative there, so sin(4π/3) = **−√3/2.**
csc(4π/3) = 1/(−√3/2) = −2/√3 = **−2√3/3** ≈ −1.155.

Why the others are there: **C** is sin(4π/3) itself — the reciprocal was never taken. **D** has the right size and the wrong sign. **A** is sec(4π/3) = 1/cos(4π/3) = 1/(−1/2) = −2: **csc pairs with sin, sec pairs with cos**, and mixing the pairs is this topic's #1 mistake.
</details>
<!-- key: B -->
<!-- practice: 1.B -->
<!-- topic: 3.8 -->

---

**P21 [NC] — Hard — identities.** Wherever it is defined, (sec²θ − 1)/(sec θ · tan θ) is equal to which single expression?
A) cos θ   B) tan θ   C) csc θ   D) sin θ
<details><summary>Solution</summary>

Look for the **Pythagorean pattern first**: 1 + tan²θ = sec²θ, so **sec²θ − 1 = tan²θ.** The expression becomes
tan²θ/(sec θ · tan θ) = tan θ/sec θ,
and writing both in sines and cosines: (sin θ/cos θ) · (cos θ/1) = **sin θ.**
Spot check at θ = 1.1: (sec²−1)/(sec·tan) = 0.8912 and sin(1.1) = 0.8912 ✓.

Why the others are there: **B** stops at tan θ/sec θ and forgets the sec θ still downstairs. **C** divides the wrong way round — sec θ/tan θ = 1/sin θ = csc θ. **A** cancels the tangent completely and reads the leftover 1/sec θ as cos θ.
</details>
<!-- key: D -->
<!-- practice: 1.B -->
<!-- topic: 3.9 -->

---

**P22 [C] — Hard — a sinusoidal model.** A rider's height on a Ferris wheel is h(t) = 30 − 25 cos(πt/45), with h in feet and t in seconds. To the nearest tenth of a second, when is the rider **first** 45 feet above the ground?
A) 2.2 s   B) 13.3 s   C) 31.7 s   D) 58.3 s
<details><summary>Solution</summary>

Set h = 45: 30 − 25 cos(πt/45) = 45 → −25 cos(πt/45) = 15 → **cos(πt/45) = −0.6.**
In **RADIAN** mode, arccos(−0.6) = 2.2143, so πt/45 = 2.2143 and **t = 2.2143 · 45/π = 31.7 s.**
Check: h(31.7) ≈ 45.0 ✓. The rider boards at the bottom (h(0) = 5) and reaches the top at t = 45 (h = 55), so this crossing on the way up is the first one.

Why the others are there: **A** stops at the *angle* 2.2143 and reports it as a time — the argument πt/45 was never converted back to t (h(2.2) is only about 5.3 ft). **B** solves cos = +0.6 instead, the sign lost when the 15 was moved across; h(13.3) = 15 ft. **D** is the *second* crossing of the same revolution, πt/45 = 2π − 2.2143 → 58.3 s, on the way back down.
</details>
<!-- key: C -->
<!-- practice: 3.B -->
<!-- topic: 3.2 -->

---

**P23 [C] — Hard — solving a trig equation.** The equation 3 sin(2x) = 2 has exactly two solutions on 0 ≤ x < π/2. To three decimal places, what is the **larger** one?
A) 0.365   B) 0.730   C) 1.206   D) 2.412
<details><summary>Solution</summary>

sin(2x) = 2/3. Substitute u = 2x: as x runs over [0, π/2), **u runs over [0, π)** — and sin u = 2/3 twice there (QI and QII):
u = arcsin(2/3) = **0.7297** and u = π − 0.7297 = **2.4119.**
Now **divide each by 2**: x = 0.3649 and x = **1.2059**. The larger is **1.206.**
Check: 3 sin(2 · 1.205932) = 2.000 ✓.

Why the others are there: **A** is the smaller solution — right work, wrong one reported. **B** is u itself: the inverse sine was never divided by 2. **D** is the second u, the same omission on the other branch — and it is not even in the interval, since π/2 ≈ 1.571.
</details>
<!-- key: C -->
<!-- practice: 1.A -->
<!-- topic: 3.7 -->

---

**P24 [C] — Hard — polar coordinates.** The point (−2, 5) is written in polar form with r > 0 and 0 ≤ θ < 2π. Rounded to three decimal places, which pair (r, θ) is correct?
A) (5.385, -1.190)   B) (5.385, 1.951)   C) (5.385, 4.332)   D) (29, 1.951)
<details><summary>Solution</summary>

r = √((−2)² + 5²) = √29 = **5.385.**
The point is in **QII** (x < 0, y > 0) — but a calculator's arctan only ever returns an angle in QI or QIV: arctan(5/(−2)) = **−1.190**, which is in QIV. Add π to swing it into QII: −1.190 + π = **1.951.**
Check: 5.385 cos(1.951) = −2.000 and 5.385 sin(1.951) = 5.000 ✓.

Why the others are there: **A** is the calculator's raw output, quadrant never fixed — and it is not in [0, 2π) either; it plots (2, −5). **C** adds π to |arctan| instead of to the negative value: π + 1.190 = 4.332, which plots (−2, −5). **D** forgets the square root in r.
</details>
<!-- key: B -->
<!-- practice: 2.B -->
<!-- topic: 3.10 -->

---

**P25 [C] — Hard — rate of change in a polar function.** For the polar function r = 2 + 3 cos θ, what is the average rate of change of r with respect to θ on the interval π/3 ≤ θ ≤ π, to three decimal places?
A) 2.149   B) -1.194   C) -2.149   D) -4.500
<details><summary>Solution</summary>

Average rate of change of r = (r(π) − r(π/3))/(π − π/3).
r(π/3) = 2 + 3(1/2) = **3.5**; r(π) = 2 + 3(−1) = **−1.**
Change in r = −1 − 3.5 = **−4.5**, over an interval of length π − π/3 = 2π/3 ≈ 2.0944.
So the average rate of change = −4.5/(2π/3) = **−27/(4π) ≈ −2.149.** Negative, so r is shrinking: the curve is moving **toward** the origin overall on this interval.

Why the others are there: **D** is the change in r without dividing by the change in θ — a change, not a rate. **B** replaces r(π) = −1 with 1, on the assumption that a distance cannot be negative; in polar form **r really can be negative** (that point plots in the θ + π direction). **A** drops the sign, which throws away the whole finding.
</details>
<!-- key: C -->
<!-- practice: 2.A -->
<!-- topic: 3.11 -->

---

**P26 [NC] — Exam-level — FRQ Q3 (Modeling a Periodic Context).**
A riverboat's paddle wheel has a radius of 8 feet, and its hub sits 3 feet above the water line. A marked paddle is at the top of the wheel at t = 0, and the wheel turns once every 12 seconds. Let h(t) be the paddle's height above the water line, in feet, t seconds after it starts.
(a) State the midline, the amplitude and the period of h, and give the coordinates of the five key points of one cycle beginning at t = 0.
(b) Give the coordinates of the four further key points that complete a second full cycle, and give the equation of the midline.
(c) Write a sinusoidal function h(t) for the paddle's height.
(d) On the interval 9 < t < 12, state whether h is positive or negative and whether it is increasing or decreasing. Then state the concavity there and whether the rate of change of h is increasing or decreasing, and justify the concavity claim.
<details><summary>Solution</summary>

**(a)** The hub is the midline and the radius is the amplitude, so max = 3 + 8 = **11** and min = 3 − 8 = **−5** (the paddle goes 5 ft under water).
Midline d = (11 + (−5))/2 = **3**; amplitude a = (11 − (−5))/2 = **8**; period = **12 s**, so the quarter-period step is **3 s**.
Starting at the top and stepping 3 s at a time, max → midline → min → midline → max:
**(0, 11) → (3, 3) → (6, −5) → (9, 3) → (12, 11).**
**(b)** Cycle 2 continues **(15, 3) → (18, −5) → (21, 3) → (24, 11)**. Midline: **y = 3.**
**(c)** b = 2π/period = 2π/12 = **π/6**, and the paddle starts at a **maximum**, so plain cosine with no reflection:
**h(t) = 8 cos(πt/6) + 3.**
Check: h(0) = 8 + 3 = 11 ✓; h(6) = −8 + 3 = −5 ✓; h(3) = 0 + 3 = 3 ✓.
**(d)** On 9 < t < 12 the paddle climbs from the midline (h = 3) back to the top (h = 11), so h is **positive** and **increasing**. That stretch is the approach to a maximum — a hilltop — so it is **concave down**, and therefore the **rate of change of h is decreasing**: still rising, but slowing. The evidence: the height gained per second falls from about 4.2 ft/s just after t = 9 to about 0.2 ft/s just before t = 12, while h itself keeps growing.

*Grader notes.* Part A of the real Q3 asks for **two** full cycles with the **midline drawn and the points labelled** — plotting one cycle, or leaving the midline off, throws away points that cost nothing. In (d), "increasing" and "rate of change decreasing" are **separate** points; say both, and say "concave down ⇒ rate of change decreasing" out loud.
</details>
<!-- frq: Q3 -->
<!-- practice: 2.B -->
<!-- topic: 3.3 -->

---

**P27 [NC] — Exam-level — FRQ Q4 (Symbolic Manipulation).**
No calculator, exact values only, and show every step.
(a) Solve 2 cos²x + cos x − 1 = 0 for all x in [0, 2π).
(b) Solve 2 sin x cos x = cos x for all x in [0, 2π).
(c) Rewrite (csc x − sin x)/cos x as a single trigonometric function.
(d) Rewrite cos(2x)/(cos x − sin x) with no fraction and no double angle.
<details><summary>Solution</summary>

**(a)** It is a quadratic in cos x. Factor: (2 cos x − 1)(cos x + 1) = 0, so cos x = **1/2** or cos x = **−1.**
cos x = 1/2 on [0, 2π) → QI and QIV → x = **π/3**, **5π/3**. cos x = −1 → x = **π.**
Solutions: **x = π/3, π, 5π/3.**
**(b)** **Do not divide by cos x** — that throws away every solution where cos x = 0. Bring everything to one side and factor:
2 sin x cos x − cos x = 0 → **cos x (2 sin x − 1) = 0.**
cos x = 0 → x = **π/2, 3π/2**; sin x = 1/2 → x = **π/6, 5π/6.**
Solutions: **x = π/6, π/2, 5π/6, 3π/2.** (Dividing by cos x loses π/2 and 3π/2 — half the answer.)
**(c)** csc x = 1/sin x, so the numerator is 1/sin x − sin x = (1 − sin²x)/sin x = **cos²x/sin x** (Pythagorean swap).
Dividing by cos x: (cos²x/sin x) · (1/cos x) = cos x/sin x = **cot x** (= 1/tan x).
**(d)** cos(2x) = cos²x − sin²x = (cos x − sin x)(cos x + sin x) — a difference of squares. Cancel the common factor:
**cos x + sin x.**

*Why this question is worth the most practice.* Q4 is pure Practice 1 — 4 points for solving (skill 1.A), 2 for rewriting (1.B) — and it is the **lowest-scoring FRQ two years running** (mean 1.28/6 in 2024, 1.93/6 in 2025). Exact values only; a decimal earns nothing. The points go missing in exactly two places: in (a) by stopping at one solution per value of cos x, and in (b) by cancelling a factor that can be zero.
</details>
<!-- frq: Q4 -->
<!-- practice: 1.A -->
<!-- topic: 3.7 -->

---

## 4. Quick self-check (rapid Q&A)

1. **Period of y = sin(4x)?** → 2π/4 = **π/2.**
2. **Period of y = tan(4x)?** → π/4 (tangent uses π, not 2π).
3. **Range of arccos?** → **[0, π].**
4. **sin²θ + cos²θ = ?** → **1.** And 1 + tan²θ = **sec²θ.**
5. **In f(x) = 3 sin(2(x − π))+5, what's the phase shift?** → **π to the right** (factored form).
6. **Polar → rectangular formulas?** → **x = r cos θ, y = r sin θ.**
7. **Concave down means the rate of change is…?** → **decreasing.**
8. **How many solutions does sin x = 0.4 have in [0, 2π)?** → **two** (one QI, one QII).

---

## 5. "Don't get these wrong" — Unit 3 exam traps

1. **Calculator in DEGREE mode.** Every trig/polar answer comes out wrong and you won't notice. Set **RADIAN** before Part A and never touch it.
2. **Tangent/cotangent period is π, not 2π.** Same for their asymptote spacing.
3. **Only giving one solution to a trig equation.** sin/cos give **two per cycle**; you must add **+2πk** (sin/cos) or **+πk** (tan) for "all solutions."
4. **Inverse-trig range violations.** arcsin/arctan output **[−π/2, π/2]**; **arccos output [0, π], never negative.** A "right" reference angle in the wrong quadrant is wrong.
5. **Phase shift read off un-factored form.** In sin(bx − c) the shift is **c/b**, not c. Always factor: b(x − c/b).
6. **"Decreasing" vs "rate of change decreasing."** On FRQ Q3 these are independent points. Concave up ⇒ rate increasing; concave down ⇒ rate decreasing — state it explicitly, separately from whether the value is rising/falling.
7. **Mixing up amplitude vs midline.** Amplitude = (max − min)/2; midline = (max + min)/2. Don't average them the wrong way.
8. **Polar "r increasing" ≠ "going up."** It means moving **away from the origin.** And **r can be negative** (plots in the θ + π direction).
9. **Q4 (Symbolic): no work = no credit, decimals = no credit.** Exact values (√, π, fractions), show every algebra step. It's the lowest-scoring FRQ — this is where 4s and 5s split.
10. **Pythagorean swap missed.** When you see "1 − sin²x" or "1 + tan²x," replace immediately (cos²x, sec²x) before trying anything fancier.
