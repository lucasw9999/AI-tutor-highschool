# Diagnostic Exam — The Real Baseline (timed)

**What this is.** A short, **timed** placement exam that measures your *current* AP CSA exam performance — not your content recall, but your ability to convert "I know this" into points under exam conditions. **This diagnostic — not the prior "~100% coverage" claim — is your authoritative baseline** (design spec §14). Whatever it surfaces seeds your first ~2 weeks of study (the ranked leak list at the bottom).

**Diagnostic is provisional — single-question leaks need confirmation.** A topic leak inferred from a single missed question is provisional, not confirmed. Within the first 2 study sessions after this diagnostic, re-test any single-question leak with 2–3 fresh items on that topic before it drives more than one session of work. Route a topic to the content tutor (`../tutor-prompt.md`) only after **≥2 distinct misses** — a single slip is treated as a careless error (micro-teach + reps), not a content gap. At the Phase 1→2 boundary (end of summer 2026), re-run a fresh full diagnostic to re-rank the leaks before entering the school-year phase.

**Format.** 14 multiple-choice questions + one short FRQ of each of the 4 types (Q1–Q4). All questions are **original** and strictly in-syllabus (only the Java Quick Reference library; none of the 19 exclusions; recursion is **trace-only**).

**How to take it (exam conditions):**
- **Time yourself.** MCQ: **30 minutes** for all 14 (≈ 2:09 each — the real pace). FRQ: **45 minutes** for all four.
- **No notes, no compiler, no autocomplete, no running code.** Type FRQ answers in a plain editor or write them by hand — that mirrors Bluebook, where code is hand-graded and never executed.
- **For every MCQ, jot down *why* you picked it** — your reasoning is what reveals the leak.
- **Never leave anything blank.** No guessing penalty on MCQ; partial credit on FRQ. A blank is pure lost value.
- Do **not** look at the answer key or rubrics until you have finished and timed both sections.

> The Java Quick Reference is provided during the real exam — `substring`, `length()`, `indexOf`, `equals`, `size`, `add`, `get`, etc. Single character at index `i` is `s.substring(i, i + 1)` (there is no `charAt` on the exam).

---

## Section I — Multiple Choice (14 questions, 30 min)

**Q1.** What does this segment print?
```java
double result = (double)(7 / 2);
System.out.println(result);
```
(A) 3.5  (B) 3.0  (C) 3  (D) 4.0

---

**Q2.** What does this segment print?
```java
String word = "computer";
System.out.println(word.substring(2, 5));
```
(A) `ompu`  (B) `mput`  (C) `mpu`  (D) `put`

---

**Q3.** What does this segment print?
```java
double price = 12.86;
int rounded = (int)(price + 0.5);
System.out.println(rounded);
```
(A) 12  (B) 13  (C) 13.0  (D) 14

---

**Q4.** What does this segment print when `score` is `80`?
```java
int score = 80;
if (score >= 90) {
    System.out.println("A");
} else if (score >= 80) {
    System.out.println("B");
} else if (score >= 70) {
    System.out.println("C");
} else {
    System.out.println("F");
}
```
(A) `A`  (B) `B`  (C) `C`  (D) `F`

---

**Q5.** What does this segment print?
```java
int n = 1;
int count = 0;
while (n < 50) {
    n = n * 3;
    count++;
}
System.out.println(count);
```
(A) 3  (B) 4  (C) 5  (D) 81

---

**Q6.** What does this segment print?
```java
int x = 5;
int y = 0;
if (y != 0 && x / y > 2) {
    System.out.println("yes");
} else {
    System.out.println("no");
}
```
(A) `yes`  (B) `no`  (C) The program throws an `ArithmeticException`.  (D) Nothing is printed.

---

**Q7.** What does this segment print?
```java
int total = 0;
for (int i = 0; i < 4; i++) {
    for (int j = 0; j < i; j++) {
        total++;
    }
}
System.out.println(total);
```
(A) 6  (B) 10  (C) 12  (D) 16

---

**Q8.** What does this segment print?
```java
String a = "hello";
String c = new String("hello");
System.out.println(a.equals(c));
System.out.println(a == c);
```
(A) `true` then `true`  (B) `true` then `false`  (C) `false` then `false`  (D) `false` then `true`

---

**Q9.** What is the result of running this segment?
```java
int[] arr = {10, 20, 30, 40, 50};
int sum = 0;
for (int i = 1; i <= arr.length; i++) {
    sum += arr[i];
}
System.out.println(sum);
```
(A) 140  (B) 150  (C) 100  (D) The program throws an `ArrayIndexOutOfBoundsException`.

---

**Q10.** What does this segment print?
```java
ArrayList<Integer> list = new ArrayList<Integer>();
list.add(5);
list.add(8);
list.add(1, 6);
list.set(0, 9);
System.out.println(list);
```
(A) `[9, 6, 8]`  (B) `[9, 8, 6]`  (C) `[5, 6, 8]`  (D) `[9, 6, 8, 1]`

---

**Q11.** What does this segment print?
```java
int[][] grid = {{1, 2, 3},
                {4, 5, 6}};
int sum = 0;
for (int r = 0; r < grid.length; r++) {
    sum += grid[r][1];
}
System.out.println(sum);
```
(A) 5  (B) 7  (C) 9  (D) 21

---

**Q12.** Consider this method. What does `mystery(7)` return?
```java
public static int mystery(int n) {
    if (n <= 1) {
        return 1;
    }
    return n + mystery(n - 2);
}
```
(A) 7  (B) 15  (C) 16  (D) 28

---

**Q13.** Consider this class:
```java
public class Account {
    private double balance;

    public Account(double startBalance) {
        balance = startBalance;
    }

    public double getBalance() {
        return balance;
    }
}
```
In a **different** class, the following local variable exists: `Account a = new Account(100.0);`
Which single statement compiles **and** evaluates to `100.0`?
(A) `a.balance`  (B) `a.getBalance()`  (C) `Account.getBalance()`  (D) `a.balance()`

---

**Q14.** A company builds a program that recommends job candidates. It is trained only on the resumes of people the company hired over the past ten years — a group that happened to be overwhelmingly from one background. Which is the **most accurate** description of a likely problem with this program?
(A) The program will run more slowly because the data set is large.
(B) The recommendations may reflect and amplify the bias already present in the historical data.
(C) The program necessarily violates intellectual-property law by storing resumes.
(D) The program cannot run because resume text cannot be processed by a computer.

---

## Section II — Free Response (4 questions, 45 min)

> Write complete Java methods/classes. Use only the Java Quick Reference library. Indent cleanly — on the digital exam, intent must be clear from the code because nothing is compiled or run.

### Q1 — Methods & Control Structures (7 points)

**Part A (4 points).** Write the method `countMultiples`, which returns how many integers from `1` to `n` **inclusive** are multiples of `factor`. You may assume `n >= 1` and `factor >= 1`. For example, `countMultiples(10, 3)` returns `3` (the multiples are 3, 6, 9).
```java
/** Precondition: n >= 1 and factor >= 1.
 *  Returns the count of integers in 1..n (inclusive) that are multiples of factor.
 */
public static int countMultiples(int n, int factor) {
    /* to be implemented in Part A */
}
```

**Part B (3 points).** Write the method `firstWord`, which returns the portion of `s` **before the first space**. If `s` contains no space, return `s` unchanged. You may assume `s` is not `null`. For example, `firstWord("hello world")` returns `"hello"`, and `firstWord("xyz")` returns `"xyz"`.
```java
/** Precondition: s is not null.
 *  Returns the substring of s before the first space, or all of s if there is no space.
 */
public static String firstWord(String s) {
    /* to be implemented in Part B */
}
```

---

### Q2 — Class Design (7 points)

Design a complete class named `Thermostat` that meets this specification:
- It stores two pieces of state: the **current temperature** and the **target temperature**, both whole numbers (degrees).
- A constructor takes the current temperature and the target temperature (in that order) and initializes the state.
- An **accessor** `getCurrentTemp()` returns the current temperature.
- A **mutator** `setTarget(int t)` changes the target temperature to `t`.
- A method `isComfortable()` returns `true` if the current temperature is within 2 degrees of the target (i.e., the absolute difference is at most 2), and `false` otherwise.

Write the **entire class**, including the necessary instance variables. Follow encapsulation conventions.

---

### Q3 — Data Analysis with ArrayList (5 points)

Write the method `countAbove`, which returns the number of elements in `scores` that are **strictly greater** than `threshold`.
```java
/** Returns the number of values in scores that are strictly greater than threshold.
 *  Precondition: scores is not null.
 */
public static int countAbove(ArrayList<Integer> scores, int threshold) {
    /* to be implemented */
}
```
For example, if `scores` contains `[70, 85, 90, 60, 85]` and `threshold` is `85`, then `countAbove` returns `1` (only `90` is strictly greater than 85).

---

### Q4 — 2D Array (6 points)

A `grid` is a rectangular (non-jagged) 2D array of `int`. Write the method `largestRowSum`, which returns the largest **row sum** among all rows of `grid`. You may assume `grid` has at least one row and at least one column.
```java
/** Precondition: grid is rectangular with at least one row and one column.
 *  Returns the largest sum of any single row in grid.
 */
public static int largestRowSum(int[][] grid) {
    /* to be implemented */
}
```
For example, if `grid` is
```
{{1, 2, 3},      // row sum 6
 {4, 5, 6},      // row sum 15
 {0, 1, 0}}      // row sum 1
```
then `largestRowSum` returns `15`.

---
---

## Answer Key — Multiple Choice

| # | Ans | Why (one line) |
|---|---|---|
| Q1 | **B** | `7 / 2` is **integer** division = 3; casting 3 to `double` gives `3.0` (the cast applies to the already-truncated int, so it is not 3.5). |
| Q2 | **C** | `substring(2, 5)` returns indices 2,3,4 = `mpu` (the `to` index 5 is **excluded**; length = 5 − 2 = 3). |
| Q3 | **B** | `12.86 + 0.5 = 13.36`; `(int)` **truncates** to `13`. (The `+ 0.5` trick rounds to nearest; result is an `int`, so no decimal point.) |
| Q4 | **B** | `80 >= 90` is false; the next branch `80 >= 80` is true → prints `B` and the chain stops. |
| Q5 | **B** | n: 1→3→9→27→81, incrementing count each pass; loop runs while `n < 50`, so 4 multiplications occur before `n = 81` fails the test. |
| Q6 | **B** | `y != 0` is false, so `&&` **short-circuits** and `x / y` is never evaluated — no exception; the `else` runs and prints `no`. |
| Q7 | **A** | Inner loop runs `i` times: 0 + 1 + 2 + 3 = **6** (the inner condition is `j < i`, not `j < 4`). |
| Q8 | **B** | `equals` compares **contents** → `true`; `==` compares **references**, and `new String(...)` is a different object → `false`. |
| Q9 | **D** | Valid indices are 0..4; the condition `i <= arr.length` lets `i` reach `5`, so `arr[5]` throws `ArrayIndexOutOfBoundsException` (classic off-by-one). |
| Q10 | **A** | `[5]` → `[5,8]` → `add(1,6)` inserts at index 1 → `[5,6,8]` → `set(0,9)` replaces index 0 → `[9,6,8]`. |
| Q11 | **B** | Loop sums **column 1** down the rows: `grid[0][1] + grid[1][1] = 2 + 5 = 7`. |
| Q12 | **C** | `7 + mystery(5)` → `7 + 5 + mystery(3)` → `7 + 5 + 3 + mystery(1)` → `7 + 5 + 3 + 1 = 16` (base case returns 1, not 0). |
| Q13 | **B** | `balance` is `private`, so `a.balance` is illegal outside the class; the accessor `a.getBalance()` is the only legal call and returns `100.0`. (`getBalance` is not `static`, so `Account.getBalance()` fails; `a.balance()` treats a field as a method.) |
| Q14 | **B** | Training on a non-representative historical data set causes **algorithmic bias** — the model learns and amplifies the skew of the data (a data-fitness/ethics issue, not speed, IP, or feasibility). |

**Score yourself:** _____ / 14.

---

## Rubrics — Free Response (point-by-point + sample solution)

> Grading note (mirrors the real penalty rules): a missing point is lost only on the part it affects; minor syntax slips are forgiven if intent is clear; but **`==` on Strings, accessing a `private` field from outside the class, non-`private` instance variables, off-by-one bounds, and re-implementing a provided method DO cost points.** Cap: at most the stated points per question.

### Q1 — Methods & Control Structures (7 points)

**Part A — `countMultiples` (4 points)**

| Pt | Criterion |
|---|---|
| 1 | Declares and initializes a counter to 0 |
| 2 | Loops over the integers 1 through n **inclusive** (correct bounds — `<= n` or equivalent) |
| 3 | Tests divisibility correctly with `i % factor == 0` |
| 4 | Increments the counter on a match and returns it (returns the count, not something else) |

Sample solution:
```java
public static int countMultiples(int n, int factor) {
    int count = 0;
    for (int i = 1; i <= n; i++) {
        if (i % factor == 0) {
            count++;
        }
    }
    return count;
}
```

**Part B — `firstWord` (3 points)**

| Pt | Criterion |
|---|---|
| 1 | Finds the first space with `indexOf(" ")` and stores/checks the result |
| 2 | Correctly handles "no space" (`indexOf` returns `-1`) by returning `s` unchanged |
| 3 | When a space exists, returns `s.substring(0, spaceIndex)` with correct bounds |

Sample solution:
```java
public static String firstWord(String s) {
    int space = s.indexOf(" ");
    if (space == -1) {
        return s;
    }
    return s.substring(0, space);
}
```

---

### Q2 — Class Design (7 points)

| Pt | Criterion |
|---|---|
| 1 | Class header `public class Thermostat` |
| 2 | Two `private` instance variables of type `int` (current and target temperature) |
| 3 | `public` constructor with two `int` parameters, in the order (current, target) |
| 4 | Constructor initializes **both** instance variables from the parameters |
| 5 | Accessor `getCurrentTemp()` is non-`void`, returns the current temperature |
| 6 | Mutator `setTarget(int t)` assigns `t` to the target instance variable |
| 7 | `isComfortable()` returns `true` iff `Math.abs(current − target) <= 2`, correct boolean |

Sample solution:
```java
public class Thermostat {
    private int currentTemp;
    private int targetTemp;

    public Thermostat(int current, int target) {
        currentTemp = current;
        targetTemp = target;
    }

    public int getCurrentTemp() {
        return currentTemp;
    }

    public void setTarget(int t) {
        targetTemp = t;
    }

    public boolean isComfortable() {
        return Math.abs(currentTemp - targetTemp) <= 2;
    }
}
```

*(`Math.abs(int)` is on the Java Quick Reference. Acceptable alternative for point 7: an explicit comparison such as `currentTemp - targetTemp <= 2 && targetTemp - currentTemp <= 2`.)*

---

### Q3 — Data Analysis with ArrayList (5 points)

| Pt | Criterion |
|---|---|
| 1 | Declares and initializes a counter to 0 |
| 2 | Traverses the entire list using `size()` / `get(i)` (or a correct enhanced-for over `scores`) with correct bounds (0..size−1) |
| 3 | Compares each element to `threshold` using **strictly greater than** (`>`) |
| 4 | Increments the counter only on a match (handles autounboxing of `Integer` to `int` correctly) |
| 5 | Returns the counter |

Sample solution:
```java
public static int countAbove(ArrayList<Integer> scores, int threshold) {
    int count = 0;
    for (int i = 0; i < scores.size(); i++) {
        if (scores.get(i) > threshold) {
            count++;
        }
    }
    return count;
}
```

*(Acceptable alternative for points 2–4: `for (int score : scores) { if (score > threshold) { count++; } }` — the enhanced-for unboxes each `Integer` to an `int`.)*

---

### Q4 — 2D Array (6 points)

| Pt | Criterion |
|---|---|
| 1 | Iterates over the rows using `grid.length` (rows = `grid.length`) |
| 2 | For each row, computes that row's sum by iterating its columns using `grid[r].length` (or `grid[0].length`) with correct bounds |
| 3 | Accumulates the per-row sum correctly (resets the row sum for each new row) |
| 4 | Tracks the largest row sum seen so far (initialized correctly — e.g., to the first row's sum, **not** to 0, since all sums could be negative) |
| 5 | Updates the maximum only when a larger row sum is found |
| 6 | Returns the largest row sum |

Sample solution:
```java
public static int largestRowSum(int[][] grid) {
    int max = 0;
    for (int c = 0; c < grid[0].length; c++) {
        max += grid[0][c];   // initialize max to the first row's sum
    }
    for (int r = 1; r < grid.length; r++) {
        int rowSum = 0;
        for (int c = 0; c < grid[r].length; c++) {
            rowSum += grid[r][c];
        }
        if (rowSum > max) {
            max = rowSum;
        }
    }
    return max;
}
```

*(Acceptable alternative: initialize `max = Integer.MIN_VALUE`, then loop all rows including row 0. Initializing `max = 0` loses point 4 because a grid whose every row sums to a negative number would return 0 incorrectly.)*

---
---

## How to Read Your Results → Your Ranked Leak List

This diagnostic **is** your baseline. Find every pattern below that you missed, then carry the actions into `exam-skill-tracker.md`. The list is **ranked by exam leverage** — top items are worth the most points and get worked first (Phase 1 weights toward Analyze-Code + Unit 4, per spec §15).

| Rank | If you missed… | The leak | Set in `exam-skill-tracker.md` |
|---|---|---|---|
| 1 | **Q5, Q7, Q12** (loop/recursion traces) | **Analyze-Code (P3) — the 37–53% slice.** Hand-tracing loops, nested loops, and the recursive call stack is the single biggest lever. | Table (a): mark **P3 Analyze Code** 🟠 (or 🟡 if 2+ missed). This is the top study priority. |
| 2 | **Q9** (used `<=` to the array length) | **Off-by-one / array bounds.** Upper bound is `length − 1`; loop condition is `<`, not `<=`. | Table (e): **Off-by-one / array bounds** 🟡, miss count +1. |
| 3 | **Q8** (`true` then `true`, or any wrong combo) | **`==` vs `.equals()` on Strings.** `==` compares references; `.equals()` compares contents. The #1 FRQ point-loser. | Table (e): **`==` instead of `.equals()`** 🟡, miss +1. |
| 4 | **Q10** (ArrayList `add(index,…)` / `set`) | **ArrayList method semantics** — `add(i, x)` inserts and shifts; `set` replaces. Foundation for the Q3 FRQ and remove-while-iterating traps. | Table (b): **U4 Data Collections** 🟠; revisit ArrayList methods. |
| 5 | **Q11** (column traversal) | **2D row/col order.** `grid[row][col]`; rows = `grid.length`, cols = `grid[0].length`; column traversal fixes the col index and walks the rows. | Table (e): **2D row/col order confusion** 🟡; Table (d): watch **Q4** FRQ. |
| 6 | **Q1, Q2, Q3** (int division, `substring`, cast/round) | **Unit 1 fundamentals under pressure** — integer division truncates; `substring(a,b)` excludes `b`; `(int)` truncates after the `+0.5`. | Table (b): **U1 Using Objects & Methods** 🟠. |
| 7 | **Q4, Q6** (if-else-if boundary, short-circuit) | **Selection logic** — `if-else-if` stops at the first true branch; `&&` short-circuits before evaluating the right side. | Table (b): **U2 Selection & Iteration** 🟠. |
| 8 | **Q13** (private field / accessor) | **Encapsulation & access** — `private` fields are reachable only via accessors; non-`static` methods need an object. Directly drives the Q2 FRQ. | Table (e): **Non-`private` instance fields** 🟡; Table (b): **U3 Class Creation** 🟠. |
| 9 | **Q14** (algorithmic bias) | **Use Computers Responsibly (P5)** — recognize algorithmic bias / data fitness, IP, and unintended harm. Low weight (2–10%) but free points. | Table (a): **P5 Use Computers Responsibly** 🟡. |

**FRQ leaks (map each lost point to the killer-error watchlist):**

| If you lost points on… | The leak | Set in `exam-skill-tracker.md` |
|---|---|---|
| **Q1 Part A** bounds (used `< n`, skipped `n`) or wrong `%` test | Off-by-one + iteration-algorithm precision | Table (d): **Q1** score; Table (e): **Off-by-one** +1 |
| **Q1 Part B** (used `charAt`, mishandled the no-space `-1` case, wrong `substring` bounds) | String-method fluency + `indexOf` `-1` guard; **`charAt` is not on the exam** | Table (d): **Q1**; Table (e): **`charAt` instead of `substring`** +1 if used |
| **Q2** non-`private` fields, missing accessor/mutator distinction, uninitialized field | Encapsulation + constructor completeness (the recurring Class-Design point-losers) | Table (d): **Q2** score; Table (e): **Non-`private` instance fields** +1 |
| **Q3** wrong bounds, used `==` semantics wrongly, forgot to return the count | ArrayList traversal precision | Table (d): **Q3** score |
| **Q4** row/col swap, `max` initialized to 0, jagged-bounds assumption | 2D traversal + max-finder initialization | Table (d): **Q4** score; Table (e): **2D row/col order confusion** +1 |
| **Left any FRQ blank** | Blank = guaranteed zero; partial credit always beats nothing | Table (e): note it; Table (c) pacing review |

**Then:** open `exam-skill-tracker.md`, set the statuses above, and write the **first session-log entry**:
> `<date> · diagnostic baseline · MCQ __/14 · FRQ Q1 __/7 Q2 __/7 Q3 __/5 Q4 __/6 · killer-errors triggered: ___ · next: top of the ranked leak list (Analyze-Code + Unit 4)`

This is **Phase 0** in the study timeline (spec §15). From here, Phase 1 attacks the ranked leak list top-down — Analyze-Code tracing and Unit 4 first.
