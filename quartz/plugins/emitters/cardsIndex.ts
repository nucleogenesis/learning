import { QuartzEmitterPlugin } from "../types"
import { write } from "./helpers"
import { FullSlug } from "../../util/path"
import { toHtml } from "hast-util-to-html"
import { visit } from "unist-util-visit"
import { Element as HastElement, Root as HtmlRoot } from "hast"

/**
 * Emit `public/cards-index.json` — an array of every `#card` block on the
 * site, in a shape the `/review` page consumes to build a site-wide
 * spaced-repetition queue.
 *
 * Each entry contains:
 *   - id: the FNV-1a hash stamped by the Flashcards transformer
 *   - slug: source page's slug, for linking back from /review
 *   - tags: lowercased, slug-friendly tag list inherited from the source
 *     page's frontmatter `tags:` (drives the /review tag filter UI)
 *   - question: plain-text question (for sort / search later)
 *   - html: the full <li class="flashcard">…</li> HTML, ready to inject
 *
 * Cards de-dup by id (same content may appear on multiple pages if it's
 * ever cross-referenced; the first occurrence wins).
 */

type CardEntry = {
  id: string
  slug: string
  tags: string[]
  question: string
  html: string
}

function slugifyTag(t: unknown): string {
  return String(t ?? "")
    .toLowerCase()
    .trim()
    .replace(/\s+/g, "-")
}

function pageTags(file: { data: { frontmatter?: Record<string, unknown> } }): string[] {
  const raw = file.data.frontmatter?.tags
  if (!Array.isArray(raw)) return []
  const slugged = raw.map(slugifyTag).filter((t) => t.length > 0)
  // De-dup while preserving order.
  return [...new Set(slugged)]
}

function getClassList(node: HastElement): string[] {
  const props = node.properties ?? {}
  const cls = props.className
  if (Array.isArray(cls)) return cls.map(String)
  if (typeof cls === "string") return cls.split(/\s+/).filter(Boolean)
  return []
}

function textOf(node: unknown): string {
  if (!node || typeof node !== "object") return ""
  const n = node as { type?: string; value?: string; children?: unknown[] }
  if (n.type === "text") return n.value ?? ""
  if (!n.children) return ""
  let out = ""
  for (const child of n.children) out += textOf(child)
  return out
}

function findQuestionText(li: HastElement): string {
  let out = ""
  visit(li, "element", (n: HastElement) => {
    if (out) return
    if (getClassList(n).includes("flashcard-q")) {
      out = textOf(n).trim()
    }
  })
  return out
}

export const CardsIndex: QuartzEmitterPlugin = () => ({
  name: "CardsIndex",
  async *emit(ctx, content) {
    const seen = new Set<string>()
    const cards: CardEntry[] = []

    for (const [tree, file] of content) {
      const slug = (file.data.slug ?? "") as string
      const tags = pageTags(file as { data: { frontmatter?: Record<string, unknown> } })
      visit(tree as HtmlRoot, "element", (node: HastElement) => {
        if (node.tagName !== "li") return
        const cls = getClassList(node)
        if (!cls.includes("flashcard")) return
        // HAST normalizes data-* attributes to camelCase.
        const id =
          ((node.properties?.["data-card-id"] as string) ??
            (node.properties?.dataCardId as string)) ||
          ""
        if (!id || seen.has(id)) return
        seen.add(id)
        cards.push({
          id,
          slug,
          tags,
          question: findQuestionText(node),
          html: toHtml(node, { allowDangerousHtml: true }),
        })
      })
    }

    const path = await write({
      ctx,
      content: JSON.stringify(cards),
      slug: "cards-index" as FullSlug,
      ext: ".json",
    })
    yield path
  },
  async *partialEmit() {},
})
