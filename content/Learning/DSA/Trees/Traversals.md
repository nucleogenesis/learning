---
title: Traversals
tags: [learning, dsa, trees, traversals]
lastUpdated: 2026-05-15
---
# Tree traversals — DFS orders, level-order, Morris

> **Convention on this page**: Answer blocks live as children of "Show answer" parents. Click the triangle to collapse — Logseq remembers the state.

## 🎯 Why this matters

Three problems, all "visit every node in this tree, but in a particular order":

- **Pretty-print a directory tree.** The output `Journal/ → pages/ → README.md` has a clear order: parents print before their children. That's a **pre-order** traversal.

**Evaluate `(3 + 4) * 5` from its parse tree.** You need to evaluate `3 + 4` *before* you can multiply by 5 — children before parents. That's a **post-order** traversal.

- **Read the keys of a BST in sorted order.** The BST property guarantees that visiting `left, root, right` gives ascending order. That's an **in-order** traversal.
  - Three different orderings, three different problems, but exactly the same DFS skeleton with one line moved. That's the punchline of this page: tree traversals are just specializations of the graph DFS you already know from [[Learning/DSA/Graphs/Traversals]], with the cycle-detection bookkeeping turned off (trees have no cycles) and a tiny decision about *when* during the visit to do your work.
  - We'll also cover **level-order** (BFS on a tree) and **Morris traversal** — a beautiful O(1)-extra-space trick that's worth knowing exists.

## A tiny worked example

A 7-node binary tree:

```
            F
           / \
          B   G
         / \   \
        A   D   I
           / \  /
          C   E H
```

In adjacency form (linked nodes):

```python
class Node:
    def __init__(self, value, left=None, right=None):
        self.value = value
        self.left = left
        self.right = right

c = Node('C'); e = Node('E')
d = Node('D', left=c, right=e)
a = Node('A')
b = Node('B', left=a, right=d)
h = Node('H')
i = Node('I', left=h)
g = Node('G', right=i)
root = Node('F', left=b, right=g)
```

We'll traverse this tree four different ways. Each traversal visits all 7 nodes; the only thing that changes is the **order**.

### Pre-order — root, left, right

Pre-order means: at each node, do the work *first*, then recurse left, then recurse right.

```python
def preorder(node):
    if node is None:
        return
    print(node.value)        # "visit" — happens BEFORE recursing
    preorder(node.left)
    preorder(node.right)
```

Running this from `F`: `F, B, A, D, C, E, G, I, H`.

The mnemonic: **root, left, right** = N, L, R = "**N**LR" = **Pre**order (N first).

Where you'd use it: serializing a tree to a flat list you can later reconstruct, pretty-printing a directory tree (folder name first, then its contents), generating prefix notation `+ 3 4`.

### In-order — left, root, right

In-order means: recurse left first, *then* do the work at this node, then recurse right.

```python
def inorder(node):
    if node is None:
        return
    inorder(node.left)
    print(node.value)        # "visit" — happens BETWEEN the two recursions
    inorder(node.right)
```

Running this from `F`: `A, B, C, D, E, F, G, H, I`. (Notice anything? They came out in alphabetical order. That's not coincidence — see below.)

The mnemonic: **left, root, right** = LNR = **In**order (N in the middle).

- **The killer property**: in-order traversal of a **BST** visits keys in **sorted order**. That's why our tree above prints A through I — I rigged it to be a valid BST. Use this on any BST you doubt: in-order, check that the output is sorted, and you've validated it. See [[Learning/DSA/Trees/Binary-Search-Trees]].

In-order has no natural meaning for non-binary trees — "between left and right" only makes sense when there are exactly two children. For n-ary trees, pre-order and post-order generalize cleanly, in-order doesn't.

### Post-order — left, right, root

Post-order means: recurse left, recurse right, *then* do the work.

```python
def postorder(node):
    if node is None:
        return
    postorder(node.left)
    postorder(node.right)
    print(node.value)        # "visit" — happens AFTER both recursions
```

Running this from `F`: `A, C, E, D, B, H, I, G, F`.

The mnemonic: **left, right, root** = LRN = **Post**order (N last).

Where you'd use it: anything where children must be processed before their parent. Evaluating an expression tree (compute subtrees, then combine). Computing the size or height of every subtree (you need the children's answers first). `rm -rf` (must delete contents before deleting the directory). Freeing memory in a linked tree. Topological sort via DFS, which you've already met in [[Learning/DSA/Graphs/Traversals]] — that's a generalized post-order on a DAG.

### Comparison — three traversals, same tree

| Traversal | Recipe | Output on our tree |
|---|---|---|
| **Pre-order** | root → left → right | F, B, A, D, C, E, G, I, H |
| **In-order** | left → root → right | A, B, C, D, E, F, G, H, I |
| **Post-order** | left → right → root | A, C, E, D, B, H, I, G, F |

Notice every traversal visits all 9 nodes (wait — I miscounted, let me recount the tree: F, B, A, D, C, E, G, I, H — that's 9. The tree has 9 nodes, not 7. Trust the traversals; they don't lie). The only difference is **when** you do work at the current node relative to recursing into children. One line moved up or down gives you a completely different ordering.

## Iterative versions (explicit stack)

The recursive versions are clean, but they use the **call stack** for bookkeeping. On a deeply skewed tree (think a linked list disguised as a tree, height = `n`), recursive DFS can blow Python's recursion limit at depth ~1000. Iterative DFS sidesteps that — you use an *explicit* stack and a `while` loop, and you can recurse to whatever depth your heap memory supports.

### Iterative pre-order

```python
def preorder_iter(root):
    if root is None:
        return
    stack = [root]
    while stack:
        node = stack.pop()
        print(node.value)
        # push right FIRST so left gets popped FIRST (LIFO)
        if node.right:
            stack.append(node.right)
        if node.left:
            stack.append(node.left)
```

The trick: push children right-then-left so the *left* child pops out next. This matches the recursive order.

### Iterative in-order

This one's a head-scratcher first time you see it. You walk all the way down the left spine, pushing nodes as you go. When you can't go further left, pop and visit, then move to the right child and repeat.

```python
def inorder_iter(root):
    stack = []
    node = root
    while stack or node:
        # Walk down the left spine, pushing as we go
        while node:
            stack.append(node)
            node = node.left
        # Bottom of the spine — pop, visit, swing right
        node = stack.pop()
        print(node.value)
        node = node.right
```

The pattern: descend-left → pop+visit → swing-right → repeat.

### Iterative post-order

The trickiest of the three. There are a few ways; the cleanest is **"reverse pre-order, with children reversed"** — do a pre-order-style walk but push left-before-right (the *opposite* of the iterative pre-order), then reverse the output at the end.

```python
def postorder_iter(root):
    if root is None:
        return []
    stack = [root]
    out = []
    while stack:
        node = stack.pop()
        out.append(node.value)        # append in REVERSE post-order
        if node.left:
            stack.append(node.left)
        if node.right:
            stack.append(node.right)
    return list(reversed(out))        # reverse to get true post-order
```

Why it works: doing root → right → left and reversing the output gives left → right → root, which is post-order. (Trace it on the example tree to convince yourself.)

There's also a "true" two-pointer iterative post-order using a `last_visited` pointer, but the reverse-pre-order trick is shorter and easier to remember.

## Level-order — BFS on a tree

Sometimes you don't want depth-first at all — you want to visit nodes **layer by layer**, like ripples from the root.

Same tree:

```
            F          ← layer 0
           / \
          B   G        ← layer 1
         / \   \
        A   D   I      ← layer 2
           / \  /
          C   E H      ← layer 3
```

Level-order visits `F, B, G, A, D, I, C, E, H`. Same idea as BFS on a graph from [[Learning/DSA/Graphs/Traversals]] — use a FIFO queue, no cycle detection needed (trees have no cycles, so you can't accidentally revisit).

```python
from collections import deque

def level_order(root):
    if root is None:
        return
    queue = deque([root])
    while queue:
        node = queue.popleft()
        print(node.value)
        if node.left:
            queue.append(node.left)
        if node.right:
            queue.append(node.right)
```

Often you want the output **grouped by level** (`[[F], [B, G], [A, D, I], [C, E, H]]`). The trick: at the start of each iteration, record the current queue length — that's exactly the size of the current level:

```python
def level_order_grouped(root):
    if root is None:
        return []
    levels = []
    queue = deque([root])
    while queue:
        size = len(queue)            # snapshot: number of nodes at this level
        level = []
        for _ in range(size):
            node = queue.popleft()
            level.append(node.value)
            if node.left:  queue.append(node.left)
            if node.right: queue.append(node.right)
        levels.append(level)
    return levels
```

The `size` snapshot is the load-bearing trick — without it you can't tell where one level ends and the next begins. This is the standard pattern for LC 102 (level order), LC 199 (right-side view — the last node at each level), LC 103 (zigzag — reverse every other level), and dozens more.

## Tie-back to graph DFS

If you squint at the recursive traversals, they're all the same algorithm as graph DFS from [[Learning/DSA/Graphs/Traversals]], just with three simplifications:

- **No cycle detection needed.** Trees are acyclic, so you can't revisit a node by accident. No `visited` set, no WHITE/GRAY/BLACK colors.
- **Children are explicit `left`/`right` (or a `children` list).** No adjacency list lookup.
- **You can place the "visit" line in three different spots** (before children, between, after) — pre/in/post-order. On a general graph the "in-order" idea doesn't generalize, but pre-order and post-order both do.

DFS on a graph **is** a tree traversal — it's a pre-order traversal of the **DFS tree** (the spanning tree DFS implicitly builds as it walks). Once you see it that way, the topological-sort-via-DFS-postorder from [[Learning/DSA/Graphs/Traversals]] is just post-order on the DFS tree of a DAG.

## Morris traversal — a stretch goal

All the traversals above use either the recursion stack or an explicit stack, taking `O(h)` extra space where `h` is the tree height. **Morris traversal** does in-order in `O(1)` extra space, using a beautiful trick: it temporarily turns unused right-child pointers into **threads** back to a node's in-order predecessor, then tears them down on the way back.

The high-level idea:

Start at the root.

If current has no left child: visit it, move right. (Standard.)

If current has a left child: find the **rightmost node** in the left subtree (call it `pred`). Now:

If `pred.right` is `None`: set `pred.right = current` (the "thread"), then move left.

If `pred.right == current`: we've already done the left subtree; tear down the thread (`pred.right = None`), visit current, move right.

```python
def morris_inorder(root):
    current = root
    while current:
        if current.left is None:
            print(current.value)
            current = current.right
        else:
            pred = current.left
            while pred.right is not None and pred.right is not current:
                pred = pred.right
            if pred.right is None:
                pred.right = current        # create the thread
                current = current.left
            else:
                pred.right = None           # tear it down
                print(current.value)
                current = current.right
    # When we exit, the tree is restored exactly as we found it.
```

Time complexity is still `O(n)` — each edge is traversed at most a constant number of times in the inner thread-finding loop, even though it looks scarier than that.

The fine print: Morris **temporarily mutates the tree**. During the traversal, the structure is not actually a valid tree (it has cycles, via the threads). For most contexts this is fine because the mutations are reversed before the function returns. But: not thread-safe, breaks if anything else reads the tree concurrently, and unusable on read-only trees.

- **Why bother?** It's basically the only `O(1)`-space traversal of a binary tree without parent pointers, which makes it the right answer to interview questions like "traverse a BST in-order using `O(1)` extra space." Worth knowing the trick exists; less critical to memorize the implementation.

## Picking a traversal — quick reference

| Want to... | Use |
|---|---|
| Serialize a tree (root first) | Pre-order |
| Read BST keys in sorted order | In-order |
| Compute subtree sizes / heights / cleanup-before-delete | Post-order |
| Print level by level / find shortest depth to anything | Level-order (BFS) |
| Traverse with O(1) extra space | Morris (if you can mutate) |
| Recurse on a deeply skewed tree (height > 1000) | Iterative with explicit stack |

## 🔍 Quick check (try before scrolling)

- **Q1**: For our example tree (rooted at F), what does **post-order** print? Don't peek at the table — re-derive it.
- Show answer to Q1
  - Post-order recipe: left → right → root. Recurse on F's left subtree (rooted at B); within that, recurse on A (it's a leaf, prints A); recurse on D's left subtree (C is a leaf, prints C); recurse on D's right (E is a leaf, prints E); print D; print B. Then F's right subtree (rooted at G): no left; recurse on I's left (H is a leaf, prints H); no right for I; print I; print G. Finally print F. Full output: **A, C, E, D, B, H, I, G, F**.
- **Q2**: You're given a binary tree and asked: "is this tree a valid BST?" One approach: do an in-order traversal, then check the output is sorted. Why does that work, and what's the time complexity?
- Show answer to Q2
  - In-order traversal of a binary tree visits nodes in **left-root-right** order. For a BST, that's by definition ascending: every left descendant is smaller than the root, every right descendant is larger. So in-order produces ascending keys *iff* the tree satisfies the BST property at every node. Just check `output[i-1] < output[i]` for all `i`. Time `O(n)`, space `O(n)` (or `O(h)` if you compare as you go without buffering the whole output).
- **Q3**: You want to find the **shallowest** leaf in a tree (smallest depth). Pre-order or level-order? Why?
- Show answer to Q3
  - **Level-order** (BFS). It visits nodes in increasing depth, so the first leaf you encounter is guaranteed to be the shallowest. With pre-order/in-order/post-order you'd have to visit the *whole* tree and compare. (For the *deepest* leaf you'd need to visit the whole tree either way — there's no shortcut.)
- **Q4**: On a perfectly balanced binary tree with 1 million nodes, what's the max stack depth of recursive DFS? On a skewed tree (linked list shape) with the same node count?
- Show answer to Q4
  - Balanced: height ≈ `log₂(10⁶) ≈ 20`. Fine. Skewed: height = `10⁶`. Python's default recursion limit is 1000 — you'd `RecursionError` long before reaching the end. This is the practical reason iterative DFS matters: not for speed (same `O(n)`), but for not-crashing on adversarial shapes.

---

## 💪 Practice (a separate session, not your first read)

Reading and practicing in the same sitting is cramming. Come back tomorrow for these.

### Worked → faded → blank: invert a binary tree

#### Worked example (read)

"Invert" a binary tree = mirror it left-to-right at every level.

```python
def invert(node):
    if node is None:
        return None
    node.left, node.right = invert(node.right), invert(node.left)
    return node
```

Hidden in the tuple swap: a post-order traversal. Children get inverted *before* their pointers are reassigned in the parent. (Pre-order would also work, swapping pointers first and then recursing. Try both and see they produce the same output.)

#### Faded — fill in the blanks

Write `count_leaves(node) -> int` using post-order recursion.

```python
def count_leaves(node):
    if node is None:
        return 0
    if node.left is None and node.right is None:
        # FILL: it's a leaf
        ____________________
    # FILL: not a leaf — combine the answers from below
    ____________________
```

- Show the answer

```python

return 1

return count_leaves(node.left) + count_leaves(node.right)

```
  - Post-order pattern: get children's answers first, combine them. Three cases: empty (0), leaf (1), internal (sum of children's leaf counts). The shape of this code generalizes to "compute X for every subtree" with X = size, height, sum, max-depth, etc.

#### From scratch

Implement `max_depth(root) -> int` (height of the tree, in edges, with a single-node tree having height 0). Then implement `diameter(root) -> int` — the longest path between any two nodes (measured in edges). The diameter doesn't have to pass through the root. (Hint: at each node, the longest path through *that* node is `height(left) + height(right) + 2`. Track the maximum over all nodes.)

### Worked → faded → blank: level-order zigzag

#### Worked example (read)

LC 103 — print levels alternating left-to-right and right-to-left.

```python
def zigzag(root):
    if root is None:
        return []
    levels = []
    queue = deque([root])
    left_to_right = True
    while queue:
        size = len(queue)
        level = deque()
        for _ in range(size):
            node = queue.popleft()
            if left_to_right:
                level.append(node.value)
            else:
                level.appendleft(node.value)
            if node.left:  queue.append(node.left)
            if node.right: queue.append(node.right)
        levels.append(list(level))
        left_to_right = not left_to_right
    return levels
```

The `level` is itself a deque so we can append on either end in `O(1)`. The BFS structure is otherwise unchanged.

#### Faded — fill in the blanks

LC 199 — right-side view of a binary tree. Return the values of the rightmost node at each level.

```python
def right_side_view(root):
    if root is None:
        return []
    view = []
    queue = deque([root])
    while queue:
        size = len(queue)
        for i in range(size):
            node = queue.popleft()
            # FILL: when do we record this node into view?
            if ____________________:
                view.append(node.value)
            if node.left:  queue.append(node.left)
            if node.right: queue.append(node.right)
    return view
```

- Show the answer

```python

if i == size - 1:

```
  - The rightmost node at a level is the *last* one popped in that level's batch — index `size - 1` within the `for` loop. Alternative trick: append children left-then-right (as above) but record the *first* popped at each level if you append right-then-left instead. The `size`-snapshot pattern is the load-bearing trick.

### Debug-this

Three plausible-looking but buggy traversals.

#### A) "Iterative in-order" that visits in pre-order

```python
def inorder_buggy(root):
    if root is None:
        return
    stack = [root]
    while stack:
        node = stack.pop()
        print(node.value)
        if node.right:
            stack.append(node.right)
        if node.left:
            stack.append(node.left)
```

- Show the bug
  - This is iterative **pre-order**, not in-order. The author skipped the descend-left phase. In-order requires walking down the left spine first, pushing nodes as you go, then popping and visiting one by one — see the canonical version in the main section. There's no one-line fix; you have to use the descend-then-visit-then-swing-right pattern.

#### B) Recursive post-order on a deep skewed tree

```python
def postorder(node):
    if node is None:
        return
    postorder(node.left)
    postorder(node.right)
    print(node.value)
```

You call this on a 100,000-node "right-spine" tree (every node has only a right child). What happens?

- Show the bug
  - `RecursionError`: maximum recursion depth exceeded. Python's default limit is 1000. Even though there's no algorithmic bug, the implementation can't handle the input. Fix: rewrite iteratively with an explicit stack, or call `sys.setrecursionlimit(200000)` (and pray the C stack doesn't actually overflow). For interview contexts the iterative version is the expected answer.

#### C) Level-order that doesn't group by level

```python
def levels_buggy(root):
    if root is None:
        return []
    levels = [[root.value]]
    queue = deque([root])
    while queue:
        node = queue.popleft()
        current_level = []
        if node.left:
            queue.append(node.left)
            current_level.append(node.left.value)
        if node.right:
            queue.append(node.right)
            current_level.append(node.right.value)
        if current_level:
            levels.append(current_level)
    return levels
```

- Show the bug
  - This treats each node's immediate children as a "level" — but they aren't. Two nodes at the same level appear in different `levels` entries. Example: on our running example tree, `B`'s children `[A, D]` and `G`'s children `[I]` would both be appended as separate entries, even though A, D, and I are all at level 2. The fix is the `size = len(queue)` snapshot at the top of each iteration: it tells you how many nodes share the current level, regardless of which parent enqueued them.

### Teach-it-back

Without notes, ~4 sentences:

> *"Pre-order, in-order, and post-order are 'the same algorithm with one line moved.' Explain what's actually moving and why each variant is useful for a different problem. Use concrete examples — pretty-printing, expression-tree evaluation, BST validation."*

If you can't, the "where do you do work relative to children" framing didn't land. Re-read the recursive section.

---

## 🎴 Flashcards (for daily review, not the first read)

- Pre-order recipe? #card
  - **Root, left, right.** Do work at the node *before* recursing into children.
- In-order recipe? #card
  - **Left, root, right.** Do work *between* the two child recursions.
- Post-order recipe? #card
  - **Left, right, root.** Do work *after* both child recursions.
- In-order traversal of a **BST** produces? #card
  - Keys in **ascending sorted order**. This is the classical "validate-a-BST" trick.
- {{cloze **Level-order** traversal uses a **FIFO queue** and visits nodes in order of increasing depth.}} #card
- {{cloze The "snapshot the queue size at the start of each iteration" trick is what lets level-order traversal group output by level.}} #card
- When would you prefer **iterative** DFS to recursive DFS on a tree? #card
  - When the tree is or might be deeply skewed (height > 1000-ish), causing recursive DFS to hit Python's recursion limit. The iterative version uses heap memory for the explicit stack instead.
- Why is post-order the right traversal for evaluating an expression tree? #card
  - You can't apply an operator until you know its operands. The operands are children; post-order guarantees they're already computed before the parent runs.
- {{cloze Pre-order on the **DFS tree** of a graph **is** graph DFS. Post-order on the DFS tree of a DAG gives reversed **topological** order.}} #card
- What's the space complexity of recursive in-order traversal? #card
  - `O(h)` where `h` is the tree height, due to the call stack. On a balanced tree that's `O(log n)`; on a skewed tree it's `O(n)`.
- What's the space complexity of **Morris** traversal? #card
  - `O(1)` extra space. It temporarily rewires right-child pointers as "threads" back to in-order predecessors, then tears them down. Caveat: the tree is mutated mid-traversal.
- {{cloze In-order traversal doesn't generalize cleanly to **n-ary** trees because "between left and right" requires exactly two children.}} #card
- Why doesn't tree traversal need a `visited` set the way graph traversal does? #card
  - Trees are acyclic. There's no way to revisit a node — every node has exactly one parent (in a rooted tree), and you can only reach it from above.

---

## ✅ Self-check before moving on

Can I write pre-order, in-order, post-order recursively without notes?

Can I rewrite each as an iterative version using an explicit stack?

Can I write level-order, including the "group by level" variant with the size-snapshot trick?

Could I explain why in-order on a BST yields sorted order, and use that fact to validate a tree?

Could I sketch (not memorize) why Morris traversal achieves `O(1)` space?

If any "no", do one practice exercise. If all "yes", move on to [[Learning/DSA/Trees/Binary-Search-Trees]].

## 🔗 Related

- Up: [[Learning/DSA/Trees]]
- Prev: [[Learning/DSA/Trees/Basics]]
- Next: [[Learning/DSA/Trees/Binary-Search-Trees]]
- Related: [[Learning/DSA/Graphs/Traversals]] (trees are the easy case)
- Practice problems: [[Learning/DSA/Trees/Exercises]]
