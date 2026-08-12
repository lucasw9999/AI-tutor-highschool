# The Dated Plan — AP Precalculus, from now to Tue 11 May 2027

**272 days from 12 August 2026 to exam day.** This file holds every date. `how-to-use.md` tells you what a
session looks like; this tells you *when*, and what happens if a date slips.

Sibling document: `../ap_csa/ap_csa_exam/how-to-use.md` §"Phased calendar". CSA and Precalc are sat 30 hours
apart and this plan is written to be read alongside that one.

---

## ⛔ Read this first — right now, Precalc readiness cannot be measured at all

This is not a warning about the future. It is the state of the repo today, and `npm run build` fails on it:

> `ERROR ap_precalc: the bank holds 0 of the 38 multiple choice question(s) it takes to cover the 42 a full
> paper contains ... No sitting can be assembled at all, so readiness.total_logged_mocks_min (4) is
> unreachable ... And not one item in this bank can be graded mechanically, so no sitting could produce a
> composite even if it were assembled`
>
> `ERROR ap_precalc: 33 of 36 exam-tested topic(s) have NO items, so readiness can never exceed 8.3% coverage.`

What that means in plain terms:

- **There is no Precalc mock to sit.** Not a bad one — none. A full paper needs 38 gradeable multiple-choice
  items; the bank has 0.
- **Nothing in the bank can be scored by machine.** All 48 items are model-graded free response, and the
  composite only counts server-graded answers. So no sitting produces a composite, and
  `composite_mean_min: 70` can never be met.
- **Coverage is a hard gate.** 33 of the 36 exam-tested topics have no items, and coverage pins readiness to
  **0** no matter how good everything else looks.

**Therefore: until the content work lands, drilling Precalc produces no measurable evidence.** You can still
learn precalculus — the study packs and the tutor work fine, and the learning is real. But the readiness
number will read 0, correctly, because nothing has been measured. Do not interpret that 0 as "you are
failing". It means "the instrument does not exist yet".

**Do not spend months on this subject without knowing that.** The dates in the next section say when the
content work has to be finished for the plan to still be reachable.

There is a second, separate measurement gap: the free-response grader has never been calibrated against an
officially scored College Board response, and `api.js` passes `calibrated: false` as a literal. So the
free-response criterion reports **pending** — not failed — and **readiness can never print higher than 99%,
or `ready: true`, until an adult calibrates the grader.** For Precalc this bites harder than for CSA, because
every one of the current 48 items is model-graded and therefore entirely inside that quarantine.

---

## The milestone table

Every date is marked **derived** (forced by the readiness engine's own rules in
`../worker/config/ap_precalc.json` plus the exam calendar), **fact** (a College Board date already verified
in this repo), or **judgement** (my choice — a reasonable one, but move it if your life says otherwise).

| Date | Milestone | Derived / fact / judgement |
|---|---|---|
| **Sat 15 Aug 2026** | **Phase 0 — sit `diagnostic.md`.** ~30 min. Sets your starting unit in `mastery-tracker.md`. | judgement |
| **Fri 2 Oct 2026** | Registration **preferred** deadline. **Missing it costs nothing** — the $40/exam late fee starts only after 13 Nov. | fact (verified 12 Aug 2026) |
| First week of school, **Sept 2026** | **Get the AP Classroom join code** from the Precalc teacher. Non-compressible — see the hard-deadline table. | derived + fact |
| **Fri 13 Nov 2026** | Registration **final** deadline, 11:59 PM ET. One order must cover **both** Precalc and CSA. | fact (verified 12 Aug 2026) |
| **Fri 22 Jan 2027** | Accommodations deadline, if ever needed. | fact (verified 12 Aug 2026) |
| **Sun 31 Jan 2027** | **Recommended target: Precalc item bank complete.** | **judgement — not derived** |
| **Fri 19 Feb 2027** | SAT registration closes for the 6 March sitting. | fact (`../sat/README.md`) |
| **Sat 6 Mar 2027** | SAT sitting. Precalc mocks begin *after* this — the SAT owns the calendar until here. | fact (`../sat/README.md`) |
| **Mon 15 Mar 2027** | **HARD FAIL-BY: Precalc item bank complete.** After this date the plan below is not reachable. | **derived** |
| **Sat 20 Mar 2027** | **Mock 0** — first full timed mock. The 4th logged sitting; deliberately *not* in the scored window. | judgement, inside derived limits |
| **Tue 30 Mar 2027** | Freshness floor opens. A mock dated today or later is still fresh on exam day. | **derived** |
| **Sat 10 Apr 2027** | **Mock 1** — the qualifying window opens. | judgement, inside derived limits |
| **Sat 24 Apr 2027** | **Mock 2 — the official College Board paper.** It has to be one of the last three. | judgement, forced by a derived rule |
| **Sun 25 Apr 2027** | Last day a bad mock can still be replaced with the taper intact. | **derived** |
| **Mon 26 Apr 2027** | **Latest safe start of the qualifying window.** Also the last day a replacement window can open. | **derived** |
| **Fri 30 Apr 2027** | **Stop learning new material.** Review only from here, both subjects. | judgement |
| **Sat 1 May 2027** | Do **not** sit the SAT today. Last free revision weekend before two AP exams. | fact (`../sat/README.md`) |
| **Thu 6 May 2027** | **Mock 3 — last Precalc mock, 5 days out.** If this one goes badly it cannot be replaced. | **derived** (from the repo's 5-day taper) |
| **Fri 7 May 2027** | **CSA's last mock.** Two three-hour papers inside 48 hours — planned, not stumbled into. | **derived** |
| **Sat 8 May 2027** | **Rest day.** No mock, no drilling. Non-negotiable. | judgement |
| **Mon 10 May 2027** | Last calendar day a mock *could* legally be sat. Don't. Pack your bag and sleep. | **derived** |
| **Tue 11 May 2027, Session 1 (8 a.m. local)** | **AP PRECALCULUS EXAM.** | fact |
| **Wed 12 May 2027, Session 2 (12 p.m. local)** | **AP CSA EXAM** — about 30 hours after Precalc starts. | fact |

---

## Where the derived dates come from

The engine's rules, from `../worker/config/ap_precalc.json` → `readiness`:

| Rule | Value |
|---|---|
| `consecutive_qualifying_mocks` | 3 |
| `window_span_days_min` | 10 |
| `window_span_days_max` | 42 |
| `freshness_days` | 42 |
| `total_logged_mocks_min` | 4 |
| `require_official_mock` | true |

The arithmetic, every step shown so you can check it:

| Result | Arithmetic |
|---|---|
| Last Precalc mock = **Thu 6 May 2027** | 11 May − 5 days. The 5 days is the repo's own taper convention (`../ap_csa/ap_csa_exam/how-to-use.md` Phase 4: "~5 days out: one last placement mock"), not an engine rule. Move the taper and this date moves. |
| Window must start by **Mon 26 Apr 2027** | 6 May − `window_span_days_min` (10). Three mocks must span **at least** 10 days, so the first cannot be later than 10 days before the last. |
| Arithmetic floor, **Fri 30 Apr 2027** | 10 May − 10. This is what the window start becomes if you abandon the taper and sit the last mock the day before the exam. It is legal and it is a bad idea. **Do not plan to this date.** |
| Freshness floor **Tue 30 Mar 2027** | 11 May − `freshness_days` (42). The newest mock in the judged window must be no older than this on exam day. CSA's equivalent floor is 31 Mar (12 May − 42). |
| Joint corridor **30 Mar – 10 May 2027** | From the earlier freshness floor to the eve of the first exam. Every mock that is going to count for either subject lives inside this ~6-week strip. |
| Content fail-by **Mon 15 Mar 2027** | 26 Apr − 42 days. The 42 is the engine's own `window_span_days_max`, used here as the runway allowance for the two things that must both happen *before* the window opens: attempt all **36** exam-tested topics at least once (the coverage gate), and sit **mock 0**, the fourth sitting `total_logged_mocks_min` requires. Content later than 15 March means cutting one of those, and both are gates. |
| Last recoverable bad mock **Sun 25 Apr 2027** | A replacement window needs 3 new sittings spanning ≥10 days ending by 6 May, so the first replacement must be on or before 26 Apr, so the bad mock must be on or before 25 Apr. |

**31 January 2027 is judgement, not derived.** Nothing in the engine produces it. It is six weeks of buffer
ahead of the hard 15 March date, which is roughly what a content build of this size has historically wanted,
and it lands before the SAT (6 March) rather than in the same fortnight. Treat it as the target and 15 March
as the wall.

Also worth seeing: **15 March is only 9 days after the SAT.** If the content work drifts into February it
collides head-on with SAT week. That is the practical reason to aim at 31 January.

---

## The mock schedule, and why these four dates

| # | Date | Source | In the scored window? |
|---|---|---|---|
| **0** | Sat 20 Mar 2027 | bank, full length | **No** — see below |
| **1** | Sat 10 Apr 2027 | bank, full length | Yes |
| **2** | **Sat 24 Apr 2027** | **official College Board** | Yes |
| **3** | Thu 6 May 2027 | official if a second paper is available, else bank | Yes |

Check it against the rules: window = mocks 1–3, spanning 10 Apr → 6 May = **26 days** (needs 10–42 ✓); one
official paper inside the window ✓; newest mock 5 days old on exam day (needs ≤42 ✓); 4 logged sittings ✓;
all three inside the 30 Mar – 10 May corridor ✓.

Four things about how the window is chosen that will bite you if you don't know them:

1. **The window is always your newest three sittings — you cannot pick your best three.** The engine takes
   the most recent run and judges that. A good score from March does not rescue a bad May.
2. **Mock 0 is free.** With exactly four sittings, the window is the newest three, so 20 March's score is
   never judged. That is on purpose: it is your calibration run. Sit it seriously, then stop worrying about
   the number.
3. **The official paper must be *inside* the window, not merely somewhere in the logbook.** The engine is
   explicit: "three bank-sourced mocks are unanchored however many official sittings happened months
   earlier." Every extra sitting you add *after* 24 April pushes the official paper one step closer to
   falling out of the newest three. Count on your fingers before booking one.
4. **A great mock raises the bar for the next one.** `max_decline_between_mocks` is 5. An 88 followed by an
   82 *fails*, even though both clear the 65 floor. Consistency is the criterion, not a peak.

And two mechanical traps:

- **`max_blanks` is 1 across the whole window** — one blank total across all three sittings, not one each.
  Never leave anything blank. There is no guessing penalty.
- **`reuse_days` is 14, on a 48-item bank.** Questions will repeat inside a fortnight, and a repeat is weak
  evidence. The config says so itself: "This is a symptom, not a solution: the real fix is more Precalc
  items."

---

## If a mock goes badly — the recovery branch

A mock is "bad" if it breaks any of: composite under 65 (`composite_floor_min`), a drop of more than 5 points
from the previous mock (`max_decline_between_mocks`), any unit under 65 (`per_unit_min`), a no-calculator or
calculator half under 65, or more than 1 blank across the window.

**Recovery is not "study harder". It is three more sittings.** Precisely:

1. You need **3 new sittings after the bad one**, because the window is always the newest three.
2. They must span **at least 10 days** end to end.
3. **At least one of them must be an official College Board paper.** The bad one's official status does not
   carry forward. This is the part people miss, and it means you must hold an unspent official paper in
   reserve.

The calendar cost, therefore, is **10 days minimum plus one unspent official paper.** Which gives:

| When the bad mock happens | Can you recover? |
|---|---|
| On or before **Sun 25 Apr 2027** | **Yes**, with the taper intact. Replacements at 26 Apr / 1 May / 6 May span exactly 10 days. That is the whole slack — there is no second attempt. |
| **Mon 26 Apr – Thu 29 Apr 2027** | Only by spending the taper: last replacement as late as 10 May, the day before the exam. Not recommended. |
| On or after **Fri 30 Apr 2027** | **No.** Including mock 3 on 6 May, which is unrecoverable by construction. |

**So build the buffer early, not late.** The mitigation is structural: sit your mocks as early inside the 30
March – 10 May corridor as the content allows, so that a failure has somewhere to go. If mock 1 (10 April)
goes badly you have three clear weeks. If mock 3 (6 May) goes badly you have nothing, and the honest response
is to walk into the exam anyway — a bad mock five days out is not a prediction, and there is no version of
this where panicking on 7 May helps.

**Slack across both subjects is near zero.** Ten logged sittings between Precalc (4) and CSA (6), at about
three hours each, is roughly **30 proctored hours** — most of it in the six weeks from 30 March. That is the
real cost of the readiness bar, and it is why the two subjects are jointly *feasible but tight*: nobody has
shown they can't both be done, and one bad mock in the last fortnight breaks a streak with no room to rebuild.

---

## Phased calendar — August 2026 to May 2027

### Phase 0 — this week (~15 Aug 2026)

Sit `diagnostic.md` (~30 min). It places you; it does **not** measure exam readiness — that needs a working
item bank. Paste the results into `mastery-tracker.md`. Start the formula/identity sheet the same day.

### Phase 1 — late Aug to Sept 2026: Unit 1 and the formula sheet

- 30–40 min a day, 5 days a week, plus **5 min daily on `reference/formula-and-identity-sheet.md`**. The
  exam gives you almost no formulas.
- Work **Unit 1 (Polynomial & Rational)** through `study-packs/unit-1-polynomial-rational.md`. It is 30–40%
  of the MCQ.
- **Hard task, first week of school: get the AP Classroom join code.** See the hard-deadline table.
- Practice both calculator and no-calculator from day one. No-calc is 29 of the 42 MCQ.

### Phase 2 — Oct to Nov 2026: Units 2 and 3, and the registration wall

- **Unit 2 (Exponential & Logarithmic)**, then **Unit 3 (Trigonometric & Polar)**. Roughly six weeks each is
  the shape; the tutor sets the pace off `mastery-tracker.md`.
- **Registration: preferred Fri 2 Oct 2026, final Fri 13 Nov 2026.** Only an AP Coordinator can order.
  **Confirm the single order covers Precalc *and* CSA.**
- First untimed reps of each of the four FRQ types. Q4 (Symbolic Manipulation) is the lowest-scoring FRQ
  nationally two years running — start it early, not last.

### Phase 3 — Dec 2026 to Feb 2027: finish content, go timed, build the bank

- Finish Unit 3. Then **Unit 4** — class only, never on the exam, so learn it for the A and do not drill
  exam-format questions on it.
- **Switch to timed practice.** 134 s per no-calculator MCQ, 185 s per calculator MCQ.
- One graded FRQ per week, self-graded blind against the official 2024/2025 scoring guidelines, then compared
  to the official award. There are 8 scored sets across the two years — that is your calibration material.
- **Sun 31 Jan 2027: item-bank target.** If it has not happened by then, raise it with the adult who owns
  `content/` — the wall is 15 March and February is not enough runway on its own.
- **Fri 19 Feb 2027: SAT registration closes.** **Sat 6 Mar 2027: the SAT.** Precalc holds at daily
  maintenance through that week; nothing new, no mocks.

### Phase 4 — Mar to Apr 2027: mocks, and the readiness push

- **Mon 15 Mar 2027 — the wall.** Bank complete, or readiness is unreachable for May 2027 and the honest
  answer is that this subject will be sat on preparation rather than on measured evidence.
- Then, in order: attempt **all 36 exam-tested topics at least once** (the coverage gate), **Sat 20 Mar —
  mock 0**, **Sat 10 Apr — mock 1**, **Sat 24 Apr — mock 2, the official paper**.
- Between mocks: 30–40 min daily, every session timed, weighted toward whatever the last mock's per-unit
  breakdown put lowest. Every unit has the same 65% floor regardless of its exam weight, so the *lowest*
  unit is always the binding one — not the heaviest-weighted one.
- **Mon 26 Apr — the latest safe window start.** If mocks 1 and 2 are clean, this day is an ordinary session.
  It matters only as the last exit onto a replacement window.

### Phase 5 — the final fortnight, 26 Apr to 12 May 2027

This is the part nobody owned. It is written out day by day below, and it is CSA-aware throughout.

### Exam — Tue 11 May and Wed 12 May 2027

See `reference/practice-resources-and-exam-day.md` for Precalc exam-day mechanics and
`../ap_csa/ap_csa_exam/reference/exam-day-protocol.md` for CSA's.

---

## The final fortnight, day by day

The two exams are **about 30 hours apart, not the ~24 that "back-to-back" suggests**
(`reference/practice-resources-and-exam-day.md`, verified 12 August 2026): Precalc is Session 1 at 8 a.m.
local on Tuesday, CSA is Session 2 at 12 p.m. local on Wednesday. Budget the gap instead of discovering it:
Precalc ends around 11 a.m. Tuesday, so the usable CSA time is **Tuesday afternoon (~1–6 p.m.) plus
Wednesday morning (~8–11 a.m.) — about 8 working hours**, with a night's sleep in the middle that you are not
allowed to spend.

**Week of Mon 26 Apr – Sun 2 May**

| Day | Precalc | CSA |
|---|---|---|
| Mon 26 Apr | Normal 30–40 min session. *Last exit onto a replacement window — if a mock has gone badly, today is the day you act.* | — |
| Tue 27 Apr | — | Normal session |
| Wed 28 Apr | 30 min, no-calculator symbolic work (FRQ Q4 shape) | — |
| Thu 29 Apr | — | Normal session |
| **Fri 30 Apr** | **Stop learning new material.** Nothing new after today, either subject. | **Same** |
| Sat 1 May | 60 min: formula/identity sheet and unit circle, cold, no notes. **Not the SAT — do not sit it.** | 60 min: killer-errors cheatsheet |
| Sun 2 May | Rest half-day. One easy problem set if you want, or nothing. | — |

**Week of Mon 3 May – Sun 9 May**

| Day | Plan |
|---|---|
| Mon 3 May | Precalc only. 20 no-calculator MCQ at pace (134 s each), from material already seen. Review, not learning. |
| Tue 4 May | CSA only. Timed MCQ set at 129 s each. |
| Wed 5 May | Light, both: 30 min formula/identity sheet, 30 min Java Quick Reference. **Sleep discipline starts today.** |
| **Thu 6 May** | **PRECALC MOCK 3 — full length, 175 min** (65 no-calc MCQ + 40 calc MCQ + 35 + 35 FRQ). **Sit it in the morning** to rehearse Session 1's 8 a.m. start. Score and log it the same day. Nothing else all day. |
| **Fri 7 May** | **CSA MOCK — full length, 180 min.** **Sit it in the afternoon** to rehearse Session 2's 12 p.m. start. Nothing else all day. |
| **Sat 8 May** | **REST. No mock, no drilling.** You have just done two three-hour papers in 48 hours. Read the two error lists for 30 minutes if you must; solve nothing new. This day is load-bearing. |
| Sun 9 May | Precalc only, 45 min: formula sheet cold, the five key points of a sinusoid, one Q4-style symbolic problem. Early night. |

**Exam days**

| When | Plan |
|---|---|
| Mon 10 May | Precalc, **30 min maximum**: unit circle, log rules, asymptote rules. Then stop. Pack the bag — approved graphing calculator with fresh batteries, pencils, admission materials. Confirm the local start time with the AP Coordinator. Lights out early: Session 1 is 8 a.m. |
| **Tue 11 May, 8 a.m.** | **AP PRECALCULUS.** |
| Tue 11 May, afternoon | Eat. Walk. Nap. Then **60–90 min of CSA — not Precalc.** Precalc is finished: do not review it, do not look answers up, do not relitigate a question with a friend. Killer-errors cheatsheet and Java Quick Reference only. Nothing new. Bed early. |
| Wed 12 May, morning | **CSA only, 45 min maximum.** Cheatsheet review. Eat a real lunch before noon — Session 2 starts at 12 p.m. and runs three hours. |
| **Wed 12 May, 12 p.m.** | **AP CSA.** Done. |

---

## Interleaving — Precalc, CSA, and the SAT

Three subjects live in this repo and they do not get equal time all year. The calendar has an owner, and it
changes:

| Window | Primary claim | What Precalc gets |
|---|---|---|
| Aug 2026 – Feb 2027 | **SAT** (Sat 6 Mar 2027 sitting) | 30–40 min daily + 5 min formula sheet. Content progress. No mocks. |
| Sat 6 Mar – Fri 30 Apr 2027 | **Precalc and CSA jointly** | Mocks, on alternating days with CSA. |
| Fri 30 Apr – Wed 12 May 2027 | **The two AP exams** | Review only, per the fortnight plan above. |

Three rules:

1. **One subject per session.** Never blend Precalc and CSA inside one 40-minute block. Switching between
   symbolic manipulation and code tracing costs more than the variety is worth.
2. **Never two mocks on the same day, and never on consecutive days before May.** The single exception is
   6 and 7 May, which the taper forces.
3. **Alternate days once both subjects are in mock phase.** Precalc Mon/Wed/Fri, CSA Tue/Thu, mocks on
   Saturdays — or the mirror of that. Pick one and keep it; the point is that neither subject goes more than
   two days without contact.

---

## Review cadence

The selector already re-serves a missed topic on **expanding intervals of 1, 3, 7, 16 and 35 days**
(`../worker/src/select.js`, `REVIEW_INTERVALS`). Do not fight it, and in particular:

- **When a topic "feels done", it isn't yet.** It comes back at 35 days, and *that* is the test that matters.
- **Daily, 5 min:** the formula/identity sheet. Every single day, including mock days.
- **Weekly, Sunday, 20 min:** a mixed retrieval set drawn only from units you finished more than two weeks
  ago. Deliberately cold.
- **Monthly, last Saturday, 45 min:** a no-calculator-only set across everything covered so far. No-calc is
  29 of 42 MCQ and about 44% of the score, and it is the half that decays.

---

## If you're behind — the compression plan

**The early-warning trigger is Mon 15 March 2027**, and it is about content, not effort: if the item bank is
not finished, or mock 0 has not happened by Sat 20 March, you are behind.

1. **If the bank is not done by 15 March → escalate to the adult who owns `content/`.** This is not fixable
   by studying harder. Until items exist, extra Precalc hours produce zero measurable evidence, and a plan
   that quietly assumed a working bank would be a plan that fails silently. Say it out loud instead.
2. **Compress the window to its legal minimum: three sittings spanning exactly 10 days.** For example 26 Apr
   / 1 May / 6 May. One of the three still has to be official. That is the entire remaining slack in the
   calendar and it leaves no recovery room at all.
3. **Drop untimed practice entirely.** Every MCQ at 134 s (no-calc) or 185 s (calc); every FRQ half in 35 min.
4. **Triage to the lowest-scoring unit, not the heaviest-weighted one.** Every unit faces the same 65% floor,
   so the lowest is always what blocks you.
5. **Do not lower the floors to make the number go up.** The config's own note: revisit after the first three
   real mocks and **raise rather than lower if in doubt.** Moving a bar is not the same as clearing it.

---

## Hard deadlines — non-compressible

Missing any of these is not fixable by studying. Each one needs an adult, a school, or a code.

| Deadline | Date | Why it's hard |
|---|---|---|
| **AP Classroom join code** | First week of school, **Sept 2026** | `require_official_mock: true`, and the only **full-length** official Precalc paper is the AP Classroom Practice Exam, which is gated to authorized educators. The released 2024/2025/2026 materials are **Section II only** — real, useful, and unable to produce a composite. **No join code → no official mock → no qualifying window → readiness pinned at 0 regardless of every score.** Get the code from the AP Precalc teacher or the AP Coordinator. |
| **Register to sit the exam** | Preferred **Fri 2 Oct 2026**; final **Fri 13 Nov 2026, 11:59 PM ET** (+$40/exam only *after 13 Nov*, not after 2 Oct) | Only a school's AP Coordinator can order. **One order must cover both AP Precalculus and AP CSA — confirm both are on it.** Schools set earlier local deadlines. |
| **Precalc item bank complete** | Target **Sun 31 Jan 2027** (judgement) · **hard Mon 15 Mar 2027** (derived) | See the top of this file. Past 15 March, coverage of 36 topics plus a fourth logged sitting no longer fits before the 26 April window start. |
| **Accommodations request** | **Fri 22 Jan 2027** | Only if ever needed. |
| **SAT registration** | **Fri 19 Feb 2027** for the Sat 6 Mar 2027 sitting | Not a Precalc deadline, but it sits in the same calendar and the May SAT is unusable — it lands 10 days before Precalc. |
