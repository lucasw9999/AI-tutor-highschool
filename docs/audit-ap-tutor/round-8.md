# Round 8 — coverage, taken literally

**Instruction** (the user's third statement of it):

> "For all this auditing, you should not just focus on how accurate we are at the moment,
> but also do a larger-scale search to make sure we include all the information we need...
> correctness, but also how much coverage we do and what external information should I add."

Round 7 read this as *documentation* coverage. Round 8 read the words at face value — **"how
much coverage we do"** is the item bank — and that is where the real hole was.

69 commits. Tests 612 → **698, all passing**. Build gates **62 → 0: `Build OK` for the first
time in the project's life.**

## The headline

**AP Precalculus readiness went from structurally unmeasurable to measurable.**

Before: every one of 48 Precalc items compiled as `constructed_model_graded`, which
`grade.js` excludes from every readiness floor — so 500 correct answers produced 0%. Every
item also landed in a `<unit>.0` placeholder bucket, so 33 exam-tested topics held no items
and the coverage gate pinned readiness to 0. No sitting could be assembled at any level of
effort.

After, all verified end-to-end through the real seed → `node:sqlite` → real router → real
`grade.js`:
- **33 of 33 exam-tested topics covered**, and every one has at least one KEYED item, so a
  topic percentage can actually be computed. (Coverage alone was not enough — 9 topics were
  "covered" by unkeyed items, producing evidence-free numbers. Closed.)
- **38 MCQ + 4 FRQ**, so both halves of a 42-question paper are supplied.
- **A mock assembles and scores**: `counted: true`, `composite_pct: 71.4` — 30 correct
  against the section's real 42, not against the 38 the bank can supply. Four unreached
  questions count as blank *and* wrong, "exactly as the real answer sheet would read them."
- The paper came back **MCQ only**. That matters — see the defect below.

## The defect this round nearly shipped

`api.js` had a comment saying short-answer items were "left servable on purpose … every
Precalc item is `constructed_model_graded`". True when written, and load-bearing: with no
item of the section's own kind, nothing could be scored, so serving drills into a sitting
cost nothing.

**The first declared MCQ killed that premise.** Measured, not theorised: a 42-answer
"Section I, 42 multiple-choice questions" sitting came back `counted: true`,
`composite_pct: 100`, having asked **22** of the section's 42 MCQ and padded the rest with
keyed short-answer drills. `covered` compared any-kind attempts against the 90% floor;
`right`/`scored` counted every server-graded answer whatever it was a question of.

That is the founding grievance — a 100% that the evidence does not support — through a new
door. Caught and fixed *before* the content made it reachable, by narrowing the allowance to
the fact that justified it rather than deleting it.

## Also fixed: four items that punished correct answers

The build flagged CSA items where an option's TEXT was a bare letter colliding with a
different option's LABEL — option C's text was "B", so a student typing `B` could not be
disambiguated. Measured: **28 response forms a student actually types were unreadable.**
Today the grader declines rather than mis-marks, so it cost him the answer rather than the
mark — but a one-character change would have turned it into a false negative.

The fixer rejected the build's own suggested remedy (reword the option) after testing it,
because it turned a decline into a *confident miss* for the student who answered the
question rather than naming a label. Instead each letter-valued option moved to the label
whose letter it is, making the grader's two readings agree. No option text reworded, no
difficulty changed.

## External currency (the other half of the instruction)

- **AP fees were absent entirely** — a grep for `$99` returned nothing. Base fee $99/exam,
  so **~$198 for both**. And the **$40 late fee was attached to the wrong date in five
  places**: it applies after **13 Nov 2026**, not after 2 Oct — the Oct 2 → Nov 13 window is
  free. The repo contradicted itself, right in one file and wrong in five.
- **13 Nov is also the last free cancellation date**, so getting both exams on the order
  early — which the repo correctly urges — carries a $40 exposure it never mentioned.
- **20 Jun 2027**: the free score-send recipient is chosen **before** July's scores post.
  Published, and absent repo-wide.
- **The AP Course Ledger URL was wrong in both places**, and the ledger cannot answer "does
  Foothill offer AP CSA" in time anyway — it refreshes each November, and it requires a
  College Board *professional* login. The only instrument that works is asking the
  coordinator in week one.
- **An exam-only join code does NOT unlock the item bank or the full Practice Exam** — only
  enrolment in an audit-authorized class section does. The repo's two named self-study
  providers were both wrong: Apex's AP CSA is a **half-course** (0.5 credit, one semester),
  and Virtual Virginia requires **Virginia residency**. Replaced with VHS Learning (~$1,060,
  add period closed 18 Sep 2026), whose own page names My AP Classroom.
- **"Inheritance is not on the exam" was false as written.** `inherit` 3, `subclass` 6,
  `superclass` 5 in the CED; the exclusion is narrower — *designing and implementing* is out,
  the vocabulary is required Unit 1 content, and Unit 1 is 15-25% of the MCQ. The repo's
  "verified: 0 occurrences" claim did not reproduce. A false verification claim is worse than
  an unsourced one.
- **Precalc calculator: "permitted" → REQUIRED** on Section I Part B and Section II Part A.
  "Permitted" invites arriving with neither a handheld nor Desmos fluency.
- **Bluebook: no annotation gets credit, and the clock turning red at 5 minutes is the ONLY
  warning** — "the proctor will not give you any time updates or warnings." The repo told a
  parent to "hold the timer", training a cue that will not exist.
- **Mechanical pencils are prohibited** on the Precalc paper booklet. A 15-year-old's default
  pencil.
- **Khan Academy**: the good course is `/math/ap-precalculus`; `/math/precalculus` is a
  materially different 10-unit course including conics, series and limits — all on this
  repo's own out-of-scope list. Three characters apart.
- **PSAT**: absent repo-wide. October 1-30 2026 window, $18, school-rostered.

## The correction I had to make to myself

I told an auditor Lucas was "entering his junior year." **The user never said that — I
inferred it from the May 2027 exam dates.** The repo is unanimous across four directories
built from real class materials: he is a **sophomore**, finished Algebra 2 in 9th, current
English class is a real sophomore section.

The auditor faithfully reported the repo as defective for saying "10th grader". Had I
dispatched a fixer on that finding, it would have rewritten correct facts across five files
to match my error. It also changed the PSAT framing entirely: October 2026 is a *practice*
sitting for him, not his National Merit qualifier — that is October 2027.

**Lesson for the campaign: a premise I supply in a brief is not evidence. Auditors will
faithfully "find" whatever I assert.**

## Process finding: five agent deaths on one task

Precalc MCQ authoring killed **five** agents on API stream timeouts; four committed nothing
at all. What worked:
- **"Commit every 2 items"** — unit 2 delivered 14 items in 7 commits and survived.
- **An explicit cap** — "write AT MOST 7 items, then stop and report." Both bounded runs
  survived and handed off cleanly.
- Telling the agent that **partial-and-committed is a success**, and death-with-nothing is
  the failure mode.

Unbounded authoring runs on this codebase are not safe. Bound them.

## Still open

- **175 commits unpushed.** `origin/main` still has zero files under `worker/`. User's call.
- **Deployment**: live Worker and D1 still run pre-campaign code. Needs
  `ALTER TABLE attempts ADD COLUMN picked TEXT`, then the regenerated seed, then
  `DELETE FROM topics WHERE subject='ap_precalc' AND id IN ('1.0','2.0','3.0','4.0')` —
  in that order, because `seed.sql` only inserts and cannot retire a row.
  Then re-paste `openapi.json` + `gpt-instructions.md` into the GPT.
- **`calibrated: false` is hard-wired** at all three `computeReadiness` call sites, so the
  free-response half can never be scored and Precalc caps at 93%. Verified as the correct
  *safe* state, not a defect: an agent measured that flipping it changes nothing, because
  nothing ever writes a rubric verdict back. Both locks understate rather than overstate.
- Precalc topic ids are **positional** — inserting a `###` heading silently re-points every
  later item's tag. Load-bearing fragility, documented, not fixed.
- Unit 4 topics 4.2 and 4.4 have no items (class-only, off-exam).
- CSA: 20 FRQ items share the first topic their file declares, so topic-level selection sees
  each question type as one topic.
