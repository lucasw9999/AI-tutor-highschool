# MCQ Bank — Unit 1: Using Objects & Methods

**Unit weight:** 15–25% of the MCQ section. **15 topics (1.1–1.15).** This pack is topic-complete for Unit 1: every topic gets ≥1 item. Practices span **P1 (Design), P2 (Develop), P3 (Analyze), P4 (Document)** — Unit 1 carries no ethics topic (P5 lives in Units 3–4).

**In-syllabus pledge.** Only the Java Quick Reference library (no `charAt`; single char is `s.substring(i, i + 1)`). The three primitives are `int`, `double`, `boolean` only. All items original.

> Each item is tagged `[topic 1.x][practice P.Y]`, mapping to `topic-coverage-matrix.md`.

---

**Q1. (Document Code · 1.1 error types)**
A program compiles and runs, but always reports the area of a circle as twice the correct value because it uses `2 * Math.PI * r * r`. What kind of error is this?
A) Logic error   B) Syntax error   C) Run-time error / exception   D) A `NullPointerException` thrown while running

**Answer: A.** It compiles and runs without crashing but produces wrong output — that is a **logic error**. Syntax errors stop compilation; run-time errors (C, D) throw exceptions during execution.
`[topic 1.1][practice P4]`

---

**Q2. (Analyze Code · 1.1 error classification)**
Which of these is a **syntax (compile-time)** error?
A) Dividing an `int` by zero at run time   B) Forgetting a semicolon at the end of a statement   C) A loop that never terminates   D) Returning the wrong sum from a method

**Answer: B.** A missing semicolon is caught by the compiler before the program runs — a syntax error. The others are run-time (A) or logic (C, D) errors.
`[topic 1.1][practice P3]`

---

**Q3. (Analyze Code · 1.2 primitive types & literals)**
Which declaration is **legal** Java in this course?
A) `int count = 3.5;`   B) `boolean done = "true";`   C) `int 2x = 4;`   D) `double rate = 5;`

**Answer: D.** `double rate = 5;` widens the `int` literal `5` to `5.0` — legal. (A) loses precision assigning a `double` to `int`; (B) assigns a String to a boolean; (C) has an illegal identifier (starts with a digit).
`[topic 1.2][practice P3]`

---

**Q4. (Analyze Code · 1.3 output & escapes)**
What is printed?
```java
System.out.println("a\\b\"c");
```
A) `ab c`   B) `a\\b\"c`   C) `a\b"c`   D) `a\b\c`

**Answer: C.** `\\` is one backslash; `\"` is one double quote. So the output is `a\b"c`.
`[topic 1.3][practice P3]`

---

**Q5. (Develop Code · 1.4 initialize before use)**
Which line, inserted where marked, makes the segment compile and print `0`?
```java
int total;
// INSERT HERE
System.out.println(total);
```
A) (leave blank — `int` defaults to 0)   B) `int total = 0;`   C) `total = 0;`   D) `total = 0.0;`

**Answer: C.** A **local** variable must be explicitly initialized before use (no default); `total = 0;` assigns it. (A) won't compile — locals have no default. (B) redeclares (duplicate). (D) assigns a `double` to an `int` — type mismatch.
`[topic 1.4][practice P2]`

---

**Q6. (Analyze Code · 1.4 null reference)**
What is printed?
```java
String s = null;
System.out.println(s);
```
A) An empty line   B) A `NullPointerException` is thrown.   C) The empty string `""` (nothing visible)   D) `null`

**Answer: D.** Printing a `null` reference prints the text `null`; only **calling a method** on `null` would throw `NullPointerException` (B). It does not print an empty line (A) or an empty string (C).
`[topic 1.4][practice P3]`

---

**Q7. (Analyze Code · 1.5 cast & extreme values)**
What is printed?
```java
double x = 2.999;
System.out.println((int) x + 1);
```
A) `4`   B) `3.999`   C) `4.0`   D) `3`

**Answer: D.** `(int)` truncates `2.999 → 2`, then `2 + 1 = 3`. (The cast binds tighter than `+`.)
`[topic 1.5][practice P3]`

---

**Q8. (Analyze Code · 1.6 post-decrement in expression)**
What is printed?
```java
int x = 10;
System.out.println(x-- + " " + x);
```
A) `9 9`   B) `10 9`   C) `10 10`   D) `9 10`

**Answer: B.** `x--` yields the **original** 10 first, then decrements `x` to 9. So `"10" + " " + 9` → `10 9`.
`[topic 1.6][practice P3]`

---

**Q9. (Document Code · 1.7 attributes vs behaviors / API)**
In object-oriented terms, a `BankAccount` object's balance and owner name are best described as its ___, and `deposit()` / `withdraw()` are its ___.
A) attributes (state); behaviors (methods)   B) behaviors; attributes   C) packages; libraries   D) constructors; parameters

**Answer: A.** **Attributes** are the object's state (data); **behaviors** are the methods that act on it. An API documents the behaviors a class offers without exposing implementation.
`[topic 1.7][practice P4]`

---

**Q10. (Document Code · 1.8 precondition vs postcondition)**
A method has the comment `// Precondition: arr.length > 0`. What does this tell the caller?
A) The method guarantees the array will be non-empty when it returns.   B) The method will throw an exception if the array is empty.   C) The caller must ensure the array is non-empty before calling; the method may misbehave otherwise.   D) The array will be sorted after the call.

**Answer: C.** A **precondition** is what must be true **on entry** — the caller's responsibility. A postcondition is what the method guarantees on return; throwing is not promised unless stated.
`[topic 1.8][practice P4]`

---

**Q11. (Analyze Code · 1.9 method overloading resolution)**
Two methods exist: `void show(int n)` and `void show(double d)`. What does `show(7)` call, and `show(7.0)`?
A) Both call `show(double)`   B) Both call `show(int)`   C) It is ambiguous and won't compile.   D) `show(7)` → `show(int)`; `show(7.0)` → `show(double)`

**Answer: D.** **Overloading** picks the method whose parameter type matches the argument: an `int` literal matches `show(int)`, a `double` literal matches `show(double)`.
`[topic 1.9][practice P3]`

---

**Q12. (Analyze Code · 1.9 void vs non-void / flow of control)**
What is printed?
```java
public static int square(int n) { return n * n; }

public static void main(String[] args) {
    int r = square(square(3));
    System.out.println(r);
}
```
A) `81`   B) `9`   C) `12`   D) `6`

**Answer: A.** Inner `square(3) = 9`; outer `square(9) = 81`. Control flows into the inner call first, returns 9, then into the outer call.
`[topic 1.9][practice P3]`

---

**Q13. (Analyze Code · 1.10 static method call via class)**
Which call is the correct way to invoke this method from another class?
```java
public class MathUtil {
    public static int twice(int n) { return 2 * n; }
}
```
A) `new MathUtil().twice(5)` is required   B) `twice(5)`   C) `MathUtil.twice(5)`   D) `MathUtil.twice()`

**Answer: C.** A `static` method belongs to the **class**, so it is called `ClassName.method(args)` — `MathUtil.twice(5)`. No object is needed (so C, not A). D omits the argument.
`[topic 1.10][practice P3]`

---

**Q14. (Analyze Code · 1.11 Math.random scaling)**
What is the range of possible values of `r`?
```java
int r = (int)(Math.random() * 4) + 1;
```
A) `0` to `4` inclusive   B) `1` to `4` inclusive   C) `1` to `5` inclusive   D) `0` to `3` inclusive

**Answer: B.** `Math.random()` ∈ [0.0, 1.0); `* 4` ∈ [0.0, 4.0); `(int)` → 0,1,2,3; `+ 1` → 1,2,3,4. Inclusive range **1 to 4**.
`[topic 1.11][practice P3]`

---

**Q15. (Document Code · 1.12 object vs class, extends Object)**
Which statement is **true** for every class in this course?
A) A class is the same thing as an object.   B) A reference variable stores the object's data directly.   C) `null` is a valid object.   D) Every class implicitly extends `Object`, so it inherits methods like `toString` and `equals`.

**Answer: D.** All classes extend `Object` (inheriting `toString`/`equals`). A **class** is the blueprint; an **object** is an instance; a reference variable stores the **address** of an object, and `null` means "no object".
`[topic 1.12][practice P4]`

---

**Q16. (Analyze Code · 1.13 constructor & new)**
Given the class, what does `p.getX()` return after `Point p = new Point(3, 8);`?
```java
public class Point {
    private int x, y;
    public Point(int a, int b) { x = a; y = b; }
    public int getX() { return x; }
}
```
A) `8`   B) `3`   C) `0`   D) `11`

**Answer: B.** `new Point(3, 8)` runs the constructor with `a=3, b=8`, setting `x=3, y=8`. `getX()` returns `x` = `3`.
`[topic 1.13][practice P3]`

---

**Q17. (Develop Code · 1.13 choose the constructor call)**
A class has overloaded constructors `Dog()` and `Dog(String name)`. Which line creates a `Dog` whose name is `"Rex"`?
A) `Dog d = new Dog("Rex");`   B) `Dog d = Dog("Rex");`   C) `Dog d = new Dog();`   D) `Dog d = new Dog(Rex);`

**Answer: A.** `new` plus the constructor matching a `String` argument: `new Dog("Rex")`. (B) omits `new`; (C) calls the no-arg constructor; (D) treats `Rex` as an undeclared variable.
`[topic 1.13][practice P2]`

---

**Q18. (Analyze Code · 1.14 NullPointerException on instance method)**
What is the result of running this segment?
```java
String[] words = new String[3];
System.out.println(words[0].length());
```
A) `0`   B) `3`   C) A `NullPointerException` is thrown.   D) An empty line

**Answer: C.** A new `String[]` is filled with `null`; `words[0]` is `null`, and calling `.length()` on it throws `NullPointerException`.
`[topic 1.14][practice P3]`

---

**Q19. (Analyze Code · 1.15 String methods combined)**
What is printed?
```java
String s = "exam-prep";
int dash = s.indexOf("-");
System.out.println(s.substring(0, dash) + s.substring(dash + 1));
```
A) `examprep`   B) `exam-prep`   C) `exam prep`   D) `prep`

**Answer: A.** `indexOf("-") = 4`; `substring(0,4) = "exam"`, `substring(5) = "prep"`; concatenated → `examprep` (the dash is removed).
`[topic 1.15][practice P3]`

---

**Q20. (Develop Code · 1.15 select correct single-char access)**
Which expression returns the **first character** of a non-empty String `s` as a one-character String, using only the Quick Reference?
A) `s.charAt(0)`   B) `s.substring(0, 1)`   C) `s.substring(1)`   D) `s.get(0)`

**Answer: B.** `charAt` is **not** on the Quick Reference. The in-syllabus way to get a single character is `s.substring(0, 1)` (indices 0 inclusive, 1 exclusive). (C) drops the first char; (D) is not a String method.
`[topic 1.15][practice P2]`

---

## Coverage note

Unit 1 topics covered here: **1.1 (Q1,Q2), 1.2 (Q3), 1.3 (Q4), 1.4 (Q5,Q6), 1.5 (Q7), 1.6 (Q8), 1.7 (Q9), 1.8 (Q10), 1.9 (Q11,Q12), 1.10 (Q13), 1.11 (Q14), 1.12 (Q15), 1.13 (Q16,Q17), 1.14 (Q18), 1.15 (Q19,Q20)** — all 15 topics. Practices: **P2** (Q5, Q17, Q20), **P3** (most), **P4** (Q1, Q9, Q10, Q15). 20 items.
