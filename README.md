# AI-Tutor High-School Study Systems

Personal, **question-first** study systems that turn an AI chat assistant — a ChatGPT **Custom GPT** or a Claude **Project** — into a focused tutor for one specific class or exam. Each subject folder is a self-contained system: a coverage map, study/question packs, a persistent progress tracker, and a tutor "personality" prompt.

The idea: **you do the problems.** The tutor gives one problem at a time, diagnoses the exact thing you missed, teaches only that in a sentence or two, gives you a couple of reps to lock it in, and tracks progress toward the goal — instead of reading a textbook cover to cover.

> **Private, personal project.** These are homemade study aids for one student's own preparation. See **Scope & disclaimer** at the bottom.

## How it works (the same for every subject)

1. Open the subject folder and follow its **`chatgpt-setup.md`**: paste that subject's **`tutor-prompt.md`** as the assistant's instructions, and upload its knowledge files (coverage map, study packs / question bank, mastery tracker, reference docs).
2. Type **"let's start"** → a short **diagnostic** places you → then **"let's continue"** each day (~30–40 min).
3. At the end of each session, paste the tutor's **`TRACKER UPDATE`** block into that subject's **`mastery-tracker.md`** so it remembers where you are next time.

Every subject shares this shape — **problem/question-first, failure-driven, spaced, and tracked.** The tutor **coaches and quizzes; it does not hand over answers or write your work.**

## The subjects

| Folder | What it's for | Goal | Details |
|---|---|---|---|
| [`ap_csa/`](ap_csa/README.md) | **AP Computer Science A** — learn Java coming from Python, problem-first. Includes **[`ap_csa_exam/`](ap_csa/ap_csa_exam/README.md)**, an exam-drill layer that converts "I know it" into scored exam points. | 5 on the redesigned AP CSA exam (May 2027) | [`ap_csa/README.md`](ap_csa/README.md) |
| [`ap_precalc/`](ap_precalc/README.md) | **AP Precalculus** — condensed, exam-driven; do a problem, learn the missing piece, repeat. | A in the class + 4–5 on the exam (May 2027) | [`ap_precalc/README.md`](ap_precalc/README.md) |
| [`sat/`](sat/README.md) | **Digital SAT** — drill every question type + keep a relentless error log. | 1500+ (ready spring 2027) | [`sat/README.md`](sat/README.md) |
| [`10th_english/`](10th_english/README.md) | **Grade-10 English** — read → analyze → write → rubric feedback, per assigned text. | An A in the class | [`10th_english/README.md`](10th_english/README.md) |

Each folder's own **`README.md`** explains that subject in detail — what it is, how to use it, and the study materials inside. `ap_csa/` additionally has `ap_csa_exam/` with its own README for the exam-drill phase.

## Scope & disclaimer

- **Independent, personal study aid.** This project is **not affiliated with, authorized by, or endorsed by** the College Board, Educational Testing Service, Desmos, Turnitin, any school, or any test maker.
- **Trademarks** referenced — including *AP®*, *Advanced Placement®*, *SAT®*, *PSAT/NMSQT®*, *Pre-AP®*, and *Bluebook®* (College Board), *Desmos®*, and *Turnitin®* — belong to their respective owners and are used here only nominatively, to refer to those exams and tools for study.
- **Practice questions are original,** written to match the *style and rubric structure* of each exam. Official exam questions are **cited and linked to the source, never reproduced.**
- **Literary study packs** use brief, attributed quotations for commentary and analysis (educational use); always quote from your own copy of the text.
- Maintained as a **private repository** for one student's personal preparation.

## License

Original materials in this repository are released under the **[Creative Commons Attribution-NonCommercial 4.0 International License (CC BY-NC 4.0)](LICENSE)** — you may **reuse and adapt them for non-commercial purposes with attribution; commercial use is not permitted.** The third-party quotations, official exam questions (cited/linked, not reproduced), and trademarks referenced above are **not** covered by this grant and remain the property of their owners. See [`LICENSE`](LICENSE) for details.
