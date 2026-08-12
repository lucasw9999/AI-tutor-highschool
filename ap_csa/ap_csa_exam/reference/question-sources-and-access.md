# AP CSA — Question Sources & Access Guide

**Why this matters:** the right sources = authentic, redesign-aligned practice. The wrong sources teach inheritance, HashMap, and other topics **not on the exam**, which wastes time and builds wrong instincts. Every source below is flagged for alignment to the redesigned CED (Effective Fall 2025).

> 📥 **Just want the files?** A single consolidated **download list covering both subjects in priority order** — every official PDF worth having, with exact filenames and the 2024 material that expires first — lives in [`../../../ap_precalc/README.md`](../../../ap_precalc/README.md) under "**THE DOWNLOAD LIST**". It's written for a parent doing one download pass. This file is the *why* behind those choices.

---

## Official College Board sources (always do these first)

| Source | Cost | What you get | How to access |
|---|---|---|---|
| **CED sample MCQ + FRQ** (pp. 149–180 of the CED PDF) | Free | 20 sample MCQ (one per core skill) + 4 sample FRQ (MessageBuilder, CupcakeMachine, ItemInventory, Schedule) with official answers and scoring criteria | Download the CED PDF from AP Central → "AP Computer Science A" → Course & Exam Description |
| **2026 Released FRQ PDF** | Free | 4 official FRQs from the May 2026 sitting (Account Q1, Bottle Q2, Attendance Q3, GameBoard Q4) — the only fully public redesigned-exam artifact today | [ap26-frq-computer-science-a.pdf](https://apcentral.collegeboard.org/media/pdf/ap26-frq-computer-science-a.pdf) |
| **AP Central — Past FRQs** | Free | Several years of prior FRQs + scoring guidelines + Chief Reader Reports | apcentral.collegeboard.org → AP Computer Science A → Exam Questions |
| **CED Clarifications and Corrections** | Free | The companion errata sheet to the CSA CED — what changed in the CED since publication | [ap-computer-science-a-course-and-exam-description-clarification.pdf](https://apcentral.collegeboard.org/media/pdf/ap-computer-science-a-course-and-exam-description-clarification.pdf) |
| **Bluebook practice** | Free — **student-accessible, NOT gated** | A **test preview** for the digital AP Exams: a short question set that lets you experience digital testing and try every tool. No score, no timer — **interface rehearsal, not a mock** | [bluebook.collegeboard.org/students/practice](https://bluebook.collegeboard.org/students/practice) — log in with **your own College Board account**; no join code |
| **AP Classroom** (the real item bank) | Free — **teacher-gated** | The authoritative secure bank: Progress Checks, Question Bank, **Bluebook-Style Assessments**, full **Practice Exams**, and **AP Videos** (the current name for what used to be "AP Daily") | See access section below — **requires a join code from an AP-authorized teacher** |

### The CSA CED Clarifications and Corrections sheet — read it once, for the reassurance

The Precalc side of this repo leans on its CED clarification PDF because that document **changes the exam format**. **The CSA equivalent exists too, and its value is the opposite: it confirms nothing moved.** [`ap-computer-science-a-course-and-exam-description-clarification.pdf`](https://apcentral.collegeboard.org/media/pdf/ap-computer-science-a-course-and-exam-description-clarification.pdf) (HTTP 200, ~78 KB, verified 12 August 2026), titled **"AP® Computer Science A Clarifications and Corrections,"** section header **"Course and Exam Description Clarifications and Corrections — Implemented as of August 2025."**

**Everything it actually says:**
- The only implemented change is cosmetic — the CED front matter's "About AP" section was reworded to mention career preparation alongside college preparation.
- Forthcoming: resources linked in the CED's **"Available Resources"** callouts were moved from AP Central to AP Classroom or the Online Teacher Community, so **"The URLs in the CEDs point to AP Central and are thus inoperable,"** to be fixed **"by summer 2026."**
- Forthcoming: CED language about Progress Checks will be updated to say they are "now available and editable in the Question Bank."

**Why it matters to Lucas:** **content impact is nil, and that is the finding.** No topic was added, removed, or moved after the redesign, so the topic list this repo built against is current and the CED's exclusions still hold — no need to re-derive scope. The practical takeaway is small but real: **don't waste time clicking the "Available Resources" links inside the CED PDF** — College Board says they are broken by design until the CED is reissued. Go to AP Classroom (or this file) instead.

### Important: how to use past FRQs from AP Central

Past FRQs are valuable for rubric practice, but the format changed. Apply these filters:

- **Q1 (Methods & Control)** — ✅ usable across years (always methods + conditions + String work).
- **Q3 (ArrayList / Data Analysis)** — ✅ usable; ArrayList shape is consistent.
- **Q4 (2D Array)** — ✅ usable; 2D array work is consistent.
- **Q2 (Class Design)** — ⚠️ use **only post-redesign (2026+)** Q2. Pre-redesign Q2 was often "design a subclass" — inheritance, which is **off the exam**. Old "GridWorld" and subclass FRQs: skip entirely.
- **Old scoring (pre-redesign):** prior FRQs were 9/9/9/9 pts. The new format is **7/7/5/6 = 25 pts**. Practice the rubric structure but don't over-weight the point values.

### Officially scored sample responses — live now, and they unblock grader calibration

Verified 12 August 2026 on AP Central (AP Computer Science A → Exam Questions). These are **real student responses carrying the official point awards** — exactly what the grader-calibration gate needs, and they do **not** require waiting on the 2026 Scoring Guidelines:

| Artifact | What it is |
|---|---|
| `ap25-sg-computer-science-a.pdf` | 2025 scoring guidelines (the rubric those awards were made against) |
| `ap25-apc-computer-science-a-q1.pdf` … `-q4.pdf` | Scored student responses, Q1–Q4, with official awards and reader commentary |
| `ap25-cr-report-computer-science-a.pdf` | Chief Reader Report — the errors readers actually saw |
| `ap25-computer-science-a-scoring-statistics.pdf` | Per-question means |

The **2024 and 2023 packages are also posted** — with exact filenames below, because one stem is not what you would guess.

### The complete CSA back-catalogue, by exact filename (verified 12 August 2026)

All under `https://apcentral.collegeboard.org/media/pdf/`. **2023, 2024 and 2025 each carry the full set:** free-response questions + scoring guidelines + scored student samples Q1–Q4 + Chief Reader Report + scoring statistics + score distributions.

| Artifact | 2025 — exact name | 2024 / 2023 — exact name |
|---|---|---|
| **Free-response questions** | — *(2026's is [`ap26-frq-computer-science-a.pdf`](https://apcentral.collegeboard.org/media/pdf/ap26-frq-computer-science-a.pdf))* | ⚠️ **[`ap24-frq-comp-sci-a.pdf`](https://apcentral.collegeboard.org/media/pdf/ap24-frq-comp-sci-a.pdf)** and **`ap23-frq-comp-sci-a.pdf`** |
| **Scored student samples, Q1–Q4** | `ap25-apc-computer-science-a-q1.pdf` … `-q4.pdf` | `ap24-apc-computer-science-a-q1.pdf` … `-q4.pdf`; `ap23-apc-computer-science-a-q1.pdf` … `-q4.pdf` |
| **Scoring guidelines** | `ap25-sg-computer-science-a.pdf` | posted for both years — swap the year prefix, but **confirm before assuming** (see the stem trap) |
| **Chief Reader Report** | `ap25-cr-report-computer-science-a.pdf` | posted for both years — same caution |
| **Scoring statistics** (per-question means) | `ap25-computer-science-a-scoring-statistics.pdf` | posted for both years — same caution |
| **Score distributions** (official 1–5 spread) | `ap25-computer-science-a-score-distributions.pdf` | posted for both years — same caution |

> ⚠️ **The stem trap — and why the last column hedges.** The **question paper alone** uses **`comp-sci-a`** in 2024 and 2023: **`ap24-frq-comp-sci-a.pdf`**, *not* `ap24-frq-computer-science-a.pdf`. Every other artifact in those years spells out `computer-science-a`. Because College Board demonstrably does **not** hold one naming pattern across years, this file only prints filenames that were actually resolved — where a name is unverified it says so rather than guessing. If a constructed URL 404s, **the document is almost certainly there under a different stem**; go to AP Central → AP Computer Science A → Exam Questions and click through, rather than concluding it's missing. (Both `comp-sci-a` names were observed live; `ap24-frq-comp-sci-a.pdf` re-verified here on 12 August 2026.)

**Why the exact names matter to Lucas:** this file previously said 2024/2023 were "also posted" without URLs, which made fetching them a search task rather than a download task. Named explicitly, the back-catalogue comes down in one pass — and with the Q1/Q3/Q4 filter applied, **three years × three usable questions = 9 official rubric-plus-award pairs** for the grader-calibration gate, instead of the 3 that a single year supplies.

### Score distributions — an artifact class this repo never mentioned

**`ap25-computer-science-a-score-distributions.pdf`** (verified 12 August 2026 — HTTP 200, ~93 KB, titled **"2025 Student Score Distributions – AP® Computer Science A"**). The Precalc twin is **`ap25-precalculus-score-distributions.pdf`** (same shape, titled "2025 Student Score Distributions – AP® Precalculus"). Posted per subject, per year.

**Why this matters more than it looks:** it is the **official 1–5 distribution** — the percentage of students earning each score. That is the number the readiness thresholds in `../exam-skill-tracker.md` §(f) are ultimately calibrated against: criterion F says to read the official composite needed for a 5 and set the bar at **C5 + 8 points, floored at 78%**. The score-distribution PDF is the artifact that anchors that conversation in real data instead of the repo's estimate. Grab the 2025 pair now as the baseline, and watch for the 2026 editions — **the 2026 CSA distribution is the first one measured on the redesigned exam**, so it is the one that actually applies to him.

> ⚠️ **Apply the filter.** AP Central notes that because of the 2025–26 course revisions, the 2023–25 materials **"do not completely align with the current AP CSA Exam."** So use these for calibration on **Q1 / Q3 / Q4** — the shapes the filter above marks ✅ — and **skip Q2** (pre-redesign Q2 is inheritance-shaped). Score against that year's own scoring guidelines, and run the ±1-point check against the award for the sample you actually graded.

### What is NOT yet posted (monitor these)

| Item | URL to watch | Expected |
|---|---|---|
| 2026 Scoring Guidelines | `apcentral.collegeboard.org/media/pdf/ap26-sg-computer-science-a.pdf` | ~Fall 2026 |
| 2026 Chief Reader Report | `apcentral.collegeboard.org/media/pdf/ap26-cr-report-computer-science-a.pdf` | ~Fall 2026 |
| 2026 scored student samples | `apcentral.collegeboard.org/media/pdf/ap26-apc-computer-science-a-q1.pdf` (…`-q4`) | ~Fall 2026 |
| 2026 scoring statistics | `apcentral.collegeboard.org/media/pdf/ap26-computer-science-a-scoring-statistics.pdf` | ~Fall 2026 |
| 2026 score distributions (the redesigned raw→5 curve) | `apcentral.collegeboard.org/media/pdf/ap26-computer-science-a-score-distributions.pdf`, and apstudents.collegeboard.org → score distributions | Later 2026 |

**Re-confirmed 12 August 2026 — all of the above return 404, for *both* subjects** (`ap26-sg-*`, `ap26-cr-report-*`, `ap26-apc-*-q1`, `ap26-*-scoring-statistics`). Both subjects' past-exam-questions pages list **2026 as free-response questions ONLY**, which is consistent: the questions post first, the scoring package follows in the fall. **None of these blocks anything** — the 2025 scored samples above already supply an official rubric-plus-award pair, so the 2026 Scoring Guidelines are an *upgrade*, not the key to grader calibration.

---

## AP Classroom access reality — time-critical

**AP Classroom is teacher-gated.** A self-studying student cannot open it directly. Logging in brings you to a screen that asks for a join code; without one, you see only limited **AP Videos** content (formerly "AP Daily") — **not** the Progress Checks, Question Bank, Bluebook-Style Assessments, or full Practice Exams.

### Bluebook practice — the one official channel that is NOT gated

**[bluebook.collegeboard.org/students/practice](https://bluebook.collegeboard.org/students/practice)** (verified 12 August 2026). Linked from both AP Students assessment pages. You **log in with your own College Board account information** — **no join code, no teacher, no enrolled section** — then open **"Practice and Prepare" → test preview**: a short set of questions that lets you *"experience digital testing and try out all the tools,"* with no score, no answer feedback, and no timer. Test previews are offered **for the digital AP Exams** as well as the SAT Suite.

**Why this is the piece the access plan was missing:** every other official channel in this file needs an adult to act first — a teacher's join code (AP Classroom) or an AP Coordinator confirming the school even **offers** AP CSA (still unconfirmed for Lucas). Bluebook practice needs **only his own account**, so it happens in week one no matter how the school questions resolve. It is the **fallback that survives the worst case**: school doesn't offer CSA, no teacher, no join code — he still gets inside the real exam application.

⚠️ **Scope it honestly, both ways.**
- What it does **not** do: it is **interface rehearsal, not a full-length mock.** The page itself directs students to AP Classroom to practice for AP Exams. So it does **not** satisfy criterion C's "≥1 mock from official material" in `../exam-skill-tracker.md` §(f) — use the official-anchor fallback there for that.
- What it **does** do: it satisfies the Bluebook-realism requirement in `frq-rubric-and-penalties.md` §7 — CSA free-response answers are **typed** into Bluebook with **no compiler, no autocomplete, no run button**, and this is the way to make sure exam day isn't the first time he types Java into that editor.


**Why the join code matters for readiness (verified 12 August 2026):** AP Classroom now carries **Bluebook-Style Assessments** and full **Practice Exams**. **That Practice Exam is the official full-length mock the readiness bar asks for** (`../exam-skill-tracker.md` §(f) criterion C, "≥1 mock from official material") — and it arrives with the teacher's join code. Getting the code is therefore not a nice-to-have; it is the cheapest way to satisfy the official-material requirement. Without it, fall back to the official-anchor path in the tracker.

**Do this once, early — a Bluebook test-preview run:** target the **first week of school, September 2026**, and in any case **before the first full timed mock**. **This does not wait on the join code** — the preview is student-accessible with his own College Board account (see the section above), so run it the week school starts whether or not AP Classroom has come through. On AP CSA, free-response answers are **typed** into Bluebook with **no compiler, no autocomplete, no run button** — exam day should not be the first time you type Java into that editor. (See `frq-rubric-and-penalties.md` §7.)

**How to get full access:**

1. **If you're enrolled in an AP CSA class (Lucas's case):** your teacher issues the join code automatically — just ask for it at the start of the course. This is the normal path and needs nothing extra. (It does depend on the teacher actually using AP Classroom; most do, but confirm.)
2. **If you're self-studying with no class:** enroll with an AP-Course-Audit-approved online provider (e.g., APEX Learning, Virtual Virginia, or a similar CB-authorized online AP program) whose AP teacher can issue a join code.

Either way, do this **early** — AP Classroom access is tied to a specific teacher's course section.

---

## Exam registration — time-critical deadline

Sitting the AP exam requires being registered through an AP-administering school. You do **not** self-register through College Board.

**If you attend a school that administers the AP CSA exam (Lucas's case):** register through your school's **AP Coordinator** in the fall — the school places your exam order. Because a **small or private school does not always administer every AP exam**, confirm two things early:
1. That your school is set up to give the **AP CSA** exam this cycle (ask the AP Coordinator directly — don't assume).
2. That your exam order is placed by the **~mid-November** deadline.

**If your school does NOT administer AP CSA:** use the **AP Course Ledger** (apcourseledger.collegeboard.org) → search AP Computer Science A → find a nearby authorized school that accepts outside test-takers → contact its AP Coordinator. Same ~mid-November deadline.

> **The real May 2027 deadline structure** (College Board AP school-year timeline, verified 12 August 2026):
> - **October 2, 2026** — *preferred* deadline to submit AP exam orders.
> - **November 13, 2026, 11:59 PM ET** — **final** deadline. Orders after October 2 carry **an additional $40 per exam late order fee**.
> - **January 22, 2027** — deadline for the school's SSD coordinator to submit accommodations requests (only if accommodations are ever needed).
> - **March 12, 2027, 11:59 PM ET** — deadline to submit spring course orders and *fall order changes*.
>
> **So missing October 2 is not fatal — there is a late path, at $40 per exam.** (An earlier version of this line claimed there was none; that was wrong.) The one thing to do: **before Oct 2, 2026, confirm with your school's AP Coordinator that BOTH exams — AP Computer Science A *and* AP Precalculus — are on the school's order.** Schools set their own earlier local deadlines, so ask in the first week of school. See `../README.md` for the exam-only-section path if the school does not administer AP CSA.
>
> **Exam dates and sessions** (verified 12 August 2026): College Board now labels sittings **Session 1 / Session 2**, "replacing the former morning and afternoon designations," "to prevent the disclosure of secure exam content across time zones." In the lower 48 the start times are unchanged: **Session 1 = 8 a.m. local, Session 2 = 12 p.m. local.** AP Precalculus is **Session 1, Tuesday 11 May 2027**; AP CSA is **Session 2, Wednesday 12 May 2027** — about **30 hours apart, not the ~24 a "back-to-back" reading implies.** Confirm the exact per-school start time with the AP Coordinator (College Board says a per-school start-time lookup tool is "coming this fall").

---

## Free third-party sources

| Source | Inheritance alignment | Cost | What it covers | Use / skip notes |
|---|---|---|---|---|
| **CSAwesome2** (Runestone, 2025–26 edition) | ✅ Aligned | Free | Units 0–4 — full redesigned CED scope with interactive exercises and Parsons problems | **Primary free practice anchor.** Use Units 0–4. **Skip "Unit 5 Inheritance"** (labeled optional; not on the exam). |
| **CodingBat Java** | ✅ Aligned (with skips) | Free | Method-level Java drills: String, Array, Logic, List, Recursion problems | Great for method-level fluency. **Skip Map-1/Map-2** (HashMap — off exam) and **Functional-1/Functional-2** (lambdas — off exam). Everything else is fair game. |
| **CodeHS "Cortado"** free tier | ✅ Aligned | Free (core tier) | Redesign-aligned AP CSA course — updated to match the new CED | Use the **Cortado** course. **Avoid "Nitro"** (old course; still teaches inheritance). If CodeHS prompts a course selection, confirm you're on Cortado. |

---

## Paid third-party sources

| Source | Inheritance alignment | Cost | Signature strength | Notes |
|---|---|---|---|---|
| **Albert.io AP Computer Science A** | ✅ Aligned | Subscription (~$20–30/mo or annual) | Large bank of redesign-aligned MCQ and FRQ with explanations, organized by unit and skill | Good for high-volume drilling with instant feedback. Confirm question set is tagged for the redesigned CED. |
| **Fiveable AP Computer Science A** | ✅ Aligned | Subscription or free tier available | Unit guides, practice questions, live review streams | Useful for conceptual review + mixed practice. Redesign-aware. |

---

## Books — buy by exact ISBN

The book market has a lag problem: many older editions still teach inheritance, HashMap, and interfaces as core AP topics. **Only the editions below have been updated for the redesigned exam.**

| Book | Edition | ISBN | Alignment | Notes |
|---|---|---|---|---|
| **Barron's AP Computer Science A Premium** | **13th edition** | **9798349700354** | ✅ Aligned | Redesign-updated. Buy this edition specifically — pre-13th editions teach inheritance. |
| **Princeton Review Cracking the AP Computer Science A Exam** | **9th edition** | **9780593518410** | ✅ Aligned | Redesign-updated. Buy this edition specifically — pre-9th editions teach inheritance. |
| **5 Steps to a 5: AP Computer Science A 2026** | 2026 | Unverified | ⚠️ Unverified | **Do not buy until you check the table of contents.** If it covers inheritance as an exam topic, it has not been updated for the redesign. Verify the ToC before purchasing. |

> **Rule of thumb:** if a book's table of contents has a chapter on "Inheritance," "Polymorphism," "Abstract Classes," or "Interfaces" as exam content (not as a supplement), it is not aligned to the redesigned exam.

---

## AVOID list — sources that still teach off-exam content

| Source | Problem | Status |
|---|---|---|
| **CSAwesome v1** (the original Runestone course) | Teaches inheritance throughout as core AP content | ❌ Avoid — use CSAwesome2 (2025–26 edition) instead |
| **CodeHS "Nitro"** (old AP CSA course) | Inherited the old CED structure; inheritance is a core unit | ❌ Avoid — use CodeHS Cortado instead |
| **Longbao Nguyen "apjava"** materials | Based on the old exam; includes inheritance, interfaces, and abstract classes as testable topics | ❌ Avoid |
| **Pre-13th Barron's editions** | Teach inheritance as core AP content | ❌ Avoid — 13th ed. (ISBN 9798349700354) only |
| **Pre-9th Princeton Review editions** | Same problem | ❌ Avoid — 9th ed. (ISBN 9780593518410) only |
| **Practice-It (University of Washington)** | Was a widely-used Java problem set site — **shut down end of 2025; site is dead** | ❌ Dead — do not attempt to access or link |
| **Old AP Central FRQ Q2 (pre-2026)** — "design a subclass" / GridWorld | Inheritance-based FRQ shapes that no longer appear on the exam | ⚠️ Skip Q2 only for pre-2026 years; other FRQ types are fine |

---

## Summary: the recommended stack

**If self-studying (limited AP Classroom access):**
1. CED samples (pp. 149–180) + 2026 released FRQ PDF — do these first, every one.
2. **Bluebook test preview** — week one, no join code needed, so nothing blocks it.
3. CSAwesome2 Units 0–4 for daily interactive practice.
4. CodingBat Java (skip Map + Functional) for method-level fluency.
5. AP Central past FRQs (Q1/Q3/Q4 any year; Q2 post-redesign only) — plus the **2025 scored samples** (`ap25-apc-*`) for grader calibration, and the 2024/2023 sets by the exact names in the back-catalogue table above.
6. One book: Barron's 13th (ISBN 9798349700354) or Princeton Review 9th (ISBN 9780593518410).
7. Enroll with an AP-audit-approved online provider → get AP Classroom access.

**With AP Classroom access:**
Same stack, plus use the AP Classroom Question Bank and Progress Checks as your primary MCQ source — those are the closest to real exam items.

**Paid add-ons (when you want more volume):** Albert.io for MCQ drilling; Fiveable for unit review.
