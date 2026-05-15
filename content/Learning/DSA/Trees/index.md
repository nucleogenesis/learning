---
title: Trees
tags: [learning, dsa, trees]
lastUpdated: 2026-05-15
---
# Trees — topic hub

## 🎯 Why trees?

Three things you used in the last hour, all powered by trees:

- **Your file system.** `/home/jacob/Journal/pages/...` — that path is a walk down a tree where directories are internal nodes and files are leaves. `ls`, `find`, `du -sh` all do tree traversals.
- **The web page in your browser.** The DOM is a tree of elements. Every time CSS selectors fire or React reconciles, something is walking that tree.
- **Autocomplete in your editor.** Typing `pri` and getting `priority`, `print`, `private` suggested — that's a **trie**, a tree specialized for string prefixes.
  - A few more, slightly less visible:
- **Compilers** parse source code into an **abstract syntax tree** before generating machine code.
- **Databases** use **B-trees** to index rows; that's why `SELECT ... WHERE id = ?` is fast on a billion-row table.
- **Decision trees** in ML are literally trees of if-statements learned from data.
- **Routers** use **tries** (radix trees) to look up IP prefixes for next-hop forwarding.
  - What ties them together: a tree is the structure you reach for whenever data has **a single root and strictly nested children**. Hierarchies, namespaces, parse structures, and ordered sets all fit.
  - Trees are also conceptually the bridge between [[Learning/DSA/Graphs]] (general networks) and the more specialized structures ahead. A tree *is* a graph — connected, undirected, acyclic — but the extra structure (one root, no cycles, parent-child relationships) unlocks algorithms that don't apply to general graphs. You've already met one tree-flavored structure: the binary heap in [[Learning/DSA/Priority-Queue]]. This curriculum makes that intuition explicit and builds on it.

## How to walk this curriculum

Top-to-bottom. Each page has the now-familiar shape:

- A motivating problem first
- A small concrete example with terms introduced inline
- A separate **practice** section below a horizontal rule (for a later session)
- **Flashcards** at the bottom for daily review
- A yes/no self-check before moving on
  - For exercises across all subtopics, see [[Learning/DSA/Trees/Exercises]].

## Curriculum order

- [[Learning/DSA/Trees/Basics]]
  - Terminology: root, leaf, parent/child, depth, height, ancestors/descendants
  - Binary vs n-ary trees; tree vs forest
  - Why a tree is a special graph (acyclic, connected, undirected)
  - Representations: parent-pointer, child-list, struct-of-arrays
- [[Learning/DSA/Trees/Traversals]]
  - DFS orders: pre-order, in-order, post-order (recursive and iterative)
  - Level-order (BFS on a tree)
  - Morris traversal as a stretch (O(1) extra space)
  - Tie-back to general graph DFS
- [[Learning/DSA/Trees/Binary-Search-Trees]]
  - The BST property and what it buys you
  - Search, insert, delete
  - Why balance matters; AVL and Red-Black at a conceptual level
- [[Learning/DSA/Trees/Tries]]
  - Prefix trees for string sets
  - Insert, search, prefix-query
  - Real uses: autocomplete, spell-check, IP routing tables

## Cross-cutting prerequisites

A few non-tree data structures and ideas show up across subtopics. Build them when you hit a page that needs them, not preemptively:

- [[Learning/DSA/Graphs/Traversals]] — BFS/DFS generalize directly to trees; trees are just the easy case (no cycle checks needed)
- [[Learning/DSA/Priority-Queue]] — a binary heap is a *complete binary tree* stored in an array; you already know one tree algorithm without realizing it
- [[Learning/DSA/Stack]] and [[Learning/DSA/Queue]] — needed for iterative traversals and level-order respectively

## 📝 Whiteboard candidates (draw these by hand)

Tree algorithms become visceral when you draw them. Good candidates:

A 7-node binary tree, traced through pre/in/post-order *and* level-order, side by side

A BST insertion sequence — show the tree shape after each insert, then delete a node with two children and show the in-order-successor swap

A trie holding `[cat, car, cart, dog, do]` — every prefix-shared node visible

A skewed BST vs a balanced one with the same keys — show why height matters for search cost

Morris traversal step-by-step on a 5-node tree — show the temporary "thread" edges being created and torn down

## 🔗 Related

- Up: [[Learning/DSA]]
- Related topic: [[Learning/DSA/Graphs]] (trees are the acyclic, connected case)
- Prereq / sibling: [[Learning/DSA/Priority-Queue]] (heap = complete binary tree)
- Exercises: [[Learning/DSA/Trees/Exercises]]
