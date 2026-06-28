# Topic Coverage Matrix — AP CSA Exam (All 53 Topics)

**Purpose:** The "cover everything" proof for `ap_csa_exam/`. Every question in the bank must be traceable to a row here; no question may target a topic in §3 (exclusions) or use a method not in §2 (Java Quick Reference). The three sections below are the authoritative in-syllabus boundary.

**Sources:** Official College Board CED, *AP Computer Science A Course and Exam Description, Effective Fall 2025* (Course Framework V.1). All EKs, library entries, and exclusion statements are copied verbatim from spec §5, §4, and §3 respectively.

---

## 1. All 53 Topics with Key Testable EKs and Bank Mapping

### Unit 1 — Using Objects & Methods (15–25% of MCQ) · 15 topics

| Topic | Key Testable EK | Bank Item(s) |
|---|---|---|
| **1.1** Algorithms, Compilers & Error Types | Types of errors: syntax (compile-time), logic, run-time, exception; algorithms as step-by-step instructions | `question-bank/mcq-unit-1.md` |
| **1.2** `int`/`double`/`boolean`, Variables | Three primitive types; variable declaration and assignment; literals; naming rules | `question-bank/mcq-unit-1.md` |
| **1.3** Arithmetic, Operators & Expressions | Output with `System.out.print`/`println`; string/char literals and escapes (`\"` `\\` `\n`); `+ - * / %`; **integer division truncates**; **modulo** semantics; operator precedence; `int ÷ 0` → `ArithmeticException` | `question-bank/mcq-unit-1.md`, `question-bank/mcq-analyze-code.md` |
| **1.4** Assignment & `null` | `=` assignment; variable must be initialized before use; `null` as reference literal | `question-bank/mcq-unit-1.md` |
| **1.5** Casting, Overflow & Extreme Values | `(int)` / `(double)` casts; truncation vs rounding `(int)(x + 0.5)`; `Integer.MIN_VALUE` / `Integer.MAX_VALUE`; **integer overflow** wrap-around | `question-bank/mcq-unit-1.md`, `question-bank/mcq-analyze-code.md` |
| **1.6** Compound Assignment & Post-Increment | `+= -= *= /= %=`; post-increment `x++` / post-decrement `x--`; value returned is original | `question-bank/mcq-unit-1.md`, `question-bank/mcq-analyze-code.md` |
| **1.7** APIs, Libraries & Packages | Concept of API; library/package import; attributes (state) vs behaviors (methods) | `question-bank/mcq-unit-1.md` |
| **1.8** Comments, Pre/Postconditions | `//`, `/* */`, `/** */`; **preconditions** (assumed true on entry) and **postconditions** (guaranteed on return) | `question-bank/mcq-unit-1.md` |
| **1.9** Method Signatures, void/non-void, Call-by-Value, Overloading | Method signature (name + param types); void vs return-type; args passed **by value** (copy); **overloading** = same name, different params; flow of control through method calls | `question-bank/mcq-unit-1.md`, `question-bank/mcq-analyze-code.md` |
| **1.10** `static` Class Methods & Dot Operator | `static` methods belong to class not instance; call via `ClassName.method()`; dot operator | `question-bank/mcq-unit-1.md` |
| **1.11** `Math` Methods & `random()` Range | `Math.abs`, `Math.pow`, `Math.sqrt`, `Math.random` [0.0, 1.0); range manipulation: `(int)(Math.random() * n)` → [0, n−1] | `question-bank/mcq-unit-1.md`, `question-bank/mcq-analyze-code.md` |
| **1.12** Objects, Classes & References | Object vs class distinction; reference variables; **all classes extend `Object`** (inherit `toString`, `equals`) | `question-bank/mcq-unit-1.md` |
| **1.13** Constructors & `new` | Constructor syntax; `new`; overloaded constructors; object initialization | `question-bank/mcq-unit-1.md`, `question-bank/frq-q2-class-design.md` |
| **1.14** Instance Methods & `NullPointerException` | Calling instance methods; **`NullPointerException`** when method called on `null` reference | `question-bank/mcq-unit-1.md`, `question-bank/mcq-analyze-code.md` |
| **1.15** `String`: Immutability, Concatenation & Methods | Immutable; `+` concatenation; 0-based indexing; `StringIndexOutOfBoundsException`; 6 String methods (see §2) | `question-bank/mcq-unit-1.md`, `question-bank/mcq-analyze-code.md`, `question-bank/frq-q1-methods-control.md` |

### Unit 2 — Selection & Iteration (25–35% of MCQ) · 12 topics

| Topic | Key Testable EK | Bank Item(s) |
|---|---|---|
| **2.1** Sequencing, Selection, Repetition | Three control flow categories; sequential execution | `question-bank/mcq-unit-2.md` |
| **2.2** Relational Operators | `== != < > <= >=`; comparing **primitives** (value) vs **references** (address); do not use `==` on Strings | `question-bank/mcq-unit-2.md`, `question-bank/mcq-analyze-code.md` |
| **2.3** `if` / `if-else` | Syntax; one- and two-way selection; boolean test | `question-bank/mcq-unit-2.md` |
| **2.4** Nested `if` & `if-else-if` Chains | Multi-way selection; boundary conditions; nested `if` inside `if-else` | `question-bank/mcq-unit-2.md`, `question-bank/mcq-analyze-code.md` |
| **2.5** `!` `&&` `||`, Precedence & Short-Circuit | Logical NOT/AND/OR; precedence (`!` > `&&` > `||`); **short-circuit evaluation** stops early | `question-bank/mcq-unit-2.md`, `question-bank/mcq-analyze-code.md` |
| **2.6** Boolean Equivalence, De Morgan & `equals` | Truth tables; **De Morgan's laws** (`!(A&&B)` = `(!A\|\|!B)`); `==` compares references; use `.equals()` for String/object content; `null` check | `question-bank/mcq-unit-2.md`, `question-bank/mcq-analyze-code.md` |
| **2.7** `while` Loop & Off-by-One | `while` syntax; loop body; infinite loop risk; **off-by-one** boundary errors | `question-bank/mcq-unit-2.md`, `question-bank/mcq-analyze-code.md` |
| **2.8** `for` Loop: Init/Condition/Update & while Equivalence | `for` loop anatomy; converting `for` ↔ `while`; loop variable scope | `question-bank/mcq-unit-2.md`, `question-bank/mcq-analyze-code.md` |
| **2.9** Standard Iteration Algorithms | Divisibility test, digit extraction, count occurrences, find min/max, accumulate sum/average | `question-bank/mcq-unit-2.md`, `question-bank/mcq-analyze-code.md`, `question-bank/frq-q1-methods-control.md` |
| **2.10** String Iteration Algorithms | Traverse with `substring`; count substrings; reverse a string; **substring property** (len = to − from) | `question-bank/mcq-unit-2.md`, `question-bank/mcq-analyze-code.md`, `question-bank/frq-q1-methods-control.md` |
| **2.11** Nested Loops | Nested iteration over 2D-like structures; tracing row-column patterns | `question-bank/mcq-unit-2.md`, `question-bank/mcq-analyze-code.md` |
| **2.12** Informal Runtime / Statement Execution Count | Count how many times a statement executes; compare loop structures (linear vs quadratic); no Big-O notation required | `question-bank/mcq-unit-2.md`, `question-bank/mcq-analyze-code.md` |

### Unit 3 — Class Creation (10–18% of MCQ) · 9 topics

| Topic | Key Testable EK | Bank Item(s) |
|---|---|---|
| **3.1** Abstraction, Attributes vs Behaviors, Code Reuse | Data abstraction vs procedural abstraction; instance var vs class var; **code reuse via methods + parameters** | `question-bank/mcq-unit-3.md`, `question-bank/frq-q2-class-design.md` |
| **3.2** Impact, Ethics & IP | **Reliability, unintended consequences, harm**; intellectual property; open-source permissions | `question-bank/mcq-unit-3.md` |
| **3.3** Encapsulation | Classes and constructors always `public`; instance variables `private`; hiding implementation details | `question-bank/mcq-unit-3.md`, `question-bank/frq-q2-class-design.md` |
| **3.4** Constructors, Default Values & Defensive Copies | Constructors initialize **all** instance vars; **defensive copy of mutable parameters**; default constructor; default values (`0`, `0.0`, `false`, `null`) | `question-bank/mcq-unit-3.md`, `question-bank/mcq-analyze-code.md`, `question-bank/frq-q2-class-design.md` |
| **3.5** void/non-void Methods, Accessors & Mutators | Return-by-value; **accessor** = non-void (returns a value without changing state); **mutator** = void (modifies state); primitive args copied | `question-bank/mcq-unit-3.md`, `question-bank/frq-q2-class-design.md` |
| **3.6** Object-Reference Params, Aliases & Private Access | **Object-reference params create aliases**; mutating through a parameter changes the original; returning a reference; **`private` members accessible only within the same class** | `question-bank/mcq-unit-3.md`, `question-bank/mcq-analyze-code.md` |
| **3.7** `static` Variables/Methods & `final` | Class (static) vars/methods vs instance; rules for calling static from instance and vice versa; `final` = cannot reassign | `question-bank/mcq-unit-3.md` |
| **3.8** Scope, Local Variables & Shadowing | Local vars and params have no access modifier; **shadowing** when a local name matches an instance var | `question-bank/mcq-unit-3.md`, `question-bank/mcq-analyze-code.md` |
| **3.9** `this` Keyword | `this` refers to the current object; disambiguation from shadowed fields; **no `this` in static context** | `question-bank/mcq-unit-3.md`, `question-bank/frq-q2-class-design.md` |

### Unit 4 — Data Collections (30–40% of MCQ) · 17 topics

| Topic | Key Testable EK | Bank Item(s) |
|---|---|---|
| **4.1** Ethics: Privacy, Algorithmic Bias & Data Fitness | Privacy risks of data collection; **algorithmic bias**; fitness of data for a purpose | `question-bank/mcq-unit-4.md` |
| **4.2** Data Sets & One-at-a-Time Access | Concept of a data set; accessing elements sequentially | `question-bank/mcq-unit-4.md` |
| **4.3** Array Creation, `length` Attribute & Defaults | `new type[n]`; **`arr.length` is an attribute (not a method)**; default values; initializer list `{...}`; `[]` syntax; valid indices 0..length−1; `ArrayIndexOutOfBoundsException` | `question-bank/mcq-unit-4.md`, `question-bank/mcq-analyze-code.md` |
| **4.4** Array Traversal: Indexed vs Enhanced-for | Index-based `for`; **enhanced-for copies the element (primitive copy; object reference copy)**; method call on an object element mutates the object | `question-bank/mcq-unit-4.md`, `question-bank/mcq-analyze-code.md` |
| **4.5** Standard Array Algorithms (9) | Max/min, sum/average, count, linear search, reverse in place, shift elements, copy array, replace elements, sort | `question-bank/mcq-unit-4.md`, `question-bank/mcq-analyze-code.md`, `question-bank/frq-q4-2d-array.md` |
| **4.6** Text Files: `File` + `Scanner`, `split`, `close` | `File(String)` + `Scanner(File)`; `throws IOException`; `java.io` import; **`hasNext()` loop**; `split(String del)` to parse columns; `close()`; no keyboard `Scanner`; no `nextLine` mixed with token methods; no regex in `split` | `question-bank/mcq-unit-4.md`, `question-bank/mcq-analyze-code.md` |
| **4.7** Wrapper Classes: `Integer`, `Double`, Autoboxing | `Integer` / `Double` are **immutable**; **autoboxing** (primitive → wrapper) / **unboxing** (wrapper → primitive); `Integer.parseInt(String)`, `Double.parseDouble(String)` | `question-bank/mcq-unit-4.md`, `question-bank/mcq-analyze-code.md` |
| **4.8** `ArrayList<E>`: Creation & 6 Methods | `ArrayList<E>`; mutable size; `java.util` import; 6 methods (see §2); valid indices 0..size−1 | `question-bank/mcq-unit-4.md`, `question-bank/frq-q3-arraylist.md` |
| **4.9** ArrayList Traversal & Modification Pitfalls | Index-based and enhanced-for traversal; **delete-while-traversing: iterate backwards or use index adjustment**; `IndexOutOfBoundsException`; **enhanced-for + structural modify → `ConcurrentModificationException`** | `question-bank/mcq-unit-4.md`, `question-bank/mcq-analyze-code.md`, `question-bank/frq-q3-arraylist.md` |
| **4.10** ArrayList Algorithms (11) | 9 standard algorithms + insert-in-order + delete-by-condition; multi-structure simultaneous traversal | `question-bank/mcq-unit-4.md`, `question-bank/mcq-analyze-code.md`, `question-bank/frq-q3-arraylist.md` |
| **4.11** 2D Arrays: Structure & Indexing | Array-of-arrays; `[row][col]` syntax; `a.length` = number of rows; `a[0].length` = number of columns; **no jagged arrays** | `question-bank/mcq-unit-4.md`, `question-bank/frq-q4-2d-array.md` |
| **4.12** 2D Array Traversal: Row-Major, Col-Major & Enhanced-for | Nested loops for row-major / col-major / custom order; **enhanced-for outer variable = a 1D array (one row)** | `question-bank/mcq-unit-4.md`, `question-bank/mcq-analyze-code.md`, `question-bank/frq-q4-2d-array.md` |
| **4.13** 2D Array Algorithms | Over whole array, individual row, individual column, or sub-section; sum, count, find max/min in 2D | `question-bank/mcq-unit-4.md`, `question-bank/mcq-analyze-code.md`, `question-bank/frq-q4-2d-array.md` |
| **4.14** Linear Search | Sequential scan from either end; returning index or -1 / element; 2D = linear search per row | `question-bank/mcq-unit-4.md`, `question-bank/mcq-analyze-code.md` |
| **4.15** Selection Sort & Insertion Sort (Trace) | Selection: find min of unsorted segment, swap to front; insertion: insert next element into sorted prefix; **trace-only — writing sort code is out of scope** | `question-bank/mcq-unit-4.md`, `question-bank/mcq-analyze-code.md` |
| **4.16** Recursion (Trace Only) | Base case; recursive case; each call has its own local variables; trace the call stack; **writing recursive code is out of scope** | `question-bank/mcq-unit-4.md`, `question-bank/mcq-analyze-code.md` |
| **4.17** Binary Search & Merge Sort (Trace) | Binary search: sorted array, halve the search space each step; merge sort: recursive divide-and-merge; both **trace-only** | `question-bank/mcq-unit-4.md`, `question-bank/mcq-analyze-code.md` |

**Topic counts per unit:** Unit 1 = 15, Unit 2 = 12, Unit 3 = 9, Unit 4 = 17 → **Total = 53.**

---

## 2. Exact Testable Library (Java Quick Reference — Verbatim)

Only what is on the provided Quick Reference sheet is testable. Method counts: String (8), Integer (3), Double (1), Math (5), ArrayList (6), File (1), Scanner (8), Object (2).

**Important: `charAt` is NOT on the Quick Reference and is NOT testable. `Math.min` and `Math.max` are NOT on the Quick Reference and are NOT testable.** Single-character access = `substring(i, i+1)`.

### `String`

| Method / Note | Behavior |
|---|---|
| `String(String str)` | Constructs a new `String` with value `str` |
| `int length()` | Returns the number of characters |
| `String substring(int from, int to)` | Returns substring from index `from` to `to - 1` (inclusive) |
| `String substring(int from)` | Returns substring from index `from` to end |
| `int indexOf(String str)` | Returns first index of `str`; returns `-1` if not found |
| `boolean equals(Object other)` | Returns `true` if same character sequence |
| `int compareTo(String other)` | Returns negative / 0 / positive (lexicographic order) |
| `String[] split(String delimiter)` | Splits on literal delimiter; returns array of tokens |

*(No `charAt`, no `toUpperCase`/`toLowerCase`, no `replace`/`trim`. Single char at index `i` = `s.substring(i, i + 1)`.)*

### `Integer`

| Method / Constant | Description |
|---|---|
| `Integer.MIN_VALUE` | Minimum int value (−2,147,483,648) |
| `Integer.MAX_VALUE` | Maximum int value (2,147,483,647) |
| `static int parseInt(String s)` | Parses `s` as a signed decimal integer |

*(No constructor, no `intValue`.)*

### `Double`

| Method | Description |
|---|---|
| `static double parseDouble(String s)` | Parses `s` as a double |

*(No constructor, no `doubleValue`.)*

### `Math`

| Method | Description |
|---|---|
| `static int abs(int x)` | Absolute value of `x` |
| `static double abs(double x)` | Absolute value of `x` |
| `static double pow(double base, double exp)` | Returns `base` raised to `exp` |
| `static double sqrt(double x)` | Returns positive square root of `x` |
| `static double random()` | Returns a random double in [0.0, 1.0) |

*(No `Math.min`, no `Math.max`, no `Math.round`.)*

### `ArrayList<E>`

| Method | Description |
|---|---|
| `int size()` | Returns number of elements |
| `boolean add(E obj)` | Appends `obj` to end; returns `true` |
| `void add(int index, E obj)` | Inserts `obj` at `index`; shifts right |
| `E get(int index)` | Returns element at `index` |
| `E set(int index, E obj)` | Replaces element at `index`; returns old element |
| `E remove(int index)` | Removes element at `index`; shifts left; returns removed element |

### `File`

| Constructor | Description |
|---|---|
| `File(String fileName)` | Creates a `File` object representing the file named `fileName` |

### `Scanner`

| Constructor / Method | Description |
|---|---|
| `Scanner(File f)` | Creates a `Scanner` to read from file `f` |
| `int nextInt()` | Reads and returns next token as `int` |
| `double nextDouble()` | Reads and returns next token as `double` |
| `boolean nextBoolean()` | Reads and returns next token as `boolean` |
| `String nextLine()` | Reads and returns the rest of the current line |
| `String next()` | Reads and returns next whitespace-delimited token |
| `boolean hasNext()` | Returns `true` if another token exists |
| `void close()` | Closes the scanner |

### `Object`

| Method | Description |
|---|---|
| `boolean equals(Object other)` | Returns `true` if this object equals `other` |
| `String toString()` | Returns a string representation of this object |

---

**Length/size confusion drill:** `arr.length` (array attribute, no parens) · `str.length()` (String method, with parens) · `list.size()` (ArrayList method). Classic exam trap.

---

## 3. What Is NOT Tested

### 3a. Verbatim Exclusion Statements (19 total)

All 19 exclusions from the CED — no question may target these:

1. **Other primitive types** — `long`, `short`, `byte`, `float`, `char` are outside the scope of the course.
2. **Special double values** — `NaN` and infinity (positive/negative) are outside the scope.
3. **Modulo with negative dividend or non-positive divisor** — behavior of `a % b` when `a < 0` or `b ≤ 0` is outside the scope.
4. **`double` divide-by-zero** — the result of dividing a `double` by zero (produces `Infinity` or `NaN`) is outside the scope.
5. **Assignment inside an expression** — using `=` as part of a larger expression (e.g., `while ((c = in.read()) != -1)`) is outside the scope.
6. **Prefix increment/decrement** — `++x` and `--x` as prefix operators are outside the scope.
7. **Increment/decrement embedded in array indexing** — expressions such as `arr[x++]` are outside the scope.
8. **`BigDecimal`-style exact decimal arithmetic** — arbitrary-precision decimal types are outside the scope.
9. **Designing inheritance relationships** — designing and implementing inheritance hierarchies (subclasses, `extends`) is outside the scope.
10. **Overriding `toString`** — writing a custom `toString` method in a user-defined class is outside the scope.
11. **`equals` for non-String objects** — implementing or calling a custom `equals` on objects other than String (where `Object.equals` behavior matters) is outside the scope.
12. **Overriding `equals`** — writing a custom `equals` method in a user-defined class is outside the scope.
13. **Keyboard `Scanner` input** — using `Scanner` with `System.in` (keyboard input) is outside the scope; only `Scanner(File)` is tested.
14. **Mixing `nextLine` with other Scanner methods on one source** — calling `nextLine()` after `nextInt()` / `nextDouble()` / `next()` on the same `Scanner` is outside the scope.
15. **Regex special characters in `split`** — using regular-expression metacharacters as the delimiter in `split` is outside the scope; only literal-delimiter splitting is tested.
16. **Jagged (non-rectangular) 2D arrays** — 2D arrays where rows have different lengths are outside the scope.
17. **Writing recursive code** — writing or designing recursive methods is outside the scope; recursion is **trace-only** on the exam.
18. **Searches other than linear and binary search** — hash-based, tree-based, or other search algorithms are outside the scope.
19. **Sorts other than selection, insertion, and merge sort** — quicksort, heapsort, bubble sort, and all other sorting algorithms are outside the scope.

### 3b. Out-of-Scope by Omission (not in CED at all)

These constructs never appear in the CED and must not be taught or tested:

| Construct | Note |
|---|---|
| `do-while` loop | Not in CED; `while` and `for` only |
| `switch` / `switch` expression | Not in CED; `if-else-if` chains only |
| Ternary `?:` operator | Not in CED |
| Labeled `break` / `continue` | Not in CED |
