# Setting Up the AP Precalc Tutor in ChatGPT (Custom GPT)

Same idea as the CSA and English tutors. Requires **ChatGPT Plus** (no Plus? see bottom).

## Step 1 — Create the GPT
1. **chatgpt.com** → left sidebar → **Explore GPTs** → **+ Create** (top-right).
2. The builder shows **two panels** (normal): **left = build/Configure**, **right = Preview/test**. Use the **Configure** tab. Don't type tutoring into the left "Create" box — that's the builder bot, not your tutor.

## Step 2 — Configure (left → "Configure" tab)
- **Name:** `AP Precalc Tutor`
- **Instructions:** paste everything below the `---` line in **`tutor-prompt.md`**.
- **Knowledge — upload these files** (flat is fine; the GPT finds them by name):
  - `coverage-map.md`, `mastery-tracker.md`
  - all 4 in **`study-packs/`** (units 1–4)
  - all 3 in **`reference/`** (formula-and-identity sheet, graphing-calculator skills, exam-strategy-and-scoring)
  - *(optional)* `diagnostic.md`

## Step 3 — Test (right Preview panel)
Type **"let's start"** to confirm it runs the diagnostic and gives you problems (not lectures).

## Step 4 — Save & use
- Click **Create** → **Only me** → save.
- Open it the normal way: sidebar → your GPTs → **AP Precalc Tutor** → a single normal chat. That's where you work.

## Daily use
- First time: **"let's start"** (diagnostic). After: **"let's continue."**
- Show your work; stuck → **"hint."** End of session → paste the `TRACKER UPDATE` into `mastery-tracker.md`.

## Tip: math typing
You can type math plainly — `x^2`, `sqrt(5)`, `pi/3`, `log base 2 of 8`, `sin(30 deg)`. The tutor understands it. For graphs/work, describe it or upload a photo of your handwritten steps.

## Keeping the tracker current (ChatGPT)
Uploaded Knowledge is read-only, so either paste the current `mastery-tracker.md` at the **start** of a session, or **re-upload** the updated tracker every so often.

## No Plus? (free ChatGPT)
In a normal chat, paste `tutor-prompt.md` (below the `---`) **plus** `coverage-map.md` and the **one** unit pack you're working that day, then "let's start." (Free chats can't hold all files at once — feed it the pack you need.)

> Claude works identically — set it up as a Claude **Project** with the same files.
