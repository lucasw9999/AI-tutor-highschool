# Lucas's AP CSA Project — Start Here

Lucas's own problem-first study system to go from "knows Python, no Java" to a **5 on AP CSA (May 2027)** in the fewest hours. Built around three ideas borrowed from good tutoring systems (incl. DeepTutor): a **complete coverage map**, a **persistent mastery tracker**, and a **Socratic problem-first tutor**.

> **For the parent — after scores post (verified 12 August 2026):** a score can be **canceled** (free, but irreversible — exam fee not refunded, must be requested by June 15 of the exam year) or **withheld** from one specific college (reversible, $10 per recipient, ordering opens in early July). That decision has to be made before scores post, not after. Credit for a given score also varies by school — see `docs/ap-scores-and-credit.md` for the deadlines, the caveats, and where to check a specific college.

## The files
| File | What it is |
|---|---|
| **`csa-coverage-map.md`** | The complete, verified list of every testable concept + the exam structure. The "cover everything" guarantee. |
| **`mastery-tracker.md`** | The persistent memory — what you know / are shaky on / haven't touched. Carries across sessions. |
| **`tutor-prompt.md`** | The AI tutor's instructions — problem-first, hints-not-answers, stays in the AP Java subset, grades FRQs to rubric, updates the tracker. |
| **`how-to-use.md`** | Plain day-to-day instructions: time, rhythm, what each session looks like. |
| **`chatgpt-setup.md`** | Step-by-step for setting up the tutor as a ChatGPT **Custom GPT** (and the free-ChatGPT / Claude alternatives). |
| **`day-1-diagnostic.md`** | A ready-to-run first-session placement check, with answer key. |
| **`python-to-java-cheatsheet.md`** | One-time Java syntax seed for a Python beginner. |

## How to run it (today, zero setup)
1. Create a **Project** in Claude (or a Custom GPT).
2. Paste `tutor-prompt.md` as the system prompt / instructions.
3. Attach `csa-coverage-map.md` and `mastery-tracker.md` as Project knowledge.
4. Type **"let's start."** First session = a short **diagnostic**; after that it's solve-learn-repeat.
5. After each session, paste the tutor's `TRACKER UPDATE` block into `mastery-tracker.md`. That's the whole loop.

> **Using ChatGPT instead of Claude?** Follow **`chatgpt-setup.md`** — same files, set up as a ChatGPT Custom GPT (works the same; the doc also covers free-ChatGPT and Claude).

## The strategy in one breath
Use **summer 2026** to front-load Java syntax + Unit 4 (the 30–40% unit) so the school year is reinforcement, not first-exposure → let the **school year** carry the body with 1 FRQ/week → **Jan–May 2027** drill released exams to the rubric. CSP is foundation-only; skip the CSP exam.

## Free resources the tutor draws from
- **CSAwesome 2025+** (runestone.academy/ns/books/published/csawesome2) — free, College Board–endorsed, redesign-aligned; use its exercises as the problem bank.
- **CodingBat (Java)** — tiny problems, instant feedback, perfect for the syntax/basics phase.
- **College Board released FRQs** (AP Central) — the gold-standard practice + official rubrics. Full sets for 2023–2025, plus the **2026 questions** (those are the questions only — the scoring guidelines and sample responses for 2026 are not posted yet).
- **Bluebook practice** (bluebook.collegeboard.org/students/practice) — the digital exam app itself, and the one official practice route that is **not** teacher-gated: he signs in with his own College Board account, no join code needed. It's interface rehearsal, not a full-length scored paper — see `ap_csa_exam/reference/question-sources-and-access.md`.

**Not** Practice-It (UW) — it permanently shut down at the end of 2025. Don't go looking for it.

## Optional upgrade later: DeepTutor
If you want a polished, persistent app (built-in question bank, memory UI, progress views) instead of a chat Project, port these same three files into **DeepTutor** (github.com/HKUDS/DeepTutor): tutor-prompt → TutorBot persona, the two maps → Knowledge base + memory. The content is identical; it's just a nicer container. Not needed to start — the chat Project gets you solving this week.

## Verified facts this is built on
Exam: 42 MCQ (55%) + 4 FRQ (45%), 3 hrs, digital Bluebook, Java Quick Reference provided. FRQ points: Q1=7, Q2=7, Q3=5, Q4=6 (=25). Units & MCQ weight: U1 Using Objects 15–25%, U2 Selection/Iteration 25–35%, U3 Class Creation 10–18%, U4 Data Collections 30–40%. **Inheritance/polymorphism/interfaces were REMOVED in the redesign — not tested.** ~25–27% of takers score 5. *Coverage map cross-checked line-by-line against the official **CED, Effective Fall 2025** (all 53 topics, 1.1–4.17).*
