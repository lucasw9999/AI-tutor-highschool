# Exam-Day & Final-Week Protocol

Short, calm, and practical. Five sections — read them once, then just follow them.

---

## 1. Bluebook Familiarity (~3–4 weeks out)

The AP CSA exam is delivered digitally through College Board's **Bluebook** app. The FRQ section uses a plain-text editor — no syntax highlighting, no autocomplete, no compiler, no run button.

**Do this 3–4 weeks before the exam:**

1. Install the **Bluebook app** on your exam laptop (download from the College Board website — it is free).
2. Open the **AP CSA Test Preview** or any available digital practice in Bluebook so you see the actual interface before test day. The goal is zero surprises on the real day.
3. **Practice typing Java in a plain text field.** No IDE, no autocomplete. If you have been using VS Code or an online compiler for FRQ practice, switch to a plain text file (Notepad, TextEdit in plain-text mode, or a blank `.txt` in any editor). Build the habit now.

The interface is straightforward once you have seen it. The only thing that catches people off guard is typing code without any tooling feedback — remove that surprise weeks in advance, not on exam morning.

---

## 2. Final-Week Taper (last 7 days)

The week before the exam is a **taper**, not a sprint. Cramming new material at this point rarely helps and often hurts by draining energy. Here is the plan:

| Day | Activity |
|---|---|
| **~5 days out** | One last full placement mock (timed, no notes, strict). This is the final §(f)-qualifying mock if needed. After it, stop mocking. |
| **Days 4–2 out** | Light review only: `killer-errors-cheatsheet.md` (10–15 min) + `java-quick-reference-drills.md` (10–15 min). Nothing new. |
| **Day before** | Skim the killer-errors cheatsheet once. Then stop. Lay out everything you need for tomorrow. Sleep early. |
| **Morning of** | Eat, get there early. No last-minute reviewing — your brain needs to be fresh, not stuffed. |

**Protect your sleep, especially the two nights before.** A well-rested brain traces code faster and catches careless errors better than a tired brain that just read three more pages of notes.

---

## 3. Test-Day Logistics

**What to bring:**
- Acceptable photo ID (check College Board's current ID policy — a school ID usually works if it has your photo)
- Your fully charged exam laptop + the charger (bring the charger even if the battery is full)
- Know your school's device rules in advance (some schools require the laptop to be school-issued or pre-registered with the AP Coordinator)
- Water and a snack for the 10-minute break between sections

**The structure:**
- **Section I:** 42 MCQ, 90 minutes — no break within the section
- **10-minute break**
- **Section II:** 4 FRQ, 90 minutes

**No calculator** (there is no calculator on AP CSA — no arithmetic beyond simple indexing).

**The Java Quick Reference is on-screen the entire exam.** It lists the exact method signatures for String, Math, ArrayList, Integer, Double, Object, and the other bounded library classes. Use it to double-check a signature you are unsure of. That said: know `substring(i, i+1)`, `equals`, `size()`, `add()`, `get()`, `length()`, and the array `.length` attribute cold — if you have to hunt the reference sheet for basic operations dozens of times, it becomes a time drain.

**Arrive early.** Leave extra time for check-in, device setup, and finding your seat. There is nothing to gain by arriving at the last minute.

---

## 4. In-Section Strategy

Full pacing numbers and protocols live in `pacing-and-strategy.md` — read that file once before the exam week and follow it. Short version:

**MCQ (Section I):**
- Target ~2 min 9 sec per question.
- **No guessing penalty — never leave an MCQ blank.** A wrong answer and a blank both score zero; a guess has a real chance of being right.
- Triage long code-trace questions: first pass through the easy ones, bank time, then return to the hard traces. Cap any single question at roughly double the average (≈ 4 min 20 sec), then eliminate wrong choices and commit.

**FRQ (Section II):**
- Budget roughly 22/22/18/20 min for Q1/Q2/Q3/Q4, with ~8 min buffer.
- **If you have not started a question with 20 minutes remaining, start it immediately.** A correct method header + a correct loop earns partial credit. A blank earns zero.
- At the end: scan all four responses and write something on every blank part.

For the full time-budget tables, triage protocol, and the 8 rules: `pacing-and-strategy.md`.

---

## 5. Panic / Mid-Exam Recovery

Everyone hits a wall at some point. Here is what to do:

**If you blank on a question:**
Flag it, pick your best guess, and move to the next one immediately. You are not stuck — you are banking time. Come back with a fresher eye and banked minutes.

**If a code trace feels impossible:**
Write out a variable table (loop counter, accumulator, whatever changes) and fill it in row by row. Most "impossible" traces become mechanical once you stop doing them in your head. See `pacing-and-strategy.md §4`.

**If you freeze on an FRQ:**
Write the method header. Write a loop with the right structure and correct bounds. That combination earns points even if the body is incomplete. A frozen blank earns nothing — an honest attempt with the right skeleton earns something.

**Keep the math in mind:** one hard question is roughly 2% of that section. You can miss several questions and still score a 5. The score is not riding on any single item — keep moving.

**After a bad section:**
The 10-minute break is between sections, not the end of the exam. Put Section I behind you when the break starts. Section II is a clean slate. Every FRQ point is independent of everything that happened in MCQ.
