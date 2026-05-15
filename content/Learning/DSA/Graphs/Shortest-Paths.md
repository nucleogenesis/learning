---
title: Shortest-Paths
tags: [learning, dsa, graphs, shortest-paths, dijkstra, bellman-ford, floyd-warshall]
lastUpdated: 2026-05-15
---

# Shortest paths — BFS, Dijkstra, Bellman-Ford, Floyd-Warshall

> Convention: Answer blocks are children of "Show answer" parents. Click the triangle to collapse — Logseq remembers.

## 🎯 Why this matters

You open Google Maps and ask for the fastest route across town. Behind the scenes:

- Intersections are vertices.
- Roads are edges, weighted by predicted travel time (which depends on time of day, traffic, road type, etc.).
- The "fastest route" is the shortest path in that weighted graph.

Other real-world shortest-path problems:

- **Network routing**: BGP, OSPF, IS-IS all compute shortest paths over routers weighted by link cost.
- **Currency arbitrage**: vertices = currencies, edges = exchange rates (negated logs of rates). A negative cycle = profitable arbitrage loop.
- **Game AI / pathfinding**: A* (a Dijkstra variant) on grids and navigation meshes.
- **Sequence alignment**: shortest path in a DAG of "edit operations" = optimal alignment.

There are four algorithms in the standard toolkit, and **which one you use depends on what your graph looks like**:

| Graph type | Algorithm | Time |
|---|---|---|
| Unweighted | **BFS** | `O(V + E)` |
| Non-negative weights | **Dijkstra** | `O((V + E) log V)` with binary heap |
| Negative weights allowed | **Bellman-Ford** | `O(V · E)` |
| All-pairs (small `V`) | **Floyd-Warshall** | `O(V³)` |

This page walks through all four. The "pick the right one" decision is at the bottom — make sure you internalize it.

## A tiny worked example

Five vertices `A, B, C, D, E` with weighted directed edges:

```
A ──1──→ B ──3──→ E
│        │
4        2
↓        ↓
C ──5──→ D ──1──→ E
```

Edges (weighted):

```
(A, B, 1)
(A, C, 4)
(B, D, 2)
(B, E, 3)
(C, D, 5)
(D, E, 1)
```

Shortest paths from `A`:

- to A: 0
- to B: 1 (via A→B)
- to C: 4 (via A→C)
- to D: 3 (via A→B→D)
- to E: 4 (via A→B→D→E, total 1+2+1=4 — beats A→B→E of total 1+3=4 tie; algorithms may pick either)

**Naming the parts**:

- **Source** — the starting vertex.
- **Distance** — sum of edge weights along a path (sometimes "cost").
- **Relaxation** — the core operation: "if going through `u` to reach `v` is cheaper than my current best, update `v`'s distance and parent."
- **Negative cycle** — a directed cycle whose total weight is negative. Means "shortest paths are unbounded" (you can loop forever and keep decreasing).

## Algorithm 1: BFS — unweighted shortest paths

If every edge has weight 1 (or the same weight), BFS finds shortest paths in `O(V + E)`. The first time BFS reaches a vertex, it's via the fewest edges — and fewest edges = shortest distance when weights are uniform.

```python
from collections import deque

def bfs_distances(graph, source):
    dist = {source: 0}
    queue = deque([source])
    while queue:
        v = queue.popleft()
        for u in graph[v]:
            if u not in dist:
                dist[u] = dist[v] + 1
                queue.append(u)
    return dist
```

Already covered in [[Learning/DSA/Graphs/Traversals]]. Re-read that page if BFS feels rusty.

**0-1 BFS variant**: if edges only have weights 0 or 1, use a deque — push 0-weight neighbors to the *front*, 1-weight neighbors to the *back*. Still `O(V + E)`, beats Dijkstra for this special case.

## Algorithm 2: Dijkstra — non-negative weights

Intuition: just like BFS, but prioritize the vertex with the *smallest tentative distance* instead of FIFO order. Use a **min-heap** keyed on distance.

```python
import heapq

def dijkstra(graph, source):
    # graph[v] is a list of (neighbor, weight)
    dist = {v: float('inf') for v in graph}
    dist[source] = 0
    heap = [(0, source)]
    while heap:
        d, v = heapq.heappop(heap)
        if d > dist[v]:
            continue                          # stale entry; skip
        for u, w in graph[v]:
            new_d = d + w
            if new_d < dist[u]:
                dist[u] = new_d
                heapq.heappush(heap, (new_d, u))
    return dist
```

Time: `O((V + E) log V)` with a binary heap.

### Why does it work?

**Invariant**: the first time Dijkstra pops a vertex from the heap, its distance is finalized (correct). This depends on **non-negative weights** — adding more edges can never make a path shorter, so once we've found the cheapest way to reach `v`, no later path can beat it.

This invariant fails with negative edges, which is why Dijkstra is wrong on negative-weight graphs.

### Tracing on our example, source `A`

```
Step 0: dist = {A:0, B:∞, C:∞, D:∞, E:∞}    heap = [(0, A)]
Pop (0, A). Relax neighbors B (0+1=1<∞ → 1), C (0+4=4<∞ → 4).
Step 1: dist = {A:0, B:1, C:4, D:∞, E:∞}    heap = [(1, B), (4, C)]
Pop (1, B). Relax D (1+2=3<∞ → 3), E (1+3=4<∞ → 4).
Step 2: dist = {A:0, B:1, C:4, D:3, E:4}    heap = [(3, D), (4, C), (4, E)]
Pop (3, D). Relax E (3+1=4 not < 4, skip).
Step 3: dist = {A:0, B:1, C:4, D:3, E:4}    heap = [(4, C), (4, E)]
Pop (4, C). Relax D (4+5=9 not < 3, skip).
Pop (4, E). No outgoing edges.
Done. Final: dist = {A:0, B:1, C:4, D:3, E:4}.
```

Matches the answers we derived above.

### Lazy deletion (why stale entries are fine)

Notice we push to the heap every time we relax — never delete. When a stale entry pops out (i.e., `d > dist[v]`), we just skip it. The heap can grow to `O(E)` entries, but each push/pop is still `O(log E) ≈ O(log V)`, so total time stays `O((V + E) log V)`.

See [[Learning/DSA/Priority-Queue]] for the underlying mechanism.

## Algorithm 3: Bellman-Ford — handles negative weights

Intuition: a shortest path uses at most `V - 1` edges (any longer would revisit a vertex, and on graphs without negative cycles we can always cut out the loop). So relax *every* edge, `V - 1` times. After `k` rounds of relaxation, all shortest paths using at most `k` edges are correct.

```python
def bellman_ford(graph, source):
    # graph is a list of (u, v, weight) tuples
    vertices = set()
    for u, v, _ in graph:
        vertices.add(u); vertices.add(v)
    dist = {v: float('inf') for v in vertices}
    dist[source] = 0

    for _ in range(len(vertices) - 1):
        updated = False
        for u, v, w in graph:
            if dist[u] + w < dist[v]:
                dist[v] = dist[u] + w
                updated = True
        if not updated:
            break                  # early exit: nothing changed this round

    # Detect negative cycles: if any edge can still be relaxed, one exists
    for u, v, w in graph:
        if dist[u] + w < dist[v]:
            raise ValueError("graph contains a negative-weight cycle")

    return dist
```

Time: `O(V · E)`.

### Why `V − 1` iterations?

Any shortest path uses at most `V − 1` edges (in a graph without negative cycles). After iteration `k`, all shortest paths of length ≤ `k` edges are correct. After `V − 1` iterations, all shortest paths are correct.

### Why one more pass catches negative cycles?

If we can still relax an edge after `V − 1` iterations, that means there's a shorter path using more than `V − 1` edges. The only way that's possible is if the path includes a negative cycle (loop around it forever to keep decreasing).

## Algorithm 4: Floyd-Warshall — all-pairs shortest paths

Intuition: build up the answer iteratively. Let `dist[i][j][k]` be the shortest path from `i` to `j` using only vertices `{0, 1, ..., k}` as intermediates. Recurrence:

```
dist[i][j][k] = min(
    dist[i][j][k-1],                    # don't use vertex k
    dist[i][k][k-1] + dist[k][j][k-1]   # use vertex k
)
```

In code (collapsed to a single 2D array because the `k` dimension is processed in-place):

```python
def floyd_warshall(num_vertices, edges):
    INF = float('inf')
    dist = [[INF] * num_vertices for _ in range(num_vertices)]
    for v in range(num_vertices):
        dist[v][v] = 0
    for u, v, w in edges:
        dist[u][v] = min(dist[u][v], w)

    for k in range(num_vertices):
        for i in range(num_vertices):
            for j in range(num_vertices):
                if dist[i][k] + dist[k][j] < dist[i][j]:
                    dist[i][j] = dist[i][k] + dist[k][j]

    # Negative cycle detected if any dist[v][v] < 0
    for v in range(num_vertices):
        if dist[v][v] < 0:
            raise ValueError("negative cycle through vertex {}".format(v))

    return dist
```

Time: `O(V³)`. Space: `O(V²)`.

**When to use**: small dense graphs where you need *every* shortest path, not just from one source. For sparse graphs, running Dijkstra (or Bellman-Ford if negatives are possible) from every source can be faster: `O(V · (V + E) log V)` vs `O(V³)`.

## Pick the right algorithm — decision tree

```
Need shortest paths?
├── All edge weights are equal (or unweighted)? 
│   └── BFS — O(V + E)
├── Edge weights are non-negative?
│   └── Dijkstra — O((V + E) log V)
├── Negative weights possible?
│   ├── Need shortest paths from one source?
│   │   └── Bellman-Ford — O(V·E)
│   └── Need shortest paths between all pairs?
│       └── Floyd-Warshall — O(V³)
└── Special case: weights are only 0 or 1?
    └── 0-1 BFS — O(V + E)
```

## 🔍 Quick check (try before scrolling)

- **Q1**: Why does Dijkstra fail on graphs with negative edges?
- Show answer to Q1
  - Dijkstra's invariant — "the first time we pop a vertex, its distance is finalized" — depends on the assumption that adding more edges can only *increase* the path cost. Negative edges break this: a longer path through a negative edge can be cheaper than a shorter direct path. Once you pop a vertex with an over-estimated distance, you don't revisit it, so the answer is wrong.
- **Q2**: A graph has 1000 vertices, 5000 edges, non-negative weights. Best algorithm for single-source shortest paths?
- Show answer to Q2
  - Dijkstra with a binary heap. Time `O((V + E) log V) = O(6000 · 10) ≈ 60K` ops. BFS doesn't work (weighted). Bellman-Ford would be `O(V·E) = 5M` — overkill. Floyd-Warshall would be `O(V³) = 10^9` — way too slow and answers more than asked (all-pairs).
- **Q3**: How does Bellman-Ford detect a negative cycle?
- Show answer to Q3
  - Run `V - 1` rounds of relaxation. Then do one more round. If any edge can still be relaxed, the path through it has more than `V - 1` edges — which only happens if there's a negative cycle to traverse repeatedly. Throw / report that fact.
- **Q4**: What's the recurrence in Floyd-Warshall — in plain language?
- Show answer to Q4
  - For every triple `(i, j, k)`: ask "is going from `i` through `k` to `j` cheaper than the direct shortest path I have so far from `i` to `j`?" If yes, update. The `k` loop is the outermost — that's the "what intermediates am I allowed to use" loop.
- **Q5**: You have a road network (positive weights only, sparse). Why is Dijkstra better than Floyd-Warshall, even though both work?
- Show answer to Q5
  - Sparse graph: `E ≈ V`, so Dijkstra runs in `O(V log V)`. Floyd-Warshall is always `O(V³)` regardless of edge count. On 10K-vertex road networks, Dijkstra is hundreds of millions of times faster.

---

## 💪 Practice (a separate session, not your first read)

### Worked → faded → blank: Dijkstra with path reconstruction

#### Worked example (read)

See the `dijkstra` implementation above for the distance-only version.

#### Faded — fill in the blanks

Modify Dijkstra to also return the path itself, not just the distance, for any destination:

```python
def dijkstra_with_path(graph, source):
    dist = {v: float('inf') for v in graph}
    dist[source] = 0
    parent = {source: None}
    heap = [(0, source)]
    while heap:
        d, v = heapq.heappop(heap)
        if d > dist[v]:
            continue
        for u, w in graph[v]:
            new_d = d + w
            if new_d < dist[u]:
                dist[u] = new_d
                # FILL: record that we reached u via v
                ____________________
                heapq.heappush(heap, (new_d, u))
    return dist, parent

def reconstruct_path(parent, target):
    # FILL: walk parents back from target, then reverse
    path = []
    cur = target
    while cur is not None:
        ____________________
        ____________________
    return list(reversed(path))
```

- Show the answer
  - ```python
    parent[u] = v
    ```
  - ```python
    path.append(cur)
    cur = parent[cur]
    ```
  - Each time we improve `u`'s distance, we record who got us there. To reconstruct, walk parents back from target until we hit `None` (the source's parent). Reverse to get start→target order.

#### From scratch

Implement Bellman-Ford from a blank file. Test it on a small graph that has a negative cycle and verify your implementation raises.

### Debug-this

```python
def dijkstra_buggy(graph, source):
    dist = {v: float('inf') for v in graph}
    dist[source] = 0
    visited = set()
    heap = [(0, source)]
    while heap:
        d, v = heapq.heappop(heap)
        visited.add(v)               # ← suspicious
        for u, w in graph[v]:
            if u in visited:
                continue              # ← suspicious
            new_d = d + w
            if new_d < dist[u]:
                dist[u] = new_d
                heapq.heappush(heap, (new_d, u))
    return dist
```

Predict the bug before revealing.

- Show the bug
  - The "visited" set isn't necessary for Dijkstra and adds risk. The standard version handles staleness with `if d > dist[v]: continue` — that's enough. The buggy version is actually mostly OK for non-negative weights (since once you pop a vertex its distance is finalized), but the early `visited.add(v)` happens *before* checking staleness, so if a stale entry pops first it could mark the vertex visited at the stale distance, blocking the correct relaxation. The fix is to skip the visited set entirely and use the standard staleness check.

### Teach-it-back

In ~4 sentences, without notes:

> *"Why does Dijkstra need non-negative weights to be correct? Give a tiny example (3 vertices) where Dijkstra produces the wrong answer on a graph with negative weights, and explain which algorithm you'd use instead."*

If you can't construct the counterexample, the Dijkstra invariant ("first-pop is finalized") hasn't fully clicked.

---

## 🎴 Flashcards (for daily review, not the first read)

- BFS for shortest paths — what's the constraint? #card
  - All edges must have the **same weight** (or be unweighted). Time `O(V + E)`.
- Dijkstra — what's the constraint? #card
  - **Non-negative** edge weights. Fails on negatives.
- Dijkstra time complexity with binary heap? #card
  - `O((V + E) log V)`.
- Bellman-Ford — when do you use it? #card
  - When the graph has **negative weights** (but no negative cycle). Also detects negative cycles. `O(V · E)`.
- Bellman-Ford intuition? #card
  - Relax every edge `V - 1` times. One more pass; if anything still relaxes, there's a negative cycle.
- Floyd-Warshall — when do you use it? #card
  - **All-pairs** shortest paths on **small dense** graphs. `O(V³)` time, `O(V²)` space.
- Floyd-Warshall recurrence (plain English)? #card
  - For every triple `(i, j, k)`: is the path from i to j through k cheaper than the current best from i to j? If yes, update. Outer loop is `k`.
- Why does Dijkstra fail on negative weights? #card
  - It relies on "first-pop is finalized," which depends on adding edges never decreasing path cost. Negative edges break this — a later relaxation could find a cheaper path, but Dijkstra never revisits popped vertices.
- 0-1 BFS — what's the data structure? #card
  - **Deque**. Push 0-weight neighbors to the *front*, 1-weight to the *back*. Still `O(V + E)`.
- How does Dijkstra handle stale heap entries? #card
  - Lazy deletion: on pop, check `if d > dist[v]: continue`. Heap may grow to `O(E)` but operations stay `O(log V)`.
- {{cloze A **negative cycle** in a graph means shortest paths are **unbounded** — you can loop forever, decreasing the total cost.}} #card

---

## ✅ Self-check before moving on

Honest yes/no:

- Can I write Dijkstra from scratch (with priority queue + path reconstruction)?
- Can I explain why Dijkstra fails on negative weights, with a concrete counterexample?
- Can I write Bellman-Ford from scratch and explain how it detects negative cycles?
- Can I look at a graph problem and pick the right shortest-path algorithm in <30 seconds?

If any "no", do one practice exercise. If all "yes", move on to [[Learning/DSA/Graphs/SCC]] — the last graph subtopic.

## 🔗 Related

- Up: [[Learning/DSA/Graphs]]
- Prev: [[Learning/DSA/Graphs/MST]]
- Companion prereqs: [[Learning/DSA/Priority-Queue]] (for Dijkstra), [[Learning/DSA/Graphs/Traversals]] (BFS)
- Next: [[Learning/DSA/Graphs/SCC]]
- Practice problems: [[Learning/DSA/Graphs/Exercises]]
