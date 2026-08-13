# MCQ Bank — Analyze Code (trace loops, strings, arrays, objects, recursion)

**What this is.** The biggest practice slice on the exam: **P3 Analyze Code (37–53% of MCQ)**. Every item here is a *trace* — read the code, simulate it line by line, and pick the result. No item asks you to *write* code; that is Develop (P2) and lives in the unit packs and FRQ banks.

**How to use it.** Cover the options, hand-trace on scratch paper, then check. Target **≥85% accuracy at ~2:09/question**. If you miss one, the leak is almost always a boundary (off-by-one, exclusive `to`), a short-circuit you skipped, a reference-vs-value mix-up, or losing your place in a nested loop / recursive stack — fix the *process*, not just the one answer.

**In-syllabus pledge.** Only the Java Quick Reference library (no `charAt`, no `Math.min/max` — single char is `s.substring(i, i + 1)`). No inheritance, no `HashMap`. Recursion items are **trace-only**. All items original.

> Format: each item is tagged `[topic N.x][practice P.Y]` (P3 = Analyze, with a few P4 "describe the behavior" items). The topic maps to `topic-coverage-matrix.md`.

---

## A. Integers, operators, casting, overflow

**Q1. (Analyze Code · 1.3 integer division & modulo)**
What is printed?
```java
int a = 17, b = 5;
System.out.println(a / b + "." + a % b);
```
A) `3.4`   B) `3.0`   C) `3.2`   D) `4.2`

**Answer: C.** Integer division `17 / 5 = 3`; `17 % 5 = 2`; concatenated with `"."` (string mode once a String appears) → `"3.2"`.
`[topic 1.3][practice P3]`

---

**Q2. (Analyze Code · 1.3 operator precedence)**
What is printed?
```java
System.out.println(2 + 3 * 4 - 10 / 3);
```
A) `11`   B) `12`   C) `9`   D) `7`

**Answer: A.** `*` and `/` bind first: `3*4 = 12`, `10/3 = 3` (integer). Then `2 + 12 - 3 = 11`.
`[topic 1.3][practice P3]`

---

**Q3. (Analyze Code · 1.3 concatenation left-to-right)**
What is printed?
```java
System.out.println(1 + 2 + "x" + 1 + 2);
```
A) `3x3`   B) `12x12`   C) `1212x`   D) `3x12`

**Answer: D.** Evaluated left to right: `1+2 = 3` (still ints), then `3 + "x" = "3x"`, then `"3x"+1 = "3x1"`, `+2 = "3x12"`.
`[topic 1.3][practice P3]`

---

**Q4. (Analyze Code · 1.3 int divide-by-zero)**
What is the result of running this segment?
```java
int x = 8, y = 0;
System.out.println(x / y);
```
A) `0`   B) `8`   C) The program throws an `ArithmeticException`.   D) It prints `Infinity`.

**Answer: C.** Integer division by zero throws `ArithmeticException` at runtime before anything prints. (`Infinity` only arises from `double` division like `8.0 / 0.0`, not integer division.)
`[topic 1.3][practice P3]`

---

**Q5. (Analyze Code · 1.5 cast truncates)**
What is printed?
```java
double d = 9.99;
System.out.println((int) d);
```
A) `10`   B) `9`   C) `9.99`   D) `9.0`

**Answer: B.** `(int)` **truncates** toward zero (it does not round): `9.99 → 9`.
`[topic 1.5][practice P3]`

---

**Q6. (Analyze Code · 1.5 round-via-cast trick)**
What is printed?
```java
double price = 4.5;
int rounded = (int)(price + 0.5);
System.out.println(rounded);
```
A) `4`   B) `4.5`   C) `5`   D) `5.0`

**Answer: C.** `4.5 + 0.5 = 5.0`; `(int)` truncates `5.0 → 5`. The `+0.5`-then-truncate idiom rounds to nearest; the result is an `int`, so no decimal point.
`[topic 1.5][practice P3]`

---

**Q7. (Analyze Code · 1.5 cast binds before divide)**
What is printed?
```java
int a = 7, b = 2;
System.out.println((double) a / b);
```
A) `3.0`   B) `3.5`   C) `3`   D) `4.0`

**Answer: B.** The cast applies to `a` first → `7.0`, then `7.0 / 2` is **double** division = `3.5`. (Contrast `(double)(a / b)`, which truncates first → `3.0`.)
`[topic 1.5][practice P3]`

---

**Q8. (Analyze Code · 1.5 integer overflow wrap-around)**
What is printed?
```java
int big = Integer.MAX_VALUE;
System.out.println(big + 1);
```
A) `2147483648`   B) `Integer.MAX_VALUE`   C) `-2147483648`   D) `0`

**Answer: C.** Adding 1 to `Integer.MAX_VALUE` **overflows** and wraps to `Integer.MIN_VALUE` = `-2147483648`. No exception is thrown for overflow, and it does not saturate at the max or reset to `0`.
`[topic 1.5][practice P3]`

---

**Q9. (Analyze Code · 1.6 post-increment returns old value)**
What is printed?
```java
int x = 5;
int y = x++;
System.out.println(x + " " + y);
```
A) `6 5`   B) `6 6`   C) `5 6`   D) `5 5`

**Answer: A.** `x++` returns the **original** value (5) to `y`, then increments `x` to 6. So `x` is 6, `y` is 5.
`[topic 1.6][practice P3]`

---

**Q10. (Analyze Code · 1.6 compound assignment)**
What is printed?
```java
int n = 20;
n -= 3;
n *= 2;
n %= 7;
System.out.println(n);
```
A) `34`   B) `5`   C) `0`   D) `6`

**Answer: D.** `20 - 3 = 17`; `17 * 2 = 34`; `34 % 7 = 6` (34 = 4·7 + 6).
`[topic 1.6][practice P3]`

---

## B. Math methods and random ranges

**Q11. (Analyze Code · 1.11 Math.pow returns double)**
What is printed?
```java
System.out.println(Math.pow(2, 5));
```
A) `32`   B) `10.0`   C) `32.0`   D) `25.0`

**Answer: C.** `Math.pow(2, 5)` returns a **double**, `2^5 = 32.0` (printed with the decimal point).
`[topic 1.11][practice P3]`

---

**Q12. (Analyze Code · 1.11 Math.abs / Math.sqrt)**
What is printed?
```java
System.out.println(Math.abs(-9) + (int) Math.sqrt(20));
```
A) `14`   B) `9`   C) `13.0`   D) `13`

**Answer: D.** `Math.abs(-9) = 9` (int overload). `Math.sqrt(20) ≈ 4.47`, cast to `int` truncates to `4`. `9 + 4 = 13`.
`[topic 1.11][practice P3]`

---

**Q13. (Analyze Code · 1.11 random range)**
Which expression produces a random integer in the range **5 to 10 inclusive**?
```java
// Math.random() returns a double in [0.0, 1.0)
```
A) `(int)(Math.random() * 10) + 5`   B) `(int)(Math.random() * 6) + 5`   C) `(int)(Math.random() * 5) + 10`   D) `(int)(Math.random() * 11)`

**Answer: B.** `(int)(Math.random()*6)` yields `0..5`; adding 5 shifts to `5..10` (6 values, inclusive). This is a trace of the standard range formula `(int)(Math.random()*count) + min`.
`[topic 1.11][practice P3]`

---

## C. Booleans, relational, short-circuit, De Morgan

**Q14. (Analyze Code · 2.5 short-circuit && guards divide)**
What is printed?
```java
int x = 4, y = 0;
if (y != 0 && x / y > 1) {
    System.out.println("A");
} else {
    System.out.println("B");
}
```
A) `A`   B) `B`   C) An `ArithmeticException` is thrown.   D) Nothing.

**Answer: B.** `y != 0` is `false`, so `&&` **short-circuits**: `x / y` is never evaluated, no exception. The `else` prints `B`.
`[topic 2.5][practice P3]`

---

**Q15. (Analyze Code · 2.5 short-circuit || skips second test)**
How many times does `check()` run?
```java
boolean b = true;
if (b || check()) {
    System.out.println("done");
}
// check() prints nothing relevant; question is how many times it is called
```
A) 1   B) 2   C) 3   D) 0

**Answer: D.** `true || ...` short-circuits — once the left side is `true`, the right operand `check()` is **never called**. (A) is the count if you think `||` always evaluates the right side; (B) double-counts a re-evaluation when the body runs; (C) imagines the `if` re-polls `check()` until it settles.
`[topic 2.5][practice P3]`

---

**Q16. (Analyze Code · 2.5 logical precedence ! > && > ||)**
What is the value of `result`?
```java
boolean a = true, b = false, c = true;
boolean result = a || b && !c;
```
A) `true`   B) `false`   C) It does not compile — `&&` and `||` cannot be combined without parentheses.   D) It is unspecified — the result depends on operand evaluation order.

**Answer: A.** Precedence is `!` > `&&` > `||`: `!c = false`; then `b && false = false`; then `a || false = true`. (B) is the wrong-precedence value from grouping left to right as `(a || b) && !c` = `true && false` = `false`; (C) is false — Java fully defines this precedence, so no parentheses are required; (D) is false — operand order is fully specified (left to right), so the result is determinate.
`[topic 2.5][practice P3]`

---

**Q17. (Analyze Code · 2.6 De Morgan equivalence)**
Given `int x`, which expression is **always equal** to `!(x > 0 && x < 10)`?
A) `x <= 0 && x >= 10`   B) `x < 0 || x > 10`   C) `x <= 0 || x >= 10`   D) `!(x > 0) && !(x < 10)`

**Answer: C.** De Morgan: `!(A && B)` = `!A || !B`. `!(x>0)` = `x<=0`, `!(x<10)` = `x>=10`, joined by `||`.
`[topic 2.6][practice P3]`

---

**Q18. (Analyze Code · 2.2 == compares int values)**
What is printed?
```java
int a = 3, b = 3;
System.out.println(a == b);
```
A) `true`   B) `false`   C) Compile error   D) `3`

**Answer: A.** For **primitives**, `==` compares values; `3 == 3` is `true`. (`==` is the value test for primitives — only for *objects* does it compare references.)
`[topic 2.2][practice P3]`

---

**Q19. (Analyze Code · 2.6 == vs .equals on String)**
What is printed?
```java
String s = "cat";
String t = new String("cat");
System.out.println(s.equals(t) + " " + (s == t));
```
A) `true true`   B) `true false`   C) `false false`   D) `false true`

**Answer: B.** `.equals` compares **contents** → `true`; `==` compares **references**, and `new String(...)` is a distinct object → `false`.
`[topic 2.6][practice P3]`

---

## D. if / nested if / if-else-if

**Q20. (Analyze Code · 2.4 if-else-if stops at first true)**
What is printed when `n = 5`?
```java
int n = 5;
if (n > 10)      System.out.println("big");
else if (n > 3)  System.out.println("mid");
else if (n > 0)  System.out.println("small");
else             System.out.println("none");
```
A) `big`   B) `mid`   C) `small`   D) `mid` and `small`

**Answer: B.** `5 > 10` false; `5 > 3` true → prints `mid` and the chain **stops** (later branches are skipped even though `5 > 0` is also true).
`[topic 2.4][practice P3]`

---

**Q21. (Analyze Code · 2.4 dangling-else / nested if)**
What is printed when `x = 8`?
```java
int x = 8;
if (x > 5)
    if (x > 10)
        System.out.println("high");
    else
        System.out.println("mid");
```
A) `high`   B) Nothing.   C) `high` then `mid`   D) `mid`

**Answer: D.** The `else` binds to the **nearest** `if` (`x > 10`). `x > 5` true, enter; `x > 10` false → the inner `else` runs → `mid`.
`[topic 2.4][practice P3]`

---

## E. while, for, off-by-one

**Q22. (Analyze Code · 2.7 while loop count)**
What is printed?
```java
int n = 1, count = 0;
while (n < 100) {
    n = n * 2;
    count++;
}
System.out.println(count);
```
A) `6`   B) `8`   C) `64`   D) `7`

**Answer: D.** n: 1→2→4→8→16→32→64→128, one `count++` per step. The loop multiplies 7 times (128 is the first value ≥ 100). `count = 7`.
`[topic 2.7][practice P3]`

---

**Q23. (Analyze Code · 2.7 off-by-one in while)**
How many times does the body execute?
```java
int i = 0;
while (i <= 5) {
    System.out.print("*");
    i++;
}
```
A) 5   B) 6   C) 7   D) Infinite

**Answer: B.** `i` takes 0,1,2,3,4,5 (six values) before `i = 6` fails `i <= 5`. Six stars. (Using `<` would give 5 — the classic off-by-one.)
`[topic 2.7][practice P3]`

---

**Q24. (Analyze Code · 2.8 for loop accumulation)**
What is printed?
```java
int sum = 0;
for (int i = 2; i <= 10; i += 2) {
    sum += i;
}
System.out.println(sum);
```
A) `20`   B) `30`   C) `25`   D) `12`

**Answer: B.** i = 2,4,6,8,10; sum = 2+4+6+8+10 = `30`.
`[topic 2.8][practice P3]`

---

**Q25. (Analyze Code · 2.8 for↔while loop variable scope)**
What is printed?
```java
int total = 0;
for (int k = 5; k > 0; k--) {
    total += k;
}
System.out.println(total);
```
A) `10`   B) `0`   C) `15`   D) `5`

**Answer: C.** k = 5,4,3,2,1; total = 5+4+3+2+1 = `15`. The decrementing `for` is equivalent to a `while` with `k--` at the bottom.
`[topic 2.8][practice P3]`

---

## F. Standard iteration algorithms

**Q26. (Analyze Code · 2.9 digit extraction with %/ /)**
What is printed?
```java
int n = 4729, sum = 0;
while (n > 0) {
    sum += n % 10;
    n = n / 10;
}
System.out.println(sum);
```
A) `22`   B) `4729`   C) `9`   D) `18`

**Answer: A.** Peels off last digits: 9, 2, 7, 4 → sum = 9+2+7+4 = `22`.
`[topic 2.9][practice P3]`

---

**Q27. (Analyze Code · 2.9 count occurrences / divisibility)**
What is printed?
```java
int count = 0;
for (int i = 1; i <= 30; i++) {
    if (i % 4 == 0) count++;
}
System.out.println(count);
```
A) `6`   B) `8`   C) `4`   D) `7`

**Answer: D.** Multiples of 4 in 1..30: 4,8,12,16,20,24,28 → `7`.
`[topic 2.9][practice P3]`

---

**Q28. (Analyze Code · 2.9 find max scan)**
What is printed?
```java
int[] data = {3, 9, 2, 9, 7};
int max = data[0];
for (int i = 1; i < data.length; i++) {
    if (data[i] > max) max = data[i];
}
System.out.println(max);
```
A) `7`   B) `9`   C) `3`   D) `2`

**Answer: B.** Standard max scan: starts at 3, updates to 9, stays 9 (the `>` keeps the first 9; either 9 gives the same value). Max = `9`.
`[topic 2.9][practice P3]`

---

## G. String iteration / methods

**Q29. (Analyze Code · 1.15 substring exclusive `to`)**
What is printed?
```java
String s = "programming";
System.out.println(s.substring(3, 7));
```
A) `ogra`   B) `ramm`   C) `gram`   D) `gramm`

**Answer: C.** Indices 3,4,5,6 (the `to` index 7 is **excluded**). `p(0)r(1)o(2)g(3)r(4)a(5)m(6)` → `gram` (length = 7−3 = 4).
`[topic 1.15][practice P3]`

---

**Q30. (Analyze Code · 1.15 substring(from) to end)**
What is printed?
```java
String s = "abcdef";
System.out.println(s.substring(4));
```
A) `def`   B) `ef`   C) `cdef`   D) `e`

**Answer: B.** `substring(4)` returns from index 4 to the end: characters at 4 (`e`) and 5 (`f`) → `ef`.
`[topic 1.15][practice P3]`

---

**Q31. (Analyze Code · 1.15 indexOf)**
What is printed?
```java
String s = "banana";
System.out.println(s.indexOf("na"));
```
A) `1`   B) `2`   C) `4`   D) `-1`

**Answer: B.** `indexOf` returns the **first** occurrence: `b(0)a(1)n(2)a(3)...`, "na" first starts at index 2.
`[topic 1.15][practice P3]`

---

**Q32. (Analyze Code · 2.10 single-char access via substring)**
What is printed?
```java
String s = "hello";
String out = "";
for (int i = 0; i < s.length(); i++) {
    out = s.substring(i, i + 1) + out;
}
System.out.println(out);
```
A) `hello`   B) `o`   C) `h`   D) `olleh`

**Answer: D.** Each char (`s.substring(i, i+1)`) is prepended, reversing the string: `olleh`. (This is the in-syllabus reverse algorithm; there is no `charAt`.)
`[topic 2.10][practice P3]`

---

**Q33. (Analyze Code · 2.10 substring length property / StringIndexOutOfBounds)**
What is the result?
```java
String s = "abc";
System.out.println(s.substring(2, 4));
```
A) `bc`   B) An empty string   C) `c`   D) A `StringIndexOutOfBoundsException` is thrown.

**Answer: D.** `s` has length 3 (valid indices 0..2). `substring(2, 4)` needs index up to 3, which is out of range → `StringIndexOutOfBoundsException`.
`[topic 2.10][practice P3]`

---

**Q34. (Analyze Code · 2.10 split then iterate)**
What is printed?
```java
String csv = "red,green,blue,yellow";
String[] parts = csv.split(",");
System.out.println(parts.length + " " + parts[2]);
```
A) `4 blue`   B) `3 blue`   C) `4 green`   D) `4 yellow`

**Answer: A.** `split(",")` on a literal comma gives `["red","green","blue","yellow"]` — length 4; index 2 is `blue`.
`[topic 2.10][practice P3]`

---

## H. Nested loops & statement-execution count

**Q35. (Analyze Code · 2.11 triangular nested loop)**
What is printed?
```java
int total = 0;
for (int i = 0; i < 5; i++) {
    for (int j = 0; j <= i; j++) {
        total++;
    }
}
System.out.println(total);
```
A) `25`   B) `10`   C) `20`   D) `15`

**Answer: D.** Inner runs i+1 times: 1+2+3+4+5 = `15` (the inner condition is `j <= i`).
`[topic 2.11][practice P3]`

---

**Q36. (Analyze Code · 2.11 nested loop pattern output)**
What is printed?
```java
for (int r = 1; r <= 3; r++) {
    for (int c = 1; c <= r; c++) {
        System.out.print(c);
    }
    System.out.println();
}
```
A) `1` / `12` / `123`   B) `1` / `11` / `111`   C) `123` / `12` / `1`   D) `111` / `22` / `3`

**Answer: A.** Row r prints `1..r`: row1 `1`, row2 `12`, row3 `123` (each on its own line).
`[topic 2.11][practice P3]`

---

**Q37. (Analyze Code · 2.12 statement execution count)**
How many times does the marked statement execute?
```java
int n = 6;
for (int i = 0; i < n; i++) {
    for (int j = 0; j < n; j++) {
        System.out.print("*");   // <-- count this
    }
}
```
A) `6`   B) `12`   C) `36`   D) `64`

**Answer: C.** Outer 6 × inner 6 = `36` executions (quadratic — n²). No Big-O needed, just the count.
`[topic 2.12][practice P3]`

---

**Q38. (Analyze Code · 2.12 compare linear vs quadratic count)**
For input size `n`, how many times does `step()` run?
```java
for (int i = 0; i < n; i++) {
    step();           // loop A
}
for (int i = 0; i < n; i++) {
    for (int j = 0; j < n; j++) {
        step();       // loop B
    }
}
```
A) `n + n` = `2n`   B) `n + n²`   C) `n²`   D) `2n²`

**Answer: B.** Loop A runs `step()` `n` times (linear); loop B runs it `n × n = n²` times (quadratic). Sequential blocks add: `n + n²`.
`[topic 2.12][practice P4]`

---

## I. 1D arrays — bounds, traversal, algorithms

**Q39. (Analyze Code · 4.3 length attribute & bounds)**
What is the result of running this segment?
```java
int[] arr = {10, 20, 30, 40};
int sum = 0;
for (int i = 1; i <= arr.length; i++) {
    sum += arr[i];
}
System.out.println(sum);
```
A) `100`   B) `90`   C) `120`   D) An `ArrayIndexOutOfBoundsException` is thrown.

**Answer: D.** Valid indices are 0..3, but `i <= arr.length` lets `i` reach 4, so `arr[4]` throws `ArrayIndexOutOfBoundsException` (off-by-one). Note `arr.length` is an **attribute** — no parentheses.
`[topic 4.3][practice P3]`

---

**Q40. (Analyze Code · 4.3 default values)**
What is printed?
```java
int[] a = new int[3];
boolean[] b = new boolean[2];
System.out.println(a[1] + " " + b[0]);
```
A) `0 true`   B) `null false`   C) `0 false`   D) `0 0`

**Answer: C.** `new` zero-fills arrays with type defaults: `int` → `0`, `boolean` → `false`.
`[topic 4.3][practice P3]`

---

**Q41. (Analyze Code · 4.4 indexed traversal sum)**
What is printed?
```java
int[] arr = {4, 8, 15, 16, 23, 42};
int sum = 0;
for (int i = 0; i < arr.length; i++) {
    if (arr[i] % 2 == 0) sum += arr[i];
}
System.out.println(sum);
```
A) `108`   B) `70`   C) `42`   D) `81`

**Answer: B.** Even elements: 4, 8, 16, 42 → 4+8+16+42 = `70` (15 and 23 are odd, skipped).
`[topic 4.4][practice P3]`

---

**Q42. (Analyze Code · 4.4 enhanced-for copies primitive)**
What is printed?
```java
int[] arr = {1, 2, 3};
for (int x : arr) {
    x = x * 10;
}
System.out.println(arr[0] + " " + arr[1] + " " + arr[2]);
```
A) `10 20 30`   B) `0 0 0`   C) `10 2 3`   D) `1 2 3`

**Answer: D.** The enhanced-for variable `x` is a **copy** of each primitive element; reassigning `x` does **not** change the array. Output unchanged: `1 2 3`.
`[topic 4.4][practice P3]`

---

**Q43. (Analyze Code · 4.5 reverse in place)**
What is printed?
```java
int[] a = {1, 2, 3, 4, 5};
for (int i = 0; i < a.length / 2; i++) {
    int temp = a[i];
    a[i] = a[a.length - 1 - i];
    a[a.length - 1 - i] = temp;
}
System.out.println(a[0] + "" + a[1] + a[2] + a[3] + a[4]);
```
A) `54321`   B) `12345`   C) `51234`   D) `54323`

**Answer: A.** Swaps ends inward (i = 0,1; the middle element index 2 stays): `{5,4,3,2,1}` → prints `54321`.
`[topic 4.5][practice P3]`

---

**Q44. (Analyze Code · 4.5 shift elements left)**
What is printed?
```java
int[] a = {10, 20, 30, 40};
for (int i = 0; i < a.length - 1; i++) {
    a[i] = a[i + 1];
}
System.out.println(a[0] + " " + a[1] + " " + a[2] + " " + a[3]);
```
A) `20 30 40 0`   B) `10 20 30 40`   C) `20 30 40 40`   D) `40 40 40 40`

**Answer: C.** Each element copies the one to its right; the last element is never overwritten, so it duplicates: `{20,30,40,40}`.
`[topic 4.5][practice P3]`

---

**Q45. (Analyze Code · 4.14 linear search returns index)**
What does `search` return for the call shown?
```java
int[] a = {7, 3, 9, 3, 5};
// search returns the index of the first occurrence of target, or -1
int target = 3;
int found = -1;
for (int i = 0; i < a.length; i++) {
    if (a[i] == target) { found = i; break; }
}
System.out.println(found);
```
A) `1`   B) `3`   C) `-1`   D) `0`

**Answer: A.** Linear search from the front stops at the **first** match: `a[1] == 3` → returns index `1`.
`[topic 4.14][practice P3]`

---

## J. Wrapper classes & files

**Q46. (Analyze Code · 4.7 Integer.parseInt + autoboxing)**
What is printed?
```java
String s = "42";
int n = Integer.parseInt(s);
Integer boxed = n + 8;
System.out.println(boxed);
```
A) `428`   B) `42`   C) `"50"`   D) `50`

**Answer: D.** `parseInt("42") = 42`; `42 + 8 = 50`; the `int` 50 **autoboxes** into the `Integer boxed`, printed as `50`.
`[topic 4.7][practice P3]`

---

**Q47. (Analyze Code · 4.7 Double.parseDouble)**
What is printed?
```java
double d = Double.parseDouble("3.5") + Double.parseDouble("1.5");
System.out.println(d);
```
A) `5`   B) `3.51.5`   C) `5.0`   D) `4.0`

**Answer: C.** `3.5 + 1.5 = 5.0`, printed as a double with the decimal point.
`[topic 4.7][practice P3]`

---

**Q48. (Analyze Code · 4.6 Scanner over a file + split)**
A file `data.txt` contains exactly these two lines:
```
Ann,17
Ben,16
```
What does this segment print? (assume inside a method that `throws IOException`)
```java
Scanner sc = new Scanner(new File("data.txt"));
int total = 0;
while (sc.hasNext()) {
    String line = sc.next();          // each line is one token (no spaces)
    String[] f = line.split(",");
    total += Integer.parseInt(f[1]);
}
sc.close();
System.out.println(total);
```
A) `33`   B) `17`   C) `16`   D) `1716`

**Answer: A.** Two tokens `Ann,17` and `Ben,16`; `split(",")[1]` is the age; `Integer.parseInt` → 17 and 16; total = `33`. The `hasNext()` loop reads to end of file, then `close()`.
`[topic 4.6][practice P3]`

---

## K. ArrayList — methods, traversal pitfalls, algorithms

**Q49. (Analyze Code · 4.8 add(index) + set)**
What is printed?
```java
ArrayList<Integer> list = new ArrayList<Integer>();
list.add(5);
list.add(8);
list.add(1, 6);
list.set(0, 9);
System.out.println(list);
```
A) `[9, 8, 6]`   B) `[5, 6, 8]`   C) `[9, 6, 8, 1]`   D) `[9, 6, 8]`

**Answer: D.** `[5]` → `[5,8]` → `add(1,6)` inserts at index 1 shifting right → `[5,6,8]` → `set(0,9)` replaces index 0 → `[9,6,8]`.
`[topic 4.8][practice P3]`

---

**Q50. (Analyze Code · 4.9 remove returns shifted element)**
What is printed?
```java
ArrayList<String> a = new ArrayList<String>();
a.add("p"); a.add("q"); a.add("r");
a.remove(1);
System.out.println(a.get(1) + " " + a.size());
```
A) `r 2`   B) `q 3`   C) `r 3`   D) `q 2`

**Answer: A.** `remove(1)` deletes `"q"` and shifts left → `["p","r"]`; `get(1)` is now `"r"`, `size()` is 2.
`[topic 4.9][practice P3]`

---

**Q51. (Analyze Code · 4.9 remove-while-iterating forward skips)**
After this runs, what does `list` contain? (it intends to remove all `2`s)
```java
ArrayList<Integer> list = new ArrayList<Integer>();
list.add(2); list.add(2); list.add(2); list.add(5);
for (int i = 0; i < list.size(); i++) {
    if (list.get(i) == 2) {
        list.remove(i);
    }
}
System.out.println(list);
```
A) `[5]`   B) `[2, 5]`   C) `[]`   D) `[2, 2, 5]`

**Answer: B.** Forward removal with `i++` **skips** the element shifted into the removed slot. Trace from `[2,2,2,5]`: i=0 remove → `[2,2,5]` (i→1); i=1 element is `2` remove → `[2,5]` (i→2); i=2 size is 2 so the loop ends. Left with `[2,5]` — two `2`s survived. (The classic skip bug; reverse iteration would fix it.)
`[topic 4.9][practice P3]`

---

**Q52. (Analyze Code · 4.10 ArrayList accumulate / count)**
What is printed?
```java
ArrayList<Integer> nums = new ArrayList<Integer>();
nums.add(4); nums.add(7); nums.add(10); nums.add(3);
int count = 0;
for (int x : nums) {
    if (x > 5) count++;
}
System.out.println(count);
```
A) `3`   B) `1`   C) `2`   D) `4`

**Answer: C.** Elements > 5: 7 and 10 → count = `2` (4 and 3 are not). Enhanced-for unboxes each `Integer`.
`[topic 4.10][practice P3]`

---

**Q53. (Analyze Code · 4.10 multi-structure simultaneous traversal)**
What is printed?
```java
int[] price = {2, 5, 3};
int[] qty = {4, 1, 2};
int total = 0;
for (int i = 0; i < price.length; i++) {
    total += price[i] * qty[i];
}
System.out.println(total);
```
A) `19`   B) `13`   C) `30`   D) `8`

**Answer: A.** Pairwise: 2·4 + 5·1 + 3·2 = 8 + 5 + 6 = `19` (parallel traversal of two arrays).
`[topic 4.10][practice P3]`

---

## L. 2D arrays

**Q54. (Analyze Code · 4.11 rows vs cols)**
What is printed?
```java
int[][] g = {{1, 2, 3, 4},
             {5, 6, 7, 8}};
System.out.println(g.length + " " + g[0].length);
```
A) `4 2`   B) `8 8`   C) `2 2`   D) `2 4`

**Answer: D.** `g.length` = number of **rows** = 2; `g[0].length` = number of **columns** = 4.
`[topic 4.11][practice P3]`

---

**Q55. (Analyze Code · 4.12 row-major traversal sum)**
What is printed?
```java
int[][] g = {{1, 2},
             {3, 4},
             {5, 6}};
int sum = 0;
for (int r = 0; r < g.length; r++) {
    for (int c = 0; c < g[r].length; c++) {
        sum += g[r][c];
    }
}
System.out.println(sum);
```
A) `15`   B) `12`   C) `21`   D) `6`

**Answer: C.** All six elements: 1+2+3+4+5+6 = `21`.
`[topic 4.12][practice P3]`

---

**Q56. (Analyze Code · 4.12 column traversal)**
What is printed?
```java
int[][] g = {{1, 2, 3},
             {4, 5, 6}};
int sum = 0;
for (int r = 0; r < g.length; r++) {
    sum += g[r][2];
}
System.out.println(sum);
```
A) `9`   B) `6`   C) `5`   D) `21`

**Answer: A.** Fixes column index 2, walks the rows: `g[0][2] + g[1][2] = 3 + 6 = 9`.
`[topic 4.12][practice P3]`

---

**Q57. (Analyze Code · 4.12 enhanced-for outer var is a row)**
What is printed?
```java
int[][] g = {{2, 4}, {6, 8}, {1, 3}};
int sum = 0;
for (int[] row : g) {
    sum += row[0];
}
System.out.println(sum);
```
A) `15`   B) `24`   C) `12`   D) `9`

**Answer: D.** In a 2D enhanced-for the outer variable is a **1D array (a row)**: `row[0]` of each row = 2 + 6 + 1 = `9`.
`[topic 4.12][practice P3]`

---

**Q58. (Analyze Code · 4.13 find max in 2D)**
What is printed?
```java
int[][] g = {{3, 8, 1},
             {9, 2, 7}};
int max = g[0][0];
for (int r = 0; r < g.length; r++) {
    for (int c = 0; c < g[r].length; c++) {
        if (g[r][c] > max) max = g[r][c];
    }
}
System.out.println(max);
```
A) `9`   B) `8`   C) `7`   D) `3`

**Answer: A.** Scans every cell, tracking the largest: max = `9`.
`[topic 4.13][practice P3]`

---

**Q59. (Analyze Code · 4.13 count in a 2D section)**
What is printed?
```java
int[][] g = {{0, 1, 0},
             {1, 1, 0},
             {0, 0, 1}};
int count = 0;
for (int r = 0; r < g.length; r++) {
    for (int c = 0; c < g[r].length; c++) {
        if (g[r][c] == 1) count++;
    }
}
System.out.println(count);
```
A) `5`   B) `3`   C) `4`   D) `9`

**Answer: C.** Count of 1s: row0 has 1, row1 has 2, row2 has 1 → `4`.
`[topic 4.13][practice P3]`

---

## M. Objects, references, aliases, encapsulation behavior

**Q60. (Analyze Code · 1.14 NullPointerException)**
What is the result of running this segment?
```java
String s = null;
System.out.println(s.length());
```
A) `0`   B) An empty line   C) A `NullPointerException` is thrown.   D) `null`

**Answer: C.** Calling an instance method (`length()`) on a `null` reference throws `NullPointerException`.
`[topic 1.14][practice P3]`

---

**Q61. (Analyze Code · 1.9 call-by-value, primitive unchanged)**
What is printed?
```java
public static void bump(int v) { v = v + 100; }

public static void main(String[] args) {
    int x = 5;
    bump(x);
    System.out.println(x);
}
```
A) `105`   B) `5`   C) `100`   D) `0`

**Answer: B.** Primitives are passed **by value** (a copy). `bump` changes its local copy only; `x` in `main` is still `5`.
`[topic 1.9][practice P3]`

---

**Q62. (Analyze Code · 3.6 object-reference param aliases the object)**
What is printed? (assume `ArrayList` is imported)
```java
public static void fill(ArrayList<Integer> a) { a.add(99); }

public static void main(String[] args) {
    ArrayList<Integer> list = new ArrayList<Integer>();
    list.add(1);
    fill(list);
    System.out.println(list);
}
```
A) `[1]`   B) `[99]`   C) `[]`   D) `[1, 99]`

**Answer: D.** The parameter is an **alias** to the same object. Mutating it (`add(99)`) through the parameter changes the caller's list → `[1, 99]`.
`[topic 3.6][practice P3]`

---

**Q63. (Analyze Code · 3.4 defensive copy vs alias)**
A `Team` stores `private int[] scores`. Its constructor does `this.scores = scores;` (no copy). What does this print?
```java
int[] arr = {10, 20};
Team t = new Team(arr);     // constructor stored the SAME array reference
arr[0] = 999;
System.out.println(t.firstScore());   // returns scores[0]
```
A) `10`   B) `999`   C) `20`   D) `0`

**Answer: B.** With **no defensive copy**, the field aliases `arr`; mutating `arr[0]` changes the object's data too → prints `999`. (A defensive copy in the constructor would have printed `10`.)
`[topic 3.4][practice P4]`

---

**Q64. (Analyze Code · 3.8 shadowing a field)**
What is printed?
```java
public class Box {
    private int size = 10;
    public void setSize(int size) {
        size = size;            // assigns the PARAMETER to itself
    }
    public int getSize() { return size; }
}
// elsewhere:
Box b = new Box();
b.setSize(50);
System.out.println(b.getSize());
```
A) `50`   B) `10`   C) `0`   D) Compile error

**Answer: B.** The local parameter `size` **shadows** the field. `size = size` reassigns the parameter to itself; the field is untouched → still `10`. (`this.size = size` would have fixed it.)
`[topic 3.8][practice P3]`

---

## N. Recursion — TRACE ONLY

**Q65. (Analyze Code · 4.16 recursion trace — sum)**
What does `mystery(4)` return?
```java
public static int mystery(int n) {
    if (n <= 0) return 0;
    return n + mystery(n - 1);
}
```
A) `10`   B) `4`   C) `6`   D) `0`

**Answer: A.** `4 + (3 + (2 + (1 + (0)))) = 4+3+2+1 = 10` (base case at n≤0 returns 0).
`[topic 4.16][practice P3]`

---

**Q66. (Analyze Code · 4.16 recursion trace — countdown print order)**
What is printed by `f(3)`?
```java
public static void f(int n) {
    if (n == 0) return;
    System.out.print(n + " ");
    f(n - 1);
}
```
A) `1 2 3`   B) `0 1 2 3`   C) `3 2 1`   D) `3 2 1 0`

**Answer: C.** Prints **before** recursing, decreasing: `3 2 1 ` then `f(0)` returns without printing.
`[topic 4.16][practice P3]`

---

**Q67. (Analyze Code · 4.16 recursion trace — print-after-recurse)**
What is printed by `g(3)`?
```java
public static void g(int n) {
    if (n == 0) return;
    g(n - 1);
    System.out.print(n + " ");
}
```
A) `3 2 1`   B) `0 1 2 3`   C) Nothing.   D) `1 2 3`

**Answer: D.** The recursive call happens **first**, so prints unwind on the way back up: `1 2 3`. (Contrast Q66, where the print is before the call.)
`[topic 4.16][practice P3]`

---

**Q68. (Analyze Code · 4.16 recursion trace — two base values)**
What does `power(2, 4)` return?
```java
public static int power(int base, int exp) {
    if (exp == 0) return 1;
    return base * power(base, exp - 1);
}
```
A) `16`   B) `8`   C) `6`   D) `4`

**Answer: A.** `2 * 2 * 2 * 2 * 1 = 16` (exp counts down to 0, the base case returns 1).
`[topic 4.16][practice P3]`

---

**Q69. (Analyze Code · 4.16 recursion trace — Fibonacci-style branching)**
What does `t(4)` return?
```java
public static int t(int n) {
    if (n <= 1) return n;
    return t(n - 1) + t(n - 2);
}
```
A) `5`   B) `2`   C) `3`   D) `4`

**Answer: C.** `t(4)=t(3)+t(2)`; `t(3)=t(2)+t(1)`; `t(2)=t(1)+t(0)=1+0=1`; so `t(3)=1+1=2`, `t(4)=2+1=3`.
`[topic 4.16][practice P3]`

---

## O. Search & sort — TRACE ONLY

**Q70. (Analyze Code · 4.17 binary search step count)**
On the sorted array below, binary search for `target = 11` examines which indices, in order? (low/high inclusive, `mid = (low+high)/2`)
```java
int[] a = {1, 3, 5, 7, 9, 11, 13};   // indices 0..6
```
A) `3, 5`   B) `3` (found immediately)   C) `0, 1, 2, 3, 4, 5`   D) `6, 3, 0`

**Answer: A.** First `mid = (0+6)/2 = 3`; `a[3] = 7 < 11` → search the right half, `low = 4`. Next `mid = (4+6)/2 = 5`; `a[5] == 11` → found. The probed indices are `3, 5` (two probes). Binary search halves the space each step, not a linear scan.
`[topic 4.17][practice P3]`

---

**Q71. (Analyze Code · 4.17 binary search not-found path)**
On `{2, 4, 6, 8, 10}` (indices 0..4), how many comparisons does binary search make for `target = 5` before reporting "not found"? (`mid = (low+high)/2`)
A) `1`   B) `2`   C) `3`   D) `5`

**Answer: C.** mid=2 (`a[2]=6`, 5<6 → high=1); mid=0 (`a[0]=2`, 5>2 → low=1); mid=1 (`a[1]=4`, 5>4 → low=2). Now low>high → stop. **3** comparisons.
`[topic 4.17][practice P3]`

---

**Q72. (Analyze Code · 4.15 selection sort one pass)**
Selection sort puts the **minimum** of the unsorted segment at the front each pass. After the **first** pass on `{5, 2, 9, 1, 7}`, what is the array?
A) `{1, 2, 5, 7, 9}`   B) `{2, 5, 9, 1, 7}`   C) `{1, 5, 2, 9, 7}`   D) `{1, 2, 9, 5, 7}`

**Answer: D.** Pass 1 finds the min (1 at index 3) and swaps it with index 0: `{1, 2, 9, 5, 7}` (5 and 1 swap; the rest stay).
`[topic 4.15][practice P3]`

---

**Q73. (Analyze Code · 4.15 insertion sort one pass)**
Insertion sort inserts each next element into the sorted prefix. Starting from `{4, 3, 5, 1}`, what is the array after the element at **index 1** (`3`) has been inserted?
A) `{3, 4, 5, 1}`   B) `{3, 4, 1, 5}`   C) `{1, 3, 4, 5}`   D) `{4, 3, 5, 1}`

**Answer: A.** The prefix `{4}` is sorted; insert `3` before `4` → `{3, 4, 5, 1}` (indices 2 and 3 not processed yet).
`[topic 4.15][practice P3]`

---

**Q74. (Analyze Code · 4.17 merge sort split structure — describe behavior)**
Merge sort on `{8, 3, 5, 1}` recursively splits, then merges sorted halves. Which sequence of *merged* results is correct?
A) merge `{8,3}` and `{5,1}` → `{8, 5, 3, 1}`   B) `{8, 3, 5, 1}` is already returned unchanged   C) merge `{3,8}` and `{1,5}` → `{1, 3, 5, 8}`   D) merge `{1,3}` and `{5,8}` → `{1, 3, 5, 8}`

**Answer: C.** Split into `{8,3}`→sorted `{3,8}` and `{5,1}`→sorted `{1,5}`; merging those sorted halves interleaves to `{1,3,5,8}`.
`[topic 4.17][practice P4]`

---

## P. Mixed-trap synthesis (describe behavior)

**Q75. (Analyze Code · 2.9 average integer-vs-double trap)**
What is printed?
```java
int[] a = {1, 2, 4};
int sum = 0;
for (int x : a) sum += x;
double avg = sum / a.length;
System.out.println(avg);
```
A) `2.3333333333333335`   B) `7.0`   C) `2`   D) `2.0`

**Answer: D.** `sum = 7`, `a.length = 3`. `sum / a.length` is **integer** division `7/3 = 2` (computed before the assignment to `double`), then widened → `2.0`. (To get 2.33 you would cast first.)
`[topic 2.9][practice P3]`

---

**Q76. (Analyze Code · 1.15 immutability — concatenation makes a new String)**
What is printed?
```java
String s = "go";
s.substring(0, 1);
s = s + "!";
System.out.println(s);
```
A) `g`   B) `go`   C) `g!`   D) `go!`

**Answer: D.** Strings are **immutable**; `s.substring(0,1)` returns a new string that is discarded (`s` unchanged). Then `s + "!"` builds a new string `"go!"` assigned back to `s`.
`[topic 1.15][practice P4]`

---

**Q77. (Analyze Code · 4.4 enhanced-for object element mutation)**
A `Counter` has a `void inc()` mutator and `int get()`. What is printed?
```java
Counter[] cs = {new Counter(), new Counter()};
for (Counter c : cs) {
    c.inc();          // c is a copy of the REFERENCE, same object
}
System.out.println(cs[0].get() + " " + cs[1].get());
```
A) `1 1`   B) `0 0`   C) `2 2`   D) Compile error

**Answer: A.** The enhanced-for copies the **reference**, not the object. Calling the mutator `inc()` through `c` changes the shared object → each counter is `1`. (Contrast Q42: reassigning a primitive copy does nothing.)
`[topic 4.4][practice P4]`

---

**Q78. (Analyze Code · 2.10 count substrings via indexOf loop)**
What is printed?
```java
String s = "aXbXcXd";
int count = 0;
int i = s.indexOf("X");
while (i != -1) {
    count++;
    s = s.substring(i + 1);
    i = s.indexOf("X");
}
System.out.println(count);
```
A) `2`   B) `3`   C) `4`   D) `0`

**Answer: B.** Finds `X` at 1, chop → `bXcXd`; at 1, chop → `cXd`; at 1, chop → `d`; now `indexOf("X") = -1`, stop. count = `3`.
`[topic 2.10][practice P3]`

---

**Q79. (Analyze Code · 4.5 copy array independence)**
What is printed?
```java
int[] a = {1, 2, 3};
int[] b = new int[a.length];
for (int i = 0; i < a.length; i++) b[i] = a[i];
b[0] = 100;
System.out.println(a[0] + " " + b[0]);
```
A) `100 100`   B) `1 1`   C) `100 1`   D) `1 100`

**Answer: D.** Element-by-element copy makes `b` independent; changing `b[0]` does not affect `a[0]`. (Contrast `int[] b = a;`, which would alias.)
`[topic 4.5][practice P3]`

---

**Q80. (Analyze Code · 4.10 insert-in-order behavior — describe)**
A method walks an `ArrayList<Integer>` sorted ascending and uses `add(i, value)` at the first index where `list.get(i) >= value`. For `list = [2, 5, 9]` and `value = 6`, what is the result?
A) `[2, 5, 6, 9]`   B) `[2, 5, 9, 6]`   C) `[6, 2, 5, 9]`   D) `[2, 6, 5, 9]`

**Answer: A.** `6` is `< 9` and `>= 5`: first index where `get(i) >= 6` is index 2 (the `9`); `add(2, 6)` shifts `9` right → `[2, 5, 6, 9]` (stays sorted).
`[topic 4.10][practice P4]`

---

## Q. Which change fixes the bug? (diagnose — Practice 3.D)

Each item gives buggy code plus the *intended* behavior. Pick the one change that makes it meet the spec.

**Q81. (Analyze Code · 4.5 fix an off-by-one bound)**
This is intended to set `sum` to the total of all elements of `a`, but it currently throws an `ArrayIndexOutOfBoundsException`. Which single change fixes it?
```java
int[] a = {3, 6, 9, 12};
int sum = 0;
for (int i = 0; i <= a.length; i++) {
    sum += a[i];
}
```
A) Change `i = 0` to `i = 1`   B) Change `sum += a[i]` to `sum += a[i + 1]`   C) Change the loop condition to `i < a.length`   D) Change `a.length` to `a.length + 1`

**Answer: C.** Valid indices are 0..3; `i <= a.length` lets `i` reach 4 (out of bounds). `i < a.length` stops at index 3. (A) skips index 0; (B) makes the access worse; (D) extends the bound further out.
`[topic 4.5][practice P3]`

---

**Q82. (Analyze Code · 2.5 fix a condition-order / short-circuit bug)**
This is intended to print `"long enough"` only when `s` is non-null **and** has more than 3 characters, never throwing an exception. It currently throws a `NullPointerException` when `s` is `null`. Which change fixes it?
```java
String s = null;
if (s.length() > 3 && s != null) {
    System.out.println("long enough");
}
```
A) Swap the operands to `s != null && s.length() > 3`   B) Change `&&` to `||`   C) Change `> 3` to `>= 3`   D) Change `s.length()` to `s.substring(0)`

**Answer: A.** The null check must come **first** so `&&` short-circuits before `s.length()` is called. The original calls `s.length()` on `null`. (B) `||` would still evaluate `s.length()`; (C)/(D) do not avoid the null call.
`[topic 2.5][practice P3]`

---

**Q83. (Analyze Code · 4.9 fix remove-while-iterating)**
This is intended to remove **every** `0` from `list`, but with `list = [0, 0, 4]` it leaves a `0` behind. Which change fixes it?
```java
for (int i = 0; i < list.size(); i++) {
    if (list.get(i) == 0) {
        list.remove(i);
    }
}
```
A) Change `list.remove(i)` to `list.set(i, 0)`   B) Change the condition to `i <= list.size()`   C) Add `i++;` inside the `if`   D) Iterate backward: `for (int i = list.size() - 1; i >= 0; i--)`

**Answer: D.** Forward removal with `i++` skips the element shifted into the removed slot (`[0,0,4]` → remove index 0 → `[0,4]`, `i` advances to 1 and skips the surviving `0`). Iterating **backward** never skips a shifted element. (A) removes nothing; (B) goes out of bounds; (C) skips even more.
`[topic 4.9][practice P3]`

---

## R. Describe the behavior / state the precondition (Practices 4.A / 4.B)

**Q84. (Analyze Code · 4.14 state the precondition — binary search)**
A method `int bSearch(int[] a, int target)` uses binary search and returns the index of `target` or `-1`. It works correctly only if ___ — which precondition must hold?
A) `a` contains no duplicate values   B) `a` is sorted in ascending order   C) `target` is positive   D) `a.length` is a power of 2

**Answer: B.** *Model answer:* Binary search assumes the array is **sorted** (ascending here); it halves the search space by comparing against the middle, which is only valid on ordered data. Duplicates, sign of `target`, and length being a power of 2 are irrelevant to correctness.
`[topic 4.14][practice P4]`

---

**Q85. (Analyze Code · 2.9 state the precondition — average)**
A method `double average(int[] a)` returns `sum / a.length` cast to a double. It works correctly only if ___ — which precondition must hold?
A) `a` is sorted   B) `a.length > 0` (the array is non-empty)   C) every element is positive   D) `a.length` is even

**Answer: B.** *Model answer:* Dividing by `a.length` throws an `ArithmeticException` (integer divide-by-zero) when the array is **empty**, so the precondition is `a.length > 0`. Order, sign, and parity of the length do not affect correctness.
`[topic 2.9][practice P4]`

---

**Q86. (Analyze Code · 4.4 describe behavior — enhanced-for on primitives)**
A method receives `int[] a` and runs `for (int x : a) { x = x * 2; }`, then the caller reads `a`. Describe the effect on the caller's array.
A) Every element is doubled.   B) The array is unchanged, because `x` is a copy of each primitive element.   C) Only the first element changes.   D) A `ConcurrentModificationException` is thrown.

**Answer: B.** *Model answer:* The enhanced-for variable `x` is a **copy** of each primitive element; reassigning `x` never writes back to the array, so the caller sees the array **unchanged**. (Object elements differ — calling a mutator through the loop variable would affect the shared object.)
`[topic 4.4][practice P4]`

---

**Q87. (Analyze Code · 3.6 describe behavior — returning a field reference)**
A `Roster` has `private int[] ids` and a method `public int[] getIds() { return ids; }` that returns the field directly (no copy). A caller does `int[] r = roster.getIds(); r[0] = -1;`. Describe the effect.
A) The roster's internal array is unaffected, because arrays are copied on return.   B) The roster's internal `ids[0]` becomes `-1`, because the returned reference aliases the field's array.   C) A compile error occurs.   D) A `NullPointerException` is thrown.

**Answer: B.** *Model answer:* Returning the field reference hands the caller an **alias** to the same array; mutating `r[0]` mutates `ids[0]` too. Returning a defensive copy would have protected the object's data.
`[topic 3.6][practice P4]`

---

## S. Shared-stem sets

**SET 1 (Q88–Q90).** Use this class for all three questions.
```java
public class Inventory {
    private int[] counts;                       // one count per item slot
    public Inventory(int[] c) { counts = c; }   // stores the reference
    public int total() {
        int t = 0;
        for (int x : counts) t += x;
        return t;
    }
    public int slot(int i) { return counts[i]; }
}
```

**Q88. (Analyze Code · 4.5 set — what does it return)**
For `int[] c = {2, 0, 5, 1};` and `Inventory inv = new Inventory(c);`, what does `inv.total()` return?
A) `8`   B) `4`   C) `7`   D) `0`

**Answer: A.** `total()` sums every element: 2+0+5+1 = `8`.
`[topic 4.5][practice P3]`

---

**Q89. (Analyze Code · 3.6 set — describe the aliasing behavior)**
Continuing SET 1: after `c[0] = 100;` is executed (the same `c` passed to the constructor), what does `inv.slot(0)` return?
A) `2`   B) `100`   C) `0`   D) A `NullPointerException` is thrown.

**Answer: B.** The constructor stored the **reference**, so the field `counts` aliases `c`; mutating `c[0]` changes the object's data → `slot(0)` returns `100`.
`[topic 3.6][practice P3]`

---

**Q90. (Analyze Code · 4.3 set — state the precondition)**
Continuing SET 1: `inv.slot(i)` works correctly only if ___ — which precondition must hold?
A) `i` is even   B) `counts` is sorted   C) `i` is positive   D) `0 <= i && i < counts.length`

**Answer: D.** *Model answer:* `slot(i)` indexes `counts[i]`; it must be a **valid index** (`0 <= i < counts.length`), or it throws an `ArrayIndexOutOfBoundsException`. Parity, order, and sign are irrelevant.
`[topic 4.3][practice P4]`

---

**SET 2 (Q91–Q92).** Use this segment for both questions.
```java
String[] words = {"fig", "apple", "kiwi", "apple"};
```

**Q91. (Analyze Code · 1.15 set — count matches with .equals)**
How many entries of `words` equal `"apple"` (use `.equals`)?
```java
int n = 0;
for (String w : words) {
    if (w.equals("apple")) n++;
}
System.out.println(n);
```
A) `1`   B) `2`   C) `3`   D) `0`

**Answer: B.** Two entries (indices 1 and 3) equal `"apple"` by contents → `n = 2`. (`.equals` compares contents, the correct String test.)
`[topic 1.15][practice P3]`

---

**Q92. (Analyze Code · 4.5 set — which change fixes a guard)**
Continuing SET 2: this loop is intended to print the index of the first entry whose length is greater than 4, or `-1` if none. It currently prints the **last** matching index. Which change fixes it?
```java
int idx = -1;
for (int i = 0; i < words.length; i++) {
    if (words[i].length() > 4) idx = i;
}
System.out.println(idx);
```
A) Change `> 4` to `>= 4`   B) Change `idx = i` to `idx = words[i].length()`   C) Add `break;` immediately after `idx = i;`   D) Start the loop at `i = 1`

**Answer: C.** Without stopping, `idx` is overwritten by every match, leaving the **last**. Adding `break;` after the first assignment captures the **first** match. (A) changes the threshold; (B) stores the wrong value; (D) skips index 0.
`[topic 4.5][practice P3]`

---

## T. Multi-topic synthesis (≥2 topics)

**Q93. (Analyze Code · 4.13 + 1.14 + 2.6 — 2D array of objects, null guard, .equals)**
A `String[][] grid` may contain `null` entries. What does this print?
```java
String[][] grid = {{"a", null}, {"b", "a"}};
int count = 0;
for (int r = 0; r < grid.length; r++) {
    for (int c = 0; c < grid[r].length; c++) {
        if (grid[r][c] != null && grid[r][c].equals("a")) count++;
    }
}
System.out.println(count);
```
A) `1`   B) `2`   C) `3`   D) A `NullPointerException` is thrown.

**Answer: B.** The `!= null` guard short-circuits before `.equals`, so the `null` is skipped safely. Entries equal to `"a"`: `grid[0][0]` and `grid[1][1]` → `count = 2`.
`[topic 4.13][practice P3]`

---

**Q94. (Analyze Code · 4.16 + 4.4 — recursion trace over an array)**
What does `sumFrom(a, 0)` return for `int[] a = {4, 2, 7}`?
```java
public static int sumFrom(int[] a, int i) {
    if (i >= a.length) return 0;
    return a[i] + sumFrom(a, i + 1);
}
```
A) `6`   B) `11`   C) `0`   D) `13`

**Answer: D.** `sumFrom(a,0) = 4 + (2 + (7 + 0)) = 13` (base case at `i >= length` returns 0). Each call adds one element, then recurses on the next index.
`[topic 4.16][practice P3]`

---

**Q95. (Analyze Code · 4.10 + 1.15 + 2.10 — ArrayList + String methods)**
What is printed?
```java
ArrayList<String> list = new ArrayList<String>();
list.add("cat,3");
list.add("dog,5");
int total = 0;
for (String s : list) {
    String[] parts = s.split(",");
    total += Integer.parseInt(parts[1]);
}
System.out.println(total);
```
A) `8`   B) `35`   C) `2`   D) `53`

**Answer: A.** Each element splits on the literal comma; `parts[1]` is the number; `Integer.parseInt` → 3 and 5; total = `8`.
`[topic 4.10][practice P3]`

---

## U. String.compareTo trace

**Q96. (Analyze Code · 1.15 compareTo sign)**
Which is true about the sign of `"apple".compareTo("banana")`?
```java
System.out.println("apple".compareTo("banana"));
```
A) It is **0**, because both have content.   B) It is **positive**, because `"apple"` is shorter.   C) It is **negative**, because `"apple"` comes before `"banana"` lexicographically.   D) It throws an exception.

**Answer: C.** `compareTo` returns the difference at the first differing position; `'a'` < `'b'`, so the result is **negative** (`"apple"` orders before `"banana"`). Equal strings give 0; a later-ordering receiver gives positive.
`[topic 1.15][practice P3]`

---

## V. Merge sort trace

**Q97. (Analyze Code · 4.17 merge-sort level trace)**
Merge sort on `{6, 2, 7, 1}` recursively splits into single elements, then merges in pairs. After the **first level of merges** (each adjacent pair merged into a sorted pair), which pair of sub-results is correct?
A) `{2, 6}` and `{1, 7}`   B) `{6, 2}` and `{7, 1}`   C) `{2, 7}` and `{1, 6}`   D) `{1, 2}` and `{6, 7}`

**Answer: A.** The halves are `{6,2}` and `{7,1}`; merging each sorted pair gives `{2,6}` and `{1,7}`. (The final merge of those two would produce `{1,2,6,7}`, but the question asks for the first level only.)
`[topic 4.17][practice P4]`

---

## W. Hard multi-step traces (3+ interacting steps — real-exam depth)

> These items deliberately chain three or more dependent steps (nested bounds, aliasing across calls, build-then-reparse, sub-region + guard, accumulating recursion, helper-in-a-loop). Trace on paper; a single skipped step changes the answer. Each distractor maps to a specific misconception.

**Q98. (Analyze Code · 2.11 + 2.12 inner bound depends on outer index, weighted accumulate)**
What is printed?
```java
int sum = 0;
for (int i = 1; i <= 3; i++) {
    for (int j = 1; j <= i; j++) {
        sum += i * j;
    }
}
System.out.println(sum);
```
A) `36`   B) `18`   C) `25`   D) `14`

**Answer: C.** Inner runs `j = 1..i`. i=1: `1*1=1`. i=2: `2*1 + 2*2 = 2+4=6`. i=3: `3*1+3*2+3*3 = 3+6+9=18`. Total `1+6+18 = 25`. (B) forgets i=1's term region; (D) sums only `i*1` per row; (A) treats the inner bound as a fixed 3.
`[topic 2.11][practice P3]`

---

**Q99. (Analyze Code · 3.6 + 1.9 object aliased through TWO method calls, mutation read later)**
What is printed? (assume the `Box` class shown)
```java
public class Box {
    private int v;
    public Box(int start) { v = start; }
    public void add(int n) { v += n; }
    public int get() { return v; }
}
// in another class:
public static void grow(Box b) { b.add(10); }
public static void shrink(Box b) { b.add(-3); }

public static void main(String[] args) {
    Box box = new Box(5);
    grow(box);
    shrink(box);
    System.out.println(box.get());
}
```
A) `5`   B) `15`   C) `2`   D) `12`

**Answer: D.** Each parameter is an **alias** to the same `Box`. `grow` → v = 5+10 = 15; `shrink` → v = 15−3 = 12; `get()` reads `12`. (A) assumes pass-by-value protects the object; (B) misses `shrink`; (C) misses `grow`.
`[topic 3.6][practice P3]`

---

**Q100. (Analyze Code · 1.15 + 2.10 build a String across a loop, then re-parse with indexOf/substring)**
What is printed?
```java
String csv = "";
for (int i = 1; i <= 3; i++) {
    csv = csv + i + ",";
}
// csv is now "1,2,3,"
int firstComma = csv.indexOf(",");
String rest = csv.substring(firstComma + 1);
System.out.println(rest.indexOf(","));
```
A) `0`   B) `1`   C) `2`   D) `3`

**Answer: B.** The loop builds `"1,2,3,"`. `indexOf(",")` = 1; `substring(2)` = `"2,3,"`. In `"2,3,"` the first comma is at index `1`. (A) reads the original string's comma; (C)/(D) miscount the chopped string.
`[topic 1.15][practice P3]`

---

**Q101. (Analyze Code · 4.12 + 1.14 + 2.6 column-major traversal + null guard + .equals)**
A `String[][] grid` may contain `null`. What is printed?
```java
String[][] grid = {{"x", "y"},
                   {null, "x"},
                   {"x", "z"}};
int count = 0;
for (int c = 0; c < grid[0].length; c++) {
    for (int r = 0; r < grid.length; r++) {
        if (grid[r][c] != null && grid[r][c].equals("x")) {
            count++;
        }
    }
}
System.out.println(count);
```
A) `3`   B) `2`   C) `4`   D) A `NullPointerException` is thrown.

**Answer: A.** Column-major still visits every cell. The `!= null` guard short-circuits before `.equals`, so the `null` at `grid[1][0]` is skipped safely. Cells equal to `"x"`: `grid[0][0]`, `grid[1][1]`, `grid[2][0]` → `3`. (B) misses one `"x"`; (C) miscounts; (D) ignores the guard.
`[topic 4.12][practice P3]`

---

**Q102. (Analyze Code · 4.16 recursion trace — accumulates across calls)**
What does `m(3)` return?
```java
public static int m(int n) {
    if (n == 0) return 0;
    return m(n - 1) + n * n;
}
```
A) `9`   B) `14`   C) `6`   D) `13`

**Answer: B.** `m(3) = m(2) + 9 = (m(1) + 4) + 9 = ((m(0) + 1) + 4) + 9 = 0 + 1 + 4 + 9 = 14` (sum of squares 1+4+9). (A) returns only the last term; (C) sums `n` not `n*n`; (D) drops the `1`.
`[topic 4.16][practice P3]`

---

**Q103. (Analyze Code · 1.9 + 2.9 helper called inside a loop, result feeds an accumulator)**
What is printed?
```java
public static int digits(int n) {
    int d = 0;
    while (n > 0) { d++; n = n / 10; }
    return d;
}

public static void main(String[] args) {
    int[] vals = {7, 88, 105, 4};
    int total = 0;
    for (int x : vals) {
        total += digits(x);
    }
    System.out.println(total);
}
```
A) `4`   B) `204`   C) `7`   D) `8`

**Answer: C.** `digits` returns the digit count: `digits(7)=1`, `digits(88)=2`, `digits(105)=3`, `digits(4)=1`; accumulated `1+2+3+1 = 7`. (A) counts elements; (B) sums the values; (D) miscounts a digit length.
`[topic 1.9][practice P3]`

---

**Q104. (Analyze Code · 2.11 + 1.15 nested loop builds a String, then its length is read)**
What is printed?
```java
String out = "";
for (int r = 1; r <= 4; r++) {
    for (int c = 1; c <= r; c++) {
        out = out + "*";
    }
    out = out + "|";
}
System.out.println(out.length());
```
A) `14`   B) `10`   C) `4`   D) `11`

**Answer: A.** Row r appends r stars then one `|`: stars total `1+2+3+4 = 10`, plus `4` bars = `14` characters. (B) counts only stars; (C) counts only bars/rows; (D) drops a bar.
`[topic 2.11][practice P3]`

---

**Q105. (Analyze Code · 3.6 + 4.10 ArrayList aliased through a method, then caller mutates and reads)**
What is printed? (assume `ArrayList` imported)
```java
public static void seed(ArrayList<Integer> a) {
    a.add(1);
    a.add(2);
}

public static void main(String[] args) {
    ArrayList<Integer> list = new ArrayList<Integer>();
    seed(list);
    list.add(0, 9);
    list.remove(2);
    System.out.println(list);
}
```
A) `[9, 1, 2]`   B) `[1, 2]`   C) `[9, 2]`   D) `[9, 1]`

**Answer: D.** `seed` mutates the **same** list (alias) → `[1, 2]`. `add(0, 9)` inserts at front → `[9, 1, 2]`. `remove(2)` deletes index 2 (`2`) → `[9, 1]`. (A) misses the remove; (B) assumes pass-by-value; (C) removes the wrong element.
`[topic 3.6][practice P3]`

---

**Q106. (Analyze Code · 2.10 + 4.7 split a String, loop the tokens, parse + accumulate under a condition)**
What is printed?
```java
String data = "3,10,2,8,5";
String[] parts = data.split(",");
int total = 0;
for (int i = 0; i < parts.length; i++) {
    int n = Integer.parseInt(parts[i]);
    if (n > 4) {
        total += n;
    }
}
System.out.println(total);
```
A) `28`   B) `15`   C) `23`   D) `5`

**Answer: C.** `split(",")` → `["3","10","2","8","5"]`. Parse each; keep those `> 4`: 10, 8, 5 → `10+8+5 = 23` (3 and 2 are skipped). (A) sums everything; (B) sums the skipped-plus-one; (D) keeps only the last.
`[topic 2.10][practice P3]`

---

**Q107. (Analyze Code · 4.13 sub-region (top-left block, dropping the last row/column) accumulate)**
What is printed?
```java
int[][] g = {{1, 2, 3},
             {4, 5, 6},
             {7, 8, 9}};
int sum = 0;
for (int r = 0; r < g.length - 1; r++) {
    for (int c = 0; c < g[r].length - 1; c++) {
        sum += g[r][c];
    }
}
System.out.println(sum);
```
A) `21`   B) `12`   C) `45`   D) `15`

**Answer: B.** The bounds `r < length−1` and `c < length−1` cover only the top-left 2×2 sub-region: `g[0][0..1]` and `g[1][0..1]` = 1+2+4+5 = `12`. (A) adds the third column; (C) sums the whole array; (D) sums one row.
`[topic 4.13][practice P3]`

---

**Q108. (Analyze Code · 4.16 recursion trace — digit accumulation via `%`/`/`)**
What does `r(4729)` return?
```java
public static int r(int n) {
    if (n == 0) return 0;
    return n % 10 + r(n / 10);
}
```
A) `22`   B) `18`   C) `4729`   D) `9`

**Answer: A.** Each call peels the last digit and recurses on the rest: `9 + r(472) = 9 + (2 + r(47)) = 9 + 2 + (7 + r(4)) = 9 + 2 + 7 + (4 + r(0)) = 9+2+7+4 = 22`. (B) drops the `4`; (C) returns the input; (D) returns only the first digit.
`[topic 4.16][practice P3]`

---

**Q109. (Analyze Code · 3.5 + 3.6 mutator + accessor of an object called across a loop, conditional state-update)**
What is printed? (assume the `Counter` class shown)
```java
public class Counter {
    private int count;
    public Counter() { count = 0; }
    public void bump() { count++; }
    public int get() { return count; }
}
// in another class:
public static void main(String[] args) {
    Counter c = new Counter();
    int[] data = {2, 5, 4, 7, 6};
    for (int x : data) {
        if (x % 2 == 0) {
            c.bump();
        }
    }
    System.out.println(c.get() * 10 + data.length);
}
```
A) `30`   B) `55`   C) `50`   D) `35`

**Answer: D.** `bump()` runs once per even value: 2, 4, 6 → count = 3. Then `get() * 10 + data.length = 3*10 + 5 = 35`. (A) drops the `+ data.length`; (C) counts all five values as bumps then drops the length; (B) over-counts the evens.
`[topic 3.5][practice P3]`

---

## Coverage note

This pack alone covers (≥1 trace each): **1.3, 1.5, 1.6, 1.9, 1.11, 1.14, 1.15, 2.2, 2.4, 2.5, 2.6, 2.7, 2.8, 2.9, 2.10, 2.11, 2.12, 3.4, 3.6, 3.8, 4.3, 4.4, 4.5, 4.6, 4.7, 4.8, 4.9, 4.10, 4.11, 4.12, 4.13, 4.14, 4.15, 4.16, 4.17.** Practices used: **P3** (most), **P4** (Q38, Q63, Q74, Q76, Q77, Q80, Q84–Q87, Q90, Q97 — describe behavior / state precondition). New diagnostic styles (Q81–Q97): **which-change-fixes-the-bug** (Q81–Q83, Q92), **state-the-precondition / describe-behavior** (Q84–Q87, Q90), **shared-stem sets** (Q88–Q90, Q91–Q92), **multi-topic synthesis** (Q93–Q95), **`String.compareTo` sign** (Q96), and **merge-sort level trace** (Q97). The remaining topics (1.1, 1.2, 1.4, 1.7, 1.8, 1.10, 1.12, 1.13, 2.1, 2.3, 3.1, 3.2, 3.3, 3.5, 3.7, 3.9, 4.1, 4.2) and practices P1/P2/P5 are covered in the per-unit packs.

**Hard multi-step traces (Q98–Q109):** twelve items that each chain **3+ interacting steps** to match real-exam depth — nested loop with index-dependent inner bound (Q98, Q104), object/`ArrayList` aliased through one or more method calls then read after mutation (Q99, Q105, Q109), build-a-String-then-reparse (Q100), column-major + null guard + `.equals` (Q101), accumulating recursion (Q102, Q108), helper-in-a-loop feeding an accumulator (Q103), split-then-parse-under-condition (Q106), and a 2D sub-region traversal (Q107). New-item answer keys are balanced **3 each across A/B/C/D** (A: Q101,Q104,Q108 · B: Q100,Q102,Q107 · C: Q98,Q103,Q106 · D: Q99,Q105,Q109), keeping the pack's overall distribution even.
