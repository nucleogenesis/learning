---
title: MST
tags: [learning, dsa, graphs, mst]
lastUpdated: 2026-05-15
---

# Minimum spanning tree — Kruskal and Prim

> Convention: Answer blocks are children of "Show answer" parents. Click the triangle to collapse — Logseq remembers.

## 🎯 Why this matters

You're laying internet cable between 12 buildings on a campus. Every potential trench has a cost (distance, terrain difficulty, whatever). You want **every building connected** with the **minimum total trench cost**. What edges do you dig?

That's the **minimum spanning tree** (MST) problem. Real-world versions:

- **Network design**: minimum-cost cabling, water mains, power grids.
- **Clustering**: cut the heaviest few edges of an MST and the connected pieces are natural clusters (single-linkage clustering).
- **Approximation for traveling salesman**: an MST is a 2-approximation for the metric TSP — useful when you need a "good enough" route fast.
- **Image segmentation**: variations of MST split images into regions of similar color.

Two classic algorithms get there: **Kruskal's** (sort edges, add the cheapest one that doesn't create a cycle) and **Prim's** (grow a single tree outward from a starting vertex, always picking the cheapest edge that leaves the current tree). Both achieve `O(E log V)` time on a graph with `V` vertices and `E` edges. They're each natural in different settings — pick based on what data structures you already have.

## A tiny worked example

Five-building campus with these candidate cables (vertex pairs, weight = cost):

```
A ─ 1 ─ B
│       │ \
4       3   5
│       │     \
C ─ 2 ─ D ─ 6 ─ E
```

Edge list:

```
(A, B, 1)
(C, D, 2)
(B, D, 3)
(A, C, 4)
(B, E, 5)
(D, E, 6)
```

The MST should include 4 edges (a tree on 5 vertices has `V - 1 = 4` edges) with minimum total weight.

**Naming the parts**:

- **Spanning tree** — a subset of edges that touches every vertex and forms a tree (connected + acyclic, `V - 1` edges).
- **Minimum spanning tree** — the spanning tree with the smallest total edge weight.
- **MST is not unique** if edge weights tie; algorithms may produce different valid MSTs in that case.

## Algorithm 1: Kruskal's — sort edges, union by edges

Intuition: greedily add the cheapest edge available, as long as it doesn't create a cycle. Use **Disjoint-Set-Union** (DSU) to detect cycles efficiently.

```python
def kruskal(vertices, edges):
    # edges is a list of (u, v, weight)
    dsu = DSU(len(vertices))      # see [[Learning/DSA/Disjoint-Set-Union]]
    mst = []
    total_weight = 0
    for u, v, w in sorted(edges, key=lambda e: e[2]):
        if dsu.find(u) != dsu.find(v):
            dsu.union(u, v)
            mst.append((u, v, w))
            total_weight += w
            if len(mst) == len(vertices) - 1:
                break             # MST complete
    return mst, total_weight
```

Time: `O(E log E)` for sorting plus `O(E · α(V))` for DSU operations → effectively `O(E log V)` (since `log E ≤ 2 log V`).

### Tracing on our example

Sorted edges: `(A,B,1), (C,D,2), (B,D,3), (A,C,4), (B,E,5), (D,E,6)`.

1. `(A,B,1)`: `find(A) ≠ find(B)` → union. MST so far: `{(A,B,1)}`. Weight: 1.
2. `(C,D,2)`: different components → union. MST: `{(A,B,1), (C,D,2)}`. Weight: 3.
3. `(B,D,3)`: now `{A,B}` and `{C,D}` are different → union. MST: `{(A,B,1), (C,D,2), (B,D,3)}`. Weight: 6.
4. `(A,C,4)`: `find(A) = find(C)` now (both in `{A,B,C,D}`). Skip — would create a cycle.
5. `(B,E,5)`: different components (E is alone) → union. MST: `{(A,B,1), (C,D,2), (B,D,3), (B,E,5)}`. Weight: 11. Done — 4 edges, 5 vertices, tree complete.

Final MST: total cost **11**.

### Why does the greedy choice work?

**The cut property** (informal): for any partition of the vertices into two sets, the minimum-weight edge crossing the partition is part of *some* MST.

Kruskal's keeps picking the cheapest edge that connects two so-far-disjoint components, which by the cut property must be safe to add. The formal proof is an exchange argument: if some optimal MST didn't include edge `e`, you could swap `e` in (and a heavier crossing-edge out) without making the tree worse. So the greedy choice is always optimal.

## Algorithm 2: Prim's — grow a tree from a vertex

Intuition: start with any one vertex. At each step, find the cheapest edge from the *current tree* to any vertex *outside* the tree, add that edge, repeat. Use a **priority queue** (min-heap) keyed on edge weight.

```python
import heapq

def prim(graph, start):
    # graph[v] is a list of (neighbor, weight)
    in_mst = {start}
    edges_heap = []
    for u, w in graph[start]:
        heapq.heappush(edges_heap, (w, start, u))

    mst = []
    total_weight = 0
    while edges_heap and len(in_mst) < len(graph):
        w, u, v = heapq.heappop(edges_heap)
        if v in in_mst:
            continue          # both endpoints already in tree; skip
        in_mst.add(v)
        mst.append((u, v, w))
        total_weight += w
        for next_neighbor, next_w in graph[v]:
            if next_neighbor not in in_mst:
                heapq.heappush(edges_heap, (next_w, v, next_neighbor))

    return mst, total_weight
```

Time: `O(E log V)` with a binary heap. (Each edge is pushed at most once; each push/pop is `O(log E) ≈ O(log V)`.)

### Tracing on our example, starting from `A`

Heap starts with `A`'s edges: `[(1, A, B), (4, A, C)]`. `in_mst = {A}`.

1. Pop `(1, A, B)`. B not in MST → add. MST: `{(A,B,1)}`. Push B's outgoing edges to non-MST vertices: `(3, B, D), (5, B, E)`. Heap: `[(3, B, D), (4, A, C), (5, B, E)]`. `in_mst = {A, B}`.
2. Pop `(3, B, D)`. D not in MST → add. MST: `{(A,B,1), (B,D,3)}`. Push D's outgoing edges: `(2, D, C), (6, D, E)`. Heap: `[(2, D, C), (4, A, C), (5, B, E), (6, D, E)]`. `in_mst = {A, B, D}`.
3. Pop `(2, D, C)`. C not in MST → add. MST: `{(A,B,1), (B,D,3), (D,C,2)}`. Push C's outgoing edges to non-MST vertices: `(4, C, A)` skipped (A already in MST), nothing else. Heap: `[(4, A, C), (5, B, E), (6, D, E)]`. `in_mst = {A, B, C, D}`.
4. Pop `(4, A, C)`. C in MST → skip.
5. Pop `(5, B, E)`. E not in MST → add. MST: `{(A,B,1), (B,D,3), (D,C,2), (B,E,5)}`. Done.

Final MST: total cost **11** (same as Kruskal — there's a unique MST here).

## Kruskal vs Prim — when each wins

| | Kruskal | Prim |
|---|---|---|
| Core data structure | DSU (Union-Find) | Priority queue (min-heap) |
| Natural input format | edge list | adjacency list |
| Time complexity | `O(E log E)` ≈ `O(E log V)` | `O(E log V)` |
| Iteration style | sorted edges, scan once | priority-queue driven, frontier-expanding |
| Easy to make distributed/parallel? | yes (sort edges in parallel) | harder (sequential frontier) |
| Cleanest when graph is **sparse** | both fine | both fine |
| Cleanest when graph is **dense** | Prim's edges in adjacency matrix version is `O(V²)` — wins | Kruskal's `O(E log E) = O(V² log V)` — slightly worse |
| You already have DSU around | ✅ pick Kruskal | — |
| You already have a heap-based traversal in your toolbox (Dijkstra) | — | ✅ pick Prim (same shape) |

**Heuristic**: if you can pick freely, Kruskal's is slightly easier to reason about (sort edges, add cheap ones, skip if cycle). Prim's has the advantage of being structurally identical to Dijkstra, so if you've internalized one you basically know the other.

## 🔍 Quick check (try before scrolling)

- **Q1**: On the campus example, in what order does Kruskal *consider* edges, and which does it actually *add* to the MST?
- Show answer to Q1
  - Considers in sorted order: `(A,B,1), (C,D,2), (B,D,3), (A,C,4), (B,E,5), (D,E,6)`. Adds: `(A,B,1), (C,D,2), (B,D,3), (B,E,5)`. Skips `(A,C,4)` because A and C are already in the same component, and `(D,E,6)` because by then everything is already connected.
- **Q2**: Why does Prim's algorithm push duplicate entries to the heap?
- Show answer to Q2
  - Prim's doesn't have an efficient way to *update* an existing heap entry when a vertex's cheapest connection-to-tree changes. So instead it just pushes the new (cheaper) edge and ignores stale entries (the `if v in in_mst: continue` check). This is the same "lazy deletion" trick Dijkstra uses. The heap can grow to `O(E)` entries, but operations stay `O(log V)`.
- **Q3**: If all edges have *distinct* weights, is the MST unique?
- Show answer to Q3
  - Yes. With distinct weights, at any greedy step there's exactly one cheapest valid edge, so both Kruskal and Prim produce the same tree. With ties, multiple valid MSTs may exist; different tie-breaking yields different (equally-good) MSTs.
- **Q4**: You have a graph with negative edge weights. Does that break MST algorithms?
- Show answer to Q4
  - No, MST algorithms handle negative weights just fine. They greedily pick *smaller* edges, regardless of sign. (This is unlike Dijkstra, which *does* break on negative weights.)

---

## 💪 Practice (a separate session, not your first read)

### Worked → faded → blank: Kruskal's

#### Worked example (read)

See the `kruskal` implementation above.

#### Faded — fill in the blanks

Write `second_best_mst(vertices, edges)` returning the second-cheapest spanning tree. Hint: try removing each MST edge in turn, find the new MST, pick the cheapest of those.

```python
def second_best_mst(vertices, edges):
    mst, mst_weight = kruskal(vertices, edges)
    best_second = float('inf')
    for excluded_edge in mst:
        # FILL: filter out this edge and run Kruskal on what remains
        remaining = ____________________
        try:
            _, candidate_weight = kruskal(vertices, remaining)
            if candidate_weight < best_second:
                best_second = candidate_weight
        except:
            pass        # removing this edge disconnects the graph; skip
    return best_second
```

- Show the answer
  - ```python
    remaining = [e for e in edges if e != excluded_edge]
    ```
  - The simple approach is `O(V·E log V)` — `V-1` re-runs of Kruskal. There's a fancier `O(E log V)` algorithm using MST tree structure and LCA queries, but the brute-force is fine for most practical inputs.

#### From scratch

Implement Prim's algorithm (with priority queue) from a blank file. Test it on the campus example and verify the same MST weight as Kruskal's.

### Debug-this

```python
def kruskal_buggy(vertices, edges):
   dsu = DSU(len(vertices))
   mst = []
   total = 0
   for u, v, w in edges:                      # ← suspicious
       if dsu.find(u) != dsu.find(v):
           dsu.union(u, v)
           mst.append((u, v, w))
           total += w
   return mst, total
```

Predict the bug before revealing.

- Show the bug
  - **The bug**: missing `sorted(...)` on the edge iteration. The algorithm now adds the *first* acyclic edge it sees, not the *cheapest* — producing a valid spanning tree but not the *minimum* one. With unsorted edges, you'd build some random spanning tree of weight ≥ the true MST. Always sort.

### Teach-it-back

In ~4 sentences, without notes:

> *"Explain Kruskal's algorithm and Prim's algorithm in plain language. What's the role of DSU in Kruskal and the priority queue in Prim, and why do those data structures specifically give us `O(E log V)` time?"*

If you can't, re-read the algorithm sections.

---

## 🎴 Flashcards (for daily review, not the first read)

- What is a **minimum spanning tree**? #card
  - A subset of `V - 1` edges that connects every vertex, with minimum total weight. Connected + acyclic + spanning.
- Two classic MST algorithms? #card
  - **Kruskal** (sort edges + DSU) and **Prim** (priority queue, grow tree from one vertex).
- Time complexity of Kruskal? #card
  - `O(E log E)` ≈ `O(E log V)` — dominated by sorting edges.
- Time complexity of Prim with binary heap? #card
  - `O(E log V)`.
- Kruskal's core data structure? #card
  - **Disjoint-Set-Union** (DSU / Union-Find), to detect cycles when considering each edge.
- Prim's core data structure? #card
  - **Priority queue** (min-heap), to find the cheapest edge leaving the current tree.
- What's the **cut property**? #card
  - For any partition of vertices into two sets, the cheapest edge crossing the cut belongs to *some* MST. Justifies the greedy choices both algorithms make.
- If edge weights are all distinct, is the MST unique? #card
  - Yes. With ties, multiple MSTs may exist.
- Do MST algorithms work with negative edge weights? #card
  - Yes — they just greedily pick smaller edges. (Unlike Dijkstra, which breaks on negative weights.)
- Why does Prim push duplicate entries to the heap? #card
  - Binary heap has no efficient decrease-key. Lazy deletion: push the new (cheaper) edge; skip stale entries when they pop. Same trick Dijkstra uses.
- {{cloze A spanning tree on `n` vertices has exactly **`n − 1`** edges.}} #card
- {{cloze Prim's algorithm is structurally identical to **Dijkstra** — same priority-queue-driven frontier expansion, different relaxation rule.}} #card

---

## ✅ Self-check before moving on

Honest yes/no:

- Can I write Kruskal's algorithm from scratch (assuming DSU is given)?
- Can I write Prim's algorithm from scratch using a priority queue?
- Can I trace either algorithm on a 5–6 vertex graph by hand and reach the right answer?
- Can I explain in one sentence why both algorithms are correct (cut property)?

If any "no", do one practice exercise. If all "yes", move on to [[Learning/DSA/Graphs/Shortest-Paths]] — Prim's heap-driven structure carries directly over.

## 🔗 Related

- Up: [[Learning/DSA/Graphs]]
- Prev: [[Learning/DSA/Disjoint-Set-Union]]
- Companion prereq: [[Learning/DSA/Priority-Queue]]
- Next: [[Learning/DSA/Graphs/Shortest-Paths]]
- Practice problems: [[Learning/DSA/Graphs/Exercises]]
