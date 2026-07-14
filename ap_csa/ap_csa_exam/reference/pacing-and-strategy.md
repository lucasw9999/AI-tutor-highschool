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
| ~88:00 | 2 min left. Scan every question for blanks. Fill all blanks with a best guess. |
| 90:00 | Time up. |

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

At the end of the section: scan all four responses for blank parts. Write something — anything showing the right intent — on every blank part.

---

## 9. The 8 Rules (cut this out)

1. **≈ 2:09 per MCQ** — recompute time ÷ questions at the halfway point.
2. **Never leave an MCQ blank** — no penalty; always guess.
3. **Eliminate, then guess** — each elimination raises odds.
4. **Cap any question at ≈ 2× the average** — flag and move on.
5. **First pass gimmes, second pass flags** — triage long traces.
6. **Explicit variable table** for every trace — never trace in your head.
7. **FRQ: plain editor, no compiler, no run** — build habits that match Bluebook.
8. **Never leave an FRQ part blank** — write the header + a loop for partial credit.
