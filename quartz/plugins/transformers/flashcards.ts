import { QuartzTransformerPlugin } from "../types"
import { Root, Html, Paragraph, Text, ListItem } from "mdast"
import { visit } from "unist-util-visit"
import { JSResource, CSSResource } from "../../util/resources"
// @ts-ignore
import flashcardsScript from "../../components/scripts/flashcards.inline"
import flashcardsStyle from "../../components/styles/flashcards.inline.scss"

const CARD_TAG_RE = /(^|\s)#card\b/
const CLOZE_RE = /\{\{cloze ([\s\S]+?)\}\}/g

/**
 * Logseq-style flashcards.
 *
 * - A list item whose first paragraph contains `#card` becomes a
 *   click-to-reveal Q/A using native `<details>`/`<summary>`. The question
 *   is the paragraph (minus the `#card` token); the answer is whatever
 *   else lives in that list item.
 * - `{{cloze TEXT}}` becomes a `<span class="cloze">` whose text is blanked
 *   by CSS until clicked. JS toggles the `revealed` class on click.
 */
export const Flashcards: QuartzTransformerPlugin = () => ({
  name: "Flashcards",
  textTransform(_ctx, src) {
    // Cloze handling happens at the raw-markdown stage because cloze content
    // can include inline markdown (`**bold**`, `` `code` ``). At MDAST level
    // the cloze body is split across multiple sibling nodes, so a node-level
    // find-and-replace can't span the full match. Replacing in raw markdown
    // emits inline HTML; the markdown parser still parses any markdown inside
    // the <span> as inline content.
    return src.replace(CLOZE_RE, (_match, inner) => {
      return `<span class="cloze" tabindex="0" role="button" aria-label="Click to reveal">${inner}</span>`
    })
  },
  markdownPlugins() {
    return [
      () => (tree: Root) => {
        // Cards — wrap qualifying list items in <details>/<summary>.
        visit(tree, "listItem", (node: ListItem) => {
          if (node.children.length === 0) return
          const first = node.children[0]
          if (first.type !== "paragraph") return

          // Only match `#card` in plain text children — never inside inline code,
          // links, images, or other non-text spans. A backticked `#card` mention
          // in prose should not be treated as a flashcard tag.
          if (!paragraphHasCardTag(first)) return

          // Strip the `#card` token (and the whitespace before it) from text nodes.
          stripCardTag(first)

          // node.children = [question paragraph, ...answer blocks]
          // We wrap with raw HTML so the rendered <li> becomes:
          //   <li class="flashcard">
          //     <details class="flashcard-details">
          //       <summary class="flashcard-q">…question…</summary>
          //       <div class="flashcard-a">…answer…</div>
          //     </details>
          //   </li>
          const data = (node.data ??= {})
          const hProps =
            typeof data.hProperties === "object" && data.hProperties !== null ? data.hProperties : {}
          data.hProperties = {
            ...hProps,
            className: ["flashcard"],
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
          const close: Html = {
            type: "html",
            value: "</div></details>",
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
  // Walk the paragraph's children and remove the `#card` token from text nodes.
  // We also drop any text node that becomes empty after stripping.
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

