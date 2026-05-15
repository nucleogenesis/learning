/**
 * Drives the `/review` page — a site-wide spaced-repetition queue.
 *
 * - Loads `cards-index.json` (emitted by Plugin.CardsIndex at build time).
 * - Reads SM-2 state from `window.LearningState.cards`.
 * - Computes the due queue (overdue first by dueMs; then never-reviewed).
 * - Injects one card at a time into `#review-root` and reuses the page's
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
// leak into the page's global scope and collide with other inline scripts
// (esbuild's `format: esm` output, injected as a non-module <script>, would
// otherwise place these on `window`).
;(() => {
type CardEntry = {
  id: string
  slug: string
  question: string
  html: string
}

let cachedCards: CardEntry[] | null = null
let queue: CardEntry[] = []
let currentId: string | null = null
let progress = { reviewed: 0, total: 0 }

async function loadCards(): Promise<CardEntry[]> {
  if (cachedCards) return cachedCards
  try {
    // A leading-slash path resolves to the origin regardless of whether the
    // current URL has a trailing slash (`/review` vs `/review/`), which
    // matters because Quartz doesn't normalize that consistently.
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

function dueComparator(
  a: CardEntry,
  b: CardEntry,
  state: ReturnType<NonNullable<Window["LearningState"]>["read"]>["cards"],
): number {
  // Never-reviewed cards (no SM-2 state yet) sort after due cards but before
  // future-due ones; tie-break alphabetically by question for stable ordering.
  const aState = state[a.id]
  const bState = state[b.id]
  const aDue = aState ? aState.dueMs : Number.MAX_SAFE_INTEGER
  const bDue = bState ? bState.dueMs : Number.MAX_SAFE_INTEGER
  // Treat never-reviewed cards as "due now + 1" so they slot in *after*
  // overdue cards but before legitimately-future ones.
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
    if (!s) return true // never reviewed → in queue
    return s.dueMs <= now // due or overdue
  })
  candidates.sort((a, b) => dueComparator(a, b, state))
  return candidates
}

function renderEmpty(root: HTMLElement) {
  if (!window.LearningState || !cachedCards) {
    root.innerHTML = `<div class="review-empty"><p>Loading…</p></div>`
    return
  }
  const state = window.LearningState.read().cards
  const reviewed = cachedCards.filter((c) => state[c.id] && state[c.id].lastReviewMs > 0).length
  const total = cachedCards.length
  // Find the soonest upcoming due date.
  const upcoming = cachedCards
    .map((c) => state[c.id]?.dueMs)
    .filter((d): d is number => typeof d === "number" && d > Date.now())
    .sort((a, b) => a - b)[0]

  const nextLine = upcoming
    ? `<p class="review-next">Next due card: <strong>${formatDueDelta(upcoming - Date.now())}</strong>.</p>`
    : ""

  root.innerHTML = `
    <div class="review-empty">
      <h2>🎉 All caught up</h2>
      <p>No cards are due right now.</p>
      ${nextLine}
      <p class="review-meta">${reviewed} of ${total} cards reviewed at least once.</p>
    </div>
  `
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

function renderCard(root: HTMLElement, card: CardEntry) {
  const remaining = queue.length
  const reviewed = progress.reviewed
  const total = progress.total
  root.innerHTML = `
    <div class="review-header">
      <span class="review-progress">${reviewed} reviewed · ${remaining} left</span>
      <a class="review-source" href="${escapeAttr("../" + card.slug)}">← source: ${escapeHtml(card.slug.replace(/^Learning\//, ""))}</a>
    </div>
    <ul class="review-card-host">${card.html}</ul>
    <div class="review-footer">
      <button type="button" class="review-skip" data-action="skip">Skip for now</button>
    </div>
  `
  // Re-attach flashcard click handlers to the freshly-injected card.
  window.__setupFlashcards?.()
  window.__setupCloze?.()

  const skip = root.querySelector<HTMLButtonElement>("button[data-action='skip']")
  if (skip) {
    skip.addEventListener("click", () => {
      // Rotate this card to the end of the queue and re-render the new head.
      const idx = queue.findIndex((c) => c.id === currentId)
      if (idx >= 0) {
        const [c] = queue.splice(idx, 1)
        queue.push(c)
      }
      advance(root)
    })
  }
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;")
}
function escapeAttr(s: string): string {
  return escapeHtml(s)
}

function advance(root: HTMLElement) {
  if (queue.length === 0) {
    currentId = null
    renderEmpty(root)
    return
  }
  const card = queue[0]
  currentId = card.id
  renderCard(root, card)
}

function onStateChange(root: HTMLElement) {
  if (!cachedCards) return
  // If the current card was just rated, it'll no longer be due; rebuild queue.
  const fresh = rebuildQueue(cachedCards)
  // Bump reviewed counter if the current card dropped out of the queue.
  if (currentId && !fresh.some((c) => c.id === currentId)) {
    progress.reviewed += 1
  }
  queue = fresh
  advance(root)
}

async function setup() {
  const root = document.getElementById("review-root") as HTMLElement | null
  if (!root || !window.LearningState) return

  const cards = await loadCards()
  if (cards.length === 0) {
    root.innerHTML = `<div class="review-empty"><p>No cards on this site yet.</p></div>`
    return
  }

  queue = rebuildQueue(cards)
  progress = { reviewed: 0, total: cards.length }
  advance(root)

  const handler = () => onStateChange(root)
  window.addEventListener("learning-state-change", handler)
  window.addCleanup(() => window.removeEventListener("learning-state-change", handler))
}

document.addEventListener("nav", setup)
})()
