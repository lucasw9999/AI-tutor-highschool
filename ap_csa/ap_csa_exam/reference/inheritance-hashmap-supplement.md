# Inheritance & HashMap — School-Class Safety Supplement

> ## ⚠️ The code on this page is NOT AP CSA exam content. For your SCHOOL class only.
>
> `HashMap`/`HashSet`, polymorphism, abstract classes and the Java `interface` construct have **zero occurrences** in the official CED (*AP Computer Science A*, Effective Fall 2025) — they are on neither the 53-topic list (Units 1–4) nor the Java Quick Reference sheet. *(Verified 12 August 2026. The word "interface" is in the CED only as "Application Program **Interface** (API)", topic 1.7.)*
>
> **Inheritance is the one exception, and the line is narrower than it looks.** Topic 1.12 *requires* the vocabulary — superclass, subclass, class hierarchy, and the fact that every class in Java is a subclass of `Object`. What the CED excludes is the *writing*: **"Designing and implementing inheritance relationships are outside the scope of the AP Computer Science A course and exam."** Everything below is that excluded writing half — `extends`, `super`, overriding — so **studying this file will not earn a single AP point.** For the in-scope 1.12 words, use [`../../csa-coverage-map.md`](../../csa-coverage-map.md) → **Inheritance** and the items in [`../question-bank/mcq-unit-1.md`](../question-bank/mcq-unit-1.md) (Q15, Q23–Q25).
>
> This file exists as a hedge for Lucas's school class, which may still test these topics — and teach them by writing them. Keep it light — it is an overview, not a full tutorial. If the school exam goes deeper than what is covered here, this file can be expanded at that point.

---

## 1. Inheritance

> ⚠️ **Writing** inheritance is NOT on the AP CSA exam — school class only. The *words* (superclass, subclass, class hierarchy, every class is a subclass of `Object`) **are** required Unit 1 content, topic 1.12; see the header.

**What it is:** Inheritance lets one class (the subclass) build on another class (the superclass), reusing its fields and methods while adding or changing behavior.

**Key keywords:** `extends`, `super`, `@Override`, `protected`.

### Minimal worked example

```java
// Superclass
public class Animal {
    private String name;

    public Animal(String name) {
        this.name = name;
    }

    public String getName() {
        return name;
    }

    public String speak() {
        return "...";
    }
}

// Subclass — Dog extends Animal
public class Dog extends Animal {

    public Dog(String name) {
        super(name);          // calls Animal's constructor
    }

    @Override
    public String speak() {   // overrides Animal's speak()
        return "Woof!";
    }
}
```

**Usage:**
```java
Dog d = new Dog("Rex");
System.out.println(d.getName());  // "Rex"  — inherited from Animal
System.out.println(d.speak());    // "Woof!" — overridden in Dog
```

### Key rules at a glance

| Concept | What it means |
|---|---|
| `extends ClassName` | Declares the superclass; Java allows only one superclass per class |
| `super(args)` | Calls the superclass constructor — must be the **first statement** in the subclass constructor |
| `super.method()` | Calls the superclass version of an overridden method from inside the subclass |
| `@Override` | Annotation that tells the compiler "this method intentionally overrides a superclass method"; the compiler flags a typo |
| `protected` | Access modifier: visible within the class, subclasses, and the same package — more open than `private`, more closed than `public` |
| Method overriding | Subclass defines a method with the **same name, same parameter types, same return type** as a superclass method; the subclass version runs at runtime |

---

## 2. Interfaces and Abstract Classes

> ⚠️ NOT on the AP CSA exam. School class only.

**Interface — what it is:** A contract. An interface declares method signatures (no body) that any implementing class must provide. Use `implements`.

```java
public interface Shape {
    double area();          // abstract method — no body
    double perimeter();
}

public class Circle implements Shape {
    private double radius;

    public Circle(double radius) { this.radius = radius; }

    @Override
    public double area()      { return Math.PI * radius * radius; }

    @Override
    public double perimeter() { return 2 * Math.PI * radius; }
}
```

A class can implement **multiple** interfaces (`implements A, B`). All declared methods must be implemented or the class must be declared `abstract`.

**Abstract class — what it is:** A class that cannot be instantiated directly. It can have both concrete methods (with a body) and `abstract` methods (no body, subclasses must override). Use `abstract` on the class and on any unimplemented methods.

```java
public abstract class Vehicle {
    private int speed;

    public Vehicle(int speed) { this.speed = speed; }

    public int getSpeed() { return speed; }   // concrete — shared by all subclasses

    public abstract String fuelType();        // abstract — each subclass defines its own
}

public class ElectricCar extends Vehicle {
    public ElectricCar(int speed) { super(speed); }

    @Override
    public String fuelType() { return "Electric"; }
}
```

**Quick comparison:**

| | Interface | Abstract class |
|---|---|---|
| Instantiate directly? | No | No |
| Has concrete methods? | No (Java 8+ has `default` methods, but ignore for school basics) | Yes |
| A class can use multiple? | Yes (`implements A, B`) | No (only one `extends`) |
| Use for | "Can do X" contracts | Shared base with partial implementation |

---

## 3. Polymorphism

> ⚠️ NOT on the AP CSA exam. School class only.

Polymorphism means a **superclass reference variable can hold a subclass object**, and the correct version of an overridden method is called automatically at runtime (this is called *dynamic dispatch*).

```java
Animal a = new Dog("Rex");   // Animal reference, Dog object
System.out.println(a.speak()); // prints "Woof!" — Dog's version runs, not Animal's
```

The declared type of `a` is `Animal`, but the actual object is a `Dog`. When `speak()` is called, Java looks at the actual runtime type (`Dog`) and runs `Dog`'s override. This is what makes polymorphism useful: you can write code that works on the superclass type and handles any subclass automatically.

Common pattern — an array or ArrayList of a superclass type, filled with mixed subclass objects, all processed with one loop.

---

## 4. HashMap Basics

> ⚠️ NOT on the AP CSA exam. School class only.

**What it is:** A `HashMap` stores key-value pairs. Each key maps to exactly one value; keys are unique. Looking up a value by key is fast (approximately constant time).

**Import required:**
```java
import java.util.HashMap;
```

### Core operations

```java
HashMap<String, Integer> scores = new HashMap<>();

// put(key, value) — add or update an entry
scores.put("Alice", 95);
scores.put("Bob",   87);
scores.put("Alice", 99);   // overwrites the previous value for "Alice"

// get(key) — retrieve a value; returns null if key is absent
int aliceScore = scores.get("Alice");   // 99

// containsKey(key) — check before getting to avoid NullPointerException
if (scores.containsKey("Bob")) {
    System.out.println(scores.get("Bob"));  // 87
}

// keySet() — returns all keys; use to iterate over all entries
for (String name : scores.keySet()) {
    System.out.println(name + ": " + scores.get(name));
}
```

### Quick method reference

| Method | What it does |
|---|---|
| `put(K key, V value)` | Inserts or replaces the value for `key` |
| `get(K key)` | Returns the value for `key`, or `null` if not present |
| `containsKey(K key)` | Returns `true` if the map contains `key` |
| `keySet()` | Returns a `Set` of all keys — iterate with enhanced-for |
| `size()` | Number of key-value pairs in the map |

**Type parameters:** `HashMap<K, V>` — `K` is the key type, `V` is the value type. Both must be reference types (use `Integer` not `int`, `Double` not `double`).

---

## Closing Note

This is **overview depth**. The four sections above cover the most common school-class topics at the level of a first introduction. If your school exam goes deeper — for example, multi-level inheritance chains, abstract class hierarchies with multiple subclasses, or advanced HashMap patterns (remove, entrySet, nested maps) — this file can be expanded to match what is actually being tested.

For everything on the AP CSA exam itself, use the other files in this `reference/` folder and the `question-bank/` packs.
