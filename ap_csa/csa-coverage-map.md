# AP CSA Coverage Map (2025+ Redesigned Exam) — "Cover Everything" Checklist

**Purpose:** This is the *complete* list of testable concepts for the redesigned AP Computer Science A exam (first exam May 2026; your target exam **May 2027**). If you can solve problems on every ⬜ item here at a 🟢 level, you have, by definition, covered the whole exam. The AI tutor uses this as its syllabus and the `mastery-tracker.md` mirrors it.

**Sources (verified):** Cross-checked **line-by-line against the official College Board CED — *AP Computer Science A Course and Exam Description, Effective Fall 2025*** (all 53 topics, 1.1–4.17), plus AP Central/AP Students for exam format & weights, and CSAwesome 2025+ for examples. **This map = the complete official topic list. Nothing tested is missing; nothing untested is included.**

---

## The exam at a glance (what a 5 is made of)

| Section | Count | Weight | Time |
|---|---|---|---|
| **I. Multiple Choice** | 42 questions | **55%** | 90 min |
| **II. Free Response** | 4 questions | **45%** | 90 min |

- Fully digital in **Bluebook**. **Java Quick Reference** is provided the entire exam (the testable library is bounded — you never have to memorize method signatures).
- Dominant MCQ skill: **reading/tracing code ("Analyze Code") ≈ 37–53%.** Tracing code by hand is the single highest-yield skill.
- ~25–27% of all takers get a 5 (one of the highest 5-rates of any AP). This is a very learnable exam.

### The 4 free-response questions (same shapes every year)
| FRQ | Type | Points | Built on |
|---|---|---|---|
| **Q1** | Methods & Control Structures (often + Strings) | 7 | Units 1–2 |
| **Q2** | Class Design | 7 | Unit 3 |
| **Q3** | Data Analysis with ArrayList | 5 | Unit 4 |
| **Q4** | 2D Array | 6 | Unit 4 |
| | **Total** | **25** | |

> Scoring is itemized: each point is a specific code element. Partial credit everywhere. **Penalties capped at 3/question** and only deducted from parts that earned credit. **Never leave an FRQ blank.**

---

## PRIORITY KEY
🔥 = highest yield (drill to mastery) · ⭐ = important · ◽ = lower / optional

---

## Unit 1 — Using Objects and Methods · **15–25% of MCQ** ⭐
*(Mirrors CSAwesome 2025+ topics 1.1–1.15, the College Board–endorsed curriculum.)*
- [ ] Algorithms, programming & compilers (the basics of what a program is)
- [ ] Variables & primitive types: `int`, `double`, `boolean`
- [ ] Expressions, arithmetic & operator precedence; output (`System.out.print/println`)
- [ ] Assignment & input
- [ ] 🔥 **Integer division & modulo** (`7/2 == 3`, `7%2 == 1`) — top Python-kid trap
- [ ] Casting `int` ↔ `double` (cast *before* dividing: `(double)a/b`)
- [ ] **Ranges of values / integer overflow** (`int` has limits; `Integer.MAX_VALUE`)
- [ ] **Compound assignment operators** (`+=`, `-=`, `*=`, `/=`, `%=`, `++`, `--`)
- [ ] APIs & libraries; **using the Java Quick Reference** (provided on the exam)
- [ ] Comments, documentation & **preconditions / postconditions**
- [ ] **Method signatures** (name + parameter types); calling class (static) methods
- [ ] The `Math` class: `abs`, `pow`, `sqrt`, `random`
- [ ] Creating & initializing objects with `new` + constructors; the idea of a reference
- [ ] Calling instance methods: void vs. return value, with/without parameters
- [ ] 🔥 **`String` methods**: `length`, `substring`, `indexOf`, `equals`, `compareTo`, concatenation
- [ ] 🔥 **`==` vs `.equals()` for Strings** — top trap (reference vs. content)

## Unit 2 — Selection and Iteration · **25–35% of MCQ** 🔥
- [ ] Boolean expressions & relational operators (`<`, `<=`, `==`, `!=`)
- [ ] `if` / `if-else` / nested `if` / `else-if`
- [ ] Compound boolean (`&&`, `||`, `!`) + **short-circuit evaluation**
- [ ] De Morgan's Laws (negating compound conditions)
- [ ] Comparing values; comparing `double`s safely
- [ ] 🔥 **`while` loops**
- [ ] 🔥 **`for` loops**
- [ ] 🔥 **Nested loops**
- [ ] Standard algorithms: sum / max / min / count / average
- [ ] 🔥 **String traversal algorithms** (loop over chars)
- [ ] Informal runtime analysis of loops (how many times it runs)
- [ ] 🔥 **Hand-tracing code** (predict output) — the #1 MCQ skill

## Unit 3 — Class Creation · **10–18% of MCQ** ⭐
*(Official CED topics 3.1–3.9.)*
- [ ] Abstraction & program design (why classes)
- [ ] Impact of program design (design choices & their effects)
- [ ] Anatomy of a class (fields, constructors, methods)
- [ ] 🔥 **Writing constructors** (incl. multiple/overloaded)
- [ ] 🔥 **Writing methods**: accessors (getters), mutators (setters), params, return
- [ ] Passing & returning object references
- [ ] `static` (class) variables & methods
- [ ] Scope & access — `public` vs **`private`**
- [ ] `this` keyword
- [ ] 🔥 **Encapsulation rule:** never access a private field from outside; use the accessor (FRQ point-killer)
- [ ] `toString` (commonly used in Q2)

## Unit 4 — Data Collections · **30–40% of MCQ** 🔥🔥 (the big one)
*(Official CED topics 4.1–4.17.)*
- [ ] Ethical & social issues around data collection (conceptual; light MCQ)
- [ ] Introduction to data sets / arrays (what & why)

**1D Arrays**
- [ ] 🔥 Array creation & access (`arr[i]`, `arr.length` — a *field*, no parens)
- [ ] 🔥 Array traversal (standard `for` and enhanced `for-each`)
- [ ] 🔥 Array algorithms (sum/max/min/count/search)
- [ ] 🔥 **Off-by-one / bounds** (last index = `length-1`) — top runtime-error trap
- [ ] Reading from text files (basic)

**ArrayList** (FRQ3)
- [ ] Wrapper classes: `Integer`, `Double`, autoboxing
- [ ] 🔥 `ArrayList` methods: `add`, `get`, `set`, `remove`, `size()` (a *method*, with parens)
- [ ] 🔥 Array vs ArrayList syntax (`arr[i]` vs `list.get(i)`; `arr.length` vs `list.size()`)
- [ ] 🔥 ArrayList traversal & algorithms
- [ ] 🔥 **Removing while looping → traverse backward** (avoids index-shift skip bug)

**2D Arrays** (FRQ4)
- [ ] 🔥 2D array creation & access (`grid[r][c]`)
- [ ] 🔥 2D traversal with nested loops (row-major)
- [ ] 🔥 2D array algorithms (sum row/col, find, transform)

**Searching / Sorting / Recursion**
- [ ] ⭐ Sequential (linear) search
- [ ] ⭐ Binary search (on sorted data)
- [ ] ⭐ Selection sort, Insertion sort (trace them)
- [ ] ◽ Merge sort (recognize behavior)
- [ ] ⭐ **Recursion** basics (read & trace recursive methods)
- [ ] ◽ Recursive search/sort (lighter — mostly tracing)
- [ ] ◽ `HashMap` (optional in curriculum)

## Inheritance — ❌ NOT ON THE REDESIGNED EXAM (do not study for the AP)
The official CED (Effective Fall 2025) contains **zero** inheritance, polymorphism, interface, or abstract-class content — verified by full-text search of the CED. These were **removed** in the redesign.
- ❌ Subclasses / `extends` / `super` — *not tested*
- ❌ Method overriding & polymorphism — *not tested*
- ❌ Abstract classes / interfaces — *not tested*
> CSAwesome keeps an "Inheritance (optional)" unit as general enrichment, **but it is not on the AP exam.** Skip it for exam prep. (Your school class may still touch it; that's fine, just not a scoring priority.)

---

## What is NOT on this exam (don't waste time)
- 🚫 **Inheritance, polymorphism, interfaces, abstract classes** — *removed in the redesign* (verified: 0 occurrences in the official CED)
- GUIs / Swing (CSAwesome marks these optional)
- Generics beyond `ArrayList<E>`, lambdas, streams, enums, varargs, annotations
- File *writing*, networking, threads, `HashMap` (HashMap is optional enrichment only)
- Heavy recursion proofs / binary trees (those were the old discontinued "AB" course)

---

## How to read mastery (🟢 target for every required item)
⬜ not started · 🟡 learning (needs hints) · 🟠 shaky (gets it sometimes) · 🟢 solid (independent) · ⭐🟢 mastered (fast + under time)

**Definition of "done / will get a 5":** every 🔥 and ⭐ item at 🟢, plus 2–3 timed released exams scoring in the 5 range.
