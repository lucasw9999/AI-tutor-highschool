# AP Tutor Campaign Ledger

## Campaign Status

**NOT converged.** Eight rounds. Round 7 opened the content/external-currency lens on the *documentation*. **Round 8 read the user's words at face value — "how much coverage we do" is the ITEM BANK — and that is where the real hole was.** AP Precalculus went from structurally unmeasurable (every item model-graded and excluded from every floor; 500 correct answers → 0%) to fully measurable: 33 of 33 exam-tested topics covered AND keyed, 38 MCQ + 4 FRQ, and a mock that assembles and scores, verified end-to-end through the real seed and the real grader. **The build reports `Build OK` for the first time in the project's life.** Pattern persists: auditing a round's fix code finds more — round 8 caught a "100%" bug that the round's own new content would have made reachable.

**Verification command:** `npm test` → 698 tests, 698 pass, 0 fail. `node tools/build/build.js` → `Build OK`, 0 gate lines (was 62 at round-8 start).

**Largest open risk is still not a defect:** `origin/main` holds zero files under `worker/`, and 175 commits are unpushed. Nine months of work on one laptop. Reported to the user; pushing is theirs to call.

---

## Campaign Metadata

**Branch:** perfect/audit-356f3d9  
**Baseline commit:** 356f3d9 (198 tests / 198 pass / 0 fail)  
**Rounds completed:** 8  
**Agents dispatched:** ~131 (5 died on API timeouts, all on one task — see round-8.md)  
**Commits applied:** 160  
**Test coverage at end:** 698 tests / 698 pass / 0 fail  
**Build:** `Build OK` — 336 items (ap_csa=241, ap_precalc=95), 97 topics, 97 teaching rows.

## Verified fixed (independently confirmed, with commit)

### Round 1

- **D1x** — attempts() dropped a.response; every mock reported blanks == answered and max_blanks was permanently unmeetable (732a112)
- **G1-G7** — seven grading defects including normalizeChoice reading "a" as choice A, scoring "it throws a NullPointerException" wrong on shipped item (c44f9b6)
- **R1** — official-College-Board-mock anchor checked against all logged mocks, not judged window; a window could be 100% bank-sourced at 100% ready (bdd6d59)
- **R3/R4/R5/R6/H1/R8** — window search, two definitions of readiness_pct, missing freshness on pending path, self-contradicting span message, disagreeing percentages vs. pass/fail marks, nine threshold comparisons that survived mutation (bdd6d59)
- **E1/T11/A4** — cleared concept gap re-opened on next request and re-taught same lesson forever (42c45eb)
- **A1/E4** — handleNext accepted model-supplied mock id with no existence/subject/open check (42c45eb)
- **A2** — mock composite had no completeness check; 3 correct answers scored 100 (42c45eb)
- **A6/XB2/E3** — handleLog and handleMockSubmit took readiness config from caller while data subject came from row (42c45eb, 51d7cb3)
- **A7/E2** — serve-spent guard was read-then-write; two concurrent logs produced two attempt rows for one answer (48e5adf)
- **E5/T12/T13/A8** — (42c45eb, 48e5adf)
- **S1-S5** — selection priorities silently skipped by global-keyed fallback; false "everything at floor" claim; off-exam material preferred over on-exam; unfiltered review; vacuous determinism test (6817aae, 15bdf00)
- **X1-X8** — router and Actions-schema contract; schema declared `correct` boolean while 100% of Precalc answers return null (51d7cb3)
- **X3** — a `full` mock reported half the exam's time budget (143ac30)
- **B1-B5** — every subject now validated; Precalc previously bypassed all checks; exam-tested topic with no items fails build (76f3a5a)
- **P1** — stripTicks corrupted 92 of 872 MCQ options across 31 items (9a98b27)
- **PC1-PC5** — Precalc parser truncation and duplicate-id blindness (c5517fa)
- **Q1** — evidence-table guard was text search that stems containing "attempts" would trip (516678f)
- **CONTENT-1/2/3** — wrong Precalc answer key (49.713 should 49.712), false product check, two contradicted "biggest unit" claims (311e616)
- **D2x/D3x/C2/C3/C4/C6/H2** — docs-vs-reality: comments and config keys describing behavior code did not have (732a112, e039786, 73095d3)
- **Build escape hatch and regenerated artifacts** (d06d0cb, 846d55a)
- **Stale test fixtures and vacuous assertion** (8186743)

### Round 2

- **N1** — /log had no closed-mock guard; answers logged after sitting submission still moved per-unit floors (7293721)
- **N2** — blanks and composite disagreed about unreached questions (7293721)
- **N3** — incomplete-but-real sitting silently discarded with no trace in status (7293721)
- **N4** — round-1 window rule leaked: >42-day gap let stale strong evidence be judged while fresh weak evidence was stepped over (e62d72a)
- **N5** — calibrated free-response branch would report 0% for work never scored (e62d72a)
- **N6** — two unpinned comparisons (e62d72a)
- **N7** — no build gate rejected MCQ option whose text is bare letter colliding with another option's label (ed20283)
- **N8/N10/N11/N12** — period/hedge ordering gap, dead unconditional serve-marker reinstatement race, false schema comment, 12 worked examples opening with dangling fragment (45bb65e)

### Round 4 (33 defects found in Rounds 2-3 fix code)

#### Critical
- **Q4-A1** — section expected ≠ scorable; bank with 0 items scored 4-of-4 (100%); six sittings formed complete qualifying window (18add4f)
- **Q4-D1** — /next inside sitting handed same item twice; duplicate bypassed 90% gate, inflated composite ~2.4 pts (3b6f937)
- **Q4-G1/G2** — LETTER_ONLY stripped punctuation asymmetrically; "C" graded WRONG on csa-u2-q7, "A" graded RIGHT when wrong (f2e3c08)
- **Q4-G3/G4/G5** — lone word from option sentence gave confident verdict; three guards survived mutation (4d34cca, 9e18d2f, 335df67)

#### High
- **Q4-R1** — freshness measured newest judged sitting but labeled "most recent mock"; 45% at day-1 appeared in no number (9e20d4e)
- **Q4-R2** — one of twelve rubric rows marked entire criterion met; gave 100% instead of 1/12 (9e20d4e)
- **Q4-R3/R4/R6/R7** — blocker mislabeled; float printed 1 point below measured; two unpinned comparisons (9e20d4e, b633ef7)
- **Q4-R5** — frq_calibrated added but never read (47f60ee)
- **Q4-S1** — coverage filter before mock filter; first sitting excluded entire unit (u3: 0 of 42); manufactured 10.7-pt decline (f58347e)
- **Q4-S2** — share normalized per-topic not per-unit; 60% unit got 32.5% (f58347e)
- **Q4-S3** — breadth pool's lower tiers dropped exam-tested filter inside mock; 21.7% off-syllabus scored (f58347e)
- **Q4-S4/S5/S6/S7** — thisPaper unpinned; repeat:true unused; "today" said yesterday; two unpinned comparisons (f58347e)
- **Q4-A2** — advisory asserted total-time breach when only per-question cap tripped (118 min < 135 bar) (8bad5e2)
- **Q4-A3** — per-question cap measured serve-to-log latency not thinking time; dinner break voided legitimate 42-of-42 sitting (8bad5e2, 19a6256)

#### Medium/Low
- **Q4-A4** — contradictory advisory surfaces (closed AND unscored + scored) (8bad5e2)
- **Q4-D2** — sitting stranded between close and score writes, disclosed with FALSE reason, could never be scored (ea2c126)
- **Q4-D3/D4** — two test shims misrepresent D1's run() envelope (return node:sqlite shape not D1 shape) (c9d8ae3, 133b368)
- **Q4-D6** — handleTaught discarded changed-row count (77b6577)
- **Q4-A6** — GPT given expected but not divisor; could contradict server's composite arithmetic; added scored_out_of (d603f9c)
- **Q4-B1** — validate() defaulted to reading real disk configs, contaminated fixtures (096b461)
- **Q4-B2** — feasibility() returned silence when exam block misnamed (gate silently stops gating) (096b461)
- **Q4-B3** — no duplicate-topic check in validation (096b461)
- **Q4-X1/X2/X3/X4/X5/X6/X7** — DEPLOY.md chain fails (npm run build exits 1); instructions enumerate wrong reason count (2 vs 4); repeats undisclosed; dead schema field (292e807, 5ce2984, 0a50e4f)

### Round 5 (all 33 Round 4 fixes)

All Round 4 findings verified fixed across 9 fixers in two dispatch waves plus two re-dispatches (API timeouts due to stream idle).

Commits: 18add4f, 3b6f937, f2e3c08, 4d34cca, 9e18d2f, 335df67, 9e20d4e, b633ef7, 47f60ee, f58347e, 8bad5e2, 19a6256, ea2c126, 77b6577, c9d8ae3, 133b368, 0a50e4f, d603f9c, 096b461, 292e807, 5ce2984, cbcae26

### Round 6 (Code audit of Round 5 + Content/External lens)

Auditing Round 5's fix code (+1338 lines) found 4 rich / 2 some signal findings (~20 items). NEW LENS: Five prior rounds asked "is the code correct?"; this round asked "is the content sufficient, and are external facts true?" Three agents with WebFetch found the largest gaps in the project.

#### Code Fixes
- **Q6-S1 HIGH** (3a1aaf8, d008742) — reuse gate ran BEFORE unit apportionment; dropped units from mock entirely; at 140 answers unit 4 got 0.0% vs 35.4% entitlement; fixed by apportioning first
- **Q6-D1 HIGH** (a3926d5) — openServeItems filtered on logged=0, race window between claim and insert re-served same item
- **Q6-A1/A2/XB1 HIGH** (983a5be, d61152d, 5914049) — nothing bounded paper at section length; basis claimed all 46 when zero free-response served; scored_out_of exceeded scorable
- **Q6-A7 REAL DEFECT** (dd12b70) — handleNext closed only halves already full; Section I sitting could be served free-response question
- **Q6-G1 MEDIUM** (6432d02) — printed answer form declined on hedge/trailing mark; 4,360 declined bank-wide; step-3 sweep 27,032→4 with zero false verdicts
- **Q6-R1/R2 MEDIUM** (cf6ffb5) — excluded-sittings disclosure asserted "too few to form N" about N sittings; rejection branch disclosed nothing
- **Q6-A3/A4/A5/XB2/XB3, Q6-S2/S3, Q6-D2/D3, Q6-R3/R4, Q6-G2/G3, Q6-A6** — advisory unmeasured facts, 409 unreachable cause, ten unpinned mutants

#### Content & External Fixes (NEW LENS)
- **EXT-1 FALSE** (d6f66d3) — "no late-registration path"; ACTUALLY: preferred 2 Oct, FINAL 13 Nov 11:59pm ET $40/exam; verified from College Board timeline
- **EXT-2** (d6f66d3) — ap_precalc had zero registration deadline (November order covers both)
- **EXT-3 UNBLOCKED** (d6f66d3) — calibration gate waiting unposted 2026 guideline; sample responses now LIVE (ap25-sg-*, ap25-apc-*-q1..q4, fully aligned for Precalc)
- **EXT-4/5/6/7** (d6f66d3) — sessions ~30h apart not ~24; calculator description wrong; Bluebook assessments unrecorded; stale CED
- **PC-C4** (4be74fd) — Unit 2 exam weight: CED 25-40%, repo 27-40%, propagated to all 11 rows
- **PC-C5** (9b5b9dc) — document claims CED "still prints OLD format"; live CED Effective Fall 2026 prints new
- **PC-C8b/C8c** (739ced9) — near-duplicate replaced with genuine Unit 1; 13 missing difficulty/calc_allowed added
- **CSA-C4** (a3a302a) — feasibility gate compared 218 mcq vs requirement including 4 frq; passed while papers 0% free response
- **THE BIG ONE** (d70a3d7, 9e5cd97, 12e2301, 61958a5) — 1,423 lines FRQs with rubrics NEVER PARSED (grep across tools/worker/src returned nothing); 45% of exam unpracticable; NOW: 238 items, 125 points, 20 rubrics, Section II assemblable

## Refuted (settled — do NOT re-report in a future round)

**Round 1-3 refuted (unchanged):**
- `?? []` in db.js swallowing errors — D1 throws instead
- INTEGER-vs-boolean coercion across schema boundary — every comparison matches stored type
- lit() escaping only single quotes — SQLite does not process backslash escapes; all 266 items verified byte-identical through real database
- tested_on_exam defaulting undefined to 1 — no topic lacks the key
- Urgency formula swamped by exam weight — shortfall provably dominates with real weights
- readTagline mislabeling no-calc items — all 48 taglines printed against parsed values, zero mismatches
- 500 handler echoing err.message — deliberate for two-person tool
- Key travelling in query string — accepted trade-off
- Mock attempts counting as gap evidence — no
- 218 CSA MCQ keys and 35 of 36 Precalc items verified CORRECT by independent re-derivation
- N9: resolveChoice exported with no production consumer; judged NO-CHANGE-NEEDED with documented reasoning

**Round 4 refuted (newly settled):**
- Block rule's core invariants: judged windows always contiguous, span in bounds, official anchor inside, >42-day rule holds, reason never null (40K-case fuzz + 24 mutants)
- Exact-boundary float verdicts: composite_pct always server-computed ratio
- Cram-newest blocking older valid window: correct design
- Met-count share formula: correct
- "No FRQ attempts" as shortfall not pending: correct classification
- Selector determinism: 10 scenarios × 5 orderings × 2 subjects × virgin/exhausted/mock — all deterministic
- False confession (repeat:true on fresh item): impossible
- Unlabelled repeat: impossible
- In-window ranking precedence: fresh over bank
- csa-ac-q46 quoted "50": correct
- Grader precedence ties: zero changes over 218 items
- Hedge stripping: zero of 906 texts affected
- Unparsed verdict blast radius: all consumers correct
- recordAttemptUnderOpenMock integrity: stores claimed values
- Scored-but-not-closed and double-scoring: impossible
- Concurrent session conflicts: all safe
- Letter-collision build errors: TRUE positives
- Feasibility arithmetic: correct
- --write-despite-incomplete safety: correct

**Round 6 refuted (newly settled):**
- Block rule re-verified by 40,000-case fuzz and 28 mutants
- Float snap verified in both directions over 4.5M right/total combinations against every shipped bar — zero understatements, zero overstatements, zero verdict flips
- Grading swept at 84,631 and 77,390 responses (whitespace, full-width letters, curly quotes, non-breaking spaces, en dashes, backticks, doubled labels, prefix/suffix, two-option matches) — zero false negatives, false positives
- Substance rule resolving to wrong option (96 tied, 106 shared-word pairs, all decline first)
- Selector determinism (10 scenarios × 5 orderings × 2 subjects × virgin/exhausted/mock)
- Apportionment from virgin history
- Termination and progress in mock branch
- excludeItemIds honoured in every branch
- Rescue/re-submit against every concurrent pairing
- Hold shim parking at correct point
- D1 envelope count-reads both directions
- Resource cost db.js ceiling CONSERVATIVE not understatement
- CSA unit/practice weights, section structure, FRQ point split, exam dates/modes, 2025 AND 2026 score distributions both subjects all verified correct vs College Board

## Still open (precise diagnosis each)

**CODE:**
- Section II paper not one of each exam slot: served Q4, Q2, Q3, Q4 (Q1 absent); selection by topic/weight while slots map 1:1 to topics; real Section II exactly one of each
- readiness.js comment "no item stored as kind 'frq'" now false; behaviour correct, comment misleads
- gpt-instructions.md illustrates "bank cannot supply section" with Section II example true of Precalc but no longer CSA
- FRQ items carry null calc_allowed; schema-legal but unread for CSA; AP CSA permits no calculator
- Two /next OUTSIDE sitting still hand same item (needs bounded serve expiry, design decision)
- K2 — CSA lesson quotes same item cold re-test serves first, gap closes on text just read (needs source_items column through 4 files)
- openapi.test.js d1() shim returns node:sqlite shape not D1 envelope
- repeat_of has no consumer; labelled repeats count into mock composite identically to first-time (worn bank: 19 of 38)
- PC-C8a UNFIXED — three Precalc items wrong unit, ids embed unit/seed, seed.sql additive no DELETE; fixable in to-sql.js or unit-independent ids

**CONTENT:**
- P2 Develop Code ~61.5% exam score, 7.8% bank; 31 more P2 mcq items needed for 22% floor (20 FRQs all P2, improves but doesn't close)
- Zero set-based mcq (CED includes); zero roman-numeral; zero EXCEPT/NOT; no item has difficulty field
- Precalc: 0 of 48 machine-gradable so no composite reachable; 32 of 36 on-exam keyable (7 atomic, 25 compound-deterministic) — data-entry gap; 33 exam-tested topics no items; 90 more items for 3 disjoint mocks; zero mcq or frq kind

**DEPLOYMENT:**
- Worker and D1 still run pre-campaign code/data
- Two live-data migrations needed
- openapi.json and gpt-instructions.md must be re-pasted into Custom GPT
- FRQ calibration UNBLOCKED by EXT-3 but unimplemented; `calibrated: false` hard-coded at three sites

## Deferred enhancements (reported, deliberately not fixed)

- readiness_pct as unweighted criterion count not comparable across subjects
- Byte-based SQL chunking
- Unused `hinted` field
- Duplicate computeReadiness per request
- Unused indexes
- Positional Precalc topic ids
- Non-atomic multi-file writes in build.js

## Coverage gaps

- No CI exists; no linter or type checker configured (eslint ran zero rules)
- `npm audit` cannot run (no lockfile, zero dependencies)
- wrangler dev / Miniflare cannot run (loopback socket fails with EPERM); Cloudflare's real D1 driver and HTTP layer exercised only through node:sqlite shim and one live deploy smoke test
- ~~sat/ and 10th_english/ markdown content deliberately not audited~~ — **closed in round 7.** Both audited under the coverage/currency lens; `sat/` had never been looked at in six rounds and held the round's worst content defect (answer keys B=58%, D=0%). The reasoning behind the original exclusion ("no parser ingests it; no readiness number depends on it") was the error: harm to the student does not require passing through a parser.
- FRQ rubric text (1423 lines) not audited
- **Concurrent fixers share one working tree.** Rounds 1 and 7 both lost uncommitted work to a sibling agent (`git stash pop` half-applied; a `git checkout`-shaped event). Recovered both times by luck, not process. Unresolved.
