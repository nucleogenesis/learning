---
title: Connectivity
tags: [topic/dsa, topic/graphs, kind/concept]
lastUpdated: 2026-05-15
---
# Connectivity — components, cycles, bipartite

> Convention: Answer blocks are children of "Show answer" parents. Click the triangle to collapse — Logseq remembers.

## 🎯 Why this matters

Once you can traverse a graph (BFS/DFS), three immediate questions follow:

- **"How many separate clusters are in my network?"** — a social network with 10M users probably contains a handful of disjoint communities; the Facebook graph is famously one giant component plus a long tail of small ones.
- **"Will my build/install graph deadlock?"** — `npm`, `cargo`, `apt` all need to detect when package dependencies form a cycle. A cycle means "no valid install order exists."
- **"Can these students be split into two teams so no two friends end up on the same team?"** — graph 2-colorability, also known as bipartite checking. Comes up in conflict resolution, job-shop scheduling, and matching problems.
  - All three questions are tiny extensions of BFS/DFS. You walk the graph, you carry a little extra state (a component label, a coloring, a parent pointer), and the answer falls out.

## A tiny worked example

Extending the social network from [[Learning/DSA/Graphs/Basics]] with two more people, Eve and Frank, who only follow each other:

```
Alice ── Bob       Eve ── Frank
  │       │
Carol ── Dave
```

As an adjacency list:

```python
graph = {
    'Alice': ['Bob', 'Carol'],
    'Bob':   ['Alice', 'Dave'],
    'Carol': ['Alice', 'Dave'],
    'Dave':  ['Bob', 'Carol'],
    'Eve':   ['Frank'],
    'Frank': ['Eve'],
}
```

This graph has **two connected components**: `{Alice, Bob, Carol, Dave}` and `{Eve, Frank}`. There's no path between any vertex in one component and any vertex in the other. Component 1 also contains a **cycle** (Alice → Bob → Dave → Carol → Alice). Component 2 is acyclic (it's just an edge).

## Connected components

The algorithm: walk over every vertex; if the vertex hasn't been visited yet, run BFS/DFS from it and label everything it reaches with the same component id; then move on to the next unvisited vertex.

### Worked example (read)

```python
def connected_components(graph):
    visited = set()
    components = []
    for start in graph:
        if start in visited:
            continue
        # BFS from start; everything reached belongs to one component
        component = []
        queue = deque([start])
        visited.add(start)
        while queue:
            v = queue.popleft()
            component.append(v)
            for u in graph[v]:
                if u not in visited:
                    visited.add(u)
                    queue.append(u)
        components.append(component)
    return components
```

Running this on the example: `[['Alice', 'Bob', 'Carol', 'Dave'], ['Eve', 'Frank']]`.

Time: `O(V + E)` — each vertex and each edge touched once across all the BFS/DFS calls combined.

- **Naming the parts**: a **connected component** is a maximal set of vertices where every pair has a path between them. "Maximal" matters: `{Alice, Bob}` is connected, but it's not a component because we can extend it to include Carol and Dave.

Note: for **directed** graphs the right concept is **strongly connected components** (SCC), which need a more sophisticated algorithm — see [[Learning/DSA/Graphs/SCC]].

## Cycle detection — undirected graphs

Two common approaches; pick based on what other data structures you already have.

### Approach 1: DFS with parent tracking

The trick that *doesn't* work: white/gray/black coloring directly. Every undirected edge appears in both directions in the adjacency list, so when DFS goes from `A` to `B`, looking at `B`'s neighbors it sees `A` (still GRAY because it's on the recursion stack) and falsely reports a cycle.

The fix: pass the parent vertex into the recursive call, and skip the parent when checking for back edges.

```python
def has_cycle_undirected(graph):
    visited = set()

    def visit(v, parent):
        visited.add(v)
        for u in graph[v]:
            if u not in visited:
                if visit(u, parent=v):
                    return True
            elif u != parent:
                return True       # back edge to non-parent → cycle
        return False

    return any(visit(v, parent=None) for v in graph if v not in visited)
```

Time: `O(V + E)`.

### Approach 2: Union-Find (Disjoint-Set-Union)

If you already have a DSU structure handy (see [[Learning/DSA/Disjoint-Set-Union]] — needed for Kruskal's MST anyway), undirected cycle detection is almost free:

Process each edge `(u, v)` in any order.

If `find(u) == find(v)`, the endpoints are already in the same component → adding this edge creates a cycle.

Otherwise, `union(u, v)`.

```python
def has_cycle_dsu(vertices, edges):
    dsu = DSU(vertices)
    for u, v in edges:
        if dsu.find(u) == dsu.find(v):
            return True
        dsu.union(u, v)
    return False
```

Time: `O(E · α(V))` — effectively `O(E)` for practical input sizes.

- **When to pick which**: if you're already doing Kruskal's MST or similar, use DSU. Otherwise, the DFS approach is one less data structure to import.

## Cycle detection — directed graphs

Quick recap (the full treatment lives in [[Learning/DSA/Graphs/Traversals]]):

Use DFS with three colors. WHITE = unvisited, GRAY = currently on recursion stack, BLACK = fully explored. An edge to a GRAY neighbor is a **back edge**, which means a cycle.

```python
WHITE, GRAY, BLACK = 0, 1, 2

def has_cycle_directed(graph):
    color = {v: WHITE for v in graph}

    def visit(v):
        color[v] = GRAY
        for u in graph[v]:
            if color[u] == GRAY:
                return True
            if color[u] == WHITE and visit(u):
                return True
        color[v] = BLACK
        return False

    return any(color[v] == WHITE and visit(v) for v in graph)
```

This is the same machinery [[Learning/DSA/Graphs/Topological-Sort]] uses to verify that the input is a DAG.

## Bipartite check

A graph is **bipartite** if you can split its vertices into two groups such that every edge goes between the groups, never inside one. Equivalent: the graph is 2-colorable.

### Worked example (read)

The algorithm: BFS from any unvisited vertex, alternating colors layer by layer. If at any point you see an edge to a neighbor that already has the same color you're about to assign, the graph isn't bipartite.

```python
def is_bipartite(graph):
    color = {}

    for start in graph:
        if start in color:
            continue
        color[start] = 0
        queue = deque([start])
        while queue:
            v = queue.popleft()
            for u in graph[v]:
                if u not in color:
                    color[u] = 1 - color[v]      # flip
                    queue.append(u)
                elif color[u] == color[v]:
                    return False                 # edge inside a color class
    return True
```

Time: `O(V + E)`.

### Why it works

A graph is bipartite iff it has no **odd-length cycle**. Walking around an odd cycle while alternating colors brings you back to the start with the *wrong* color — contradiction. BFS layer-coloring catches this exactly when the BFS frontier collides with itself.

Our 4-cycle (Alice/Bob/Dave/Carol) is bipartite: `{Alice, Dave}` get color 0, `{Bob, Carol}` get color 1. A triangle would not be bipartite — try it.

## 🔍 Quick check (try before scrolling)

- **Q1**: A directed graph with a back edge to a BLACK vertex — is that a cycle?
- Show answer to Q1
  - No. A back edge in directed cycle detection specifically means an edge to a GRAY vertex (one currently on the recursion stack — an ancestor). An edge to a BLACK vertex is a **forward edge** (to a descendant already finished) or a **cross edge** (to a different subtree). Only the GRAY case implies a cycle.
- **Q2**: Why does undirected cycle detection break if you don't track the parent?
- Show answer to Q2
  - Every undirected edge appears in both directions in the adjacency list. When DFS recurses from `A` to `B`, looking at `B`'s neighbors it sees `A` — already visited — and treats it as a back edge. False positive on every single edge. Tracking the parent and skipping it eliminates the spurious "cycle" reports.
- **Q3**: Is a tree bipartite?
- Show answer to Q3
  - Yes, always. A tree has no cycles, so in particular no odd cycles. Color vertices by depth (even depth = color 0, odd depth = color 1) and you've got a valid 2-coloring.
- **Q4**: A graph has 100 vertices and 99 edges, and the BFS from vertex 0 visits 60 of them. How many connected components are there?
- Show answer to Q4
  - At least 2, but we can't tell exactly without running BFS from one of the remaining 40 vertices. It could be that all 40 form one big second component, or they could be split into many tiny ones. The 99 edges constrain us slightly (since a single connected component with `n` vertices needs at least `n-1` edges if it's a tree), but components can share the edge budget arbitrarily.

---

## 💪 Practice (a separate session, not your first read)

### Worked → faded → blank: count connected components

#### Worked example (read)

```python
def count_components(graph):
    visited = set()
    count = 0
    for v in graph:
        if v in visited:
            continue
        count += 1
        # mark every vertex reachable from v as visited
        stack = [v]
        while stack:
            x = stack.pop()
            if x in visited:
                continue
            visited.add(x)
            stack.extend(graph[x])
    return count
```

#### Faded — fill in the blanks

`size_of_each_component(graph) -> list[int]`. Return the list of component sizes in any order.

```python
def size_of_each_component(graph):
    visited = set()
    sizes = []
    for v in graph:
        if v in visited:
            continue
        # FILL: BFS or DFS from v, count vertices reached, append size
        size = 0
        stack = [v]
        while stack:
            x = stack.pop()
            if x in visited:
                continue
            visited.add(x)
            ____________________
            ____________________
        sizes.append(size)
    return sizes
```

- Show the answer

```python

size += 1

stack.extend(graph[x])

```

#### From scratch

Write `largest_component(graph) -> set` returning the set of vertices in the largest connected component. (Tie-break arbitrarily — return any largest one.)

### Debug-this

```python
def is_bipartite_buggy(graph):
    color = {}
    for start in graph:
        if start in color:
            continue
        color[start] = 0
        for v in graph:                  # ← suspicious
            for u in graph[v]:
                if u not in color:
                    color[u] = 1 - color[v]
                elif color[u] == color[v]:
                    return False
    return True
```

What's wrong? Predict before revealing.

- Show the bugs
  - **Bug 1**: The inner loop walks *every* vertex via `for v in graph`, not just vertices reachable from `start`. It doesn't BFS/DFS — it's looking at vertices that may not yet have colors. When it hits a vertex with no color yet, the `color[u] = 1 - color[v]` line crashes (`color[v]` doesn't exist).
  - **Bug 2**: Even if the crash were avoided, the algorithm doesn't propagate colors along edges in BFS order — it'd assign colors in arbitrary order and miss conflicts entirely.
  - **The fix**: replace the inner loop with a real BFS from `start` (use a queue, only push uncolored neighbors). See the worked example above.

### Teach-it-back

In ~3 sentences, without notes:

> *"Why does the white/gray/black trick for cycle detection break on undirected graphs, and what's the standard fix?"*

If you struggle, the undirected cycle detection section didn't fully land — re-read it, then try again.

---

## 🎴 Flashcards (for daily review, not the first read)

- What's a **connected component**? #card #graphs/connectivity
  - A maximal set of vertices where every pair has a path between them. "Maximal" = can't be extended without breaking the property.
- Algorithm to count connected components in an undirected graph? #card #graphs/connectivity
  - Iterate all vertices; for each unvisited one, run BFS/DFS and increment a counter. `O(V + E)`.
- Why does white/gray/black cycle detection fail on **undirected** graphs? #card #graphs/connectivity #dfs #cycle-detection
  - Every undirected edge appears in both directions; revisiting the parent looks like a back edge. Fix: track the parent and skip it when checking GRAY neighbors.
- Two algorithms for undirected cycle detection? #card #graphs/connectivity #cycle-detection
  - DFS with parent tracking (`O(V + E)`), or Union-Find scanning edges (`O(E · α(V))`).
- A graph is **bipartite** iff... #card #graphs/connectivity #bipartite
  - It has no odd-length cycle. Equivalently, it's 2-colorable.
- Algorithm for bipartite check? #card #graphs/connectivity #bipartite
  - BFS from each unvisited vertex, alternating colors layer by layer. If you ever see an edge inside a color class, not bipartite.
- {{cloze A graph is bipartite **if and only if** it has no **odd-length cycle**.}} #card #graphs/connectivity #bipartite
- Is a tree always bipartite? #card #graphs/connectivity #bipartite
  - Yes — trees have no cycles, so no odd cycles. Color by depth parity.
- {{cloze For **directed** graphs, the right concept is **strongly connected components** (SCC), not plain connected components.}} #card #graphs/connectivity #scc
- Cycle detection: when to use **DSU** vs **DFS with parent**? #card #graphs/connectivity #dfs #dsu #cycle-detection
  - DSU if you already have it (e.g., for Kruskal's MST). DFS-with-parent if you don't want to import another data structure.

---

## ✅ Self-check before moving on

Honest yes/no:

Can I write the connected-components algorithm from scratch and explain why the total work is `O(V + E)`, not `O(V · E)`?

Can I explain in one sentence why white/gray/black fails on undirected graphs?

Can I explain why bipartite ⇔ no odd cycle?

Can I trace BFS-based bipartite checking on a small graph (5–6 vertices) by hand and predict the colors?

If any "no", do *one* practice exercise above. If all "yes", move on to [[Learning/DSA/Graphs/Topological-Sort]].

## 🔗 Related

Up: [[Learning/DSA/Graphs]]

Prev: [[Learning/DSA/Graphs/Traversals]]

Next: [[Learning/DSA/Graphs/Topological-Sort]]

Companion prereq: [[Learning/DSA/Disjoint-Set-Union]] (for DSU-based cycle detection and MST)

Practice problems: [[Learning/DSA/Graphs/Exercises]]
