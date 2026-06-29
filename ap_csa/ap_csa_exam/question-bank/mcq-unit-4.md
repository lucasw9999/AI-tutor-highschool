# MCQ Bank — Unit 4: Data Collections

**Unit weight:** 30–40% of the MCQ section — the **single biggest unit**. **17 topics (4.1–4.17).** Topic-complete: every topic gets ≥1 item. Practices span **P1 (Design), P2 (Develop), P3 (Analyze), P4 (Document), and P5 (Use Computers Responsibly — topic 4.1 privacy/bias/data fitness)**.

**In-syllabus pledge.** `arr.length` (attribute) vs `str.length()` vs `list.size()`. `ArrayList` uses the 6 Quick-Reference methods only. **No jagged 2D arrays. Recursion / selection / insertion / binary / merge are TRACE-ONLY — never "write the sort".** `Scanner` reads from a `File` only (no keyboard, no `nextLine` mixed with token methods, no regex in `split`). All items original.

> Each item is tagged `[topic 4.x][practice P.Y]`, mapping to `topic-coverage-matrix.md`.

---

**Q1. (Use Computers Responsibly · 4.1 privacy / data fitness)**
A fitness app collects users' precise GPS location every minute and stores it indefinitely on a server. Which is the **most significant** responsible-computing concern?
A) The data set is too small to be useful.   B) Continuously collecting and retaining precise location data creates a serious **privacy** risk if it is exposed or misused.   C) GPS coordinates cannot be stored in an array.   D) The app will necessarily contain a logic error.

**Answer: B.** Collecting fine-grained personal data (location) and keeping it indefinitely is a classic **privacy** risk — the central data-collection ethics concern. The others are false or irrelevant.
`[topic 4.1][practice P5]`

---

**Q2. (Use Computers Responsibly · 4.1 algorithmic bias / fitness of data)**
A model predicting loan risk is trained on historical approvals from an era with discriminatory lending. Deploying it as-is is risky mainly because:
A) The data is too recent to be reliable.   B) The historical data is **not fit for the purpose** — it encodes past bias, which the model will reproduce.   C) Arrays cannot store financial data.   D) The model will run out of memory.

**Answer: B.** **Fitness of data for a purpose**: biased historical data makes the model reproduce that bias. The other options are false.
`[topic 4.1][practice P5]`

---

**Q3. (Document Code · 4.2 data set / one-at-a-time access)**
The shared idea behind arrays, `ArrayList`s, and file streams is that they are **data sets** whose elements are accessed:
A) all simultaneously in one operation   B) one at a time (sequentially or by index)   C) only in reverse order   D) only if they are sorted

**Answer: B.** A data set is processed by accessing elements **one at a time** — by index or sequentially. None of the structures require simultaneous, reverse-only, or sorted access.
`[topic 4.2][practice P4]`

---

**Q4. (Analyze Code · 4.2 sequential access accumulation)**
What is printed?
```java
int[] data = {3, 1, 4, 1, 5};
int sum = 0;
for (int i = 0; i < data.length; i++) {
    sum += data[i];
}
System.out.println(sum);
```
A) `14`   B) `13`   C) `5`   D) `15`

**Answer: A.** Sequential one-at-a-time access summing every element: 3+1+4+1+5 = `14`.
`[topic 4.2][practice P3]`

---

**Q5. (Analyze Code · 4.3 length attribute, no parens)**
Which expression correctly gives the number of elements in `int[] arr`?
A) `arr.length()`   B) `arr.size()`   C) `arr.length`   D) `length(arr)`

**Answer: C.** For an **array**, `length` is an **attribute** — no parentheses. (`length()` is a String method; `size()` is an ArrayList method — the classic length/size trap.)
`[topic 4.3][practice P3]`

---

**Q6. (Analyze Code · 4.3 ArrayIndexOutOfBounds)**
What is the result of running this segment?
```java
int[] a = new int[4];
a[4] = 9;
System.out.println(a[4]);
```
A) `9`   B) `0`   C) An `ArrayIndexOutOfBoundsException` is thrown.   D) `null`

**Answer: C.** Valid indices for length 4 are 0..3; `a[4]` is out of bounds → `ArrayIndexOutOfBoundsException` at the assignment.
`[topic 4.3][practice P3]`

---

**Q7. (Analyze Code · 4.4 indexed vs enhanced-for equivalence)**
Which loop prints the same output as `for (int x : a) System.out.print(x);` for `int[] a`?
A) `for (int i = 0; i <= a.length; i++) System.out.print(a[i]);`   B) `for (int i = 0; i < a.length; i++) System.out.print(a[i]);`   C) `for (int i = 1; i < a.length; i++) System.out.print(a[i]);`   D) `for (int i = a.length; i > 0; i--) System.out.print(a[i]);`

**Answer: B.** Enhanced-for visits every element in order, index 0..length−1 — exactly `i = 0; i < a.length; i++`. (A) goes out of bounds; (C) skips index 0; (D) is reversed and out of bounds.
`[topic 4.4][practice P3]`

---

**Q8. (Analyze Code · 4.5 replace elements in place)**
What is printed?
```java
int[] a = {1, 2, 3, 4, 5};
for (int i = 0; i < a.length; i++) {
    if (a[i] % 2 == 1) a[i] = 0;
}
System.out.println(a[0] + "" + a[1] + a[2] + a[3] + a[4]);
```
A) `02040`   B) `10305`   C) `00000`   D) `12345`

**Answer: A.** Odd elements (1,3,5 at indices 0,2,4) replaced with 0 → `{0,2,0,4,0}` → prints `02040`.
`[topic 4.5][practice P3]`

---

**Q9. (Develop Code · 4.5 select the linear-search snippet — P1)**
Which loop body correctly sets `found = true` if `target` appears anywhere in `int[] a`?
```java
boolean found = false;
for (int i = 0; i < a.length; i++) {
    // BLANK
}
```
A) `if (a[i] == target) found = true;`   B) `if (a[i] == target) found = false;`   C) `found = (a[i] == target);`   D) `if (i == target) found = true;`

**Answer: A.** Set `found = true` on a match and never reset it. (B) sets it false; (C) overwrites `found` each pass so only the **last** element decides; (D) compares the index, not the element.
`[topic 4.5][practice P1]`

---

**Q10. (Analyze Code · 4.6 file Scanner with hasNext + split)**
A file `scores.txt` contains:
```
Amy 90
Bo 75
```
What does this print? (inside a method that `throws IOException`)
```java
Scanner sc = new Scanner(new File("scores.txt"));
int total = 0;
while (sc.hasNext()) {
    String name = sc.next();
    int score = sc.nextInt();
    total += score;
}
sc.close();
System.out.println(total);
```
A) `165`   B) `90`   C) `75`   D) `2`

**Answer: A.** Reads token pairs: ("Amy",90), ("Bo",75); total = 90 + 75 = `165`. `hasNext()` controls the loop; `close()` at the end. (No `nextLine` mixing.)
`[topic 4.6][practice P3]`

---

**Q11. (Analyze Code · 4.7 wrapper immutability + autoboxing/unboxing)**
What is printed?
```java
Integer a = 5;          // autobox
int b = a + 3;          // unbox, add
Integer c = b;          // autobox
System.out.println(c);
```
A) `8`   B) `53`   C) `5`   D) `Integer`

**Answer: A.** `a` autoboxes 5; `a + 3` unboxes to 5, adds → `b = 8`; `c` autoboxes 8 → prints `8`. `Integer` is immutable but reassigning `c` is fine.
`[topic 4.7][practice P3]`

---

**Q12. (Develop Code · 4.7 parse text to number)**
A file token is the String `"  -12 "`'s trimmed form `"-12"`. Which converts it to the `int` value `-12`?
A) `Integer.valueOf` (not on the reference)   B) `Integer.parseInt("-12")`   C) `(int) "-12"`   D) `Double.parseDouble("-12")`

**Answer: B.** `Integer.parseInt(String)` parses a signed decimal integer → `-12`. (C) cannot cast a String to int; (D) yields a `double` (`-12.0`), not an `int`.
`[topic 4.7][practice P2]`

---

**Q13. (Analyze Code · 4.8 ArrayList creation & methods)**
What is printed?
```java
ArrayList<String> list = new ArrayList<String>();
list.add("a");
list.add("b");
list.add("c");
String old = list.set(1, "z");
System.out.println(old + " " + list.size() + " " + list.get(1));
```
A) `b 3 z`   B) `z 3 b`   C) `b 4 z`   D) `a 3 z`

**Answer: A.** `set(1,"z")` returns the **old** element `"b"` and replaces it; size stays 3; `get(1)` is now `"z"`. Output `b 3 z`.
`[topic 4.8][practice P3]`

---

**Q14. (Analyze Code · 4.9 IndexOutOfBounds on ArrayList)**
What is the result of running this segment?
```java
ArrayList<Integer> list = new ArrayList<Integer>();
list.add(10);
list.add(20);
System.out.println(list.get(2));
```
A) `20`   B) `0`   C) An `IndexOutOfBoundsException` is thrown.   D) `null`

**Answer: C.** Size 2 → valid indices 0..1; `get(2)` throws `IndexOutOfBoundsException`.
`[topic 4.9][practice P3]`

---

**Q15. (Develop Code · 4.9 fix remove-while-iterating — P1)**
You want to remove every `0` from an `ArrayList<Integer>`. Which loop design is **correct** (no skipped elements, no exception)?
A) Enhanced-for: `for (int x : list) if (x == 0) list.remove(...);`   B) Backward index loop: `for (int i = list.size() - 1; i >= 0; i--) if (list.get(i) == 0) list.remove(i);`   C) Forward loop with `i++` always: removing at `i` then `i++`   D) `for (int i = 0; i < list.size(); i++) list.remove(i);`

**Answer: B.** Iterating **backward** means a left-shift after `remove` never skips an unexamined element. (A) throws `ConcurrentModificationException`; (C) skips the shifted-in element; (D) removes the wrong elements as the list shrinks.
`[topic 4.9][practice P1]`

---

**Q16. (Analyze Code · 4.10 ArrayList delete-by-condition result)**
What does `list` contain after this runs?
```java
ArrayList<Integer> list = new ArrayList<Integer>();
list.add(4); list.add(7); list.add(2); list.add(9);
for (int i = list.size() - 1; i >= 0; i--) {
    if (list.get(i) < 5) list.remove(i);
}
System.out.println(list);
```
A) `[7, 9]`   B) `[4, 2]`   C) `[4, 7, 2, 9]`   D) `[]`

**Answer: A.** Backward delete-by-condition removes elements < 5 (the 2 and the 4), leaving `[7, 9]` in order. Backward traversal avoids skips.
`[topic 4.10][practice P3]`

---

**Q17. (Analyze Code · 4.10 multi-structure simultaneous traversal)**
What is printed?
```java
ArrayList<Integer> a = new ArrayList<Integer>();
a.add(1); a.add(2); a.add(3);
ArrayList<Integer> b = new ArrayList<Integer>();
b.add(10); b.add(20); b.add(30);
int sum = 0;
for (int i = 0; i < a.size(); i++) {
    sum += a.get(i) * b.get(i);
}
System.out.println(sum);
```
A) `140`   B) `60`   C) `6`   D) `66`

**Answer: A.** Parallel traversal: 1·10 + 2·20 + 3·30 = 10 + 40 + 90 = `140`.
`[topic 4.10][practice P3]`

---

**Q18. (Analyze Code · 4.11 2D structure & indexing)**
For `int[][] m = new int[3][5];`, which is true?
A) `m.length` is 5 and `m[0].length` is 3.   B) `m.length` is 3 (rows) and `m[0].length` is 5 (columns).   C) `m.length` is 15.   D) `m` is jagged.

**Answer: B.** `new int[3][5]` is 3 rows × 5 columns: `m.length` = rows = 3, `m[0].length` = columns = 5. Rectangular, not jagged.
`[topic 4.11][practice P3]`

---

**Q19. (Analyze Code · 4.12 column-major traversal)**
What is printed?
```java
int[][] g = {{1, 2, 3},
             {4, 5, 6}};
int sum = 0;
for (int c = 0; c < g[0].length; c++) {
    for (int r = 0; r < g.length; r++) {
        sum += g[r][c];
    }
}
System.out.println(sum);
```
A) `21`   B) `6`   C) `12`   D) `15`

**Answer: A.** Column-major still visits every cell once: 1+2+3+4+5+6 = `21` (order differs from row-major, total is the same).
`[topic 4.12][practice P3]`

---

**Q20. (Analyze Code · 4.13 sum a single column of a 2D array)**
What is printed?
```java
int[][] g = {{2, 9},
             {4, 1},
             {6, 3}};
int sum = 0;
for (int r = 0; r < g.length; r++) {
    sum += g[r][0];
}
System.out.println(sum);
```
A) `12`   B) `13`   C) `21`   D) `2`

**Answer: A.** Sums column 0 down all rows: 2 + 4 + 6 = `12`.
`[topic 4.13][practice P3]`

---

**Q21. (Document Code · 4.13 describe a 2D algorithm — precondition)**
A method `int countPositive(int[][] g)` returns how many entries of `g` are `> 0`. For it to work without an exception on an empty-row situation, what precondition is most appropriate?
A) `g` is sorted.   B) `g` is a rectangular (non-jagged) array with each row of the same length.   C) `g` contains only positive numbers.   D) `g.length == g[0].length`.

**Answer: B.** The course assumes **rectangular** 2D arrays; that is the precondition that makes `g[r].length`/`g[0].length` traversal safe. Sorting (A), all-positive (C), and square (D) are not required.
`[topic 4.13][practice P4]`

---

**Q22. (Analyze Code · 4.14 linear search returns -1 when absent)**
What does this print for `target = 8`?
```java
int[] a = {3, 5, 7, 9};
int target = 8;
int result = -1;
for (int i = 0; i < a.length; i++) {
    if (a[i] == target) { result = i; }
}
System.out.println(result);
```
A) `-1`   B) `0`   C) `3`   D) `8`

**Answer: A.** `8` is not in the array, so `result` stays `-1` (the standard "not found" sentinel from a linear search).
`[topic 4.14][practice P3]`

---

**Q23. (Analyze Code · 4.15 selection sort after two passes)**
Selection sort places the minimum of the unsorted segment at the front each pass. After **two** passes on `{30, 10, 20, 40}`, what is the array?
A) `{10, 20, 30, 40}`   B) `{10, 20, 40, 30}`   C) `{10, 30, 20, 40}`   D) `{20, 10, 30, 40}`

**Answer: A.** Pass 1: min 10 → front: `{10, 30, 20, 40}`. Pass 2: min of `{30,20,40}` is 20, swap with index 1: `{10, 20, 30, 40}`. (Here it is fully sorted after two passes.)
`[topic 4.15][practice P3]`

---

**Q24. (Analyze Code · 4.16 recursion trace)**
What does `f(3)` return?
```java
public static int f(int n) {
    if (n == 0) return 5;
    return f(n - 1) + 2;
}
```
A) `11`   B) `6`   C) `5`   D) `8`

**Answer: A.** `f(0)=5`; `f(1)=5+2=7`; `f(2)=7+2=9`; `f(3)=9+2=11`.
`[topic 4.16][practice P3]`

---

**Q25. (Analyze Code · 4.17 binary search trace)**
On the sorted array `{2, 5, 8, 11, 14, 17, 20}` (indices 0..6), binary search for `target = 17` first examines index 3 (value 11). Which index does it examine **next**? (`mid = (low+high)/2`)
A) `4`   B) `5`   C) `6`   D) `2`

**Answer: B.** `17 > 11` → search the upper half: `low = 4, high = 6`, `mid = (4+6)/2 = 5`. Next index examined is `5` (value 17, found).
`[topic 4.17][practice P3]`

---

**Q26. (Develop Code · 4.3/4.5 design a max-finder initialization — P1)**
You must find the maximum of `int[] a` where every value could be negative. Which initialization of `max` is **safe**?
A) `int max = 0;`   B) `int max = a[0];` (then scan from index 1)   C) `int max = Integer.MIN_VALUE / 2;` but only scan even indices   D) `int max = a.length;`

**Answer: B.** Seed `max` with the **first element**, then compare the rest — correct even if all values are negative. (A) wrongly returns 0 when all values are negative; (C) skips odd indices; (D) uses the length, not an element.
`[topic 4.5][practice P1]`

---

**Q27. (Analyze Code · 4.4 enhanced-for over objects mutates shared object)**
A `Cell` has a `void light()` mutator and `boolean isOn()`. What is printed?
```java
Cell[] row = {new Cell(), new Cell(), new Cell()};
for (Cell c : row) {
    c.light();
}
System.out.println(row[2].isOn());
```
A) `true`   B) `false`   C) Compile error   D) A `NullPointerException` is thrown.

**Answer: A.** The enhanced-for copies each **reference**; calling the mutator `light()` changes the shared object. `row[2]` is now on → `true`.
`[topic 4.4][practice P3]`

---

**Q28. (Develop Code · 4.5 complete the segment — accumulate sum)**
Fill the blank so `sum` ends up holding the total of all elements in `int[] a`.
```java
int sum = 0;
for (int i = 0; i < a.length; i++) {
    // BLANK
}
```
A) `sum = a[i];`   B) `sum += a[i];`   C) `sum += i;`   D) `sum += a[sum];`

**Answer: B.** Accumulate by adding each element to the running total: `sum += a[i];`. (A) overwrites, leaving only the last element; (C) adds indices, not values; (D) indexes by the running sum (likely out of bounds).
`[topic 4.5][practice P2]`

---

**Q29. (Develop Code · 4.13 complete the segment — sum a 2D array)**
Fill the inner-loop body so `total` holds the sum of every element of the rectangular array `int[][] g`.
```java
int total = 0;
for (int r = 0; r < g.length; r++) {
    for (int c = 0; c < g[r].length; c++) {
        // BLANK
    }
}
```
A) `total += g[c][r];`   B) `total += g[r][c];`   C) `total += g[r];`   D) `total = g[r][c];`

**Answer: B.** Row-major access of every cell uses `g[r][c]` with `r` the row and `c` the column. (A) swaps indices (out of bounds on non-square arrays); (C) adds a row reference (won't compile); (D) overwrites instead of accumulating.
`[topic 4.13][practice P2]`

---

**Q30. (Develop Code · 4.10 complete the segment — count by condition in an ArrayList)**
Fill the blank so `count` holds how many elements of `ArrayList<Integer> nums` are negative.
```java
int count = 0;
for (int x : nums) {
    // BLANK
}
```
A) `if (x < 0) count++;`   B) `if (x > 0) count++;`   C) `count++;`   D) `if (x < 0) count = 0;`

**Answer: A.** Increment only when the element is negative: `if (x < 0) count++;`. (B) counts positives; (C) counts all elements; (D) resets the counter.
`[topic 4.10][practice P2]`

---

**Q31. (Design Code · 4.5/4.10 decompose a design — P1.A)**
You must process a roster of scores to report (1) the average and (2) how many are above that average. Which overall design **best** decomposes the problem?
A) A single loop that tries to compute the average and the above-average count in the same pass, dividing by the count before it is known.   B) First traverse once to compute the sum and derive the average; then traverse a second time comparing each score to the average and counting those above it.   C) Sort the scores, then assume the average is the middle element.   D) Store every score in a separate named variable and compare them by hand with an `if-else-if` chain.

**Answer: B.** The average must be **fully known before** any score can be compared to it, so a clean decomposition is **two passes** (compute average, then count above it). (A) compares before the average exists; (C) confuses median with mean; (D) does not generalize to an arbitrary roster size.
`[topic 4.5][practice P1]`

---

**Q32. (Use Computers Responsibly · 4.1 open-source license / IP violation)**
A team ships a product that statically links a library released under a license requiring that **any distributed product including it must publish its own source code**. They distribute the binary but keep all their source closed. This is best described as:
A) Fine, because compiled binaries are exempt from all software licenses.   B) A violation of the library's license terms (and thus the authors' intellectual-property rights).   C) An algorithmic-bias problem.   D) A runtime exception waiting to happen.

**Answer: B.** Open-source licenses impose **conditions**; here the condition (publish source of the combined work) was ignored, violating the license and the authors' **IP** rights. Compiled distribution is still distribution — not exempt. (This is a license-obligation scenario, distinct from a plain no-attribution copy.)
`[topic 4.1][practice P5]`

---

**Q33. (Use Computers Responsibly · 4.1 unintended consequence)**
A social app adds an "engagement" feed that always shows whatever keeps users scrolling longest. Months later, users report it mostly surfaces outrage-bait and they feel worse, even though daily-use time rose. Which best describes this?
A) A syntax error in the ranking code.   B) An **unintended consequence**: the system optimized exactly what it was told to (time-on-app) but produced real-world harm the designers did not intend.   C) A privacy breach.   D) Proof the algorithm is unbiased.

**Answer: B.** The system worked **as specified** (maximize scrolling) yet caused harm nobody intended — the definition of an **unintended consequence** that responsible designers must anticipate. It is neither a code error, a privacy breach, nor evidence of fairness. (Distinct from the navigation-congestion and training-bias scenarios elsewhere.)
`[topic 4.1][practice P5]`

---

**Q34. (Use Computers Responsibly · 4.1 data-privacy-vs-utility tradeoff)**
A hospital wants to publish a patient data set so researchers can study a disease, but raw records identify individuals. Which option best balances **research utility against privacy**?
A) Publish the full raw records, since research benefit outweighs everything.   B) Publish nothing, since any disclosure risk is unacceptable.   C) Release a version with direct identifiers removed/aggregated so trends remain studiable while individuals are not re-identifiable.   D) Replace every value with a random number so no real data remains.

**Answer: C.** The responsible tradeoff **retains analytic value** while **protecting privacy** by de-identifying/aggregating before release. (A) ignores privacy; (B) ignores utility entirely; (D) destroys the data's usefulness. (A genuine utility-vs-privacy balance, distinct from pure privacy-risk or bias items.)
`[topic 4.1][practice P5]`

---

**Q35. (Analyze Code · 4.6 Scanner nextDouble over a file)**
A file `temps.txt` contains exactly:
```
98.6 99.1 100.4
```
What does this print? (inside a method that `throws IOException`)
```java
Scanner sc = new Scanner(new File("temps.txt"));
double sum = 0.0;
while (sc.hasNext()) {
    sum += sc.nextDouble();
}
sc.close();
System.out.println(sum);
```
A) `298.1`   B) `298`   C) `100.4`   D) `3`

**Answer: A.** `nextDouble()` reads each whitespace-delimited token as a double: 98.6 + 99.1 + 100.4 = `298.1`. The `hasNext()` loop reads to end of file, then `close()`.
`[topic 4.6][practice P3]`

---

**Q36. (Analyze Code · 4.6 Scanner nextBoolean over a file)**
A file `flags.txt` contains exactly:
```
true false true true
```
What does this print? (inside a method that `throws IOException`)
```java
Scanner sc = new Scanner(new File("flags.txt"));
int trues = 0;
while (sc.hasNext()) {
    if (sc.nextBoolean()) trues++;
}
sc.close();
System.out.println(trues);
```
A) `3`   B) `4`   C) `1`   D) `2`

**Answer: A.** `nextBoolean()` reads each token as a boolean; three are `true` → `trues = 3`.
`[topic 4.6][practice P3]`

---

**Q37. (Analyze Code · 4.6 one nextLine per line)**
A file `names.txt` contains exactly these three lines:
```
Ada Lovelace
Alan Turing
Grace Hopper
```
What does this print? (inside a method that `throws IOException`)
```java
Scanner sc = new Scanner(new File("names.txt"));
int lines = 0;
while (sc.hasNext()) {
    String whole = sc.nextLine();   // read an entire line, spaces included
    lines++;
}
sc.close();
System.out.println(lines);
```
A) `3`   B) `6`   C) `1`   D) `2`

**Answer: A.** Each `nextLine()` consumes one full line (including the internal space), so the loop runs once per line → `lines = 3`. (`nextLine` is used here as the **only** read method on this Scanner — never mixed with token methods.)
`[topic 4.6][practice P3]`

---

## Coverage note

Unit 4 topics covered here: **4.1 (Q1,Q2,Q32,Q33,Q34), 4.2 (Q3,Q4), 4.3 (Q5,Q6,Q26), 4.4 (Q7,Q27), 4.5 (Q8,Q9,Q26,Q28,Q31), 4.6 (Q10,Q35,Q36,Q37), 4.7 (Q11,Q12), 4.8 (Q13), 4.9 (Q14,Q15), 4.10 (Q16,Q17,Q30), 4.11 (Q18), 4.12 (Q19), 4.13 (Q20,Q21,Q29), 4.14 (Q22), 4.15 (Q23), 4.16 (Q24), 4.17 (Q25)** — all 17 topics. Practices: **P1** (Q9, Q15, Q26, Q31 — incl. a 1.A design/decomposition item), **P2** (Q12, Q28, Q29, Q30), **P3** (most), **P4** (Q3, Q21), **P5** (Q1, Q2 privacy/bias/data fitness; Q32 open-source license/IP; Q33 unintended consequence; Q34 privacy-vs-utility tradeoff — topic 4.1). 37 items (weighted heavy, matching U4's 30–40% share).
