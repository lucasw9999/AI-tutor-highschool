# Java Quick Reference — Memorization Drills

**Purpose:** High-frequency trap drills for the methods on the provided Java Quick Reference sheet. Master these cold — the sheet is provided at the exam but exam speed requires instant recall of the edge-case behaviors. For the full library table (all methods with signatures), see [`../topic-coverage-matrix.md` §2](../topic-coverage-matrix.md).

> **Correction notice:** `../../day-1-diagnostic.md` (B3) and `../../python-to-java-cheatsheet.md` (Strings table) both teach `s.charAt(i)`. **`charAt` is NOT on the Java Quick Reference and returns `char` — an excluded primitive type.** The exam models single characters as `substring(i, i+1)`, which returns a `String`. Use `substring(i, i+1)` everywhere. This doc corrects that drift.

---

## 1. String — 8 Methods (count: 8, not 6)

The full list on the reference sheet:

| # | Method | Returns | Notes |
|---|---|---|---|
| 1 | `String(String s)` | `String` | Constructor — copy a String |
| 2 | `int length()` | `int` | Number of characters |
| 3 | `String substring(int from, int to)` | `String` | Chars at indices `from` through `to-1` (**`to` is exclusive**) |
| 4 | `String substring(int from)` | `String` | From `from` to end |
| 5 | `int indexOf(String str)` | `int` | First index of `str`; returns **`-1` if not found** |
| 6 | `boolean equals(Object other)` | `boolean` | Content equality (not reference) |
| 7 | `int compareTo(String other)` | `int` | Negative/0/positive = before/equal/after |
| 8 | `String[] split(String delimiter)` | `String[]` | Split on literal delimiter; returns array of parts |

**Trap 1 — `substring(from, to)` is EXCLUSIVE of `to`.**

```
String s = "hello";
s.substring(1, 3)  // "el"   → indices 1 and 2 only; index 3 is NOT included
s.substring(2, 2)  // ""     → from == to → empty string
s.substring(0, 5)  // "hello" → full string (length = 5)
```

Mental model: `to - from` = length of result.

**Trap 2 — Single character = `substring(i, i+1)`, NOT `charAt`.**

`charAt` is absent from the Java Quick Reference. It also returns `char` — a primitive type excluded from the exam (only `int`, `double`, `boolean` are in-scope primitives). The exam uses:

```java
String s = "hello";
String ch = s.substring(2, 3);   // "l"  ← returns String
// NEVER: char c = s.charAt(2);  ← charAt is off the reference sheet
```

**Trap 3 — Valid index range is `0` through `length() - 1`.**

```java
String s = "hello";  // length = 5, valid indices 0..4
s.substring(0, 5);   // OK — last valid to = length()
s.substring(5, 5);   // OK — empty string
s.substring(0, 6);   // StringIndexOutOfBoundsException
```

**Trap 4 — `indexOf` returns `-1`, not an exception, when not found.**

```java
"hello".indexOf("z")    // -1
"hello".indexOf("ell")  // 1
"hello".indexOf("")     // 0
```

**Quick self-test — String:**

| Question | Answer |
|---|---|
| `"abcde".substring(1, 4)` | `"bcd"` |
| `"abcde".substring(3)` | `"de"` |
| Single char at index 2 of `"abcde"` | `"abcde".substring(2, 3)` → `"c"` |
| `"abcde".indexOf("cd")` | `2` |
| `"abcde".indexOf("z")` | `-1` |
| `"hi".length()` | `2` |

---

## 2. The Three "Length" Forms — Classic Confusion

| Context | Syntax | Type | Parens? |
|---|---|---|---|
| **Array** | `arr.length` | attribute | No parens |
| **String** | `s.length()` | method | Yes, parens `()` |
| **ArrayList** | `list.size()` | method | Yes, parens `()` — different name too |

```java
int[] nums = {10, 20, 30};
int arrLen = nums.length;          // attribute — no ()

String s = "hello";
int strLen = s.length();           // method — () required

ArrayList<Integer> list = new ArrayList<>();
list.add(5);
int listLen = list.size();         // method — size(), not length()
```

**2D arrays follow the array rule:**

```java
int[][] grid = new int[3][4];
int rows = grid.length;       // 3  — attribute
int cols = grid[0].length;    // 4  — attribute on inner array
```

**Quick self-test — length forms:**

| Question | Answer |
|---|---|
| How many elements in `int[] a = new int[7]`? | `a.length` → `7` |
| How many chars in `String s = "test"`? | `s.length()` → `4` |
| How many elements in `ArrayList<String> lst` with 3 items? | `lst.size()` → `3` |
| Rows in `int[][] g = new int[5][2]`? | `g.length` → `5` |
| Cols in that same grid? | `g[0].length` → `2` |

---

## 3. `Math.random()` and Range Scaling

`Math.random()` returns a `double` in `[0.0, 1.0)` — **includes 0.0, excludes 1.0.**

**General scaling formula to get a random `int` in `[low, high]` inclusive:**

```java
int result = (int)(Math.random() * (high - low + 1)) + low;
```

**Common cases:**

| Desired range | Code | Notes |
|---|---|---|
| `[0, n-1]` (n choices) | `(int)(Math.random() * n)` | Basic form |
| `[1, n]` (1 through n) | `(int)(Math.random() * n) + 1` | Die roll: n=6 → 1..6 |
| `[a, b]` inclusive | `(int)(Math.random() * (b - a + 1)) + a` | General |

**Step-by-step derivation (burn this in):**

```
Math.random()               → [0.0, 1.0)
Math.random() * n           → [0.0, n)        e.g. n=6: [0.0, 6.0)
(int)(Math.random() * n)    → {0, 1, 2, ..., n-1}  (truncation, not rounding)
(int)(Math.random() * n)+1  → {1, 2, ..., n}
```

**Trap — `Math.random()` uses truncation via `(int)` cast, not rounding.**

```java
(int)(0.9999) = 0    // truncates toward zero
(int)(1.0)    = 1    // but Math.random() never reaches 1.0
```

**Other Math methods on the reference sheet:**

| Method | Returns | Notes |
|---|---|---|
| `Math.abs(int x)` | `int` | Absolute value |
| `Math.abs(double x)` | `double` | Absolute value |
| `Math.pow(double base, double exp)` | `double` | `Math.pow(2, 10)` = 1024.0 |
| `Math.sqrt(double x)` | `double` | Square root |

**Not on the sheet:** `Math.min`, `Math.max`, `Math.round` — do not use in FRQ answers.

---

## 4. `Integer` and `Double` Wrappers — Autoboxing and Parsing

### 4a. Integer (3 items on reference sheet)

| Item | Type | Value / Use |
|---|---|---|
| `Integer.MIN_VALUE` | constant | Smallest `int`: `−2,147,483,648` |
| `Integer.MAX_VALUE` | constant | Largest `int`: `2,147,483,647` |
| `Integer.parseInt(String s)` | static method | Converts `"42"` → `42` (int) |

### 4b. Double (1 item on reference sheet)

| Item | Type | Use |
|---|---|---|
| `Double.parseDouble(String s)` | static method | Converts `"3.14"` → `3.14` (double) |

### 4c. Autoboxing / Unboxing

`ArrayList<Integer>` cannot store primitive `int` directly. Java auto-converts:

```java
ArrayList<Integer> list = new ArrayList<>();
list.add(5);           // autoboxing: int 5 → Integer(5)
int x = list.get(0);  // unboxing: Integer(5) → int 5
```

**Trap — `Integer` objects are immutable.** `list.set(0, list.get(0) + 1)` works (creates a new `Integer`); trying to "increment in place" with a reference does nothing useful.

**Trap — use `Integer.parseInt` for file-reading.** When reading a number from a text file via `Scanner.next()` or `split()`, the value arrives as a `String`:

```java
// Reading "42" from a file:
String token = sc.next();
int n = Integer.parseInt(token);   // correct
```

**Quick self-test — wrappers:**

| Question | Answer |
|---|---|
| Convert `"100"` to int | `Integer.parseInt("100")` → `100` |
| Convert `"2.5"` to double | `Double.parseDouble("2.5")` → `2.5` |
| What is `Integer.MIN_VALUE`? | Smallest int, roughly −2.1 billion |
| Is `char` a testable primitive? | No — only `int`, `double`, `boolean` |

---

## 5. ArrayList — 6 Methods

| # | Method | Notes |
|---|---|---|
| 1 | `int size()` | Number of elements |
| 2 | `boolean add(E obj)` | Appends to end |
| 3 | `void add(int index, E obj)` | Inserts at index; shifts right |
| 4 | `E get(int index)` | Returns element at index |
| 5 | `E set(int index, E obj)` | Replaces element; returns old value |
| 6 | `E remove(int index)` | Removes element; shifts left; returns removed |

Valid indices: `0` through `size() - 1`. Accessing outside throws `IndexOutOfBoundsException`.

---

## 6. Scanner + File (File Reading Only)

The exam tests **file-based** Scanner only. Keyboard Scanner and mixing `nextLine` with other methods are explicitly excluded from the CED.

| Method | Returns | Notes |
|---|---|---|
| `Scanner(File f)` | — | Constructor; method header needs `throws IOException` |
| `hasNext()` | `boolean` | `true` if more tokens remain |
| `next()` | `String` | Next whitespace-delimited token |
| `nextLine()` | `String` | Reads rest of current line |
| `nextInt()` | `int` | Next token as int |
| `nextDouble()` | `double` | Next token as double |
| `nextBoolean()` | `boolean` | Next token as boolean |
| `close()` | `void` | Close the file |

**Standard file-read loop pattern:**

```java
Scanner sc = new Scanner(new File("data.txt"));
while (sc.hasNext()) {
    String token = sc.next();
    // process token
}
sc.close();
```

---

## 7. Object Methods

| Method | Notes |
|---|---|
| `boolean equals(Object other)` | Override to compare content (Q2 FRQ) |
| `String toString()` | Override to return a string representation (Q2 FRQ) |

Overriding (inheritance design) is excluded from the exam. But Q2 Class Design FRQ may ask you to implement `equals` or `toString` for your own class.

---

## 8. Summary Drill Card

Read each prompt → answer before looking right.

| Prompt | Answer |
|---|---|
| `"hello".substring(1, 3)` | `"el"` |
| Single char at index 0 of `"abc"` | `"abc".substring(0, 1)` → `"a"` |
| Can you use `charAt` on the exam? | No — not on reference sheet; returns excluded `char` |
| Array length of `int[] a = new int[5]` | `a.length` (no parens) |
| String length of `"hello"` | `"hello".length()` (parens) |
| ArrayList item count | `list.size()` |
| `Math.random()` range | `[0.0, 1.0)` |
| Random int 1 through 10 | `(int)(Math.random() * 10) + 1` |
| Parse `"7"` as int | `Integer.parseInt("7")` |
| Parse `"3.5"` as double | `Double.parseDouble("3.5")` |
| How many String methods on the sheet? | **8** (including `String(String)` constructor and `split`) |
| `"ab".indexOf("z")` | `-1` (not found) |
| Does `Math.random()` ever return `1.0`? | No — upper bound is exclusive |
