# How To Use This — AP CSA Exam Prep (for Lucas)

Your exam-performance layer. Goal: **5 on AP CSA, May 2027** — not more content study, but converting what you know into exam points under timed, rubric-graded conditions.

## The big idea

You already covered the content. The gap is **exam performance**: accurately tracing code fast (37–53% of MCQ), pacing, and FRQ rubric precision. So you do not re-read notes — you **answer exam questions cold**, get diagnosed on the specific error, fix only that, and repeat. The tracker proves when you're ready.

## Daily loop

1. Open the examiner (set up via `chatgpt-setup.md`) and type **"let's continue"** (first time: **"let's start"** → runs the diagnostic).
2. It gives you a question. **Answer it cold** — committed choice + reasoning before you read anything else.
3. It diagnoses your specific error pattern ("off-by-one on upper bound", "used `==` on a String", "forward-removed from ArrayList") and micro-teaches only the missed point.
4. It gives you 1–2 targeted reps and updates the `TRACKER UPDATE` block.
5. At the end of the session, paste the `TRACKER UPDATE` into `exam-skill-tracker.md`. That is the whole loop.

Session length: **30–40 min** on weekdays. Keep it short and consistent over long cramming sessions.

## The dual-system workflow

Two systems now exist side-by-side. The rule for which to use:

| Situation | Use |
|---|---|
| **Daily default** — drill exam questions, grade FRQs, track performance | **This examiner** (`exam-tutor-prompt.md`) |
| **Content gap** — the examiner diagnoses a topic you genuinely never learned (not just misapplied) | **Content tutor** (`../tutor-prompt.md`) — repair the gap, then return here |

Do not open the content tutor for routine practice. The examiner is your daily driver. The content tutor is called in only when the examiner surfaces a true knowledge gap. This prevents the "which one do I open today?" confusion.

## Weekly timed simulations

Every **2–3 weeks**, run a full timed mock from `question-bank/practice-exams.md`:
- **Section I:** 42 MCQ, 90 min (no pause).
- **Section II:** 4 FRQ, 90 min, typed in a plain editor — no autocomplete, no compiler, no run (mirrors the real digital exam).
- Log the score breakdown to `exam-skill-tracker.md` and flag any new killer errors.

Readiness = consistent high-scoring results across ≥3 full timed mocks, strictly graded, with no gaps in any unit, practice, or FRQ type. See `exam-skill-tracker.md` §(f) for the full five-part bar (criteria A–F).

## Phased calendar — June 2026 to May 2027

### Phase 0 — Now (~1 week, late June 2026)

Run `diagnostic-exam.md` to establish the **real** current baseline (the prior coverage claim is unverified; the diagnostic score is the authoritative number). Output: a ranked leak list that seeds Phase 1.

### Phase 1 — Summer 2026 (July–August)

- Pull in the content tutor (`../tutor-prompt.md`) for any content gaps the diagnostic found. Fix them now, before the school year.
- Begin **daily Analyze-Code MCQ** drilling from `question-bank/mcq-analyze-code.md` — this is the 37–53% slice.
- First reps of each FRQ type from `frq-q1-methods-control.md` through `frq-q4-2d-array.md`, graded to rubric.
- Weight toward **Unit 4** (Data Collections = 30–40% of MCQ).

### Phase 2 — Fall 2026 (September–November)

- Topic-complete MCQ by unit (`mcq-unit-1.md` through `mcq-unit-4.md`).
- **1 graded FRQ per week** to the full rubric.
- Two hard deadlines this phase:
  - **Secure AP Classroom access** — the real official item bank is teacher-gated; get the join code from your AP CSA teacher at the start of the course. (Self-studying with no class? Enroll with an AP-Course-Audit-approved online provider instead.)
  - **Register to sit the exam by ~mid-November 2026** — register through your school's AP Coordinator. **Confirm early that the school actually administers the AP CSA exam** (a small/private school may not offer every AP); if it doesn't, find a nearby authorized school via the AP Course Ledger. No deadline, no May 2027 seat. (See `reference/question-sources-and-access.md`.)

### Phase 3 — Winter 2026–27 (December–February)

- Mixed **timed** MCQ sets at pace (~2:09/question). No more untimed drill.
- Rotate all four FRQ types; eradicate the killer errors (review `reference/killer-errors-cheatsheet.md`).
- First **full timed mock** from `question-bank/practice-exams.md`.

### Phase 4 — Spring 2027 (March–early May)

- **≥3 full timed practice exams.** Drive every metric to the readiness bar.
- **Fold in the 2026 Scoring Guidelines** (expected ~fall 2026; see `exam-blueprint.md` monitor items) — that is the first real redesigned-exam rubric. Update `reference/frq-rubric-and-penalties.md`.
- Final pacing work + Bluebook realism (type FRQ answers in a plain text field, not a code editor).

### Exam — ~May 2027

## If it drifts

- Too much explaining, not enough questions → "just give me questions."
- Questions feel too easy → "harder / Analyze-Code emphasis."
- Want timed feel → "drill me at pace, flag if I go over."
- Killer error keeps repeating → "give me a focused rep set on [error type]."
