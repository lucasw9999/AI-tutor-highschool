# MCQ Bank — Unit 2: Selection & Iteration

**Unit weight:** 25–35% of the MCQ section — one of the two biggest units. **12 topics (2.1–2.12).** Topic-complete: every topic gets ≥1 item. Practices span **P1 (Design), P2 (Develop), P3 (Analyze), P4 (Document)**.

**In-syllabus pledge.** `if` / `if-else` / `if-else-if`, `while`, `for` only — **no `do-while`, no `switch`, no ternary `?:`, no labeled break/continue.** Use `.equals()` (not `==`) on Strings. All items original.

> Each item is tagged `[topic 2.x][practice P.Y]`, mapping to `topic-coverage-matrix.md`.

---

**Q1. (Document Code · 2.1 control-flow categories)**
The three building blocks of control flow are sequencing, selection, and repetition. Which construct provides **selection**?
A) Statements executed one after another in order   B) A `for` loop   C) An `if-else` statement   D) A method call

**Answer: C.** **Selection** chooses between paths — `if`/`if-else`. Sequencing = straight-line order (A); repetition = loops (B).
`[topic 2.1][practice P4]`

---

**Q2. (Analyze Code · 2.1 sequential execution)**
What is printed?
```java
int x = 2;
x = x + 5;
x = x * 2;
System.out.println(x);
```
A) `9`   B) `12`   C) `4`   D) `14`

**Answer: D.** Statements run **in sequence**: `2 → 7 → 14`.
`[topic 2.1][practice P3]`

---

**Q3. (Analyze Code · 2.2 relational operators)**
What is printed?
```java
int a = 6, b = 9;
System.out.println(a < b);
System.out.println(a >= b);
```
A) `true` then `false`   B) `false` then `true`   C) `true` then `true`   D) `false` then `false`

**Answer: A.** `6 < 9` is `true`; `6 >= 9` is `false`.
`[topic 2.2][practice P3]`

---

**Q4. (Analyze Code · 2.2 reference vs value comparison)**
Two `String` variables `x` and `y` both hold the contents `"hi"`, but were built so they are **different objects**. What does `x == y` evaluate to, and why?
A) `true`, because the contents match   B) `false`, because `==` on objects compares references, not contents   C) Compile error   D) `true`, because Strings are immutable

**Answer: B.** For objects, `==` compares **references** (addresses). Different objects → `false`, even with equal contents. Use `.equals()` to compare String contents.
`[topic 2.2][practice P3]`

---

**Q5. (Analyze Code · 2.3 if / if-else)**
What is printed when `n = -4`?
```java
int n = -4;
if (n >= 0) {
    System.out.println("nonneg");
} else {
    System.out.println("neg");
}
```
A) `nonneg`   B) Both   C) `neg`   D) Nothing

**Answer: C.** `-4 >= 0` is `false`, so the `else` runs → `neg`.
`[topic 2.3][practice P3]`

---

**Q6. (Develop Code · 2.3 complete the condition)**
Which boolean test, in the blank, prints `"even"` exactly when `n` is even?
```java
if ( /* BLANK */ ) System.out.println("even");
```
A) `n / 2 == 0`   B) `n % 2 == 1`   C) `n == 2`   D) `n % 2 == 0`

**Answer: D.** `n % 2 == 0` is true iff `n` is divisible by 2 (even). (A) tests `n/2` being 0 (only −1..1); (B) tests odd; (C) only `n` equal to 2.
`[topic 2.3][practice P2]`

---

**Q7. (Analyze Code · 2.4 if-else-if boundary)**
What is printed when `score = 70`?
```java
int score = 70;
if (score >= 90)      System.out.println("A");
else if (score >= 80) System.out.println("B");
else if (score >= 70) System.out.println("C");
else                  System.out.println("F");
```
A) `C`   B) `B`   C) `F`   D) `A`

**Answer: A.** `70 >= 90` false; `70 >= 80` false; `70 >= 70` true → `C` (boundary is inclusive). The chain stops there.
`[topic 2.4][practice P3]`

---

**Q8. (Analyze Code · 2.4 nested if)**
What is printed when `x = 6, y = 2`?
```java
int x = 6, y = 2;
if (x > 5) {
    if (y > 5) System.out.println("both");
    else       System.out.println("x only");
} else {
    System.out.println("neither");
}
```
A) `both`   B) `x only`   C) `neither`   D) Nothing

**Answer: B.** `x > 5` true → enter outer; `y > 5` false → inner `else` → `x only`.
`[topic 2.4][practice P3]`

---

**Q9. (Analyze Code · 2.5 short-circuit && order)**
What is printed?
```java
int[] a = {};            // length 0
if (a.length > 0 && a[0] == 5) System.out.println("yes");
else System.out.println("no");
```
A) `yes`   B) An `ArrayIndexOutOfBoundsException` is thrown.   C) `no`   D) Nothing

**Answer: C.** `a.length > 0` is `false`, so `&&` short-circuits and `a[0]` is never evaluated — no exception. Prints `no`. (This is the standard guard idiom.)
`[topic 2.5][practice P3]`

---

**Q10. (Analyze Code · 2.5 precedence of ! && ||)**
What is the value of `r`?
```java
boolean r = !false || false && false;
```
A) `false`   B) compile error   C) `null`   D) `true`

**Answer: D.** `!false = true`; `false && false = false`; `true || false = true`. (`!` binds tightest, then `&&`, then `||`.)
`[topic 2.5][practice P3]`

---

**Q11. (Analyze Code · 2.6 De Morgan & equals)**
For `String s`, which is equivalent to `!(s.equals("yes") || s.equals("no"))`?
A) `!s.equals("yes") && !s.equals("no")`   B) `!s.equals("yes") || !s.equals("no")`   C) `s.equals("yes") && s.equals("no")`   D) `s == "yes" && s == "no"`

**Answer: A.** De Morgan: `!(A || B)` = `!A && !B`. (D) also wrongly uses `==` on Strings.
`[topic 2.6][practice P3]`

---

**Q12. (Analyze Code · 2.6 .equals for String content)**
What is printed?
```java
String a = "dog";
String b = "do" + "g";
System.out.println(a.equals(b));
```
A) `false`   B) `true`   C) Compile error   D) `dog`

**Answer: B.** `.equals` compares **contents**; both hold `"dog"` → `true`. (Regardless of how each was built, contents match.)
`[topic 2.6][practice P3]`

---

**Q13. (Analyze Code · 2.7 while off-by-one)**
What is printed?
```java
int i = 1, product = 1;
while (i <= 4) {
    product *= i;
    i++;
}
System.out.println(product);
```
A) `6`   B) `120`   C) `24`   D) `10`

**Answer: C.** i = 1,2,3,4 → product = 1·1·2·3·4 = `24` (4 factorial). The loop runs while `i <= 4`.
`[topic 2.7][practice P3]`

---

**Q14. (Develop Code · 2.7 fix the infinite loop)**
This loop is intended to print `5 4 3 2 1` but currently never terminates. Which change fixes it?
```java
int n = 5;
while (n > 0) {
    System.out.print(n + " ");
    // (missing update statement)
}
```
A) Add `n++;` in the body   B) Change the condition to `n >= 0`   C) Change `print` to `println`   D) Add `n--;` in the body

**Answer: D.** The loop variable is never updated, so it spins forever. `n--` counts 5→1, then `n=0` fails `n > 0`, printing `5 4 3 2 1`. (A) increments away from the exit; (B) doesn't stop it.
`[topic 2.7][practice P2]`

---

**Q15. (Analyze Code · 2.8 for loop with step)**
How many times does the body run?
```java
for (int i = 10; i >= 1; i -= 3) {
    System.out.println(i);
}
```
A) `4`   B) `3`   C) `5`   D) `10`

**Answer: A.** i = 10, 7, 4, 1 (next would be −2, which fails `i >= 1`). **4** iterations.
`[topic 2.8][practice P3]`

---

**Q16. (Develop Code · 2.8 for↔while equivalence)**
Which `for` loop is equivalent to this `while` loop?
```java
int i = 0;
while (i < n) {
    process(i);
    i++;
}
```
A) `for (int i = 0; i <= n; i++) process(i);`   B) `for (int i = 0; i < n; i++) process(i);`   C) `for (int i = 1; i < n; i++) process(i);`   D) `for (int i = 0; i < n; i--) process(i);`

**Answer: B.** Same init (`i=0`), same condition (`i < n`), same update (`i++`). (A) changes the bound; (C) changes init; (D) changes the update direction.
`[topic 2.8][practice P2]`

---

**Q17. (Analyze Code · 2.9 accumulate sum & count for average)**
What is printed?
```java
int[] a = {4, 6, 8, 2};
int sum = 0, count = 0;
for (int x : a) {
    sum += x;
    count++;
}
System.out.println(sum + " " + count);
```
A) `20 3`   B) `4 20`   C) `20 4`   D) `16 4`

**Answer: C.** sum = 4+6+8+2 = 20; count = 4 elements. Output `20 4`.
`[topic 2.9][practice P3]`

---

**Q18. (Analyze Code · 2.9 divisibility / digit test)**
What is printed?
```java
int n = 1234;
int last = n % 10;
boolean evenLast = (last % 2 == 0);
System.out.println(last + " " + evenLast);
```
A) `4 false`   B) `1 true`   C) `3 true`   D) `4 true`

**Answer: D.** `1234 % 10 = 4` (last digit); `4 % 2 == 0` → `true`. Output `4 true`.
`[topic 2.9][practice P3]`

---

**Q19. (Analyze Code · 2.10 String traversal count)**
What is printed? (counts how many `'a'`s)
```java
String s = "banana";
int count = 0;
for (int i = 0; i < s.length(); i++) {
    if (s.substring(i, i + 1).equals("a")) count++;
}
System.out.println(count);
```
A) `3`   B) `2`   C) `1`   D) `6`

**Answer: A.** `b a n a n a` → three `a`s at indices 1,3,5. Uses `substring(i,i+1)` (no `charAt`) and `.equals`.
`[topic 2.10][practice P3]`

---

**Q20. (Develop Code · 2.10 reverse-string idiom)**
Which loop body, with `String out = ""`, correctly **reverses** `s` into `out`?
```java
for (int i = 0; i < s.length(); i++) {
    // BLANK
}
```
A) `out = out + s.substring(i, i + 1);`   B) `out = s.substring(i, i + 1) + out;`   C) `out = out + s.substring(i);`   D) `out = s + out;`

**Answer: B.** Prepending each character (`char + out`) builds the reversal. (A) copies in order; (C)/(D) are wrong fragments.
`[topic 2.10][practice P2]`

---

**Q21. (Analyze Code · 2.11 nested loop count)**
What is printed?
```java
int n = 0;
for (int i = 0; i < 3; i++) {
    for (int j = 0; j < 4; j++) {
        n++;
    }
}
System.out.println(n);
```
A) `7`   B) `9`   C) `12`   D) `16`

**Answer: C.** Outer 3 × inner 4 = `12`.
`[topic 2.11][practice P3]`

---

**Q22. (Analyze Code · 2.11 nested loop with dependent inner bound)**
What is printed?
```java
int sum = 0;
for (int i = 1; i <= 3; i++) {
    for (int j = i; j <= 3; j++) {
        sum++;
    }
}
System.out.println(sum);
```
A) `9`   B) `3`   C) `7`   D) `6`

**Answer: D.** Inner runs (3−i+1) times: i=1→3, i=2→2, i=3→1 → 3+2+1 = `6`.
`[topic 2.11][practice P3]`

---

**Q23. (Analyze Code · 2.12 statement execution count)**
How many times does `count++` execute, in terms of `n`?
```java
for (int i = 0; i < n; i++) {
    for (int j = 0; j < i; j++) {
        count++;
    }
}
```
A) `n(n−1)/2`   B) `n²`   C) `n`   D) `n²/2 + n`

**Answer: A.** Inner runs `i` times for i = 0..n−1: total 0+1+…+(n−1) = `n(n−1)/2`.
`[topic 2.12][practice P3]`

---

**Q24. (Document Code · 2.12 compare loop costs)**
Two loops process `n` items. Loop X runs a single `for i in 0..n`; Loop Y has a `for i in 0..n` containing a `for j in 0..n`. Which statement is correct?
A) X and Y run the same number of times.   B) Y runs roughly `n` times as often as X (linear vs quadratic growth).   C) X runs more often than Y.   D) Neither depends on `n`.

**Answer: B.** X is linear (`n`), Y is quadratic (`n²`). As `n` grows, Y's count grows about `n` times faster — no Big-O notation needed, just the comparison.
`[topic 2.12][practice P4]`

---

**Q25. (Develop Code · 2.1/2.5 design a guarded test — P1)**
You must print `"safe"` only when `divisor` is nonzero **and** `value / divisor` exceeds 10, without ever throwing an `ArithmeticException`. Which design is correct?
A) `if (value / divisor > 10 && divisor != 0)`   B) `if (divisor != 0 || value / divisor > 10)`   C) `if (divisor != 0 && value / divisor > 10)`   D) `if (value / divisor > 10)`

**Answer: C.** Put the `divisor != 0` guard **first** so `&&` short-circuits before the division. (A) divides first → can throw; (B) `||` still evaluates the division when divisor is 0; (D) has no guard.
`[topic 2.5][practice P1]`

---

**Q26. (Develop Code · 2.9 complete the segment — count multiples)**
Fill the blank so `count` ends up holding how many integers in `1..n` are multiples of 3.
```java
int count = 0;
for (int i = 1; i <= n; i++) {
    if ( /* BLANK */ ) count++;
}
```
A) `i % 3 == 0`   B) `i / 3 == 0`   C) `i % 3 == 1`   D) `i * 3 == 0`

**Answer: A.** A multiple of 3 leaves remainder 0: `i % 3 == 0`. (B) tests `i/3` being 0 (only `i = 1, 2`); (C) tests remainder 1; (D) is true only for `i = 0`, which the loop never reaches.
`[topic 2.9][practice P2]`

---

**Q27. (Develop Code · 2.11 complete the segment — inner bound for a triangle)**
This is meant to print a right triangle of stars: row 1 one star, row 2 two stars, …, row `n` `n` stars. Fill the inner-loop condition.
```java
for (int r = 1; r <= n; r++) {
    for (int c = 1; /* BLANK */; c++) {
        System.out.print("*");
    }
    System.out.println();
}
```
A) `c <= n`   B) `c <= r`   C) `c < r`   D) `c <= n - r`

**Answer: B.** Row `r` should print `r` stars, so the inner loop runs `c = 1..r`: condition `c <= r`. (A) prints `n` stars every row (a rectangle); (C) prints `r−1`; (D) prints a shrinking count.
`[topic 2.11][practice P2]`

---

## Coverage note

Unit 2 topics covered here: **2.1 (Q1,Q2), 2.2 (Q3,Q4), 2.3 (Q5,Q6), 2.4 (Q7,Q8), 2.5 (Q9,Q10,Q25), 2.6 (Q11,Q12), 2.7 (Q13,Q14), 2.8 (Q15,Q16), 2.9 (Q17,Q18,Q26), 2.10 (Q19,Q20), 2.11 (Q21,Q22,Q27), 2.12 (Q23,Q24)** — all 12 topics. Practices: **P1** (Q25), **P2** (Q6, Q14, Q16, Q20, Q26, Q27), **P3** (most), **P4** (Q1, Q24). 27 items (weighted heavy, matching U2's 25–35% share).
