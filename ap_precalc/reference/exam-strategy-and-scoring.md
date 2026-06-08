# AP Precalculus — How the Exam Works & How to Score 4-5

**Why this matters:** Precalc rewards *process over answers*. The exam is predictable — same **42+4** structure, same 4 fixed FRQ types every year — so a 5 is a preparation problem, not a luck problem. Master the four FRQ templates and the notation graders demand, and you've handled ~37% of the score directly plus the reasoning that powers the MC. Exam tests **Units 1-3 only** (Unit 4 is class-required but NOT on the exam).

> ⚠️ **Numbers below are the May 2027 format** (new for Lucas's year — College Board CED Clarifications, effective Fall 2026). Content/FRQ-types/scoring approach are unchanged from 2024–25; only question counts + timing changed. Full detail + source: `2027-exam-changes.md`.

---

## 1. Structure & timing at a glance (May 2027)

| Section | What | Calc? | Time | Weight |
|---|---|---|---|---|
| **I-A** Multiple Choice | **29 questions** | **NO calc** | **65 min** | ~43.75% |
| **I-B** Multiple Choice | **13 questions** | **Calc available** | 40 min | ~18.75% |
| **II-A** Free Response | Q1 + Q2 | **Calc available** | **35 min** | ~18.75% |
| **II-B** Free Response | Q3 + Q4 | **NO calc** | **35 min** | ~18.75% |
| | **42 MC + 4 FRQ** | | **~2 hr 55 min** | MC ~62.5% / FRQ ~37.5% |

- **Format:** Hybrid digital — MC answered in **Bluebook** app; FRQs **handwritten** in a paper booklet. You cannot flag-and-return across sections once time is called.
- **Calculator:** an approved **physical graphing calculator** is permitted, **and** a **built-in Desmos** is available in Bluebook for the calculator parts (use either/both). Required for nothing, available on I-B and II-A; not available on I-A, II-B. Work in **radians**.

**Pacing math (memorize this):**
- **MC Part A:** 65 min / 29 Q ≈ **2.2 min/Q** — *tighter than the old format; don't linger.*
- **MC Part B:** 40 min / 13 Q ≈ **3.0 min/Q** — calc steps eat clock.
- **FRQ:** ~**17 min per question** (35 min per 2-question part). Each is 6 points. Don't burn the whole part on one question.
- **Rule:** If an MC question stalls past ~2.5 min, guess (no wrong-answer penalty), flag it, move on. Every MC is worth the same.

---

## 2. The 4 fixed FRQ types — and how to attack each

The four FRQs are the **same labeled types every year**, printed verbatim in the scoring guidelines. Know the template cold.

### Q1 — Function Concepts *(calculator)*
**What it is:** A function given as a graph OR table OR equation, plus a second function. Tasks: evaluate a **composition** like h(3)=g(f(3)), find **inverse values** (f⁻¹(3.5)), **solve an equation** with the calculator, state **end behavior in limit notation**, identify the **function family** from data.
**Attack plan:**
1. Read values straight off the given representation — don't re-derive.
2. For "solve g(x)=2," use the calc's intersect/solver; **report all solutions**.
3. End behavior → **full limit notation** (see §4 — this is a recurring point-loser).
4. "What model fits this table?" → check **ratios** of successive outputs (constant ratio = exponential) vs **differences** (constant difference = linear).

### Q2 — Modeling a Non-Periodic Context *(calculator)*
*(2027 update: Part B(iii) removed, Part C expanded — same skills, same task type.)*
**What it is:** A real-world scenario (sales, streams). You build a model (log, quadratic, exponential) from given data points, then reason about it. Tasks: **write and solve a system** for the parameters, compute **average rate of change** (= slope of secant), use it to **estimate/extrapolate**, and **explain a model limitation** (concavity, why the estimate is over/under, why error grows).
**Attack plan:**
1. Plug data points in → get equations → solve for parameters (use calc).
2. Average rate of change = (f(b)−f(a))/(b−a). This is a **secant slope**, not a derivative.
3. The **explanation sub-parts** (e.g., "why is the linear estimate below the true value?") are the **hardest points on the whole exam** — answer with **concavity**: a secant of a concave-down curve lies *below* the curve, so a linear estimate underestimates. Write it in words, explicitly tying concavity to the comparison.
**This is the lowest-MC-prep, highest-reasoning question. Q2's mean is the 2nd-lowest of all 4.**

### Q3 — Modeling a Periodic Context *(NO calculator)*
**What it is:** A verbal periodic scenario (rolling tire, vibrating string). Tasks: **plot/label coordinates** of 5 key points on a sinusoid, write **h(t)=a·sin(b(t+c))+d**, answer an MC about behavior on an interval, and link **concavity ↔ rate of change**.
**Attack plan:**
1. **amplitude a** = (max−min)/2; **midline d** = (max+min)/2; **period** → **b = 2π/period**; **phase shift c** from where the curve crosses/peaks.
2. Plot points consistent with YOUR equation even if the curve is unscaled.
3. Concavity↔rate: concave **up** → rate of change **increasing**; concave **down** → rate **decreasing**. No calculus needed — it's a verbal/graphical argument.

### Q4 — Symbolic Manipulations *(NO calculator)* — THE DIFFERENTIATOR
**What it is:** Pure algebra/trig by hand. Solve **log/exponential** and **inverse-trig** equations for exact values, **condense logs**, simplify trig to a single term using **Pythagorean identities**, and spot a **quadratic-in-disguise** (e.g., e²ˣ−eˣ−12=0 → factor (eˣ−4)(eˣ+3) → x=ln 4).
**Attack plan:**
1. Give **EXACT** values (ln 4, √2, π/6), never decimals — no calc allowed and decimals lose the point.
2. **Show every step.** Bare answers earn nearly nothing here.
3. Memorize: log rules, exact unit-circle/inverse-trig values, sin²+cos²=1, 1+tan²=sec², 1+cot²=csc², and the "let u=eˣ (or sin x)" substitution pattern.

**Q4 is by far the lowest-scoring FRQ both years (mean 1.28/6 in 2024, 1.93/6 in 2025). Lifting Q4 from ~2 to ~4.5 is the single biggest lever from a 4 to a 5.**

---

## 3. Calculator vs no-calculator — what changes

| | Calculator parts (I-B, II-A) | No-calculator parts (I-A, II-B) |
|---|---|---|
| **Use it for** | Solving equations, intersections, evaluating models, numeric ARoC | Exact values, identities, factoring, limit notation, sinusoid params |
| **Trap** | Rounding **intermediate** values mid-calc | Reaching for decimals where exact form is required |
| **Rule** | Keep full precision in calc memory; round **only the final answer to 3 decimals** | Leave answers as ln, √, π fractions — never approximate |
| **Mode** | **RADIAN** | mental radian fluency |

---

## 4. Documentation & notation graders demand

Graders reward **communication of process**, not just the final number. The recurring point-losers:

- **Limit notation must be complete.** End behavior needs all four pieces: `lim`, the `x→∞` (or −∞), the function, and the value — e.g., **lim_{x→∞} g(x) = 0**. "g goes to 0" or a bare arrow loses the point even when the *idea* is right. (Most-cited Q1 error both years.)
- **3-decimal rule on calculator answers.** Final answers correct to **3 decimal places** (rounded or truncated). Do NOT round mid-problem — rounding intermediate values changes the final answer and loses points.
- **Exact values on no-calc parts.** Q4/Q3 want ln 4, √2, π/6, not 1.386 / 1.414 / 0.524.
- **Show the setup.** For "write equations and solve," the **equations themselves earn points** — write them before solving.
- **Explanations must connect cause → effect.** "It's concave down so the secant lies below the curve, making the linear estimate too small" earns; "the estimate is lower" does not.
- **Answer in context with units** when the problem is a real-world model (Q2).
- **Use function notation correctly** — h(3)=g(f(3)) means evaluate f first, then g.

---

## 5. What earns a 4 vs a 5

**Score distribution (official, both years):**

| Score | 2024 | 2025 |
|---|---|---|
| 5 | 25.9% | 28.1% |
| 4 | 23.9% | 25.8% |
| 3 | 25.9% | 26.9% |
| **Mean** | **3.42** | **3.55** |
| 3+ | 75.7% | 80.8% |

College Board does **not** publish exact composite cut scores. Teacher-community consensus puts the **5 cut near ~70%+ of the composite** and the **4 cut in the high-50s/low-60s %**. Concretely:

- **A 5** = large majority of MC correct **AND** averaging **~4.5-5 of 6 on the calculator FRQs (Q1, Q2)**, a solid Q3, **and** real points on Q4. Q4 is what separates 4s from 5s.
- **A 4** = strong MC + roughly the FRQ section averages below, but typically leaking points on Q2's reasoning and most of Q4.

**Published per-FRQ means (your benchmark for "where the bar sits"):**

| FRQ | 2024 mean /6 | 2025 mean /6 |
|---|---|---|
| Q1 Function Concepts | 2.95 | 3.51 |
| Q2 Non-Periodic Modeling | 2.03 | 2.17 |
| Q3 Periodic Modeling | 2.96 | 3.13 |
| **Q4 Symbolic Manip.** | **1.28** | **1.93** |
| **FRQ section avg /24** | **9.22** | **10.74** |

To target a 5, beat these averages everywhere — especially **Q4** (the field scores it lowest) and **Q2's explanation parts** (near-zero field mean). Those two are where points are sitting on the table.

---

## 6. Top point-losers — the pre-exam checklist

1. **Incomplete limit notation** (Q1) — write all four components every time.
2. **Rounding too early** on calculator parts — full precision until the final 3-decimal answer.
3. **Decimals where exact values are required** (Q3, Q4).
4. **No work shown on Q4** — bare answers earn ~nothing.
5. **Weak/missing explanations on Q2** — always tie to concavity / secant behavior with cause→effect.
6. **Wrong calculator mode** — set RADIAN before question 1.
7. **Composition order errors** — g(f(x)): inside first.
8. **Sinusoid parameter slips** (Q3) — b = 2π/period (not period/2π); double-check amplitude vs midline.
9. **Pacing collapse** — ~2:50/MC-A, ~3:20/MC-B, ~15 min/FRQ; guess-and-flag stalled MC.
10. **Studying Unit 4 for the exam** — it's class-required but NOT tested; spend exam-prep time on Units 1-3.
