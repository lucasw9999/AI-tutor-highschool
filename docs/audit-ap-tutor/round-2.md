# Round 2 Detail

## Dispatch

**Scope:** Depth audit by Round 1 verifiers. After confirming all 45 Round 1 fixes, verifiers re-opened test artifacts, manually traced state transitions, and re-examined closed-mock guards, window logic, and concurrency paths that Round 1 had only partially addressed.  
**Agents:** ~10 focused investigators (verifiers from Round 1 + new specialists in session state, window semantics, schema consistency).  
**Duration:** Found 8 additional defects; all fixed across 4 commits.

## Targets and Lenses

### Session State Post-Submission (routes/api.js)

**N1 — /log lacks closed-mock guard**
- **Finding:** After a sitting was submitted (moved to closed_at state), the /log endpoint still accepted new answer logs and moved per-unit floors indefinitely
- **Lens:** correctness, state guards, post-submission invariants
- **Verifier:** Submitted a sitting, then logged an answer to it; confirmed floor incremented
- **Scope:** N1 is distinct from A1/E4 (which was about invalid mock_id) — N1 is about valid IDs in invalid states
- **Commit:** 7293721
- **Status:** FIXED

### Attempt Completeness (routes/api.js, lib/readiness.js)

**N2 — blanks and composite disagreement on unreached questions**
- **Finding:** The blanks count (unanswered questions) and the composite (marked incorrect) disagreed on what counted as "reached"; one counted a question as reached if *any* response existed, the other if response was non-blank
- **Lens:** correctness, definitional consistency
- **Verifier:** Submitted sitting with mix of blank and no-value responses; blanks != composite in readiness calculation
- **Commit:** 7293721
- **Status:** FIXED

**N3 — incomplete sitting silently discarded**
- **Finding:** An incomplete-but-real sitting (status still in_progress, not submitted) was silently discarded if a new sitting was opened; no trace in status history or logs
- **Lens:** correctness, data loss prevention
- **Verifier:** Opened sitting A, started it, opened sitting B; sitting A vanished with no record
- **Commit:** 7293721
- **Status:** FIXED

### Readiness Window Freshness (lib/readiness.js)

**N4 — round-1 window rule leaked into evidence staging**
- **Finding:** Round 1's fix to the window anchor rule (R1) only patched the "official" check. A >42-day gap still let stale strong evidence (old board mocks) bypass the 42-day freshness gate while fresh weak evidence was stepped over
- **Lens:** correctness, window semantics, freshness
- **Scope:** Subtle: the anchor rule was fixed, but freshness was applied inconsistently across evidence tiers
- **Verifier:** Constructed scenario with 60-day-old board evidence and 30-day-old weak evidence; confirmed strong evidence judged, weak stepped
- **Commit:** e62d72a
- **Status:** FIXED

### Free-Response Grading (lib/readiness.js)

**N5 — calibrated free-response branch would report 0% for unscored work**
- **Finding:** If a student answered a free-response question but no rubric verdict was written (FRQ calibration unimplemented), the readiness logic would report 0% correct for that question instead of 0% attempted
- **Lens:** correctness, unimplemented feature handling
- **Scope:** Does not mask the root cause (FRQ calibration missing); documents the silent-failure path
- **Commit:** e62d72a
- **Status:** FIXED

### Numeric Precision (lib/readiness.js)

**N6 — two unpinned float comparisons**
- **Finding:** Two readiness threshold comparisons used floating-point equality (a == b) instead of toleranced comparison; edge cases at exact boundaries would misclassify
- **Lens:** correctness, numerical stability
- **Verifier:** Fed boundary values; confirmed both paths triggered
- **Commit:** e62d72a
- **Status:** FIXED

### Build Validation (tools/build.js)

**N7 — no gate rejects MCQ option letter collision**
- **Finding:** A build-time validation gate was added in Round 1 (B1-B5) to catch unreachable topics, but it did not check for MCQ options whose text is a bare letter (e.g., option C whose text is just "C") colliding with another option's label
- **Lens:** build validation, option integrity
- **Scope:** This is a **build-time gate**, not a runtime guard; prevents live data corruption
- **Commit:** ed20283
- **Status:** FIXED

### Documentation and Worked Examples (content/csa.json, types/action-schema.ts)

**N8/N10/N11/N12 — schema, messaging, and worked-example defects**
- **Finding Four issues:**
  - N8: Period/hedge ordering in window-readiness message (should list definite facts before qualifications)
  - N10: Dead unconditional serve-marker that could reinstate the A7/E2 race condition under future changes
  - N11: False schema comment claiming FRQ was excluded
  - N12: 12 CSA worked examples opening with dangling fragment (orphaned Markdown)
- **Lens:** correctness, messaging clarity, documentation
- **Verifier:** Printed all worked examples; confirmed 12 mismatches; traced schema paths
- **Commit:** 45bb65e
- **Status:** FIXED

## Verifier Conclusions

All 8 Round 2 fixes were independently verified by reversion tests and manual state tracing. Findings represent gaps that Round 1 auditors had partially or indirectly addressed, but which only surfaced under manual session replay and boundary testing. No findings conflict with Round 1 fixes; all represent orthogonal layers of the system.

## Coverage Expansion vs. Round 1

- Round 1 found schema contract mismatches (X1-X8); Round 2 confirmed message and comment accuracy within that schema (N8)
- Round 1 fixed the window anchor rule (R1); Round 2 confirmed freshness was applied consistently across all evidence tiers (N4)
- Round 1 fixed the serve-spent race (A7/E2); Round 2 removed a dead unconditional marker that could reintroduce it (N10)
- Round 1 validated content completeness at build time (B1-B5); Round 2 added label-collision detection (N7)
