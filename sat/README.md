# Lucas's Digital SAT Project — Start Here

An **express, question-driven** Digital SAT tutor. **Goal: 1500+ on the Saturday 6 March 2027 sitting** (register by **Friday 19 February 2027**) — cover *every* question type densely, spend reps only where his answers reveal weakness, and kill careless mistakes with an error log. Same architecture as `../ap_csa/`, `../10th_english/`, `../ap_precalc/`, tuned for the SAT.

---

## 📅 Test dates & registration deadlines — READ THIS FIRST

*All dates below verified on **12 August 2026** against College Board's own dates-and-deadlines page (satsuite.collegeboard.org/sat/dates-deadlines). Every test date is a Saturday and every registration deadline is the Friday 15 days before it.*

**The deadline is the thing that bites, not the test date.** A sitting you forgot to register for is not a sitting.

| Test date | Register by | Verdict |
|---|---|---|
| Sat 22 Aug 2026 | ~~Fri 7 Aug 2026~~ | ❌ **Already closed** — the deadline passed before this plan was written. |
| Sat 12 Sep 2026 | **Fri 28 Aug 2026** | ⏰ Closes in ~2 weeks. Prep has barely started — not a 1500+ attempt. |
| Sat 3 Oct 2026 | Fri 18 Sep 2026 | Too early. Optional paid dry run at best. |
| Sat 7 Nov 2026 | Fri 23 Oct 2026 | Too early. |
| Sat 5 Dec 2026 | Fri 20 Nov 2026 | Possible mid-prep checkpoint, but Bluebook is free — use that instead. |
| **Sat 6 Mar 2027** | **Fri 19 Feb 2027** | ⭐ **THE TARGET.** ~7 months of prep from now, and **66 days clear** of AP season. |
| Sat 1 May 2027 | Fri 16 Apr 2027 | ⚠️ **AP collision — do not sit this.** See below. |
| Sat 5 Jun 2027 | Fri 21 May 2027 | ⚠️ Usable fallback, but the deadline is a trap. See below. |

### The two collisions nobody notices until it's too late

1. **Sat 1 May 2027 is 10 days before AP Precalculus (Tue 11 May 2027) and 11 days before AP CSA (Wed 12 May 2027).** That Saturday is the *last free revision weekend* before two AP exams — spending it on a 2h14m SAT costs him both AP scores and gets a worse SAT score than March would have. **Skip it.**
2. **Sat 5 Jun 2027 closes registration on Fri 21 May 2027 — only 9 days after the AP CSA exam.** The test itself is fine; the *decision and payment* land in the flattened week right after two AP exams, exactly when nobody is thinking about the SAT. If June is the fallback, **put the 21 May deadline in a calendar now**, not in May.

### The plan in one line

**Register for Sat 6 March 2027 by Fri 19 February 2027. Hold an August or October 2027 sitting as the retake slot.** College Board had not published the 2027–28 dates as of 12 August 2026 — re-check the dates page in spring 2027 for the exact autumn days.

> **Borrowing a testing device from College Board?** The request must be submitted **at least 30 days before test day** (verified 12 August 2026). For 6 March 2027 that means **by 4 February 2027** — *two weeks before* the registration deadline. Don't discover this in February.

---

## What's here
| Path | What it is |
|---|---|
| **`coverage-map.md`** | The full SAT blueprint (sections, domains, adaptive scoring, where 1500+ is won) + the crunch order. |
| **`study-packs/`** | RW: `rw-grammar` · `rw-reading` · `rw-expression`. Math: `math-algebra` · `math-advanced` · `math-problem-solving-data` · `math-geometry-trig`. Each = question types + method + worked examples + practice with answers. |
| **`reference/`** | `desmos-calculator-skills` · `test-strategy-and-pacing` · `grammar-cheatsheet` · **`error-log`** (the #1 lever to 1500+) · `scoring-and-adaptive` · `vocab-in-context`. |
| **`tutor-prompt.md`** | The AI tutor's instructions (paste into a ChatGPT Custom GPT or Claude Project). |
| **`mastery-tracker.md`** | Persistent progress + error-pattern memory. |
| **`how-to-use.md`** / **`chatgpt-setup.md`** / **`diagnostic.md`** | Day-to-day instructions, setup steps, Day-1 placement. |

## How to run it
1. Set up the tutor: follow **`chatgpt-setup.md`** (paste `tutor-prompt.md` as instructions; upload `coverage-map`, `mastery-tracker`, all of `study-packs/` + `reference/`).
2. Type **"let's start"** → diagnostic → then **"let's continue"** each session (~30–40 min).
3. Paste the end-of-session `TRACKER UPDATE` into `mastery-tracker.md`. Pair with full **Bluebook** practice tests every few weeks.

## Strategy in one breath
The SAT is a finite set of repeating question types + not making mistakes. So: **drill question types to automatic**, learn the rule/trick on each miss, **keep a relentless error log**, be accurate early (it's adaptive), and confirm progress on full Bluebook tests. Grammar and Desmos are the fastest points; the error log is what breaks 1500.

## How it was built
Spec verified directly against **College Board (satsuite.collegeboard.org)** — RW 54 Q/64 min, Math 44 Q/70 min, adaptive, 98 Q / ~2h14m, scored 400–1600. Content + strategy built from a multi-agent research phase plus **three dedicated deep-research passes** (content blueprint · scoring/adaptive/strategy · best-prep aggregation & gap-hunt), all on Opus.
