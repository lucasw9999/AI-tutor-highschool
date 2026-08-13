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
