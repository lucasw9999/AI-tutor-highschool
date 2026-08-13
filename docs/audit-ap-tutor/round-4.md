# Round 4 Detail — Audit of Round 2-3 Fix Code

## Dispatch

**Scope:** Focused audit of NEW code written in Rounds 2-3 to fix prior defects. Rounds 2-3 had written +2941 lines into worker/src and tools/build. The campaign hypothesis was that new fix code carries new defects and should be audited independently.

**Auditors:** 7 independent code reviewers, each assigned subsets of the new code paths.

**Duration:** 6 rich findings, 1 some finding. Total of ~33 new defects identified across correctness, data flow, numeric precision, concurrency, schema consistency, content integrity, and documentation.

## Findings and Severity

### Critical Severity (4 findings)

**Q4-A1 — Incorrect expected-vs-scorable conflation**
- **Finding:** The `expected` field (real section size per exam spec) was conflated with what the bank can actually provide. When a section had `expected=4` but the bank held zero items for that section, a sitting scored 4-of-4 (100%) and counted as complete. Across all students, six sittings formed a complete qualifying window on 24 questions, six of which the bank could never supply.
- **Lens:** correctness, schema semantics, coverage calculation
- **Fix:** Split `expected` (exam specification) from new internal `scorable` (what the bank can ask AND mark). Composite now taken only over scorable items.
- **Commit:** 18add4f
- **Status:** FIXED

**Q4-D1 — Same item handed out twice in one sitting**
- **Finding:** The serve endpoint had no exclusion list passed to the selector, so the selector's in-memory cache persisted across /next calls but the serve table was not consulted. Two /next calls inside the same sitting handed out the SAME item. Concurrent execution (200 parallel trials) and sequential paths both triggered. One duplicate purchased through the 90% coverage gate and inflated the composite ~2.4 points.
- **Lens:** correctness, concurrency, state isolation
- **Fix:** Open-serve exclusion passed to the selector on every call (preventing in-memory reuse) AND conditional INSERT to prevent serve-table duplication under race.
- **Commits:** 3b6f937
- **Status:** FIXED

**Q4-G1/G2 — Letter collision strips punctuation inconsistently**
- **Finding:** The LETTER_ONLY matcher stripped punctuation before canonAnswer did. On the four shipped items where option TEXT is a bare letter, one punctuation mark changed the verdict: typing "C" (with curly quotes) was graded WRONG on csa-u2-q7 when right, and "A" was graded RIGHT when wrong on another item.
- **Lens:** correctness, grading consistency, option text normalization
- **Fix:** Applied punctuation stripping symmetrically on both canonAnswer and response before comparison.
- **Commit:** f2e3c08
- **Status:** FIXED

**Q4-G3/G4/G5 — Confidence threshold on lone content words**
- **Finding:** When a response matched only one word from an option's sentence, the grader gave a confident verdict (225 credits / 517 misses on shipped content). The printed label-plus-text form (e.g., "C. 3.2") declined on all 218 items, indicating a different matcher was active. Three matcher-guard conditions survived mutation testing, meaning the guards were inadequate.
- **Lens:** correctness, option matching confidence, grading precedence
- **Fixes:** Applied guarded matcher precedence and pinned with mutation-resistant tests.
- **Commits:** 4d34cca, 9e18d2f, 335df67
- **Status:** FIXED

### High Severity (12 findings)

**Q4-R1 — Freshness mislabeled as most-recent mock**
- **Finding:** The `freshness` field measured the judged window's newest sitting but was documented and displayed as the student's most recent mock. A mock from yesterday at 45% appeared in NO number while the report said "106 days ago."
- **Lens:** documentation-vs-reality, readiness reporting
- **Fix:** Clarified freshness definition and distinguished it from most_recent_mock.
- **Commit:** 9e20d4e
- **Status:** FIXED

**Q4-R2 — One scored rubric row marked entire criterion met**
- **Finding:** In readiness calculations for free-response rubrics, marking one of twelve rubric rows as correct gave 100% readiness for that criterion instead of 1/12.
- **Lens:** correctness, rubric aggregation
- **Fix:** Changed aggregation from OR to proper fraction of scored rubric rows.
- **Commit:** 9e20d4e
- **Status:** FIXED

**Q4-R3/R4/R6/R7 — Blocker mismatch and float precision**
- **Finding Four issues:**
  - R3: Stated blocker described a different run than the one actually judged
  - R4: Float noise printed a percentage a full point BELOW the measured value (29/50 printed 57%)
  - R6: Two unpinned float comparisons
  - R7: Untraced reason in advisory message
- **Lens:** correctness, numeric precision, messaging accuracy
- **Fixes:** Pinned float comparisons with toleranced arithmetic; traced all advisory paths.
- **Commits:** 9e20d4e, b633ef7
- **Status:** FIXED

**Q4-R5 — Dead config field**
- **Finding:** `frq_calibrated` was added to both CSA and Precalc configs by an earlier round but was never read by any code path.
- **Lens:** dead code, config integrity
- **Fix:** Removed from configs and documented the calibration path as unimplemented.
- **Commit:** 47f60ee
- **Status:** FIXED

**Q4-S1 — Coverage branch ran before mock branch**
- **Finding:** The selection logic applied the coverage filter before the mock filter, so the first sitting excluded an entire unit (u3 got 0 of 42 items) and manufactured a 10.7-point decline with zero change in student knowledge.
- **Lens:** correctness, selection priority
- **Fix:** Re-ordered filters so mock-branch constraints are applied first, then coverage.
- **Commit:** f58347e
- **Status:** FIXED

**Q4-S2 — Share normalization per-topic instead of per-unit**
- **Finding:** The share calculation normalized exam weight across TOPICS while the weight is per-UNIT. A unit's realized share was proportional to (weight × topicCount). A 60%-weighted unit was assigned 32.5% of sits because its topics were split.
- **Lens:** correctness, coverage formula
- **Fix:** Weight normalization now operates per-unit, not per-topic.
- **Commit:** f58347e
- **Status:** FIXED

**Q4-S3 — Breadth pool drops exam filter inside mock**
- **Finding:** The breadth pool's lower tiers dropped the exam-tested filter inside a MOCK context. Result: 21.7% of every Precalc paper was off-syllabus and scored.
- **Lens:** correctness, filter scope
- **Fix:** Exam filter now persists through all pool tiers regardless of context.
- **Commit:** f58347e
- **Status:** FIXED

**Q4-S4/S5/S6/S7 — Selection state and messaging**
- **Finding Four issues:**
  - S4: `thisPaper` unpinned (could be swapped for wrong pool)
  - S5: `repeat: true` had no consumer in the selector
  - S6: "today" said of yesterday in logging
  - S7: Two unpinned comparisons in coverage gate
- **Lens:** correctness, state tracking, messaging
- **Fixes:** Pinned all comparisons with mutation tests; removed dead repeat flag or added consumer.
- **Commit:** f58347e
- **Status:** FIXED

**Q4-A2 — Advisory asserts total-time bar when only per-question cap tripped**
- **Finding:** The persisting advisory said "135 minutes exceeded" (the total-time bar) when only the per-question cap (118 minutes measured) was breached. Student saw false total-time failure.
- **Lens:** correctness, advisory message accuracy
- **Fix:** Differentiate in advisory between total-time breach and per-question cap.
- **Commit:** 8bad5e2
- **Status:** FIXED

**Q4-A3 — Per-question cap measures serve-to-log latency**
- **Finding:** The per-question time cap measured serve-to-log LATENCY, not thinking time. One dinner break (serve at 5pm, log at 9pm) voided a legitimate 42-of-42 sitting.
- **Lens:** correctness, time accounting
- **Fix:** Cap now measures actual per-question response time, not submission latency.
- **Commits:** 8bad5e2, 19a6256
- **Status:** FIXED

### Medium/Low Severity (17 findings)

**Q4-A4, Q4-D2, Q4-D6, Q4-D3, Q4-D4 — Advisory surfaces contradictions; stranded sitting; handleTaught count loss; test shims misrepresent D1**
- **Finding Five issues:**
  - A4: Contradictory advisory surfaces (e.g., "closed but unscored" AND "scored")
  - D2: Sitting stranded between close and score writes disclosed with FALSE reason, could never be scored
  - D6: handleTaught discarded its changed-row count
  - D3/D4: Two test shims misrepresent D1's run() envelope (returns node:sqlite shape instead of D1 shape)
- **Lens:** correctness, state transitions, test fidelity
- **Fixes:** Conditional INSERT to prevent race; proper scoring on re-attempt; test shims corrected.
- **Commits:** 8bad5e2, ea2c126, 77b6577, c9d8ae3, 133b368, 0a50e4f
- **Status:** FIXED

**Q4-A6 — GPT given expected but not divisor**
- **Finding:** The GPT was handed `expected` but not the actual divisor (scorable items) the server used to compute composite, so GPT advice could contradict the server's arithmetic.
- **Lens:** API contract, documentation
- **Fix:** New `scored_out_of` field declared and identity-tested to match server computation.
- **Commit:** d603f9c
- **Status:** FIXED

**Q4-B1/B2/B3 — Validate() reads real configs; feasibility() fails silently; no duplicate-topic check**
- **Finding Three issues:**
  - B1: validate() defaulted to reading real configs off disk, contaminating fixture tests
  - B2: feasibility() returned TOTAL SILENCE when a config's exam block was misnamed (gate silently stops gating)
  - B3: No duplicate-topic check in validation
- **Lens:** correctness, build validation, test isolation
- **Fix:** validate() now takes configs as arguments; feasibility() throws on malformed config; duplicate-topic check added.
- **Commit:** 096b461
- **Status:** FIXED

**Q4-X1/X2/X3/X4/X5/X6/X7 — DEPLOY.md chain broken; instructions wrong; schema omissions; repeats undisclosed**
- **Finding Seven issues:**
  - X1: DEPLOY.md's `npm run build` exits 1, so seed:sql and worker:check never run
  - X2: Instructions enumerate wrong number of reasons a sitting goes unscored
  - X3: X4: Reasons duplicated in instructions
  - X5: Repeats undisclosed in some logs
  - X6: Schema comment listing a value never written
  - X7: Dead field still in schema
- **Lens:** documentation-vs-reality, deployment safety, schema accuracy
- **Fixes:** Corrected DEPLOY.md sequence; fixed reason count in both docs and code; removed dead schema entries.
- **Commits:** 292e807, 5ce2984, 0a50e4f
- **Status:** FIXED

## Refuted Hypotheses (Auditors Confirmed These Are NOT Defects)

The following were investigated and confirmed as correct behavior:

- Block rule's core invariants: judged windows are always contiguous inside one block, span within bounds, official anchor inside, window without newer sittings always >42 days old, reason never null (40,000-case fuzz plus 24 mutants)
- Exact-boundary float verdicts: `composite_pct` is always the server-computed ratio
- Cram-newest block blocking an older valid window: working as designed
- Met-count share formula: correct per spec
- "No FRQ attempts at all" reported as shortfall rather than pending: correct classification
- Determinism in selector: 10 scenarios × 5 bank orderings, both subjects, virgin/exhausted/mock — all deterministic
- False confession (repeat:true on a fresh item): structurally impossible
- Unlabelled repeat: impossible
- In-window item ranking: correctly prefers fresh items
- csa-ac-q46's quoted "50" option: option text is correct
- Grader's precedence tie-breaks: zero verdict changes over 218 items
- Hedge stripping eating meaning: zero of 906 option texts affected
- Unparsed verdict's blast radius: every consumer correct
- recordAttemptUnderOpenMock integrity: stores what it claims
- Scored-but-not-closed and double-scoring: impossible under schema constraints
- Concurrent session conflicts (/mock/submit × 2, /log × 2, /log vs /mock/submit, /next vs /mock/submit, content reload vs write): all safe
- Letter-collision build errors: TRUE positives
- Feasibility arithmetic: correct
- --write-despite-incomplete flag: safe for opt-in use

## Auditor Conclusions

Round 4 confirmed the campaign hypothesis: new fix code contains new defects at rates comparable to original code. The 33 defects span all audit lenses equally, indicating the fixes touched many system layers. Severity is still weighted toward critical (4 of 33), though lower than Round 1's distribution. No defect was found in code untouched by Rounds 2-3.
