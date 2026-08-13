# Official Sources Index — AP CSA Question Banks

**Purpose.** A fast-access link index to all official College Board question sources. This covers what is publicly available today; some resources are teacher-gated or not yet posted.

**For the complete sourcing and alignment guide** (which sources teach inheritance/HashMap and must be avoided; AP Classroom access path; exam registration logistics; third-party sources): [`../reference/question-sources-and-access.md`](../reference/question-sources-and-access.md).

---

## 1. CED sample questions (free — pp. 149–180 of the CED PDF)

**What you get:** 20 sample MCQ (one per core skill, covering all units and all 5 practices) + 4 sample FRQs with official answers and scoring criteria:

| FRQ | Type | Official scoring criteria |
|---|---|---|
| MessageBuilder | Q1 Methods & Control Structures (7 pts) | Included in the PDF at the same pages |
| CupcakeMachine | Q2 Class Design (7 pts) | Included |
| ItemInventory | Q3 Data Analysis w/ ArrayList (5 pts) | Included |
| Schedule | Q4 2D Array (6 pts) | Included |

These are the only official **scored** Q2 samples available for the redesigned exam as of mid-2026. Do these first.

**URL:**
<https://apcentral.collegeboard.org/media/pdf/ap-computer-science-a-course-and-exam-description.pdf>

Navigate to **pp. 149–180** for the sample questions section.

---

## 2. 2026 Released FRQ PDF (free)

**What you get:** The 4 official FRQs from the May 2026 sitting — the only fully public exam artifact from the redesigned exam today.

| Q | Name | Type |
|---|---|---|
| Q1 | Account | Methods & Control Structures (7 pts) |
| Q2 | Bottle | Class Design (7 pts) |
| Q3 | Attendance | Data Analysis w/ ArrayList (5 pts) |
| Q4 | GameBoard | 2D Array (6 pts) |

**URL:**
<https://apcentral.collegeboard.org/media/pdf/ap26-frq-computer-science-a.pdf>

> **Scoring Guidelines not yet posted (as of mid-2026).** The 2026 SG PDF will appear at `https://apcentral.collegeboard.org/media/pdf/ap26-sg-computer-science-a.pdf` — watch this URL; expected ~fall 2026. Until then, use the CED sample rubric structures as the best available guide and see `../reference/frq-rubric-and-penalties.md`.

---

## 3. AP Central — past FRQs (free)

**URL:** <https://apcentral.collegeboard.org/courses/ap-computer-science-a/exam>

Navigate to "Exam Questions and Scoring Information" to access FRQs, scoring guidelines, and Chief Reader Reports by year.

### Critical caveat: how to use pre-2026 FRQs

The exam format changed with the redesign (Effective Fall 2025). Apply these filters before using any prior-year FRQ:

| FRQ type | Pre-2026 usability |
|---|---|
| **Q1 Methods & Control** | ✅ Use across years — always methods + conditions + String work |
| **Q3 ArrayList / Data Analysis** | ✅ Use — ArrayList shape is consistent |
| **Q4 2D Array** | ✅ Use — 2D array work is consistent |
| **Q2 Class Design** | ⚠️ Use **only post-redesign (2026+)** Q2. Pre-redesign Q2 was often "design a subclass" — **designing a class hierarchy, which is off the exam**. Old "GridWorld" and subclass FRQs: skip entirely. |

**Old scoring structure:** pre-redesign FRQs were **9/9/9/9 = 36 pts total**. The redesigned format is **7/7/5/6 = 25 pts**. Practice the rubric logic, but do not over-weight the old point values when computing estimates.

> This matches the guidance in `../reference/question-sources-and-access.md` §"How to use past FRQs from AP Central."

---

## 4. AP Classroom (teacher-gated — the authoritative item bank)

**URL:** <https://myap.collegeboard.org>

**What you get with full access:** Progress Checks, Question Bank, AP Daily videos, full secure practice exams.

**Access reality:** AP Classroom is not open to self-study. Logging in without a join code gives only limited AP Daily video content — no Progress Checks, no Question Bank, no full practice exams. A join code from the **AP-Course-Audit-authorized teacher of a class section he is enrolled in** is required.

⚠️ **An exam-only registration is NOT enrolment.** Verbatim from the 2026-27 AP Coordinator's Manual Part 1: *"All students—including those in exam only sections—can access AP videos and some high-level course resources … They also must be enrolled in class sections to access the available AP Classroom resources for every AP class they're taking."* So an exam-only seat gets him the **exam**, not the **Practice Exam**. Full mechanism in `../reference/question-sources-and-access.md` §"Exam-only registration gets him a seat, not the official mock."

**How to get access — in this order:**
1. **Ask Foothill HS first, because it is free and it beats everything else:** if the school **teaches** AP CSA, enrolling in that class section produces the join code, and the whole problem costs nothing beyond the base exam fee he owes anyway. **Still unconfirmed — it is question one to the AP Coordinator.**
2. **Only if that is no:** enrol with an online provider whose own page promises an AP Classroom join code from its teacher. The verified shortlist, the quoted prices, the two enrolment deadlines (VHS Learning **18 Sep 2026**, UC Scout **4 Nov 2026**), and the providers to avoid are all in `../reference/question-sources-and-access.md` §"AP Classroom access reality." **This index deliberately names no provider** — it used to name two that had never been checked (one sells a half-semester course, the other requires Virginia residency), and one list is easier to keep true than two.

**When you have access:** use the AP Classroom Question Bank and Progress Checks as your primary MCQ source — those are the closest available items to the real exam. Use the full secure practice exams for `practice-exams.md` Option A.

---

## 5. Monitor — not yet posted

These URLs are confirmed 404 or blank as of mid-2026. Watch them:

| Item | URL to watch | Expected |
|---|---|---|
| 2026 Scoring Guidelines | `https://apcentral.collegeboard.org/media/pdf/ap26-sg-computer-science-a.pdf` | ~Fall 2026 |
| 2026 Chief Reader Report | `https://apcentral.collegeboard.org/media/pdf/ap26-cr-report-computer-science-a.pdf` | ~Fall 2026 |
| Redesigned score curve / raw→5 cutoff | `https://apstudents.collegeboard.org/about-ap-scores/score-distributions` | Later summer 2026 |

When the Scoring Guidelines post, fold the point splits and penalty notes into `../reference/frq-rubric-and-penalties.md`. When the score curve posts, update the composite cutoff in `practice-exams.md` §4 and re-score any logged mocks.

---

## 6. Quick summary

| Source | Free? | Gated? | Redesign-aligned? | Best use |
|---|---|---|---|---|
| **CED PDF samples (pp. 149–180)** | ✅ Free | Open | ✅ Yes | First mock calibration; official rubric models |
| **2026 Released FRQ PDF** | ✅ Free | Open | ✅ Yes | The only fully public redesigned exam artifact |
| **AP Central past FRQs** | ✅ Free | Open | ⚠️ Partial — see §3 caveat | Q1/Q3/Q4 any year; Q2 post-2026 only |
| **AP Classroom** | ✅ Free | Teacher join code required | ✅ Yes | Primary MCQ/FRQ source when accessible |
