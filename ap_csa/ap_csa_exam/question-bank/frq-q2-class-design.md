# FRQ Bank — Q2: Class Design (7 points)

**Shape.** Q2 asks you to **design and implement a complete class** from a specification: the class header, the `private` instance variables, a `public` constructor that initializes **all** of them, and one or more `public` methods (a mix of accessor/mutator and a small algorithm). Worth **7 points**.

**In-syllabus pledge.** Only the Java Quick Reference library. Every instance variable is **`private`**; the class and constructor headers are **`public`**; String state is compared with **`.equals`**, never `==`. `Math.abs(int)` and `Math.abs(double)` are on the reference (used below); `Math.min`/`Math.max` are **not**. We never override `toString` or `equals` (both are exclusions). All practice FRQs are **original**.

**Cross-links:** scoring/penalty rules → [`../reference/frq-rubric-and-penalties.md`](../reference/frq-rubric-and-penalties.md) · point-losers → [`../reference/killer-errors-cheatsheet.md`](../reference/killer-errors-cheatsheet.md) · topic map → [`../topic-coverage-matrix.md`](../topic-coverage-matrix.md) (topics 1.13, 3.1, 3.3, 3.4, 3.5, 3.9).

---

## (a) Official models to study

Read the official prompt and scoring guidelines at the source. The summaries below describe the task and rubric *structure* — they are not the College Board's text.

### Model 1 — CED sample FRQ: `CupcakeMachine` (Q2)
- **Source:** *AP Computer Science A Course and Exam Description*, sample FRQ, **pp. 161–169**. <https://apcentral.collegeboard.org/media/pdf/ap-computer-science-a-course-and-exam-description.pdf>
- **Task shape:** Implement a full class modeling a vending/inventory device — `private` instance variables for the machine's state (count, price), a constructor that initializes them, and methods that read state (accessor) and change it (mutator), including a small computed result.
- **Rubric structure (7 pts):** points for (a) the class header + `private` instance variables (the **encapsulation** point), (b) the `public` constructor header with the right parameters, (c) the constructor initializing **all** instance variables, (d–g) each method's header/return type and its correct body/logic.

### Model 2 — 2026 released FRQ: `Bottle` (Q2)
- **Source:** *AP CSA 2026 Free-Response Questions*, Question 2. <https://apcentral.collegeboard.org/media/pdf/ap26-frq-computer-science-a.pdf>
- **Task shape:** Design a class storing a quantity/capacity plus a label; constructor initializes all fields; methods include an accessor, a mutator that updates state under a condition, and a boolean/derived-value method.
- **Rubric structure (7 pts):** ~1 pt class+`private` fields, ~1–2 pt constructor (header + initializes all fields), and ~1 pt per required method for correct header + correct body. Non-`private` instance variables forfeit the encapsulation point.

> The 2026 official Scoring Guidelines PDF was not yet posted as of this writing (see `../reference/frq-rubric-and-penalties.md` §8). The point splits reflect the CED sample rubric and released-FRQ structure.

---

## (b) Original practice FRQs

> Grading note (every rubric below): points are independent; minor syntax slips are forgiven when intent is clear; but **non-`private` instance variables, `==` on String state, directly exposing fields, and wrong constructor/method headers DO cost points** (see `../reference/killer-errors-cheatsheet.md`). Penalty cap = 3 per question, earned-parts only, charged once.

### Practice FRQ 1 — `Locker` (7 points)

Design a complete class named `Locker` that meets this specification:

- It stores three pieces of state: an **id number** (whole number), a **combination** (a String), and whether the locker is currently **occupied** (`true`/`false`).
- A constructor takes the id and the combination (in that order) and initializes the locker as **not occupied**.
- An accessor `getId()` returns the id number.
- A method `unlock(String attempt)` returns `true` if `attempt` matches the stored combination (exact match) and `false` otherwise. **Unlocking does not change any state.**
- A mutator `assign()` sets the locker to occupied.
- A method `isAvailable()` returns `true` if the locker is **not** occupied, and `false` otherwise.

Write the **entire class**, including the necessary instance variables, following encapsulation conventions.

#### Sample solution

```java
public class Locker {
    private int id;
    private String combination;
    private boolean occupied;

    public Locker(int idNumber, String combo) {
        id = idNumber;
        combination = combo;
        occupied = false;
    }

    public int getId() {
        return id;
    }

    public boolean unlock(String attempt) {
        return attempt.equals(combination);
    }

    public void assign() {
        occupied = true;
    }

    public boolean isAvailable() {
        return !occupied;
    }
}
```

#### Rubric (7 points)

| Pt | Criterion |
|---|---|
| 1 | Class header `public class Locker` **and** all instance variables declared `private` (the encapsulation point — non-`private` fields forfeit this) |
| 2 | Three instance variables of the correct types: `int` id, `String` combination, `boolean` occupied |
| 3 | `public` constructor with two parameters in the order (id, combination) that initializes id and combination from them |
| 4 | Constructor initializes `occupied` to `false` (initializes **all** state, including the field not passed in) |
| 5 | Accessor `getId()` is non-`void` and returns the id |
| 6 | `unlock(String attempt)` compares with `.equals` (NOT `==`), returns the boolean, and does not modify state; `assign()` is `void` and sets occupied to `true` |
| 7 | `isAvailable()` returns `!occupied` (correct boolean — `true` exactly when not occupied) |

**Trace check.** `new Locker(7, "1234")` → id 7, combination "1234", occupied false. `getId()` → **7** ✓. `unlock("0000")` → `"0000".equals("1234")` → **false**, state unchanged ✓. `isAvailable()` → `!false` → **true** ✓. `assign()` → occupied true; now `isAvailable()` → `!true` → **false** ✓. All fields `private`; class/constructor `public`; String compared with `.equals`. Points sum **7**.

---

### Practice FRQ 2 — `Player` (7 points)

Design a complete class named `Player` that meets this specification:

- It stores three pieces of state: a **name** (String), the player's **score** (whole number, starts at 0), and the number of **lives** (whole number).
- A constructor takes the name and the starting number of lives (in that order). The score always starts at `0`.
- An accessor `getScore()` returns the current score.
- A mutator `addPoints(int p)` adds `p` to the score (you may assume `p >= 0`).
- A method `loseLife()` reduces the number of lives by 1, but **never below 0** (if lives is already 0 it stays 0).
- A method `isOut()` returns `true` if the player has `0` lives left, `false` otherwise.

Write the **entire class**, including the instance variables, following encapsulation conventions.

#### Sample solution

```java
public class Player {
    private String name;
    private int score;
    private int lives;

    public Player(String playerName, int startLives) {
        name = playerName;
        lives = startLives;
        score = 0;
    }

    public int getScore() {
        return score;
    }

    public void addPoints(int p) {
        score += p;
    }

    public void loseLife() {
        if (lives > 0) {
            lives--;
        }
    }

    public boolean isOut() {
        return lives == 0;
    }
}
```

#### Rubric (7 points)

| Pt | Criterion |
|---|---|
| 1 | Class header `public class Player` **and** all instance variables declared `private` (encapsulation point) |
| 2 | Three instance variables of correct types: `String` name, `int` score, `int` lives |
| 3 | `public` constructor with two parameters in the order (name, lives) that initializes name and lives from them |
| 4 | Constructor initializes `score` to `0` (initializes all state, including the field not passed in) |
| 5 | Accessor `getScore()` returns the score; mutator `addPoints(int p)` is `void` and adds `p` to the score |
| 6 | `loseLife()` decrements lives **only when `lives > 0`** (guards against going below 0) |
| 7 | `isOut()` returns `lives == 0` (correct boolean) |

**Trace check.** `new Player("Sam", 2)` → name "Sam", lives 2, score 0. `addPoints(10)` → score 10; `getScore()` → **10** ✓. `loseLife()` → lives 1; `loseLife()` → lives 0; `loseLife()` → `0 > 0` false, stays **0** ✓ (never negative). `isOut()` → `0 == 0` → **true** ✓. All fields `private`; constructor sets the non-parameter field (`score`) too. Points sum **7**.

---

### Practice FRQ 3 — `Sensor` (7 points)

Design a complete class named `Sensor` that meets this specification:

- It stores three pieces of state: a **label** (String), the **latest reading** (a `double`), and an **alert threshold** (a `double`).
- A constructor takes the label and the threshold (in that order). The latest reading starts at `0.0`.
- An accessor `getReading()` returns the latest reading.
- A mutator `record(double value)` stores `value` as the latest reading.
- A method `isAlerting()` returns `true` if the **absolute value** of the latest reading is **greater than or equal to** the threshold, and `false` otherwise.
- A method `sameLabel(String other)` returns `true` if `other` matches this sensor's label exactly.

Write the **entire class**, including the instance variables, following encapsulation conventions.

#### Sample solution

```java
public class Sensor {
    private String label;
    private double reading;
    private double threshold;

    public Sensor(String sensorLabel, double alertThreshold) {
        label = sensorLabel;
        threshold = alertThreshold;
        reading = 0.0;
    }

    public double getReading() {
        return reading;
    }

    public void record(double value) {
        reading = value;
    }

    public boolean isAlerting() {
        return Math.abs(reading) >= threshold;
    }

    public boolean sameLabel(String other) {
        return label.equals(other);
    }
}
```

#### Rubric (7 points)

| Pt | Criterion |
|---|---|
| 1 | Class header `public class Sensor` **and** all instance variables declared `private` (encapsulation point) |
| 2 | Three instance variables of correct types: `String` label, `double` reading, `double` threshold |
| 3 | `public` constructor with two parameters in the order (label, threshold) that initializes those two fields |
| 4 | Constructor initializes `reading` to `0.0` (initializes the field not passed in) |
| 5 | Accessor `getReading()` returns the reading; mutator `record(double value)` is `void` and stores `value` |
| 6 | `isAlerting()` uses `Math.abs(reading)` and returns whether it is `>= threshold` (correct boolean and correct comparison direction) |
| 7 | `sameLabel(String other)` compares with `.equals` (NOT `==`) and returns the boolean |

**Trace check.** `new Sensor("temp", 5.0)` → label "temp", threshold 5.0, reading 0.0. `getReading()` → **0.0** ✓. `record(-7.2)` → reading −7.2; `isAlerting()` → `Math.abs(-7.2)=7.2 >= 5.0` → **true** ✓. `record(3.0)` → `Math.abs(3.0)=3.0 >= 5.0` → **false** ✓. `sameLabel("temp")` → `"temp".equals("temp")` → **true** ✓. `Math.abs(double)` is on the Quick Reference; label compared with `.equals`. Points sum **7**.

---

## (c) Signature point-losers for Q2

Cross-referenced to [`../reference/killer-errors-cheatsheet.md`](../reference/killer-errors-cheatsheet.md):

| Point-loser | Cheatsheet # | Q2-specific fix |
|---|---|---|
| Non-`private` instance variables | #6 | Every instance variable is `private`; the class and constructor are `public`. This is the single dedicated **encapsulation point** — public or default-access fields forfeit it directly. |
| Forgetting to initialize a field the constructor wasn't handed | — (topic 3.4) | The constructor must initialize **all** state. If `score`/`reading`/`occupied` isn't a parameter, set it to its starting value (`0`, `0.0`, `false`) explicitly in the constructor. |
| `==` to compare String state | #1 | Use `.equals(...)` in any method that compares a String field (`unlock`, `sameLabel`). `==` is a semantic error, not a forgiven slip. |
| Wrong header: missing `public`, wrong return type, or wrong parameter order/types | — (topic 1.13, 3.5) | Match the spec exactly: accessors are non-`void` and return the field; mutators are `void`. Constructor parameter **order** must match the spec ("id then combination", "name then lives"). |
| Mutator that should not change state, or accessor that mutates | — (topic 3.5) | Read each method's contract: `unlock` returns a boolean **without** changing state; an accessor never assigns. Don't add side effects the spec didn't ask for. |
| Using `Math.min`/`Math.max` for a clamp (e.g., "never below 0") | — | Those are **not** on the Quick Reference. Clamp with an `if` guard: `if (lives > 0) { lives--; }`. |
| Overriding `toString`/`equals` for the class | — (exclusions 10–12) | Never required and **out of scope**. Use `.equals` to compare String *fields*; do not write a custom `equals`/`toString` for your class. |
