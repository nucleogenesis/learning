---
title: SCC
tags: [topic/dsa, topic/graphs, kind/concept]
lastUpdated: 2026-05-15
---
# Strongly connected components, bridges, articulation points

> Convention: Answer blocks are children of "Show answer" parents. Click the triangle to collapse — Logseq remembers.

## 🎯 Why this matters

In an *undirected* graph, "connected component" is straightforward: two vertices are in the same component iff there's a path between them ([[Learning/DSA/Graphs/Connectivity]]).

In a *directed* graph, "connected" is trickier. Consider a Twitter follow graph:

Alice follows Bob; Bob follows Alice → mutual follow.

Bob follows Carol; Carol doesn't follow Bob → one-way.

You can reach Carol *from* Bob, but not Bob *from* Carol. So in a directed-graph sense, Bob and Carol are "weakly" connected but not "strongly" connected. **Strongly connected** means: there's a directed path *both ways* between every pair of vertices in the component.

Real-world uses for finding **Strongly Connected Components** (SCCs):

- **Web graph analysis**: web pages and hyperlinks form a directed graph; SCCs are tightly-interlinked clusters (great for ranking and clustering).
- **Compiler analysis**: function-call graphs, with SCCs marking mutual recursion groups (your compiler needs to inline these together).
- **Type inference**: variables in mutual recursion in Hindley-Milner.
- **2-SAT solving**: classical reduction to SCCs in the implication graph.
- **Deadlock detection**: a cycle in the resource-allocation graph = a strongly-connected component with >1 vertex.
  - And a closely-related undirected pair: **bridges** (edges whose removal disconnects the graph) and **articulation points** (vertices whose removal disconnects the graph). Both are about robustness — "what's the single point of failure?"
  - This page covers Kosaraju's and Tarjan's algorithms for SCCs, then briefly touches on bridges/articulation points.

## A tiny worked example

A small directed graph:

```
1 ──→ 2 ──→ 3
↑     │     │
│     ↓     ↓
4 ←── 5     6
    ↑     │
    │     ↓
    └─────┘
```

Edges:

```
1 → 2
2 → 3
2 → 5
3 → 6
4 → 1
5 → 4
6 → 5
```

The SCCs:

`{1, 2, 5, 4}` — there's a cycle 1→2→5→4→1.

`{3, 6}` — there's a cycle 3→6→5? No wait — 6→5 leaves the {3,6} cluster. Let me re-examine: from 3, can I reach 6? Yes (3→6). From 6, can I reach 3? Only via 6→5→4→1→2→3. So 6 *can* reach 3, but only by going through {1,2,5,4} first. So {3,6} *is* its own SCC — they reach each other only through other SCCs, which doesn't count.

Actually wait — for two vertices to be in the same SCC, the directed paths between them must exist, but those paths *can* go through any vertices in the graph, including other SCCs.

Let me recompute. Can 3 reach 6? 3→6, yes. Can 6 reach 3? 6→5→4→1→2→3, yes. So 3 and 6 are mutually reachable → same SCC. But also 5 (and 4, 1, 2) are reachable from 6 and 6 is reachable from each of them — so actually **everything is in one big SCC**!

Let me verify with a cleaner example. Take this graph instead:

```
1 ──→ 2 ──→ 3
↑     │
│     ↓
└──── 4     5 ──→ 6
            ↑   │
            └───┘
```

Edges:

```
1 → 2
2 → 3
2 → 4
4 → 1
5 → 6
6 → 5
```

Now the SCCs are:

`{1, 2, 4}` — cycle 1→2→4→1.

`{3}` — 3 has no outgoing edges; nothing reaches back.

`{5, 6}` — cycle 5→6→5.

Three SCCs, none of which connect bidirectionally to another. This is the example we'll trace below.

- **Naming the parts**:
- **Strongly Connected Component (SCC)** — maximal set of vertices where every pair has directed paths both ways.
- **Condensation** — the graph you get by collapsing each SCC into a single super-vertex. The condensation is always a **DAG** (proof by contradiction — a cycle of SCCs would mean they were all one big SCC).
- **Transpose graph** `G^T` — same vertices, every edge reversed. SCCs in `G` are the same as SCCs in `G^T`. This is the basis of Kosaraju's algorithm.

## Algorithm 1: Kosaraju — 2× DFS

Two DFS passes. Easy to remember, easy to implement; ~20 lines of code.

```python
def kosaraju(graph):
  # graph: adjacency list, directed
  visited = set()
  order = []                 # post-order from pass 1

  def dfs(v, g, visited, on_finish):
      visited.add(v)
      for u in g[v]:
          if u not in visited:
              dfs(u, g, visited, on_finish)
      on_finish(v)

  # Pass 1: DFS on original graph, log vertices in finish order
  for v in graph:
      if v not in visited:
          dfs(v, graph, visited, order.append)

  # Build transpose graph (reverse every edge)
  transpose = {v: [] for v in graph}
  for v in graph:
      for u in graph[v]:
          transpose[u].append(v)

  # Pass 2: DFS on transpose, visiting vertices in REVERSE finish order
  visited.clear()
  sccs = []
  for v in reversed(order):
      if v not in visited:
          component = []
          dfs(v, transpose, visited, component.append)
          sccs.append(component)
  return sccs
```

Time: `O(V + E)` — two DFS passes.

### Why does it work?

Two key facts:

- **The vertex with the latest finish time in pass 1 belongs to a "source" SCC of the condensation.** (Intuition: DFS-finish order topologically sorts the *condensation*, and the last-finishing vertex is in the condensation's source.)
- **In the transpose graph, DFS from a source-SCC vertex can only reach its own SCC** — because all outgoing edges from that SCC in the original graph are now incoming edges in the transpose.
  - Combining: process vertices in reverse pass-1-finish order. The first unvisited vertex is in a source SCC of the condensation. DFS on the transpose from it reaches exactly its SCC. Mark those visited; move on; next unvisited vertex is in the next-most-source SCC; etc.

### Tracing on our 6-vertex example

- **Pass 1** (DFS on original, starting from 1 — implementation might start anywhere, this is one valid run):

```
DFS(1): visit 1; recurse to 2
DFS(2): visit 2; recurse to 3
  DFS(3): visit 3; no outgoing. Finish 3.
recurse to 4
  DFS(4): visit 4; recurse to 1 (already visited). Finish 4.
Finish 2.
Finish 1.
DFS(5): visit 5; recurse to 6
DFS(6): visit 6; recurse to 5 (already visited). Finish 6.
Finish 5.

Post-order finish: [3, 4, 2, 1, 6, 5]
```

- **Pass 2** (DFS on transpose, in REVERSE post-order: 5, 6, 1, 2, 4, 3):

```
Transpose: 1: [4], 2: [1], 3: [2], 4: [2], 5: [6], 6: [5]

Start 5 (unvisited). DFS reaches {5, 6}. SCC #1 = {5, 6}.
Start 6 (visited; skip).
Start 1 (unvisited). DFS reaches {1, 4, 2}. SCC #2 = {1, 4, 2}.
Start 2 (visited; skip).
Start 4 (visited; skip).
Start 3 (unvisited). DFS reaches {3}. SCC #3 = {3}.

SCCs: [{5, 6}, {1, 4, 2}, {3}]
```

Matches what we derived by hand.

## Algorithm 2: Tarjan — single DFS with lowlink

Tarjan's runs in **one** DFS pass using a clever bookkeeping trick. More complex than Kosaraju's; same `O(V + E)` time; sometimes faster in practice because of the single pass.

The core idea: during DFS, track each vertex's **discovery time** (`disc[v]`) and **lowlink** (`low[v]` — the smallest discovery time reachable from `v`'s DFS subtree via at most one back edge). A vertex `v` is the "root" of an SCC iff `disc[v] == low[v]`. Maintain a stack of "vertices in flight"; when an SCC root finishes, pop everything down to it from the stack — that's the SCC.

```python
def tarjan(graph):
  index = 0
  indices = {}        # discovery time per vertex
  lowlink = {}        # lowest discovery time reachable
  on_stack = set()
  stack = []
  sccs = []

  def strongconnect(v):
      nonlocal index
      indices[v] = lowlink[v] = index
      index += 1
      stack.append(v)
      on_stack.add(v)

      for u in graph[v]:
          if u not in indices:
              strongconnect(u)
              lowlink[v] = min(lowlink[v], lowlink[u])
          elif u in on_stack:
              lowlink[v] = min(lowlink[v], indices[u])

      if lowlink[v] == indices[v]:
          # v is an SCC root; pop the stack down to and including v
          component = []
          while True:
              u = stack.pop()
              on_stack.remove(u)
              component.append(u)
              if u == v:
                  break
          sccs.append(component)

  for v in graph:
      if v not in indices:
          strongconnect(v)

  return sccs
```

Time: `O(V + E)`. Space: `O(V)` (stack + bookkeeping).

### Kosaraju vs Tarjan

| | Kosaraju | Tarjan |
|---|---|---|
| Passes | 2 DFS | 1 DFS |
| Auxiliary structure | transpose graph + order | discovery times, lowlinks, stack |
| Time | `O(V + E)` | `O(V + E)` |
| Code length | ~15 lines | ~25 lines |
| Conceptual difficulty | easier (two-pass logic) | harder (lowlink invariant) |
| Output order | source SCCs first (topological order of condensation) | sink SCCs first (reverse topological order of condensation) |
| Practical speed | slower (touches edges twice) | faster (single pass) |

- **Default pick for interviews**: Kosaraju's. Easy to remember; correctness obvious. Tarjan's is faster but tricky to implement under pressure.

## Bridges and articulation points (undirected)

A **bridge** is an edge whose removal disconnects the graph. An **articulation point** (or "cut vertex") is a vertex whose removal disconnects the graph. Both are about identifying single points of failure.

Both can be found in `O(V + E)` with a single DFS pass using the **lowlink** trick from Tarjan's:

During DFS, for each tree edge `(u, v)`: it's a **bridge** iff `low[v] > disc[u]` (i.e., `v`'s subtree can't reach `u` or any ancestor of `u` without going through this edge).

A vertex `u` is an **articulation point** iff: (a) it's the root of the DFS tree and has ≥ 2 children, OR (b) it's not the root and has some child `v` with `low[v] ≥ disc[u]`.

```python
def bridges_and_aps(graph):
  disc = {}
  low = {}
  timer = 0
  bridges = []
  aps = set()

  def dfs(v, parent):
      nonlocal timer
      disc[v] = low[v] = timer
      timer += 1
      children = 0

      for u in graph[v]:
          if u not in disc:
              children += 1
              dfs(u, v)
              low[v] = min(low[v], low[u])
              if low[u] > disc[v]:
                  bridges.append((v, u))
              if parent is not None and low[u] >= disc[v]:
                  aps.add(v)
          elif u != parent:
              low[v] = min(low[v], disc[u])

      if parent is None and children > 1:
          aps.add(v)

  for v in graph:
      if v not in disc:
          dfs(v, None)

  return bridges, aps
```

This is conceptually the same machinery as Tarjan's SCC algorithm, adapted for undirected graphs.

## 🔍 Quick check (try before scrolling)

- **Q1**: Why is the condensation of a graph (collapsing each SCC into one super-vertex) always a DAG?
- Show answer to Q1
  - If the condensation had a directed cycle of SCCs `A → B → A`, then every vertex of `A` can reach every vertex of `B` (through their inter-SCC edges) and vice versa. That makes `A ∪ B` strongly connected, contradicting the fact that `A` and `B` were maximal SCCs to begin with.
- **Q2**: In Kosaraju, why do we process vertices in *reverse* post-order during pass 2?
- Show answer to Q2
  - Pass 1's post-order topologically sorts the condensation: the last-finishing vertex is in a *source* SCC of the condensation. In the transpose graph, the source-SCC vertices are reachable only within their own SCC. So starting DFS from the latest-finishing vertex (on the transpose) discovers exactly one source SCC. Processing in reverse finish order peels them off one at a time, source-most first.
- **Q3**: What's the lowlink of a vertex `v` in Tarjan's algorithm?
- Show answer to Q3
  - The smallest discovery index reachable from `v`'s DFS subtree using at most one back edge. If `low[v] == disc[v]`, then nothing in `v`'s subtree can escape upward → `v` is the root of an SCC.
- **Q4**: A graph has one vertex whose removal disconnects it into 3 pieces. Is that vertex an articulation point? A bridge?
- Show answer to Q4
  - Articulation point: yes, by definition. A "bridge" applies to edges, not vertices — so the question doesn't apply directly. The edges connecting the AP to each of the 3 pieces might or might not individually be bridges, depending on whether each piece is also reachable some other way.

---

## 💪 Practice (a separate session, not your first read)

### Worked → faded → blank: Kosaraju's

#### Worked example (read)

See the `kosaraju` implementation above.

#### Faded — fill in the blanks

Implement `condensation(graph) -> directed_graph` returning the DAG obtained by collapsing each SCC to a single super-vertex. Use Kosaraju to find SCCs first.

```python
def condensation(graph):
  sccs = kosaraju(graph)
  # Build vertex → SCC-id mapping
  scc_id = {}
  for i, comp in enumerate(sccs):
      for v in comp:
          scc_id[v] = i

  # Build the condensation DAG: an edge i → j exists iff there's an
  # edge (u, w) with u in SCC i, w in SCC j, and i != j.
  condensed = {i: set() for i in range(len(sccs))}
  for v in graph:
      for u in graph[v]:
          # FILL: add edge in condensation if and only if endpoints are in different SCCs
          ____________________
          ____________________
              ____________________
  return {i: list(neighbors) for i, neighbors in condensed.items()}
```

- Show the answer

```python

- i = scc_id[v]
- j = scc_id[u]
- if i != j:
- condensed[i].add(j)

```
- Use a `set` (not list) to avoid duplicate edges in the condensation if multiple inter-SCC edges exist between the same pair.

#### From scratch

Implement Tarjan's algorithm from a blank file. Test it on the 6-vertex example and verify the same SCCs as Kosaraju's (order may differ).

### Debug-this

```python
def kosaraju_buggy(graph):
  visited = set()
  order = []

  def dfs(v, g):
      visited.add(v)
      for u in g[v]:
          if u not in visited:
              dfs(u, g)
      order.append(v)

  for v in graph:
      if v not in visited:
          dfs(v, graph)

Predict the bug before revealing.

- Show the bug
  - **The bug**: Pass 2 should use the **transpose** graph (all edges reversed), not the original. Running pass 2 on the original graph means DFS from a source-SCC vertex can reach *everything* downstream — not just the source SCC, but all sink SCCs too. Output would be one giant component per source SCC, conflating multiple real SCCs.
  - **The fix**: build `transpose = {v: [] for v in graph}` and append `v` to `transpose[u]` for every original edge `(v, u)`. Then DFS pass 2 on the transpose.

### Teach-it-back

In ~4 sentences, without notes:

> *"Explain why Kosaraju's algorithm needs *two* DFS passes (and why a single DFS isn't enough). What's the role of the transpose graph in the second pass?"*

If you can't, re-read the "why does it work" section.

---

## 🎴 Flashcards (for daily review, not the first read)

- What's a **strongly connected component** (SCC)? #card #graphs/scc #scc
  - Maximal set of vertices in a directed graph where every pair has directed paths *both* ways.
- Two classic SCC algorithms? #card #graphs/scc #scc
  - **Kosaraju** (2× DFS) and **Tarjan** (single DFS with lowlink).
- Time complexity for both Kosaraju and Tarjan? #card #graphs/scc #kosaraju #tarjan #scc #complexity
  - `O(V + E)`.
- What's the **condensation** of a graph? #card #graphs/scc #scc
  - The DAG you get by collapsing each SCC to a single super-vertex. Always acyclic — by definition of maximality.
- Kosaraju's two passes — what does each do? #card #graphs/scc #kosaraju #scc
  - Pass 1: DFS on original graph, log finish order. Pass 2: DFS on transpose (reverse) graph, processing vertices in reverse pass-1-finish order. Each DFS in pass 2 reveals one SCC.
- Why does Kosaraju's pass 2 use the transpose? #card #graphs/scc #kosaraju #scc
  - On the transpose, a source SCC in the condensation can only reach its own vertices — outgoing edges from the SCC are now incoming. So DFS reveals exactly that SCC.
- What's **lowlink** in Tarjan's? #card #graphs/scc #dfs #tarjan #scc
  - The smallest DFS discovery index reachable from `v`'s subtree via at most one back edge. `disc[v] == low[v]` ⇔ `v` is the root of an SCC.
- What's a **bridge** in an undirected graph? #card #graphs/scc #scc
  - An edge whose removal disconnects the graph. Found in `O(V + E)` via DFS lowlink.
- What's an **articulation point** in an undirected graph? #card #graphs/scc #scc
  - A vertex whose removal disconnects the graph. Found in `O(V + E)` via DFS lowlink (with a special case for the DFS root).
- Condition for `(u, v)` to be a bridge during DFS? #card #graphs/scc #dfs #scc
  - `low[v] > disc[u]` — `v`'s subtree can't reach `u` or any ancestor without using this edge.
- {{cloze The **condensation** of a directed graph (collapsing each SCC) is always a **DAG**.}} #card #graphs/scc #scc #topo-sort
- {{cloze A graph is a single SCC if and only if you can reach every vertex from every other vertex following the edge directions.}} #card #graphs/scc #scc

---

## ✅ Self-check before moving on

Honest yes/no:

Can I explain in plain language what an SCC is, and why the condensation must be a DAG?

Can I write Kosaraju's algorithm from scratch (with the transpose graph build)?

Can I trace Kosaraju's on a small graph and predict the SCCs correctly?

Do I understand at least the *intuition* behind Tarjan's lowlink, even if I'd prefer to write Kosaraju's in an interview?

Do I know how bridges and articulation points relate to the same DFS-lowlink machinery?

If any "no", do one practice exercise. If all "yes", the entire Graphs curriculum is done — congratulations. Head back to [[Learning/DSA/Graphs]] for a sense of what you've covered, then to [[Learning/DSA/Graphs/Exercises]] to start putting it into practice.

## 🔗 Related

Up: [[Learning/DSA/Graphs]]

Prev: [[Learning/DSA/Graphs/Shortest-Paths]]

Companion: [[Learning/DSA/Graphs/Connectivity]] (undirected connectivity), [[Learning/DSA/Graphs/Traversals]] (DFS foundations)

Practice problems: [[Learning/DSA/Graphs/Exercises]]
