/**
 * Per-block annotations.
 *
 * The flashcards transformer's HAST pass stamps every annotatable block
 * (paragraph, code block, blockquote, plain list item) with `class=annotatable`
 * and `data-block-id="<fnv1a(slug + '::' + text)>"`.
 *
 * On every nav we:
 *   - Inject a 📝 button in each annotatable block (hidden until hover or focus).
 *   - If `state.annots[<id>]` exists, mark the block `has-annot` so a 💬 marker
 *     stays visible.
 *   - Click the icon → open an inline editor panel below the block. Auto-saves
 *     on blur or pressing Escape. Empty text on save deletes the annotation.
 */

declare global {
  interface Window {
    LearningState?: {
      read: () => {
        annots: Record<string, { text: string; createdAt: number; updatedAt: number }>
      }
      update: (
        fn: (s: {
          annots: Record<string, { text: string; createdAt: number; updatedAt: number }>
        }) => void,
      ) => void
    }
  }
}

// IIFE-wrap (see comment in review.inline.ts).
;(() => {
function svgPencil(): string {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 20h9"/><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"/></svg>`
}

function svgComment(): string {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"/></svg>`
}

function getAnnot(id: string): string {
  const state = window.LearningState!.read()
  return state.annots[id]?.text ?? ""
}

function setAnnot(id: string, text: string) {
  window.LearningState!.update((s) => {
    const trimmed = text.trim()
    if (trimmed.length === 0) {
      delete s.annots[id]
      return
    }
    const now = Date.now()
    const existing = s.annots[id]
    s.annots[id] = {
      text: trimmed,
      createdAt: existing?.createdAt ?? now,
      updatedAt: now,
    }
  })
}

function refreshMarker(block: HTMLElement, id: string) {
  const has = getAnnot(id).length > 0
  block.classList.toggle("has-annot", has)
  const icon = block.querySelector<HTMLButtonElement>(":scope > .annot-icon")
  if (icon) icon.innerHTML = has ? svgComment() : svgPencil()
}

function findOrCreatePanel(block: HTMLElement): HTMLElement {
  const next = block.nextElementSibling
  if (next instanceof HTMLElement && next.classList.contains("annot-panel")) return next
  const panel = document.createElement("aside")
  panel.className = "annot-panel"
  panel.hidden = true
  panel.innerHTML = `<textarea class="annot-textarea" rows="3" placeholder="Your note (just for you, syncs across your devices)"></textarea><div class="annot-actions"><button type="button" class="annot-delete" hidden>Delete</button><span class="annot-hint">Esc to save & close</span></div>`
  block.insertAdjacentElement("afterend", panel)
  return panel
}

function openPanel(block: HTMLElement, id: string) {
  const panel = findOrCreatePanel(block)
  const textarea = panel.querySelector<HTMLTextAreaElement>(".annot-textarea")!
  const deleteBtn = panel.querySelector<HTMLButtonElement>(".annot-delete")!
  const current = getAnnot(id)
  textarea.value = current
  deleteBtn.hidden = current.length === 0
  panel.hidden = false

  const close = () => {
    setAnnot(id, textarea.value)
    refreshMarker(block, id)
    panel.hidden = true
    textarea.removeEventListener("keydown", onKey)
    textarea.removeEventListener("blur", close)
    deleteBtn.removeEventListener("click", onDelete)
  }
  const onKey = (e: KeyboardEvent) => {
    if (e.key === "Escape") {
      e.preventDefault()
      textarea.blur()
    }
  }
  const onDelete = () => {
    textarea.value = ""
    close()
  }
  textarea.addEventListener("keydown", onKey)
  textarea.addEventListener("blur", close)
  deleteBtn.addEventListener("click", onDelete)
  textarea.focus()
  textarea.setSelectionRange(textarea.value.length, textarea.value.length)
}

function attachIcon(block: HTMLElement, id: string) {
  if (block.querySelector(":scope > .annot-icon")) return
  const btn = document.createElement("button")
  btn.type = "button"
  btn.className = "annot-icon"
  btn.setAttribute("aria-label", "Add or edit note for this block")
  btn.innerHTML = svgPencil()
  btn.addEventListener("click", (e) => {
    e.preventDefault()
    e.stopPropagation()
    openPanel(block, id)
  })
  block.insertBefore(btn, block.firstChild)
  refreshMarker(block, id)
}

function setupAnnotations() {
  if (!window.LearningState) return
  const blocks = document.querySelectorAll<HTMLElement>(".annotatable[data-block-id]")
  blocks.forEach((block) => {
    const id = block.dataset.blockId
    if (!id) return
    attachIcon(block, id)
  })

  const onStateChange = () => {
    document.querySelectorAll<HTMLElement>(".annotatable[data-block-id]").forEach((block) => {
      const id = block.dataset.blockId
      if (id) refreshMarker(block, id)
    })
  }
  window.addEventListener("learning-state-change", onStateChange)
  window.addCleanup(() => window.removeEventListener("learning-state-change", onStateChange))
}

document.addEventListener("nav", setupAnnotations)
})()
