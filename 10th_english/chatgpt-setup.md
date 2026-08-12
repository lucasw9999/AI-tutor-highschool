# Setting Up the English Tutor in ChatGPT (Custom GPT)

Same idea as the CSA tutor. Requires **ChatGPT Plus** (no Plus? see bottom).

## Step 1 — Create the GPT
1. **chatgpt.com** → left sidebar → **Explore GPTs** → **+ Create** (top-right).
2. The builder shows **two panels** (this is normal): **left = build/Configure**, **right = Preview/test**. Use the **Configure** tab on the left. Don't type your tutoring into the left "Create" box — that talks to the GPT-builder bot, not your tutor.

## Step 2 — Configure (left → "Configure" tab)
- **Name:** `English Tutor (Grade 10)`
- **Instructions:** paste everything below the `---` line in **`tutor-prompt.md`**.
- **Knowledge — upload these files from the `10th_english/` folder:**
  - `coverage-map.md`
  - `mastery-tracker.md`
  - All 5 study packs (in `study-packs/`): `01-julius-caesar` · `02-night` · `03-the-book-thief` · `04-the-kite-runner` · `05-life-of-pi`
  - All in **`guides/`** (essay-writing, literary-devices, grammar, vocabulary, **vocab-word-bank** (all 24 weeks), research-mla)
  - **`reference/practice-resources.md`** — the verified outside links (Folger *Julius Caesar* full text, official AP English Literature rubric + FRQs, Purdue OWL grammar) so the tutor can point Lucas at real material instead of inventing URLs
  - **`Caesar Essay Topics.txt`** — Mrs. P's real 10-topic list for the Julius Caesar essay
  - **`sample_omm_essay_short.txt`** — her real annotated A-range sample essay (shows her rubric in action)
  - *(optional)* `diagnostic.md`

## Step 3 — Test (right "Preview" panel)
Type **"let's start"** to confirm it runs the diagnostic and tutors correctly.

## Step 4 — Save & use
- Click **Create** (top-right) → **Only me** → save.
- Leave the editor. Open it the normal way: sidebar → your GPTs → **English Tutor** → a single normal chat. That's where Lucas works.

## Daily use
- First time: **"let's start"** (diagnostic). After: **"let's continue."**
- Stuck → **"hint."** End of session → paste the `TRACKER UPDATE` into `mastery-tracker.md`.

## Keeping the tracker current (ChatGPT specific)
Uploaded Knowledge files are read-only, so either: paste the current `mastery-tracker.md` contents at the **start** of a session ("here's where I am…"), or **re-upload** the updated tracker every so often.

## No Plus? (free ChatGPT)
In a normal chat, paste `tutor-prompt.md` (below the `---`) **plus** the contents of `coverage-map.md` and whichever **one** study pack or guide you're working on that day, then type "let's start." (Free chats can't hold all files at once — feed it the pack you need.)

> Claude works identically — set it up as a Claude **Project** with the same files. Use whichever you prefer.
