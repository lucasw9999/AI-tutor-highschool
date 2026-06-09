# Lucas's Digital SAT Project — Start Here

An **express, question-driven** Digital SAT tutor. **Goal: 1500+, ready by spring 2027** — cover *every* question type densely, spend reps only where his answers reveal weakness, and kill careless mistakes with an error log. Same architecture as `../ap_csa/`, `../10th_english/`, `../ap_precalc/`, tuned for the SAT.

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
