---
title: Traversals
tags: [learning, dsa, graphs, traversals, bfs, dfs]
lastUpdated: 2026-05-14
---

# Graph traversals — BFS & DFS

The two atomic patterns. **Most graph algorithms are a BFS or DFS with extra bookkeeping.**

## Session warm-up (retrieval check-in)

Without scrolling, jot:

- BFS uses a ___ data structure; DFS uses a ___ data structure.
- Time complexity of plain BFS or DFS on a graph with `V` vertices and `E` edges?
- One algorithm you'd build *on top of* BFS or DFS in upcoming subtopics?

Wrote something? Now read on.

## Predict-first

**Before** seeing any pseudocode:

> *Suppose you have a maze represented as a graph. Each cell is a vertex; walls remove edges. You want the shortest path (fewest cells) from start to goal. Would you use BFS or DFS? Why?*

Predict. (BFS, because layer-by-layer exploration guarantees first arrival is shortest in an unweighted graph — but commit your answer first.)

## Cheat-sheet table

| | BFS | DFS |
|---|---|---|
| Data structure | FIFO queue | LIFO stack / recursion |
| Discovery order | Level-by-level | Branch deep first |
| Finds shortest path (unweighted)? | ✅ yes | ❌ no |
| Detects cycle in directed graph? | hard | ✅ natural (with colors) |
| Topological sort? | Kahn-style | post-order reverse |
| SCC, bridges, articulation? | no | yes |
| Memory (worst-case) | `O(V)` queue (wide graphs) | `O(V)` stack (deep graphs) |
| Time | `O(V + E)` | `O(V + E)` |

## BFS — breadth-first search

### Worked example (read)

```python
from collections import deque

def bfs(graph, start):
  visited = {start}
  queue = deque([start])
  order = []
  while queue:
      v = queue.popleft()
      order.append(v)
      for u in graph[v]:
          if u not in visited:
              visited.add(u)
              queue.append(u)
  return order
```

**Key invariant**: a vertex is marked visited the moment it's *enqueued*, not when popped. Otherwise the same vertex gets enqueued multiple times → wrong complexity.

### Faded — fill in the blanks

BFS that returns the **shortest-distance dict** from `start` to every reachable vertex:

```python
from collections import deque

def bfs_distances(graph, start):
  dist = {start: 0}
  queue = deque([start])
  while queue:
      v = queue.popleft()
      for u in graph[v]:
          if u not in dist:
              # FILL: set u's distance based on v's distance
              ____________________
              # FILL: enqueue u for later exploration
              ____________________
  return dist
```

(Take a guess before scrolling for the answer.)

<details><summary>Reveal</summary>

```python
dist[u] = dist[v] + 1
queue.append(u)
```

The dist dict doubles as the visited set — `u not in dist` is the existence check.

</details>

### From-scratch — no scaffold

Write `bfs_path(graph, start, goal)` that returns a list `[start, ..., goal]` giving the shortest path, or `None` if unreachable. Hint: store `parent[u] = v` when you first discover `u`, then reconstruct by walking parents back from goal.

### Trace-the-path

Graph (undirected adjacency list):

```
A: [B, C]
B: [A, D, E]
C: [A, F]
D: [B]
E: [B, F]
F: [C, E]
```

Run BFS from `A`. **Predict the order before scrolling.** What's in the queue at each step?

<details><summary>Reveal</summary>

```
Step 0: visited={A},          queue=[A]
Pop A. Neighbors B, C → enqueue both.
Step 1: visited={A,B,C},      queue=[B,C]
Pop B. Neighbors D, E → enqueue both (A already visited).
Step 2: visited={A,B,C,D,E},  queue=[C,D,E]
Pop C. Neighbor F → enqueue (A already visited).
Step 3: visited={A,B,C,D,E,F},queue=[D,E,F]
Pop D, E, F (no new neighbors).
Order: A, B, C, D, E, F
```

The crucial property: F is discovered at distance 2 via C (which has distance 1). Anything BFS reaches in step `k` has shortest distance `k`.

</details>

### Variants

- **0-1 BFS**: weights are only 0 or 1 → use a deque, push 0-edges to front. `O(V + E)`.
- **Multi-source BFS**: seed the queue with multiple starts at distance 0 (e.g. "nearest 0" type problems).
- **Bidirectional BFS**: search from start and goal simultaneously → much faster on huge graphs.

### Flashcards — BFS

- BFS time complexity? #card
  - `O(V + E)`
- Why mark visited at **enqueue** time, not dequeue time? #card
  - To prevent the same vertex from being added to the queue multiple times by different neighbors before it's dequeued. Otherwise complexity degrades.
- When does BFS find the shortest path? #card
  - On **unweighted** (or uniformly-weighted) graphs. The first time a vertex is reached, that's the minimum edge count.
- {{cloze BFS uses a **FIFO queue**; DFS uses a **LIFO stack**.}} #card
- What problem class is **multi-source BFS** ideal for? #card
  - "Distance to the nearest X" — seed the queue with all Xs at distance 0 and let BFS spread.

## DFS — depth-first search

### Worked example: recursive

```python
def dfs(graph, start, visited=None):
  if visited is None:
      visited = set()
  visited.add(start)
  order = [start]
  for u in graph[start]:
      if u not in visited:
          order.extend(dfs(graph, u, visited))
  return order
```

### Worked example: iterative (explicit stack)

```python
def dfs_iter(graph, start):
  visited = {start}
  stack = [start]
  order = []
  while stack:
      v = stack.pop()
      order.append(v)
      for u in graph[v]:
          if u not in visited:
              visited.add(u)
              stack.append(u)
  return order
```

**Heads up**: iterative DFS that "marks on push" gives the same visited *set* but a different *order* — recursive explores children left-to-right, iterative pops them right-to-left because of the stack. Reverse the neighbor iteration if you need to match.

### Faded — fill in the blanks

DFS with white-gray-black coloring for **directed cycle detection**:

```python
WHITE, GRAY, BLACK = 0, 1, 2

def has_cycle(graph):
  color = {v: WHITE for v in graph}

  def visit(v):
      color[v] = GRAY
      for u in graph[v]:
          if color[u] == GRAY:
              # FILL: what does seeing a GRAY neighbor mean?
              return ____
          if color[u] == WHITE and visit(u):
              return True
      # FILL: mark v's color now that we're done with it
      ____________________
      return False

  return any(color[v] == WHITE and visit(v) for v in graph)
```

<details><summary>Reveal</summary>

```python
return True            # GRAY means back-edge → cycle
color[v] = BLACK       # done exploring v's subtree
```

</details>

### From-scratch

Implement `dfs_postorder(graph, start)` returning vertices in DFS post-order (the order they *finish*, not the order they're discovered). This is the building block for topological sort.

### Trace-the-path

Same graph as the BFS trace. Run **recursive** DFS from `A`, iterating neighbors in alphabetical order. **Predict the visit order before checking.**

<details><summary>Reveal</summary>

`A → B → D → (back to B) → E → F → (back to E, B, A) → C → (C's neighbors A, F both visited)`

Visit order: **A, B, D, E, F, C**

Notice how DFS dives deep along the A→B→D branch before backtracking, whereas BFS swept level-by-level.

</details>

### Edge classifications (during DFS)

- **Tree edge**: edge to a WHITE vertex.
- **Back edge**: edge to a GRAY vertex (ancestor in DFS tree). Indicates cycle in directed graph; in undirected, ignore the immediate parent.
- **Forward edge**: edge to a BLACK descendant (directed only).
- **Cross edge**: edge to a BLACK vertex that is not a descendant (directed only).

### Flashcards — DFS

- DFS time complexity? #card
  - `O(V + E)`
- DFS space complexity in the worst case? #card
  - `O(V)` — recursion depth (or explicit stack size) can grow to the longest path.
- In **directed** cycle detection, the key DFS state is... #card
  - Three colors: WHITE (unvisited), GRAY (on current recursion stack), BLACK (fully explored). A GRAY neighbor means a back edge → cycle.
- Why is **immediate-parent** ignored when detecting cycles in **undirected** DFS? #card
  - Every undirected edge appears in both directions; revisiting the parent isn't a true back edge.
- {{cloze A **back edge** during DFS is an edge to a vertex currently in the recursion stack (GRAY).}} #card
- Edge type from a BLACK descendant (only meaningful in directed DFS)? #card
  - **Forward edge**.
- {{cloze Recursive DFS and stack-based iterative DFS visit the same set of vertices, but produce **different** visit orders because the stack reverses neighbor processing.}} #card

## Debug-this

Each snippet below tries to do something specific. Predict the bug *before* revealing.

### A) BFS that "marks on dequeue"

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

What's wrong, and what real-world consequence does it have?

<details><summary>Reveal</summary>

It still works correctly (visits each vertex once), but the queue can grow to `O(E)` instead of `O(V)` because the same vertex can be enqueued from many neighbors before it's dequeued. On dense graphs that's a real memory blowup. The fix: mark visited at enqueue time so we never enqueue the same vertex twice.

</details>

### B) Recursive DFS on a graph with cycles

```python
def dfs(graph, start):
  for u in graph[start]:
      dfs(graph, u)
```

What happens on `graph = {'A': ['B'], 'B': ['A']}`?

<details><summary>Reveal</summary>

Infinite recursion — there's no `visited` set, and a cycle sends DFS back and forth between A and B until the stack overflows.

</details>

### C) Undirected cycle detection using GRAY/BLACK

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

Why does this **falsely report a cycle** on `{'A': ['B'], 'B': ['A']}`?

<details><summary>Reveal</summary>

In an undirected graph every edge appears in both directions in the adjacency list. When DFS goes A→B, the recursive call sees A in B's neighbor list and A is still GRAY (in the recursion stack), so it reports a cycle. For undirected graphs you must pass the *parent* and skip it: `visit(u, parent=v)` and `if u != parent and color[u] == GRAY: return True`. Or just use **Union-Find** for undirected cycle detection — it's simpler.

</details>

## Trace + predict-first combo (interleaving)

Same graph, three questions — mix BFS and DFS reasoning. Answer each before scrolling.

Graph:

```
1: [2, 3]
2: [1, 4]
3: [1, 4]
4: [2, 3, 5]
5: [4]
```

1. What's the BFS distance from 1 to 5?
2. In recursive DFS from 1 (neighbors in numeric order), in what order are vertices *first discovered*?
3. In the same DFS, in what order are vertices *finished* (post-order)?

<details><summary>Reveal</summary>

1. `2` (1 → 2 or 3 → 4 → 5 is length 3; wait, no: BFS distance is edge count, 1→2 is 1, 1→2→4 is 2, 1→2→4→5 is 3). Actually the answer is **3**. Slow down here — BFS distance equals shortest *number of edges*, not number of vertices visited.
2. Discovery order: `1, 2, 4, 3 (back from 4 to 3? no — 3 is a neighbor of 4, so from 4 we go to 3, which is WHITE), 5`. Wait — when DFS is at 4, neighbors in numeric order are [2, 3, 5]. 2 is already visited, so we recurse into 3. From 3 neighbors are [1, 4] — both visited. Return to 4, then recurse into 5. Final: **1, 2, 4, 3, 5**.
3. Post-order (finish order): 3 finishes first (no new neighbors), then 5, then 4, then 2, then 1. Result: **3, 5, 4, 2, 1**.

If you got #2 or #3 wrong, that's exactly the kind of subtle ordering that bites you in topological sort. Worth tracing on paper.

</details>

## Teach-it-back

Without notes, write a 4–5 sentence explanation of:

> *"Why does BFS find shortest paths on unweighted graphs but not weighted graphs? Give an example of a weighted graph where BFS would get the wrong answer."*

If you can't construct the counterexample, that's a signal that the BFS invariant ("first arrival is shortest") hasn't fully clicked.

## Metacognition checkpoint

- I can write BFS from scratch without looking: __ / 5
- I can write recursive DFS *and* iterative DFS without looking: __ / 5
- I understand why iterative DFS can produce a different order than recursive: __ / 5
- I can explain the white-gray-black trick well enough to debug a cycle-detection bug: __ / 5

One thing to revisit next session: ______

## Related

- Up: [[Learning/DSA/Graphs]]
- Prev: [[Learning/DSA/Graphs/Basics]]
- Next: [[Learning/DSA/Graphs/Connectivity]]
- Exercises: [[Learning/DSA/Graphs/Exercises]]
