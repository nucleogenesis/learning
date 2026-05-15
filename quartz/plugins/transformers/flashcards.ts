import { QuartzTransformerPlugin } from "../types"
import { Root, Html, Paragraph, Text, ListItem } from "mdast"
import type { Root as HtmlRoot, Element as HastElement } from "hast"
import { visit } from "unist-util-visit"
import { toString as mdastToString } from "mdast-util-to-string"
import { JSResource, CSSResource } from "../../util/resources"
// @ts-ignore
import stateScript from "../../components/scripts/state.inline"
// @ts-ignore
import flashcardsScript from "../../components/scripts/flashcards.inline"
// @ts-ignore
import checkboxesScript from "../../components/scripts/checkboxes.inline"
// @ts-ignore
import explorerProgressScript from "../../components/scripts/explorer-progress.inline"
// @ts-ignore
import annotationsScript from "../../components/scripts/annotations.inline"
// @ts-ignore
import reviewScript from "../../components/scripts/review.inline"
import flashcardsStyle from "../../components/styles/flashcards.inline.scss"

const CARD_TAG_RE = /(^|\s)#card\b/
const CLOZE_RE = /\{\{cloze ([\s\S]+?)\}\}/g

// A list-item whose first paragraph reads "Show <something>" AND has body
// children (the answer) becomes a click-to-reveal <details>. Matches the
// Logseq convention used on Basics/Traversals/etc. quick-check sections:
//   - **Q1**: …question…
//   - Show answer to Q1
//     - answer body
const SHOW_ANSWER_RE = /^\s*Show\b/

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

        // Show-answer collapsibles. Same shape as cards but without the
        // SRS row, and detection by leading "Show " text rather than #card.
        visit(tree, "listItem", (node: ListItem) => {
          if (node.children.length < 2) return // need a body, not just a label
          const first = node.children[0]
          if (first.type !== "paragraph") return

          // Skip list items the card pass already wrapped.
          const existingClasses =
            (typeof node.data?.hProperties === "object" &&
            node.data?.hProperties !== null &&
            Array.isArray((node.data.hProperties as Record<string, unknown>).className)
              ? ((node.data.hProperties as Record<string, unknown>).className as string[])
              : []) ?? []
          if (existingClasses.includes("flashcard") || existingClasses.includes("show-answer")) return

          // Plain-text-only match on the label paragraph (don't trigger on a
          // backticked or linked "Show ..." inside prose).
          if (!paragraphStartsWith(first, SHOW_ANSWER_RE)) return

          const data = (node.data ??= {})
          const hProps =
            typeof data.hProperties === "object" && data.hProperties !== null
              ? (data.hProperties as Record<string, unknown>)
              : {}
          data.hProperties = {
            ...hProps,
            className: [...existingClasses, "show-answer"],
          }

          const [label, ...body] = node.children
          const open: Html = {
            type: "html",
            value: '<details class="show-answer-details"><summary class="show-answer-label">',
          }
          const midClose: Html = {
            type: "html",
            value: '</summary><div class="show-answer-body">',
          }
          const close: Html = { type: "html", value: "</div></details>" }
          node.children = [open, label, midClose, ...body, close]
        })
      },
    ]
  },
  htmlPlugins() {
    return [
      () => (tree: HtmlRoot, file) => {
        const slug = (file.data.slug ?? "") as string

        // 1) Enable GFM task-list checkboxes (Quartz's enableCheckbox option
        //    does the same job; we do it here so we can also stamp a stable
        //    `data-todo-id` for the state-driven persistence layer).
        let idx = 0
        visit(tree, "element", (node: HastElement) => {
          if (node.tagName !== "input") return
          const props = node.properties ?? {}
          if (props.type !== "checkbox") return
          const isChecked = props.checked === true || props.checked === ""
          node.properties = {
            type: "checkbox",
            disabled: false,
            checked: isChecked,
            class: ["checkbox-toggle"],
            "data-todo-id": `${slug}/${idx}`,
          }
          idx += 1
        })

        // 2) Tag annotatable blocks with a stable `data-block-id`. Annotation
        //    eligibility: paragraphs, code blocks, blockquotes, and list items
        //    that aren't already wrapped as flashcards or Show-answer details.
        //    The runtime script reads `state.annots[<blockId>]` and renders an
        //    icon/marker/editor per block.
        visit(tree, "element", (node: HastElement) => {
          if (!isAnnotatable(node)) return
          const text = hastElementText(node).trim()
          if (text.length === 0) return
          const blockId = fnv1a(slug + "::" + text)
          const props = (node.properties ??= {})
          const existingClasses = Array.isArray(props.className)
            ? (props.className as string[])
            : typeof props.className === "string"
              ? [props.className]
              : []
          props.className = [...existingClasses, "annotatable"]
          ;(props as Record<string, unknown>)["data-block-id"] = blockId
        })
      },
    ]
  },
  externalResources() {
    const js: JSResource[] = [
      {
        // State module loads first so feature scripts can read window.LearningState.
        script: stateScript,
        loadTime: "afterDOMReady",
        contentType: "inline",
      },
      {
        script: flashcardsScript,
        loadTime: "afterDOMReady",
        contentType: "inline",
      },
      {
        script: checkboxesScript,
        loadTime: "afterDOMReady",
        contentType: "inline",
      },
      {
        script: explorerProgressScript,
        loadTime: "afterDOMReady",
        contentType: "inline",
      },
      {
        script: annotationsScript,
        loadTime: "afterDOMReady",
        contentType: "inline",
      },
      {
        // Only does anything on the /review page (looks for #review-root).
        script: reviewScript,
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

function paragraphStartsWith(para: Paragraph, re: RegExp): boolean {
  const first = para.children[0]
  return first?.type === "text" && re.test((first as Text).value)
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

const ANNOTATABLE_TAGS = new Set(["p", "blockquote", "pre", "li"])
const SKIP_LI_CLASSES = new Set(["flashcard", "show-answer"])

function isAnnotatable(node: HastElement): boolean {
  if (!ANNOTATABLE_TAGS.has(node.tagName)) return false
  // Skip list items that are already wrapped (flashcards, show-answer
  // collapsibles); their inner content has its own UX and adding the icon
  // would compete with the disclosure-toggle hit area.
  if (node.tagName === "li") {
    const cls = Array.isArray(node.properties?.className)
      ? (node.properties!.className as string[])
      : typeof node.properties?.className === "string"
        ? [node.properties!.className as string]
        : []
    if (cls.some((c) => SKIP_LI_CLASSES.has(c))) return false
  }
  return true
}

function hastElementText(node: HastElement | unknown): string {
  if (!node || typeof node !== "object") return ""
  const n = node as { type?: string; value?: string; children?: unknown[] }
  if (n.type === "text") return n.value ?? ""
  if (!n.children) return ""
  let out = ""
  for (const child of n.children) out += hastElementText(child)
  return out
}
