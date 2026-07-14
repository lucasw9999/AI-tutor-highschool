# Killer-Errors Cheatsheet

**Purpose:** Every row is a recurring AP CSA FRQ or MCQ point-loser, with the concrete fix. Review before every practice session; update the watchlist in `../exam-skill-tracker.md` when you miss one.

---

## Killer-Errors Table

| # | Error | What it costs | Concrete fix |
|---|---|---|---|
| **1** | Using `==` to compare String content | Wrong on every String equality check; known FRQ penalty | Use `.equals()`: `if (s1.equals(s2))`. Reserve `==` for primitives (`int`, `double`, `boolean`) and null checks. |
| **2** | Off-by-one: loop runs one too many or too few times | MCQ wrong answer; FRQ partial credit | Use `< length` (not `<= length`) for array loops: `for (int i = 0; i < arr.length; i++)`. Last valid index is `length - 1`. |
| **3** | Array index out of bounds | `ArrayIndexOutOfBoundsException` at runtime; loses points | First index = `0`; last valid index = `arr.length - 1`. For 2D: row last = `grid.length - 1`, col last = `grid[0].length - 1`. |
| **4** | Forward removal from ArrayList while iterating | Skips the element after each removal; produces wrong results | Traverse **backward**: `for (int i = list.size() - 1; i >= 0; i--)`. Or traverse forward with a `while` loop and **increment only in the else** (skip increment when you remove). |
| **5** | Using enhanced-for and modifying the list (add/remove) | `ConcurrentModificationException`; immediate runtime crash | Never add or remove elements inside an enhanced-for loop. Use an indexed `for` loop or the backward traversal pattern instead. |
| **6** | Non-`private` instance variables in Q2 Class Design | Direct penalty on the Q2 rubric — costs the encapsulation point | All instance variables must be `private`. Constructors and methods are `public`. This is the encapsulation rule (topic 3.3). |
| **7** | 2D array row/column order reversed | Processes wrong dimension; produces garbage output | `grid.length` = number of **rows**. `grid[0].length` = number of **columns**. Access is always `grid[row][col]`. Outer loop = rows, inner loop = cols for row-major traversal. |
| **8** | Calling a method on a possibly-null object | `NullPointerException`; wrong MCQ trace answer | Guard with a null check first: `if (x != null && x.method())`. The `&&` short-circuits — `x.method()` is never called if `x` is null. |
| **9** | Using `.equals(null)` to check for null | `NullPointerException` if the variable is null (the receiver itself is null) | Always use `== null` (or `!= null`) to test for null: `if (x == null)`. Never `x.equals(null)`. |
| **10** | Leaving an FRQ part blank | Scores exactly 0 for that part — guaranteed points lost | Write *something* — even syntactically imperfect code that shows the right intent earns partial credit. A blank earns nothing. |
| **11** | Messy or misleading indentation | Grader interprets intent from structure; wrong indentation conveys wrong logic | Align every block correctly. On the digital (Bluebook) exam, indentation signals block membership to the human grader — it matters as much as the code itself. |
| **12** | Using `charAt` instead of `substring(i, i+1)` | Wrong type (`char` vs `String`); `charAt` is not on the reference sheet | Replace all `s.charAt(i)` with `s.substring(i, i+1)`. The result is a one-character `String`, which is the correct type for any String-processing code on this exam. |
| **13** | Re-implementing a method the class/problem already provides | FRQ penalty: costs points even if logic is otherwise correct | Read the provided class header and method list before writing. If a method exists (e.g., `getScore()` is already defined), call it — do not copy its body inline. |
| **14** | Directly accessing a `private` field from outside the class | FRQ penalty — same category as non-private instance variables | Use the provided accessor methods. If no accessor exists, you must write one. Never reference `obj.field` directly from outside the class. |

---

## Quick Summary Reference

```
== vs .equals()      → always .equals() on Strings
Off-by-one           → < arr.length (not <=); last = length - 1
ArrayList removal    → backward loop OR while-only-increment-in-else
Enhanced-for + modify → ConcurrentModificationException (use indexed loop)
Q2 instance vars     → private (always)
2D array             → grid.length = rows, grid[0].length = cols, grid[row][col]
Null guard           → if (x != null && x.method())
Null check           → == null (not .equals(null))
FRQ blank            → never — write something
Indentation          → clean (digital exam: grader reads structure)
charAt               → substring(i, i+1) — charAt is off the sheet
Re-implementing      → call the provided method, don't copy its body
Private access       → use accessors, never obj.field from outside
```

---

## Watchlist Integration

After each practice session, open `../exam-skill-tracker.md` and mark any row you triggered. Rows marked ≥2 times become your **priority reps** for the next session.
