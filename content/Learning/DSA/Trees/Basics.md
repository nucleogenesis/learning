---
title: Basics
tags: [learning, dsa, trees, basics]
lastUpdated: 2026-05-15
---
# Trees — basics & representations

> **Convention on this page**: Answer blocks live as children of a parent "Show answer" bullet. To hide them, click the triangle on that parent once — Logseq remembers the collapsed state.

## 🎯 Why this matters

Run `ls -R ~/Journal` and stare at the output. You see directories, and inside those directories, more directories, and eventually files. There's exactly one starting point (`~/Journal`). No file shows up under two parents. No directory contains itself somewhere down its own chain. Walk far enough down any branch and you hit a leaf — a file — with no further children.

That shape — single root, strict nesting, no cycles — is so common it has its own data structure: the **tree**. Once you have the vocabulary, you can talk precisely about file systems, DOMs, parse trees, decision trees, B-tree indexes, and the heap from [[Learning/DSA/Priority-Queue]]. They're all the same shape.

This page covers: the vocabulary (root, leaf, depth, height, ancestor, descendant), the binary-vs-n-ary distinction, why a tree is just a constrained graph, and three ways to actually store one in code.

## A tiny worked example

A small family tree, three generations deep:

```
                Ada
               /   \
             Ben   Cleo
            /  \    |
          Dee  Eli  Fay
                    |
                    Gus
```

We'll carry this example through the rest of the page. To wire up vocabulary as we go:

- **Root** — the one node at the top with no parent. Here: **Ada**. Every tree has exactly one root.
- **Leaf** — a node with no children. Here: **Dee, Eli, Gus**. Branches terminate at leaves.
- **Internal node** — a non-leaf, non-root node (or sometimes just any non-leaf). **Ben, Cleo, Fay** are internal.
- **Parent / child** — directed terms along an edge. Ben is the **parent** of Dee; Dee is a **child** of Ben.
- **Siblings** — nodes with the same parent. Dee and Eli are siblings. Ben and Cleo are siblings.
- **Ancestor / descendant** — transitive parent/child. Ada is an ancestor of Gus; Gus is a descendant of Ada (via Cleo and Fay). Every node is technically its own ancestor and descendant (convention varies; pay attention to "proper ancestor" when it matters).
- **Subtree rooted at v** — `v` and all of `v`'s descendants. The subtree at Ben is `{Ben, Dee, Eli}`.
  - Two measurements that come up constantly:
- **Depth of a node** — number of edges from the **root** down to that node. Ada has depth 0, Ben and Cleo have depth 1, Dee/Eli/Fay have depth 2, Gus has depth 3.
- **Height of a node** — number of edges from that node down to its **deepest descendant leaf**. Gus has height 0 (it's a leaf). Fay has height 1. Cleo has height 2. Ada has height 3.
- **Height of the tree** — the height of the root. Our example has height 3.
  - Depth grows downward from the root; height grows upward from the leaves. They're symmetric and easy to confuse — pick one mental anchor ("depth = how far you've already walked down") and the other one will fall out.

### Binary vs n-ary

A **binary tree** restricts each node to **at most two children**, often called `left` and `right`. Ada has two children (Ben, Cleo). Ben has two children (Dee, Eli). Cleo has one child (Fay). Fay has one child (Gus). So our family tree is binary, even though one node has only a left child.

If a node can have any number of children — like a directory holding any number of subdirectories — it's an **n-ary tree** (or "general tree"). The DOM is n-ary; a `<ul>` can contain any number of `<li>`. The file system is n-ary; a folder can contain any number of children.

Binary trees come up disproportionately often because the simpler structure makes algorithms cleaner — recursion with `left` and `right` cases instead of a loop over an arbitrary list of children. Most of the rest of this curriculum lives in binary-tree land.

### Tree vs forest

A **forest** is a disjoint collection of trees. If you delete the root of our family tree, you're left with two subtrees (rooted at Ben and at Cleo) — a forest. The empty set is also a forest (zero trees).

This sounds pedantic until you hit problems where the input isn't guaranteed to be one connected tree, or where deletions split a tree into pieces. The terminology lets you say "the result is a forest of three trees" without weasel-words.

### A tree is just a constrained graph

You met graphs in [[Learning/DSA/Graphs/Basics]]. Here's the punchline:

> A tree is an **undirected, connected, acyclic** graph with one node designated as the root.

Take any tree, forget which node is the root, ignore the parent/child direction, and you have an undirected graph that's:

- **Connected** — you can reach any node from any other.
- **Acyclic** — no cycles.
- **Has exactly `n − 1` edges** on `n` nodes. (This follows: connected requires at least `n − 1`; acyclic forbids more than `n − 1`. The two constraints pin the count exactly.)
  - That's why a tree on `n` vertices has `n − 1` edges, the fact you flashcarded in [[Learning/DSA/Graphs/Basics]]. Trees are graphs' simplest non-trivial case — which is also why graph algorithms like DFS and BFS work on trees with all the cycle-detection bookkeeping turned off.
  - The "rooted tree" you mostly work with adds two things to the bare graph definition: a designated root, and the implicit parent-to-child direction that follows from the root choice. The same five-node undirected tree can be rooted at any of its five nodes, giving five different "rooted trees" that share the same underlying graph.

## Three ways to store a tree

How do we actually put a tree into code? Three representations, with different trade-offs.

### 1. Linked nodes (the textbook representation)

Each node is a struct/object holding its value and pointers to its children. For binary trees:

```python
class Node:
    def __init__(self, value, left=None, right=None):
        self.value = value
        self.left = left
        self.right = right

# Our family tree (just the binary structure; values omitted for brevity)
gus = Node('Gus')
fay = Node('Fay', left=gus)
eli = Node('Eli')
dee = Node('Dee')
ben = Node('Ben', left=dee, right=eli)
cleo = Node('Cleo', left=fay)
ada = Node('Ada', left=ben, right=cleo)
```

For n-ary trees you swap `left`/`right` for a list:

```python
class NaryNode:
    def __init__(self, value, children=None):
        self.value = value
        self.children = children or []
```

- **Space**: `O(n)` — one struct per node.
- **Child lookup**: `O(1)` for binary (just `node.left`), `O(k)` for n-ary (iterate `node.children`).
- **Parent lookup**: ❌ not available unless you also store a `parent` pointer.
- **Insert / delete**: `O(1)` once you have the parent node — wire up the new child pointer.
  - This is the representation you'll see in 95% of LeetCode tree problems, and it's the one most algorithm pseudocode assumes.

### 2. Parent-pointer (a.k.a. "child-to-parent" array)

Store, for each node, **just the index of its parent**. The root's parent is `-1` (or `None`, or itself, by convention).

```python
# Index:    0    1    2    3    4    5    6
# Names:  Ada  Ben  Cleo Dee  Eli  Fay  Gus
parent = [-1,   0,   0,   1,   1,   2,   5]
```

So Ben (index 1) has parent Ada (index 0). Gus (index 6) has parent Fay (index 5). Ada (index 0) has parent `-1` — it's the root.

- **Space**: `O(n)` — just one integer per node.
- **Parent lookup**: `O(1)` — `parent[i]`.
- **Child lookup**: ❌ `O(n)` — scan the whole array looking for indices whose parent is `i`.
- **Root-walk** (climb to the root): `O(h)` where `h` is the height.
  - Wildly useful when you mostly walk *upward* (Union-Find uses exactly this representation — see [[Learning/DSA/Disjoint-Set-Union]]) or when you reconstruct paths after BFS/DFS — the `parent` dict in BFS path reconstruction is literally this.

### 3. Child-list (adjacency-list flavor)

A map (or array of lists) from each node to its list of children. Identical in spirit to the adjacency list from [[Learning/DSA/Graphs/Basics]], but you only store the down edges.

```python
children = {
    'Ada':  ['Ben', 'Cleo'],
    'Ben':  ['Dee', 'Eli'],
    'Cleo': ['Fay'],
    'Dee':  [],
    'Eli':  [],
    'Fay':  ['Gus'],
    'Gus':  [],
}
root = 'Ada'
```

- **Space**: `O(n)` — sum of children counts equals `n − 1` (the edge count).
- **Child lookup**: `O(1)` — read the list.
- **Parent lookup**: ❌ not stored.
- **Iterating siblings**: `O(degree)` — read your parent's child list.
  - Good when the tree is n-ary or when the structure is dynamic (children added/removed at runtime), and you'd rather not chase pointers. Equivalent to a directed adjacency list where edges only go down.

### 4. (Bonus) Implicit array indexing — for complete binary trees only

If your binary tree is **complete** (every level full except possibly the last, which fills left-to-right), you can skip pointers entirely and pack the nodes into a flat array, using index arithmetic to navigate:

- Parent of index `i`: `(i − 1) // 2`
- Left child of `i`: `2 * i + 1`
- Right child of `i`: `2 * i + 2`
  - This is exactly how the binary heap in [[Learning/DSA/Priority-Queue]] works. It only applies to *complete* trees — our family tree above isn't complete (Cleo has only a left child, so Cleo's right slot in the array would be empty), so this representation would waste space.

## Pick the right one — quick lookup

| Situation | Best representation |
|---|---|
| LeetCode binary tree problem | Linked nodes (`Node` with `left`, `right`) |
| Mostly walking *upward* (Union-Find, BFS-parent reconstruction) | Parent-pointer array |
| N-ary tree (file system, DOM, arbitrary children) | Child-list |
| Complete binary tree, max space efficiency (heap) | Implicit array (no pointers) |
| Don't know yet | Linked nodes |

## 🔍 Quick check (try before scrolling)

A few short questions answerable from this page. Predict before expanding.

- **Q1**: For our family tree (Ada at the top), what's the depth of Gus and the height of Cleo?
- Show answer to Q1
  - Depth of Gus is **3** (edges Ada → Cleo → Fay → Gus). Height of Cleo is **2** (edges Cleo → Fay → Gus is the deepest path within Cleo's subtree). Depth is measured from the root downward; height is measured from the leaves upward.
- **Q2**: Convert the parent-pointer array `[-1, 0, 0, 1, 1, 2, 5]` (with names `[Ada, Ben, Cleo, Dee, Eli, Fay, Gus]`) into a child-list dict.
- Show answer to Q2
  - Walk the array; for each index `i` whose parent is `p`, append `name[i]` to `children[name[p]]`. Result: `{Ada: [Ben, Cleo], Ben: [Dee, Eli], Cleo: [Fay], Fay: [Gus]}` (leaves Dee, Eli, Gus implicitly have empty child lists). The two representations carry the same information; one is optimized for going up, the other for going down.
- **Q3**: Could you root our family tree at Gus instead of Ada? What would change?
- Show answer to Q3
  - Yes — re-rooting any tree at a different node is fine. The underlying undirected graph is unchanged; only the parent/child *direction* flips along the path from the new root to the old root. Re-rooted at Gus: Gus's only child is Fay, Fay's only child is Cleo, Cleo's only child is Ada, Ada's children are Ben and Cleo... wait, Ada can't be both Cleo's parent and Cleo's child. Let me redo: Gus → Fay → Cleo → Ada, and from Ada we add Ben as a child (Ada → Ben → {Dee, Eli}). Re-rooting just flips edge directions along the old root path; everywhere else stays the same.
- **Q4**: A tree has 100 nodes. How many edges does it have?
- Show answer to Q4
  - **99**. A tree on `n` nodes always has exactly `n − 1` edges. (Connected requires ≥ `n − 1`; acyclic forbids > `n − 1`.)
  - If those clicked, the structural ideas are in place. Move on to [[Learning/DSA/Trees/Traversals]] when you have time — practice below is for a separate session.

---

## 💪 Practice (a separate session, not your first read)

Don't try these in the same sitting as your first read. Come back tomorrow.

### Worked → faded → blank chain: build child-list from parent-pointer

#### Worked example (read)

```python
def parent_array_to_children(parent):
    """parent[i] = index of i's parent, or -1 if i is the root."""
    children = {i: [] for i in range(len(parent))}
    root = None
    for i, p in enumerate(parent):
        if p == -1:
            root = i
        else:
            children[p].append(i)
    return children, root
```

One pass, builds the down-edges by inverting the up-edges.

#### Faded — fill in the blanks

- Write `children_to_parent_array(children, root)` — the inverse direction.

```python
def children_to_parent_array(children, root):
    n = len(children)
    parent = [-1] * n
    # BFS or DFS from the root; record each child's parent as we go
    stack = [root]
    while stack:
        v = stack.pop()
        for c in children[v]:
            # FILL: record v as c's parent
            ____________________
            # FILL: continue walking from c
            ____________________
    return parent
```

- Show the answer

```python

parent[c] = v

stack.append(c)

```
  - This is just a DFS from the root that records each edge's direction. You could also use a queue (BFS); the parent assignments come out identical because the tree has no cycles and every node is reached from exactly one path.

#### From scratch

Write `depth(node, tree) -> int` for a tree given in *linked-node* form. Then write the same thing for a tree given in *parent-pointer* form. Notice: in the linked form you'd typically pass the root and recurse; in the parent-pointer form you start at the node and walk *up* counting steps. The natural walk direction is opposite.

### Debug-this

```python
class Node:
    def __init__(self, value, left=None, right=None):
        self.value = value
        self.left = left
        self.right = right

def height(node):
    if node is None:
        return 0
    return 1 + max(height(node.left), height(node.right))
```

- Two issues with this `height` function — predict before revealing.
- Show the bugs
  - **Bug 1**: The base case returns `0` for an empty subtree, but the recursive case adds `1` for the current node. That makes a single-node tree have height `1 + max(0, 0) = 1`, when the conventional definition gives a single-node tree height **0**. Fix: return `-1` for the `None` case, so a single-node tree gets `1 + max(-1, -1) = 0`. (Some textbooks use the "1-based" convention where a single node has height 1; just pick one and be consistent.)
  - **Bug 2**: Subtle — `height` here is measuring height *in number of nodes*, not *in number of edges*. The two conventions disagree by exactly 1. If you're going to use this function with `depth`, make sure both use the same convention; otherwise `depth(v) + height(v) == tree_height` won't hold.

### Teach-it-back

In ~3 sentences, no notes:

> *"You're explaining trees to a junior dev who knows arrays and dictionaries but has never thought about hierarchical data. Walk them through why we'd ever use a tree instead of a nested dictionary. Use a concrete example."*

If you can't, the file-system / DOM motivations didn't land. Re-read "Why this matters."

---

## 🎴 Flashcards (for daily review, not the first read)

Don't drill these on your first read — that's cramming on the same day you encoded the material, which the spacing effect specifically warns against. They show up in tomorrow's queue.

- What's the difference between **depth** and **height** of a node? #card
  - Depth = edges from the root down to the node. Height = edges from the node down to its deepest descendant leaf. They're measured in opposite directions.
- How many edges does a tree on `n` nodes have? #card
  - Exactly `n − 1`. (Connected requires ≥, acyclic forbids >.)
- What's the difference between a **tree** and a **forest**? #card
  - A tree is one connected acyclic graph with a designated root. A forest is a disjoint union of trees (possibly zero).
- {{cloze A **leaf** is a node with no children; an **internal node** is one with at least one.}} #card
- {{cloze A **binary** tree allows at most **2** children per node; an **n-ary** tree allows any number.}} #card
- Why is a tree a special case of a graph? #card
  - It's connected, acyclic, undirected — the three constraints that pin down "tree." Plus, we usually designate one node as the root.
- What's the **subtree rooted at v**? #card
  - The node `v` together with all of `v`'s descendants. It's itself a tree.
- {{cloze The **root** of a tree has no **parent**; a **leaf** has no **children**.}} #card
- Parent-pointer representation: how do you find a node's children? #card
  - You can't, in `O(1)`. You'd scan the whole array. Parent-pointer is for upward walks; for downward walks use child-list.
- When can you use the implicit array representation (parent at `(i-1)//2`, children at `2i+1`, `2i+2`) for a binary tree? #card
  - Only when the tree is **complete** (every level full except possibly the last, which fills left-to-right). The heap is the canonical example.
- The same undirected tree on `n` nodes can be re-rooted at any node. How many distinct rootings are there? #card
  - `n` — one for each choice of root vertex. The underlying graph stays the same; parent/child directions flip along the path between the old and new root.

---

## ✅ Self-check before moving on

Honest yes/no:

Can I draw a 7-node tree and label every node's depth, height, parent, and the leaves?

Can I name three real-world systems that are trees (or forests) and say what the root, internal nodes, and leaves are in each?

Can I switch between linked-node, parent-pointer, and child-list representations for a small tree by hand?

Could I explain in one sentence why a tree is just a constrained graph?

If any "no", do one practice exercise above. If all "yes", move on to [[Learning/DSA/Trees/Traversals]].

## 🔗 Related

- Up: [[Learning/DSA/Trees]]
- Next: [[Learning/DSA/Trees/Traversals]]
- Related: [[Learning/DSA/Graphs/Basics]] (the general case)
- Practice problems: [[Learning/DSA/Trees/Exercises]]
