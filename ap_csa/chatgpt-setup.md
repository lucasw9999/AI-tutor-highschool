# Setting Up the Tutor in ChatGPT (Custom GPT)

How to put this whole system into a ChatGPT **Custom GPT** so it has the tutor instructions + knowledge files saved. (Requires **ChatGPT Plus**. No Plus? See the bottom.)

## Step 1 — Create the GPT
1. Go to **chatgpt.com** → left sidebar → **Explore GPTs** → **+ Create** (top-right).
2. You'll land in the **GPT builder**. ⚠️ **It shows two panels — this is normal:**
   - **Left = builder/editor.** (The "Create" tab here is a bot that *helps build* the GPT — it is **not** your tutor. Use the **Configure** tab for manual setup.)
   - **Right = Preview** — a live test of the GPT you're building.

## Step 2 — Configure it (left panel → "Configure" tab)
Fill in:
- **Name:** `AP CSA Tutor`
- **Instructions:** paste the entire contents of **`tutor-prompt.md`** (everything below the `---` line).
- **Knowledge** (upload these files from the `ap_csa/` folder):
  - `csa-coverage-map.md`
  - `mastery-tracker.md`
  - *(optional)* `python-to-java-cheatsheet.md`, `day-1-diagnostic.md`
- **Model:** any current top model is fine (e.g., a "Thinking"/reasoning model gives more careful Java grading).

## Step 3 — Test it (right panel)
Type **"let's start"** in the **right-hand Preview** box to make sure it runs the diagnostic.
⚠️ Don't type tutoring into the **left** box — that talks to the builder bot, not your tutor.

## Step 4 — Save & use it for real
1. Click **Create** (top-right) → choose **"Only me"** → save.
2. **Leave the editor.** Open the GPT the normal way: left sidebar → your GPTs → **AP CSA Tutor**.
3. That opens a **single, normal chat window** — this is where Lucas works every day.

---

## Daily use
- **First time ever:** type **"let's start"** → runs the Day-1 diagnostic, sets your levels.
- **Every day after:** type **"let's continue"** → picks up where you left off.
- Solve problems. Stuck → **"hint."** Too easy → **"make these harder."** Too hard → **"give me an easier one."**
- **End of session:** the tutor prints a **`TRACKER UPDATE`** block → paste it into `mastery-tracker.md` and save.

## Keeping the tracker current in ChatGPT
A Custom GPT's uploaded Knowledge files are **read-only**, so to keep memory fresh, do one of these:
- **Easiest:** at the **start** of each session, paste the current contents of `mastery-tracker.md` into the chat ("here's where I am: …").
- Or every so often, **re-upload** the updated `mastery-tracker.md` to the GPT's Knowledge.

## Checking status anytime
- Ask the tutor: **"Show me my status — what's solid, shaky, not started, and what's next."**
- Or open **`mastery-tracker.md`** (the dashboard: per-unit status + per-concept ⬜/🟡/🟠/🟢/⭐ + session log).

## No ChatGPT Plus? (free)
Skip the Custom GPT. In a normal chat, paste **`tutor-prompt.md`** (below the `---`) **plus** the contents of **`csa-coverage-map.md`**, then type **"let's start."** It works the same — you just re-paste those when starting a new chat.

> Claude works too — same files, set up as a Claude **Project** instead. Use whichever you prefer; the system is identical.
