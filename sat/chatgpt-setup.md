# Setting Up the SAT Tutor in ChatGPT (Custom GPT)

Same idea as the AP tutors. Requires **ChatGPT Plus** (no Plus? see bottom).

## Step 1 — Create the GPT
1. **chatgpt.com** → left sidebar → **Explore GPTs** → **+ Create** (top-right).
2. The builder shows **two panels** (normal): **left = build/Configure**, **right = Preview/test**. Use the **Configure** tab. Don't type tutoring into the left "Create" box — that's the builder bot, not your tutor.

## Step 2 — Configure (left → "Configure" tab)
- **Name:** `SAT Tutor`
- **Instructions:** paste everything below the `---` line in **`tutor-prompt.md`**.
- **Knowledge — upload these** (flat is fine; the GPT finds them by name):
  - `coverage-map.md`, `mastery-tracker.md`
  - **Study packs (7):** `rw-grammar` · `rw-reading` · `rw-expression` · `math-algebra` · `math-advanced` · `math-problem-solving-data` · `math-geometry-trig`
  - **References (7):** `desmos-calculator-skills` · `test-strategy-and-pacing` · `grammar-cheatsheet` · `error-log` · `scoring-and-adaptive` · `vocab-in-context` · `practice-resources`
  - *(optional)* `diagnostic.md`

## Step 3 — Test (right Preview panel)
Type **"let's start"** to confirm it runs the diagnostic and fires questions (not lectures).

## Step 4 — Save & use
- Click **Create** → **Only me** → save.
- Open it the normal way: sidebar → your GPTs → **SAT Tutor** → a single chat. That's where you work.

## Daily use
- First time: **"let's start"** (diagnostic). After: **"let's continue."**
- Answer + say **why**; wrong → it coaches + logs the error. End → paste the `TRACKER UPDATE` into `mastery-tracker.md`.

## Pair it with the real thing
The official **Bluebook** app (free from College Board) has full **adaptive** practice tests — use it for periodic full-length practice, then feed your results + error log back to the tutor. **Khan Academy's "Official Digital SAT Prep"** is the free official question source.

## Keeping the tracker current (ChatGPT)
Uploaded Knowledge is read-only — paste the current `mastery-tracker.md` at the **start** of a session, or re-upload it periodically.

## No Plus? (free ChatGPT)
Paste `tutor-prompt.md` (below the `---`) **plus** `coverage-map.md` and the **one** pack you're drilling that day, then "let's start." (Free chats can't hold all files at once.)

> Claude works identically — set it up as a Claude **Project** with the same files.
