---
title: Basics
tags: [topic/dsa, topic/graphs, kind/concept]
lastUpdated: 2026-05-15
---
# Graphs — basics & representations

> **Convention on this page**: Answer blocks live as children of a parent "Show answer" bullet. To hide them, click the triangle on that parent once — Logseq remembers the collapsed state.

## 🎯 Why this matters

You're on a social network. You and a friend have a few hundred mutual followers, and some of those followers follow each other. Three questions immediately follow: *who's the most-connected person in this circle? Who's connected to nobody? Who's the bridge that holds two disjoint groups together?*

These are all the same type of question: a question about the **structure** of a network. A graph is the data structure that makes those questions computable. And the way we *store* the graph in code determines how fast we can answer them.

This page covers: what a graph is, the three common ways to store one, and when to pick which.

## A tiny worked example

Picture four people on a social network: Alice, Bob, Carol, Dave. They mutually follow each other in this pattern:

```
Alice ── Bob
│       │
Carol ── Dave
```

- Alice ↔ Bob (mutual follow)
- Alice ↔ Carol
- Bob ↔ Dave
- Carol ↔ Dave
  - We call Alice/Bob/Carol/Dave the **vertices** (or *nodes*) — the things. We call each mutual-follow link an **edge** — a relationship between two things. Together, vertices + edges form a **graph**.
  - Formally: a graph is a pair `(V, E)` where `V` is a set of vertices and `E ⊆ V × V` is a set of edges. That formal definition is useful later; for now the picture above is enough.

### Naming the parts as they come up

A few terms emerge naturally from this example:

- **Degree**: how many edges touch a vertex. Alice has degree 2. Every vertex in our example has degree 2.
- **Path**: a sequence of edges joining two vertices without repeating any vertex. `Alice → Bob → Dave` is a path of length 2.
- **Cycle**: a path that returns to its start. `Alice → Bob → Dave → Carol → Alice` is a cycle.
- **Undirected** (our example): edges have no direction. **Directed**: edges have a from-vertex and a to-vertex; "Alice follows Bob" doesn't imply "Bob follows Alice."
  - You'll occasionally need a few more terms — don't memorize them yet, they'll come up in context:
- **DAG** — directed graph with no cycles. Foundation for dependency resolution and topological sort.
- **Tree** — connected, undirected, no cycles. Exactly `|V| − 1` edges.
- **Forest** — a disjoint union of trees.
- **Self-loop** — an edge from a vertex to itself.
- **Multigraph** — parallel edges allowed (two distinct edges between the same pair of vertices).
- **Walk** — like a path, but vertices may repeat.

## Three ways to store a graph

How do we put this into code? Three common representations, each with different speed/space trade-offs.

### 1. Adjacency list

A map from each vertex to its list of neighbors.

```python
graph = {
  'Alice': ['Bob', 'Carol'],
  'Bob':   ['Alice', 'Dave'],
  'Carol': ['Alice', 'Dave'],
  'Dave':  ['Bob', 'Carol'],
}
```

- **Space**: `O(V + E)` — each vertex once, each edge twice (undirected) or once (directed).
- **"Are u and v connected?"**: `O(deg(u))` — scan u's neighbor list.
- **"Who are u's neighbors?"**: `O(deg(u))` — just read the list.
  - **The default choice** for most real-world graphs. Real-world graphs are usually *sparse* (`E ≪ V²`), so we don't want to pay `O(V²)` space.

### 2. Adjacency matrix

A `|V| × |V|` matrix where `M[u][v] = 1` if there's an edge between `u` and `v`, else `0`.

```python
#       Alice Bob Carol Dave
M = [
  [   0,    1,   1,    0  ],  # Alice
  [   1,    0,   0,    1  ],  # Bob
  [   1,    0,   0,    1  ],  # Carol
  [   0,    1,   1,    0  ],  # Dave
]
```

- **Space**: `O(V²)`, regardless of how many edges exist.
- **"Are u and v connected?"**: `O(1)` — just look up `M[u][v]`.
- **"Who are u's neighbors?"**: `O(V)` — scan an entire row.
  - Wins when the graph is **dense** (`E ≈ V²`) or when you need very fast edge-existence queries (e.g., the Floyd-Warshall shortest-path algorithm).

### 3. Edge list

- Just a list of `(u, v)` (or `(u, v, weight)`) tuples.

```python
edges = [
  ('Alice', 'Bob'),
  ('Alice', 'Carol'),
  ('Bob', 'Dave'),
  ('Carol', 'Dave'),
]
```

- **Space**: `O(E)`.
- **"Are u and v connected?"**: `O(E)` — scan the list.
- **"Who are u's neighbors?"**: `O(E)` — scan again.
  - Bad for traversal, but **the natural shape for Kruskal's MST algorithm**, which wants to iterate edges sorted by weight.

## Pick the right one — quick lookup

| Situation | Best representation |
|---|---|
| Sparse graph (`E` near `V`) | Adjacency list |
| Dense graph (`E` near `V²`) | Adjacency matrix |
| Need `O(1)` "does edge `(u, v)` exist?" | Adjacency matrix |
| Need to iterate edges by weight (Kruskal) | Edge list |
| Just starting out, don't know yet | Adjacency list |

## 🔍 Quick check (try before scrolling)

Two short questions to confirm the ideas above landed. Commit an answer in your head before expanding the children.

- **Q1**: A social network has 10M users; each follows ~200 others. Adjacency list or matrix? Why?
- Show answer to Q1
  - List. A matrix would be `10M × 10M = 10¹⁴` cells (infeasible). A list is `O(V + E) ≈ 2GB` (at least possible). The graph is overwhelmingly sparse: `E/V² ≈ 2×10⁻⁵`. Density is the deciding factor.
- **Q2**: Convert this edge list to an undirected adjacency list by hand: `[(1,2), (1,3), (2,4), (3,4), (4,5)]`.
- Show answer to Q2
  - `{1: [2, 3], 2: [1, 4], 3: [1, 4], 4: [2, 3, 5], 5: [4]}`. Each edge `(u, v)` becomes `u` in `v`'s list *and* `v` in `u`'s list, because undirected.
  - If both clicked, you've got the core ideas. Move to practice when you have time — it's a separate cognitive task and doesn't need to happen now.

---

## 💪 Practice (a separate session, not your first read)

These exercises are for *after* you've sat with the ideas above. Don't try to do them in the same session as your first read — that's cramming.

### Worked → faded → blank chain: `add_edge`

#### Worked example (read)

The canonical way to add an undirected edge to an adjacency list:

```python
def add_edge(graph, u, v):
  graph.setdefault(u, []).append(v)
  graph.setdefault(v, []).append(u)  # undirected → add the reverse
```

#### Faded — fill in the blanks

```python
def add_edge(graph, u, v):
  graph.setdefault(u, [])
  graph.setdefault(v, [])
  # FILL: insert the undirected edge
  ____________________
  ____________________
```

- Show the answer

```python
- graph[u].append(v)
- graph[v].append(u)
- ```
- The symmetry of those two lines *is* the undirected-ness of the graph.

#### From scratch (no scaffold)

Write `build_adjacency_list(edges: list[tuple], directed: bool) -> dict` from a blank file. Test it on `[('A','B'), ('A','C'), ('B','D'), ('C','D')]`. Trace it on paper first if the implementation isn't obvious.

### Debug-this

The implementation below tries to build an **undirected** adjacency list. There are at least two bugs. Predict before running it mentally on `[(1,2), (2,3)]`:

```python
def build(edges):
 graph = {}
 for u, v in edges:
     graph[u] = graph.get(u, []) + [v]
 return graph
```

- Show the bugs
  - **Bug 1**: Edge only added in one direction. Undirected needs both `u → v` *and* `v → u`.
  - **Bug 2**: Vertex `v` may never become a key. If `v` doesn't appear on the left side of any tuple, it's missing entirely from the output.
  - Running on `[(1,2), (2,3)]` produces `{1: [2], 2: [3]}`. Vertex 3 vanished; reverse links missing.

### Teach-it-back

Without notes, write or speak a ~3-sentence answer:

> *"You're onboarding a new dev who's never thought about graphs as a data structure. Why would we ever use an adjacency matrix when it wastes so much memory?"*

If you can't, the trade-offs table didn't land. Re-read it, then try again.

---

## 🎴 Flashcards (for daily review, not the first read)

These get surfaced automatically by Logseq's flashcard queue. **Don't drill them on your first read of this page** — cramming on the same day you encoded the material is what the spacing effect specifically warns against. They show up in your queue tomorrow; drill them then.

- What's the difference between a **path** and a **walk**? #card #graphs/basics
  - A walk may repeat vertices/edges. A path may not.
- A **DAG** is... #card #graphs/basics #topo-sort
  - A **D**irected **A**cyclic **G**raph. Required for topological sort.
- A tree on `n` vertices has how many edges? #card #graphs/basics
  - Exactly `n − 1`.
- {{cloze The number of edges touching a vertex in an undirected graph is its **degree**.}} #card #graphs/basics
- {{cloze In a directed graph, incoming edges count as **in-degree**, outgoing as **out-degree**.}} #card #graphs/basics
- Adjacency **list** space complexity? #card #graphs/basics #complexity
  - `O(V + E)`
- Adjacency **matrix** space complexity? #card #graphs/basics #complexity
  - `O(V²)` — independent of `E`.
- Best representation for a **sparse** graph? #card #graphs/basics
  - Adjacency list.
- Best representation when you need **O(1) edge-existence checks**? #card #graphs/basics #complexity
  - Adjacency matrix.
- Which representation does **Kruskal's MST** want? #card #graphs/basics #kruskal #mst
  - Edge list (so you can sort by weight).
- {{cloze Iterating all neighbors of `v` is `O(deg(v))` in an adjacency **list**, but `O(V)` in an adjacency **matrix**.}} #card #graphs/basics #complexity

---

## ✅ Self-check before moving on

Honest yes/no — no fractions:

Can I draw a 5-vertex graph and write down its adjacency list, adjacency matrix, and edge list **without looking anything up**?

Can I name which representation to pick for a given problem and justify it in one sentence?

Could I explain in plain language why adjacency list is the default choice?

If any "no", do *one* practice exercise above. If all "yes", move on to [[Learning/DSA/Graphs/Traversals]].

## 🔗 Related

- Up: [[Learning/DSA/Graphs]]
- Next: [[Learning/DSA/Graphs/Traversals]]
- Practice problems: [[Learning/DSA/Graphs/Exercises]]
