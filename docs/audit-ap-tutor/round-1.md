# Round 1 Detail

## Dispatch

**Scope:** Full codebase audit with 11 lenses (correctness, silent failures, logic errors, concurrency, API contracts, test coverage, docs-vs-reality, content integrity, schema validity, build completeness, data persistence).  
**Agents:** ~30 independent project-auditor instances, one per lens per module (lib/, worker/, routes/, tools/, types/, content/).  
**Duration:** Initial sweep found 80+ findings; verifiers independently confirmed 45 fixes across 20 commits.

## Targets and Lenses

### Database Layer (db.js, attempts tracking)

**D1x — attempts() response projection**
- **Finding:** attempts() built a SELECT that omitted a.response, so every mock reported blanks == answered and max_blanks was permanently unmeetable
- **Lens:** correctness, SQL projection
- **Verifier:** Ran test without fix, confirmed regression: blanks count always 0, readiness cap always 0
- **Commit:** 732a112
- **Status:** FIXED

### Grading Engine (lib/grade.js)

**G1-G7 — normalizeChoice, choice-letter detection**
- **Finding:** normalizeChoice reads alphabetic labels as choice IDs; "it throws a NullPointerException" on an MCQ with options [A: "for", B: "a NullPointerException", ...] was scored WRONG on live data
- **Scope:** 7 distinct grading edge cases including response trimming, case handling, letter collision
- **Lens:** correctness, option text parsing
- **Verifier:** Printed all 872 MCQ options with their labels; manually confirmed 31 false negatives
- **Commit:** c44f9b6
- **Status:** FIXED

### Readiness Engine (lib/readiness.js)

**R1 — window anchor rule**
- **Finding:** official-College-Board-mock was checked against ALL logged mocks, not against the 42-day judged window; a window could be 100% bank-sourced at 100% ready if all other evidence fell outside 42 days
- **Lens:** correctness, window semantics
- **Verifier:** Constructed pathological case: 100 board mocks at day 0, 1 weak non-board attempt at day 50
- **Commit:** bdd6d59
- **Status:** FIXED

**R3/R4/R5/R6/H1/R8 — window readiness, freshness, thresholds, messaging**
- **Finding Six distinct defects:**
  - R3: Two independent definitions of readiness_pct (one weighted by exam %, one not)
  - R4: Missing freshness guard on pending path; stale evidence still judged
  - R5: Self-contradicting span message if window ends exactly at a boundary
  - R6: Displayed percentages disagreed with pass/fail marks due to rounding
  - H1: Hidden threshold comparisons not caught by mutation tests (9 unpinned)
  - R8: "Official" was never checked against the _judged_ portion, only existence
- **Lens:** correctness, edge cases, determinism
- **Verifier:** Graphed state space manually; mutation tested all comparisons with 100 variants
- **Commit:** bdd6d59
- **Status:** FIXED

### Session Management (routes/api.js, worker/mock.js)

**E1/T11/A4 — closed gap reopening**
- **Finding:** When a concept gap was cleared (student moved to next topic), the next request would re-open it and re-teach the same lesson indefinitely
- **Lens:** correctness, state transitions
- **Verifier:** Replayed session logs; confirmed state remained in_progress after close
- **Commit:** 42c45eb
- **Status:** FIXED

**A1/E4 — unvalidated mock ID**
- **Finding:** handleNext accepted a mock_id from the model's response with no check that it (a) existed, (b) matched the subject, or (c) was still open
- **Lens:** API contract, validation
- **Verifier:** Crafted mock_id=999999; confirmed no 404
- **Commit:** 42c45eb
- **Status:** FIXED

**A2 — incomplete mock scoring**
- **Finding:** Mock composite had no completeness check; 3 correct answers out of 5 questions scored 100%
- **Lens:** correctness, partial scoring
- **Verifier:** Submitted partial mock; confirmed score = 100
- **Commit:** 42c45eb
- **Status:** FIXED

**A6/XB2/E3 — readiness config cross-contamination**
- **Finding:** handleLog and handleMockSubmit pulled readiness config from the HTTP caller, not the row; subjects could report readiness under the wrong config
- **Lens:** API contract, data consistency
- **Verifier:** Swapped configs mid-request; confirmed state mismatch
- **Commit:** 42c45eb, 51d7cb3
- **Status:** FIXED

**A7/E2 — concurrent log race**
- **Finding:** serve-spent guard was a read-then-write; two concurrent /log calls for the same answer produced two attempt rows
- **Lens:** concurrency, race conditions
- **Verifier:** Replayed concurrent calls; confirmed duplicate attempt_id entries
- **Commit:** 48e5adf
- **Status:** FIXED

**E5/T12/T13/A8** — (related to above, covered by same commits)
- **Commit:** 42c45eb, 48e5adf
- **Status:** FIXED

### Selection Logic (lib/select.js)

**S1-S5 — selection priorities and filtering**
- **Finding Five issues:**
  - S1: Priorities silently skipped if any topic hit a global-keyed fallback (learned-fresh-unknown all true, nothing to choose)
  - S2: False "everything is at or above its floor" claim shown to student when pools were empty
  - S3: Off-exam material preferred over on-exam if off-exam pool was larger
  - S4: Review questions not filtered; students saw duplicates
  - S5: Vacuous determinism test that always passed regardless of seed
- **Lens:** correctness, priority logic, test coverage
- **Verifier:** Printed state graph for all topic combinations; proved fallback logic incomplete
- **Commit:** 6817aae, 15bdf00
- **Status:** FIXED

### Worker Actions (worker/actions.js, types/action-schema.ts)

**X1-X8 — Actions schema contract**
- **Finding:** Router and Worker disagreed on action shape. Schema declared `correct: boolean` while Precalc worker returned `correct: null` on all 218 responses
- **Lens:** API contract, type safety
- **Verifier:** Printed 218 Precalc responses; zero matched schema
- **Commit:** 51d7cb3
- **Status:** FIXED

**X3 — full mock time budget**
- **Finding:** A `full` mock reported 90 minutes (multiple-choice half) instead of 180 minutes (full exam)
- **Lens:** correctness, config
- **Verifier:** Printed mock definitions; confirmed hardcoded value
- **Commit:** 143ac30
- **Status:** FIXED

### Build System (tools/build.js)

**B1-B5 — subject validation**
- **Finding Five issues:**
  - B1: Precalc bypassed all content checks during build
  - B2: Exam-tested topic with zero items did not fail the build
  - B3-B5: Missing completeness gates for other subjects
- **Lens:** build correctness, validation
- **Verifier:** Toggled each check; confirmed each silently passed before
- **Commit:** 76f3a5a
- **Status:** FIXED

### Content Parsing (tools/build.js, lib/grade.js)

**P1 — stripTicks MCQ corruption**
- **Finding:** stripTicks corrupted 92 of 872 MCQ options across 31 items by eating opening or closing backticks that were part of option text
- **Lens:** correctness, string parsing
- **Verifier:** Printed all 872 options before/after stripTicks; confirmed 92 corruptions
- **Commit:** 9a98b27
- **Status:** FIXED

**PC1-PC5 — Precalc parser defects**
- **Finding Five issues:**
  - PC1: Truncation of worked examples
  - PC2-PC5: Duplicate item ID blindness and other parsing gaps
- **Lens:** correctness, parsing
- **Commit:** c5517fa
- **Status:** FIXED

### Test Coverage

**Q1 — evidence-table guard, text search brittleness**
- **Finding:** Evidence-table guard was a text search; stems containing "attempts" would accidentally match test for data-table presence
- **Lens:** test coverage, brittleness
- **Verifier:** Searched all 498 test stems; found 3 false matches
- **Commit:** 516678f
- **Status:** FIXED

### Content Authority (content/precalc.json, content/csa.json)

**CONTENT-1/2/3 — Precalc answer keys and unit weights**
- **Finding Three issues:**
  - CONTENT-1: P9/P12 arithmetic wrong (49.713 should be 49.712)
  - CONTENT-2: False product check in unit weighting
  - CONTENT-3: Two contradicted "biggest unit" superlatives
- **Lens:** data integrity
- **Verifier:** Re-derived all answers; confirmed 49.712 is correct
- **Commit:** 311e616
- **Status:** FIXED

### Documentation vs. Reality (config/, lib/, routes/)

**D2x/D3x/C2/C3/C4/C6/H2 — stale comments and config descriptions**
- **Finding:** Comments and configuration keys described behavior the code did not have (e.g., claiming FRQ was excluded when it still capped readiness)
- **Lens:** docs-vs-reality, staleness
- **Scope:** 7 distinct mismatches across readiness, dashboard, config modules
- **Verifier:** Traced each code path; confirmed comments were outdated
- **Commit:** 732a112, e039786, 73095d3
- **Status:** FIXED

### Build and Artifacts

**Build escape hatch and regenerated artifacts**
- **Finding:** Build would exit 1 on incomplete content; no way to regenerate derived artifacts for development
- **Lens:** developer experience, build process
- **Commit:** d06d0cb, 846d55a
- **Status:** FIXED

**Stale test fixtures and vacuous assertion**
- **Finding:** Test fixtures referenced deleted fields; one assertion would pass regardless of value
- **Lens:** test coverage, staleness
- **Commit:** 8186743
- **Status:** FIXED

## Verifier Conclusions

All 45 Round 1 fixes were independently verified by running reversion tests: for each commit, verifiers checked out the parent, ran the test suite or manual reproduction, and confirmed the regression. All findings survived verification.
