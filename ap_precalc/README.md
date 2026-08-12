# Lucas's AP Precalculus Project — Start Here

A **condensed, exam-driven, question-first** catch-up system for AP Precalculus. **Goal: be confident for the class (A) and the AP exam (4–5, May 2027)** — fast, without reading a textbook cover to cover. Same architecture as `../ap_csa/` and `../10th_english/`, tuned for math: **do a problem → learn the piece you're missing → repeat.**

## What's here
> 🔴 **For the parent — DO THIS IN THE FIRST WEEK OF SCHOOL (late Aug / early Sept 2026).** It is the earliest deadline in this repo and it is one email. Write to the **Foothill HS AP Coordinator** and get three answers **in writing**:
> 1. **Does Foothill administer the AP Computer Science A exam in May 2027?**
> 2. **Will Lucas be on the school's exam order for BOTH AP Computer Science A and AP Precalculus?**
> 3. **What is the school's own internal ordering deadline?** (Schools set their own, earlier than College Board's.)
>
> **If the answer to (1) is no, the search for a school that will host him has to start in September, not November.** The Nov 13 order deadline belongs to a coordinator at a school that has *already agreed* to host him; finding that person takes weeks. Only an **AP Coordinator** can order an exam — a parent or a student cannot, ever. **Every fee and every date is in one table: "MONEY AND DEADLINES" immediately below.**
>
> ⚠️ **For the parent — the deadline (College Board timeline, verified 12 August 2026):** **preferred deadline Oct 2, 2026; final deadline Nov 13, 2026, 11:59 PM ET.** The **$40 per exam late order fee applies only after Nov 13** — the Oct 2 → Nov 13 window costs nothing extra. One order covers **both** AP Precalculus and AP CSA — confirm both are on it. Accommodations, if ever needed: **Jan 22, 2027**.
>
> ⚠️ **For the parent — the content blocker, and it has a date.** The Precalc question bank is **not built**: `npm run build` fails with *"the bank holds 0 of the 38 multiple choice question(s) it takes to cover the 42 a full paper contains"* and *"33 of 36 exam-tested topic(s) have NO items."* Until that work lands, **no Precalc mock can be assembled and readiness is unmeasurable at any level of effort** — the number will correctly read 0 however much he studies. **Hard fail-by: Mon 15 Mar 2027** (derived from the readiness engine's own rules). **Recommended target: Sun 31 Jan 2027** (judgement, not derived). Arithmetic and consequences: **`study-plan.md`**.
>
> ⚠️ **For the parent — one more non-compressible task.** The readiness bar requires an **official** College Board paper inside the scored mock window, and the only full-length official Precalc paper is the **AP Classroom Practice Exam**, which is gated to authorized educators. **Get a join code from his AP Precalc teacher in the first week of school (Sept 2026).** No code → no official mock → no qualifying window, regardless of every score. *(The ungated Bluebook practice in Priority 4 of the download list below does **not** substitute — it is a short unscored test preview, not a full-length paper.)* ⚠️ **It must be the join code for a class section he is enrolled in.** An **exam-only** registration is not enrolment: the 2026-27 AP Coordinator's Manual says exam-only students *"must be enrolled in class sections to access the available AP Classroom resources,"* so an exam-only seat carries AP videos and a chair on exam day — **not** the Practice Exam. Full mechanism: `../ap_csa/ap_csa_exam/reference/question-sources-and-access.md` → *"Exam-only registration gets him a SEAT, not the official mock."*

---

## 💵 For the parent — MONEY AND DEADLINES (one table, both exams)

**This is the only place in the repo that prints fee figures, on purpose.** Every other file cross-references it. The $40 late fee used to be copied into five separate places, and **four of the five attached it to the wrong date** — charging $40 for a window that is actually free. So if something here is wrong, fix it **here**, and don't paste the figures elsewhere.

**Fees are paid to the school, not to College Board.** The school places the order, College Board invoices the school, and the **AP Coordinator** tells you what to pay and when. **Verified 12 August 2026** against College Board's AP exam-fees page and its AP school-year timeline — except rows marked **UNVERIFIED**, which say exactly what is and isn't known.

### The money

| Item | Amount | When it applies |
|---|---|---|
| **Base exam fee** | **$99 per exam** at schools in the U.S., U.S. territories, Canada and all DoDEA schools (**$129** elsewhere) | Always. **Two exams ≈ $198** — that is the actual number behind "register for both". |
| **Late order fee** | **+$40 per exam**, in addition to the base exam fee | **Only** on exams ordered **14 Nov 2026 – 12 Mar 2027, 11:59 p.m. ET**. Ordering any time up to **13 Nov 2026** carries no extra charge. |
| **Unused / canceled exam fee** | **$40 per exam** | If an exam is canceled in AP Registration and Ordering **after 13 Nov 2026 and by 12 Mar 2027, 11:59 p.m. ET**. The original exam fee is removed from the invoice, so a late cancellation costs $40 — not $99, but not nothing. **See the callout below.** |
| **Fee reduction** | **$37 per exam** for eligible students (plus a **$9 per exam** rebate to the school) | The **school** flags eligibility and must finalize it by **30 Apr 2027**. **UNVERIFIED — the eligibility criteria.** College Board's fees page defers to a page that did not resolve on 12 Aug 2026, so this repo does not state who qualifies: **that is a question for the AP Coordinator.** "Some states also provide funding for AP Exams" — the coordinator knows whether California does. |
| **Late payment fee** | **$225** | **15 Jun 2027** is the postmark deadline for exam payments, and the fees page attaches a **$225 late fee** to it. **UNVERIFIED — who bears it.** Payment flows school → College Board, so ask the coordinator whether a family can be exposed to it at all. |

### The dates

| Date | What happens | Who has to act |
|---|---|---|
| **First week of school — late Aug / early Sept 2026** | **The three questions to the AP Coordinator, in writing** (top of this file). Earliest deadline in the repo. | **you** |
| **Fri 2 Oct 2026** | ***Preferred*** deadline to submit AP exam orders. **Missing it costs nothing.** | school |
| **Fri 13 Nov 2026, 11:59 p.m. ET** | **FINAL** deadline to submit exam orders — **and the last day an exam can be canceled for free.** | school |
| **Fri 22 Jan 2027** | Deadline for the school's SSD coordinator to submit accommodations requests. Only if ever needed. | school |
| **Fri 12 Mar 2027, 11:59 p.m. ET** | Spring course orders and **fall order changes**. Last day the $40 late-order and $40 unused-exam fees apply at all. | school |
| **Fri 30 Apr 2027, 11:59 p.m. ET** | School **finalizes student fee reduction status**. After this the $37 rate can't be applied for this cycle. | school |
| **Tue 11 May 2027**, Session 1 (8 a.m. local) · **Wed 12 May 2027**, Session 2 (12 p.m. local) | **AP Precalculus**, then **AP CSA** about 30 hours later. | Lucas |
| **Tue 1 Jun 2027** | "Schools are billed twice the fee for each exam." School-side, and the reason coordinators chase payment in May. | school |
| **Tue 15 Jun 2027** | Postmark deadline for exam payments; the **$225 late fee** attaches after it. | school |
| **Sun 20 Jun 2027** | **Lucas finalizes his free score-send recipient.** See the callout below — the ordering is the point. | **Lucas** |
| **July 2027** — month only; the day is not published (2026's was Mon 6 July) | **AP scores released.** If they haven't arrived by **15 Aug 2027**, contact **AP Services for Students**. | Lucas |

> ⚠️ **Putting both exams on the order early creates a $40 exposure. Take it anyway.** This repo pushes hard, and correctly, to get both exams onto the school's order well before Nov 13 — but it has never said what that costs if plans change. Here it is: **13 Nov 2026 is also the last day an exam can be canceled for free.** Cancel after that (through 12 Mar 2027) and the **$40 unused-exam fee** applies, with the $99 base fee coming off the invoice. So the real arithmetic on "confirm both are on the order in October" is **worst case $40 if he later drops one, against a lost seat if the order is missed.** Order both.

> 📤 **The free score send is chosen BEFORE he sees the score — that is the whole point of 20 June.** Scores release in **July 2027**; the free score report recipient has to be named or changed by **Sun 20 Jun 2027**. Nobody gets to see a 3 and then decide where it goes. Pick the recipient deliberately in June, or the free send is simply wasted.

---

## 📥 For the parent — THE DOWNLOAD LIST (both subjects, in priority order)


**Everything here is free, official, and public — no login, no join code.** All PDFs live under one base URL: **`https://apcentral.collegeboard.org/media/pdf/`** — paste the base plus the filename into a browser. Save them into one folder per subject per year; that folder *is* the free-response practice supply for the next two years.

**Verified 12 August 2026:** every filename printed below was resolved to a live document on that date, **except where a row says otherwise in words** — those rows name the artifact but not a confirmed filename, so click through from AP Central instead of constructing a URL. Two cautions that will otherwise cost you time:
- **Do not "fix" a filename that looks inconsistent.** College Board does not use one naming pattern across years. `ap24-precalculus-student-samples-frq-1.pdf` (Precalc 2024) and `ap24-frq-comp-sci-a.pdf` (CSA 2024) look wrong next to their 2025 siblings and are nevertheless correct. The 2025-shaped guess for Precalc 2024, `ap24-apc-precalculus-q1.pdf`, returns **404**.
- **A 404 means the name is wrong, not that the document is gone.** Fall back to AP Central → the subject → *Exam Questions* and click through.

### ⏳ Priority 1 — DO THIS FIRST: the 2024 material, which expires

AP Central keeps only the **3 most recent years** of free-response material. **When the 2027 materials post, 2024 drops off.** These files cannot be re-downloaded later, and they are the calibration half of the whole free-response plan.

| # | File(s) | Subject | Why it's first |
|---|---|---|---|
| 1 | `ap24-precalculus-student-samples-frq-1.pdf` · `-frq-2.pdf` · `-frq-3.pdf` · `-frq-4.pdf` | **Precalc** | Each file bundles the **scoring guidelines + model solution + three scored student samples + reader commentary** for one question. This is the material that lets him grade himself against real official awards. **The repo previously pointed at a dead link for these** — doubling the calibration years from one to two is the single biggest gain in this list. |
| 2 | `ap24-sg-precalculus.pdf` · `ap24-precalculus-scoring-statistics.pdf` · `ap24-cr-report-precalculus.pdf` | **Precalc** | Rubric, per-question means, and the Chief Reader's account of what students actually got wrong. |
| 3 | `ap24-frq-comp-sci-a.pdf` and `ap23-frq-comp-sci-a.pdf` | **CSA** | The 2024 and 2023 question papers. ⚠️ Note the **shortened `comp-sci-a` stem** — these two files do not use `computer-science-a`. |
| 4 | `ap24-apc-computer-science-a-q1.pdf` … `-q4.pdf` and `ap23-apc-computer-science-a-q1.pdf` … `-q4.pdf` | **CSA** | Scored student responses with official awards. **Use Q1, Q3, Q4 only** — pre-redesign Q2 tests inheritance, which is off his exam. |
| 5 | Each of 2024 and 2023: scoring guidelines, Chief Reader Report, scoring statistics | **CSA** | Click through from AP Central → AP Computer Science A → *Exam Questions* rather than constructing these URLs — the exact stems for these three were not confirmed. |

### 🎯 Priority 2 — the newest official anchors

| # | File | Subject | Why |
|---|---|---|---|
| 6 | **`ap26-frq-precalculus.pdf`** | **Precalc** | **The newest official Precalculus artifact, and the repo had nothing from 2026 at all until now.** The 2026 free-response questions: an increasing-function graph problem, car depreciation from 2019, a rotating waterwheel, and a pure-algebra question. Content-aligned for May 2027 — only counts and timing differ. Run as a timed mock. |
| 7 | `ap26-frq-computer-science-a.pdf` | **CSA** | The 2026 released FRQs (Account, Bottle, Attendance, GameBoard) — the only fully public redesigned-exam artifact, and the CSA plan's official mock. |
| 8 | `ap25-sg-precalculus.pdf` · `ap25-apc-precalculus-q1.pdf` … `-q4.pdf` · `ap25-cr-report-precalculus.pdf` | **Precalc** | The 2025 package: rubric + four scored samples + Chief Reader Report. |
| 9 | `ap25-sg-computer-science-a.pdf` · `ap25-apc-computer-science-a-q1.pdf` … `-q4.pdf` · `ap25-cr-report-computer-science-a.pdf` · `ap25-computer-science-a-scoring-statistics.pdf` | **CSA** | The 2025 package — the closest official rubric to the redesigned exam until the 2026 guidelines post. |

*Note: 2026 **scoring** material does not exist yet for either subject (`ap26-sg-*`, `ap26-cr-report-*`, `ap26-apc-*`, `ap26-*-scoring-statistics` all returned 404 on 12 August 2026 — both subjects list 2026 as questions only). That is normal timing, not a problem, and nothing in the plan waits on it.*

### 📖 Priority 3 — course documents and context

| # | File | Subject | Why |
|---|---|---|---|
| 10 | **Course and Exam Description** — AP Central → the subject → *Course and Exam Description* | **both** | ⚠️ **Check the cover before trusting it.** The Precalculus CED was **refreshed 15 July 2026**; the current cover reads **"Effective Fall 2026"** and prints the new 42-question exam table. **An older download — including the October 2025 printing — shows the OLD format.** Replace any local copy dated before 15 July 2026. |
| 11 | `ap-computer-science-a-course-and-exam-description-clarification.pdf` | **CSA** | The CSA CED errata sheet ("Implemented as of August 2025"). Its value is reassurance: **no CSA content moved.** It also explains why the "Available Resources" links inside the CED PDF are broken — College Board says so outright, so don't chase them. |
| 12 | `ap25-precalculus-score-distributions.pdf` and `ap25-computer-science-a-score-distributions.pdf` | **both** | The official **1–5 score distribution** per subject per year — the real answer to "what does this level of performance convert to?" Baseline copies now; watch for the 2026 and 2027 editions, since the **2026 CSA** one is the first curve measured on the redesigned exam. |

*The free-response booklet used to be row 13 here. It has been moved to Priority 4 and turned into a dated task, because **there is nothing to download** — see below.*

### ✅ Priority 4 — the two items that are NOT downloads

**1. The Bluebook test preview — do it in the first week of school.** Have Lucas sign in at [bluebook.collegeboard.org/students/practice](https://bluebook.collegeboard.org/students/practice) and run the AP test preview. Verified 12 August 2026: this needs **only his own College Board account** — no join code, no teacher, no confirmation that the school offers the course. It is the **only official practice channel reachable without an adult acting first**, which is why it belongs on a parent's list at all: it is the thing that cannot be blocked. It is a short unscored tour of the real testing app (**not** a full-length mock), and it is how he avoids meeting the exam software for the first time on exam day.

**2. 📅 The paper free-response booklet — a DATED TASK for EARLY 2027. There is nothing to download today.** He handwrites his Precalc FRQ answers into a paper booklet, so rehearsing that layout matters — but **no sample booklet is downloadable now** (verified 12 August 2026). College Board says **"Full-length sample booklets will be available in early 2027 for reference ahead of the AP Exam administration,"** that the page **"will be updated in early 2027,"** and that the real booklets **"arrive with the school's April exam shipment."** This row used to print a filename and tell you to *"print a few"* — **an instruction that cannot be followed today**, and it contradicted its own cited source.
- **Diary it for early 2027:** re-check College Board's *hybrid digital AP exams* page, fetch the full-length sample booklet the moment it posts, and print several copies.
- **This is recoverable, which is the point of diarising it:** the mock window (**20 Mar → 6 May 2027**) opens *after* the booklets appear, so at least the final three mocks — **Sat 10 Apr, Sat 24 Apr, Thu 6 May 2027** — can still be written in the real layout. Until then approximate it: blank paper, one question per page, no restarting. Detail and the exact quotes: **`reference/practice-resources-and-exam-day.md`** → *Exam-day mechanics*.

**The one thing on this page a download cannot replace:** send the **AP Coordinator** the three questions at the top of this file in the first week of school — including whether both exams are on the school's order — and ask each teacher for the **AP Classroom join code**, which is the only route to the official full-length practice exams.

---

| Path | What it is |
|---|---|
| **`study-plan.md`** | **The calendar.** Every date from now to Tue 11 May 2027: phased plan, mock schedule, the bad-mock recovery branch, the final fortnight worked out around the CSA exam the next afternoon, and the hard deadlines. Each date labelled *derived* or *judgement*. |
| **`coverage-map.md`** | The 4 units, exam format/weights, what's tested, and the express crunch order. The backbone. |
| **`study-packs/`** | One condensed pack per unit (Polynomial/Rational, Exponential/Log, Trig/Polar, Parameters/Vectors/Matrices): must-know concepts + worked examples + graduated practice *with solutions* + exam traps. |
| **`reference/`** | `formula-and-identity-sheet.md` (must-memorize), `graphing-calculator-skills.md`, `exam-strategy-and-scoring.md`, `practice-resources-and-exam-day.md` (official practice PDFs and exam-day mechanics — for fees and deadlines use the **MONEY AND DEADLINES** table above, which is the single source). |
| **`tutor-prompt.md`** | The AI tutor's instructions (paste into a ChatGPT Custom GPT or Claude Project). |
| **`mastery-tracker.md`** | Persistent progress memory. |
| **`how-to-use.md`** / **`chatgpt-setup.md`** / **`diagnostic.md`** | Day-to-day instructions, setup steps, and the **Phase 0 placement check (sit it by Sat 15 Aug 2026)**. |

## How to run it
1. **Read `study-plan.md` once** — it is the dated calendar, and two of its deadlines (the AP Classroom join code in Sept 2026, registration by Nov 13 2026) cannot be fixed by studying harder.
2. Set up the tutor: follow **`chatgpt-setup.md`** (paste `tutor-prompt.md` as instructions; upload `coverage-map.md`, `mastery-tracker.md`, all of `study-packs/` + `reference/`).
3. Type **"let's start"** → short diagnostic → then **"let's continue"** each day (~30–40 min).
4. Paste the end-of-session `TRACKER UPDATE` into `mastery-tracker.md`.

## Strategy in one breath
**Nine months, not a few weeks** — the exam is **Tue 11 May 2027**, with AP CSA about 30 hours later on Wed 12 May. **Memorize the formula/identity sheet first**, then work **Units 1 → 2 → 3 in order** (the exam-tested ones, ~equal weight), practicing **both** calculator and no-calculator style and the **4 FRQ types**; do Unit 4 last (class-only). Mocks run **20 Mar → 6 May 2027**, and the scored window has to open by **Mon 26 Apr 2027** at the latest. The tutor makes him *do* the math and **coaches — it doesn't hand him answers.**

## How it was built
Grounded in the official College Board **Precalculus CED plus the "CED Clarification and Guidance — Effective Fall 2026" PDF** + AP Central exam page (units, weights, format verified directly), then built exam-driven from a deep-research pass on the **2024 & 2025 exams** (released FRQs, Chief Reader feedback, scoring, per-unit emphasis), with the **2026 released FRQs** since confirmed as a third year of the same four task types. Exam tests **Units 1–3**; Unit 4 is class-only.

> ⚠️ **Which CED edition (verified 12 August 2026):** this line used to cite the **"CED (October 2025 version)."** That citation is now **stale** — College Board **refreshed the Precalculus CED on 15 July 2026** (last-modified header; ~9.49 MB), and the current cover reads **"AP Precalculus COURSE AND EXAM DESCRIPTION — Effective Fall 2026."** This matters more than a version number normally would: per `reference/2027-exam-changes.md`, the **October 2025 printing still showed the OLD 40-question / 80-40-30-30 exam table**, while the Effective-Fall-2026 edition prints the **new 42-question / 65-40-35-35** figures Lucas will actually sit. **If there is a local copy of the CED downloaded before 15 July 2026, it is stale — replace it, and check the cover says *Effective Fall 2026* before trusting any exam table inside it.**
