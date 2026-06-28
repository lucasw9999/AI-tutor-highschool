# MCQ Bank — Unit 3: Class Creation

**Unit weight:** 10–18% of the MCQ section. **9 topics (3.1–3.9).** Topic-complete: every topic gets ≥1 item. Practices span **P1 (Design), P2 (Develop), P3 (Analyze), P4 (Document), and P5 (Use Computers Responsibly — topic 3.2 ethics/IP)**.

**In-syllabus pledge.** Classes & constructors are `public`; instance variables are `private`. **No designing inheritance/`extends`, no overriding `toString`/`equals`.** All items original.

> Each item is tagged `[topic 3.x][practice P.Y]`, mapping to `topic-coverage-matrix.md`.

---

**Q1. (Document Code · 3.1 data vs procedural abstraction, code reuse)**
A program needs to compute a rectangle's area in five different places. Writing one `area(int w, int h)` method and calling it five times is an example of:
A) Data abstraction   B) Procedural abstraction / code reuse via a method with parameters   C) Encapsulation of instance variables   D) Overloading

**Answer: B.** Wrapping a repeated computation in a parameterized method is **procedural abstraction**, enabling **code reuse**. Data abstraction hides *data* representation; this hides a *process*.
`[topic 3.1][practice P4]`

---

**Q2. (Document Code · 3.1 instance var vs class var)**
In a `Student` class, each student has their own `gpa`, but the school's `name` is the same for all students. Which is the correct design?
A) Both `gpa` and `name` are instance variables.   B) `gpa` is an instance variable; `name` (shared) is a `static` class variable.   C) Both are `static`.   D) `gpa` is `static`; `name` is an instance variable.

**Answer: B.** Per-object state → **instance** variable (`gpa`); state shared by all objects of the class → **`static` class** variable (`name`).
`[topic 3.1][practice P4]`

---

**Q3. (Use Computers Responsibly · 3.2 algorithmic bias / data fitness)**
A résumé-screening program is trained only on the résumés the company hired over the past ten years — a group that was overwhelmingly from one background. What is the **most likely** problem?
A) The program runs slowly because the data set is large.   B) The recommendations may reflect and amplify the bias already present in the historical data.   C) The program necessarily violates intellectual-property law by storing résumés.   D) The program cannot run because résumé text cannot be processed.

**Answer: B.** Training on a non-representative data set causes **algorithmic bias** — the model learns and amplifies the skew (a data-fitness/ethics issue), not a speed, IP, or feasibility problem.
`[topic 3.2][practice P5]`

---

**Q4. (Use Computers Responsibly · 3.2 intellectual property / open source)**
A developer copies a large block of code from an open-source project that is licensed for reuse **only if the original author is credited**, but ships it with no attribution. This is best described as:
A) Acceptable, because open-source code is always free to use however you like.   B) A violation of the software's license / intellectual-property terms.   C) A logic error in the program.   D) Algorithmic bias.

**Answer: B.** Open-source licenses set **conditions** (here, attribution); ignoring them violates the license and the author's **intellectual-property** rights. "Open source" does not mean "no rules".
`[topic 3.2][practice P5]`

---

**Q5. (Use Computers Responsibly · 3.2 unintended consequences / reliability)**
Which scenario best illustrates an **unintended consequence** of a computing system that programmers should anticipate?
A) A spell-checker correctly flags a misspelled word.   B) A navigation app routes so many drivers down one quiet residential street that the neighborhood becomes congested and unsafe.   C) A program compiles without warnings.   D) A method returns the value its specification promises.

**Answer: B.** A system can work *as designed* yet cause **harm/unintended consequences** in the wider world (here, residential congestion). The others are normal correct behavior.
`[topic 3.2][practice P5]`

---

**Q6. (Document Code · 3.3 encapsulation conventions)**
Per standard encapsulation conventions in this course, which is correct?
A) Instance variables should be `public` so other classes can read them directly.   B) Instance variables should be `private`; classes and constructors should be `public`.   C) Everything should be `static`.   D) Constructors should be `private`.

**Answer: B.** **Encapsulation:** hide data by making instance variables `private`, and expose the type/constructor as `public`. Access to the data goes through accessor/mutator methods.
`[topic 3.3][practice P4]`

---

**Q7. (Analyze Code · 3.3 private blocks outside access)**
This appears in a class **other than** `Account`. Which line does **not** compile?
```java
public class Account {
    private double balance;
    public double getBalance() { return balance; }
}
// in another class:
Account a = new Account();
```
A) `a.getBalance()`   B) `double d = a.balance;`   C) `Account b = new Account();`   D) `System.out.println(a.getBalance());`

**Answer: B.** `balance` is `private`, so `a.balance` is inaccessible **outside** `Account` — compile error. The accessor `getBalance()` is the legal route.
`[topic 3.3][practice P3]`

---

**Q8. (Develop Code · 3.4 constructor initializes all fields)**
A `Rectangle` has `private int width, height;`. Which constructor correctly initializes **both** fields?
A) `public Rectangle(int w) { width = w; }`   B) `public Rectangle(int w, int h) { width = w; height = h; }`   C) `public void Rectangle(int w, int h) { width = w; height = h; }`   D) `public Rectangle(int w, int h) { w = width; h = height; }`

**Answer: B.** A constructor (no return type, class name) must initialize **all** instance variables. (A) leaves `height` at default 0; (C) has `void` so it is a *method*, not a constructor; (D) assigns backwards (fields stay 0).
`[topic 3.4][practice P2]`

---

**Q9. (Analyze Code · 3.4 default field values)**
A class declares `private int count; private String label; private boolean active;` with **no constructor body assigning them**. After `new`, what are their values?
A) `0`, `null`, `false`   B) `0`, `""`, `true`   C) `null`, `null`, `null`   D) `0`, `null`, `true`

**Answer: A.** Default values: numeric → `0`, object reference (`String`) → `null`, `boolean` → `false`.
`[topic 3.4][practice P3]`

---

**Q10. (Document Code · 3.5 accessor vs mutator)**
Which pair correctly distinguishes an accessor from a mutator?
A) An accessor is `void` and changes state; a mutator returns a value.   B) An accessor returns a value without changing state; a mutator (typically `void`) modifies state.   C) Both must return a value.   D) Both must be `void`.

**Answer: B.** **Accessor** = non-`void`, reports state without modifying it; **mutator** = typically `void`, changes state. (A) reverses them.
`[topic 3.5][practice P4]`

---

**Q11. (Analyze Code · 3.5 primitive arg copied in a method)**
What is printed?
```java
public class Box {
    private int n = 0;
    public void addTo(int amount) { n = n + amount; amount = 99; }
    public int getN() { return n; }
}
// elsewhere:
Box b = new Box();
int a = 5;
b.addTo(a);
System.out.println(b.getN() + " " + a);
```
A) `5 99`   B) `5 5`   C) `99 99`   D) `0 5`

**Answer: B.** `addTo` adds 5 to the field `n` (now 5). The parameter `amount` is a **copy** of `a`; setting `amount = 99` doesn't change the caller's `a`. Output `5 5`.
`[topic 3.5][practice P3]`

---

**Q12. (Analyze Code · 3.6 object-reference param aliases — return a reference)**
What is printed?
```java
public class Bag {
    private int[] items;
    public Bag(int[] arr) { items = arr; }   // stores the reference (alias)
    public int[] getItems() { return items; }  // returns the reference
}
// elsewhere:
int[] data = {1, 2, 3};
Bag bag = new Bag(data);
int[] ref = bag.getItems();
ref[0] = 50;
System.out.println(data[0]);
```
A) `1`   B) `50`   C) `0`   D) A `NullPointerException` is thrown.

**Answer: B.** `data`, the field `items`, and `ref` all **alias the same array**. Mutating through `ref` changes the shared array → `data[0]` is `50`. (A defensive copy would have isolated them.)
`[topic 3.6][practice P3]`

---

**Q13. (Analyze Code · 3.7 static variable shared across instances)**
What is printed?
```java
public class Widget {
    private static int made = 0;
    public Widget() { made++; }
    public static int count() { return made; }
}
// elsewhere:
new Widget(); new Widget(); new Widget();
System.out.println(Widget.count());
```
A) `1`   B) `3`   C) `0`   D) Compile error

**Answer: B.** The `static` field `made` is **shared** by the whole class; each constructor call increments it. Three objects → `3`. `count()` is `static`, called on the class.
`[topic 3.7][practice P3]`

---

**Q14. (Analyze Code · 3.7 final cannot be reassigned)**
Which line causes a compile error?
```java
final int LIMIT = 100;     // line 1
int x = LIMIT + 1;         // line 2
LIMIT = 200;               // line 3
System.out.println(x);     // line 4
```
A) line 1   B) line 2   C) line 3   D) line 4

**Answer: C.** A `final` variable cannot be **reassigned** after initialization; `LIMIT = 200;` is illegal. Reading it (line 2) is fine.
`[topic 3.7][practice P3]`

---

**Q15. (Analyze Code · 3.8 scope / shadowing)**
What is printed?
```java
public class Timer {
    private int seconds = 60;
    public void reset() {
        int seconds = 0;        // local shadows the field
    }
    public int get() { return seconds; }
}
// elsewhere:
Timer t = new Timer();
t.reset();
System.out.println(t.get());
```
A) `0`   B) `60`   C) Compile error   D) `null`

**Answer: B.** The local `seconds` in `reset()` **shadows** the field but is a separate variable; setting it to 0 does not touch the field. `get()` still returns the field `60`.
`[topic 3.8][practice P3]`

---

**Q16. (Develop Code · 3.9 this disambiguates a shadowed field)**
A constructor's parameter has the **same name** as the instance variable. Which body correctly sets the field?
```java
private int size;
public Container(int size) {
    // BLANK
}
```
A) `size = size;`   B) `this.size = size;`   C) `size = this.size;`   D) `this.size = this.size;`

**Answer: B.** `this.size` is the **field**; the bare `size` is the parameter. `this.size = size` copies the parameter into the field. (A) assigns the parameter to itself; (C)/(D) leave the field at default.
`[topic 3.9][practice P2]`

---

**Q17. (Analyze Code · 3.9 no this in static context)**
Which statement about `this` is correct?
A) `this` can be used inside a `static` method to refer to the class.   B) `this` refers to the current object and cannot be used in a `static` method (which has no `this`).   C) `this` is required in every method.   D) `this` refers to the parent class.

**Answer: B.** `this` is the **current object** reference; a `static` method belongs to the class, not an object, so it has **no `this`**. It is only needed to disambiguate shadowed members otherwise.
`[topic 3.9][practice P3]`

---

**Q18. (Develop Code · 3.1/3.3 choose the right class design — P1)**
You must model a `Temperature` so that, once created, its value can be **read but never changed** from outside, and its raw field is hidden. Which design best fits?
A) `public double value;` with no methods   B) `private double value;` with a public accessor and **no** mutator   C) `private double value;` with a public mutator and no accessor   D) `static double value;` shared by all temperatures

**Answer: B.** Read-but-not-changed + hidden field = a **`private`** field with a **public accessor and no mutator** (immutable-from-outside). (A) exposes the field; (C) allows changes but no reads; (D) shares one value across all objects.
`[topic 3.3][practice P1]`

---

## Coverage note

Unit 3 topics covered here: **3.1 (Q1,Q2,Q18), 3.2 (Q3,Q4,Q5), 3.3 (Q6,Q7,Q18), 3.4 (Q8,Q9), 3.5 (Q10,Q11), 3.6 (Q12), 3.7 (Q13,Q14), 3.8 (Q15), 3.9 (Q16,Q17)** — all 9 topics. Practices: **P1** (Q18), **P2** (Q8, Q16), **P3** (Q7, Q9, Q11–Q15, Q17), **P4** (Q1, Q2, Q6, Q10), **P5** (Q3, Q4, Q5 — ethics/bias/IP/harm, topic 3.2). 18 items.
