---
title: Graphs
tags: [topic/dsa, topic/graphs, kind/hub]
lastUpdated: 2026-05-15
---
# Graphs — topic hub

## 🎯 Why graphs first?

Three concrete problems, all from things you use every day:

- **Google Maps** finds the fastest route from A to B by treating intersections as vertices and roads as weighted edges, then running a shortest-path algorithm.
- **Package managers** (`npm install`, `apt`, `cargo`) decide install order by treating packages as vertices, dependencies as directed edges, then topologically sorting the resulting DAG.
- **Spell-check / autocomplete** lays out the dictionary as a graph (trie or DAWG), then walks it to find close matches to what you typed.
  - Different domains, same data structure. Graphs are the most *general* data structure in this curriculum — they generalize trees (a graph), lists (a path graph), and even state machines (a labeled graph). Most algorithms you'll meet in DSA can be expressed as "do BFS/DFS on this graph, with some bookkeeping."
  - That's why it's worth taking this topic slowly and building real fluency before moving on to trees and DP.

## How to walk this curriculum

Top-to-bottom. Each page builds on the previous one. Each page has:

A motivating problem at the top — *why* this matters before *what* it is

A small concrete example with terminology introduced inline

A separate **practice** section (worked → faded → blank, plus debug-this and teach-it-back) for a later session

A **flashcards** section at the bottom for daily review (don't drill them on first read — that's cramming)

A yes/no self-check before you move on

For exercises across all subtopics, see [[Learning/DSA/Graphs/Exercises]].

## Curriculum order

- [[Learning/DSA/Graphs/Basics]]
  - Vertices, edges, directedness, weights, parallel edges, self-loops
  - Representations: adjacency list, adjacency matrix, edge list
  - Trade-offs (space, lookup, iteration)
- [[Learning/DSA/Graphs/Traversals]]
  - BFS (FIFO queue, layer-order, shortest path in unweighted graphs)
  - DFS (LIFO stack / recursion, pre/post order, back edges)
- [[Learning/DSA/Graphs/Connectivity]] *(not yet written)*
  - Connected components (undirected)
  - Cycle detection (undirected with DSU, directed with DFS colors)
  - Bipartite check (2-coloring via BFS)
- [[Learning/DSA/Graphs/Topological-Sort]] *(not yet written)*
  - Kahn's algorithm (in-degree + queue)
  - DFS-based (post-order reverse)
- [[Learning/DSA/Graphs/Shortest-Paths]] *(not yet written)*
  - BFS for unweighted
  - Dijkstra (non-negative weights, priority queue)
  - Bellman-Ford (negative weights, detect negative cycles)
  - Floyd-Warshall (all-pairs)
- [[Learning/DSA/Graphs/MST]] *(not yet written)*
  - Kruskal (sort edges + DSU)
  - Prim (priority queue, like Dijkstra)
- [[Learning/DSA/Graphs/SCC]] *(not yet written)*
  - Kosaraju (2× DFS, second on transposed graph)
  - Tarjan (single DFS with lowlink)
  - Related: bridges, articulation points

## Cross-cutting prerequisites

A few non-graph data structures show up across multiple subtopics. Build them when you hit a subtopic that needs them, not preemptively:

- [[Learning/DSA/Disjoint-Set-Union]] — needed for Kruskal's MST and for undirected cycle detection
- [[Learning/DSA/Priority-Queue]] — needed for Dijkstra and Prim
- [[Learning/DSA/Stack]] and [[Learning/DSA/Queue]] — needed for DFS and BFS respectively (the standard library version is usually enough)

## 📝 Whiteboard candidates (draw these by hand)

Algorithm traces stick much better when you draw the state at each step. Good candidates as you progress:

A 5–6 vertex undirected graph, traced step-by-step through BFS *and* DFS, side by side

Dijkstra's relaxation on a small weighted graph — show the priority queue contents at each pop

Kruskal's MST edge-by-edge — show DSU state alongside, with each component as a colored region

White/gray/black DFS coloring on a small directed graph, with the cycle highlighted when found

## 🔗 Related

Up: [[Learning/DSA]]

Exercises: [[Learning/DSA/Graphs/Exercises]]
