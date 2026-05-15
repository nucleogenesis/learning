---
title: Graphs
tags: [learning, dsa, graphs]
lastUpdated: 2026-05-14
---

# Graphs — topic hub

A **graph** is a set of vertices `V` and edges `E ⊆ V × V`. Almost everything in DSA can be modeled as a graph: dependency resolution, routing, scheduling, social networks, state machines, game states, etc. That's why this is the right entry point for serious DSA study.

## How to use this hub

Walk the curriculum order top-to-bottom — each subtopic builds on the previous. Each page contains:

- Concept notes (skim → re-read after exercises)
- Inline `#card` flashcards (review daily in Logseq's Cards view)
- Code-it-yourself prompts (write the algorithm from scratch in your current language before reading the canonical version)
- Exercise references at the bottom

## Curriculum order

- [[Learning/DSA/Graphs/Basics]]
  - Vertices, edges, directedness, weights, parallel edges, self-loops
  - Representations: adjacency list, adjacency matrix, edge list
  - Trade-offs (space, lookup, iteration)
- [[Learning/DSA/Graphs/Traversals]]
  - BFS (queue, level-order, shortest path in unweighted graphs)
  - DFS (stack/recursion, pre/post order, tree edges)
- [[Learning/DSA/Graphs/Connectivity]]
  - Connected components (undirected)
  - Cycle detection (undirected with DSU, directed with DFS colors)
  - Bipartite check (2-coloring via BFS)
- [[Learning/DSA/Graphs/Topological-Sort]]
  - Kahn's algorithm (in-degree + queue)
  - DFS-based (post-order reverse)
- [[Learning/DSA/Graphs/Shortest-Paths]]
  - BFS for unweighted
  - Dijkstra (non-negative weights, priority queue)
  - Bellman-Ford (negative weights, detect negative cycles)
  - Floyd-Warshall (all-pairs)
- [[Learning/DSA/Graphs/MST]]
  - Kruskal (sort edges + DSU)
  - Prim (priority queue, like Dijkstra)
- [[Learning/DSA/Graphs/SCC]]
  - Kosaraju (2x DFS, second on transposed graph)
  - Tarjan (single DFS with lowlink)
  - Related: bridges, articulation points

## Companion: exercises & problems

- [[Learning/DSA/Graphs/Exercises]] — curated problem list with TODO markers

## Cross-cutting prerequisites (other DSA topics)

- [[Learning/DSA/Disjoint-Set-Union]] (needed for Kruskal & cycle detection in undirected graphs)
- [[Learning/DSA/Priority-Queue]] (needed for Dijkstra & Prim)
- [[Learning/DSA/Stack]] / [[Learning/DSA/Queue]] (needed for DFS/BFS)

## High-leverage flashcards (graph-level)

- What is a graph, formally? #card
  - A pair `(V, E)` where `V` is a set of vertices and `E ⊆ V × V` (or a multiset, if parallel edges are allowed).
- When does **directedness** matter? #card
  - When the relationship is asymmetric: "A depends on B" ≠ "B depends on A". Affects which traversal/SCC algorithms apply.
- A graph is **dense** when... #card
  - `|E|` is close to `|V|²`. Adjacency matrix often wins here.
- A graph is **sparse** when... #card
  - `|E|` is `O(|V|)` or close. Adjacency list wins (memory + iteration cost).
- Shortest path algorithm to pick by graph type — quick lookup: #card
  - Unweighted → BFS. Non-negative weights → Dijkstra. Negative weights → Bellman-Ford. All-pairs → Floyd-Warshall (small `V`) or repeated Dijkstra.

## Whiteboard ideas (to draw manually)

- A small example graph (5–6 vertices) traced through BFS and DFS step-by-step
- Dijkstra relaxation animation on a weighted graph
- Kruskal's edge-by-edge MST construction with DSU state alongside
