---
title: Exercises
tags: [topic/dsa, topic/graphs, kind/exercises]
lastUpdated: 2026-05-15
---
# Graphs — exercises & problem sets

Organized by learning-science principles, not by chronology. Pick sets that match your current skill level and current subtopic. **Interleave deliberately** — drilling 10 BFS problems in a row gives an illusion of mastery; mixing builds transfer.

## 📖 How to use this page

- **DO** rotate across difficulty tiers and across exercise *types* (write-from-scratch, debug, teach-back) in a single session.
- **DO** spend ~5 minutes *predicting* before coding — wrong predictions are valuable data, not failures.
- **DO** time-box: if stuck for 25 minutes, write down what you tried, why, and move on. Come back the next day. Spacing > grinding.
- **DON'T** read editorial solutions before writing your own attempt. Worked examples help *before* you struggle (initial schema-building) or *after* you've failed (calibrating your model). Reading them mid-attempt short-circuits the generation effect.
- **DON'T** mark `DONE` until you can re-solve it on a blank file a week later. Use a `RECHECK` marker for "solved once, not yet retained".
  - Status markers used below: `TODO` not started · `LATER` in flight or paused · `DOING` active · `DONE` solved & retained · `RECHECK` solved once, retest next week.

## 🌱 Tier 1 — orienting (read & trace, no coding yet)

Pure recognition. Goal: build the schema *before* problem-solving load kicks in.

- TODO Read [Wikipedia: Graph (abstract data type)](https://en.wikipedia.org/wiki/Graph_(abstract_data_type)) — skim, note any term you can't define.
- TODO Skim [CP-Algorithms: Breadth-First Search](https://cp-algorithms.com/graph/breadth-first-search.html) — focus on the pseudocode and one example trace.
- TODO Skim [CP-Algorithms: Depth-First Search](https://cp-algorithms.com/graph/depth-first-search.html).
- TODO Skim [CP-Algorithms: Dijkstra](https://cp-algorithms.com/graph/dijkstra.html).
- TODO Trace BFS and DFS by hand on a graph you drew on paper. Confirm visit order matches what the algorithm should produce.
- TODO Trace Dijkstra by hand on a 5-vertex weighted graph; verify your distances against a computed answer.

## 🔨 Tier 2 — write-from-scratch (foundational)

Implement each in a blank file in your current language. **No copying.** Test on tiny inputs (3–5 vertices) by hand first.

### Representations & basic traversal

- TODO `build_adjacency_list(edges, directed)` — handles directed/undirected, isolated vertices OK.
- TODO `adj_list_to_adj_matrix(adj, vertices)` and inverse.
- TODO `bfs(graph, start) -> visit_order`.
- TODO `bfs_distances(graph, start) -> dict[V, int]`.
- TODO `bfs_path(graph, start, goal) -> list[V] | None`.
- TODO `dfs_recursive(graph, start) -> visit_order`.
- TODO `dfs_iterative(graph, start) -> visit_order` — match the recursive order if you can.
- TODO `dfs_postorder(graph, start) -> list[V]`.

### Connectivity & toposort

- TODO `connected_components(graph) -> list[list[V]]` (undirected).
- TODO `has_cycle_undirected(graph) -> bool` (DFS-with-parent).
- TODO `has_cycle_directed(graph) -> bool` (white-gray-black).
- TODO `is_bipartite(graph) -> bool` (BFS 2-coloring).
- TODO `topo_sort_kahn(graph) -> list[V]` with cycle detection.
- TODO `topo_sort_dfs(graph) -> list[V]` with cycle detection.

### Prereq data structures

- TODO `DSU` class with `find`, `union`, path compression, union-by-rank.
- TODO `MinHeap` class with `push`, `pop`, `peek`, `heapify`.
- TODO `find_cycle(graph) -> list[V] | None` — reconstruct a directed cycle, not just yes/no.

### Shortest paths

- TODO `dijkstra(graph, source) -> dict[V, int]` with priority queue.
- TODO `dijkstra_with_path(graph, source) -> (dist, parent)` and path reconstruction.
- TODO `bellman_ford(edges, source) -> dist | "negative cycle"`.
- TODO `floyd_warshall(num_vertices, edges) -> matrix`.
- TODO `bfs_0_1(graph, source) -> dist` for 0-1 weighted graphs (deque-based).

### MST

- TODO `kruskal(vertices, edges) -> mst, weight` using DSU.
- TODO `prim(graph, start) -> mst, weight` using priority queue.

### SCC, bridges, articulation points

- TODO `kosaraju(graph) -> list[set[V]]`.
- TODO `tarjan_scc(graph) -> list[set[V]]`.
- TODO `bridges(graph) -> list[edge]` undirected.
- TODO `articulation_points(graph) -> set[V]` undirected.

## 📋 Tier 3 — guided LeetCode (easy → medium → hard, by subtopic)

### Representations & degree reasoning

- TODO LC 997 — Find the Town Judge *(easy)*
- TODO LC 1971 — Find if Path Exists in Graph *(easy)*

### BFS / DFS — traversal

- TODO LC 200 — Number of Islands *(medium)*
- TODO LC 133 — Clone Graph *(medium)*
- TODO LC 695 — Max Area of Island *(medium)*
- TODO LC 1091 — Shortest Path in Binary Matrix *(medium)*
- TODO LC 994 — Rotting Oranges *(medium)* — **multi-source BFS**
- TODO LC 1162 — As Far from Land as Possible *(medium)* — multi-source BFS

### Connectivity & components

- TODO LC 547 — Number of Provinces *(medium)*
- TODO LC 323 — Number of Connected Components in an Undirected Graph *(medium)*
- TODO LC 261 — Graph Valid Tree *(medium)*
- TODO LC 785 — Is Graph Bipartite? *(medium)*
- TODO LC 886 — Possible Bipartition *(medium)*
- TODO LC 684 — Redundant Connection *(medium)* — classic DSU
- TODO LC 305 — Number of Islands II *(hard)* — DSU on a grid

### Topological sort

- TODO LC 207 — Course Schedule *(medium)*
- TODO LC 210 — Course Schedule II *(medium)*
- TODO LC 269 — Alien Dictionary *(hard)* — toposort over implicit constraints

### Shortest paths

- TODO LC 743 — Network Delay Time *(medium)* — Dijkstra
- TODO LC 1631 — Path With Minimum Effort *(medium)* — Dijkstra-style on a grid
- TODO LC 787 — Cheapest Flights Within K Stops *(medium)* — Bellman-Ford or modified BFS
- TODO LC 1514 — Path with Maximum Probability *(medium)* — Dijkstra variant
- TODO LC 1334 — Find the City With the Smallest Number of Neighbors at a Threshold Distance *(medium)* — Floyd-Warshall is the cleanest fit
- TODO LC 778 — Swim in Rising Water *(hard)* — modified Dijkstra (min over max instead of sum)

### MST

- TODO LC 1584 — Min Cost to Connect All Points *(medium)* — Prim or Kruskal on geometric graph
- TODO LC 1135 — Connecting Cities With Minimum Cost *(medium)*
- TODO LC 1168 — Optimize Water Distribution in a Village *(hard)* — MST with a clever virtual-vertex trick

### SCC, bridges, articulation

- TODO LC 1192 — Critical Connections in a Network *(hard)* — bridges via Tarjan's lowlink
- TODO LC 928 — Minimize Malware Spread II *(hard)* — articulation-point-flavored reasoning
- TODO LC 1568 — Minimum Number of Days to Disconnect Island *(hard)* — articulation points on a grid

## 🔀 Tier 4 — interleaved practice sets

- **The point of these sets is variety.** Solve them in the order listed (don't reshuffle into nice topical clumps).

### Set A — traversal + cycle (1 hour, 3 problems)

- LC 200 — Number of Islands *(traversal)*

LC 207 — Course Schedule *(directed cycle detection)*

- LC 785 — Is Graph Bipartite? *(BFS coloring)*

### Set B — toposort + multi-source BFS

- LC 1971 — Path Exists *(basic traversal)*
- LC 210 — Course Schedule II *(topological)*
- LC 994 — Rotting Oranges *(multi-source BFS)*

### Set C — components + DSU

LC 547 — Number of Provinces *(BFS/DFS components)*

LC 684 — Redundant Connection *(DSU cycle detection)*

LC 261 — Graph Valid Tree *(combine: undirected cycle + connectivity)*

### Set D — weighted shortest paths

- LC 743 — Network Delay Time *(Dijkstra)*

LC 787 — Cheapest Flights *(Bellman-Ford / modified BFS)*

LC 1631 — Path With Minimum Effort *(Dijkstra variant)*

### Set E — MST + Dijkstra cross-train

LC 1584 — Min Cost to Connect All Points *(MST)*

LC 743 — Network Delay Time *(Dijkstra; notice the shared priority-queue structure)*

LC 1135 — Connecting Cities *(MST again, on a different input format — does Prim or Kruskal feel more natural?)*

### Set F — late-stage mixed challenge

- LC 1192 — Critical Connections *(bridges)*

LC 778 — Swim in Rising Water *(modified Dijkstra)*

LC 269 — Alien Dictionary *(toposort over implicit constraints)*

## 🐛 Tier 5 — debug-this (find bugs in plausible code)

For each, **predict the bug before running**. Save the snippets locally if you want to actually execute.

- TODO Snippet: BFS that marks visited on dequeue. *Hidden bug: O(E) memory.*
- TODO Snippet: DFS without a visited set on a graph with a cycle. *Hidden bug: stack overflow.*
- TODO Snippet: directed cycle detection that uses a boolean visited set instead of three colors. *Hidden bug: false cycle reports across disjoint trees.*
- TODO Snippet: undirected cycle detection that uses white-gray-black naively. *Hidden bug: every undirected edge reports as a cycle.*
- TODO Snippet: topological sort via DFS that returns vertices in finish order (not reversed). *Hidden bug: order is exactly backwards.*
- TODO Snippet: Dijkstra without the "stale entry" check. *Hidden bug: revisits cause exponential blowup on adversarial inputs.*
- TODO Snippet: Dijkstra running on a graph with a single negative edge. *Hidden bug: silent wrong answer.*
- TODO Snippet: Kruskal without sorting edges first. *Hidden bug: returns a valid spanning tree but not the minimum.*
- TODO Snippet: DSU without union-by-rank. *Hidden bug: O(n) per find on adversarial sequences.*
- TODO Snippet: Kosaraju's pass 2 on the original graph instead of the transpose. *Hidden bug: SCCs get merged into giant components.*
  - (Compose these snippets yourself by introducing the bug into a known-good version — generation effect again.)

## 🗣️ Tier 6 — teach-it-back prompts

Write or record a 2–4 minute explanation for each. If you can't, that's the lesson.

- TODO Explain why BFS finds shortest paths only on unweighted graphs. Give a counterexample.
- TODO Explain the white-gray-black trick for directed cycle detection. Why won't a single visited set work?
- TODO Explain how a multi-source BFS differs from a regular BFS, and one problem it's ideal for.
- TODO Explain why iterative DFS produces a different visit order than recursive DFS, and how to make them match.
- TODO Explain when adjacency matrix beats adjacency list, with a real scenario.
- TODO Explain why DFS post-order is *reverse* topological order.
- TODO Explain why Dijkstra fails on negative weights and which algorithm replaces it.
- TODO Explain the role of DSU in Kruskal's MST. What goes wrong without union-by-rank?
- TODO Explain Kosaraju's two-pass algorithm. Why does pass 2 use the transpose?
- TODO Explain the "lazy deletion" trick in Dijkstra/Prim and why it's necessary with a plain binary heap.

## 🏆 Tier 7 — CSES (when you're ready for competitive-programming difficulty)

The [CSES Problem Set](https://cses.fi/problemset/) has the cleanest graph progression I've found. Save these for after Tier 3–5 feels easy.

### Connectivity & basic traversal

- TODO CSES 1666 — Building Roads *(connected components)*
- TODO CSES 1667 — Message Route *(BFS shortest path)*
- TODO CSES 1668 — Building Teams *(bipartite check)*

### Cycles

- TODO CSES 1669 — Round Trip *(undirected cycle reconstruction)*
- TODO CSES 1678 — Round Trip II *(directed cycle reconstruction)*

### Toposort

- TODO CSES 1679 — Course Schedule *(toposort)*
- TODO CSES 1680 — Longest Flight Route *(DP on DAG, after toposort)*

### Shortest paths

- TODO CSES 1671 — Shortest Routes I *(Dijkstra)*
- TODO CSES 1672 — Shortest Routes II *(Floyd-Warshall)*
- TODO CSES 1673 — Flight Discount *(Dijkstra with a twist — track "discount used or not")*
- TODO CSES 1197 — Cycle Finding *(Bellman-Ford with negative cycle detection)*

### MST

- TODO CSES 1675 — Road Reparation *(MST)*
- TODO CSES 1676 — Road Construction *(DSU + counting components as edges added)*

### SCC

- TODO CSES 1682 — Flight Routes Check *(SCC: graph is one SCC iff strongly connected)*
- TODO CSES 1683 — Planets and Kingdoms *(SCC partitioning)*
- TODO CSES 1684 — Giant Pizza *(2-SAT via SCC on the implication graph — the boss-level SCC problem)*

## ⏱️ Spacing rhythm (suggested)

This is the part most people skip and most regret skipping.

- **Daily (5–10 min)**: Logseq flashcard queue. No exceptions; it's 5 minutes.
- **Every other day (45–90 min)**: 1 Tier 2 implementation OR 1 interleaved set OR 2 Tier 3 problems.
- **Weekly (15 min)**: Pick a `RECHECK` task. Re-solve on a blank file. If it stuck, mark `DONE`. If not, leave `RECHECK` and try again next week.
- **End of subtopic**: Do the teach-it-back prompts. If any feels mushy, return to that subtopic's worked examples.

## 🔗 Related

Up: [[Learning/DSA/Graphs]]

Subtopics: [[Learning/DSA/Graphs/Basics]] · [[Learning/DSA/Graphs/Traversals]] · [[Learning/DSA/Graphs/Connectivity]] · [[Learning/DSA/Graphs/Topological-Sort]] · [[Learning/DSA/Graphs/Shortest-Paths]] · [[Learning/DSA/Graphs/MST]] · [[Learning/DSA/Graphs/SCC]]

Prereqs: [[Learning/DSA/Disjoint-Set-Union]] · [[Learning/DSA/Priority-Queue]]
