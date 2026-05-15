/**
 * Drives the `/review` page — a site-wide spaced-repetition queue.
 *
 * - Loads `cards-index.json` (emitted by Plugin.CardsIndex at build time).
 * - Reads SM-2 state from `window.LearningState.cards`.
 * - Tag filter (URL-driven): `?tags=graphs,trees&mode=or|and` narrows the
 *   queue to cards whose source page is tagged with the selected tags. The
 *   filter UI sits above the card area; selecting / deselecting chips and
 *   flipping the combinator toggle updates the URL via history.replaceState.
 * - Computes the due queue from the (optionally filtered) card set:
 *   overdue first by dueMs, then never-reviewed cards.
 * - Injects one card at a time into the body area and reuses the page's
 *   existing flashcards.inline.ts machinery for reveal + rating (re-runs
 *   `window.__setupFlashcards` after each injection).
 * - Advances on `learning-state-change` (fired by LearningState.update).
 */

declare global {
  interface Window {
    LearningState?: {
      read: () => {
        cards: Record<
          string,
          { ef: number; reps: number; intervalDays: number; dueMs: number; lastReviewMs: number }
        >
      }
    }
    __setupFlashcards?: () => void
    __setupCloze?: () => void
  }
}

// Wrap the whole script body in an IIFE so module-level identifiers don't
// leak into the page's global scope and collide with other inline scripts.
;(() => {
type CardEntry = {
  id: string
  slug: string
  tags: string[]
  question: string
  html: string
}

type Mode = "and" | "or"
type Filter = { tags: string[]; mode: Mode }

let cachedCards: CardEntry[] | null = null
let availableTags: string[] = [] // sorted, universal-tag-stripped
let queue: CardEntry[] = []
let currentId: string | null = null
let progress = { reviewed: 0, total: 0 }
let filterAreaEl: HTMLElement | null = null
let bodyAreaEl: HTMLElement | null = null

async function loadCards(): Promise<CardEntry[]> {
  if (cachedCards) return cachedCards
  try {
    const url = new URL("/cards-index.json", document.baseURI).toString()
    const res = await fetch(url, { credentials: "omit" })
    if (!res.ok) throw new Error(`fetch failed: ${res.status}`)
    cachedCards = (await res.json()) as CardEntry[]
  } catch (e) {
    console.error("cards-index.json load failed", e)
    cachedCards = []
  }
  return cachedCards
}

/* ---------- URL filter ---------- */

function parseUrlFilter(): Filter {
  const params = new URLSearchParams(window.location.search)
  const tagsRaw = params.get("tags") ?? ""
  const tags = tagsRaw
    .split(",")
    .map((t) => t.trim().toLowerCase())
    .filter((t) => t.length > 0)
  const modeRaw = (params.get("mode") ?? "or").toLowerCase()
  const mode: Mode = modeRaw === "and" ? "and" : "or"
  return { tags, mode }
}

function writeUrlFilter(f: Filter): void {
  const params = new URLSearchParams(window.location.search)
  if (f.tags.length === 0) params.delete("tags")
  else params.set("tags", f.tags.join(","))
  // Only include `mode` when it matters (multiple tags) and when not the default.
  if (f.tags.length < 2 || f.mode === "or") params.delete("mode")
  else params.set("mode", f.mode)
  const qs = params.toString()
  const url = window.location.pathname + (qs ? "?" + qs : "") + window.location.hash
  window.history.replaceState(null, "", url)
}

function applyTagFilter(cards: CardEntry[], f: Filter): CardEntry[] {
  if (f.tags.length === 0) return cards
  if (f.mode === "and") {
    return cards.filter((c) => f.tags.every((t) => c.tags.includes(t)))
  }
  return cards.filter((c) => f.tags.some((t) => c.tags.includes(t)))
}

/**
 * Tags that appear on EVERY card are useless as filters (selecting them
 * narrows nothing). Hide them from the chip list to keep the UI tidy.
 */
function computeAvailableTags(cards: CardEntry[]): string[] {
  if (cards.length === 0) return []
  const tagCounts = new Map<string, number>()
  for (const c of cards) {
    for (const t of c.tags) {
      tagCounts.set(t, (tagCounts.get(t) ?? 0) + 1)
    }
  }
  return [...tagCounts.entries()]
    .filter(([, n]) => n < cards.length) // strip universal tags
    .map(([t]) => t)
    .sort()
}

/* ---------- Queue ---------- */

function dueComparator(
  a: CardEntry,
  b: CardEntry,
  state: ReturnType<NonNullable<Window["LearningState"]>["read"]>["cards"],
): number {
  const aState = state[a.id]
  const bState = state[b.id]
  const aDue = aState ? aState.dueMs : Number.MAX_SAFE_INTEGER
  const bDue = bState ? bState.dueMs : Number.MAX_SAFE_INTEGER
  const aSort = aState ? aDue : Date.now() + 1
  const bSort = bState ? bDue : Date.now() + 1
  if (aSort !== bSort) return aSort - bSort
  return a.question.localeCompare(b.question)
}

function rebuildQueue(cards: CardEntry[]): CardEntry[] {
  if (!window.LearningState) return []
  const state = window.LearningState.read().cards
  const now = Date.now()
  const candidates = cards.filter((c) => {
    const s = state[c.id]
    if (!s) return true
    return s.dueMs <= now
  })
  candidates.sort((a, b) => dueComparator(a, b, state))
  return candidates
}

/* ---------- Rendering ---------- */

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;")
}

function formatDueDelta(deltaMs: number): string {
  const minutes = Math.round(deltaMs / 60000)
  if (minutes < 60) return `in ${minutes} minute${minutes === 1 ? "" : "s"}`
  const hours = Math.round(minutes / 60)
  if (hours < 24) return `in ${hours} hour${hours === 1 ? "" : "s"}`
  const days = Math.round(hours / 24)
  if (days < 7) return `in ${days} day${days === 1 ? "" : "s"}`
  const weeks = Math.round(days / 7)
  if (weeks < 5) return `in ${weeks} week${weeks === 1 ? "" : "s"}`
  const months = Math.round(days / 30)
  return `in ${months} month${months === 1 ? "" : "s"}`
}

function renderFilterArea(filter: Filter, filteredTotal: number, total: number) {
  if (!filterAreaEl) return
  const showCombinator = filter.tags.length >= 2
  const chips = availableTags
    .map((t) => {
      const on = filter.tags.includes(t)
      return `<button type="button" class="review-tag-chip${on ? " is-on" : ""}" data-tag="${escapeHtml(t)}" aria-pressed="${on ? "true" : "false"}">${on ? "× " : ""}${escapeHtml(t)}</button>`
    })
    .join("")
  const combinator = showCombinator
    ? `<div class="review-combinator">
         <label><input type="radio" name="review-mode" value="or"${filter.mode === "or" ? " checked" : ""}> Any (OR)</label>
         <label><input type="radio" name="review-mode" value="and"${filter.mode === "and" ? " checked" : ""}> All (AND)</label>
       </div>`
    : ""
  const reviewed = progress.reviewed
  const left = queue.length
  const countsLine =
    filter.tags.length === 0
      ? `Showing all ${total} cards · ${reviewed} reviewed · ${left} left`
      : `Showing ${filteredTotal} of ${total} cards · ${reviewed} reviewed · ${left} left`
  filterAreaEl.innerHTML = `
    <div class="review-filter">
      <div class="review-filter-label">Filter by tag</div>
      <div class="review-tag-chips">${chips || `<span class="review-tag-empty">No filterable tags</span>`}</div>
      ${combinator}
      <div class="review-counts">${countsLine}</div>
    </div>
  `
  // Wire chip clicks
  filterAreaEl.querySelectorAll<HTMLButtonElement>(".review-tag-chip").forEach((btn) => {
    btn.addEventListener("click", () => {
      const t = btn.dataset.tag
      if (!t) return
      const f = parseUrlFilter()
      const i = f.tags.indexOf(t)
      if (i >= 0) f.tags.splice(i, 1)
      else f.tags.push(t)
      writeUrlFilter(f)
      onFilterChange()
    })
  })
  // Wire combinator toggle
  filterAreaEl.querySelectorAll<HTMLInputElement>("input[name='review-mode']").forEach((r) => {
    r.addEventListener("change", () => {
      const f = parseUrlFilter()
      f.mode = r.value === "and" ? "and" : "or"
      writeUrlFilter(f)
      onFilterChange()
    })
  })
}

function renderEmptyBody(filtered: CardEntry[], filter: Filter) {
  if (!bodyAreaEl) return
  if (filter.tags.length > 0 && filtered.length === 0) {
    bodyAreaEl.innerHTML = `
      <div class="review-empty">
        <p>No cards match the selected tags.</p>
        <p><button type="button" class="review-clear-filter">Clear filter</button></p>
      </div>
    `
    bodyAreaEl
      .querySelector<HTMLButtonElement>(".review-clear-filter")
      ?.addEventListener("click", () => {
        writeUrlFilter({ tags: [], mode: "or" })
        onFilterChange()
      })
    return
  }
  if (!window.LearningState || !cachedCards) {
    bodyAreaEl.innerHTML = `<div class="review-empty"><p>Loading…</p></div>`
    return
  }
  const state = window.LearningState.read().cards
  const reviewed = filtered.filter((c) => state[c.id] && state[c.id].lastReviewMs > 0).length
  const total = filtered.length
  const upcoming = filtered
    .map((c) => state[c.id]?.dueMs)
    .filter((d): d is number => typeof d === "number" && d > Date.now())
    .sort((a, b) => a - b)[0]
  const nextLine = upcoming
    ? `<p class="review-next">Next due card: <strong>${formatDueDelta(upcoming - Date.now())}</strong>.</p>`
    : ""
  bodyAreaEl.innerHTML = `
    <div class="review-empty">
      <h2>🎉 All caught up</h2>
      <p>No cards are due${filter.tags.length > 0 ? " in this subset" : ""} right now.</p>
      ${nextLine}
      <p class="review-meta">${reviewed} of ${total} card${total === 1 ? "" : "s"}${filter.tags.length > 0 ? " in subset" : ""} reviewed at least once.</p>
    </div>
  `
}

function renderCard(card: CardEntry) {
  if (!bodyAreaEl) return
  bodyAreaEl.innerHTML = `
    <div class="review-header">
      <a class="review-source" href="${escapeHtml("../" + card.slug)}">← source: ${escapeHtml(card.slug.replace(/^Learning\//, ""))}</a>
    </div>
    <ul class="review-card-host">${card.html}</ul>
    <div class="review-footer">
      <button type="button" class="review-skip" data-action="skip">Skip for now</button>
    </div>
  `
  window.__setupFlashcards?.()
  window.__setupCloze?.()

  const skip = bodyAreaEl.querySelector<HTMLButtonElement>("button[data-action='skip']")
  if (skip) {
    skip.addEventListener("click", () => {
      const idx = queue.findIndex((c) => c.id === currentId)
      if (idx >= 0) {
        const [c] = queue.splice(idx, 1)
        queue.push(c)
      }
      advance()
    })
  }
}

function advance() {
  if (queue.length === 0) {
    currentId = null
    const filter = parseUrlFilter()
    const filtered = applyTagFilter(cachedCards ?? [], filter)
    renderEmptyBody(filtered, filter)
    return
  }
  const card = queue[0]
  currentId = card.id
  renderCard(card)
}

/* ---------- Event flow ---------- */

function onFilterChange() {
  if (!cachedCards) return
  const filter = parseUrlFilter()
  const filtered = applyTagFilter(cachedCards, filter)
  queue = rebuildQueue(filtered)
  progress = { reviewed: 0, total: filtered.length }
  renderFilterArea(filter, filtered.length, cachedCards.length)
  advance()
}

function onStateChange() {
  if (!cachedCards) return
  const filter = parseUrlFilter()
  const filtered = applyTagFilter(cachedCards, filter)
  const fresh = rebuildQueue(filtered)
  if (currentId && !fresh.some((c) => c.id === currentId)) {
    progress.reviewed += 1
  }
  queue = fresh
  renderFilterArea(filter, filtered.length, cachedCards.length)
  advance()
}

async function setup() {
  const root = document.getElementById("review-root") as HTMLElement | null
  if (!root || !window.LearningState) return

  // One-time layout: filter area above body. Subsequent re-renders only
  // touch the respective sub-area.
  root.innerHTML = `<div class="review-filter-area"></div><div class="review-body-area"></div>`
  filterAreaEl = root.querySelector<HTMLElement>(".review-filter-area")
  bodyAreaEl = root.querySelector<HTMLElement>(".review-body-area")

  const cards = await loadCards()
  if (cards.length === 0) {
    root.innerHTML = `<div class="review-empty"><p>No cards on this site yet.</p></div>`
    return
  }

  availableTags = computeAvailableTags(cards)
  const filter = parseUrlFilter()
  const filtered = applyTagFilter(cards, filter)
  queue = rebuildQueue(filtered)
  progress = { reviewed: 0, total: filtered.length }
  renderFilterArea(filter, filtered.length, cards.length)
  advance()

  const stateHandler = () => onStateChange()
  window.addEventListener("learning-state-change", stateHandler)
  // Back/forward should also rebuild the queue.
  const popHandler = () => onFilterChange()
  window.addEventListener("popstate", popHandler)
  window.addCleanup(() => {
    window.removeEventListener("learning-state-change", stateHandler)
    window.removeEventListener("popstate", popHandler)
  })
}

document.addEventListener("nav", setup)
})()
