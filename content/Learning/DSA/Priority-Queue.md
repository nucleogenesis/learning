---
title: Priority-Queue
tags: [topic/dsa, topic/data-structures, kind/prereq]
lastUpdated: 2026-05-15
---
# Priority queue (binary heap)

> Convention: Answer blocks are children of "Show answer" parents. Click the triangle to collapse — Logseq remembers.

## 🎯 Why this matters

Three problems, same shape:

- **Task scheduler**: among all the tasks waiting to run, pick the *highest-priority* one next.
- **Dijkstra's shortest path**: among all the frontier vertices, expand the *closest-to-source* one next.

**A* pathfinding**: pick the *most-promising* next state to explore.

Each problem repeatedly asks "what's the smallest/largest item in this collection?" while also adding new items. A sorted list answers the first question in `O(1)` but takes `O(n)` to add. A plain list takes `O(1)` to add but `O(n)` to find the min. A **priority queue** does both in `O(log n)`.

The most common implementation is a **binary heap**, which packs the queue into a flat array and exploits index arithmetic to navigate a tree without any pointers. Most language standard libraries ship one (`heapq` in Python, `std::priority_queue` in C++, `PriorityQueue` in Java). You'll usually use the built-in; this page is so you understand what's happening behind the curtain.

## A tiny worked example

A min-heap (smallest at the top) holding the values `[3, 1, 4, 1, 5, 9, 2, 6]` after they're added one by one.

The heap *as a tree*:

```
         1
       /   \
      1     2
     / \   / \
    3   5 9   4
   /
  6
```

The heap *as an array* (Python's `heapq` style — the array is the heap; no separate tree object):

```
index:    0  1  2  3  4  5  6  7
value:  [ 1, 1, 2, 3, 5, 9, 4, 6 ]
```

Index arithmetic:

Parent of index `i`: `(i - 1) // 2`

Left child of `i`: `2*i + 1`

Right child of `i`: `2*i + 2`

So the parent of index 7 (value 6) is `(7-1)//2 = 3` (value 3). The left child of index 1 (value 1) is `2*1 + 1 = 3` (value 3). Matches the tree above.

- **The heap invariant**: every parent is ≤ both its children (for a min-heap). The smallest element is always at index 0. The tree shape is a *complete binary tree* — every level full except possibly the last, which fills left-to-right.
- **Naming the parts**:
- **Push** (or "insert"): add a new element.
- **Pop** (or "extract-min"/"extract-max"): remove and return the smallest (or largest).
- **Peek**: look at the smallest without removing.
- **Sift up** / **bubble up**: after a push, swap the new element with its parent while the heap invariant is violated.
- **Sift down** / **trickle down**: after a pop, swap the root with its smaller child while the invariant is violated.

## The operations

### Push — sift up

Append the new element to the end of the array (preserving complete-tree shape), then sift it upward while it's smaller than its parent.

```python
def push(heap, value):
    heap.append(value)
    i = len(heap) - 1
    while i > 0:
        parent = (i - 1) // 2
        if heap[parent] <= heap[i]:
            break
        heap[i], heap[parent] = heap[parent], heap[i]
        i = parent
```

Time: `O(log n)` — the tree has height ⌈log₂ n⌉ and we walk at most that far.

### Pop — sift down

Save the root (the min), move the last element to the root, shrink the array by 1, then sift the new root downward by repeatedly swapping with its smaller child until the invariant holds.

```python
def pop(heap):
    if not heap:
        raise IndexError("pop from empty heap")
    smallest = heap[0]
    last = heap.pop()
    if heap:
        heap[0] = last
        i = 0
        n = len(heap)
        while True:
            left = 2*i + 1
            right = 2*i + 2
            smallest_idx = i
            if left < n and heap[left] < heap[smallest_idx]:
                smallest_idx = left
            if right < n and heap[right] < heap[smallest_idx]:
                smallest_idx = right
            if smallest_idx == i:
                break
            heap[i], heap[smallest_idx] = heap[smallest_idx], heap[i]
            i = smallest_idx
    return smallest
```

Time: `O(log n)`.

### Peek

```python
def peek(heap):
    return heap[0]
```

Time: `O(1)`.

### Build heap from list — heapify

Given an arbitrary list, you could call `push` n times for `O(n log n)` total. But there's a smarter way: start sift-down from the middle of the array (the last non-leaf node) and work backward to index 0. Total cost: `O(n)`, not `O(n log n)`. (The math is non-obvious but real — most of the nodes are near the bottom, where sift-down only travels a short distance.)

```python
def heapify(arr):
    n = len(arr)
    for i in range(n // 2 - 1, -1, -1):
        sift_down(arr, i, n)        # same logic as inside pop()
```

`heapq.heapify(list)` in Python's standard library does exactly this.

## Use case: Dijkstra's relaxation

The reason priority queues come up so often in graphs:

```python
import heapq

def dijkstra(graph, source):
    dist = {v: float('inf') for v in graph}
    dist[source] = 0
    heap = [(0, source)]      # (distance, vertex)
    while heap:
        d, v = heapq.heappop(heap)
        if d > dist[v]:
            continue          # stale entry; skip
        for u, weight in graph[v]:
            new_dist = d + weight
            if new_dist < dist[u]:
                dist[u] = new_dist
                heapq.heappush(heap, (new_dist, u))
    return dist
```

The heap holds `(tentative_distance, vertex)` tuples. We always expand the vertex with the smallest tentative distance — and the heap delivers that in `O(log n)`. See [[Learning/DSA/Graphs/Shortest-Paths]] for the full treatment.

### "Lazy deletion" — the stale entry trick

A plain binary heap doesn't support efficient `decrease_key` (updating an existing element's priority). The standard workaround: just push a new entry with the better priority, and ignore stale entries when they pop out. That's why the snippet above has the `if d > dist[v]: continue` check. The heap grows to `O(E)` instead of `O(V)`, but that's fine — performance stays `O((V + E) log V)`.

For truly efficient `decrease_key` you'd use a more sophisticated data structure: indexed binary heaps, Fibonacci heaps, or pairing heaps. In practice the lazy-deletion trick is almost always fast enough.

## 🔍 Quick check (try before scrolling)

- **Q1**: Insert `5` into the heap `[1, 1, 2, 3]`. Show each sift-up swap.
- Show answer to Q1
  - Append 5 → `[1, 1, 2, 3, 5]`. New element is at index 4. Parent is at index `(4-1)//2 = 1`, value 1. Since `1 <= 5`, the heap invariant already holds. No swaps needed. Final heap: `[1, 1, 2, 3, 5]`.
- **Q2**: Pop the min from heap `[1, 3, 2, 7, 5, 4]`. Show each sift-down swap.
- Show answer to Q2
  - Save min = 1. Move last element (4) to root → `[4, 3, 2, 7, 5]`. Sift down: at index 0, children are indices 1 (val 3) and 2 (val 2). Smaller child is 2. Swap → `[2, 3, 4, 7, 5]`. Continue from index 2: children are 5 and 6, both out of bounds. Done. Returns 1. Final heap: `[2, 3, 4, 7, 5]`.
- **Q3**: Why is `heapify` `O(n)` but inserting elements one at a time is `O(n log n)`?
- Show answer to Q3
  - The bulk of nodes are near the bottom of the tree, where sift-down has very little distance to travel. The summation `Σ (height × number of nodes at that height)` telescopes to `O(n)`. With one-at-a-time inserts, each element might sift all the way up to the root, so you pay `O(log k)` for the k-th insert, totaling `O(n log n)`.
- **Q4**: Python's `heapq` only does min-heaps. How do you implement a max-heap?
- Show answer to Q4
  - Negate the priority: push `-value` instead of `value`, and negate when reading. Or use tuples like `(-priority, item)` so `heapq` orders by the negated priority. Same `O(log n)` complexity, slightly hacky but standard.

---

## 💪 Practice (a separate session, not your first read)

### Worked → faded → blank: min-heap from scratch

#### Worked example (read)

See the `push`/`pop` code above.

#### Faded — fill in the blanks

Implement `heap_top_k(arr, k) -> list`: given an unsorted array and an integer `k`, return the `k` smallest elements (in any order) in `O(n log k)` time.

```python
import heapq

def heap_top_k(arr, k):
    # Use a MAX-heap of size k. When we see something smaller than the max,
    # swap them in. At the end, the heap contains the k smallest elements.
    heap = []
    for x in arr:
        if len(heap) < k:
            # FILL: push x as a "max-heap" entry
            ____________________
        else:
            # heap is full; if x is smaller than the current largest, replace
            if -x > heap[0]:
                # FILL: replace the largest with x
                ____________________
    return [-y for y in heap]    # un-negate
```

- Show the answer

```python

heapq.heappush(heap, -x)

```
  - ```python
    heapq.heapreplace(heap, -x)
    ```

We use `-x` to simulate a max-heap with Python's min-heap. `heapreplace` is pop-then-push in one operation, slightly cheaper than the two separate calls.

#### From scratch

Implement `merge_k_sorted_lists(lists)` — given a list of already-sorted lists, return a single merged sorted list. Use a min-heap of `(value, list_index, element_index)` tuples. Time: `O(n log k)` where n is total elements and k is the number of lists.

### Debug-this

```python
class BrokenMinHeap:
    def __init__(self):
        self.heap = []

    def push(self, value):
        self.heap.append(value)
        i = len(self.heap) - 1
        while i > 0:
            parent = i // 2          # ← suspicious
            if self.heap[parent] <= self.heap[i]:
                break
            self.heap[i], self.heap[parent] = self.heap[parent], self.heap[i]
            i = parent

    def pop(self):
        return self.heap.pop(0)      # ← suspicious
```

Two issues. Predict before revealing.

- Show the bugs
  - **Bug 1**: `parent = i // 2` is wrong — the correct formula is `(i - 1) // 2`. With `i = 1`, the buggy formula gives parent = 0 (correct), but with `i = 2`, parent = 1 (wrong — should be 0). The heap structure gets corrupted on most insertions.
  - **Bug 2**: `pop` uses `self.heap.pop(0)` — this removes from index 0 but shifts every other element down by one, taking `O(n)` and destroying the heap structure. The correct approach is the sift-down dance: save root, move last to root, shrink, sift down.

### Teach-it-back

In ~3 sentences, without notes:

> *"What's the heap invariant? When you pop the min from a heap, why do we move the *last* element to the root and sift down, rather than promoting one of the root's children directly?"*

If you can't, re-read the pop section.

---

## 🎴 Flashcards (for daily review, not the first read)

- Heap invariant (min-heap)? #card #dsa/priority-queue #heap
  - Every parent is ≤ both its children. The minimum is always at index 0.
- Push complexity? #card #dsa/priority-queue #complexity
  - `O(log n)` — sift up walks at most the tree height.
- Pop (extract-min) complexity? #card #dsa/priority-queue #complexity
  - `O(log n)` — sift down walks at most the tree height.
- Peek complexity? #card #dsa/priority-queue #complexity
  - `O(1)` — just read index 0.
- Heapify complexity (build heap from arbitrary array)? #card #dsa/priority-queue #heap #complexity
  - `O(n)` — start sift-down from the middle and work backward. Cheaper than `O(n log n)` because most nodes are near the bottom and have little room to sink.
- Parent of index `i` (zero-indexed)? #card #dsa/priority-queue
  - `(i - 1) // 2`
- Children of index `i` (zero-indexed)? #card #dsa/priority-queue
  - Left: `2*i + 1`. Right: `2*i + 2`.
- How to simulate a max-heap with a min-heap (Python)? #card #dsa/priority-queue #heap
  - Negate the priorities: push `-x`, un-negate when reading.
- Why is heap shape a "complete binary tree"? #card #dsa/priority-queue #binary-tree #heap
  - Every level fully filled except possibly the last, which fills left-to-right. This guarantees the array packing has no gaps; index arithmetic always lands on real nodes.
- Standard trick for handling stale entries (since binary heap has no efficient decrease-key)? #card #dsa/priority-queue #heap
  - Lazy deletion: push the new better priority, leave the old entry in the heap. Skip it when it pops out if the cached value is now better. Adds `O(E)` extra entries in Dijkstra — still fast overall.
- {{cloze The smallest element of a min-heap is always at array index **0**.}} #card #dsa/priority-queue #heap

---

## ✅ Self-check before moving on

Honest yes/no:

Can I write `push` and `pop` (with sift-up / sift-down) from scratch?

Can I work out the parent and child index formulas without looking?

Can I explain why heapify is `O(n)` while one-at-a-time inserts are `O(n log n)`?

Do I know the lazy-deletion trick for handling Dijkstra-style "decrease-key" without an indexed heap?

If any "no", do one practice exercise. If all "yes", move on to [[Learning/DSA/Graphs/Shortest-Paths]] (the first algorithm that really *needs* a priority queue).

## 🔗 Related

Up: [[Learning/DSA]]

Used by: [[Learning/DSA/Graphs/Shortest-Paths]] (Dijkstra), [[Learning/DSA/Graphs/MST]] (Prim)

Practice problems: [[Learning/DSA/Graphs/Exercises]]
