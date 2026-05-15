# Learning Notes — site design

**Date:** 2026-05-14
**Owner:** Jacob (@nucleogenesis)
**Repo:** github.com/nucleogenesis/learning
**Status:** approved, ready to implement

## Goal

Publish curated study notes (currently DSA, starting with Graphs) from a private Logseq graph to a public static site on GitHub Pages. The site should preserve Logseq-style features that matter for learning — interactive flashcards with spaced repetition, persistent TODO state — while keeping Logseq itself as the single source of truth.

## Non-goals

- Two-way sync between site and Logseq.
- Server-side state (auth, accounts, analytics).
- Real-time collaboration. Friends can contribute via PRs; the workflow is async.
- Publishing the entire Logseq graph. Only the `Learning/**` namespace is ever exported.

## Constraints

- Logseq stays the source of truth. The repo is downstream; never edit `content/` to push changes back to Logseq.
- Only pages whose name begins with `Learning/` are eligible for publish. The publish skill enforces this with a hard allowlist before writing any file.
- All reader-side interactive state (card SRS schedule, TODO checks) lives in the reader's browser via `localStorage`. The site has no backend.

## Architecture overview

```
Logseq (private)                 Friend PRs (optional)
       │                                │
       │ MCP                            │
       ▼                                │
Claude /publish-learnings skill         │
  - Query Logseq for Learning/** pages  │
  - Convert blocks → Markdown           │
  - Rewrite [[wikilinks]] for Quartz    │
  - Drop into content/Learning/...      │
  - Commit + push                       │
       │                                ▼
       └──────────►  GitHub repo: nucleogenesis/learning
                       ├─ content/Learning/...     (source MD)
                       ├─ quartz/                  (Quartz + plugins)
                       ├─ scripts/build-anki.ts    (.apkg generator)
                       └─ .github/workflows/       (CI build + deploy)
                                │
                                ▼ GitHub Actions
                       GitHub Pages — nucleogenesis.github.io/learning/
                       - Quartz-generated static site
                       - Interactive flashcards (SM-2 in browser)
                       - Interactive TODO checkboxes
                       - Per-topic .apkg downloads
```

## Key invariants

1. **Logseq is source of truth.** Repo content/ is downstream-only.
2. **Allowlist enforcement at publish time.** Any page not under `Learning/` is refused before any file is written.
3. **No backend.** All interactive state is per-reader in `localStorage`.
4. **Each rollout phase ships value alone.** Stopping after any phase leaves a usable site.

## Component design

### The publish skill (`~/.claude/skills/publish-learnings/`)

Workflow:

1. **Discover.** Query Logseq MCP for all pages whose name starts with `Learning/`. Hard-fail if a candidate falls outside that prefix.
2. **Diff** (optional). Compare each page's current Logseq content against `content/Learning/...md` in the repo. Skip unchanged pages; print a summary.
3. **Transform** each page:
   - Pull blocks via MCP, render block tree → Markdown.
   - Add frontmatter: `title`, `tags`, `lastUpdated` (today), `aliases` (the Logseq page name verbatim).
   - Preserve `#card` and `{{cloze ...}}` syntax verbatim — Quartz plugin handles them at build time.
   - Strip blocks with `public:: false` or `draft:: true` (per-block escape hatch).
4. **Write** to `content/Learning/...` mirroring namespace as folders. `Learning/DSA/Graphs/Basics` → `content/Learning/DSA/Graphs/Basics.md`.
5. **Commit + push** with message: `Publish: <page list> (<card count> cards)`. Push triggers GH Actions.
6. **Report** back: pages updated, card counts, broken-link warnings.

Invocation: `/publish-learnings`.

### Repo layout

```
learning/
├── content/
│   ├── index.md                    # auto-generated TOC of Learning/**
│   └── Learning/DSA/Graphs/        # source Markdown mirrors Logseq namespace
│       ├── Basics.md
│       └── Traversals.md
├── quartz/
│   ├── plugins/transformers/
│   │   ├── flashcards.ts           # #card blocks → <Flashcard>
│   │   └── cloze.ts                # {{cloze ...}} → <ClozeSpan>
│   ├── components/
│   │   ├── Flashcard.tsx           # click-to-reveal Q/A + SM-2 rate buttons
│   │   ├── ClozeSpan.tsx           # blanked text, click to reveal
│   │   ├── TodoCheckbox.tsx        # checkbox + localStorage
│   │   ├── CardReview.tsx          # /review page — all due cards
│   │   └── AnkiDownload.tsx        # per-topic .apkg link
│   ├── styles/
│   └── quartz.config.ts
├── scripts/
│   └── build-anki.ts               # scan content/, emit static/decks/*.apkg
├── static/decks/                   # generated .apkg files
├── .github/workflows/
│   ├── deploy.yml                  # on push to main
│   └── pr.yml                      # build check on PRs (no deploy)
├── docs/plans/
│   └── 2026-05-14-learning-notes-design.md   # this file
├── CLAUDE.md                       # rule: source is Logseq, don't edit content/ directly
└── README.md
```

### Quartz customizations

- **`flashcards.ts`** runs in the Markdown → HTML pipeline. Walks the AST; any list item containing `#card` becomes a `<Flashcard>`: question = block text minus `#card`; answer = child block subtree. Each card gets a stable `id` = hash of `page-path + question-text` so localStorage survives content edits as long as the question text is stable.
- **`cloze.ts`** matches `{{cloze (.+?)}}` and replaces with `<ClozeSpan>`. Same hash-id strategy.
- **`<CardReview>`** lives at `/review`. Reads all cards' SM-2 state from localStorage, queues due cards, lets reader rate Again / Hard / Good / Easy. State stored under `learning-notes-srs-v1`.
- **`<TodoCheckbox>`** replaces Markdown `- [ ]` / `- [x]` items. Toggle persists in localStorage under `learning-notes-todos-v1`. Page renders default state from Markdown; localStorage overrides per reader.

### Anki deck generation

`scripts/build-anki.ts` (Node, using `anki-apkg-export` or shelling to Python `genanki`):

- Scan `content/Learning/**/*.md` for `#card` blocks and `{{cloze ...}}` spans.
- Group by namespace. Each second-level namespace gets its own deck: `DSA-Graphs.apkg`.
- Also emit one master deck: `learning-notes-all.apkg`.
- Output to `public/decks/` so it ships alongside the built site.
- Each topic page renders an `<AnkiDownload>` link to its deck.

### Deploy / CI

`.github/workflows/deploy.yml` on push to `main`:

```yaml
1. Checkout
2. Setup Node (LTS)
3. npm ci
4. npx quartz build              # → public/
5. npx tsx scripts/build-anki.ts # → public/decks/*.apkg
6. Upload public/ as Pages artifact
7. Deploy to GitHub Pages
```

`.github/workflows/pr.yml` on PR: same build, no deploy. Required check before merge.

Pages settings: source = GitHub Actions. URL: `https://nucleogenesis.github.io/learning/`.

Branch protection on `main`: PRs + status check required for non-owners. Owner can push direct (publish skill does this).

Secrets: none. Cost: $0 — well within GH Pages + Actions free tier.

## Storage schemas (localStorage)

**`learning-notes-srs-v1`** — SM-2 state, keyed by card id:

```ts
type CardState = {
  ef: number;          // ease factor, default 2.5
  interval: number;    // days until next review
  repetitions: number; // consecutive correct
  due: number;         // epoch ms
  lastReview: number;  // epoch ms
};
type SrsStore = Record<string /* cardId */, CardState>;
```

**`learning-notes-todos-v1`** — TODO state, keyed by todo id (hash of page path + item text):

```ts
type TodoStore = Record<string /* todoId */, { checked: boolean; at: number }>;
```

Both stores versioned in the key name so future schema changes can migrate cleanly.

## Friend / PR workflow

- Fork → edit `content/Learning/**/*.md` → PR.
- `pr.yml` validates build passes.
- Owner reviews + merges. Site rebuilds.
- **Known drift risk:** PR-edited content diverges from the Logseq source of truth. Mitigation deferred to v2 (e.g., `scripts/check-drift.ts` to flag pages where repo content differs from a fresh Logseq export).

## Rollout sequence

Each phase ships a working artifact.

**Phase 1 — minimum publishable site (~30 min)**
1. Repo created (done).
2. `npx quartz create` → push initial commit. Confirm GH Pages serves the default Quartz site.
3. One hand-converted `.md` in `content/Learning/DSA/Graphs/Basics.md` to confirm namespace + wikilinks.

**Phase 2 — the publish skill (~1 session)**
4. Write `~/.claude/skills/publish-learnings/SKILL.md`.
5. First real run exports the three already-seeded pages (DSA index, Graphs hub, Basics, Traversals). Verify frontmatter, folder layout, clean build.
6. `#card` blocks render as plain list items here — that's fine.

**Phase 3 — flashcards interactive (~1 session)**
7. `flashcards.ts` transformer + `<Flashcard>` component. Click-to-reveal. No SRS yet.
8. `cloze.ts` + `<ClozeSpan>`. Verify both on real pages.

**Phase 4 — SRS + TODOs (~1 session)**
9. SM-2 logic + `localStorage` schema. `/review` page.
10. `<TodoCheckbox>` for TODO markers.

**Phase 5 — Anki export (~1 session)**
11. `scripts/build-anki.ts`. Wire into CI. Add `<AnkiDownload>` to topic pages.

**Phase 6 — polish**
12. Theme, landing-page TOC, PR-validation workflow, drift-check script.

## Open questions (parked, not blocking)

- Custom domain? Default `nucleogenesis.github.io/learning/` is fine for v1.
- Search? Quartz has built-in search; revisit theme/UX after Phase 3.
- Math rendering? KaTeX is default in Quartz; enable when first math-heavy topic ships.
- Drift-check tooling timing — wait for first observed drift.
