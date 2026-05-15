---
title: Exercises
tags: [learning, dsa, graphs, exercises]
lastUpdated: 2026-05-14
---

# Graphs — exercises & problem sets

Organized by learning-science principles, not by chronology. Pick sets that match your current skill level and current subtopic. **Interleave deliberately** — drilling 10 BFS problems in a row gives an illusion of mastery; mixing builds transfer.

## How to use this page

- **DO** rotate across difficulty tiers and across exercise *types* (write-from-scratch, debug, teach-back) in a single session.
- **DO** spend ~5 minutes *predicting* before coding — wrong predictions are valuable data, not failures.
- **DO** time-box: if stuck for 25 minutes, write down what you tried, why, and move on. Come back the next day. Spacing > grinding.
- **DON'T** read editorial solutions before writing your own attempt. Worked examples help *before* you struggle (initial schema-building) or *after* you've failed (calibrating your model). Reading them mid-attempt short-circuits the generation effect.
- **DON'T** mark `DONE` until you can re-solve it on a blank file a week later. Use a `RECHECK` marker for "solved once, not yet retained".

Status markers used below: `TODO` not started · `LATER` in flight or paused · `DOING` active · `DONE` solved & retained · `RECHECK` solved once, retest next week.

## Tier 1 — orienting (read & trace, no coding yet)

Pure recognition. Goal: build the schema *before* problem-solving load kicks in.

- TODO Read [Wikipedia: Graph (abstract data type)](https://en.wikipedia.org/wiki/Graph_(abstract_data_type)) — skim, note any term you can't define.
- TODO Skim [CP-Algorithms: Breadth-First Search](https://cp-algorithms.com/graph/breadth-first-search.html) — focus on the pseudocode and one example trace.
- TODO Skim [CP-Algorithms: Depth-First Search](https://cp-algorithms.com/graph/depth-first-search.html).
- TODO Trace BFS and DFS by hand on a graph you drew on paper. Confirm visit order matches what the algorithm should produce.

## Tier 2 — write-from-scratch (foundational)

Implement each in a blank file in your current language. **No copying.** Test on tiny inputs (3–5 vertices) by hand first.

- TODO `build_adjacency_list(edges, directed)` — handles both directed and undirected, isolated vertices OK.
- TODO `adj_list_to_adj_matrix(adj, vertices)` and the inverse.
- TODO `bfs(graph, start) -> visit_order`.
- TODO `bfs_distances(graph, start) -> dict[V, int]`.
- TODO `bfs_path(graph, start, goal) -> list[V] | None`.
- TODO `dfs_recursive(graph, start) -> visit_order`.
- TODO `dfs_iterative(graph, start) -> visit_order` — match the recursive order if you can.
- TODO `dfs_postorder(graph, start) -> list[V]`.
- TODO `has_cycle_directed(graph) -> bool` (white-gray-black).
- TODO `has_cycle_undirected(graph) -> bool` (DFS-with-parent or DSU).
- TODO `connected_components(graph) -> list[list[V]]` (undirected).

## Tier 3 — guided LeetCode (easy → medium, by subtopic)

### Representations & degree reasoning

- TODO LC 997 — Find the Town Judge *(easy)*
- TODO LC 1971 — Find if Path Exists in Graph *(easy)*

### BFS / DFS — traversal

- TODO LC 200 — Number of Islands *(medium)* — grid as graph; choose BFS or DFS deliberately.
- TODO LC 133 — Clone Graph *(medium)* — DFS or BFS with hashmap.
- TODO LC 695 — Max Area of Island *(medium)*
- TODO LC 1091 — Shortest Path in Binary Matrix *(medium)* — BFS on a grid; predict why DFS would be wrong.
- TODO LC 994 — Rotting Oranges *(medium)* — **multi-source BFS** (one of the most useful patterns; do this one).
- TODO LC 1162 — As Far from Land as Possible *(medium)* — another multi-source BFS.

### Cycle detection / topological order

- TODO LC 207 — Course Schedule *(medium)* — directed cycle detection.
- TODO LC 210 — Course Schedule II *(medium)* — topological order output.
- TODO LC 261 — Graph Valid Tree *(medium)* — undirected cycle detection + connectivity.

### Connected components / bipartite

- TODO LC 547 — Number of Provinces *(medium)*.
- TODO LC 785 — Is Graph Bipartite? *(medium)* — BFS 2-coloring.

## Tier 4 — interleaved practice sets

**The point of these sets is variety.** Solve them in the order listed (don't reshuffle into nice topical clumps).

### Set A (1 hour, ~3–4 problems mixed)

1. LC 200 — Number of Islands *(traversal)*
2. LC 207 — Course Schedule *(cycle detection)*
3. LC 785 — Is Graph Bipartite? *(BFS coloring)*

### Set B

1. LC 1971 — Path Exists *(basic traversal)*
2. LC 210 — Course Schedule II *(topological)*
3. LC 994 — Rotting Oranges *(multi-source BFS)*

### Set C

1. LC 695 — Max Area of Island *(DFS / area accumulation)*
2. LC 547 — Number of Provinces *(connected components)*
3. LC 261 — Graph Valid Tree *(undirected cycle + connectivity)*

## Tier 5 — debug-this (find bugs in plausible code)

For each, **predict the bug before running**. Save the snippets locally if you want to actually execute.

- TODO Snippet: BFS that marks visited on dequeue. *Hidden bug: O(E) memory.*
- TODO Snippet: DFS without a visited set on a graph with a cycle. *Hidden bug: stack overflow.*
- TODO Snippet: directed cycle detection that uses a boolean visited set instead of three colors. *Hidden bug: false cycle reports across disjoint trees.*
- TODO Snippet: undirected cycle detection that uses white-gray-black naively. *Hidden bug: every undirected edge reports as a cycle.*
- TODO Snippet: topological sort via DFS that returns vertices in finish order (not reversed). *Hidden bug: order is exactly backwards.*

(Compose these snippets yourself by introducing the bug into a known-good version — generation effect again.)

## Tier 6 — teach-it-back prompts

Write or record a 2–4 minute explanation for each. If you can't, that's the lesson.

- TODO Explain why BFS finds shortest paths only on unweighted graphs. Give a counterexample.
- TODO Explain the white-gray-black trick for directed cycle detection. Why won't a single visited set work?
- TODO Explain how a multi-source BFS differs from a regular BFS, and one problem it's ideal for.
- TODO Explain why iterative DFS produces a different visit order than recursive DFS, and how to make them match.
- TODO Explain when adjacency matrix beats adjacency list, with a real scenario.

## Tier 7 — CSES (when you're ready for competitive-programming difficulty)

The [CSES Problem Set](https://cses.fi/problemset/) has the cleanest graph progression I've found. Save these for after Tier 3–5 feels easy.

- TODO CSES 1666 — Building Roads *(connected components)*
- TODO CSES 1667 — Message Route *(BFS shortest path)*
- TODO CSES 1668 — Building Teams *(bipartite check)*
- TODO CSES 1669 — Round Trip *(undirected cycle detection)*
- TODO CSES 1678 — Round Trip II *(directed cycle detection)*

## Tier 8 — coming later (placeholder)

These belong with subtopics not yet seeded:

- Shortest paths: LC 743 (Network Delay Time, Dijkstra), LC 787 (Cheapest Flights, Bellman-Ford), LC 1334 (Floyd-Warshall flavor).
- MST: LC 1584 (Min Cost to Connect All Points), LC 1135 (Connecting Cities).
- SCC: rare on LC; CSES "Planets and Kingdoms" or USACO equivalents.

## Spacing rhythm (suggested)

This is the part most people skip and most regret skipping.

- **Daily (5–10 min)**: Logseq flashcard queue. No exceptions; it's 5 minutes.
- **Every other day (45–90 min)**: 1 Tier 2 implementation OR 1 interleaved set OR 2 Tier 3 problems.
- **Weekly (15 min)**: Pick a `RECHECK` task. Re-solve on a blank file. If it stuck, mark `DONE`. If not, leave `RECHECK` and try again next week.
- **End of subtopic**: Do the teach-it-back prompts. If any feels mushy, return to that subtopic's worked examples.

## Related

- Up: [[Learning/DSA/Graphs]]
- Subtopics: [[Learning/DSA/Graphs/Basics]] · [[Learning/DSA/Graphs/Traversals]]
