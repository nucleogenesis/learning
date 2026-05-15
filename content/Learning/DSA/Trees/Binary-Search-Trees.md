---
title: Binary-Search-Trees
tags: [learning, dsa, trees, bst]
lastUpdated: 2026-05-15
---
# Binary search trees

> **Convention on this page**: Answer blocks live as children of "Show answer" parents. Click the triangle to collapse — Logseq remembers the state.

## 🎯 Why this matters

Picture a phone book in alphabetical order. You're looking for "Markham." Do you:

Start from the beginning and read each name? `O(n)` — terrible.

Flip to the middle, see "L-something," decide left or right, flip to the middle of the right half, repeat? `O(log n)` — that's **binary search**.

Binary search works on a *sorted array*, but sorted arrays are awful to **update**: inserting a new name in the middle shifts everything after it, costing `O(n)`. What if you want fast **search** *and* fast **insert/delete**?

A **binary search tree (BST)** is the canonical answer: a binary tree shaped to preserve the binary-search invariant under modification. Search is `O(h)` (height), insert is `O(h)`, delete is `O(h)`. On a *balanced* tree, `h = O(log n)`, so you get the speed of binary search with the flexibility of pointers.

BSTs underpin:

`std::map` and `std::set` in C++ (typically Red-Black tree)

`TreeMap` / `TreeSet` in Java

Database indexes (a generalization: B-trees and B+-trees, which fan out wider per node for disk efficiency)

Any "sorted collection with fast insert/delete/range-query" use case

This page covers the BST property, the three core operations (search, insert, delete — delete is the tricky one), and the *why-balance-matters* story that motivates AVL and Red-Black trees.

## A tiny worked example

Insert the keys `[8, 3, 10, 1, 6, 14, 4, 7, 13]` into an initially empty BST, in that order. After all inserts:

```
            8
           / \
          3   10
         / \    \
        1   6    14
           / \   /
          4   7 13
```

We'll carry this BST through the rest of the page. To name the property explicitly:

> **The BST property**: for every node `v`, every key in `v`'s **left subtree** is **less** than `v`, and every key in `v`'s **right subtree** is **greater** than `v`.

Check it on the tree above. At node `8`: left subtree is `{3, 1, 6, 4, 7}` — all `< 8`. Right subtree is `{10, 14, 13}` — all `> 8`. Recurse: at `3`, left is `{1}` (< 3), right is `{6, 4, 7}` (> 3). And so on. Every node satisfies it.

(Some references say "≤" on one side to allow duplicate keys. That's a convention choice; here we'll assume distinct keys. For maps, the value being updated rather than inserted is the natural "duplicate" handling.)

- **An in-order traversal of any BST yields keys in ascending order.** Traverse the tree above in-order (left, root, right): `1, 3, 4, 6, 7, 8, 10, 13, 14`. Sorted. This is the easiest mental check that something is actually a BST. (See [[Learning/DSA/Trees/Traversals]] for the traversal itself.)

## Search

To find a key, walk down from the root and at each step choose left or right based on comparison. If you hit `None`, the key isn't there.

```python
def search(node, key):
    if node is None or node.value == key:
        return node
    if key < node.value:
        return search(node.left, key)
    else:
        return search(node.right, key)
```

Iterative is just as natural:

```python
def search(root, key):
    node = root
    while node is not None and node.value != key:
        node = node.left if key < node.value else node.right
    return node
```

Walking through `search(root, 7)` on our tree: at 8, 7 < 8 → go left. At 3, 7 > 3 → go right. At 6, 7 > 6 → go right. At 7, match. Found in 4 comparisons.

- **Time**: `O(h)` where `h` is the tree height. The key word is *height*, not number-of-nodes. We'll come back to why.

## Insert

To insert a new key, search for it as above. When you fall off the tree (hit a `None` pointer), put the new node there.

```python
def insert(node, key):
    if node is None:
        return Node(key)
    if key < node.value:
        node.left = insert(node.left, key)
    elif key > node.value:
        node.right = insert(node.right, key)
    # key == node.value: already present; do nothing (or update value, for a map)
    return node
```

The recursive return-and-reassign idiom is the load-bearing trick: each recursive call returns the (possibly new) root of its subtree, which the parent stores. That handles both "create a new node when None" and "no change needed" with the same shape.

Inserting `5` into our tree: search descends 8 → 3 → 6 → 4. From 4, key `5 > 4` → go right. 4's right is `None` → insert `5` there. Final position: left child of 6, sibling of 7.

```
            8
           / \
          3   10
         / \    \
        1   6    14
           / \   /
          4   7 13
           \
            5      ← new
```

- **Time**: `O(h)`. The search part takes `O(h)`; placing the new node is `O(1)`.
- **One thing to internalize**: insertion order shapes the tree. If you insert keys in already-sorted order — say `[1, 2, 3, 4, 5]` — the tree degenerates into a right spine of depth 5, which is just a slow linked list. We'll address this at the bottom.

## Delete

This is where it gets interesting. Three cases, by how many children the doomed node has.

### Case 1: leaf (0 children)

Just remove it. Easiest case.

Delete `7` from our tree: it's a leaf. Set 6's right pointer to `None`. Done.

### Case 2: one child

Splice the child up into the doomed node's slot. The child's subtree slides up one level.

Delete `14`: it has one child (13). Set 10's right pointer directly to 13. The node 14 is bypassed.

### Case 3: two children

The hard case. We can't just splice — there's no single child to promote. Instead, we replace the doomed node's *value* with a value that's a legal "neighbor" in the sorted order, then delete *that* node (which is guaranteed to fall into Case 1 or 2). Two legitimate choices:

The **in-order successor** — the smallest key in the doomed node's *right* subtree.

The **in-order predecessor** — the largest key in the doomed node's *left* subtree.

Either works. Convention is usually the successor.

Delete `3` from our tree (it has children 1 and 6).

Find the in-order successor of 3: smallest key in 3's right subtree (rooted at 6). Walk left as far as we can from 6: 6 → 4. Stop (4 has no left child). So the successor is `4`.

Copy `4` into the node where `3` was: that node now holds value 4.

Delete the original `4` from the right subtree. Since 4 was the smallest in 6's subtree (walked all the way left), it has no left child — falls into Case 1 or 2.

After the dust settles:

```
            8
           / \
          4   10        ← was 3, now 4
         / \    \
        1   6    14
             \   /
              7 13      ← 4 removed; 6 now has only a right child
```

Code:

```python
def delete(node, key):
    if node is None:
        return None
    if key < node.value:
        node.left = delete(node.left, key)
    elif key > node.value:
        node.right = delete(node.right, key)
    else:
        # Found the node to delete
        if node.left is None:
            return node.right         # Cases 1 and 2 (no left child)
        if node.right is None:
            return node.left          # Case 2 (no right child)
        # Case 3: two children — replace with in-order successor
        succ = node.right
        while succ.left is not None:
            succ = succ.left
        node.value = succ.value
        node.right = delete(node.right, succ.value)
    return node
```

- **Time**: `O(h)`. Finding the node is `O(h)`. Finding the successor is `O(h)` in the worst case (it's a walk down from `node.right`). Recursive deletion of the successor is `O(h)`. They don't compose; the whole thing stays `O(h)`.

## Other useful operations (worth knowing)

- **Min / max**: walk all the way left (min) or all the way right (max). `O(h)`.
- **Successor / predecessor of an arbitrary node**: depends on whether the node has a right child (use the min of the right subtree) or not (walk up until you turn right). `O(h)`.
- **Range query** `[lo, hi]`: in-order traversal with pruning — skip the left subtree if the current node is `< lo`, skip the right subtree if `> hi`. `O(h + k)` where `k` is the number of keys returned.

## Why balance matters

Insert keys `[1, 2, 3, 4, 5]` into an empty BST in that order. You get:

```
1
 \
  2
   \
    3
     \
      4
       \
        5
```

Height `4` on 5 nodes. In general, sorted-order insertions produce height `n − 1`. Search becomes `O(n)`. The whole tree degenerates into a linked list — every operation just walks the spine.

Compare with the **same keys** inserted in a *balanced* order — say `[3, 1, 5, 2, 4]`:

```
    3
   / \
  1   5
   \  /
    2 4
```

Height 2 on 5 nodes. Search is `O(log n) ≈ 2-3 comparisons` rather than 5. The ratio gets dramatically worse as `n` grows: a million sorted insertions give a tree of height 999,999 vs. a balanced tree's height of ~20.

The performance of *every* BST operation is `O(h)`. So the entire game is **keeping `h` small** in the face of adversarial insertion orders.

### Self-balancing BSTs (high-level — no need to implement)

Several BST variants keep `h = O(log n)` by re-shaping the tree during inserts/deletes. The dominant ones:

- **AVL tree** — strictly balanced: at every node, the heights of left and right subtrees differ by at most 1. Re-balances using *rotations* after each modification. Slightly more rotations than Red-Black on average (so inserts/deletes are a hair slower), but lookups are faster (smaller height bound). Good for read-heavy workloads.
- **Red-Black tree** — looser: each node is colored red or black; constraints on coloring ensure no root-to-leaf path is more than twice as long as any other. The standard library workhorse (C++ `std::map`, Java `TreeMap`). Fewer rotations on insert/delete, slightly larger height bound. Good general-purpose choice.
- **Splay tree** — amortized: after every access, "splays" the accessed node to the root via rotations. Frequently-accessed nodes end up near the top. Great for skewed access patterns, weaker worst-case guarantees.
- **B-tree / B+-tree** — wider, not strictly binary: each node holds many keys and has many children, which is great when "loading a node" is expensive (disk seek). The shape behind database indexes and filesystems like NTFS / HFS+.
- **Treap** — combines a BST (by key) with a heap (by random priority); the randomness keeps it balanced *in expectation* without explicit re-balancing logic.
  - **You don't need to implement these** for most interviews or coursework — the existence of `std::map` / `TreeMap` / Python's `sortedcontainers.SortedDict` covers practical use. What you should know:

Plain BST = `O(h)`, and `h` can be `O(n)` worst case → unusable for adversarial inputs.

A self-balancing BST guarantees `h = O(log n)` → reliable `O(log n)` operations.

Pick AVL when reads dominate writes; Red-Black for general-purpose; B-tree when nodes live on disk; treap when you want simple randomized balance.

Look up rotations and the AVL/RB invariants the day you need to implement one. Until then, the *intuition* — "tree shape is maintained by structural surgery during inserts/deletes" — is enough.

## 🔍 Quick check (try before scrolling)

- **Q1**: Insert keys `[5, 2, 8, 1, 3, 7, 9, 4]` into an empty BST, in order. Sketch the tree. Then list the in-order traversal.
- Show answer to Q1
  - Tree:

```
            5
           / \
          2   8
         / \  / \
        1   3 7  9
             \
              4
    ```

In-order: `1, 2, 3, 4, 5, 7, 8, 9` — sorted, as required.

- **Q2**: From the original example tree (with 8 at the root), delete `8`. Show the tree after.
- Show answer to Q2
  - 8 has two children → Case 3. In-order successor of 8 = smallest key in 8's right subtree (rooted at 10). Walk left from 10: it has no left child, so 10 is itself the successor. Copy 10's value into the root, then delete 10 from the right subtree (it has one child, 14, so Case 2: splice 14 up).

```
            10
           / \
          3   14
         / \   /
        1   6 13
           / \
          4   7
    ```

- **Q3**: Suppose you insert 1000 keys in **already-sorted order** into a plain BST. What's the height? What's the search complexity? What would change with an AVL tree?
- Show answer to Q3
  - Plain BST: height = 999 (every key becomes the right child of the previous one). Search is `O(n) = O(1000)`. AVL tree: rotations during insertion rebalance the tree after each insert; final height ≈ ⌈log₂(1000)⌉ = 10. Search becomes `O(log n)`. **This is the entire reason self-balancing BSTs exist.**
- **Q4**: Why is in-order traversal of a BST the standard "validate a BST" trick? Could you do it differently?
- Show answer to Q4
  - In-order on a BST emits keys in ascending order *iff* the tree satisfies the BST property at every node. So you can just check `prev < current` on the fly. Alternatives: recurse with `(lo, hi)` bounds passed down — at each node, check `lo < node.value < hi`, then recurse left with bounds `(lo, node.value)` and right with `(node.value, hi)`. Equivalent in complexity (`O(n)` time, `O(h)` space); the bounds version doesn't need to remember the previous in-order key as state.

---

## 💪 Practice (a separate session, not your first read)

Come back tomorrow for these. First-read-plus-practice in the same sitting is exactly the cramming pattern spacing is supposed to fix.

### Worked → faded → blank chain: BST insert

#### Worked example (read)

See the recursive `insert` above. The key idiom is the *return-and-reassign* pattern: each call returns the (possibly new) subtree root.

#### Faded — fill in the blanks

Implement `contains(root, key) -> bool` iteratively.

```python
def contains(root, key):
    node = root
    while node is not None:
        if key == node.value:
            # FILL
            ____________________
        elif key < node.value:
            # FILL: descend
            ____________________
        else:
            # FILL: descend
            ____________________
    # FILL: not found
    ____________________
```

- Show the answer

```python

- return True
- node = node.left
- node = node.right
- return False

```

#### From scratch

Write `kth_smallest(root, k) -> value` — the k-th smallest key in the BST (1-indexed). Two natural approaches: (1) full in-order traversal, return the k-th value visited; (2) augment each node with `subtree_size` and descend in `O(h)`. Implement approach 1 (no augmentation). Then implement approach 2 *as a thought experiment* — just sketch where the augmentation would be updated. (LC 230.)

### Worked → faded → blank: validate a BST

#### Worked example (read)

```python
def is_bst(node, lo=float('-inf'), hi=float('inf')):
    if node is None:
        return True
    if not (lo < node.value < hi):
        return False
    return (is_bst(node.left,  lo, node.value)
            and is_bst(node.right, node.value, hi))
```

The bounds tighten as we descend. Left subtree of `v` must lie in `(lo, v)`; right subtree must lie in `(v, hi)`. Initial call uses `(-∞, +∞)`. `O(n)` time, `O(h)` space.

#### Faded — fill in the blanks

Rewrite as in-order traversal with a `prev` variable:

```python
def is_bst_inorder(root):
    prev = None
    def walk(node):
        nonlocal prev
        if node is None:
            return True
        # FILL: recurse left
        if not ____________________:
            return False
        # FILL: check current vs prev
        if prev is not None and ____________________:
            return False
        prev = node.value
        # FILL: recurse right
        return ____________________
    return walk(root)
```

- Show the answer

```python

if not walk(node.left):

if prev is not None and prev >= node.value:

return walk(node.right)

```
  - The in-order key sequence must be strictly ascending. We update `prev` after the "visit" step and recurse right. Same `O(n)` time, same `O(h)` space (for the recursion stack).

#### From scratch

Write `lca(root, p, q) -> Node`: the lowest common ancestor of keys `p` and `q` in a **BST**. The BST property makes this much easier than the general-tree case: at each node, if both `p` and `q` are less than `node.value`, recurse left; if both greater, recurse right; otherwise the current node is the LCA (one is on each side, or the current node *is* one of them). `O(h)` time. (LC 235.)

### Debug-this

```python
def delete(node, key):
    if node is None:
        return None
    if key < node.value:
        node.left = delete(node.left, key)
    elif key > node.value:
        node.right = delete(node.right, key)
    else:
        if node.left is None:
            return node.right
        if node.right is None:
            return node.left
        # Two-child case: replace with in-order predecessor
        pred = node.left
        node.value = pred.value
        node.left = delete(node.left, pred.value)
    return node
```

The two-child case uses the predecessor instead of the successor — that's fine in principle, but there's a bug. Predict before revealing.

- Show the bug
  - `pred = node.left` is just the *direct left child*, not the **in-order predecessor**. The in-order predecessor is the **largest** key in the left subtree — `node.left.right.right.... (all the way right)`. With this bug, the "predecessor" we copy is whatever the left child happens to be, which is often not the largest in the left subtree. Result: the BST property gets violated whenever the left subtree has any right descendants.
  - **Fix**: walk to the rightmost descendant of the left subtree:

```python
    pred = node.left
    while pred.right is not None:
        pred = pred.right
    node.value = pred.value
    node.left = delete(node.left, pred.value)
    ```

### Teach-it-back

In ~4 sentences, no notes:

> *"Explain why an unbalanced BST can be as bad as a linked list, and what a self-balancing BST does about it — without going into the specific rotation rules. What's the rough trade-off between AVL and Red-Black?"*

If you can't articulate the height argument, re-read the "Why balance matters" section.

---

## 🎴 Flashcards (for daily review, not the first read)

- State the **BST property** (one sentence)? #card
  - For every node, all keys in its left subtree are less than the node, and all keys in its right subtree are greater.
- What does in-order traversal of a BST produce? #card
  - The keys in **ascending sorted order**.
- Time complexity of BST search? #card
  - `O(h)` where `h` is the tree height. `O(log n)` if balanced, `O(n)` worst case.
- Time complexity of BST insert / delete? #card
  - Both `O(h)`. The expensive part is finding the node; the structural surgery is `O(1)` extra.
- Three cases for BST delete? #card
  - 0 children (leaf — just remove). 1 child (splice the child up). 2 children (replace value with in-order successor or predecessor; then recursively delete that).
- {{cloze The **in-order successor** of a node with a right child is the **leftmost** node in the right subtree.}} #card
- Why does inserting keys in already-sorted order give a degenerate BST? #card
  - Each new key is larger than every existing key, so it always becomes the right child of the rightmost node. Tree becomes a right spine of depth `n − 1` — effectively a linked list.
- What does AVL balance enforce? #card
  - At every node, `|height(left) − height(right)| ≤ 1`. Height is bounded at `~1.44 log₂ n`.
- What does Red-Black balance enforce? #card
  - Color-based: every root-to-leaf path has the same number of black nodes; no two reds in a row. Height bounded at `~2 log₂ n`.
- AVL vs Red-Black — when to pick which? #card
  - AVL: tighter height bound → faster lookups. Red-Black: fewer rotations on modification → faster inserts/deletes. Read-heavy → AVL. Mixed → Red-Black. The standard library usually uses Red-Black.
- What are **B-trees** used for, in one sentence? #card
  - Wider-than-binary BSTs designed so each node fits a disk block — used for database indexes and filesystems where node access is the dominant cost.
- {{cloze The two-children-delete case copies the **in-order successor**'s value into the doomed node, then deletes the **successor** from the right subtree.}} #card
- Validate-a-BST: name two `O(n)` approaches. #card
  - (1) In-order traversal, check the output is strictly ascending. (2) Recurse with `(lo, hi)` bounds tightened as you descend.
- LCA in a **BST** — why is it easier than LCA in a general binary tree? #card
  - The BST property tells you at each node whether both targets are in the same subtree (recurse there) or split across (current node is the LCA). No need to walk the whole tree.

---

## ✅ Self-check before moving on

Honest yes/no:

Can I write BST search, insert, and delete (all three cases) from scratch?

Can I trace the deletion of a two-child node by hand and explain the successor/predecessor trick?

Can I argue in one sentence why a plain BST is `O(n)` worst-case and why AVL / Red-Black fix it?

Could I explain the AVL vs Red-Black trade-off to someone interviewing me?

Could I find the LCA of two keys in a BST in `O(h)`?

If any "no", do one practice exercise above. If all "yes", move on to [[Learning/DSA/Trees/Tries]].

## 🔗 Related

Up: [[Learning/DSA/Trees]]

Prev: [[Learning/DSA/Trees/Traversals]]

Next: [[Learning/DSA/Trees/Tries]]

Related: [[Learning/DSA/Priority-Queue]] (heap: a different tree-as-array structure)

Practice problems: [[Learning/DSA/Trees/Exercises]]
