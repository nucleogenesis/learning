---
title: Traversals
tags: [learning, dsa, graphs, traversals, bfs, dfs]
lastUpdated: 2026-05-15
---
# Graph traversals — BFS & DFS

> **Convention**: Answer blocks live as children of "Show answer" parents. Click the triangle to collapse — Logseq remembers the state.

## 🎯 Why this matters

Take three problems:

- **Six degrees of Kevin Bacon**: shortest chain of co-stars between any actor and Kevin Bacon.
- **Maze solver**: find a path from entrance to exit on a grid.
- **Dependency resolver**: install package A; it needs B and C; B needs D; install everything in the right order.
  - Different problems, same atomic move: **visit every reachable vertex in a graph, in some order, without revisiting.** That's a traversal.
  - There are two ways to do it, BFS and DFS, and which you pick depends on what you want to *do* during the visit. **Most graph algorithms — shortest paths, cycle detection, connected components, topological sort, strongly-connected components — are a BFS or DFS with some extra bookkeeping.** Get these two right and most of the rest of graphs falls out.

## A tiny worked example

Same four-person social network from [[Learning/DSA/Graphs/Basics]]:

```
Alice ── Bob
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
}
```

Starting from `Alice`, we want to visit every reachable person exactly once.

### BFS — layer by layer

Imagine ripples in water. Visit Alice's *immediate* friends first (layer 1: Bob, Carol), then *their* friends (layer 2: Dave), then we're done.

The mechanism: a **FIFO queue**. Enqueue the start. Repeatedly dequeue the next vertex, visit it, and enqueue its unvisited neighbors. The FIFO discipline guarantees layer-order.

```python
from collections import deque

def bfs(graph, start):
  visited = {start}
  queue = deque([start])
  while queue:
      v = queue.popleft()
      print(v)                          # "visit" v
      for u in graph[v]:
          if u not in visited:
              visited.add(u)            # mark when *enqueueing*, not dequeueing
              queue.append(u)
```

Running this from `Alice` prints: `Alice, Bob, Carol, Dave`. Bob and Carol — layer 1 — come out before Dave — layer 2.

- **Why mark visited at enqueue time?** If you instead mark at dequeue time, multiple neighbors can enqueue the same vertex before it's dequeued, and the queue blows up to `O(E)` size on dense graphs. Mark on enqueue → queue never exceeds `O(V)`.
- **Key BFS property**: the first time BFS reaches a vertex, it's reached by the shortest path (in number of edges). That's why BFS gives shortest paths on unweighted graphs — the layer it shows up in *is* the shortest distance.

### DFS — go deep, then back up

Picture exploring a maze: walk forward as far as you can, hit a dead end, back up to the last branch, try the other direction, repeat. Visit Alice; pick a neighbor, say Bob; from Bob pick a neighbor (other than Alice), say Dave; from Dave pick a neighbor (other than Bob), which is Carol; Carol's neighbors are all visited; back up.

The mechanism: a **stack** — explicit, or implicit via recursion. Either way, the LIFO discipline gives depth-first behavior.

Recursive:

```python
def dfs(graph, start, visited=None):
  if visited is None:
      visited = set()
  visited.add(start)
  print(start)
  for u in graph[start]:
      if u not in visited:
          dfs(graph, u, visited)
```

Iterative (explicit stack):

```python
def dfs_iter(graph, start):
  visited = {start}
  stack = [start]
  while stack:
      v = stack.pop()
      print(v)
      for u in graph[v]:
          if u not in visited:
              visited.add(u)
              stack.append(u)
```

Running recursive DFS from `Alice` (neighbors in list order — Bob first): `Alice, Bob, Dave, Carol`.

- **One non-obvious thing**: recursive DFS and iterative DFS visit the same *set* of vertices, but generally in **different orders**, because a stack processes children right-to-left while recursion goes left-to-right. If you need the iterative version to match the recursive one, reverse the neighbor iteration.

### Naming the parts as they come up

- **Visit order** (sometimes "discovery order"): the order vertices first get touched.
- **Finish order** (DFS only, useful for topological sort): the order vertices *complete* their DFS subtree. In recursive DFS, finish-order is what you log when the recursive call *returns*, not when it enters.
- **Pre-order / post-order**: pre-order = log on enter, post-order = log on return. Same idea as tree traversals; DFS is the graph generalization.
- **Tree edge / back edge / forward edge / cross edge**: edge classifications based on the color of the neighbor when DFS first sees it. The important one is **back edge** — an edge to a vertex still on the recursion stack. In directed graphs, a back edge means a cycle.

## BFS vs DFS — when each wins

| | BFS | DFS |
|---|---|---|
| Data structure | FIFO queue | LIFO stack / recursion |
| Visit order | Level-by-level | Branch deep first |
| Finds shortest path (unweighted)? | ✅ yes | ❌ no |
| Detects cycle in **directed** graph? | hard | ✅ DFS with white/gray/black |
| Topological sort? | Kahn-style BFS | DFS post-order reversed |
| Connected components | either works | either works |
| SCC, bridges, articulation points | no | yes |
| Worst-case memory | `O(V)` queue (wide graphs) | `O(V)` stack (deep graphs) |
| Time | `O(V + E)` | `O(V + E)` |

- **Heuristic for picking**:
- "Shortest path on an unweighted graph?" → BFS.
- "Are there any cycles?" (directed) → DFS with colors.
- "Process X after all things X depends on are done?" → DFS post-order.
- "Distance from many sources simultaneously?" → multi-source BFS.

## 🔍 Quick check (try before scrolling)

- **Q1**: Why does BFS find the shortest path on an *unweighted* graph but get it wrong on a weighted one?
- Show answer to Q1
  - BFS's layer-by-layer invariant only holds when every edge contributes the same to distance (i.e., weight 1). On a weighted graph, a path with more *edges* can still be shorter in total weight than a path with fewer edges. Example: A→B costs 100, A→C→B costs 2. BFS reaches B in one step (via A→B) and declares distance 1, missing the cheaper 2-edge route. For weighted shortest paths you want Dijkstra (non-negative) or Bellman-Ford (negative weights allowed).
- **Q2**: In recursive DFS from `Alice` on our 4-person graph, in what order do vertices *finish* (post-order)?
- Show answer to Q2
  - Carol finishes first (no new neighbors when DFS hits her). Then Dave (Carol was his last unvisited neighbor). Then Bob (Dave was his last). Then Alice. Post-order: **Carol, Dave, Bob, Alice**. This is exactly the order a DFS-based topological sort would output in *reverse*.
- **Q3**: You have a graph where weights are only 0 or 1 (e.g., an unweighted grid plus some "free moves" for distance 0). Plain BFS or something else?
- Show answer to Q3
  - Use **0-1 BFS** with a deque: push 0-weight neighbors to the *front*, 1-weight neighbors to the *back*. Stays `O(V + E)` and gives correct shortest paths. Plain BFS gets it wrong because it can't distinguish the two edge weights. (You'd save Dijkstra for graphs with arbitrary non-negative weights.)

---

## 💪 Practice (a separate session, not your first read)

### Worked → faded → blank: BFS with distances

#### Worked example (read)

```python
def bfs_distances(graph, start):
  dist = {start: 0}
  queue = deque([start])
  while queue:
      v = queue.popleft()
      for u in graph[v]:
          if u not in dist:
              dist[u] = dist[v] + 1
              queue.append(u)
  return dist
```

Notice `dist` doubles as the visited set — `u not in dist` is the existence check.

#### Faded — fill in the blanks

`bfs_path(graph, start, goal)` returning the shortest path as a list `[start, ..., goal]`, or `None`:

```python
def bfs_path(graph, start, goal):
  parent = {start: None}
  queue = deque([start])
  while queue:
      v = queue.popleft()
      if v == goal:
          # FILL: reconstruct the path by walking parents
          ____________________
          ____________________
          return path
      for u in graph[v]:
          if u not in parent:
              # FILL: record that we reached u from v
              ____________________
              queue.append(u)
  return None
```

- Show the answer

```python

# reconstruction:

- path = []
- while v is not None:
- path.append(v)
- v = parent[v]
- return list(reversed(path))

```
- ```python
  # recording the predecessor:
  parent[u] = v
  ```

The trick is that `parent` doubles as the visited set: `u not in parent` is the existence check. Walking parents back from the goal gives you the path in reverse, then you reverse it.

#### From scratch

Write `bfs_levels(graph, start) -> dict[V, list[V]]` returning a dict from level number to the list of vertices at that level. Test on our 4-person graph from `Alice`: expected `{0: ['Alice'], 1: ['Bob', 'Carol'], 2: ['Dave']}`.

### Worked → faded → blank: DFS with directed cycle detection

#### Worked example (read)

```python
WHITE, GRAY, BLACK = 0, 1, 2

def has_cycle(graph):
  color = {v: WHITE for v in graph}

  def visit(v):
      color[v] = GRAY
      for u in graph[v]:
          if color[u] == GRAY:
              return True              # back edge → cycle
          if color[u] == WHITE and visit(u):
              return True
      color[v] = BLACK
      return False

  return any(color[v] == WHITE and visit(v) for v in graph)
```

The three colors track DFS state: WHITE = untouched, GRAY = currently on the recursion stack, BLACK = fully explored. A neighbor that's still GRAY when we look at it is an ancestor in the DFS tree — i.e., a back edge — i.e., a cycle.

#### Faded — fill in the blanks

Adapt the algorithm to also **return one of the cycles** (a list of vertices forming a directed cycle), not just a yes/no:

```python
def find_cycle(graph):
  color = {v: WHITE for v in graph}
  parent = {}

  def visit(v):
      color[v] = GRAY
      for u in graph[v]:
          if color[u] == GRAY:
              # FILL: reconstruct the cycle from u back to v, then forward to u
              ____________________
              ____________________
              return cycle
          if color[u] == WHITE:
              parent[u] = v
              result = visit(u)
              if result is not None:
                  return result
      color[v] = BLACK
      return None

  for v in graph:
      if color[v] == WHITE:
          result = visit(v)
          if result is not None:
              return result
  return None
```

- Show the answer

```python

- cycle = [u]
- cur = v
- while cur != u:
- cycle.append(cur)
- cur = parent[cur]
- cycle.append(u)
- return list(reversed(cycle))

```
- When you see a back edge `v → u` where `u` is GRAY (on the stack), the cycle is `u → ... → v → u`. Walk parents back from `v` to `u`, then close the loop with `u`. Reverse for the natural direction.

#### From scratch

Implement `dfs_postorder(graph, start) -> list[V]` — vertices in DFS finish order. This is the building block of topological sort.

### Debug-this

Three plausible-looking but buggy snippets. **Predict the failure mode before revealing.**

#### A) BFS that "marks on dequeue"

```python
def bfs_buggy(graph, start):
  queue = deque([start])
  visited = set()
  while queue:
      v = queue.popleft()
      if v in visited:
          continue
      visited.add(v)
      for u in graph[v]:
          queue.append(u)
```

- Show the bug
  - It still produces the correct visit set, but the queue grows to `O(E)` instead of `O(V)`. On a dense graph (`E ≈ V²`) the same vertex can be enqueued by every neighbor before it's dequeued, so memory blows up. **The fix**: mark visited at enqueue time, not dequeue time. Then no vertex is ever enqueued twice.

#### B) Recursive DFS with no visited set, on a graph with a cycle

```python
def dfs(graph, start):
  for u in graph[start]:
      dfs(graph, u)
```

- Show the bug
  - Infinite recursion on any graph that has a cycle. With `{'A': ['B'], 'B': ['A']}`, DFS bounces A→B→A→B→... until the stack overflows. Always carry a visited set.

#### C) Undirected cycle detection using WHITE/GRAY/BLACK

```python
def has_cycle_undirected(graph):
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

- Show the bug
  - Reports a false cycle on any non-trivial undirected graph. Reason: every undirected edge appears in both directions in the adjacency list. When DFS goes A→B, looking at B's neighbors it sees A, which is GRAY (still on the stack), and falsely declares a back edge. **Fix**: pass the parent vertex and skip it: `visit(u, parent=v)` and ignore `u == parent` when checking GRAY neighbors. Or just use **Union-Find** for undirected cycle detection — it's simpler.

### Teach-it-back

Without notes, answer in ~4 sentences:

> *"Why does BFS find shortest paths on unweighted graphs but not on weighted graphs? Construct a counterexample — a tiny weighted graph where BFS gives the wrong answer — and explain what algorithm you'd use instead."*

If you can't construct the counterexample, the BFS invariant ("first arrival is shortest") hasn't fully clicked. Re-read the BFS section, then try again.

---

## 🎴 Flashcards (for daily review, not the first read)

- BFS time complexity? #card
  - `O(V + E)`.
- DFS time complexity? #card
  - `O(V + E)`.
- BFS data structure? #card
  - FIFO queue.
- DFS data structure? #card
  - LIFO stack (explicit, or implicit via recursion).
- When does BFS find the shortest path? #card
  - Unweighted (or uniformly-weighted) graphs. First arrival = shortest distance.
- Why mark visited at **enqueue** time in BFS, not dequeue time? #card
  - To prevent the same vertex being enqueued multiple times by different neighbors. Without this, queue size grows to `O(E)` instead of `O(V)`.
- {{cloze BFS uses a **FIFO queue**; DFS uses a **LIFO stack**.}} #card
- What is a **back edge** in DFS? #card
  - An edge to a vertex currently on the recursion stack (GRAY). In a directed graph, a back edge means a cycle.
- In directed cycle detection, what do WHITE/GRAY/BLACK mean? #card
  - WHITE = unvisited. GRAY = currently being explored (on recursion stack). BLACK = fully explored. Seeing a GRAY neighbor = back edge = cycle.
- Why doesn't WHITE/GRAY/BLACK work directly for undirected cycle detection? #card
  - Every undirected edge appears in both directions, so the parent always looks like a GRAY neighbor. Fix: skip the parent vertex explicitly, or use Union-Find instead.
- What's **multi-source BFS** good for? #card
  - "Distance to the nearest X." Seed the queue with all Xs at distance 0; BFS spreads outward simultaneously from all of them.
- How does DFS-based topological sort produce the order? #card
  - Run DFS over all vertices, push each onto a stack when it *finishes* (post-order). Pop the stack at the end — that's the topological order.
- {{cloze Recursive DFS and iterative DFS visit the same vertices, but in **different** orders because a stack reverses neighbor processing.}} #card

---

## ✅ Self-check before moving on

Honest yes/no:

Can I write BFS from scratch (without notes) and explain why "mark visited at enqueue" matters?

Can I write recursive DFS *and* iterative DFS, and explain when their visit orders differ?

Can I explain the white/gray/black trick and what a back edge is?

Can I name three problems that reduce to BFS/DFS with extra bookkeeping?

If any "no", do one practice exercise. If all "yes", move on to [[Learning/DSA/Graphs/Connectivity]].

## 🔗 Related

- Up: [[Learning/DSA/Graphs]]
- Prev: [[Learning/DSA/Graphs/Basics]]
- Next: [[Learning/DSA/Graphs/Connectivity]]
- Practice problems: [[Learning/DSA/Graphs/Exercises]]
