/**
 * Build downloadable Anki decks from the published Learning content.
 *
 * Scans content/Learning/** for two patterns:
 *   - Cards: a list item containing `#card`; question is the line text minus
 *     `#card`, answer is the contents of nested children (rendered as HTML).
 *   - Cloze: any `{{cloze TEXT}}` occurrence becomes a fill-in-the-blank card,
 *     front = sentence with [...] in place of TEXT, back = the full sentence.
 *
 * Groups cards by the second namespace segment (e.g. "DSA" for
 * `content/Learning/DSA/Graphs/Basics.md`). Emits per-group `.apkg` files
 * plus a `learning-notes-all.apkg` master deck and an `index.html` listing.
 *
 * Run after `npx quartz build` so output lands inside the same `public/` dir
 * that Pages publishes.
 */

import { promises as fs } from "node:fs"
import * as path from "node:path"
// anki-apkg-export ships a CJS module with shape `{ default: Class, Exporter: Class }`.
// We use createRequire so the module loads in the same shape Node sees, regardless
// of tsx/esbuild interop behavior.
import { createRequire } from "node:module"
const require_ = createRequire(import.meta.url)
const AnkiExport: any = require_("anki-apkg-export").default

type Card = {
  frontHtml: string
  backHtml: string
  sourcePage: string // e.g. "Learning/DSA/Graphs/Basics"
  group: string // e.g. "DSA"
}

const CONTENT_ROOT = path.resolve("content")
const PUBLIC_ROOT = path.resolve("public")
const DECKS_ROOT = path.join(PUBLIC_ROOT, "decks")
const LEARNING_PREFIX = "Learning/"

async function main() {
  const files = await collectMarkdown(path.join(CONTENT_ROOT, "Learning"))
  const cards: Card[] = []
  for (const file of files) {
    cards.push(...(await extractCards(file)))
  }
  console.log(`Extracted ${cards.length} cards from ${files.length} files.`)

  await fs.mkdir(DECKS_ROOT, { recursive: true })

  // Group by second-level namespace ("DSA", "Trees", etc.).
  const byGroup = new Map<string, Card[]>()
  for (const c of cards) {
    const arr = byGroup.get(c.group) ?? []
    arr.push(c)
    byGroup.set(c.group, arr)
  }

  // Per-group decks.
  const generated: { name: string; file: string; count: number }[] = []
  for (const [group, groupCards] of byGroup) {
    const fileName = `${slugify(group)}.apkg`
    await writeDeck(`Learning ▸ ${group}`, groupCards, path.join(DECKS_ROOT, fileName))
    generated.push({ name: `Learning ▸ ${group}`, file: fileName, count: groupCards.length })
  }

  // Master deck.
  if (cards.length > 0) {
    const master = "learning-notes-all.apkg"
    await writeDeck("Learning (all)", cards, path.join(DECKS_ROOT, master))
    generated.push({ name: "Learning (all)", file: master, count: cards.length })
  }

  // index.html listing.
  await fs.writeFile(path.join(DECKS_ROOT, "index.html"), renderIndex(generated), "utf8")
  console.log(`Wrote ${generated.length} deck(s) to ${DECKS_ROOT}/`)
}

async function collectMarkdown(dir: string): Promise<string[]> {
  let out: string[] = []
  let entries: import("node:fs").Dirent[]
  try {
    entries = await fs.readdir(dir, { withFileTypes: true })
  } catch {
    return []
  }
  for (const e of entries) {
    const full = path.join(dir, e.name)
    if (e.isDirectory()) {
      out = out.concat(await collectMarkdown(full))
    } else if (e.isFile() && e.name.endsWith(".md")) {
      out.push(full)
    }
  }
  return out
}

async function extractCards(file: string): Promise<Card[]> {
  const src = await fs.readFile(file, "utf8")
  const relFromContent = path.relative(CONTENT_ROOT, file).replace(/\.md$/, "").replace(/\/index$/, "")
  if (!relFromContent.startsWith(LEARNING_PREFIX) && relFromContent !== "Learning") return []

  const sourcePage = relFromContent
  // group = first segment under Learning/
  const afterLearning = relFromContent.slice(LEARNING_PREFIX.length)
  const group = afterLearning.split("/")[0] || "Index"

  const body = stripFrontmatter(src)
  const cards: Card[] = []

  // 1) Cards: list items with `#card`. Parse by indentation.
  cards.push(...extractListItemCards(body, sourcePage, group))

  // 2) Cloze cards: each {{cloze TEXT}} in any line that isn't already inside
  //    a card body. We collect them everywhere; duplicates within the same
  //    sentence are fine.
  cards.push(...extractClozeCards(body, sourcePage, group))

  return cards
}

function stripFrontmatter(s: string): string {
  if (!s.startsWith("---\n")) return s
  const end = s.indexOf("\n---\n", 4)
  if (end === -1) return s
  return s.slice(end + 5)
}

function extractListItemCards(body: string, sourcePage: string, group: string): Card[] {
  const cards: Card[] = []
  const lines = body.split(/\r?\n/)
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]
    const m = line.match(/^(\s*)-\s+(.*?)\s*#card\b\s*(.*)$/)
    if (!m) continue
    const [, indent, beforeTag, afterTag] = m
    const questionText = (beforeTag + (afterTag ?? "")).trim()
    if (!questionText) continue
    const indentLen = indent.length

    // Collect children: subsequent lines with greater indent.
    const childLines: string[] = []
    let j = i + 1
    while (j < lines.length) {
      const next = lines[j]
      if (next.trim() === "") {
        childLines.push(next)
        j++
        continue
      }
      const nextIndent = next.match(/^(\s*)/)?.[1].length ?? 0
      if (nextIndent <= indentLen) break
      childLines.push(next)
      j++
    }

    // De-indent children by the question's indent + 2 (one bullet + space).
    const dedent = indent + "  "
    const answerMd = childLines
      .map((l) => (l.startsWith(dedent) ? l.slice(dedent.length) : l))
      .join("\n")
      .replace(/^\s*-\s+/gm, "") // strip leading "- " on each child bullet
      .trim()

    cards.push({
      frontHtml: escapeHtml(questionText) + sourceFootnote(sourcePage),
      backHtml: mdInlineToHtml(answerMd) + sourceFootnote(sourcePage),
      sourcePage,
      group,
    })
  }
  return cards
}

function extractClozeCards(body: string, sourcePage: string, group: string): Card[] {
  const cards: Card[] = []
  const lineRe = /[^\r\n]+/g
  const clozeRe = /\{\{cloze ([\s\S]+?)\}\}/
  let lineMatch: RegExpExecArray | null
  while ((lineMatch = lineRe.exec(body))) {
    const line = lineMatch[0]
    if (!clozeRe.test(line)) continue
    // For each cloze occurrence in the line, generate a card.
    let work = line
    let occ: RegExpExecArray | null
    const re = /\{\{cloze ([\s\S]+?)\}\}/g
    while ((occ = re.exec(line))) {
      const inner = occ[1].trim()
      const front = line.replace(/\{\{cloze ([\s\S]+?)\}\}/g, (m, t) =>
        m === occ![0] ? "[...]" : t,
      )
      const back = line.replace(/\{\{cloze ([\s\S]+?)\}\}/g, "$1")
      cards.push({
        frontHtml: cleanCardLine(front) + sourceFootnote(sourcePage),
        backHtml: cleanCardLine(back) + sourceFootnote(sourcePage),
        sourcePage,
        group,
      })
      // Avoid generating duplicate cards for nested matches.
      void inner
    }
    void work
  }
  return cards
}

// Strip leading bullet markers and `#card` if present, leave inline formatting.
function cleanCardLine(s: string): string {
  return mdInlineToHtml(s.replace(/^\s*-\s+/, "").replace(/\s*#card\b/, "").trim())
}

// Very small inline-markdown → HTML. Handles **bold**, *italic*, `code`, and
// [[wikilink]] → text. Block markdown (lists, codeblocks, headings) inside a
// card body comes through as plain text — good enough for Anki.
function mdInlineToHtml(s: string): string {
  let out = escapeHtml(s)
  out = out.replace(/\[\[([^\]|]+)\|([^\]]+)\]\]/g, "$2")
  out = out.replace(/\[\[([^\]]+)\]\]/g, "$1")
  out = out.replace(/`([^`]+)`/g, "<code>$1</code>")
  out = out.replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>")
  out = out.replace(/(^|\W)\*([^*\n]+)\*(?=\W|$)/g, "$1<em>$2</em>")
  // Preserve hard newlines as <br>.
  out = out.replace(/\n/g, "<br>")
  return out
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;")
}

function sourceFootnote(sourcePage: string): string {
  return `<div class="source" style="margin-top:0.6em;font-size:0.75em;color:#888">source: ${escapeHtml(sourcePage)}</div>`
}

function slugify(s: string): string {
  return s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "")
}

async function writeDeck(name: string, cards: Card[], outPath: string): Promise<void> {
  const apkg = new (AnkiExport as any)(name)
  for (const c of cards) {
    apkg.addCard(c.frontHtml, c.backHtml, { tags: [slugify(c.group), slugify(c.sourcePage)] })
  }
  const zip: Buffer = await apkg.save()
  await fs.writeFile(outPath, zip, "binary")
}

function renderIndex(
  decks: { name: string; file: string; count: number }[],
): string {
  const rows = decks
    .map(
      (d) =>
        `<li><a href="${d.file}" download>${escapeHtml(d.name)}</a> — ${d.count} card${d.count === 1 ? "" : "s"}</li>`,
    )
    .join("\n")
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<title>Anki decks — Learning notes</title>
<meta name="viewport" content="width=device-width, initial-scale=1">
<style>
  body { font-family: system-ui, sans-serif; max-width: 40rem; margin: 3rem auto; padding: 0 1rem; line-height: 1.5; }
  h1 { font-size: 1.4rem; margin-bottom: 0.4rem; }
  p.lede { color: #666; margin-top: 0; }
  ul { padding-left: 1.2rem; }
  li { margin: 0.4rem 0; }
  a { color: #2557a7; }
  code { background: #f4f4f4; padding: 0 0.25em; border-radius: 3px; }
</style>
</head>
<body>
<h1>Anki decks</h1>
<p class="lede">Downloadable <code>.apkg</code> files generated from the <code>#card</code> and <code>{{cloze}}</code> entries on this site. Import into Anki via <strong>File → Import</strong>.</p>
<ul>
${rows}
</ul>
<p style="margin-top:2rem;color:#888;font-size:0.85em">← <a href="..">back to the site</a></p>
</body>
</html>
`
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
