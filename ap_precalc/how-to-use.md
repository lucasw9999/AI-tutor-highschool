# How To Use This — Plain Instructions (for Lucas)

Your AP Precalc catch-up. Goal: walk into the class confident and earn an **A**, and be ready for a **4–5 on the AP exam — Tue 11 May 2027**. Fast and condensed — you don't read a textbook, you **do problems** and learn the piece you're missing right when you hit it.

> 📅 **This file is the daily loop. `study-plan.md` is the calendar** — every date from now to exam day, the mock schedule, the final fortnight, and what to do if a mock goes badly. Read it once now, then check it monthly.
>
> ⛔ **One thing you have to know up front:** the Precalc question bank is not built yet — `npm run build` currently fails with *"the bank holds 0 of the 38 multiple choice question(s) it takes to cover the 42 a full paper contains"* and *"33 of 36 exam-tested topic(s) have NO items."* So **no Precalc mock can be assembled and no readiness number can be measured today.** The learning below is real and worth doing; the *score* will read 0 until the content work lands. **Hard fail-by date for that work: Mon 15 Mar 2027** (`study-plan.md` shows the arithmetic).

## The big idea
Math sticks by *doing*, not reading. The tutor hands you a problem; you try it and show your work; if you're stuck it gives a **hint** (not the answer); you fix it, do one or two more, move on. When a problem trips you on an old Algebra-2 skill, the tutor patches it in 30 seconds and you keep going.

## What you actually do
- **One-time:** set up the tutor (see `chatgpt-setup.md`, ~5 min).
- **Each session (~30–40 min):** the tutor quizzes you with problems and coaches. At the end it prints a `TRACKER UPDATE` — paste it into `mastery-tracker.md`.
- **Daily 5 min:** drill the **formula/identity sheet** (unit circle, log & trig rules). The exam gives you almost no formulas, so these have to be automatic.

## The order (and roughly when)

This is a **nine-month plan, not a few-week sprint** — the exam is Tue 11 May 2027. The order below is what you work through; `study-plan.md` holds the dates.

1. **`reference/formula-and-identity-sheet.md`** — start memorizing the unit circle + log/trig rules on day one, 5 min daily forever. Everything leans on them.
2. **Unit 1 → Unit 2 → Unit 3** (in order — each builds on the last; these are the exam-tested ones, ~equal weight).
3. **`reference/graphing-calculator-skills.md`** + **`exam-strategy-and-scoring.md`** once you're doing FRQ-style problems.
4. **Unit 4** last (class-only, never on the exam — learn it for the A, don't drill exam questions on it).

## The phased calendar — August 2026 to May 2027

The short version. Full dated table, mock schedule and recovery plan: **`study-plan.md`**.

### Phase 0 — now (~1 week, mid-August 2026)
Sit `diagnostic.md` (~30 min) to place yourself, and start the formula sheet the same day.

### Phase 1 — late Aug to Sept 2026
Unit 1 (30–40% of the MCQ) + daily formula sheet. **First week of school: get the AP Classroom join code from your Precalc teacher** — without it there is no full-length official practice paper, and the readiness bar requires one.

### Phase 2 — Oct to Nov 2026
Units 2 then 3. First untimed reps of each of the four FRQ types — start **Q4 (Symbolic Manipulation)** early, it's the lowest-scoring FRQ nationally. **Register to sit the exam: preferred Fri 2 Oct 2026, final Fri 13 Nov 2026** — one order must cover both Precalc *and* CSA.

### Phase 3 — Dec 2026 to Feb 2027
Finish Unit 3, then Unit 4. **Switch to timed practice** (134 s per no-calc MCQ, 185 s per calculator MCQ). One graded FRQ a week against the official 2024/2025 rubrics. The SAT sits Sat 6 Mar 2027 — Precalc holds at daily maintenance that week.

### Phase 4 — Mar to Apr 2027
**Mon 15 Mar 2027 is the wall for the content work.** Then: attempt all 36 exam-tested topics once (the coverage gate), and sit the mocks — **Sat 20 Mar (mock 0), Sat 10 Apr (mock 1), Sat 24 Apr (mock 2, the official paper)**.

### Phase 5 — the final fortnight, 26 Apr to 12 May 2027
**Fri 30 Apr: stop learning new material.** **Thu 6 May: last Precalc mock** (morning, to rehearse the 8 a.m. start). **Fri 7 May: last CSA mock** (afternoon). **Sat 8 May: rest — no mock, no drilling.** Day-by-day plan in `study-plan.md`.

### The two exams — Tue 11 and Wed 12 May 2027
Precalc is **Session 1, 8 a.m. local, Tue 11 May**. CSA is **Session 2, 12 p.m. local, Wed 12 May** — about **30 hours later, not 24**. That gives you Tuesday afternoon and Wednesday morning, roughly 8 working hours: **spend them on CSA, not on more Precalc.** Precalc is over — don't review it, don't look answers up.

## Timed mocks

Once the bank exists, a full Precalc mock is **175 min**: 29 no-calc MCQ (65 min) → 13 calculator MCQ (40 min) → FRQ Q1–Q2 with calculator (35 min) → FRQ Q3–Q4 no calculator (35 min).

The readiness bar needs **4 logged sittings**, of which the **newest three** must span 10–42 days and include **one official College Board paper**. You don't compute any of that — but two things are worth knowing: you can't pick your best three (it's always the newest three), and a **great** mock raises the bar for the next one (a drop of more than 5 points fails). See `study-plan.md` for the schedule and the bad-mock recovery branch.

## A session looks like this
1. Open your tutor, type **"let's continue"** (first time: **"let's start"** → short diagnostic).
2. It gives you a problem. You solve it, showing your steps.
3. Stuck? Type **"hint."** It nudges; you try again.
4. Practice **both** with and without the calculator (the exam splits them — ~44% of your score is no-calculator).
5. ~35 min in, it prints a `TRACKER UPDATE` → paste into `mastery-tracker.md`.

## Which subject today? (Precalc / CSA / SAT)

Three subjects live in this repo and they don't get equal time all year:

| Window | Who owns the calendar | Precalc gets |
|---|---|---|
| **Aug 2026 – Feb 2027** | **SAT** (sitting Sat 6 Mar 2027) | 30–40 min daily + 5 min formula sheet. Content progress, no mocks. |
| **Mar – Apr 2027** | **Precalc + CSA jointly** | Mocks, alternating days with CSA. |
| **30 Apr – 12 May 2027** | **The two AP exams** | Review only. |

- **One subject per session** — never blend Precalc and CSA in the same 40 minutes.
- **Never two mocks on the same day** (the one exception is 6 and 7 May, which the taper forces).
- Once both subjects are in mock phase, alternate days so neither goes more than two days without contact.

## Review cadence

- **Daily, 5 min:** the formula/identity sheet. Every day, including mock days.
- **The tutor re-serves anything you missed on expanding intervals — 1, 3, 7, 16, then 35 days.** Don't skip a review because the topic "feels done": the 35-day rep *is* the test.
- **Weekly, Sunday, 20 min:** mixed set from units you finished more than two weeks ago. Deliberately cold.
- **Monthly, last Saturday, 45 min:** no-calculator-only set across everything covered. No-calc is 29 of the 42 MCQ and the half that decays.

## Important
- **Memorize the formula sheet** — non-negotiable for precalc.
- The tutor **coaches; it doesn't do your homework or tests.** Use it to get genuinely good — that's how the A and the exam score become real.
- **Never leave a question blank** — no guessing penalty, and the readiness bar allows only **one** blank across a whole three-mock window.

## If it drifts
- Too much explaining → "just give me problems."
- Too easy → "make these exam-level."
- Stuck a lot → "give me an easier one first, then build up."
