---
title: Topological-Sort
tags: [learning, dsa, graphs, topological-sort, dag]
lastUpdated: 2026-05-15
---
# Topological sort — ordering a DAG

> Convention: Answer blocks are children of "Show answer" parents. Click the triangle to collapse — Logseq remembers.

## 🎯 Why this matters

You run `npm install`. Your project depends on `react`. `react` depends on `loose-envify`. `loose-envify` depends on `js-tokens`. In what order should npm install them?

Obvious answer: install `js-tokens` first, then `loose-envify`, then `react`. More generally: for any "X depends on Y" relationship, install (or build, or run, or process) Y before X.

That's **topological sort**: given a directed acyclic graph (DAG), produce a linear ordering of its vertices such that every directed edge goes from earlier to later in the ordering. Real-world uses:

- **Build systems** (`make`, Bazel, Gradle): compile dependencies before dependents.
- **Task schedulers**: run tasks after their prerequisites complete.
- **Spreadsheet recalculation**: when cell A1 changes, recompute cells in dependency order.
- **Course prerequisites**: figure out a valid semester-by-semester course plan.
- **Symbol resolution in compilers**: process forward declarations before uses.
  - **Hard prerequisite**: the graph must be a DAG. If there's a cycle, no valid ordering exists. Both algorithms below also serve as cycle detectors — they signal failure if the input has a cycle.

## A tiny worked example

Five tasks for cooking pasta, with dependencies (arrows mean "must happen before"):

```
boil_water ────→ cook_pasta ────→ serve
                                    ↑
chop_garlic ──→ make_sauce ─────────┘
```

As an adjacency list:

```python
graph = {
    'boil_water':  ['cook_pasta'],
    'chop_garlic': ['make_sauce'],
    'cook_pasta':  ['serve'],
    'make_sauce':  ['serve'],
    'serve':       [],
}
```

Several valid topological orderings exist:

`boil_water, chop_garlic, cook_pasta, make_sauce, serve`

`chop_garlic, make_sauce, boil_water, cook_pasta, serve`

`boil_water, chop_garlic, make_sauce, cook_pasta, serve`

All of them respect every dependency arrow. Toposort never has a unique answer in general — it's a *family* of orderings consistent with the DAG.

- **Naming the parts**:
- **DAG** — directed acyclic graph. Required input.
- **Source** — a vertex with in-degree 0. No prerequisites. `boil_water` and `chop_garlic` are sources.
- **Sink** — a vertex with out-degree 0. Nothing depends on it. `serve` is the only sink here.

## Two algorithms

### Kahn's algorithm — BFS-style

Intuition: repeatedly pull off any vertex with no remaining prerequisites, "complete" it, and remove its outgoing edges (which may free up new vertices).

```python
from collections import deque

def topo_sort_kahn(graph):
    # 1. Compute in-degree for every vertex.
    in_degree = {v: 0 for v in graph}
    for v in graph:
        for u in graph[v]:
            in_degree[u] += 1

    # 2. Seed the queue with all sources (in-degree 0).
    queue = deque([v for v in graph if in_degree[v] == 0])
    order = []

    # 3. Process queue: emit a vertex, decrement neighbors' in-degrees,
    #    enqueue any neighbor that just became a source.
    while queue:
        v = queue.popleft()
        order.append(v)
        for u in graph[v]:
            in_degree[u] -= 1
            if in_degree[u] == 0:
                queue.append(u)

    if len(order) != len(graph):
        raise ValueError("graph has a cycle")     # didn't process every vertex
    return order
```

Time: `O(V + E)`. Space: `O(V)` for in-degree counts plus queue.

- **Cycle detection comes free**: if the graph has a cycle, the vertices on the cycle never reach in-degree 0, so they never enter the queue, so `len(order) < len(graph)`.

### DFS post-order — reversed

Intuition: DFS naturally finishes deep vertices first (the sinks). If you log each vertex as DFS *finishes* it (post-order), you get a reverse topological order. Reverse the list and you've got toposort.

```python
def topo_sort_dfs(graph):
    WHITE, GRAY, BLACK = 0, 1, 2
    color = {v: WHITE for v in graph}
    order = []

    def visit(v):
        color[v] = GRAY
        for u in graph[v]:
            if color[u] == GRAY:
                raise ValueError("graph has a cycle")     # back edge
            if color[u] == WHITE:
                visit(u)
        color[v] = BLACK
        order.append(v)             # post-order: log on finish

    for v in graph:
        if color[v] == WHITE:
            visit(v)

    return list(reversed(order))
```

Time: `O(V + E)`. Space: `O(V)` for the colors plus recursion stack.

- **Cycle detection**: same white/gray/black machinery from [[Learning/DSA/Graphs/Traversals]]. A back edge (to a GRAY vertex) means a cycle, and we abort.

### Kahn vs DFS — when each wins

| | Kahn (BFS) | DFS post-order |
|---|---|---|
| Iteration style | iterative | recursive (or explicit stack) |
| Risk of stack overflow on deep graphs | none | yes (Python default depth limit is ~1000) |
| Detects cycle by... | unprocessed vertices remaining | back edge during DFS |
| Lexicographically smallest order easy? | use a min-heap instead of queue → ✅ | hard |
| Yields source-first ordering | yes (sources come out first) | yes (sources come out first when reversed) |

- **Default pick**: Kahn's, slightly. Iterative, easy to extend (e.g., for lexicographic toposort or for parallel-friendly "do everything at depth 0, then everything at depth 1" scheduling). DFS post-order is conceptually elegant and reuses cycle-detection code you already wrote for Traversals.

## 🔍 Quick check (try before scrolling)

- **Q1**: Run Kahn's algorithm on the pasta graph above. What does the queue look like at each step?
- Show answer to Q1
  - Step 0: queue=`[boil_water, chop_garlic]` (the two sources). order=`[]`.
  - Step 1: pop `boil_water`. Decrement in-degree of `cook_pasta` from 1 to 0; enqueue it. order=`[boil_water]`, queue=`[chop_garlic, cook_pasta]`.
  - Step 2: pop `chop_garlic`. Decrement in-degree of `make_sauce` from 1 to 0; enqueue it. order=`[boil_water, chop_garlic]`, queue=`[cook_pasta, make_sauce]`.
  - Step 3: pop `cook_pasta`. Decrement `serve` from 2 to 1; not zero, don't enqueue. order=`[boil_water, chop_garlic, cook_pasta]`, queue=`[make_sauce]`.
  - Step 4: pop `make_sauce`. Decrement `serve` from 1 to 0; enqueue. order=`[..., make_sauce]`, queue=`[serve]`.
  - Step 5: pop `serve` (no outgoing edges). order=`[boil_water, chop_garlic, cook_pasta, make_sauce, serve]`. Queue empty, done.
- **Q2**: Why does DFS post-order give *reverse* topological order, not topological order directly?
- Show answer to Q2
  - DFS finishes a vertex *after* recursively visiting all its descendants — so sinks finish first, sources finish last. Topological order requires sources first, sinks last. Hence reverse.
- **Q3**: A graph has 5 vertices and you run Kahn's algorithm. `order` ends up with only 3 vertices in it. What do you conclude?
- Show answer to Q3
  - The other 2 vertices are part of a cycle (their in-degree never hit zero because they're caught in a mutual-dependency loop). No valid topological order exists — the input wasn't a DAG.
- **Q4**: You want the lexicographically smallest topological order (e.g., for deterministic output). Which algorithm, and what's the modification?
- Show answer to Q4
  - Kahn's, replacing the queue with a **min-heap** (priority queue keyed on the vertex name). At each step, pop the smallest-named vertex with in-degree 0. Time becomes `O((V + E) log V)` instead of `O(V + E)`. DFS post-order doesn't have a clean way to produce lexicographically smallest order.

---

## 💪 Practice (a separate session, not your first read)

### Worked → faded → blank: Kahn's

#### Worked example (read)

See the `topo_sort_kahn` implementation above. Re-read it line by line and make sure each step makes sense.

#### Faded — fill in the blanks

Adapt Kahn's to return the topological order as a list of **layers**, where each layer is the set of vertices that can run in parallel:

```python
def topo_layers(graph):
    in_degree = {v: 0 for v in graph}
    for v in graph:
        for u in graph[v]:
            in_degree[u] += 1

    current_layer = [v for v in graph if in_degree[v] == 0]
    layers = []
    processed = 0
    while current_layer:
        layers.append(current_layer)
        processed += len(current_layer)
        next_layer = []
        for v in current_layer:
            # FILL: relax v's out-edges, collect newly-source vertices
            ____________________
            ____________________
            ____________________
        current_layer = next_layer

    if processed != len(graph):
        raise ValueError("graph has a cycle")
    return layers
```

- Show the answer

```python

- for u in graph[v]:

in_degree[u] -= 1

- if in_degree[u] == 0:

next_layer.append(u)

```
  - The outer while-loop now processes a whole layer at a time. Each layer is the set of tasks you could run in parallel given infinite workers. On the pasta graph, layers would be `[[boil_water, chop_garlic], [cook_pasta, make_sauce], [serve]]`.

#### From scratch

Write `topo_sort_dfs(graph)` from a blank file, including cycle detection. Test it on the pasta graph. Then add one back-edge (e.g., `serve → boil_water`) and confirm your implementation raises.

### Debug-this

```python
def topo_buggy(graph):
    visited = set()
    order = []

    def visit(v):
        if v in visited:
            return
        visited.add(v)
        for u in graph[v]:
            visit(u)
        order.append(v)

    for v in graph:
        visit(v)

    return order   # ← suspicious
```

- What's wrong? Predict before revealing.
- Show the bugs
  - **Bug 1**: Missing the final `reversed()`. DFS post-order is *reverse* topological order; you need to reverse the list before returning.
  - **Bug 2**: No cycle detection. With only a single `visited` set (no GRAY/BLACK distinction), the function silently produces an invalid ordering on cyclic input instead of raising. Try it on `{'a': ['b'], 'b': ['a']}` — it'll happily emit `['a', 'b']` or `['b', 'a']` despite no valid toposort existing.
  - **Fix**: introduce three states (WHITE/GRAY/BLACK) and raise on GRAY-edge sightings, and reverse the output.

### Teach-it-back

Without notes, in ~4 sentences:

> *"Explain why DFS produces reverse topological order, and why Kahn's algorithm yields valid topological order directly. How does each detect a cycle?"*

If you can't explain both halves cleanly, that's a signal to re-trace the post-order finishing logic.

---

## 🎴 Flashcards (for daily review, not the first read)

- What input does topological sort require? #card
  - A **DAG** — directed acyclic graph. Cycles make no valid order possible.
- Time complexity of topological sort (both algorithms)? #card
  - `O(V + E)`.
- Kahn's algorithm — one-line summary? #card
  - Repeatedly pull a source (in-degree 0), append to output, decrement its neighbors' in-degrees.
- DFS-based toposort — one-line summary? #card
  - DFS the graph, log vertices in **post-order** (when DFS finishes them), reverse the result.
- Why does DFS post-order give **reverse** topological order? #card
  - DFS finishes a vertex after all its descendants. Sinks finish first; sources finish last. Topological order is the opposite.
- How does Kahn's algorithm detect a cycle? #card
  - If after processing the queue the output list has fewer vertices than the graph, some vertices' in-degrees never reached zero — they're stuck in a cycle.
- How does DFS-based toposort detect a cycle? #card
  - The white/gray/black machinery: a back edge to a GRAY vertex means a cycle.
- {{cloze A vertex with in-degree 0 is called a **source**; with out-degree 0, a **sink**.}} #card
- {{cloze Topological order is **not unique** in general — any ordering consistent with all dependencies is valid.}} #card
- How do you get the lexicographically smallest toposort? #card
  - Kahn's with a min-heap instead of a queue. Pop the smallest-named source at each step. `O((V + E) log V)`.

---

## ✅ Self-check before moving on

- Honest yes/no:
- Can I write Kahn's algorithm from scratch, including cycle detection?
- Can I explain why DFS finishing order is *reverse* topological order?
- Can I run either algorithm by hand on a 5-vertex DAG and predict the output?
- Do I know one real-world use case I'd reach for toposort on?
  - If any "no", do one practice exercise. If all "yes", move on to [[Learning/DSA/Disjoint-Set-Union]] (prereq for the next pair of subtopics).

## 🔗 Related

Up: [[Learning/DSA/Graphs]]

Prev: [[Learning/DSA/Graphs/Connectivity]]

Next: [[Learning/DSA/Disjoint-Set-Union]] (prereq for MST), then [[Learning/DSA/Graphs/Shortest-Paths]]

Practice problems: [[Learning/DSA/Graphs/Exercises]]
