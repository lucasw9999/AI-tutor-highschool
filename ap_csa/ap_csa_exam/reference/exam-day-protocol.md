# Exam-Day & Final-Week Protocol

Short, calm, and practical. Five sections — read them once, then just follow them.

---

## 1. Bluebook Familiarity (~3–4 weeks out)

The AP CSA exam is delivered digitally through College Board's **Bluebook** app. The FRQ section uses a plain-text editor — no syntax highlighting, no autocomplete, no compiler, no run button.

**Do this 3–4 weeks before the exam:**

1. Install the **Bluebook app** on the device you will actually test on (download from the College Board website — it is free). If the school is providing the device, ask whether you can open Bluebook on it beforehand — see "Whose device?" below.
2. Open the **AP CSA Test Preview** or any available digital practice in Bluebook so you see the actual interface before test day. The goal is zero surprises on the real day.
   - **The preview also rehearses the Java Quick Reference, not just the buttons.** College Board's reference-information page says its material is "available in Bluebook in test preview and on exam day" — so use the preview to practise *looking a signature up* (where the panel opens, how much screen it eats, how long a lookup costs you). That makes the preview worth more than a five-minute click-through. (verified 12 August 2026)
3. **Practice typing Java in a plain text field.** No IDE, no autocomplete. If you have been using VS Code or an online compiler for FRQ practice, switch to a plain text file (Notepad, TextEdit in plain-text mode, or a blank `.txt` in any editor). Build the habit now.
4. **Memorize your College Board sign-in — email and password.** You have to type them in manually in Bluebook on exam day; the AP Coordinator's Manual Part 1 is explicit that a password saved on your device **won't work**. Practise typing it from memory now, not at 7:55 a.m. (verified 12 August 2026)
5. **If you are testing on your own device or a one-to-one school device, run the device-prep steps.** Manual Part 1 (One Week Before Testing) says those students "will also need to complete last-minute readiness steps before exam day" — **bluebook.org/device-prep**. Do it in the final week, as instructed, and again the day before if you have time. (verified 12 August 2026)

The interface is straightforward once you have seen it. The only thing that catches people off guard is typing code without any tooling feedback — remove that surprise weeks in advance, not on exam morning.

### Whose device? Settle this by ~March 2027

**Task: ask the AP Coordinator, by about March 2027, whether the school is providing a testing device for AP CSA or whether you bring your own.** Everything else on this page (charger, keyboard, device-prep) depends on the answer, and the answer is a school decision, not a College Board one.

What College Board actually says (verified 12 August 2026):
- The What to Bring list calls for a "fully charged testing device with Bluebook installed **(if your testing school isn't providing one for you)**" — so a personal device is allowed, *and* the school may supply one.
- An **external keyboard** "is required if you're taking a fully digital AP Exam on a tablet." AP CSA **is** fully digital, so if you end up on an iPad, the keyboard is required, not optional. "External keyboards aren't allowed if you're testing on a laptop."
- **There is no AP 30-days-ahead device-request rule.** The SAT has a real 30-day deadline for requesting a school device (`sat/README.md` covers it) — do **not** carry that over to the APs. The 2026-27 AP Coordinator's Manual Part 1 has no device-loan deadline of any kind; its only "30 days" language is about the exam decision indicator. So the deadline here is your school's, whatever the Coordinator tells you — which is exactly why you ask in March instead of assuming.

---

## 2. Final-Week Taper (last 7 days)

The week before the exam is a **taper**, not a sprint. Cramming new material at this point rarely helps and often hurts by draining energy. Here is the plan:

| Day | Activity |
|---|---|
| **~5 days out** | One last full placement mock (timed, no notes, strict). This is the final §(f)-qualifying mock if needed. After it, stop mocking. |
| **Days 4–2 out** | Light review only: `killer-errors-cheatsheet.md` (10–15 min) + `java-quick-reference-drills.md` (10–15 min). Nothing new. Also: if you are on your own device or a one-to-one school device, this is the "one week before testing" window for the **bluebook.org/device-prep** readiness steps (§1). |
| **Day before** | Skim the killer-errors cheatsheet once. Then stop. Lay out everything you need for tomorrow — device + charger, pencils/pens, watch, ID if you need one — and charge the device fully. Confirm you can type your College Board email and password from memory. Sleep early. |
| **Morning of** | Eat, get there early. No last-minute reviewing — your brain needs to be fresh, not stuffed. |

**Protect your sleep, especially the two nights before.** A well-rested brain traces code faster and catches careless errors better than a tired brain that just read three more pages of notes.

---

## 3. Test-Day Logistics

**What to bring** (from College Board's What to Bring / What Not to Bring page, verified 12 August 2026):
- **Your fully charged testing device with Bluebook installed** — *if the testing school isn't providing one for you* (see "Whose device?" in §1). Bring the **charger** either way, even if the battery is full.
- **An external keyboard IF you are testing on a tablet** — required for a fully digital exam on a tablet, and AP CSA is fully digital. Not allowed if you are testing on a laptop.
- **Sharpened pencils or pens.** For a fully digital exam you bring something to write with and the **school provides the scratch paper**. Do not skip this: your whole tracing method (`pacing-and-strategy.md §4`) is pencil-and-paper, and nothing you write on that paper is scored — see §4 below.
- **Acceptable photo ID — required if you do not attend the testing school.** (If you are testing at your own school you generally don't need one; a photo school ID is the usual answer if you do. Check College Board's current ID policy either way.)
- **A watch that isn't a smartwatch** — allowed, and genuinely useful here, because the proctor gives you no time updates (§4).
- Water and a snack for the 10-minute break between sections.
- Your College Board **email and password, from memory** — you type them in; a saved password won't work.

**The structure:**
- **Section I:** 42 MCQ, 90 minutes — no break within the section
- **10-minute break**
- **Section II:** 4 FRQ, 90 minutes

**No calculator** (there is no calculator on AP CSA — no arithmetic beyond simple indexing).

**The Java Quick Reference is available the entire exam** — on screen in Bluebook, and also as a printed copy the school is shipped (you may not bring your own reference of any kind). It lists the exact method signatures for String, Math, ArrayList, Integer, Double, Object, and the other bounded library classes. Use it to double-check a signature you are unsure of. That said: know `substring(i, i+1)`, `equals`, `size()`, `add()`, `get()`, `length()`, and the array `.length` attribute cold — if you have to hunt the reference sheet for basic operations dozens of times, it becomes a time drain.

**Arrive early.** Leave extra time for check-in, device setup, and finding your seat. There is nothing to gain by arriving at the last minute.

---

## 4. In-Section Strategy

Full pacing numbers and protocols live in `pacing-and-strategy.md` — read that file once before the exam week and follow it. Short version:

**Two Bluebook facts that change how you work a section** — both quoted from the 2026 AP CSA Section II directions (verified 12 August 2026):

> "You may use the available paper for scratch work, but credit will only be given for responses entered in this application. Text you enter as an annotation will not be included as part of your answer."

> "You can go back and forth between questions in this section until time expires. The clock will turn red when 5 minutes remain—the proctor will not give you any time updates or warnings."

- **Only what is in the answer box is scored.** Scratch paper is for thinking; an annotation is *not* an answer. If your good idea is in the margin or in an annotation, it earns nothing. Every line you want credit for gets typed into the response field.
- **The red clock at 5 minutes is your only warning.** Nobody will call out "30 minutes left." So you own your own pacing: check the on-screen clock yourself at fixed points (§7/§8 of `pacing-and-strategy.md`), and treat the clock turning red as the hard trigger for the end-of-section sweep below.
- **You can move freely between questions until time expires** — within a section. So flagging and coming back is a real strategy, not a gamble.

**MCQ (Section I):**
- Target ~2 min 9 sec per question.
- **No guessing penalty — never leave an MCQ blank.** A wrong answer and a blank both score zero; a guess has a real chance of being right.
- Triage long code-trace questions: first pass through the easy ones, bank time, then return to the hard traces. Cap any single question at roughly double the average (≈ 4 min 20 sec), then eliminate wrong choices and commit.

**FRQ (Section II):**
- Budget roughly 22/22/18/20 min for Q1/Q2/Q3/Q4, with ~8 min buffer.
- **If you have not started a question with 20 minutes remaining, start it immediately.** A correct method header + a correct loop earns partial credit. A blank earns zero.
- **When the clock turns red — 5 minutes left, and no proctor is going to tell you — stop writing new logic and sweep.** Go through all four responses and type something into every blank part: a method header, a loop with the right bounds. Copy anything that only exists on your scratch paper into the answer box, because paper is not scored.

For the full time-budget tables, triage protocol, and the 10 rules: `pacing-and-strategy.md`.

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
