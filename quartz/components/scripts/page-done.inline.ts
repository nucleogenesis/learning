/**
 * Wires the "Mark as done" toggle on each content page to
 * `window.LearningState.pages[<slug>]`.
 */

declare global {
  interface Window {
    LearningState?: {
      read: () => { pages: Record<string, { doneAt: number }> }
      update: (
        fn: (s: { pages: Record<string, { doneAt: number }> }) => void,
      ) => void
    }
  }
}

// IIFE-wrap (see comment in review.inline.ts).
;(() => {
function setLabel(btn: HTMLButtonElement, done: boolean) {
  btn.setAttribute("aria-pressed", done ? "true" : "false")
  const label = btn.querySelector<HTMLElement>(".page-done-label")
  if (label) label.textContent = done ? "Done" : "Mark as done"
  btn.setAttribute("aria-label", done ? "Mark page as not done" : "Mark page as done")
}

function onClick(this: HTMLButtonElement) {
  const slug = this.dataset.pageSlug
  if (!slug || !window.LearningState) return
  const state = window.LearningState.read()
  const isDone = slug in state.pages
  window.LearningState.update((s) => {
    if (isDone) delete s.pages[slug]
    else s.pages[slug] = { doneAt: Date.now() }
  })
  setLabel(this, !isDone)
}

function setupPageDone() {
  if (!window.LearningState) return
  const state = window.LearningState.read()
  document.querySelectorAll<HTMLButtonElement>(".page-done-toggle").forEach((btn) => {
    const slug = btn.dataset.pageSlug
    if (!slug) return
    setLabel(btn, slug in state.pages)
    btn.addEventListener("click", onClick)
    window.addCleanup(() => btn.removeEventListener("click", onClick))
  })
}

document.addEventListener("nav", setupPageDone)
})()
