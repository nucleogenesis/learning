---
title: Tries
tags: [topic/dsa, topic/trees, kind/concept]
lastUpdated: 2026-05-15
---
# Tries — prefix trees

> **Convention on this page**: Answer blocks live as children of "Show answer" parents. Click the triangle to collapse — Logseq remembers the state.

## 🎯 Why this matters

You're typing into an autocomplete box. You type `c`, and the system instantly offers `cat, car, cart`. Type `ca`, and `dog` and `do` disappear from the suggestions. Type `cart`, and only `cart` remains.

How does the suggester find all the words starting with `ca` *quickly*, without scanning a dictionary of half a million words?

A **trie** (pronounced "try"; from *re***trie**val). It's a tree where each **edge** represents one character, and each **root-to-node path** represents one prefix. Words live at specific marked nodes along those paths. Searching for all words starting with `ca` becomes "walk from the root following `c`, then `a` — everything under that node is a match." `O(prefix length)` to *get to* the node. `O(matches)` to enumerate.

This shape powers:

- **Autocomplete** (the example above) — typing 3 characters narrows from 500k words to 50 in `O(3)` time.
- **Spell-check** — fuzzy walk through the trie with bounded edit distance.
- **IP routing tables** — find the **longest matching prefix** for a destination IP. Routers use a specialized trie variant called a **radix tree** (or "Patricia trie") that compresses chains of single-child nodes.
- **Phone-keypad / T9** prediction — same shape, different alphabet.
- **Dictionaries with prefix or stem queries** — Unix `look`, Scrabble word-finders, Wordle solvers.
  - Why not just use a hash set? A hash set answers "is this exact word in the set?" in `O(L)` (where L is the word length), which is faster than a trie's exact lookup. **But a hash set cannot answer prefix queries efficiently.** That's the trie's killer feature. Every prefix already corresponds to a node, ready to be walked from.

## A tiny worked example

Build a trie containing the words `[cat, car, cart, dog, do]`. Trace each insertion.

After all five inserts, the trie looks like:

```
                (root)
                /    \
              c        d
              |        |
              a        o ★      ← ★ marks "do" ends here
             /          \
            t ★          g ★
            |
            r ★
            |
            t ★
```

The stars (`★`) flag which nodes are **end-of-word** markers. Without that flag, you couldn't tell that `do` is a stored word but `dog`'s parent `o` is *also* a stored word, or that `car` ends at the `r` but `cart` continues past it.

(I drew the structure slightly weird — let me redo it more carefully so the parent/child relationships are unambiguous.)

```
                (root)
               /      \
              c        d
              |        |
              a        o ★         ← "do"
              |        |
              t ★      g ★         ← "cat"; "dog"
              |
              r ★                  ← "car"
              |
              t ★                  ← "cart"
```

Now: `cat`'s `t` and `car`'s `r` are both children of the same `a`. Let me try once more, properly forking:

```
                (root)
               /      \
              c        d
              |        |
              a        o ★         ← "do"
             / \       |
            t★  r★     g ★         ← "cat", "car", "dog"
                |
                t ★                ← "cart"
```

There — `a` has two children (`t` for "cat" and `r` for "car"); the `r` node continues with a `t` child for "cart"; the `t` for "cat" has no further children. Both `t` (under `ca`) and `r` (under `ca`) carry the end-of-word star.

Naming the parts as they come up:

- **Children** of a node — a map from character to child node. Often `dict[char, Node]` or, for fixed alphabets, `Node[ALPHA_SIZE]` (e.g., `Node[26]` for lowercase English).
- **End-of-word flag** — a boolean (or word count) on each node, saying "a stored word ends here." Without it, you can't tell `do` from a passing-through node.
- **Prefix** — any string that corresponds to a root-to-node path. Every prefix of every stored word has a corresponding node. `c`, `ca`, `car`, `cart` are all prefixes; only the last three end at a star.

## The structure

```python
class TrieNode:
    def __init__(self):
        self.children = {}        # dict[char, TrieNode]
        self.is_end = False       # True iff a word ends here

class Trie:
    def __init__(self):
        self.root = TrieNode()
```

For a fixed alphabet (e.g., lowercase English), the more memory-efficient version uses a 26-slot array indexed by `ord(c) - ord('a')`. The dict version is more general and only slightly slower; default to it.

## Insert

Walk down from the root, creating new nodes as needed for each character. Mark the final node as end-of-word.

```python
def insert(self, word):
    node = self.root
    for ch in word:
        if ch not in node.children:
            node.children[ch] = TrieNode()
        node = node.children[ch]
    node.is_end = True
```

Time: `O(L)` where `L = len(word)`. Space: at most `O(L)` new nodes (fewer if the word shares prefixes with existing words).

Inserting `cart` after `[cat, car]` already exist: walk `root → c → a → r` (all existing nodes from earlier inserts), then create one new node for `t` as a child of `r`, mark it end-of-word. Just one new node added, because `car`'s 3-character path was reused.

## Search (exact match)

Walk the trie; if any character is missing or we end on a non-end-of-word node, return false.

```python
def search(self, word):
    node = self.root
    for ch in word:
        if ch not in node.children:
            return False
        node = node.children[ch]
    return node.is_end
```

Time: `O(L)`. Note the `node.is_end` check at the end — `search("ca")` walks to the `a` node but should return `False` because `ca` isn't a stored word (no end-of-word flag), even though the path exists.

## Prefix query: starts-with

The classic trie use case. Walk the same way as `search`, but skip the end-of-word check.

```python
def starts_with(self, prefix):
    node = self.root
    for ch in prefix:
        if ch not in node.children:
            return False
        node = node.children[ch]
    return True
```

Time: `O(P)` where `P = len(prefix)`. Independent of how many words live below that prefix — that's the win.

## Enumerate all words with a given prefix (autocomplete)

Combine `starts_with` to get to the prefix node, then DFS from there collecting all `is_end` nodes:

```python
def words_with_prefix(self, prefix):
    node = self.root
    for ch in prefix:
        if ch not in node.children:
            return []
        node = node.children[ch]

    results = []
    def dfs(n, path):
        if n.is_end:
            results.append(prefix + ''.join(path))
        for ch, child in n.children.items():
            path.append(ch)
            dfs(child, path)
            path.pop()
    dfs(node, [])
    return results
```

Time: `O(P + total_chars_in_matches)`. Optimal — you can't enumerate `K` matches in less than `O(K)` time, and walking to the prefix node is unavoidable.

## Delete (sketch)

Less common than insert/search/starts-with, but worth seeing. To delete a word:

Walk down to its end-of-word node, recording the path.

Unset the `is_end` flag.

Walk back up: at each node, if it has **no children and no longer marks an end-of-word**, delete it from its parent's children.

Skipping the full code — it's straightforward but fiddly. Mostly you don't bother; you flip `is_end` to `False` and tolerate the few extra nodes. The wasted nodes might come back into use when you insert a different word that shares the prefix.

## Trie complexity summary

| Operation | Time | Notes |
|---|---|---|
| Insert | `O(L)` | L = word length |
| Search (exact) | `O(L)` | |
| Prefix exists | `O(P)` | P = prefix length |
| Enumerate prefix matches | `O(P + total_match_chars)` | |
| Delete | `O(L)` | If you bother cleaning up |
| Space | `O(total_chars_across_words)` | Shared prefixes are reused |

The space note matters: a trie with 500k English words is *not* `500k × avg_word_length` nodes. Common prefixes (`re-`, `un-`, `pre-`, etc.) are shared, so the node count is much smaller. Real-world dictionaries compress to roughly the cube root of the naive count.

## Variants worth knowing exist

- **Radix tree / Patricia trie**: collapse any chain of single-child nodes into a single edge labeled by the substring. Saves enormous space when many keys share long unique tails (e.g., IP routing tables). `cart` and `cars` in a radix trie share a node up to `car`, then split.
- **Compressed trie (a.k.a. compact prefix tree)**: same idea as radix.
- **Suffix trie / suffix tree / suffix array**: instead of storing words, store every *suffix* of one big string. Used for substring search and bioinformatics. Suffix arrays are the practical version (less memory than suffix trees).
- **DAWG (directed acyclic word graph)**: trie with shared *suffixes* as well as prefixes. Smallest possible for a fixed dictionary; harder to build incrementally. Used in spell-checkers.
- **Ternary search trie**: each node has three children (`<`, `=`, `>`), trading branching factor for memory. Useful when the alphabet is huge (Unicode strings) — pointer count stays constant per node.
  - Don't memorize these. Just know "if the basic trie is too big, there are compressions; if I need substring search, there are suffix-based variants."

## 🔍 Quick check (try before scrolling)

- **Q1**: Trace inserting `[apple, app, apex]` into an empty trie. How many total nodes does the trie have (including the root)?
- Show answer to Q1
  - Start with just `root`. Insert `apple`: add `a, p, p, l, e` → 5 new nodes. Total: 6. Insert `app`: walk `root → a → p → p` (all exist); mark the second `p` as end-of-word. No new nodes. Total: 6. Insert `apex`: walk `root → a` (exists), then need `p, e, x` — but `a` already has a child `p`. The next character is `p`, which exists. Then `e` — does the `p` (the first one, under `a`) have an `e` child? No, it only has `p` (from `apple`/`app`). So we add a new branch from the first `p`: `e, x` → 2 new nodes. Total: 8.
  - Wait — re-examine. `apex` = `a, p, e, x`. After walking `a → p`, we want the next char `e`. The `p` (first) currently has child `p` (continuing `app...`). It does **not** have an `e` child. So we add `e` and `x` as a new branch off the first `p`. That's correct: 2 new nodes. Final: 8 nodes including root.
- **Q2**: Why does `search("ca")` return `False` on a trie that contains `cat` but not `ca`, even though the path `root → c → a` exists?
- Show answer to Q2
  - The path being walkable just means "some stored word has `ca` as a prefix." It doesn't mean `ca` itself was inserted. The distinguishing signal is the `is_end` flag on the final node. The `a` node's `is_end` is `False` because we never called `insert("ca")` — only `insert("cat")`, which set `is_end = True` on `t`, not on `a`.
- **Q3**: When would you use a trie instead of a hash set for storing a dictionary of words?
- Show answer to Q3
  - Whenever you need **prefix queries**. Hash sets only answer "is this exact key present?" Tries answer that *plus* "are there any keys starting with this prefix?" *plus* "give me all keys starting with this prefix" — all in optimal time. Autocomplete, spell-check, longest-prefix-match, and any sorted-prefix enumeration are trie territory. For pure exact-match lookup, hash sets are slightly faster and simpler.
- **Q4**: A router has 1 million IP prefixes in its routing table. For each incoming packet, it needs to find the **longest matching prefix** (more specific routes win). Why is this a trie problem?
- Show answer to Q4
  - IP prefixes are bit-strings; matching = walking the trie one bit at a time. "Longest match" = walk as deep as possible while the destination address's bits still match a stored prefix. A trie does this in `O(IP length) = O(32)` for IPv4 (or `O(128)` for IPv6) — *independent of how many prefixes are stored*. Real routers use **radix tries** (Patricia tries) to compress paths through bits that no stored prefix branches on. This is one of the few places trie data structures show up in production network kernels.

---

## 💪 Practice (a separate session, not your first read)

### Worked → faded → blank chain: implement Trie

#### Worked example (read)

See the `Trie` class above with `insert`, `search`, `starts_with`. That's LC 208 verbatim.

#### Faded — fill in the blanks

Add a `word_count(prefix)` method that returns the number of stored words starting with `prefix`. Augment each node with a `count` field updated during insert/delete.

```python
class TrieNode:
    def __init__(self):
        self.children = {}
        self.is_end = False
        self.count = 0           # number of stored words passing through this node

class Trie:
    def __init__(self):
        self.root = TrieNode()

    def insert(self, word):
        node = self.root
        for ch in word:
            if ch not in node.children:
                node.children[ch] = TrieNode()
            node = node.children[ch]
            # FILL: bump count on the way down
            ____________________
        node.is_end = True

    def word_count(self, prefix):
        node = self.root
        for ch in prefix:
            if ch not in node.children:
                return 0
            node = node.children[ch]
        # FILL: every word passing through this node has `prefix` as a prefix
        ____________________
```

- Show the answer

```python

node.count += 1

return node.count

```
  - The `count` is incremented at every node we touch during insert (except the root, which everyone shares — incrementing it gives the total word count). `word_count(prefix)` then becomes an `O(P)` lookup, faster than the `O(P + matches)` cost of enumeration. The space cost is one extra integer per node.

#### From scratch

Implement **`WordDictionary`** (LC 211): supports `addWord(word)` and `search(word)` where the search query may contain `.` characters that match any letter. Example: `addWord("bad"); addWord("dad"); search("b..") → True; search("...") → True; search("....") → False`. The `.` makes search branch — at a `.` step, try *every* child. Worst case `O(26^L)` time on pathological inputs, but in practice fast because the trie tends to be narrow.

### Worked → faded → blank: longest common prefix

#### Worked example (read)

LC 14 — given a list of strings, find their longest common prefix. There's a non-trie `O(n × min_length)` solution that's typically preferred (compare character-by-character across all strings), but the trie approach is also illuminating:

```python
def longest_common_prefix(words):
    if not words:
        return ""
    trie = Trie()
    for w in words:
        trie.insert(w)
    # Walk down from the root while there's exactly one child and the
    # current node isn't end-of-word (an end-of-word means one of the input
    # words has terminated here — the prefix can't extend past it).
    prefix = []
    node = trie.root
    while len(node.children) == 1 and not node.is_end:
        ch, child = next(iter(node.children.items()))
        prefix.append(ch)
        node = child
    return ''.join(prefix)
```

#### Faded — fill in the blanks

Implement **`replaceWords`** (LC 648): given a dictionary of root-words and a sentence, replace every word in the sentence with the shortest root-word that is a prefix of it. Example: dict = `["cat", "bat", "rat"]`, sentence = `"the cattle was rattled by the battery"` → `"the cat was rat by the bat"`.

```python
def replace_words(roots, sentence):
    trie = Trie()
    for r in roots:
        trie.insert(r)

    def find_shortest_root(word):
        node = trie.root
        for i, ch in enumerate(word):
            if ch not in node.children:
                return word
            node = node.children[ch]
            # FILL: if this node ends a root word, we've found the shortest one
            if ____________________:
                return word[:i + 1]
        return word

    return ' '.join(find_shortest_root(w) for w in sentence.split())
```

- Show the answer

```python

if node.is_end:

```
  - The walk goes one character at a time, checking after each step whether we've just landed on an end-of-word node. Because we're walking from the root and stopping as soon as we hit `is_end`, we're guaranteed to return the **shortest** matching root (any longer root would still be a prefix, so this one fires first).

### Debug-this

```python
class TrieNode:
    def __init__(self):
        self.children = {}

class Trie:
    def __init__(self):
        self.root = TrieNode()

    def insert(self, word):
        node = self.root
        for ch in word:
            if ch not in node.children:
                node.children[ch] = TrieNode()
            node = node.children[ch]

    def search(self, word):
        node = self.root
        for ch in word:
            if ch not in node.children:
                return False
            node = node.children[ch]
        return True
```

Insert `"apple"`, then call `search("app")`. What do you get? What should you get? Where's the bug?

- Show the bug
  - You get `True`. You should get `False` — `"app"` was never inserted as a word; only `"apple"` was. The bug: there's **no end-of-word flag**. `search` returns `True` whenever a path exists, conflating "this is a stored word" with "this is a prefix of some stored word." Fix: add `self.is_end = False` to `TrieNode.__init__`; set `node.is_end = True` at the end of `insert`; return `node.is_end` (not just `True`) at the end of `search`. Without the flag, `search` and `starts_with` are the same function — useless distinction.

### Teach-it-back

Without notes, in ~4 sentences:

> *"Why is a trie the right data structure for autocomplete, but a hash set is not? Walk through what happens when the user types each character of a 4-character query, in terms of work the trie does."*

If you can't, the prefix-walking story didn't land. Re-read the `starts_with` and "enumerate" sections.

---

## 🎴 Flashcards (for daily review, not the first read)

- What does each **edge** of a trie represent? #card #trees/tries #trie
  - A single character. A root-to-node path spells a prefix.
- What's the role of the **end-of-word** flag? #card #trees/tries
  - Distinguishes "this node *is* a stored word" from "this node is just a prefix of some stored word." Without it, `search` and `starts_with` are indistinguishable.
- Time complexity of trie insert? #card #trees/tries #trie #complexity
  - `O(L)` where L is the word length. Independent of how many words are already stored.
- Time complexity of trie `starts_with(prefix)`? #card #trees/tries #trie #complexity
  - `O(P)` where P is the prefix length. Independent of how many words match.
- Enumerating all words with a given prefix — complexity? #card #trees/tries #complexity
  - `O(P + total characters in all matches)`. Optimal — you can't enumerate K matches in less than `O(K)` work.
- {{cloze A trie's space cost is **shared** across common prefixes; total nodes ≈ unique prefix paths, not sum of word lengths.}} #card #trees/tries #trie
- When would you choose a **trie** over a **hash set**? #card #trees/tries #trie
  - When you need prefix queries (autocomplete, longest-prefix-match, sorted prefix enumeration). Hash sets only answer exact-match queries.
- What's a **radix tree** (Patricia trie)? #card #trees/tries #trie
  - A trie where chains of single-child nodes are collapsed into one edge labeled by the substring. Saves space when long stretches of bits/chars have no branching. Used in IP routing tables.
- One real-world use case for tries other than autocomplete? #card #trees/tries
  - IP routing (longest-prefix match). Also: T9 prediction, Scrabble solvers, DNA pattern matching (via suffix tries), spell-checkers (often DAWGs in practice).
- For a fixed alphabet (lowercase English), what's a memory-efficient way to store children? #card #trees/tries
  - A 26-slot array indexed by `ord(c) - ord('a')`, instead of a dict. Faster lookup, less overhead per node, but wastes slots for unused letters.
- {{cloze The **leftmost** trie variant — collapsing chains of single-child nodes — is called a **radix tree** or **Patricia trie**.}} #card #trees/tries #trie
- Why doesn't deleting a word from a trie usually require restructuring? #card #trees/tries #trie
  - You just unset its `is_end` flag. The shared prefix nodes are still needed for other words. You *could* prune nodes that become unused, but most implementations don't bother.

---

## ✅ Self-check before moving on

Can I implement a basic trie (insert, search, starts_with) from scratch?

Can I explain *exactly* what the `is_end` flag does and why search breaks without it?

Can I argue why a trie beats a hash set for autocomplete?

Can I name two trie variants and what problem each one optimizes for?

If any "no", do one practice exercise. If all "yes", you've completed the Trees content pages — head to [[Learning/DSA/Trees/Exercises]] for the practice set.

## 🔗 Related

- Up: [[Learning/DSA/Trees]]
- Prev: [[Learning/DSA/Trees/Binary-Search-Trees]]
- Related: [[Learning/DSA/Graphs/Basics]] (a trie is a tree is a graph)
- Practice problems: [[Learning/DSA/Trees/Exercises]]
