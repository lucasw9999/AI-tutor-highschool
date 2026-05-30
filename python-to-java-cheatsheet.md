# Python → Java Cheat-Sheet (Lucas's one-time syntax seed)

You already know how to program (Python). Java is mostly the **same ideas with different spelling** + a few traps. Skim this once before Day 2, then keep it open for your first week. You do **not** need to memorize it — you'll absorb it by solving problems.

## The 5 traps that bite Python people (read these twice)
1. **Integer division:** `7 / 2` is **`3`** in Java, not `3.5`. To get `3.5`, cast first: `(double) 7 / 2`. (Cast *before* dividing: `(double) total / count`, **not** `(double)(total / count)`.)
2. **`==` vs `.equals()`:** for **Strings/objects**, `==` compares *memory location*, not contents. Use **`.equals()`** to compare contents. (Python's `==` does contents — Java's does not.)
3. **You must declare types:** `int x = 5;` not `x = 5`.
4. **Semicolons + braces:** every statement ends with `;`. Blocks use `{ }`, not indentation.
5. **Length is three different things:** `s.length()` (String, parens), `arr.length` (array, **no** parens), `list.size()` (ArrayList). And the last index is `length - 1`.

## Side-by-side

| Idea | Python | Java |
|---|---|---|
| Print | `print(x)` | `System.out.println(x);` |
| Variable | `x = 5` | `int x = 5;` |
| Decimal | `y = 1.5` | `double y = 1.5;` |
| Boolean | `True` / `False` | `true` / `false` |
| Constant | — | `final int N = 10;` |
| Integer division | `7 // 2` → 3 | `7 / 2` → 3 ⚠️ |
| Real division | `7 / 2` → 3.5 | `(double) 7 / 2` → 3.5 |
| Modulo | `7 % 2` | `7 % 2` |
| And / Or / Not | `and` / `or` / `not` | `&&` / `\|\|` / `!` |
| If / elif / else | `if x>0:` / `elif:` / `else:` | `if (x>0) { }` / `else if (..) { }` / `else { }` |
| While | `while c:` | `while (c) { }` |
| Counting loop | `for i in range(n):` | `for (int i = 0; i < n; i++) { }` |
| Loop over items | `for v in arr:` | `for (int v : arr) { }` |
| Comment | `# ...` | `// ...`  or  `/* ... */` |
| `None` / `self` | `None` / `self` | `null` / `this` |

### Strings
| | Python | Java |
|---|---|---|
| Length | `len(s)` | `s.length()` |
| Char at i | `s[i]` | `s.charAt(i)` |
| Slice | `s[a:b]` | `s.substring(a, b)` |
| Find | `s.find(x)` | `s.indexOf(x)` |
| Equal contents | `s1 == s2` | `s1.equals(s2)` ⚠️ |
| Compare order | `s1 < s2` | `s1.compareTo(s2)` (<0, 0, >0) |
| Join | `"a" + str(n)` | `"a" + n` |

### Collections
| | Python | Java |
|---|---|---|
| Fixed array | — | `int[] a = new int[5];` → `a[i]`, `a.length` |
| Array literal | `[1,2,3]` | `int[] a = {1, 2, 3};` |
| Growable list | `lst = []` | `ArrayList<Integer> list = new ArrayList<>();` |
| Add | `lst.append(x)` | `list.add(x);` |
| Get / Set | `lst[i]` / `lst[i]=v` | `list.get(i)` / `list.set(i, v)` |
| Length | `len(lst)` | `list.size()` |
| Remove at i | `lst.pop(i)` | `list.remove(i)` |
| 2D | `g[i][j]` | `int[][] g = new int[r][c];` → `g[i][j]` |

### Math (the `Math` class)
`Math.abs(x)` · `Math.pow(b, e)` · `Math.sqrt(x)` · `Math.random()` (0.0–1.0)

### Defining a method
```java
// Python: def add(a, b): return a + b
public int add(int a, int b) {
    return a + b;          // must declare return type (int) and param types
}
```

### Defining a class (the shape you'll write on FRQ Q2)
```java
public class Dog {
    private String name;          // private fields
    private int age;

    public Dog(String n, int a) { // constructor
        name = n;
        age = a;
    }
    public String getName() {     // accessor (getter)
        return name;
    }
    public void setAge(int a) {   // mutator (setter), returns nothing -> void
        age = a;
    }
}
```

> Rule of thumb: if something feels like Python with `{ }`, `;`, and declared types — it probably is. The genuinely *new* stuff is formal classes and the array/ArrayList method names. Spend your energy there.
