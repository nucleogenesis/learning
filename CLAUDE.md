# CLAUDE.md — guidance for AI assistants

## Source of truth

Notes in `content/Learning/**` are **published copies** of pages from Jacob's private Logseq graph. The Logseq graph is the source of truth; this repo is downstream.

**Do not** edit Markdown in `content/Learning/**` directly when the change should round-trip back into Jacob's notes. Instead:

1. Make the change in Logseq.
2. Run the `/publish-learnings` skill (lives at `~/.claude/skills/publish-learnings/`) to re-export.

Direct edits to `content/Learning/**` are acceptable only for:

- Site-specific concerns that don't belong in Logseq (e.g., link to a non-Logseq URL).
- Outside-contributor PRs (the author isn't expected to have access to Jacob's graph).

Either way, flag the divergence in the commit message so it can be reconciled upstream.

## Publish allowlist

Only pages whose Logseq name starts with `Learning/` are eligible for publish. The publish skill enforces this with a hard allowlist before writing any file. Do not loosen this without an explicit owner decision.

## Architecture

See `docs/plans/2026-05-14-learning-notes-design.md` for the full design — sources, build pipeline, reader-side state model, rollout phases.

## Local dev

```sh
npm ci
npx quartz build           # one-shot build → public/
npx quartz build --serve   # live-reload dev server on :8080
```

## Deploy

`main` → GitHub Actions → GitHub Pages at https://learning.nucleogenesis.org/ (custom domain; `nucleogenesis.github.io/learning/` still resolves as a backup).
PRs trigger build-only checks (no deploy).
