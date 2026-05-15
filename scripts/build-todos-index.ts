/**
 * Emit public/todos-index.json — for each Learning page, how many task
 * markers (`- TODO`, `- LATER`, `- DOING`, `- RECHECK`, `- DONE`) the source
 * markdown contains. The Explorer's progress decoration consumes this at
 * runtime to compute `state.todos[done] / total`.
 *
 * Pages with zero markers are omitted (no bar rendered for them).
 *
 * Runs after `npx quartz build`; output lands inside `public/` for the
 * Pages artifact upload.
 */

import { promises as fs } from "node:fs"
import * as path from "node:path"

const CONTENT_ROOT = path.resolve("content")
const PUBLIC_ROOT = path.resolve("public")
const OUT_FILE = path.join(PUBLIC_ROOT, "todos-index.json")

// Matches a list-item line whose first word is a Logseq task marker.
// These get rewritten by Plugin.Flashcards's textTransform into GFM task
// list items (`- [ ] X` / `- [x] X`).
const TASK_MARKER_RE = /^\s*-\s+(TODO|LATER|DOING|RECHECK|DONE)\s+/gm

async function walk(dir: string): Promise<string[]> {
  let out: string[] = []
  let entries: import("node:fs").Dirent[]
  try {
    entries = await fs.readdir(dir, { withFileTypes: true })
  } catch {
    return []
  }
  for (const e of entries) {
    const full = path.join(dir, e.name)
    if (e.isDirectory()) out = out.concat(await walk(full))
    else if (e.isFile() && e.name.endsWith(".md")) out.push(full)
  }
  return out
}

function fileToSlug(filePath: string): string {
  const rel = path.relative(CONTENT_ROOT, filePath)
  return rel.replace(/\.md$/, "").replace(/\/index$/, "") || "index"
}

async function main() {
  const files = await walk(path.join(CONTENT_ROOT, "Learning"))
  const index: Record<string, number> = {}
  for (const f of files) {
    const src = await fs.readFile(f, "utf8")
    const matches = src.match(TASK_MARKER_RE)
    const count = matches ? matches.length : 0
    if (count > 0) index[fileToSlug(f)] = count
  }
  await fs.mkdir(PUBLIC_ROOT, { recursive: true })
  await fs.writeFile(OUT_FILE, JSON.stringify(index), "utf8")
  console.log(`Wrote ${OUT_FILE} with ${Object.keys(index).length} page(s).`)
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
