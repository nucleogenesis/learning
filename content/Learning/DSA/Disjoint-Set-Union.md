---
title: Disjoint-Set-Union
tags: [learning, dsa, dsu, union-find]
lastUpdated: 2026-05-15
---

# Disjoint-Set-Union (Union-Find)

> Convention: Answer blocks are children of "Show answer" parents. Click the triangle to collapse — Logseq remembers.

## 🎯 Why this matters

Three problems, all "are these things in the same group?":

- **Network connectivity**: as you add cables one at a time, can computer A and computer B talk yet?
- **Image processing — flood fill**: when you bucket-fill a region, the algorithm is asking "is this pixel in the same connected region as the click?"
- **Kruskal's MST**: when considering an edge `(u, v)`, are `u` and `v` already in the same component? If yes, adding this edge would create a cycle — skip it.

The naive approach (store a "component id" per vertex, scan everyone on each union) is `O(n)` per operation. The **Disjoint-Set-Union** (DSU, also called Union-Find) data structure does both `find` and `union` in **almost constant time** (`O(α(n))`, where α is the inverse Ackermann function — at most 4 for any input your computer can fit in memory).

DSU is the smallest, cheapest data structure in the curriculum, and it powers a *lot*: Kruskal's MST, undirected cycle detection, percolation simulations, Tarjan's offline LCA, even some compiler-internal type inference algorithms.

## A tiny worked example

Five elements, each starting in its own set: `{0}, {1}, {2}, {3}, {4}`.

```
parent = [0, 1, 2, 3, 4]    # each element is its own parent (its own root)
```

Now we apply some unions:

1. `union(0, 1)`: make 1's root (which is 1) point to 0's root (which is 0). State: `{0, 1}, {2}, {3}, {4}`.
2. `union(2, 3)`: State: `{0, 1}, {2, 3}, {4}`.
3. `union(0, 2)`: State: `{0, 1, 2, 3}, {4}`.
4. `find(3)` should now return the same root as `find(0)`.

The `parent` array might look like `[0, 0, 0, 2, 4]` after these operations — but the *root* of the tree containing any vertex in `{0, 1, 2, 3}` is `0`. Walking the parent pointers from `3 → 2 → 0` finds the root.

**Naming the parts**:

- **Element** — one of the things we're grouping (a vertex, a pixel, a computer).
- **Set** (or *component*) — a group of elements that have been unioned together.
- **Representative** (or *root*) — the unique element that identifies a set. Two elements are in the same set iff they have the same root.

## The data structure

A single integer array `parent[]` where `parent[x]` is x's parent in a forest of trees. The root of a tree is the element where `parent[x] == x`.

```python
class DSU:
    def __init__(self, n):
        self.parent = list(range(n))         # each element its own root
        self.rank = [0] * n                  # tree depth (approximately)

    def find(self, x):
        # path compression: make every visited node point directly to the root
        if self.parent[x] != x:
            self.parent[x] = self.find(self.parent[x])
        return self.parent[x]

    def union(self, x, y):
        rx, ry = self.find(x), self.find(y)
        if rx == ry:
            return False                     # already in same set
        # union by rank: attach the smaller tree under the larger
        if self.rank[rx] < self.rank[ry]:
            rx, ry = ry, rx
        self.parent[ry] = rx
        if self.rank[rx] == self.rank[ry]:
            self.rank[rx] += 1
        return True
```

That's the whole thing — ~15 lines. Two optimizations make it fast:

### Optimization 1: Path compression

After calling `find(x)`, every node on the path from `x` to the root gets re-parented directly to the root. Subsequent `find` calls on those nodes are `O(1)`.

```
Before find(3):              After find(3):

       0                          0
      / \                        /|\
     1   2                      1 2 3
         |
         3
```

The recursive line `self.parent[x] = self.find(self.parent[x])` does this automatically — Python assigns the recursive result back into the parent array, flattening the tree.

### Optimization 2: Union by rank (or by size)

When unioning two trees, attach the *smaller* one under the larger. This keeps trees shallow — without it, repeated unions can build a linear chain, defeating the point.

`rank` is approximately tree depth. `size` is exact set size. Either works for the optimization; rank is slightly cheaper to maintain.

### Why "almost constant"?

With **both** optimizations, the amortized cost per operation is `O(α(n))`, where `α(n)` is the inverse Ackermann function. For any `n ≤ 2^65536` (i.e., absurdly larger than any input you'll ever see), `α(n) ≤ 4`. In practice DSU operations are effectively constant-time.

With **only** path compression (no rank): `O(log n)` amortized — still excellent. With **only** rank (no path compression): `O(log n)` worst case. With **neither**: `O(n)` worst case — same as the naive approach.

## 🔍 Quick check (try before scrolling)

- **Q1**: After `union(0,1), union(2,3), union(0,2)`, what's `find(3)` (assuming we union the lower-rank tree under the higher-rank one, breaking ties by attaching the second argument's root under the first's)?
- Show answer to Q1
  - The root of the combined `{0,1,2,3}` tree. Following the rules: after `union(0,1)`, root is 0, rank[0]=1. After `union(2,3)`, root of that pair is 2, rank[2]=1. Then `union(0,2)`: ranks tie at 1, so per the code `rx, ry = 0, 2` (no swap because rank[0] is not < rank[2]), parent[2] = 0, rank[0] becomes 2. So `find(3)` returns 0.
- **Q2**: What goes wrong if you use DSU but skip union-by-rank?
- Show answer to Q2
  - Pathological inputs build a single long chain: `union(0,1), union(1,2), union(2,3), ...`. Without rank, each `union` makes the new root the parent of the previous root, producing a linked list of depth `n`. `find` then takes `O(n)`. Path compression alone still amortizes to `O(log n)`, but you lose the inverse-Ackermann guarantee.
- **Q3**: Two elements are in the same set iff... fill in.
- Show answer to Q3
  - ...they have the same root. `find(x) == find(y)` is *the* primitive for "are these in the same group?" — that single comparison is the answer.
- **Q4**: Why does the recursive `find` line `self.parent[x] = self.find(self.parent[x])` flatten the tree?
- Show answer to Q4
  - As the recursion unwinds back up the call stack, every visited node's `parent[x]` gets overwritten with the root (the return value bubbles up unchanged from the base case). The whole path gets flattened in a single pass.

---

## 💪 Practice (a separate session, not your first read)

### Worked → faded → blank: DSU implementation

#### Worked example (read)

See the `DSU` class above.

#### Faded — fill in the blanks

Replace union-by-rank with **union-by-size**, which is sometimes easier to reason about (the smaller-set always becomes a child of the larger-set's root):

```python
class DSUBySize:
    def __init__(self, n):
        self.parent = list(range(n))
        self.size = [1] * n              # set size of each root

    def find(self, x):
        if self.parent[x] != x:
            self.parent[x] = self.find(self.parent[x])
        return self.parent[x]

    def union(self, x, y):
        rx, ry = self.find(x), self.find(y)
        if rx == ry:
            return False
        # FILL: pick which root becomes the parent of the other (the bigger set wins)
        if self.size[rx] < self.size[ry]:
            ____________________
        ____________________
        ____________________
        return True
```

- Show the answer
  - ```python
    rx, ry = ry, rx               # swap so rx is the larger set
    self.parent[ry] = rx
    self.size[rx] += self.size[ry]
    ```
  - After the swap, `rx` is always the larger-or-equal set, so attach `ry` under it and add `ry`'s size into `rx`'s size.

#### From scratch

Implement DSU **without** recursion (iterative `find`). Hint: do two passes — one to find the root, one to re-parent the path.

### Debug-this

```python
class BrokenDSU:
   def __init__(self, n):
       self.parent = list(range(n))

   def find(self, x):
       while self.parent[x] != x:
           x = self.parent[x]
       return x                          # no path compression

   def union(self, x, y):
       self.parent[x] = self.parent[y]   # ← suspicious
```

Two issues. Predict before revealing.

- Show the bugs
  - **Bug 1**: `union` operates on raw `x` and `y` instead of their roots. After `union(0, 1)` and `union(0, 2)`, you've set `parent[0] = 1` then `parent[0] = 2` — but 1 and 2 are still in disjoint trees because nothing ever connected 1 and 2 directly. The fix: `self.parent[self.find(x)] = self.find(y)`.
  - **Bug 2**: No union-by-rank/size. Even after fixing Bug 1, pathological input sequences can build a linear chain. Performance degrades from `O(α(n))` to `O(log n)` or worse.

### Teach-it-back

In ~3 sentences, without notes:

> *"What are the two optimizations that make DSU operations nearly constant-time? What goes wrong if you skip each one?"*

If you can't, re-read the optimizations section.

---

## 🎴 Flashcards (for daily review, not the first read)

- The two core DSU operations? #card
  - `find(x)` — return the root of x's set. `union(x, y)` — merge the sets containing x and y.
- Amortized time per DSU operation with both optimizations? #card
  - `O(α(n))` — inverse Ackermann, effectively constant (≤ 4 for any reasonable n).
- The two optimizations DSU needs to achieve near-constant time? #card
  - **Path compression** (flatten paths during `find`) and **union by rank/size** (attach smaller tree under larger).
- What does **path compression** do? #card
  - On a `find(x)` call, re-parents every node on the path from `x` to the root directly to the root. Subsequent finds on those nodes are O(1).
- What's the **root** in DSU? #card
  - An element whose parent is itself: `parent[x] == x`. Two elements are in the same set iff they have the same root.
- {{cloze With **both** path compression and union-by-rank, DSU operations are `O(α(n))` — effectively constant.}} #card
- Without union-by-rank, what's the worst case? #card
  - A linear chain: every `find` takes `O(n)`. Path compression alone helps but doesn't fully fix it.
- One non-graph use of DSU? #card
  - Flood fill in image processing, percolation simulations, dynamic connectivity queries, Tarjan's offline LCA.
- How does Kruskal's MST use DSU? #card
  - To check whether adding a candidate edge would create a cycle: if both endpoints have the same root, skip the edge; otherwise add it and union.

---

## ✅ Self-check before moving on

Honest yes/no:

- Can I write DSU from scratch (with path compression and union-by-rank) in under 20 lines?
- Can I explain in plain language why the two optimizations matter?
- Can I trace `union(0,1), union(2,3), union(0,2), find(3)` on paper and produce the correct root?
- Do I know two non-graph problems DSU solves?

If any "no", do one practice exercise. If all "yes", move on to [[Learning/DSA/Graphs/MST]] — DSU is the missing piece for Kruskal's.

## 🔗 Related

- Up: [[Learning/DSA]]
- Used by: [[Learning/DSA/Graphs/MST]] (Kruskal's), [[Learning/DSA/Graphs/Connectivity]] (undirected cycle detection)
- Practice problems: [[Learning/DSA/Graphs/Exercises]]
