# Day-1 Diagnostic — Lucas's Placement Check (~30 min)

**Goal:** figure out your starting point so the tutor never wastes your time. This is **not a test you can fail** — you've never written Java, so lots of it will be new. That's expected. The point is to separate *"I know this idea, just need the Java spelling"* from *"this is genuinely new."*

**How to run it:** Open your tutor Project and paste this in, or just work through it and tell the tutor your answers. Do **Part A** without notes. For **Parts B & C**, the Python→Java cheat-sheet is allowed. Don't look at the answer key until you're done.

---

## Part A — Programming logic (write in Python or plain pseudocode)
*Confirms the skills that transfer straight from Python.*

**A1.** Write a function that returns the sum of all whole numbers from 1 to `n`. (e.g., `n = 5` → `15`)

**A2.** Given a list of numbers, return the **largest** one.

**A3.** Given a word, count how many **vowels** (a, e, i, o, u) it has.

**A4.** Print the numbers 1 to 20; for each, print whether it's `"even"` or `"odd"`.

## Part B — Read the Java (what does each print?)
*Gauges how much Java you can already parse. Cheat-sheet allowed.*

**B1.**
```java
int x = 7 / 2;
System.out.println(x);
```

**B2.**
```java
int sum = 0;
for (int i = 1; i <= 4; i++) {
    sum += i;
}
System.out.println(sum);
```

**B3.**
```java
String a = "cat";
System.out.println(a.length());
System.out.println(a.substring(1));
System.out.println(a.charAt(0));
```

**B4.**
```java
int[] nums = {4, 8, 15, 16};
System.out.println(nums.length);
System.out.println(nums[2]);
```

## Part C — Write a little Java (cheat-sheet allowed; partial attempts are great)

**C1.** Translate your A1 answer into a Java method:
```java
public int sumTo(int n) {
    // your code
}
```

**C2.** Write a method that returns how many **even** numbers are in an array:
```java
public int countEvens(int[] arr) {
    // your code
}
```

---
---

## ✅ Answer key (look only after attempting)

**Part A** — any working logic counts; exact syntax doesn't matter here.
- A1: loop adding 1..n (or `n*(n+1)/2`). `n=5` → **15**.
- A2: start with first element as "max," loop and update when a bigger one appears.
- A3: loop over characters, count when the char is in `aeiou`.
- A4: loop 1..20; `even` if `i % 2 == 0`, else `odd`.

**Part B**
- B1 → **3**  *(integer division — the #1 trap. Not 3.5!)*
- B2 → **10**  *(1+2+3+4)*
- B3 → **3**, then **`at`**, then **`c`**
- B4 → **4**, then **15**  *(`.length` has no parens for arrays; index 2 is the 3rd element)*

**Part C**
- C1:
```java
public int sumTo(int n) {
    int sum = 0;
    for (int i = 1; i <= n; i++) {
        sum += i;
    }
    return sum;
}
```
- C2:
```java
public int countEvens(int[] arr) {
    int count = 0;
    for (int i = 0; i < arr.length; i++) {
        if (arr[i] % 2 == 0) {
            count++;
        }
    }
    return count;
}
```

---

## How to read your results → set your starting levels

| If you... | It means | Tracker action |
|---|---|---|
| Nailed **Part A** | Your programming logic is solid (thanks, Python). The whole game is now just Java spelling. | Mark loops/conditionals/algorithms concepts 🟠–🟢; expect a **fast** transition. |
| Got **B1** wrong (said 3.5) | The integer-division trap got you. | Flag "Integer division 🔥" as 🟡 — drill early. |
| Mixed up `.length` / `.length()` / `.size()` in B | Normal — it's the most common Java confusion. | Flag those as 🟡. |
| Wrote working **C1/C2** with the cheat-sheet | You can already produce real Java with a reference. Great baseline. | Start the ladder at Unit 2 instead of crawling through Unit 1. |
| Parts B/C felt impossible | Totally fine — pure-new Java. | Start clean at Unit 1 syntax; you'll move quickly given Part A. |

**Then:** tell the tutor *"diagnostic done — here's how I did,"* paste your results, and it will set the initial statuses in `mastery-tracker.md` and pick your first real problem. From there: **"let's continue"** each day.
