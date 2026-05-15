---
title: Exercises
tags: [learning, dsa, trees, exercises]
lastUpdated: 2026-05-15
---
# Trees — exercises & problem sets

Organized by learning-science principles, not by chronology. Pick sets that match your current skill level and current subtopic. **Interleave deliberately** — drilling 10 traversal problems in a row creates an illusion of mastery; mixing across subtopics builds transfer.

## 📖 How to use this page

- **DO** rotate across difficulty tiers and across exercise *types* (write-from-scratch, debug, teach-back) in a single session.
- **DO** spend ~5 minutes *predicting* before coding — wrong predictions are valuable data, not failures.
- **DO** time-box: if stuck for 25 minutes, write down what you tried, why, and move on. Come back the next day. Spacing > grinding.
- **DON'T** read editorial solutions before writing your own attempt. Worked examples help *before* you struggle (initial schema-building) or *after* you've failed (calibrating your model). Reading mid-attempt short-circuits the generation effect.
- **DON'T** mark `DONE` until you can re-solve it on a blank file a week later. Use `RECHECK` for "solved once, not yet retained."
  - Status markers used below: `TODO` not started · `LATER` paused · `DOING` active · `DONE` solved & retained · `RECHECK` solved once, retest next week.

## 🌱 Tier 1 — orienting (read & trace, no coding yet)

Pure recognition. Build the schema *before* problem-solving load kicks in.

- TODO Skim [Wikipedia: Tree (data structure)](https://en.wikipedia.org/wiki/Tree_(data_structure)) — note any term you can't define.
- TODO Skim [Wikipedia: Tree traversal](https://en.wikipedia.org/wiki/Tree_traversal) — focus on the pre/in/post-order diagrams.
- TODO Skim [CP-Algorithms: Binary Search Tree](https://cp-algorithms.com/data_structures/binary_tree.html).
- TODO Skim [CP-Algorithms: Trie](https://cp-algorithms.com/string/aho_corasick.html) — first half is just plain tries; second half is Aho-Corasick (a trie extension for multi-pattern matching).
- TODO Read about [AVL trees on Wikipedia](https://en.wikipedia.org/wiki/AVL_tree) and look at one rotation diagram. No code yet — just see what a rotation *looks* like.
- TODO Trace pre/in/post-order traversals on a 7-node binary tree you draw on paper. Confirm each traversal's output by hand before checking.
- TODO Trace BST insertion of `[5, 2, 8, 1, 3, 7, 9, 4]` on paper, then do `delete(2)` and `delete(8)`. Sketch the tree at each step.
- TODO Trace trie insertion of `[cat, car, cart, dog, do]` on paper. Mark end-of-word nodes.

## 🔨 Tier 2 — write-from-scratch (foundational)

Implement each in a blank file in your current language. **No copying.** Test on tiny inputs (3–5 nodes) by hand first.

### Tree basics

- TODO `class Node` with `value`, `left`, `right` plus helpers (`is_leaf`, `__repr__`).
- TODO `build_tree_from_parent_array(parent: list[int]) -> Node` — given the parent-pointer representation, build the linked-node tree. Return the root.
- TODO `tree_to_parent_array(root, name_of: dict) -> list[int]` — the inverse.
- TODO `size(root) -> int` and `height(root) -> int` (both `O(n)` recursive).
- TODO `is_balanced(root) -> bool` — `True` if for every node, `|height(left) - height(right)| ≤ 1`.

### Traversals

- TODO `preorder_recursive(root) -> list[V]`.
- TODO `inorder_recursive(root) -> list[V]`.
- TODO `postorder_recursive(root) -> list[V]`.
- TODO `preorder_iterative(root) -> list[V]` — explicit stack.
- TODO `inorder_iterative(root) -> list[V]` — descend-left-then-pop pattern.
- TODO `postorder_iterative(root) -> list[V]` — reverse-of-modified-preorder.
- TODO `level_order(root) -> list[list[V]]` — grouped by level (size-snapshot trick).
- TODO `morris_inorder(root) -> list[V]` — `O(1)` space.
- TODO `serialize(root) -> str` and `deserialize(s) -> Node` — pre-order with `None` markers (LC 297).

### Binary search trees

- TODO `bst_search(root, key) -> Node | None` (iterative and recursive versions).
- TODO `bst_insert(root, key) -> Node` (recursive; return-and-reassign).
- TODO `bst_delete(root, key) -> Node` — all three cases (leaf, one child, two children).
- TODO `bst_min(root) -> Node` and `bst_max(root) -> Node`.
- TODO `bst_successor(root, key) -> Node | None` (in-order successor).
- TODO `is_valid_bst(root) -> bool` — both via in-order + monotonicity check, and via `(lo, hi)` bounds.
- TODO `kth_smallest(root, k) -> V` — in-order with early exit (LC 230).
- TODO `bst_lca(root, p, q) -> Node` — using the BST property (LC 235).
- TODO `bst_to_sorted_list(root) -> list[V]` — should literally be one line if you already wrote `inorder_recursive`.
- TODO `sorted_list_to_balanced_bst(sorted_list) -> Node` — recursive midpoint (LC 108).

### Tries

- TODO `class Trie` with `insert`, `search`, `starts_with` (LC 208).
- TODO `class TrieNode` augmented with `word_count` and `prefix_count`.
- TODO `words_with_prefix(trie, prefix) -> list[str]` — autocomplete-style enumeration.
- TODO `WordDictionary` with `.`-wildcard search (LC 211).
- TODO `replaceWords(roots, sentence) -> str` (LC 648).
- TODO `MapSum` with `insert(key, val)` and `sum(prefix) -> int` (LC 677).

### Self-balancing BSTs (stretch — optional)

Don't tackle these for interview prep. Tackle them if you want to understand the *why* of balanced trees beyond surface level. Most engineers go their whole career without implementing one and it's fine.

- TODO `class AVLTree` with `insert`, `delete`, `search` — handle the four rotation cases (LL, RR, LR, RL).
- TODO `class RedBlackTree` — color-based rebalancing. Notoriously tricky to implement from scratch; well-trodden territory but lots of edge cases.
- TODO `class Treap` — random-priority-based; arguably the easiest to implement of the balanced BSTs.

## 📋 Tier 3 — guided LeetCode (easy → medium → hard, by subtopic)

### Traversal & basic structure

- TODO LC 94 — Binary Tree Inorder Traversal *(easy)*
- TODO LC 144 — Binary Tree Preorder Traversal *(easy)*
- TODO LC 145 — Binary Tree Postorder Traversal *(easy)*
- TODO LC 102 — Binary Tree Level Order Traversal *(medium)*
- TODO LC 103 — Binary Tree Zigzag Level Order Traversal *(medium)*
- TODO LC 107 — Binary Tree Level Order Traversal II *(medium)* — bottom-up
- TODO LC 199 — Binary Tree Right Side View *(medium)*
- TODO LC 314 — Binary Tree Vertical Order Traversal *(medium)*
- TODO LC 987 — Vertical Order Traversal of a Binary Tree *(hard)*
- TODO LC 429 — N-ary Tree Level Order Traversal *(medium)*

### Structural questions

- TODO LC 104 — Maximum Depth of Binary Tree *(easy)*
- TODO LC 111 — Minimum Depth of Binary Tree *(easy)* — BFS wins
- TODO LC 226 — Invert Binary Tree *(easy)*
- TODO LC 101 — Symmetric Tree *(easy)*
- TODO LC 100 — Same Tree *(easy)*
- TODO LC 110 — Balanced Binary Tree *(easy)*
- TODO LC 543 — Diameter of Binary Tree *(easy)*
- TODO LC 222 — Count Complete Tree Nodes *(easy/medium)* — `O(log²n)` solution exists
- TODO LC 572 — Subtree of Another Tree *(easy)*
- TODO LC 116 — Populating Next Right Pointers in Each Node *(medium)*
- TODO LC 117 — Populating Next Right Pointers in Each Node II *(medium)*
- TODO LC 124 — Binary Tree Maximum Path Sum *(hard)* — the classic two-passes-per-node trick

### Path & ancestor problems

- TODO LC 112 — Path Sum *(easy)*
- TODO LC 113 — Path Sum II *(medium)*
- TODO LC 437 — Path Sum III *(medium)* — prefix-sum-in-a-tree trick
- TODO LC 257 — Binary Tree Paths *(easy)*
- TODO LC 129 — Sum Root to Leaf Numbers *(medium)*
- TODO LC 236 — Lowest Common Ancestor of a Binary Tree *(medium)*
- TODO LC 235 — Lowest Common Ancestor of a BST *(medium)* — BST version is much easier
- TODO LC 1644 — LCA of a Binary Tree II *(medium)*

### BST-specific

- TODO LC 98 — Validate Binary Search Tree *(medium)*
- TODO LC 700 — Search in a Binary Search Tree *(easy)*
- TODO LC 701 — Insert into a Binary Search Tree *(medium)*
- TODO LC 450 — Delete Node in a BST *(medium)*
- TODO LC 230 — Kth Smallest Element in a BST *(medium)*
- TODO LC 173 — Binary Search Tree Iterator *(medium)*
- TODO LC 538 — Convert BST to Greater Tree *(medium)* — reverse in-order
- TODO LC 99 — Recover Binary Search Tree *(medium)* — two swapped nodes; find them in `O(n)`
- TODO LC 108 — Convert Sorted Array to BST *(easy)*
- TODO LC 109 — Convert Sorted List to BST *(medium)*
- TODO LC 1382 — Balance a Binary Search Tree *(medium)*

### Trie problems

- TODO LC 208 — Implement Trie (Prefix Tree) *(medium)*
- TODO LC 211 — Design Add and Search Words Data Structure *(medium)* — `.` wildcards
- TODO LC 648 — Replace Words *(medium)*
- TODO LC 677 — Map Sum Pairs *(medium)*
- TODO LC 720 — Longest Word in Dictionary *(easy/medium)*
- TODO LC 745 — Prefix and Suffix Search *(hard)*
- TODO LC 212 — Word Search II *(hard)* — trie + DFS on a grid
- TODO LC 421 — Maximum XOR of Two Numbers in an Array *(medium)* — binary trie

### Construction from traversals

- TODO LC 105 — Construct Binary Tree from Preorder and Inorder Traversal *(medium)*
- TODO LC 106 — Construct Binary Tree from Inorder and Postorder Traversal *(medium)*
- TODO LC 889 — Construct Binary Tree from Preorder and Postorder Traversal *(medium)* — non-unique answers
- TODO LC 297 — Serialize and Deserialize Binary Tree *(hard)*
- TODO LC 449 — Serialize and Deserialize BST *(medium)*

### Tree DP & subtree DP

- TODO LC 337 — House Robber III *(medium)* — DP over a tree
- TODO LC 968 — Binary Tree Cameras *(hard)* — greedy/DP on a tree
- TODO LC 834 — Sum of Distances in Tree *(hard)* — re-rooting technique

## 🔀 Tier 4 — interleaved practice sets

- **The point of these sets is variety.** Solve them in the order listed (don't reshuffle).

### Set A — traversals + structure (1 hour, 3 problems)

LC 94 — Inorder Traversal *(iterative, no recursion)*

LC 226 — Invert Binary Tree *(recursive shape change)*

LC 199 — Right Side View *(BFS with size-snapshot)*

### Set B — BST core

- LC 700 — Search in BST *(warmup)*

LC 98 — Validate BST *(both approaches: in-order, bounds)*

LC 230 — Kth Smallest in BST *(early-exit in-order)*

### Set C — paths and ancestors

- LC 112 — Path Sum *(basic DFS)*

LC 236 — LCA of a Binary Tree *(general, no BST property)*

LC 235 — LCA of a BST *(compare with 236 — feel the difference)*

### Set D — trie cluster

- LC 208 — Implement Trie
- LC 648 — Replace Words *(uses 208's trie)*

LC 211 — Word Dictionary *(wildcard search; small twist on 208)*

### Set E — construction & serialization

- LC 105 — Build from preorder + inorder
- LC 297 — Serialize/Deserialize binary tree

LC 449 — Serialize/Deserialize BST *(compare: BST version is shorter)*

### Set F — tree DP / advanced

- LC 124 — Max Path Sum *(two-passes-per-node)*
- LC 337 — House Robber III *(DP on a tree)*

LC 543 — Diameter of Binary Tree *(simpler version of 124's pattern)*

### Set G — late-stage mixed challenge

- LC 212 — Word Search II *(trie + DFS grid)*
- LC 99 — Recover BST *(two-swapped-nodes trick)*

LC 834 — Sum of Distances in Tree *(re-rooting)*

## 🐛 Tier 5 — debug-this (find bugs in plausible code)

For each, **predict the bug before running**. Compose them yourself by introducing the bug into a known-good version.

- TODO Snippet: recursive in-order that prints in pre-order accidentally. *Hidden bug: the print line is above the left recursion instead of between left and right.*
- TODO Snippet: `is_bst` using just `node.left.value < node.value < node.right.value` at each node. *Hidden bug: ignores transitive constraints; e.g., `[10, 5, 15, null, null, 6, 20]` falsely validates because 6 < 15 locally even though 6 < 10 globally.*
- TODO Snippet: BST delete that uses the immediate left child as "predecessor" instead of the rightmost descendant of the left subtree. *Hidden bug: violates BST property whenever the left subtree has any right descendants.*
- TODO Snippet: BST delete that handles two children by recursively deleting one of them. *Hidden bug: doesn't actually solve the case — you still have two unparented children to glue back.*
- TODO Snippet: Recursive `height` returning `1 + max(...)` with `None` base case returning `0`. *Hidden bug: off-by-one — single-node tree gets height 1, not 0.*
- TODO Snippet: Iterative pre-order that pushes left before right. *Hidden bug: visits right before left.*
- TODO Snippet: Trie search that returns `True` whenever the path exists. *Hidden bug: no `is_end` check — conflates search with starts_with.*
- TODO Snippet: Trie insert that overwrites existing children at each step. *Hidden bug: shared prefixes get clobbered.*
- TODO Snippet: Level-order that doesn't snapshot queue size. *Hidden bug: levels get merged into one flat list, or grouping becomes nonsense.*
- TODO Snippet: BST `kth_smallest` doing full in-order + index. *Not a bug per se, but `O(n)` instead of the `O(k + h)` early-exit version. Worth contrasting.*
- TODO Snippet: Building a BST by repeatedly calling `insert` on a sorted array. *Hidden bug: produces a degenerate right spine. Use a midpoint-recursion builder instead.*

## 🗣️ Tier 6 — teach-it-back prompts

Write or record a 2–4 minute explanation for each. If you can't, that's the lesson.

- TODO Explain the BST property and **prove** that in-order traversal yields sorted output. (One-paragraph proof.)
- TODO Explain why deleting a node with two children requires the in-order successor or predecessor trick — and why you can't just promote either child directly.
- TODO Explain depth vs height in one sentence each. Why are they easy to confuse?
- TODO Explain Morris traversal. Why does it achieve `O(1)` space, and what's the trade-off?
- TODO Walk through how a router uses a trie (specifically a radix tree) to find the longest matching IP prefix.
- TODO Explain why a self-balancing BST is `O(log n)` but a plain BST is worst-case `O(n)`. Construct an adversarial input.
- TODO Compare AVL vs Red-Black trees: when would you reach for each? Why does the standard library prefer Red-Black?
- TODO Explain why level-order traversal needs the "queue-size snapshot" trick to group output by level.
- TODO Explain the relationship between graph DFS (from [[Learning/DSA/Graphs/Traversals]]) and tree pre/in/post-order. What changes when you move from trees to general graphs?
- TODO Explain why a binary heap (from [[Learning/DSA/Priority-Queue]]) is "the same shape" as a complete binary tree — and why the array-index trick works.

## 🏆 Tier 7 — CSES (when you're ready for competitive-programming difficulty)

The [CSES Problem Set](https://cses.fi/problemset/) has a dedicated "Tree Algorithms" section. Save these for after Tiers 3–5 feel easy. Most of them are about **tree DP** and **DFS-based subtree queries** — closer to the algorithmic edge of trees than the LeetCode set.

### Basic tree algorithms

- TODO CSES 1130 — Tree Matching *(maximum matching on a tree, classic tree DP)*
- TODO CSES 1131 — Tree Diameter *(two-DFS trick OR single DFS with two longest paths)*
- TODO CSES 1132 — Tree Distances I *(distance from each node to the farthest, re-rooting)*
- TODO CSES 1133 — Tree Distances II *(sum of distances from each node, re-rooting)*

### Subtree queries

- TODO CSES 1136 — Subtree Queries *(Euler tour + point update / subtree sum query)*
- TODO CSES 1137 — Path Queries *(Euler tour + path sum)*

### LCA and binary lifting

- TODO CSES 1135 — Distances *(LCA via binary lifting; distance = depth(u) + depth(v) − 2·depth(lca))*
- TODO CSES 1688 — Company Queries I *(k-th ancestor; binary lifting)*
- TODO CSES 1689 — Company Queries II *(LCA via binary lifting)*

### Heavy-light decomposition territory

- TODO CSES 2134 — Path Queries II *(heavy-light decomposition or LCA + segment tree)*

## ⏱️ Spacing rhythm (suggested)

This is the part most people skip and most regret.

- **Daily (5–10 min)**: Logseq flashcard queue. No exceptions; it's 5 minutes.
- **Every other day (45–90 min)**: 1 Tier 2 implementation OR 1 interleaved set OR 2 Tier 3 problems.
- **Weekly (15 min)**: Pick a `RECHECK` task. Re-solve on a blank file. If it stuck, mark `DONE`. If not, leave `RECHECK` and try again next week.
- **End of subtopic**: Do the teach-it-back prompts for that subtopic. If any feels mushy, return to that subtopic's worked examples.

## 🔗 Related

Up: [[Learning/DSA/Trees]]

Subtopics: [[Learning/DSA/Trees/Basics]] · [[Learning/DSA/Trees/Traversals]] · [[Learning/DSA/Trees/Binary-Search-Trees]] · [[Learning/DSA/Trees/Tries]]

Sibling / prereq: [[Learning/DSA/Priority-Queue]] (heap = complete binary tree)

Related topic: [[Learning/DSA/Graphs/Exercises]]
