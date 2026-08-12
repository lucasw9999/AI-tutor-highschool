# Round 6 Detail — Code Audit of Round 5 Fixes + Content & External Lens

## What Changed This Round

Two distinct vectors:

1. **Code audit of Round 5's fix code** (+1338 lines from round 5). Found 4 rich / 2 some signal findings, ~20 items total. This pattern has now held six rounds running: auditing a round's fix code finds more.

2. **NEW LENS: CONTENT COVERAGE AND EXTERNAL CURRENCY.** Five prior rounds asked only "is the code correct?". This round asked "is the content sufficient, and are its external facts still true?" Three agents with WebFetch against College Board found the largest gaps in the project's history.

---

## Verified Fixed — Code Lens (Round 5 Fix Code)

**Q6-S1 HIGH overstatement — reuse gate ordering (3a1aaf8, d008742)**
- The reuse gate ran BEFORE unit apportionment, so a unit whose items were all inside the reuse window was dropped from a mock paper entirely
- Measured on real bank: at 140 answers unit 4 got 0.0% of a 38-question paper against a 35.4% entitlement; at 180 answers 65.7% of exam was absent and a composite was still produced
- Fixed by apportioning first and deciding freshness inside the chosen topic
- With knowledge held fixed at true 72.3, the repaired paper scored 89.5 and cleared floor of 78

**Q6-D1 HIGH — duplicate-serve race (a3926d5)**
- The round-4 duplicate-serve fix had a hole: openServeItems filtered on logged=0, so a question was on no no-repeat list during the window between claiming the serve and inserting the attempt
- A raced /next re-served it, and the duplicate bought a 37-question paper past the 38-question coverage gate

**Q6-A1/A2/XB1 HIGH — paper section boundaries (983a5be, d61152d, 5914049)**
- Nothing bounded a paper at its section length
- Basis claimed "Answered 46 of the 46" when zero free-response questions were asked
- scored_out_of could exceed scorable so one string stated two divisors 2.2 points apart

**Q6-A7 REAL DEFECT — handleNext closes only halves already full (dd12b70)**
- A half a section without a value was never closed and a Section I multiple-choice sitting could be served a FREE-RESPONSE question
- Silently shrinking the composite's numerator

**Q6-G1 MEDIUM — printed answer form (6432d02)**
- The printed form ("C. 3.2") declined the moment a hedge or trailing mark appeared
- All 4,360 hedged printed forms declined bank-wide, all resolved once hedge was removed
- Step-3 sweep went from 27,032 wrongly-declined responses to 4 (correct) with zero false verdicts

**Q6-R1/R2 MEDIUM — excluded-sittings disclosure (cf6ffb5)**
- Asserted "too few to form a window of N" about N sittings, and rejection branch disclosed nothing at all
- 45% mock from yesterday appeared in no criterion while report discussed 95s from three months earlier

**Q6-A3/A4/A5/XB2/XB3, Q6-S2/S3, Q6-D2/D3, Q6-R3/R4, Q6-G2/G3, Q6-A6 — various**
- Advisory clauses asserting unmeasured facts
- 409 naming unreachable cause with provably-ineffective remedy
- Ten unpinned mutants

---

## Verified Fixed — Content & External Lens (NEW)

**EXT-1 TIME-SENSITIVE and FALSE — late registration path (d6f66d3)**
- Repo stated "there is no late-registration path"
- ACTUALLY: preferred 2 Oct 2026, FINAL 13 Nov 2026 11:59pm ET at $40/exam late fee; accommodations 22 Jan 2027; fall order changes 12 Mar 2027
- Verified verbatim from College Board's school-year timeline

**EXT-2 — ap_precalc had NO registration deadline (d6f66d3)**
- Entire ap_precalc half of repo had no registration deadline, though November order covers both exams

**EXT-3 — free-response calibration gate blocked by unposted guideline (d6f66d3)**
- Gate was waiting on UNPOSTED 2026 scoring guideline
- ACTUALLY: officially scored sample responses are LIVE NOW (ap25-sg-*, ap25-apc-*-q1..q4, ap25-cr-report-*, plus 2024 for Precalc)
- For Precalculus fully aligned because College Board states content unchanged, so this gate is unblockable TODAY

**EXT-4/5/6/7 — sessions, calculator, assessments, CED (d6f66d3)**
- Sessions replaced morning/afternoon so exams are ~30 hours apart not ~24
- Precalc calculator described as "Required for nothing" when College Board says "requires graphing calculator on Part B Section I and Part A Section II"
- AP Classroom's Bluebook-Style Assessments and Practice Exams (official mock readiness engine requires) unrecorded
- Stale CED citation

**PC-C4 — Unit 2 exam weight wrong (4be74fd)**
- CED says 25-40%, repo hardcoded 27-40%
- Propagated to config and all 11 Unit-2 topic rows, which feed selection ordering

**PC-C5 — stale document claim (9b5b9dc)**
- Document section told reader the CED "still prints the OLD format"
- Live CED is Effective Fall 2026 and prints the new one

**PC-C8b/C8c — near-duplicate replaced, taglines added (739ced9)**
- Near-duplicate item replaced with genuine Unit 1 content (verified with python3)
- 13 missing difficulty/calc_allowed taglines added

**CSA-C4 — feasibility gate structural error (a3a302a)**
- Feasibility gate compared 218 multiple-choice items against requirement that included 4 free-response questions
- Passed while every assembled paper was structurally 0% free response

**THE BIG ONE: 20 free-response items ingested (d70a3d7, 9e5cd97, 12e2301, 61958a5)**
- 1,423 lines of hand-written FRQs with rubrics, sample solutions, trace checks and penalty policy existed in the repo
- NO PARSER HAD EVER OPENED THEM (grep for filenames across tools/ and worker/src returned nothing)
- Free response is 45% of AP CSA exam and all 25 of its points; 45% of exam was unpracticable
- Readiness criterion was permanently pending
- NOW: 238 CSA items (218 mcq + 20 frq), 125 rubric points, 20 rubrics in database, CSA feasibility error gone, Section II paper assemblable, criterion arithmetically measurable

---

## Refuted in Round 6 (Append to Existing Refuted List)

- Block rule re-verified by 40,000-case fuzz and 28 mutants
- Float snap verified in both directions over 4.5 million right/total combinations against every shipped bar — zero understatements, zero overstatements, zero verdict flips
- Grading swept at 84,631 and again at 77,390 responses (whitespace, full-width letters, curly quotes, non-breaking spaces, en dashes, backtick changes, doubled labels, label/value disagreement, prefixes, suffixes, two-option matches) — zero false negatives, zero false positives
- Substance rule resolving to wrong option (96 tied options, 106 shared-word pairs, all decline first)
- Selector determinism (10 scenarios × 5 orderings × 2 subjects × virgin/exhausted/mock)
- Apportionment from virgin history
- Termination and progress in mock branch
- excludeItemIds honoured in every branch
- Rescue/re-submit path against every concurrent pairing
- Hold shim parking at correct point
- D1 envelope count-reads covered both directions
- Resource cost measured — db.js stated ceiling is CONSERVATIVE, not understatement
- CSA unit weights, practice weights, section structure, FRQ point split, exam dates, modes, 2025 AND 2026 score distributions for BOTH subjects all verified correct against College Board

---

## Still Open (Replacing Old Section)

**CODE:**
- A Section II paper is not one of each exam slot: it served Q4, Q2, Q3, Q4 with Q1 absent (selection by topic/weight, slots map 1:1 to topics; real Section II is exactly one of each)
- readiness.js comment "no item in bank stored as kind 'frq'" is now false; behaviour correct, comment misleads
- gpt-instructions.md still illustrates "bank cannot supply that section" with Section II example true of Precalc but no longer CSA
- FRQ items carry null calc_allowed; schema-legal but unread for CSA; AP CSA permits no calculator
- Two /next OUTSIDE sitting still hand out same item (needs bounded serve expiry, design decision)
- K2 — CSA lesson quotes same item cold re-test serves first, gap closes on text just read (needs source_items column through 4 files)
- openapi.test.js d1() shim still returns node:sqlite shape not D1 envelope
- repeat_of has no consumer; labelled repeats count into mock composite identically to first-time (on worn bank: 19 of 38 questions)
- PC-C8a UNFIXED — three Precalc items filed under wrong unit, ids embed unit/seed, seed.sql additive with no DELETE; fixable in to-sql.js or by making ids unit-independent

**CONTENT:**
- P2 Develop Code is ~61.5% exam score, 7.8% bank; 31 more P2 mcq items needed for 22% floor (20 ingested FRQs all P2, improves materially but doesn't close it)
- Zero set-based mcq items (CED says exam includes them); zero roman-numeral; zero EXCEPT/NOT items; no item has difficulty field
- Precalc: 0 of 48 items machine-gradable, so no Precalc composite reachable; 32 of 36 on-exam items keyable (7 atomic, 25 compound-but-deterministic) — data-entry gap not content property; 33 exam-tested topics have no items; 90 more items needed for 3 disjoint mocks; zero items of kind mcq or frq

**DEPLOYMENT:** Worker and D1 still run pre-campaign code/data; two live-data migrations needed; openapi.json and gpt-instructions.md must be re-pasted into Custom GPT; FRQ calibration UNBLOCKED by EXT-3 but unimplemented; `calibrated: false` hard-coded at three sites
