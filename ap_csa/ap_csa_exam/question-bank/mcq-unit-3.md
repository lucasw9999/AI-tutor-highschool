# MCQ Bank — Unit 3: Class Creation

**Unit weight:** 10–18% of the MCQ section. **9 topics (3.1–3.9).** Topic-complete: every topic gets ≥1 item. Practices span **P1 (Design), P2 (Develop), P3 (Analyze), P4 (Document), and P5 (Use Computers Responsibly — topic 3.2 ethics/IP)**.

**In-syllabus pledge.** Classes & constructors are `public`; instance variables are `private`. **No designing inheritance/`extends`, no overriding `toString`/`equals`.** All items original.

> Each item is tagged `[topic 3.x][practice P.Y]`, mapping to `topic-coverage-matrix.md`.

---

**Q1. (Document Code · 3.1 data vs procedural abstraction, code reuse)**
A program needs to compute a rectangle's area in five different places. Writing one `area(int w, int h)` method and calling it five times is an example of:
A) Procedural abstraction / code reuse via a method with parameters   B) Data abstraction   C) Encapsulation of instance variables   D) Overloading

**Answer: A.** Wrapping a repeated computation in a parameterized method is **procedural abstraction**, enabling **code reuse**. Data abstraction hides *data* representation; this hides a *process*.
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
A) It is purely a privacy violation, because it stores applicants' personal résumé data.   B) It is merely an overfitting/accuracy problem, fixable by feeding it more of the same historical résumés.   C) The recommendations may reflect and amplify the bias already present in the historical data.   D) The program necessarily violates intellectual-property law by storing résumés.

**Answer: C.** Training on a non-representative data set causes **algorithmic bias** — the model learns and amplifies the skew (a data-fitness/ethics issue). (A) misframes it as privacy and (B) as overfitting — but more of the same skewed data deepens the bias; (D) is not the central concern.
`[topic 3.2][practice P5]`

---

**Q4. (Use Computers Responsibly · 3.2 intellectual property / open source)**
A developer copies a large block of code from an open-source project that is licensed for reuse **only if the original author is credited**, but ships it with no attribution. This is best described as:
A) Acceptable, because once code is published publicly its copyright no longer applies.   B) Algorithmic bias.   C) An unintended consequence of reusing someone else's code.   D) A violation of the software's license / intellectual-property terms.

**Answer: D.** Open-source licenses set **conditions** (here, attribution); ignoring them violates the license and the author's **intellectual-property** rights. (A) misstates copyright — public code is still copyrighted; (B)/(C) are unrelated framings. "Open source" does not mean "no rules".
`[topic 3.2][practice P5]`

---

**Q5. (Use Computers Responsibly · 3.2 unintended consequences / reliability)**
Which scenario best illustrates an **unintended consequence** of a computing system that programmers should anticipate?
A) A navigation app routes so many drivers down one quiet residential street that the neighborhood becomes congested and unsafe.   B) A program that crashes when given malformed input — a plain reliability bug.   C) A model trained on a data set that is simply too small to be accurate.   D) A spell-checker correctly flags a misspelled word.

**Answer: A.** A system can work *as designed* yet cause **harm/unintended consequences** in the wider world (here, residential congestion). (B) is an ordinary reliability defect, (C) is a data-sufficiency issue, and (D) is normal correct behavior — none is an unintended downstream harm.
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
A) `a.getBalance()`   B) `Account b = new Account();`   C) `double d = a.balance;`   D) `System.out.println(a.getBalance());`

**Answer: C.** `balance` is `private`, so `a.balance` is inaccessible **outside** `Account` — compile error. The accessor `getBalance()` is the legal route.
`[topic 3.3][practice P3]`

---

**Q8. (Develop Code · 3.4 constructor initializes all fields)**
A `Rectangle` has `private int width, height;`. Which constructor correctly initializes **both** fields?
A) `public Rectangle(int w) { width = w; }`   B) `public void Rectangle(int w, int h) { width = w; height = h; }`   C) `public Rectangle(int w, int h) { w = width; h = height; }`   D) `public Rectangle(int w, int h) { width = w; height = h; }`

**Answer: D.** A constructor (no return type, class name) must initialize **all** instance variables. (A) leaves `height` at default 0; (B) has `void` so it is a *method*, not a constructor; (C) assigns backwards (fields stay 0).
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
A) `5 99`   B) `99 99`   C) `5 5`   D) `0 5`

**Answer: C.** `addTo` adds 5 to the field `n` (now 5). The parameter `amount` is a **copy** of `a`; setting `amount = 99` doesn't change the caller's `a`. Output `5 5`.
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
A) `1`   B) `0`   C) A `NullPointerException` is thrown.   D) `50`

**Answer: D.** `data`, the field `items`, and `ref` all **alias the same array**. Mutating through `ref` changes the shared array → `data[0]` is `50`. (A defensive copy would have isolated them.)
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
A) `3`   B) `1`   C) `0`   D) Compile error

**Answer: A.** The `static` field `made` is **shared** by the whole class; each constructor call increments it. Three objects → `3`. `count()` is `static`, called on the class.
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
A) line 1   B) line 3   C) line 2   D) line 4

**Answer: B.** A `final` variable cannot be **reassigned** after initialization; `LIMIT = 200;` (line 3) is illegal. Reading it (line 2) is fine.
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
A) `0`   B) Compile error   C) `60`   D) `null`

**Answer: C.** The local `seconds` in `reset()` **shadows** the field but is a separate variable; setting it to 0 does not touch the field. `get()` still returns the field `60`.
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
A) `size = size;`   B) `size = this.size;`   C) `this.size = this.size;`   D) `this.size = size;`

**Answer: D.** `this.size` is the **field**; the bare `size` is the parameter. `this.size = size` copies the parameter into the field. (A) assigns the parameter to itself; (B)/(C) leave the field at default.
`[topic 3.9][practice P2]`

---

**Q17. (Analyze Code · 3.9 no this in static context)**
Which statement about `this` is correct?
A) `this` refers to the current object and cannot be used in a `static` method (which has no `this`).   B) `this` can be used inside a `static` method to refer to the class.   C) `this` is required in every method.   D) `this` refers to the parent class.

**Answer: A.** `this` is the **current object** reference; a `static` method belongs to the class, not an object, so it has **no `this`**. It is only needed to disambiguate shadowed members otherwise.
`[topic 3.9][practice P3]`

---

**Q18. (Develop Code · 3.1/3.3 choose the right class design — P1)**
You must model a `Temperature` so that, once created, its value can be **read but never changed** from outside, and its raw field is hidden. Which design best fits?
A) `public double value;` with no methods   B) `private double value;` with a public accessor and **no** mutator   C) `private double value;` with a public mutator and no accessor   D) `static double value;` shared by all temperatures

**Answer: B.** Read-but-not-changed + hidden field = a **`private`** field with a **public accessor and no mutator** (immutable-from-outside). (A) exposes the field; (C) allows changes but no reads; (D) shares one value across all objects.
`[topic 3.3][practice P1]`

---

**Q19. (Develop Code · 3.5 complete the segment — accessor body)**
A `BankAccount` has `private double balance;`. Fill the blank so `getBalance` is a correct accessor (reports the balance without changing state).
```java
public double getBalance() {
    // BLANK
}
```
A) `balance = 0;`   B) `this.balance = balance;`   C) `return balance;`   D) `System.out.println(balance);`

**Answer: C.** An accessor **returns** the field's value and leaves state unchanged: `return balance;`. (A) and (B) modify state (and (A) zeroes it); (D) prints but returns nothing — it won't compile for a `double` return type.
`[topic 3.5][practice P2]`

---

**Q20. (Develop Code · 3.4 complete the segment — initialize all fields)**
A `Point` has `private int x, y;`. Fill the constructor body so **both** fields are initialized from the parameters.
```java
public Point(int x, int y) {
    // BLANK
}
```
A) `x = x; y = y;`   B) `this.x = y; this.y = x;`   C) `x = this.x; y = this.y;`   D) `this.x = x; this.y = y;`

**Answer: D.** With parameters shadowing the fields, `this.x`/`this.y` are the fields and the bare names are the parameters: `this.x = x; this.y = y;`. (A) assigns parameters to themselves (fields stay 0); (B) swaps them; (C) copies backward (fields stay 0).
`[topic 3.4][practice P2]`

---

**Q21. (Design Code · 3.1 decompose a design — P1.A)**
You are designing a program that reads a list of orders, computes each order's tax, prints a receipt, and at the end prints the grand total. Which decomposition **best** applies procedural abstraction and avoids repeated code?
A) Write one long `main` method that inlines the tax math everywhere it is needed.   B) Write a `computeTax(double amount)` method and a `printReceipt(Order o)` method, and have `main` loop over the orders calling them, accumulating the total.   C) Make `computeTax` a separate program the user runs by hand for each order.   D) Copy-paste the tax formula into each branch of an `if-else-if` chain so every case is self-contained.

**Answer: B.** Decomposing the repeated work into parameterized methods (`computeTax`, `printReceipt`) and calling them from a loop is **procedural abstraction / code reuse** — the standard design. (A)/(D) duplicate the tax math; (C) is not a single program.
`[topic 3.1][practice P1]`

---

## Coverage note

Unit 3 topics covered here: **3.1 (Q1,Q2,Q18,Q21), 3.2 (Q3,Q4,Q5), 3.3 (Q6,Q7,Q18), 3.4 (Q8,Q9,Q20), 3.5 (Q10,Q11,Q19), 3.6 (Q12), 3.7 (Q13,Q14), 3.8 (Q15), 3.9 (Q16,Q17)** — all 9 topics. Practices: **P1** (Q18, Q21 — incl. a 1.A design/decomposition item), **P2** (Q8, Q16, Q19, Q20), **P3** (Q7, Q9, Q11–Q15, Q17), **P4** (Q1, Q2, Q6, Q10), **P5** (Q3, Q4, Q5 — ethics/bias/IP/harm, topic 3.2). 21 items.
