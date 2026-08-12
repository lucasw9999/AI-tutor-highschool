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

**How to get full access — two steps, in this order. Step 1 dominates step 2; do not skip it.**

### Step 1 — ASK THE SCHOOL FIRST. It is free, and it beats every paid option.

**If Foothill HS teaches AP Computer Science A, the entire problem collapses to the $99 base exam fee and one join code from that teacher.** No tuition, no second school, no shopping. That outcome is so much better than every paid route below that **no money should change hands until the AP Coordinator has answered the three questions in "Exam registration" below** — and the first of those questions is exactly this one. **Whether Foothill offers AP CSA is still unconfirmed by anybody.**

Ask for **two different things**, because they are not the same thing and only one of them unlocks the item bank:

1. **"Does Foothill teach AP Computer Science A in 2026-27, and can Lucas enrol in that class section?"** → enrolment in an audit-authorized teacher's **class section** is what produces the join code that opens Progress Checks, the Question Bank and the **full Practice Exam**. This is the whole answer if it comes back yes.
2. **"If Foothill does not teach it, will it still let him sit the exam as an exam-only student?"** → this secures a **seat on exam day**, which he needs regardless. It does **not** produce the item bank. See "Exam-only registration gets him a seat, not the official mock" below — that distinction is the most consequential mechanism on this page.

Do this **early** either way — AP Classroom access is tied to one specific teacher's course section, so it cannot be arranged retroactively in April.

### Step 2 — only if step 1 comes back no: a paid online provider that issues a join code

**Verified 12 August 2026.** These are the out-of-state, full-year AP CSA providers whose **own published pages** promise what this repo actually needs: an AP Classroom join code from their teacher. **Every price below is the provider's own quoted figure as of 12 August 2026 — quoted, not verified by us, and not a total cost of attendance.**

| Provider | Tuition — **the provider's own quoted figure, 12 Aug 2026** | Enrolment deadline | Does its own page promise AP Classroom? | Notes |
|---|---|---|---|---|
| ⭐ **VHS Learning** — **the recommended paid route** | **"Full-year AP course: $980 / per 33 week course"** plus a **"$80"** course fee → **≈ $1,060** | Fall term begins **9 Sep 2026**; 🔴 **add period closes 18 Sep 2026, 12:00 PM ET** — about five weeks out | ✅ **Explicit.** Its AP CSA page: *"Students will be expected to enroll in My AP Classroom through their VHS Learning AP course … include AP Daily Videos and unit-based Personal Progress Checks"* | The **only** provider whose own AP CSA page names My AP Classroom **and** spells out the exam step: *"Students register for AP exams through their local school or testing site as 'Exam Only' students."* Full-year against a full exam. |
| **PA Homeschoolers** | **"Tuition: $900 2026-2027"** | Rolling — but **"some will fill up as soon as May or June,"** and some 2026-27 sections **already show "This class is FULL"** | ✅ Its handbook: *"Registration step #1: Join your online class on AP Classroom."* … *"the class 'join code' … will be provided by your teacher."* | Explicit audit claim: *"All of our AP courses are approved by the College Board through the rigorous AP Audit process."* ⚠️ Its handbook also prints **stale College Board deadlines** — see the trap below. |
| **FlexPoint** (the paid arm of FLVS) | **"Standard Courses: $475"** per course per semester → **≈ $950/yr** | Not quoted in this pass — ask | ✅ Explicit: *"Receive your access code from your FlexPoint Virtual School teacher to join their class"*, and it tells you to *"ask for an 'exam only join code'"* | It does **not** place the exam order: *"FlexPoint … does not register students for their AP Exams."* A hosting school is still required. |
| **UC Scout** (run by the University of California) | On Demand **"$399 per enrollment"** per semester → **≈ $798** | 🔴 **Fall enrolment closes 4 Nov 2026** | ❓ **SILENT** — nothing on its pages addresses AP Classroom. Worth exactly one phone call before paying. | ⚠️ **Its "$29" Basic tier is a trap:** *"the Basic plan does not include an instructor."* **No instructor → no join code → no item bank.** Only an instructor-led enrolment could possibly help. |

> ❓ **Ask every provider this one question before any money moves — it is the only check available.**
> ***"Are you AP Course Audit authorized for AP Computer Science A for 2026-27, and will my child receive an AP Classroom join code from your teacher?"***
> **No provider's authorization status could be machine-verified in this pass** — checking the Course Ledger for provider authorization needs a College Board *professional* login, which nobody here has. So the claims in the table above are each provider's **own** published words, and that question is how you convert them into a commitment. Get the answer **in writing** before paying, and treat "we teach the AP curriculum" as a non-answer: the words that matter are **audit authorized** and **join code**.

> ⚠️ **A provider that contradicts College Board on a deadline — treat everything else it says with the same care.** PA Homeschoolers' handbook cites **"November 15th"** and **"March 15th"** as the AP deadlines. **Both are stale.** College Board's real 2026-27 dates are **13 Nov 2026** and **12 Mar 2027** (see "Exam registration" below). **Use College Board's dates, always.** A provider's own calendar is not authority over the exam order.

### ❌ Providers to NOT pursue — all verified 12 August 2026

| Provider / route | Why not | Status |
|---|---|---|
| **Apex Learning Virtual School** — *this file used to name it* | Its AP CSA is **half a course**: *"AP Computer Science - Course A," "Credits .5," "Course Length Single Semester"* — a single semester against a full exam. Its page is also **silent on AP Classroom.** | ❌ **Removed** — it was named here on no evidence and was never checked |
| **Virtual Virginia** — *this file used to name it* | Enrolment runs through *"The enrolling school/division counselor of record"*, and its homeschool track requires **Virginia residency**, which this family does not have. Also **silent on AP Classroom.** Its space-available window **closed 7 August 2026.** | ❌ **Removed** — same: named on no evidence, and out of reach anyway |
| **Johns Hopkins CTY** | Offers **no AP courses at all.** This is a widespread misconception worth recording so it isn't rediscovered. | ❌ Not applicable |
| **Stanford OHS** | *"replaced all of our AP courses with custom courses"*, and its 2026-27 application is **closed**. | ❌ Not applicable |
| **BYU Independent Study** · **Texas Tech K-12** | Both have AP catalogues with **no computer science** in them. | ❌ Not applicable |
| **State virtual schools** — Georgia Virtual, NC Virtual, Michigan Virtual | They will take out-of-state money, but are **all silent on AP Classroom** and mostly insert a local-school gatekeeper. Georgia Virtual disclaims exams outright: *"As an online provider, GaVS cannot administer AP exams."* | ❌ Don't pay without an AP Classroom answer in writing |
| **UC Scout "Basic" ($29) tier** | *"the Basic plan does not include an instructor."* No teacher means no join code means no item bank — a cheap tier that buys none of the thing we are buying. | ❌ Trap — instructor-led enrolment only |

**Why this section was rewritten (recorded so the mistake isn't repeated):** this file previously answered the single most consequential open risk in the project — "how does he ever get an official full-length mock?" — by naming **two providers that had never been checked**, one of which sells a **half-course** and the other of which requires **Virginia residency**. Both are silent on AP Classroom. **A provider that does not deliver a join code does not solve the problem it was named to solve.** Everything above is quoted from the providers' own pages, and where nothing could be confirmed the table says **SILENT** rather than assuming.

---

## Exam registration — time-critical deadline

Sitting the AP exam requires being registered through an AP-administering school. You do **not** self-register through College Board.

> 🔴 **Week one of school (~late Aug / early Sept 2026): email the AP Coordinator these three questions, in writing.** This is the earliest deadline in the project and everything else in this section depends on the answers.
> 1. **Does Foothill administer the AP Computer Science A exam in May 2027?**
> 2. **Will Lucas be on the school's exam order for BOTH AP Computer Science A and AP Precalculus?**
> 3. **What is the school's own internal ordering deadline?**
>
> **If (1) is no, the search for a hosting school starts in September, not November** — the Nov 13 deadline belongs to a coordinator at a school that has *already agreed* to host, and finding that person takes weeks.
>
> 💵 **All fees for both exams — base, late, cancellation, fee reduction, payment and score-send deadlines — are in one table:** [`../../../ap_precalc/README.md`](../../../ap_precalc/README.md) → **MONEY AND DEADLINES**. This file prints deadlines, not dollar figures, so the two can't drift apart again.

**If you attend a school that administers the AP CSA exam:** register through your school's **AP Coordinator** in the fall — the school places your exam order. Because a **small or private school does not always administer every AP exam**, confirm two things early:
1. That your school is set up to give the **AP CSA** exam this cycle (ask the AP Coordinator directly — **don't assume, and note that for Lucas this is still unconfirmed**).
2. That your exam order is placed by the **~mid-November** deadline.

**If your school does NOT administer AP CSA:** use the **AP Course Ledger** at **`https://apcourseaudit.inflexion.org/ledger/`** (verified 12 August 2026 — searchable by school, subject, city, state and country) → search AP Computer Science A → find a nearby authorized school that accepts outside test-takers → contact its AP Coordinator. Same ~mid-November deadline.

⚠️ **The ledger cannot answer the Foothill question in time, so don't wait on it.** College Board **refreshes the ledger each November** — essentially at the Nov 13 order deadline — so a lookup in **August or September 2026 returns 2025-26 offerings**, not the 2026-27 year Lucas will sit. Use it to shortlist *other* schools that have offered AP CSA before; but the only instrument that answers "does Foothill administer AP CSA in May 2027" **before** Nov 13 is the **direct question to the AP Coordinator** above.

> **The real May 2027 deadline structure** (College Board AP school-year timeline, verified 12 August 2026):
> - **October 2, 2026** — *preferred* deadline to submit AP exam orders.
> - **November 13, 2026, 11:59 PM ET** — **final** deadline. Ordering any time up to here carries **no extra charge**. The **$40 per exam late order fee** (on top of the base fee) applies only to exams ordered **between November 14, 2026 and March 12, 2027, 11:59 p.m. ET**.
> - **January 22, 2027** — deadline for the school's SSD coordinator to submit accommodations requests (only if accommodations are ever needed).
> - **March 12, 2027, 11:59 PM ET** — deadline to submit spring course orders and *fall order changes*. Last date the $40 late-order fee (and the $40 unused-exam fee) can apply at all.
> - **June 20, 2027** — **Lucas finalizes his free score-send recipient.** Scores release in **July 2027**, so the free send is designated **before he sees the score** — that ordering is the point of the date. *(Corroborated in the AP Coordinator's Manual Part 1: "Remind students that June 20 is the deadline to indicate or change their free score report recipient.")* If scores haven't arrived by **August 15, 2027**, contact **AP Services for Students**.
>
> **So missing October 2 costs nothing — the entire Oct 2 → Nov 13 window is free.** (Two earlier versions of this line were wrong in opposite directions: the first said there was no late path at all; the second priced the free window at $40 per exam. Both were wrong. The late fee begins November 14.) The one thing to do: **before Oct 2, 2026, confirm with your school's AP Coordinator that BOTH exams — AP Computer Science A *and* AP Precalculus — are on the school's order.** Schools set their own earlier local deadlines, so ask in the first week of school. See `../README.md` for the exam-only-section path if the school does not administer AP CSA.
>
> ⚠️ **And know the small price of doing that early: November 13 is also the last day an exam can be canceled for free.** Cancel after it (through Mar 12, 2027) and a **$40 unused-exam fee** applies, with the base exam fee coming off the invoice. So "get both on the order in October" risks **$40 if he later drops one**, against a lost seat if the order is missed. Order both — but say the $40 out loud rather than discovering it. Figures: [`../../../ap_precalc/README.md`](../../../ap_precalc/README.md) → **MONEY AND DEADLINES**.
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
7. **Ask Foothill whether it teaches AP CSA — free, and it beats every paid route.** Only if the answer is no, enrol with a provider whose own page promises an AP Classroom join code (VHS Learning first; add period closes **18 Sep 2026**). See "How to get full access."

**With AP Classroom access:**
Same stack, plus use the AP Classroom Question Bank and Progress Checks as your primary MCQ source — those are the closest to real exam items.

**Paid add-ons (when you want more volume):** Albert.io for MCQ drilling; Fiveable for unit review.
