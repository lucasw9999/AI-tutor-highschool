# FRQ Bank — Q1: Methods & Control Structures (7 points)

**Shape.** Q1 is always **two parts** on the redesigned exam. **Part A** is an iterative/conditional method (a standard loop algorithm — count, accumulate, search, digit-extract — usually calling a helper or another method). **Part B** is a String-processing method built from the Java Quick Reference String methods (`length`, `substring`, `indexOf`, `equals`, `compareTo`, `split`). Together the two parts are worth **7 points**.

**In-syllabus pledge.** Only the Java Quick Reference library. **No `charAt`** — single character at index `i` is `s.substring(i, i + 1)`. **No `Math.min`/`Math.max`**. No recursion-writing. All practice FRQs below are **original**; the College Board prompts are cited and linked, never reproduced.

**Cross-links:** scoring/penalty rules → [`../reference/frq-rubric-and-penalties.md`](../reference/frq-rubric-and-penalties.md) · point-losers → [`../reference/killer-errors-cheatsheet.md`](../reference/killer-errors-cheatsheet.md) · topic map → [`../topic-coverage-matrix.md`](../topic-coverage-matrix.md) (topics 1.15, 2.9, 2.10).

---

## (a) Official models to study

Study these two released tasks first — read the official prompt and the official scoring guidelines at the source. **Do not copy their text;** the descriptions below summarize the task and rubric *structure* so you can practice against the same shape.

### Model 1 — CED sample FRQ: `MessageBuilder` (Q1)
- **Source:** *AP Computer Science A Course and Exam Description*, sample FRQ, **pp. 161–169**. <https://apcentral.collegeboard.org/media/pdf/ap-computer-science-a-course-and-exam-description.pdf>
- **Task shape:** A two-part methods problem. Part A iterates with a counter/accumulator and calls a provided helper method to build a result; Part B does String assembly/concatenation and uses Quick Reference String operations to format the output.
- **Rubric structure (7 pts):** roughly **4 points in Part A** (declares/initializes the accumulator; loops with correct bounds; calls the provided helper rather than re-implementing it; returns the correct built value) and **3 points in Part B** (correct String operation/`substring` bounds; correct conditional handling of the edge case; returns the correctly assembled String).

### Model 2 — 2026 released FRQ: `Account` (Q1)
- **Source:** *AP CSA 2026 Free-Response Questions*, Question 1. <https://apcentral.collegeboard.org/media/pdf/ap26-frq-computer-science-a.pdf>
- **Task shape:** Part A is an iterative/conditional method that walks a range or a sequence applying a rule (a transaction/threshold computation); Part B processes a String field and returns a derived String/boolean.
- **Rubric structure (7 pts):** ~**4 in Part A** (counter/accumulator initialized; correct loop bounds; correct conditional test; correct return) + ~**3 in Part B** (correct `indexOf`/`substring` usage; correct edge-case handling such as "not found" / `-1`; correct return type and value).

> The 2026 official Scoring Guidelines PDF was not yet posted as of this writing (see `../reference/frq-rubric-and-penalties.md` §8). The point splits above reflect the CED sample rubrics and the released-FRQ structure — the best available sources for the redesigned exam.

---

## (b) Original practice FRQs

> Grading note (applies to every rubric below): each point is awarded independently; minor syntax slips are forgiven when intent is clear; but **`==` on Strings, using `charAt`, wrong `substring` bounds, off-by-one loop bounds, and re-implementing a provided method DO cost points** (see `../reference/killer-errors-cheatsheet.md`). Penalty cap = 3 per question, earned-parts only, charged once.

### Practice FRQ 1 — `TripLog` (7 points)

A `TripLog` class records the distances (in whole miles) of trips. Two static helper methods are provided and **already written** — you must **call** them, not re-implement them:

```java
/** Returns the distance in miles of the trip with the given id.
 *  Precondition: 1 <= id <= tripCount().
 */
public static int distanceOf(int id) { /* implementation not shown */ }

/** Returns the total number of trips recorded (>= 0). */
public static int tripCount() { /* implementation not shown */ }
```

**Part A (4 points).** Write `countLongTrips`, which returns how many recorded trips have a distance **strictly greater than** `minMiles`. Trips are numbered `1` through `tripCount()` inclusive. Use the provided methods.

```java
/** Returns the number of trips whose distance is strictly greater than minMiles.
 *  Precondition: minMiles >= 0.
 */
public static int countLongTrips(int minMiles) {
    /* to be implemented in Part A */
}
```

For example, if there are 4 trips with distances 12, 5, 30, 8 and `minMiles` is `10`, then `countLongTrips(10)` returns `2` (the 12 and the 30).

**Part B (3 points).** A trip label has the form `"CODE:miles"` — a route code, a colon, then the miles, for example `"NORTH:42"`. Write `routeCode`, which returns the portion **before the first colon**. If the label contains no colon, return the label unchanged. You may assume `label` is not `null`.

```java
/** Returns the substring of label before the first ':' , or all of label if there is no ':' .
 *  Precondition: label is not null.
 */
public static String routeCode(String label) {
    /* to be implemented in Part B */
}
```

For example, `routeCode("NORTH:42")` returns `"NORTH"`, and `routeCode("LOCAL")` returns `"LOCAL"`.

#### Sample solution

```java
public static int countLongTrips(int minMiles) {
    int count = 0;
    for (int id = 1; id <= tripCount(); id++) {
        if (distanceOf(id) > minMiles) {
            count++;
        }
    }
    return count;
}

public static String routeCode(String label) {
    int colon = label.indexOf(":");
    if (colon == -1) {
        return label;
    }
    return label.substring(0, colon);
}
```

#### Rubric (7 points)

**Part A — `countLongTrips` (4 points)**

| Pt | Criterion |
|---|---|
| 1 | Declares and initializes a counter to 0 |
| 2 | Loops over trip ids `1` through `tripCount()` **inclusive** (correct bounds: `id <= tripCount()`) |
| 3 | Calls the provided `distanceOf(id)` and tests it **strictly greater than** `minMiles` (`> minMiles`, not `>=`) — does not re-implement distance lookup |
| 4 | Increments the counter on a match and returns the count |

**Part B — `routeCode` (3 points)**

| Pt | Criterion |
|---|---|
| 5 | Finds the first colon with `indexOf(":")` and stores/uses the result |
| 6 | Handles "no colon" (`indexOf` returns `-1`) by returning `label` unchanged |
| 7 | When a colon exists, returns `label.substring(0, colon)` with correct bounds |

**Trace check.** Part A: distances 12,5,30,8, `minMiles=10` → ids 1..4; `12>10` ✔ (count 1), `5>10` ✘, `30>10` ✔ (count 2), `8>10` ✘ → returns **2**. ✓ Part B: `"NORTH:42"` → `indexOf(":")=5`, `substring(0,5)="NORTH"` ✓; `"LOCAL"` → `indexOf(":")=-1` → returns `"LOCAL"` ✓. Points sum **4 + 3 = 7**. Every rubric line is satisfied by the sample (helpers are *called*, bounds inclusive, `>` strict, `-1` guard present, `substring` bounds correct).

---

### Practice FRQ 2 — `PasswordChecker` (7 points)

**Part A (4 points).** Write `digitSum`, which returns the sum of the decimal digits of a non-negative integer `n` by extracting one digit at a time. For example, `digitSum(2025)` returns `9` (2+0+2+5). `digitSum(0)` returns `0`.

```java
/** Returns the sum of the decimal digits of n.
 *  Precondition: n >= 0.
 */
public static int digitSum(int n) {
    /* to be implemented in Part A */
}
```

**Part B (3 points).** A username/host string has the form `"user@host"`. Write `hasHost`, which returns `true` if the part **after the first `@`** equals the String `host` (exact, case-sensitive match), and `false` otherwise. If there is no `@`, return `false`. You may assume `s` and `host` are not `null`.

```java
/** Returns true iff the part of s after the first '@' equals host exactly.
 *  Returns false if s contains no '@'. Precondition: s and host are not null.
 */
public static boolean hasHost(String s, String host) {
    /* to be implemented in Part B */
}
```

For example, `hasHost("amy@apcsa.org", "apcsa.org")` returns `true`; `hasHost("amy@gmail.com", "apcsa.org")` returns `false`; `hasHost("nobody", "apcsa.org")` returns `false`.

#### Sample solution

```java
public static int digitSum(int n) {
    int sum = 0;
    while (n > 0) {
        sum += n % 10;
        n = n / 10;
    }
    return sum;
}

public static boolean hasHost(String s, String host) {
    int at = s.indexOf("@");
    if (at == -1) {
        return false;
    }
    String after = s.substring(at + 1);
    return after.equals(host);
}
```

#### Rubric (7 points)

**Part A — `digitSum` (4 points)**

| Pt | Criterion |
|---|---|
| 1 | Declares and initializes an accumulator (`sum`) to 0 |
| 2 | Loops while there are digits left (`while (n > 0)` or equivalent) — handles `n == 0` correctly by returning 0 (loop body never runs) |
| 3 | Extracts the last digit with `n % 10` and adds it to the accumulator |
| 4 | Removes the last digit with `n = n / 10` (integer division) and returns the accumulated sum |

**Part B — `hasHost` (3 points)**

| Pt | Criterion |
|---|---|
| 5 | Finds the first `@` with `indexOf("@")` and handles "no `@`" by returning `false` |
| 6 | Extracts the part after the `@` with `substring(at + 1)` (correct off-by-one: `at + 1`, not `at`) |
| 7 | Compares to `host` with `.equals(...)` (NOT `==`) and returns the boolean result |

**Trace check.** Part A: `digitSum(2025)` → sum 0; 2025%10=5 (sum 5, n=202), 202%10=2 (sum 7, n=20), 20%10=0 (sum 7, n=2), 2%10=2 (sum 9, n=0) → loop ends → **9** ✓. `digitSum(0)` → `0>0` false → returns **0** ✓. Part B: `"amy@apcsa.org"` → `at=3`, `substring(4)="apcsa.org"`, `.equals("apcsa.org")` → **true** ✓; `"nobody"` → `at=-1` → **false** ✓. Points sum **4 + 3 = 7**. The String comparison uses `.equals` (no `==` penalty); `substring(at+1)` has correct bounds; no `charAt` anywhere.

---

### Practice FRQ 3 — `Roster` (7 points)

A `Roster` provides two **already-written** helper methods you must call:

```java
/** Returns the name of the student at position i.  Precondition: 0 <= i < size(). */
public String nameAt(int i) { /* implementation not shown */ }

/** Returns the number of students on the roster (>= 0). */
public int size() { /* implementation not shown */ }
```

**Part A (4 points).** Write the instance method `countStartingWith`, which returns how many student names **begin with** the one-character String `letter`. You may assume every name has length ≥ 1 and `letter` has length 1.

```java
/** Returns the number of names on the roster whose first character equals letter.
 *  Precondition: letter has length 1; every name has length >= 1.
 */
public int countStartingWith(String letter) {
    /* to be implemented in Part A */
}
```

For example, if the roster is `["Ana", "Ben", "Amir", "Cleo"]` and `letter` is `"A"`, the method returns `2`.

**Part B (3 points).** Write the instance method `initials`, which returns a String made of the **first character of every name on the roster, in order**, with nothing between them. For the roster above, `initials()` returns `"ABAC"`.

```java
/** Returns the first character of every name, concatenated in roster order. */
public String initials() {
    /* to be implemented in Part B */
}
```

#### Sample solution

```java
public int countStartingWith(String letter) {
    int count = 0;
    for (int i = 0; i < size(); i++) {
        String first = nameAt(i).substring(0, 1);
        if (first.equals(letter)) {
            count++;
        }
    }
    return count;
}

public String initials() {
    String result = "";
    for (int i = 0; i < size(); i++) {
        result += nameAt(i).substring(0, 1);
    }
    return result;
}
```

#### Rubric (7 points)

**Part A — `countStartingWith` (4 points)**

| Pt | Criterion |
|---|---|
| 1 | Declares and initializes a counter to 0 |
| 2 | Loops over all positions `0` through `size() - 1` (correct bounds: `i < size()`), calling the provided `nameAt(i)` |
| 3 | Gets the first character as a one-char String with `substring(0, 1)` (NOT `charAt`) |
| 4 | Compares with `.equals(letter)` (NOT `==`), increments on a match, and returns the count |

**Part B — `initials` (3 points)**

| Pt | Criterion |
|---|---|
| 5 | Initializes an accumulator String (e.g., `""`) and traverses all names with correct bounds |
| 6 | Extracts each name's first character with `substring(0, 1)` and concatenates it onto the accumulator |
| 7 | Returns the assembled String |

**Trace check.** Part A: roster `["Ana","Ben","Amir","Cleo"]`, `letter="A"` → `"A".equals("A")`✔ (1), `"B"`✘, `"A"`✔ (2), `"C"`✘ → **2** ✓. Part B: `"" + "A" + "B" + "A" + "C"` → `"ABAC"` ✓. Points sum **4 + 3 = 7**. First-character access is `substring(0,1)` (no `charAt`); equality uses `.equals` (no `==` penalty); bounds are `< size()` (no off-by-one).

---

### Practice FRQ 4 — `ScoreCard` (7 points)  · *Part B uses `split`*

A `ScoreCard` class works with comma-delimited records. Two static helper methods are provided and **already written** — you must **call** them, not re-implement them:

```java
/** Returns the score recorded for round number r.
 *  Precondition: 1 <= r <= roundCount().
 */
public static int scoreOf(int r) { /* implementation not shown */ }

/** Returns the total number of rounds recorded (>= 0). */
public static int roundCount() { /* implementation not shown */ }
```

**Part A (4 points).** Write `totalScore`, which returns the sum of the scores over all recorded rounds. Rounds are numbered `1` through `roundCount()` inclusive. Use the provided methods.

```java
/** Returns the sum of the scores of all recorded rounds.
 *  Returns 0 if there are no rounds.
 */
public static int totalScore() {
    /* to be implemented in Part A */
}
```

For example, if there are 4 rounds with scores 10, 25, 0, 7, then `totalScore()` returns `42`.

**Part B (3 points).** A player record is a single String of the form `"name,score,score,score"` — a name, then one or more whole-number scores, all separated by commas, for example `"Ana,10,25,7"`. Write `recordTotal`, which returns the **sum of the numeric scores** in the record (the name is **not** a number and must be skipped). You may assume `record` is not `null`, contains at least the name and one score, and that every field after the name parses as an `int`.

```java
/** Returns the sum of the numeric scores in record, which has the form
 *  "name,score,score,...". The first field (name) is skipped.
 *  Precondition: record is not null and has the form above with >= 1 score.
 */
public static int recordTotal(String record) {
    /* to be implemented in Part B */
}
```

For example, `recordTotal("Ana,10,25,7")` returns `42`, and `recordTotal("Bo,5")` returns `5`.

#### Sample solution

```java
public static int totalScore() {
    int sum = 0;
    for (int r = 1; r <= roundCount(); r++) {
        sum += scoreOf(r);
    }
    return sum;
}

public static int recordTotal(String record) {
    String[] parts = record.split(",");
    int sum = 0;
    for (int i = 1; i < parts.length; i++) {
        sum += Integer.parseInt(parts[i]);
    }
    return sum;
}
```

#### Rubric (7 points)

**Part A — `totalScore` (4 points)**

| Pt | Criterion |
|---|---|
| 1 | Declares and initializes an accumulator to 0 (returns 0 when there are no rounds) |
| 2 | Loops over round numbers `1` through `roundCount()` **inclusive** (correct bounds: `r <= roundCount()`) |
| 3 | Calls the provided `scoreOf(r)` (does not re-implement the score lookup) |
| 4 | Adds each score to the accumulator and returns the sum |

**Part B — `recordTotal` (3 points)**

| Pt | Criterion |
|---|---|
| 5 | Splits `record` on `","` with `split(",")` into a `String[]` |
| 6 | Traverses the score fields, **starting at index 1** to skip the name (correct off-by-one: `i = 1`, not `i = 0`), with correct bounds `i < parts.length` |
| 7 | Converts each score field with `Integer.parseInt(parts[i])`, accumulates the sum, and returns it |

**Trace check.** Part A: scores 10,25,0,7 → sum 0; r=1 +10 (10), r=2 +25 (35), r=3 +0 (35), r=4 +7 (42) → returns **42** ✓. Part B: `"Ana,10,25,7"` → `split(",")` = `["Ana","10","25","7"]`, length 4; i=1 `parseInt("10")`=10 (sum 10), i=2 `parseInt("25")`=25 (sum 35), i=3 `parseInt("7")`=7 (sum 42) → returns **42** ✓; `"Bo,5"` → `["Bo","5"]`, i=1 +5 → **5** ✓. Points sum **4 + 3 = 7**. The split delimiter `","` is a literal (no regex metacharacter — in-scope); the loop starts at 1 to skip the name; `Integer.parseInt` is on the Quick Reference.

---

### Practice FRQ 5 — `WordList` (7 points)  · *Part B uses `compareTo`*

A `WordList` class works with a list of words. Two static helper methods are provided and **already written** — you must **call** them, not re-implement them:

```java
/** Returns the word at position i.  Precondition: 0 <= i < wordCount(). */
public static String wordAt(int i) { /* implementation not shown */ }

/** Returns the number of words (>= 1). */
public static int wordCount() { /* implementation not shown */ }
```

**Part A (4 points).** Write `countBefore`, which returns how many words come **strictly before** the String `target` in alphabetical (lexicographic) order. A word `w` comes before `target` when `w.compareTo(target)` is **negative**. Words are numbered `0` through `wordCount() - 1`. Use the provided methods.

```java
/** Returns the number of words that come strictly before target lexicographically.
 *  Precondition: target is not null.
 */
public static int countBefore(String target) {
    /* to be implemented in Part A */
}
```

For example, if the words are `"pear", "apple", "mango", "kiwi"` and `target` is `"mango"`, the method returns `2` (`"apple"` and `"kiwi"` come before `"mango"`; `"pear"` does not, and `"mango"` is not strictly before itself).

**Part B (3 points).** Write `alphabeticallyFirst`, which returns the word that comes **first** in lexicographic order among all the words. You may assume there is at least one word. Use the provided methods.

```java
/** Returns the lexicographically smallest word among all words.
 *  Precondition: wordCount() >= 1.
 */
public static String alphabeticallyFirst() {
    /* to be implemented in Part B */
}
```

For the words above, `alphabeticallyFirst()` returns `"apple"`.

#### Sample solution

```java
public static int countBefore(String target) {
    int count = 0;
    for (int i = 0; i < wordCount(); i++) {
        if (wordAt(i).compareTo(target) < 0) {
            count++;
        }
    }
    return count;
}

public static String alphabeticallyFirst() {
    String first = wordAt(0);
    for (int i = 1; i < wordCount(); i++) {
        if (wordAt(i).compareTo(first) < 0) {
            first = wordAt(i);
        }
    }
    return first;
}
```

#### Rubric (7 points)

**Part A — `countBefore` (4 points)**

| Pt | Criterion |
|---|---|
| 1 | Declares and initializes a counter to 0 |
| 2 | Loops over all positions `0` through `wordCount() - 1` (correct bounds: `i < wordCount()`), calling the provided `wordAt(i)` |
| 3 | Compares with `compareTo`, testing **strictly before** as `wordAt(i).compareTo(target) < 0` (negative, not `<= 0`) |
| 4 | Increments the counter on a match and returns the count |

**Part B — `alphabeticallyFirst` (3 points)**

| Pt | Criterion |
|---|---|
| 5 | Seeds the running "first" word from a **real word** (`wordAt(0)`), not from `""` or `null` |
| 6 | Traverses the remaining words and uses `wordAt(i).compareTo(first) < 0` to detect a word that comes earlier, updating `first` when so |
| 7 | Returns the lexicographically first word |

**Trace check.** Part A: words `"pear","apple","mango","kiwi"`, `target="mango"` → `"pear".compareTo("mango")` is positive ✘; `"apple".compareTo("mango")` negative ✔ (1); `"mango".compareTo("mango")` is 0, not `< 0` ✘; `"kiwi".compareTo("mango")` negative ✔ (2) → returns **2** ✓. Part B: first=`"pear"`; i=1 `"apple".compareTo("pear")`<0 ✔ first=`"apple"`; i=2 `"mango".compareTo("apple")` positive ✘; i=3 `"kiwi".compareTo("apple")` positive ✘ → returns **"apple"** ✓. Points sum **4 + 3 = 7**. `compareTo` is on the Quick Reference; strict-before uses `< 0` (excludes equal words); the running min is seeded from `wordAt(0)` so it is always a real word.

---

## (c) Signature point-losers for Q1

Cross-referenced to [`../reference/killer-errors-cheatsheet.md`](../reference/killer-errors-cheatsheet.md):

| Point-loser | Cheatsheet # | Q1-specific fix |
|---|---|---|
| Using `charAt(i)` for single-character access | #12 | `charAt` is **off the Quick Reference**; use `s.substring(i, i + 1)`, which returns a one-character **String** — the right type for `.equals` comparisons in Part B. |
| `==` to compare String content in Part B | #1 | Use `.equals(...)`. This is a semantic error, not a forgiven syntax slip — it costs the point. |
| Off-by-one loop bounds in Part A | #2 | If the range is "1 through n inclusive", use `i <= n` (or `id <= count()`); if it's "0 through size−1", use `i < size()`. State the inclusivity from the prompt and match it. |
| Mishandling the `indexOf` "not found" case | — (see topic 1.15) | `indexOf` returns `-1` when the substring is absent. **Guard it** (`if (idx == -1) return ...;`) before calling `substring`, or you misformat / throw `StringIndexOutOfBoundsException`. |
| Wrong `substring` bounds (off-by-one on `to`) | — | `substring(from, to)` includes `from`, **excludes** `to`; its length is `to − from`. "Part before index k" is `substring(0, k)`; "part after index k" is `substring(k + 1)`. |
| Misreading `compareTo`'s sign | — (topic 1.15) | `a.compareTo(b)` is **negative** when `a` comes before `b`, `0` when equal, positive when after. "Strictly before" = `< 0` (excludes equal); "before or equal" = `<= 0`. Don't compare String order with `<`/`>` operators — those are for primitives only. |
| Forgetting `split` returns a `String[]` (and the name field) | — (topic 4.6) | `split(",")` returns a `String[]`; index it with `[i]` and bound with `.length` (attribute, no parens). When the first field is a label/name, start the score loop at `i = 1`. Use only a literal delimiter (no regex metacharacters). |
| Re-implementing a provided helper | #13 | If `distanceOf`, `nameAt`, `size`, etc. are given, **call them**. Copying their body inline costs the "use the provided method" point. |
| Leaving Part B blank when Part A was hard | #10 | The two parts score independently — a correct Part B earns its 3 points even if Part A is wrong. Never leave either part blank. |
