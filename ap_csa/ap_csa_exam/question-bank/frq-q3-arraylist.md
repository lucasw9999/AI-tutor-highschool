# FRQ Bank — Q3: Data Analysis with ArrayList (5 points)

**Shape.** Q3 is a single method that **traverses an `ArrayList` of objects** and runs a standard algorithm — count/accumulate, search, build a result list, or **delete-by-condition**. Worth **5 points**. The signature trap of this type is **removing while iterating**: you must traverse **backward** (or hold the index when you remove) so you don't skip elements.

**In-syllabus pledge.** Only the six Quick Reference `ArrayList` methods (`size`, `add(E)`, `add(int,E)`, `get`, `set`, `remove(int)`) plus the eight String methods. **No `Iterator`/`Iterator.remove`** (not on the reference). **No enhanced-for when adding/removing** — that throws `ConcurrentModificationException`. We never write recursion. Provided accessor methods on the element objects are **called**, never re-implemented. All practice FRQs are **original**.

**Cross-links:** scoring/penalty rules → [`../reference/frq-rubric-and-penalties.md`](../reference/frq-rubric-and-penalties.md) · point-losers → [`../reference/killer-errors-cheatsheet.md`](../reference/killer-errors-cheatsheet.md) · topic map → [`../topic-coverage-matrix.md`](../topic-coverage-matrix.md) (topics 4.8, 4.9, 4.10).

---

## (a) Official models to study

Read the official prompt and scoring guidelines at the source. The summaries describe the task and rubric *structure* — not the College Board's text.

### Model 1 — CED sample FRQ: `ItemInventory` (Q3)
- **Source:** *AP Computer Science A Course and Exam Description*, sample FRQ, **pp. 161–169**. <https://apcentral.collegeboard.org/media/pdf/ap-computer-science-a-course-and-exam-description.pdf>
- **Task shape:** A method on an `ArrayList` of item objects that traverses the list, calls each item's provided accessor(s), and computes a result (a count/total) or modifies the list under a condition.
- **Rubric structure (5 pts):** points for (a) traversing the whole list with correct bounds (`0 .. size()-1` or a correct enhanced-for when not modifying), (b) calling the element's provided accessor (not re-implementing it), (c) the correct condition/comparison, (d) the correct accumulation or list modification, (e) the correct return.

### Model 2 — 2026 released FRQ: `Attendance` (Q3)
- **Source:** *AP CSA 2026 Free-Response Questions*, Question 3. <https://apcentral.collegeboard.org/media/pdf/ap26-frq-computer-science-a.pdf>
- **Task shape:** Process an `ArrayList` of records — count or select those meeting a condition, or **remove** the records that fail a condition, returning a count or a filtered result.
- **Rubric structure (5 pts):** correct traversal; correct condition test; correct list operation (`get`/`remove`/`add` to a result list); **correct handling of removal-while-iterating** (no skipped elements); correct return.

> The 2026 official Scoring Guidelines PDF was not yet posted as of this writing (see `../reference/frq-rubric-and-penalties.md` §8). The point splits reflect the CED sample rubric and released-FRQ structure.

---

## (b) Original practice FRQs

> Grading note (every rubric below): points are independent; minor syntax slips are forgiven when intent is clear; but **forward removal while iterating (skipping elements), enhanced-for + structural modify (`ConcurrentModificationException`), `==` on String content, and re-implementing a provided accessor DO cost points** (see `../reference/killer-errors-cheatsheet.md`). Penalty cap = 3 per question, earned-parts only, charged once.

A `Book` element class is provided for FRQs 1 and 3 (accessors only — **call them**, do not re-implement):

```java
public class Book {
    public String getTitle()  { /* not shown */ }
    public String getGenre()  { /* not shown */ }
    public int    getPages()  { /* not shown */ }
}
```

### Practice FRQ 1 — `countLongBooks` (5 points)  · *count / accumulate*

Write `countLongBooks`, which returns the number of books in `library` with **more than** `minPages` pages.

```java
/** Returns the number of Book objects in library whose page count is greater than minPages.
 *  Precondition: library is not null; no element is null.
 */
public static int countLongBooks(ArrayList<Book> library, int minPages) {
    /* to be implemented */
}
```

Example: if the books have 120, 400, 80, 510 pages and `minPages` is `100`, the method returns `3`.

#### Sample solution

```java
public static int countLongBooks(ArrayList<Book> library, int minPages) {
    int count = 0;
    for (int i = 0; i < library.size(); i++) {
        if (library.get(i).getPages() > minPages) {
            count++;
        }
    }
    return count;
}
```

#### Rubric (5 points)

| Pt | Criterion |
|---|---|
| 1 | Declares and initializes a counter to 0 |
| 2 | Traverses the whole list with correct bounds — `i < library.size()` (or a correct enhanced-for over `library`, valid here since the list is not modified) |
| 3 | Accesses each element with `library.get(i)` and calls the provided `getPages()` (does not re-implement page lookup) |
| 4 | Tests **strictly greater than** `minPages` (`> minPages`, not `>=`) and increments on a match |
| 5 | Returns the count |

**Trace check.** pages 120,400,80,510, `minPages=100` → `120>100`✔(1), `400>100`✔(2), `80>100`✘, `510>100`✔(3) → returns **3** ✓. Bounds `< size()`; `getPages()` called; `>` strict. Points sum **5**.

---

### Practice FRQ 2 — `removeBelow` (5 points)  · **remove-while-iterating**

A list of `Integer` quiz scores is given. Write `removeBelow`, which **removes every score** strictly less than `passing` from the list (modifying the list in place) and returns **how many** scores were removed.

```java
/** Removes from scores every value strictly less than passing, modifying scores in place.
 *  Returns the number of values removed.
 *  Precondition: scores is not null; no element is null.
 */
public static int removeBelow(ArrayList<Integer> scores, int passing) {
    /* to be implemented */
}
```

Example: if `scores` is `[70, 40, 88, 55, 90]` and `passing` is `60`, then after the call `scores` is `[70, 88, 90]` and the method returns `2`.

#### Sample solution

```java
public static int removeBelow(ArrayList<Integer> scores, int passing) {
    int removed = 0;
    for (int i = scores.size() - 1; i >= 0; i--) {
        if (scores.get(i) < passing) {
            scores.remove(i);
            removed++;
        }
    }
    return removed;
}
```

> **Why backward?** Removing element `i` shifts every later element left by one. A forward loop (`i++`) would then skip the element that slid into index `i`. Traversing from `size() - 1` down to `0` means every index you still have to visit is *below* the one you just removed, so nothing shifts out from under you.

#### Rubric (5 points)

| Pt | Criterion |
|---|---|
| 1 | Declares and initializes a removed-counter to 0 |
| 2 | Traverses the list **backward**: `for (int i = scores.size() - 1; i >= 0; i--)` (the correct remove-while-iterating pattern — a forward indexed loop that skips elements, or an enhanced-for, does not earn this point) |
| 3 | Tests **strictly less than** `passing` with `scores.get(i) < passing` |
| 4 | On a match, removes by index with `scores.remove(i)` and increments the counter |
| 5 | Returns the number removed |

**Trace check.** `[70,40,88,55,90]`, `passing=60`, going backward: i=4 `90<60`✘; i=3 `55<60`✔ remove → `[70,40,88,90]` (removed 1); i=2 `88<60`✘; i=1 `40<60`✔ remove → `[70,88,90]` (removed 2); i=0 `70<60`✘ → list `[70,88,90]`, returns **2** ✓. No element skipped because we walk downward. Points sum **5**.

> **Equivalent forward pattern** (also full credit on points 2–4): use a `while` loop and increment the index **only when you do not remove** —
> ```java
> int i = 0;
> while (i < scores.size()) {
>     if (scores.get(i) < passing) { scores.remove(i); removed++; }
>     else { i++; }
> }
> ```

---

### Practice FRQ 3 — `titlesInGenre` (5 points)  · *build a result list*

Write `titlesInGenre`, which returns a **new** `ArrayList<String>` of the titles of every book in `library` whose genre **equals** `genre` (exact match), in their original order. The input list is **not** modified.

```java
/** Returns a new list of the titles of books whose genre equals genre, in order.
 *  Precondition: library is not null; no element is null.
 */
public static ArrayList<String> titlesInGenre(ArrayList<Book> library, String genre) {
    /* to be implemented */
}
```

Example: if the library holds (title, genre) pairs `("Dune","scifi"), ("Emma","drama"), ("Foundation","scifi")` and `genre` is `"scifi"`, the method returns `["Dune", "Foundation"]`.

#### Sample solution

```java
public static ArrayList<String> titlesInGenre(ArrayList<Book> library, String genre) {
    ArrayList<String> result = new ArrayList<String>();
    for (int i = 0; i < library.size(); i++) {
        Book b = library.get(i);
        if (b.getGenre().equals(genre)) {
            result.add(b.getTitle());
        }
    }
    return result;
}
```

#### Rubric (5 points)

| Pt | Criterion |
|---|---|
| 1 | Creates a new `ArrayList<String>` to hold the result |
| 2 | Traverses the whole input list with correct bounds (`i < library.size()` or a correct enhanced-for — valid since the input list is not modified) |
| 3 | Calls the provided `getGenre()` and compares to `genre` with `.equals` (NOT `==`) |
| 4 | On a match, adds the book's `getTitle()` to the result list (calls the provided accessors, does not re-implement them) |
| 5 | Returns the result list |

**Trace check.** genre `"scifi"`: Dune `"scifi".equals("scifi")`✔ add "Dune"; Emma `"drama".equals("scifi")`✘; Foundation `"scifi".equals("scifi")`✔ add "Foundation" → returns `["Dune","Foundation"]` ✓. Genre compared with `.equals` (no `==` penalty); input list untouched; accessors called. Points sum **5**.

---

## (c) Signature point-losers for Q3

Cross-referenced to [`../reference/killer-errors-cheatsheet.md`](../reference/killer-errors-cheatsheet.md):

| Point-loser | Cheatsheet # | Q3-specific fix |
|---|---|---|
| Forward removal while iterating (skips elements) | #4 | Traverse **backward**: `for (int i = list.size() - 1; i >= 0; i--)`. Or forward with a `while` loop, incrementing the index **only in the `else`** (when you did not remove). |
| Enhanced-for while adding/removing | #5 | An enhanced-for during a structural modification throws `ConcurrentModificationException`. Use an indexed `for`/`while`. (Enhanced-for is fine for read-only counting — FRQs 1 and 3.) |
| `==` to compare a String field of an element | #1 | Compare with `.equals`: `b.getGenre().equals(genre)`. `==` is a semantic error and costs the point. |
| Re-implementing an element's provided accessor | #13 | If `getPages()`, `getGenre()`, `getTitle()` are given, **call them**. Don't reach for fields you can't see or recompute their values. |
| Off-by-one bounds on the traversal | #2 | Valid indices are `0 .. size() - 1`; the loop condition is `i < size()` (forward) or `i >= 0` from `size() - 1` (backward). `i <= size()` throws `IndexOutOfBoundsException`. |
| Wrong return — returning the wrong thing or nothing | — (topic 4.10) | Match the contract: `removeBelow` returns the **count removed**, `titlesInGenre` returns a **new list**, `countLongBooks` returns the **count**. Build a fresh `result` list when asked for a list; never return the input. |
