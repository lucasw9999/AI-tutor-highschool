# FRQ Bank — Q4: 2D Array (6 points)

**Shape.** Q4 is a single method that **traverses a 2D array** and runs an algorithm — sum/count over the whole grid, per-row or per-column work, find a max/min, or scan a 2D array of objects. Worth **6 points**. The signature traps are **row/column order** (`grid.length` = rows, `grid[r].length` = columns, access `grid[r][c]`) and, when the elements are objects, **null-guarding** before calling a method on a cell.

**In-syllabus pledge.** 2D arrays here are **rectangular** (jagged arrays are an exclusion). Only the Quick Reference library; **no `Math.min`/`Math.max`** (track a running extreme with an `if` instead). We never write recursion. Provided element accessors are **called**, never re-implemented. All practice FRQs are **original**.

**Cross-links:** scoring/penalty rules → [`../reference/frq-rubric-and-penalties.md`](../reference/frq-rubric-and-penalties.md) · point-losers → [`../reference/killer-errors-cheatsheet.md`](../reference/killer-errors-cheatsheet.md) · topic map → [`../topic-coverage-matrix.md`](../topic-coverage-matrix.md) (topics 4.5, 4.11, 4.12, 4.13).

---

## (a) Official models to study

Read the official prompt and scoring guidelines at the source. The summaries describe the task and rubric *structure* — not the College Board's text.

### Model 1 — CED sample FRQ: `Schedule` (Q4)
- **Source:** *AP Computer Science A Course and Exam Description*, sample FRQ, **pp. 161–169**. <https://apcentral.collegeboard.org/media/pdf/ap-computer-science-a-course-and-exam-description.pdf>
- **Task shape:** A method over a 2D array (a grid/schedule). It traverses row-major with nested loops, applies a condition per cell, and counts/accumulates or finds a position — sometimes guarding for a sentinel/empty cell.
- **Rubric structure (6 pts):** points for (a) correct outer loop over rows (`grid.length`), (b) correct inner loop over columns (`grid[r].length`), (c) correct cell access `grid[r][c]`, (d) the correct condition/comparison, (e) the correct accumulation or extreme-tracking, (f) the correct return.

### Model 2 — 2026 released FRQ: `GameBoard` (Q4)
- **Source:** *AP CSA 2026 Free-Response Questions*, Question 4. <https://apcentral.collegeboard.org/media/pdf/ap26-frq-computer-science-a.pdf>
- **Task shape:** A method over a 2D board — count cells meeting a condition, sum a region, or locate/compare values across rows and columns; may involve a 2D array of objects with a null/empty-cell check.
- **Rubric structure (6 pts):** correct nested traversal with `grid.length` rows and `grid[r].length` columns; correct cell access; correct condition; correct accumulation/extreme; correct return — with the null/edge-cell handling worth its own point when the cells are objects.

> The 2026 official Scoring Guidelines PDF was not yet posted as of this writing (see `../reference/frq-rubric-and-penalties.md` §8). The point splits reflect the CED sample rubric and released-FRQ structure.

---

## (b) Original practice FRQs

> Grading note (every rubric below): points are independent; minor syntax slips are forgiven when intent is clear; but **swapping rows/columns, off-by-one bounds, calling a method on a `null` cell (`NullPointerException`), assuming a jagged shape, and `==` on String contents DO cost points** (see `../reference/killer-errors-cheatsheet.md`). Penalty cap = 3 per question, earned-parts only, charged once.

### Practice FRQ 1 — `countEven` (6 points)  · *whole-grid count*

Write `countEven`, which returns the number of **even** values in the rectangular 2D array `grid`.

```java
/** Returns the number of even values in the rectangular 2D array grid.
 *  Precondition: grid is rectangular with at least one row and one column.
 */
public static int countEven(int[][] grid) {
    /* to be implemented */
}
```

Example: for
```
{{1, 2, 3},
 {4, 6, 7}}
```
the method returns `3` (the values 2, 4, 6).

#### Sample solution

```java
public static int countEven(int[][] grid) {
    int count = 0;
    for (int r = 0; r < grid.length; r++) {
        for (int c = 0; c < grid[r].length; c++) {
            if (grid[r][c] % 2 == 0) {
                count++;
            }
        }
    }
    return count;
}
```

#### Rubric (6 points)

| Pt | Criterion |
|---|---|
| 1 | Declares and initializes a counter to 0 |
| 2 | Outer loop iterates over **rows** using `grid.length` (correct bound `r < grid.length`) |
| 3 | Inner loop iterates over **columns** using `grid[r].length` (or `grid[0].length`) — correct dimension, not swapped with rows |
| 4 | Accesses each cell as `grid[r][c]` (row index first, column second) |
| 5 | Tests evenness with `grid[r][c] % 2 == 0` and increments on a match |
| 6 | Returns the count |

**Trace check.** Row 0: 1(odd),2✔(1),3(odd); Row 1: 4✔(2),6✔(3),7(odd) → returns **3** ✓. Rows from `grid.length`, cols from `grid[r].length`, access `grid[r][c]`. Points sum **6**.

---

### Practice FRQ 2 — `columnMax` (6 points)  · *per-column max, no `Math.max`*

Write `columnMax`, which returns the largest value in column `col` of the rectangular 2D array `grid`.

```java
/** Returns the largest value found in column col of grid.
 *  Precondition: grid is rectangular with at least one row;
 *                0 <= col < grid[0].length.
 */
public static int columnMax(int[][] grid, int col) {
    /* to be implemented */
}
```

Example: for
```
{{3, 9, 1},
 {7, 2, 8},
 {5, 4, 6}}
```
`columnMax(grid, 0)` returns `7` (the values in column 0 are 3, 7, 5).

#### Sample solution

```java
public static int columnMax(int[][] grid, int col) {
    int max = grid[0][col];
    for (int r = 1; r < grid.length; r++) {
        if (grid[r][col] > max) {
            max = grid[r][col];
        }
    }
    return max;
}
```

#### Rubric (6 points)

| Pt | Criterion |
|---|---|
| 1 | Initializes the running max to the **first row's** value in that column, `grid[0][col]` (not to 0 — values could all be negative) |
| 2 | Loops down the **rows** with `grid.length` (correct bound), holding `col` **fixed** — walks a column, not a row |
| 3 | Accesses cells as `grid[r][col]` (row varies, column index is the parameter, row first) |
| 4 | Compares each cell to the running max with `>` and updates `max` when larger (no `Math.max`, which is off the reference) |
| 5 | Visits every row (starting either at `r = 0` or `r = 1` after seeding from row 0 — both cover all rows exactly once) |
| 6 | Returns the max |

**Trace check.** `col=0`, max=grid[0][0]=3; r=1 `7>3`✔ max=7; r=2 `5>7`✘ → returns **7** ✓. Column walked by fixing `col` and varying `r` over `grid.length`; max seeded from a real cell (handles all-negative). Points sum **6**.

---

### Practice FRQ 3 — `countAvailable` (6 points)  · **2D array of objects + null-guard**

A `Seat` element class is provided (an accessor only — **call it**, do not re-implement):

```java
public class Seat {
    public boolean isReserved() { /* not shown */ }
}
```

A theater is a rectangular 2D array `Seat[][] hall`. **Some cells may be `null`** (no seat in that spot — an aisle). Write `countAvailable`, which returns the number of seats that **exist** (are not `null`) **and** are **not reserved**.

```java
/** Returns the number of non-null Seat cells in hall that are not reserved.
 *  Precondition: hall is rectangular with at least one row and one column.
 *                Cells may be null.
 */
public static int countAvailable(Seat[][] hall) {
    /* to be implemented */
}
```

#### Sample solution

```java
public static int countAvailable(Seat[][] hall) {
    int count = 0;
    for (int r = 0; r < hall.length; r++) {
        for (int c = 0; c < hall[r].length; c++) {
            if (hall[r][c] != null && !hall[r][c].isReserved()) {
                count++;
            }
        }
    }
    return count;
}
```

#### Rubric (6 points)

| Pt | Criterion |
|---|---|
| 1 | Declares and initializes a counter to 0 |
| 2 | Outer loop over **rows** with `hall.length`; inner loop over **columns** with `hall[r].length` (correct dimensions, not swapped) |
| 3 | Accesses each cell as `hall[r][c]` (row first, column second) |
| 4 | **Null-guards** the cell first: `hall[r][c] != null` is checked **before** any method call (the `&&` short-circuits, so `isReserved()` is never called on `null`) |
| 5 | Calls the provided `isReserved()` and counts the cell only when it is **not** reserved (`!hall[r][c].isReserved()`) |
| 6 | Returns the count |

**Trace check.** Suppose row 0 = `[reserved, null, free]`, row 1 = `[free, free, null]`. Row 0: cell0 not null but reserved → `!true`=false, skip; cell1 null → `!= null` false, short-circuits, skip (no NPE); cell2 free → count 1. Row 1: cell0 free → count 2; cell1 free → count 3; cell2 null → skip. Returns **3** ✓. The `!= null` test comes first and `&&` short-circuits, so `isReserved()` is never invoked on a `null` cell. Points sum **6**.

---

## (c) Signature point-losers for Q4

Cross-referenced to [`../reference/killer-errors-cheatsheet.md`](../reference/killer-errors-cheatsheet.md):

| Point-loser | Cheatsheet # | Q4-specific fix |
|---|---|---|
| Row/column order reversed | #7 | `grid.length` = number of **rows**; `grid[r].length` (or `grid[0].length`) = number of **columns**; access is always `grid[row][col]`. Outer loop = rows, inner loop = columns for row-major. |
| Calling a method on a possibly-`null` cell | #8 | Null-guard first: `if (cell != null && cell.method())`. The `&&` short-circuits, so the method is never called when the cell is `null` — no `NullPointerException`. |
| Initializing a max/min tracker to 0 | — (topic 4.5) | Seed the extreme from a **real cell** (e.g., `grid[0][col]`), not 0. A grid of all-negative values would otherwise return 0 wrongly. `Math.max`/`Math.min` are off the reference — track with an `if`. |
| Off-by-one bounds on either dimension | #2, #3 | Last valid row = `grid.length - 1`, last valid column = `grid[r].length - 1`; loop with `<`, not `<=`. `grid.length`/`grid[r].length` are **attributes** (no parentheses). |
| Assuming a jagged shape (or hard-coding a width) | — (exclusion 16) | Grids here are rectangular, but still size the inner loop from `grid[r].length` (robust per-row) rather than a literal — never assume a fixed column count. |
| `==` to compare String cell contents | #1 | If cells are Strings, compare with `.equals`, not `==`. |
| Re-implementing a provided element accessor | #13 | If `isReserved()` (or any element method) is given, **call it** — don't reach for fields you can't see. |
