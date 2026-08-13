# Pacing & Strategy

**Purpose:** The AP CSA exam is 3 hours split into two 90-minute sections. Leaving questions blank or running out of time is pure lost value. This file gives you the numbers, the habits, and the section-by-section protocol to extract every available point.

---

## 1. The 60-Second Map (memorize this)

| | Section I — MCQ | Section II — FRQ |
|---|---|---|
| Items | **42 questions** | **4 questions** |
| Time | **90 minutes** | **90 minutes** |
| Per item (average) | **≈ 2 min 9 sec** (≈ 2:09) | ≈ 22.5 min (budget varies; see §4) |
| Weight | 55% of composite | 45% of composite |
| Java Quick Reference | Provided | Provided |
| Time cues | On-screen clock only — **turns red at 5 min left; no proctor updates or warnings** | Same |
| Moving between questions | Flag and return within the section (what the §3 triage relies on) | **Free, until time expires** — stated in the Section II directions |
| What gets credit | The answer you select | **Only text typed into the response field** — paper and annotations score zero |
| Guessing penalty | **None — never leave blank** | N/A (write something for partial credit) |

**No guessing penalty. Ever. A blank and a wrong answer both score zero, but a guess has a real chance of being right. Never leave an MCQ blank.**

---

## 2. MCQ Pacing — The Numbers

**Target pace:** 90 min ÷ 42 questions = **2 min 9 sec per question** (≈ 2:09).

| Situation | Implication |
|---|---|
| Question resolved in < 90 sec | You are banking time — good |
| Question at 2:09 | On pace — commit and move |
| Question past 3 min and unresolved | You are over 1.5× budget — flag, pick best guess, move on |
| With 10 min left and 5 questions unanswered | ≤ 2 min each — commit answers immediately, no new analysis |
| Any unanswered question at time-up | You left free expected-value points on the table |

**Recompute your pace mid-section:** time remaining ÷ questions remaining = new per-question budget. Do this check at roughly question 21 (the halfway point).

---

## 3. MCQ Triage — Long Traces

Analyze-Code questions (37–53% of the MCQ section) include multi-iteration loop traces and recursive traces that can take 3–4 minutes if you trace naively. Triage them:

1. **First pass:** collect every question you can resolve quickly (< 90 sec). Flag long traces.
2. **Second pass:** return to flagged traces with banked time. Now you know exactly how many minutes you have.
3. **Time cap:** if a trace is still unresolved after 2× the average (≈ 4 min 20 sec), eliminate wrong choices and commit to the best guess. Move on.

Long traces are not worth jeopardizing three other answerable questions.

---

## 4. Hand-Tracing Technique

The single highest-leverage MCQ skill: **keep an explicit variable-value table** updated on each iteration.

**Protocol:**
1. List every variable that changes in the loop (loop counter, accumulator, flag, etc.) as column headers.
2. Before the loop: fill in initial values.
3. Each iteration: update each column with the new value. Check the condition. Record the result.
4. After the loop: read the final state — that is the return value or output.

**Example table layout (for a simple accumulator loop):**

| iteration | i | sum | condition (i < n) |
|---|---|---|---|
| init | 0 | 0 | — |
| 1 | 1 | 3 | true → continue |
| 2 | 2 | 7 | true → continue |
| 3 | 3 | 7 | false → exit |

Never trace "in your head." Cognitive overload causes off-by-one and loop-exit errors that vanish when you write it out.

---

## 5. Bluebook Realism

**FRQ code is typed in a plain text editor in Bluebook. There is no compiler, no autocomplete, no syntax highlighting, and no run button. Code is hand-graded and never executed.**

This has three concrete consequences:

1. **Know syntax cold.** There is no red underline to catch a missing semicolon or a mistyped method name. Every method signature on the Java Quick Reference must be memorizable, not just recognizable.
2. **Indentation is your signal to the grader.** Clean, consistent indentation shows block structure. A sloppy `if-else` can look like two `if` statements and cost you the logic point.
3. **Trace before you write.** There is no "run it to check." Work through the algorithm by hand in the scratch space (or on paper in a plain-editor practice session) before you commit to code.

**Practice implication:** All FRQ practice should be done in a plain text editor — not an IDE. Disable autocomplete, do not compile, do not run. Build the habits that work on the real exam, not habits that depend on tooling you will not have.

### 5a. Two directions from the app itself (verified 12 August 2026)

Quoted from the 2026 AP CSA Section II directions in Bluebook:

> "You may use the available paper for scratch work, but credit will only be given for responses entered in this application. Text you enter as an annotation will not be included as part of your answer."

> "You can go back and forth between questions in this section until time expires. The clock will turn red when 5 minutes remain—the proctor will not give you any time updates or warnings."

**What each one costs you if you don't know it:**

1. **Paper and annotations earn zero.** Trace on paper all you like — that is the method in §4 and it is the right method — but a reader only ever sees what is typed in the response field. An annotation is a note to yourself, not part of your answer. So every trace that turns into real logic has to be **transcribed into the box**, and you have to leave time for that: it is part of the question's budget, not a bonus at the end.
2. **You get exactly one time cue, and it is visual.** No proctor call-outs, no "30 minutes remaining," no warning at all — just the on-screen clock turning **red at 5 minutes**. That means:
   - **You are your own timekeeper.** The checkpoints in §7 and §8 are not optional decoration; they are the only pacing you will get. Glance at the clock at each one. A watch that isn't a smartwatch is allowed, and helps.
   - **Red = sweep, not panic.** Red clock is the trigger to stop new logic and do the blank-sweep (fill every blank MCQ / type a header and a loop into every blank FRQ part, and copy in anything that only exists on paper).
   - **Practise it in mocks.** Run every timed mock with the clock in front of you and nobody calling time, and make the last 5 minutes a sweep. If your mocks are proctored by a person holding a timer, you are training for a cue that will not exist on 12 May 2027.
3. **Free movement inside Section II.** The Section II directions say it in so many words: you can go back and forth between the four FRQs until time expires — which is what makes "start the one you can do first" and the flag-and-return triage in §3 safe. (The quote is from the Section II directions specifically; don't assume anything beyond that about Section I except what §3 already does — flag, move on, come back.)

---

## 6. No Guessing Penalty — Never Leave an MCQ Blank

The AP exam does **not** subtract points for wrong answers. Wrong = blank = 0. A guess has positive expected value; a blank has zero.

**Rules:**
- Every MCQ gets an answer before time ends.
- Eliminate wrong choices first (raises your odds from 25% to 33%–50%), then commit.
- If you have 30 seconds left and 3 questions unanswered: pick one letter for all three. Faster than thinking, and statistically fine.

---

## 7. Time-Budget Protocol — Section I (MCQ, 90 min)

| Time elapsed | Checkpoint |
|---|---|
| 0:00 | Start. Work at pace ≈ 2:09/question. Flag anything requiring a long trace. |
| ~45:00 | Halfway (Q21). Check: time remaining ÷ questions remaining. Recalibrate if behind. |
| ~75:00 | 15 min left. Commit guesses on all remaining flagged questions — stop new analysis. |
| **~85:00** | **The clock turns red: 5 minutes left. This is the only warning you get — the proctor gives none.** Stop new analysis for good and start the blank sweep. |
| ~88:00 | 2 min left. Last pass: every single question has a letter selected. |
| 90:00 | Time up. |

**Nobody will announce these checkpoints.** Bluebook shows a clock; you have to look at it. Build the glance-at-the-clock habit into every timed mock so it is automatic on 12 May 2027.

---

## 8. Time-Budget Protocol — Section II (FRQ, 90 min)

| Question | Suggested time | Notes |
|---|---|---|
| **Q1** Methods & Control Structures (7 pts) | **~22 min** | Two parts (A + B); budget roughly 10 min each, keep a reserve |
| **Q2** Class Design (7 pts) | **~22 min** | Highest points per minute if you know encapsulation rules cold |
| **Q3** ArrayList (5 pts) | **~18 min** | Lower point total; keep it lean |
| **Q4** 2D Array (6 pts) | **~20 min** | Index discipline critical — slow down on bounds |
| **Buffer** | ~8 min | Return to incomplete parts; add method headers to anything left blank |

**Hard rule:** if you have not started a question with 20 minutes remaining, **start it immediately** — even a correct method header + a correct loop earns partial credit. A blank earns 0.

**The red clock is the sweep trigger.** At 5 minutes remaining Bluebook turns the clock red, and that is the entire warning system — no proctor will say anything (§5a). When it turns red: stop writing new logic and scan all four responses. Type a method header and a correctly-bounded loop into every blank part, and **copy in any logic that so far only exists on your scratch paper** — paper and annotations are not scored, only what is in the response field.

---

## 9. The 10 Rules (cut this out)

1. **≈ 2:09 per MCQ** — recompute time ÷ questions at the halfway point.
2. **Never leave an MCQ blank** — no penalty; always guess.
3. **Eliminate, then guess** — each elimination raises odds.
4. **Cap any question at ≈ 2× the average** — flag and move on.
5. **First pass gimmes, second pass flags** — triage long traces; you may move between questions until time expires.
6. **Explicit variable table** for every trace — never trace in your head.
7. **FRQ: plain editor, no compiler, no run** — build habits that match Bluebook.
8. **Never leave an FRQ part blank** — write the header + a loop for partial credit.
9. **Watch your own clock** — the only cue is the clock turning **red at 5 minutes**; the proctor gives no updates or warnings.
10. **Type it or it doesn't count** — scratch paper and annotations are never scored; red clock = transcribe and sweep.
