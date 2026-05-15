---
title: DSA
tags: [learning, dsa, index]
lastUpdated: 2026-05-15
---
# Learning/DSA

Personal study hub for **Data Structures & Algorithms**. Each topic page mixes concept notes, inline `#card` flashcards (Logseq spaced repetition), and exercises.

## Conventions used in this namespace

- **Flashcards**: any block tagged `#card` is a flashcard. The block content is the question; nested child blocks are the answer. For cloze deletion use `{{cloze answer}}` inline.
- **Linking**: liberal use of `[[Learning/DSA/...]]` wiki-links so the graph view shows prerequisites and relationships.
- **Exercises**: each subtopic page has its own exercise list with `TODO` markers; mark `DONE` once solved.
- **Whiteboard**: hand-drawn algorithm traces live on dedicated Logseq whiteboards, referenced from the relevant subtopic.

## Curriculum (Graphs)

- [[Learning/DSA/Graphs]]
  - [[Learning/DSA/Graphs/Basics]] — definitions, representations
  - [[Learning/DSA/Graphs/Traversals]] — BFS, DFS
  - [[Learning/DSA/Graphs/Connectivity]] — components, cycle detection, bipartite
  - [[Learning/DSA/Graphs/Topological-Sort]] — Kahn, DFS-based
  - [[Learning/DSA/Graphs/Shortest-Paths]] — Dijkstra, Bellman-Ford, Floyd-Warshall
  - [[Learning/DSA/Graphs/MST]] — Kruskal, Prim
  - [[Learning/DSA/Graphs/SCC]] — Kosaraju, Tarjan
  - [[Learning/DSA/Graphs/Exercises]]

## Curriculum (Trees)

- [[Learning/DSA/Trees]]
  - [[Learning/DSA/Trees/Basics]] — terminology, representations, why a tree is just a constrained graph
  - [[Learning/DSA/Trees/Traversals]] — pre/in/post-order, level-order, Morris (O(1) space)
  - [[Learning/DSA/Trees/Binary-Search-Trees]] — search/insert/delete, balance (AVL & Red-Black, conceptual)
  - [[Learning/DSA/Trees/Tries]] — prefix trees, autocomplete, longest-prefix match
  - [[Learning/DSA/Trees/Exercises]]

The heap from [[Learning/DSA/Priority-Queue]] is the tree-flavored prereq — a complete binary tree stored implicitly in an array. Reading the BST and traversals pages alongside it is good cross-reinforcement.

## Cross-topic prereqs and data structures

These show up across multiple topics. Build them when a topic needs them, not preemptively:

- [[Learning/DSA/Priority-Queue]] — binary heap; used by Dijkstra, Prim, and as a tree-structure warmup
- [[Learning/DSA/Disjoint-Set-Union]] — Union-Find; used by Kruskal and undirected cycle detection
- [[Learning/DSA/Stack]] and [[Learning/DSA/Queue]] — the workhorses behind DFS / BFS

## Future topics (not yet started)

- Arrays & strings
- Linked lists
- Hash tables
- Dynamic programming
- Greedy
- Backtracking

## Review workflow

Daily: open Logseq flashcard queue (`Cards` left-panel item) to drill due cards.

Weekly: solve 3–5 exercises from the current topic.

Per concept: re-derive the algorithm by hand or in code before checking notes.
