# QoL features design — page-done, TODO progress, annotations, sync

**Date:** 2026-05-15
**Owner:** Jacob (@nucleogenesis)
**Status:** approved, in implementation

## Goals

Add three quality-of-life features to the learning site, plus a small sync server so state moves between devices and across browsers:

1. Mark a whole page as done. Visible everywhere.
2. Per-page TODO completion bar (red→yellow→green%) in the navigation explorer.
3. Per-block annotations the reader can attach to any paragraph / list item / code block.
4. Cross-device sync via a tiny Cloudflare Workers + KV server, with one secret per user so multiple users share the same server without seeing each other's state.

## Non-goals

- Multi-user collaboration. Each user's state stays private; no shared annotations, no comments-on-others'-work.
- Conflict resolution beyond last-write-wins. Concurrent edits on two devices: one loses.
- Accounts / passwords / OAuth. Auth = a long random secret. The secret is the identity.
- Per-PR preview deployments. Decided against migrating off GH Pages; reviews happen via the live merged site or local checkouts.

## Constraints

- Static site, no backend on the site host. State lives client-side; only the sync server is online.
- All existing features (cards, cloze, TODOs, LLM disclaimer) keep working through the migration.
- Single-key localStorage model — one blob, one schema version, atomic save/restore.

## Unified state model

Everything moves to one canonical key:

```
localStorage["learning-notes-state-v1"] = JSON.stringify({
  schemaVersion: 1,
  user:    { name: "jacob" },
  sync:    { endpoint: "https://sync.nucleogenesis.org", secret: "<UUID>" },
  cards:   { "<cardId>": { ef, reps, intervalDays, dueMs, lastReviewMs } },
  todos:   { "<page>/<idx>": true | false },
  pages:   { "<slug>": { doneAt: <ms> } },
  annots:  { "<blockId>": { text, createdAt, updatedAt } },
  meta:    { lastSyncedAt, lastWriteAt }
})
```

Why one blob: sync server stays schema-blind (stores opaque JSON), backup/restore is atomic, migrations are central. Future schema changes bump `schemaVersion` and run migration logic on load. Unknown fields are preserved through round-trips so older clients don't lose data from newer ones.

### Tiny module: `quartz/components/scripts/state.inline.ts`

- `read(): State` — returns the parsed blob, or a fresh default if missing.
- `update(fn: (s: State) => void): void` — read, apply `fn`, write back, bump `meta.lastWriteAt`, schedule a debounced sync push.
- `reset(): void` — clears the blob (escape hatch on the settings page).

All other feature scripts read/write state through this module — no direct localStorage access elsewhere.

### One-time migration on load

If `learning-notes-state-v1` is missing but the old keys exist:
- Fold `learning-notes-srs-v1` (Phase 4 SRS state) into `state.cards`.
- Scan all `<slug>-checkbox-N` keys (Quartz's built-in checkbox script) into `state.todos`.
- Delete the old keys.
- Write the unified blob.

## Feature 1 — Mark page as done

A small toggle in the page header area: **`✓ Mark as done`** / **`✓ Done`**. Stores `state.pages[<slug>] = { doneAt: <epochMs> }`. In the Explorer, done pages render with a strikethrough, dimmed text, and a leading `✓` glyph.

Implementation: a new Quartz component `PageDoneToggle.tsx` rendered in `defaultContentPageLayout.beforeBody`. Wires through `state.update(s => s.pages[slug] = { doneAt: Date.now() })`. Explorer customization to read `state.pages[slug]` and apply styling per-link.

## Feature 2 — TODO completion bar in Explorer

For any page with `task-list-item` checkboxes (the GFM checkboxes we generate from `- TODO X` markers), the Explorer renders a thin gradient bar under the page name plus a `42%`-style label.

Sketch:

```
Exercises ┄┄┄┄┄┄┄┄┄┄┄┄┄  42%
          ▰▰▰▰▰▱▱▱▱▱▱▱▱
```

Color: red → yellow → green gradient based on completion %. Pages with 0 TODOs render no bar.

### Counting needs a build-time index

The runtime knows how many checkboxes the user has *checked* (from `state.todos`), but not the total per page. New build-time emitter `Plugin.TodosIndex()` writes `public/todos-index.json` of the form `{ "<slug>": <totalCheckboxCount> }`. The Explorer customization fetches this once on page load and computes `% = checked / total`.

## Feature 3 — Per-block annotations

On hover, a 📝 icon appears in the left margin of every paragraph, list item, and code block. Click → an inline editor pops in below the block. Type → blur or `Esc` to save.

State: `state.annots[<blockId>] = { text, createdAt, updatedAt }` where `blockId = FNV-1a(slug + "::" + blockText)` — same stable-id approach used for cards. Stable as long as the block's text stays the same.

Annotated blocks gain a persistent 💬 marker in the margin (always visible, even without hover) so the reader knows there's a note. Click the marker to expand the note inline.

Implementation: a new transformer `Plugin.Annotations()` walks the HTML AST at build time and tags each annotatable block with `data-block-id`. A runtime script `annotations.inline.ts` attaches hover behavior, the editor, and the marker.

Privacy: annotations are per-user (each user has their own state blob via sync). No leakage between users.

## Feature 4 — Sync server (Cloudflare Workers + KV)

A separate repo `learning-sync` with a single Worker file (~40 lines) and a wrangler config. KV namespace stores one row per user secret.

Endpoint shape:

- `GET /` with `X-Auth: <secret>` → returns the blob stored at `KV[<secret>]`, or `{}` if empty.
- `PUT /` with `X-Auth: <secret>` and JSON body → overwrites `KV[<secret>]`.
- `OPTIONS /` → CORS preflight.

Hardening on top of the minimum:

- CORS allowlist exactly `https://learning.nucleogenesis.org` (no `*`).
- Minimum secret length 16 chars (UUIDv4 is 36, so satisfied automatically).
- 1 MB body size cap.
- JSON validation: refuse non-JSON bodies.

Auth model: **secret-as-bucket-key**. Each user generates a UUIDv4 secret on first run; that secret is both their identity and their password. Different secrets → different KV keys → fully isolated state. Username is stored client-side for UI display only ("signed in as: jacob") — not part of auth.

Domain: `sync.nucleogenesis.org` → Worker via Cloudflare DNS. Requires moving DNS to Cloudflare (free; Namecheap stays registrar). One-time owner action.

Cost: $0 on free tier (100K reads / 1K writes per day; site uses single-digit writes per day).

## Feature 5 — Sync client

One inline script `sync.inline.ts` plus a `/sync` settings page.

### Auto-sync triggers

- **On every state change**: `state.update()` bumps `meta.lastWriteAt`, schedules a debounced PUT for 2 seconds out.
- **On page load** (`document.addEventListener("nav")`): if sync configured, GET the remote blob, compare `meta.lastWriteAt`, and replace local if remote is newer. Re-render affected UI.

Conflict policy: last-write-wins on the whole blob. Two devices editing concurrently → one loses. Acceptable for solo + occasional cross-device use.

### Status indicator

A small dot in the page footer:
- 🟢 green: synced
- 🟡 amber: pending push
- 🔴 red: last sync failed (tooltip shows error)

### Settings page (`content/sync.md` + custom component)

- Username field (display only).
- "Generate new sync key" (UUIDv4) + paste-existing-key field.
- "Test sync" button.
- "Force push now" / "Force pull now" buttons (escape hatches).
- Warning: *"Save your sync key somewhere safe. It's your only way to recover."*
- "Disable sync" — clears `state.sync`; local state untouched.

### Failure modes

- Network error → red dot, retry on next change.
- 401 → red dot with "auth failed" (likely bad secret).
- 413 → red dot with "blob too large" (alerts user to prune annotations).

## Rollout order

Each step ships an independent PR. Steps marked **autonomous** require no owner intervention; **owner** steps need Cloudflare account + DNS / similar one-time setup.

- **Step 0 — Show-answer bug fix** *(autonomous, ~30 min)*
  Wrap `- Show ...` parent-bullet + children in `<details>`/`<summary>` so the Quick-Check sections actually click-to-reveal. Today they render as plain nested bullets with the answer always visible. Bug not strictly part of QoL, but small enough to ship together.

- **Step 1 — Unified state module + migration** *(autonomous)*
  Land `state.inline.ts` with `read` / `update` / `reset`. Migrate existing localStorage keys into the new blob. Refactor cards + TODOs to use the new API. No user-visible change.

- **Step 2 — Page-done + TODO progress in Explorer** *(autonomous)*
  Page-done toggle component + Explorer customization. Build-time `todos-index.json` emitter. Visible UI lands.

- **Step 3 — Per-block annotations** *(autonomous)*
  Transformer that tags blocks with stable IDs. Runtime script for hover-icon + editor + persistent marker.

- **Step 4 — Sync server** *(owner step — needs Cloudflare account, DNS, KV setup)*
  Stand up `learning-sync` repo. Deploy Worker. Configure KV namespace. Point `sync.nucleogenesis.org` at it. ~20 min of Cloudflare clicks once the repo is ready.

- **Step 5 — Sync client + `/sync` settings page** *(autonomous; depends on Step 4)*
  Auto-push debounce, auto-pull on load, status dot, settings page with key generation and force-push/pull.

## Migration / backwards-compatibility risks

- **Stale localStorage from before the unified key.** Handled by Step 1's migration. Old keys are deleted after migration so they don't drift.
- **Sync-enabled client meets old-schema data on server.** Schema version bump + migration logic gates this. Worst case, a forward-incompatible client refuses to merge and shows a sync-failed dot.
- **Two clients on different schema versions push to the same bucket.** Last-write-wins means the older client could overwrite newer-schema fields. Mitigation: client preserves unknown fields through round-trips. Newer-schema fields survive even if an older client loaded → resaved.

## Open questions / parked

- **Per-field timestamps for finer conflict resolution.** Out of scope; bring back if last-write-wins bites.
- **Mobile UX for the annotation editor.** Address in the Step 6 polish pass after lived-with feedback.
- **Per-PR preview deployments via Cloudflare Pages.** Parked; staying on GH Pages for now.
