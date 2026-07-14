# Setting Up the AP CSA Examiner in ChatGPT (Custom GPT)

Same idea as the SAT and AP Precalc tutors. Requires **ChatGPT Plus** (no Plus? see bottom).

## Step 1 — Create the GPT

1. **chatgpt.com** → left sidebar → **Explore GPTs** → **+ Create** (top-right).
2. The builder shows **two panels**: **left = Configure**, **right = Preview**. Use the **Configure** tab. Do not type anything into the left "Create" chat box — that is the builder bot, not your examiner.

## Step 2 — Configure (left → "Configure" tab)

- **Name:** `AP CSA Examiner`
- **Instructions:** paste everything below the `---` line in **`exam-tutor-prompt.md`**.
- **Knowledge — upload these files one by one:**

  **Core documents (4):**
  - `exam-blueprint.md`
  - `topic-coverage-matrix.md`
  - `exam-skill-tracker.md`
  - `diagnostic-exam.md`

  **Question bank (11):**
  - `mcq-analyze-code.md`
  - `mcq-unit-1.md`
  - `mcq-unit-2.md`
  - `mcq-unit-3.md`
  - `mcq-unit-4.md`
  - `frq-q1-methods-control.md`
  - `frq-q2-class-design.md`
  - `frq-q3-arraylist.md`
  - `frq-q4-2d-array.md`
  - `practice-exams.md`
  - `official-sources-index.md`

  **Reference (7):**
  - `pacing-and-strategy.md`
  - `frq-rubric-and-penalties.md`
  - `killer-errors-cheatsheet.md`
  - `java-quick-reference-drills.md`
  - `question-sources-and-access.md`
  - `exam-day-protocol.md`
  - `inheritance-hashmap-supplement.md`

  **Parent file (1) — from the `ap_csa/` folder one level up:**
  - `../mastery-tracker.md` (the content-mastery tracker; the examiner reads it alongside `exam-skill-tracker.md` to tell a careless slip from a true content gap)

## Step 3 — Test (right Preview panel)

Type **"let's start"** to confirm it presents a diagnostic question (not a lecture). It should ask you to answer cold before explaining anything.

## Step 4 — Save & use

- Click **Create** → **Only me** → save.
- Open it: sidebar → your GPTs → **AP CSA Examiner** → a single persistent chat. That is where you work every session.

## Daily use

- First time: **"let's start"** (runs `diagnostic-exam.md`). After: **"let's continue."**
- Answer cold — committed choice + reasoning. Wrong → it diagnoses + micro-teaches. End → paste the `TRACKER UPDATE` into `exam-skill-tracker.md`.

## Keeping the tracker current (ChatGPT)

Uploaded Knowledge is read-only — the GPT cannot write back to your files. Two options:

1. **Paste at session start:** copy your current `exam-skill-tracker.md` into the chat at the start of each session ("here is my current tracker: [paste]").
2. **Re-upload periodically:** delete the old `exam-skill-tracker.md` from Knowledge and upload the updated version (~once a week or after a full mock).

Option 1 is simpler for daily sessions; option 2 keeps the baseline clean for longer runs.

## No Plus? (free ChatGPT)

Paste `exam-tutor-prompt.md` (below the `---`) **plus** `exam-blueprint.md` and the **one** pack you are drilling that day, then "let's start." Free chats cannot hold all files at once, so load only what the session needs.

> Claude works identically — set it up as a Claude **Project**: paste `exam-tutor-prompt.md` as the project instructions, then upload all 23 knowledge files above (the 22 in `ap_csa_exam/` plus the parent `../mastery-tracker.md`). Use it the same way.
