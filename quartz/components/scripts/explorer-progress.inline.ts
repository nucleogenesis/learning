/**
 * Decorate the Explorer with per-page progress.
 *
 * For each Learning page link in the Explorer:
 *   - If the page is marked done in state.pages → ✓ glyph + strikethrough.
 *   - If the page has TODOs (per public/todos-index.json) → thin gradient
 *     bar (red → yellow → green) + percentage label beneath the link.
 *
 * Quartz's Explorer populates the tree from <template> elements client-side
 * after `nav`, so we use a MutationObserver on the Explorer container to
 * decorate items as they appear.
 */

declare global {
  interface Window {
    LearningState?: {
      read: () => {
        pages: Record<string, { doneAt: number }>
        todos: Record<string, boolean>
      }
    }
    __learningTodosIndex?: Record<string, number>
  }
}

async function loadIndex(): Promise<Record<string, number>> {
  if (window.__learningTodosIndex) return window.__learningTodosIndex
  try {
    // Leading-slash path → origin-relative, so it resolves regardless of
    // whether the current URL has a trailing slash.
    const url = new URL("/todos-index.json", document.baseURI).toString()
    const res = await fetch(url, { credentials: "omit" })
    if (!res.ok) throw new Error(`fetch failed: ${res.status}`)
    const data = (await res.json()) as Record<string, number>
    window.__learningTodosIndex = data
    return data
  } catch {
    window.__learningTodosIndex = {}
    return {}
  }
}

function slugFromHref(href: string | null): string | null {
  if (!href) return null
  // Hrefs from the Explorer are relative paths like "../../Learning/DSA/Graphs/Basics".
  // Resolve against the current page, then strip a leading "/" and the GH-Pages
  // subpath if present.
  try {
    const url = new URL(href, window.location.href)
    let path = url.pathname
    // Strip leading slash.
    path = path.replace(/^\/+/, "")
    // Strip trailing slash + "index" (folder URLs map to <folder>/index slug).
    path = path.replace(/\/$/, "")
    if (!path.startsWith("Learning/") && !path.endsWith("/Learning") && path !== "Learning") {
      // Could be on the GH-Pages subpath (e.g., /learning/Learning/...) — find the
      // first segment named "Learning" and slice from there.
      const idx = path.indexOf("Learning/")
      if (idx === -1) return null
      path = path.slice(idx)
    }
    return path
  } catch {
    return null
  }
}

function classifyBarColor(pct: number): string {
  // Red <30%, amber 30–69%, green ≥70%. Linear hue from red to green via amber.
  if (pct >= 100) return "var(--tertiary, #2e7d32)"
  const hue = Math.round((pct / 100) * 120) // 0=red, 60=yellow, 120=green
  return `hsl(${hue}, 65%, 45%)`
}

function countDoneTodos(slug: string, total: number, todos: Record<string, boolean>): number {
  // Per-checkbox keys are `<slug>/<idx>`.
  let done = 0
  for (let i = 0; i < total; i++) {
    if (todos[`${slug}/${i}`]) done += 1
  }
  return done
}

function decorateAnchor(
  a: HTMLAnchorElement,
  pagesState: Record<string, { doneAt: number }>,
  todosState: Record<string, boolean>,
  todosIndex: Record<string, number>,
) {
  if (a.dataset.progressDecorated === "1") return
  const slug = slugFromHref(a.getAttribute("href"))
  if (!slug) return
  a.dataset.progressDecorated = "1"

  // Done flag (page-level).
  if (slug in pagesState) {
    a.classList.add("page-done")
  }

  // TODO progress bar (if any TODOs on the page).
  const total = todosIndex[slug] ?? 0
  if (total > 0) {
    const done = countDoneTodos(slug, total, todosState)
    const pct = Math.round((done / total) * 100)
    const bar = document.createElement("span")
    bar.className = "explorer-todo-bar"
    bar.title = `${done} / ${total} done`
    bar.innerHTML = `<span class="explorer-todo-bar-track"><span class="explorer-todo-bar-fill" style="width: ${pct}%; background: ${classifyBarColor(pct)};"></span></span><span class="explorer-todo-bar-pct">${pct}%</span>`
    // Place after the anchor inside its parent <li> so the bar reads as a
    // separate row below the link text.
    a.insertAdjacentElement("afterend", bar)
  }
}

let cachedIndex: Record<string, number> | null = null

async function decorateAll() {
  if (!window.LearningState) return
  const state = window.LearningState.read()
  if (!cachedIndex) cachedIndex = await loadIndex()
  document
    .querySelectorAll<HTMLAnchorElement>(".explorer-ul a[href]")
    .forEach((a) => decorateAnchor(a, state.pages, state.todos, cachedIndex!))
}

function setupExplorerProgress() {
  if (!window.LearningState) return

  // Decorate whatever's already there, then watch for added nodes (Explorer
  // hydrates from <template>s client-side after `nav`).
  decorateAll()

  const container = document.querySelector<HTMLElement>(".explorer")
  if (!container) return

  const observer = new MutationObserver(() => {
    decorateAll()
  })
  observer.observe(container, { childList: true, subtree: true })
  window.addCleanup(() => observer.disconnect())

  // Also re-decorate when state changes (e.g., after toggling page-done or
  // checking a TODO).
  const onStateChange = () => {
    // Clear decoration markers so we redecorate fresh.
    document
      .querySelectorAll<HTMLElement>(".explorer-todo-bar")
      .forEach((el) => el.remove())
    document
      .querySelectorAll<HTMLAnchorElement>(".explorer-ul a[data-progress-decorated]")
      .forEach((a) => {
        a.classList.remove("page-done")
        delete a.dataset.progressDecorated
      })
    decorateAll()
  }
  window.addEventListener("learning-state-change", onStateChange)
  window.addCleanup(() => window.removeEventListener("learning-state-change", onStateChange))
}

document.addEventListener("nav", setupExplorerProgress)
