import { QuartzTransformerPlugin } from "../types"
import { Root, Html, Paragraph, Text, ListItem } from "mdast"
import { visit } from "unist-util-visit"
import { toString as mdastToString } from "mdast-util-to-string"
import { JSResource, CSSResource } from "../../util/resources"
// @ts-ignore
import flashcardsScript from "../../components/scripts/flashcards.inline"
import flashcardsStyle from "../../components/styles/flashcards.inline.scss"

const CARD_TAG_RE = /(^|\s)#card\b/
const CLOZE_RE = /\{\{cloze ([\s\S]+?)\}\}/g

// `- TODO X` / `- DONE X` / `- LATER X` / `- DOING X` / `- RECHECK X` at the start
// of list items become GFM task list items. Logseq uses these markers; on the web
// they become real checkboxes (and Quartz's OFM enableCheckbox makes them
// interactive + localStorage-persisted via the existing checkbox.inline.ts).
const TODO_LINE_RE = /^(\s*-\s+)(TODO|LATER|DOING|RECHECK)\s+/gm
const DONE_LINE_RE = /^(\s*-\s+)DONE\s+/gm

/**
 * Logseq-style flashcards + cloze + task markers.
 *
 * - A list item whose first paragraph contains `#card` becomes a click-to-reveal
 *   Q/A using native `<details>`/`<summary>`. After reveal, SM-2 rating buttons
 *   (Again/Hard/Good/Easy) update an in-localStorage schedule for that card.
 *   Each card gets a stable `data-card-id` = FNV-1a hash of slug + question text.
 * - `{{cloze TEXT}}` becomes a `<span class="cloze">` blanked until clicked.
 * - `- TODO X` etc. become `- [ ] X` so GFM renders a real checkbox.
 */
export const Flashcards: QuartzTransformerPlugin = () => ({
  name: "Flashcards",
  textTransform(_ctx, src) {
    // Cloze: see comment below — process raw markdown so inline markdown inside
    // cloze still parses.
    let out = src.replace(CLOZE_RE, (_match, inner) => {
      return `<span class="cloze" tabindex="0" role="button" aria-label="Click to reveal">${inner}</span>`
    })
    // Task markers → GFM task list items.
    out = out.replace(TODO_LINE_RE, "$1[ ] ")
    out = out.replace(DONE_LINE_RE, "$1[x] ")
    return out
  },
  markdownPlugins() {
    return [
      () => (tree: Root, file) => {
        const slug = (file.data.slug ?? "") as string

        visit(tree, "listItem", (node: ListItem) => {
          if (node.children.length === 0) return
          const first = node.children[0]
          if (first.type !== "paragraph") return

          // Only match `#card` in plain text children — not inside code/links.
          if (!paragraphHasCardTag(first)) return

          stripCardTag(first)

          // Stable card id = FNV-1a(slug + ":" + question text). Survives content
          // edits as long as the question wording is stable.
          const questionText = mdastToString(first).trim()
          const cardId = fnv1a(slug + ":" + questionText)

          const data = (node.data ??= {})
          const hProps =
            typeof data.hProperties === "object" && data.hProperties !== null
              ? (data.hProperties as Record<string, unknown>)
              : {}
          data.hProperties = {
            ...hProps,
            className: ["flashcard"],
            "data-card-id": cardId,
          }

          const [question, ...answer] = node.children
          const open: Html = {
            type: "html",
            value: '<details class="flashcard-details"><summary class="flashcard-q">',
          }
          const midClose: Html = {
            type: "html",
            value: '</summary><div class="flashcard-a">',
          }
          // SRS row + due-date display, both populated client-side from localStorage.
          const close: Html = {
            type: "html",
            value: `</div><div class="flashcard-srs">
<button type="button" class="srs-btn srs-again" data-rating="again">Again</button>
<button type="button" class="srs-btn srs-hard"  data-rating="hard">Hard</button>
<button type="button" class="srs-btn srs-good"  data-rating="good">Good</button>
<button type="button" class="srs-btn srs-easy"  data-rating="easy">Easy</button>
</div><div class="flashcard-due" aria-live="polite"></div></details>`,
          }

          node.children = [open, question, midClose, ...answer, close]
        })
      },
    ]
  },
  externalResources() {
    const js: JSResource[] = [
      {
        script: flashcardsScript,
        loadTime: "afterDOMReady",
        contentType: "inline",
      },
    ]
    const css: CSSResource[] = [
      {
        content: flashcardsStyle,
      },
    ]
    return { js, css }
  },
})

function paragraphHasCardTag(para: Paragraph): boolean {
  for (const child of para.children) {
    if (child.type === "text" && CARD_TAG_RE.test((child as Text).value)) {
      return true
    }
  }
  return false
}

function stripCardTag(para: Paragraph) {
  const cleaned: Paragraph["children"] = []
  for (const child of para.children) {
    if (child.type === "text") {
      const txt = (child as Text).value.replace(/\s*#card\b/g, "").trimEnd()
      if (txt.length > 0) {
        cleaned.push({ ...(child as Text), value: txt })
      }
    } else {
      cleaned.push(child)
    }
  }
  para.children = cleaned
}

// 32-bit FNV-1a, hex-encoded. Stable across runs; small enough for HTML attrs.
function fnv1a(s: string): string {
  let h = 0x811c9dc5
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i)
    h = (h + ((h << 1) + (h << 4) + (h << 7) + (h << 8) + (h << 24))) >>> 0
  }
  return h.toString(16).padStart(8, "0")
}
