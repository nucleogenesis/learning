/**
 * Client-side behavior for flashcards + cloze.
 *
 * Cloze: click / Space / Enter toggles `.revealed` on `span.cloze`.
 *
 * Cards: each `li.flashcard[data-card-id]` carries a `.flashcard-srs` button
 *   row (Again/Hard/Good/Easy) and a `.flashcard-due` text line. SM-2 state
 *   lives in `window.LearningState.cards` (single unified store). On a rating
 *   click, schedule advances and the due-line updates.
 */

type Rating = "again" | "hard" | "good" | "easy"

type CardState = {
  ef: number // ease factor; SM-2 default 2.5, floor 1.3
  reps: number // consecutive non-Again ratings
  intervalDays: number // days until next review
  dueMs: number // epoch ms
  lastReviewMs: number // epoch ms
}

// Each inline script is bundled in isolation; redeclare the bits of the
// shared state shape this script touches so it type-checks standalone.
declare global {
  interface Window {
    LearningState?: {
      read: () => { cards: Record<string, CardState> }
      update: (fn: (s: { cards: Record<string, CardState> }) => void) => void
    }
    __setupFlashcards?: () => void
    __setupCloze?: () => void
  }
}

const DAY_MS = 24 * 60 * 60 * 1000

function defaultCardState(nowMs: number): CardState {
  return {
    ef: 2.5,
    reps: 0,
    intervalDays: 0,
    dueMs: nowMs,
    lastReviewMs: 0,
  }
}

function nextState(prev: CardState, rating: Rating, nowMs: number): CardState {
  // Simplified SM-2 with 4 buttons. Again resets; Hard slows the interval;
  // Good is the standard SM-2 step; Easy bonuses interval and ease.
  let { ef, reps, intervalDays } = prev
  if (rating === "again") {
    reps = 0
    intervalDays = 1
    ef = Math.max(1.3, ef - 0.2)
  } else if (rating === "hard") {
    reps += 1
    intervalDays = Math.max(1, Math.round((intervalDays || 1) * 1.2))
    ef = Math.max(1.3, ef - 0.15)
  } else if (rating === "good") {
    reps += 1
    if (reps === 1) intervalDays = 1
    else if (reps === 2) intervalDays = 6
    else intervalDays = Math.round(intervalDays * ef)
  } else {
    // easy
    reps += 1
    if (reps === 1) intervalDays = 4
    else if (reps === 2) intervalDays = 7
    else intervalDays = Math.round(intervalDays * ef * 1.3)
    ef = ef + 0.15
  }
  return {
    ef,
    reps,
    intervalDays,
    dueMs: nowMs + intervalDays * DAY_MS,
    lastReviewMs: nowMs,
  }
}

function formatDue(state: CardState, nowMs: number): string {
  if (state.lastReviewMs === 0) return ""
  const diffDays = Math.round((state.dueMs - nowMs) / DAY_MS)
  if (diffDays <= 0) return "Due now"
  if (diffDays === 1) return "Next review: tomorrow"
  if (diffDays < 7) return `Next review: in ${diffDays} days`
  if (diffDays < 30) return `Next review: in ${Math.round(diffDays / 7)} weeks`
  return `Next review: in ${Math.round(diffDays / 30)} months`
}

function setupCards() {
  if (!window.LearningState) return
  // Idempotent: skip cards that already have handlers attached so callers
  // (e.g., the /review page) can re-run setup after injecting new card DOM
  // without duplicating click handlers on existing ones.
  const cards = document.querySelectorAll<HTMLElement>(
    'li.flashcard[data-card-id]:not([data-srs-attached="1"])',
  )
  cards.forEach((card) => {
    const id = card.getAttribute("data-card-id")
    if (!id) return
    card.setAttribute("data-srs-attached", "1")

    const dueEl = card.querySelector<HTMLElement>(".flashcard-due")
    const refresh = () => {
      const state = window.LearningState!.read().cards[id]
      if (dueEl) dueEl.textContent = state ? formatDue(state, Date.now()) : ""
      if (state) {
        card.classList.toggle("is-due", state.dueMs <= Date.now())
        card.classList.toggle("is-reviewed", true)
      }
    }
    refresh()

    const onClick = (e: Event) => {
      const target = e.target as HTMLElement
      if (!target.classList.contains("srs-btn")) return
      const rating = target.dataset.rating as Rating | undefined
      if (!rating) return
      const now = Date.now()
      window.LearningState!.update((s) => {
        const current = s.cards[id] ?? defaultCardState(now)
        s.cards[id] = nextState(current, rating, now)
      })
      refresh()
    }

    card.addEventListener("click", onClick)
    window.addCleanup(() => card.removeEventListener("click", onClick))
  })
}

function toggleCloze(this: HTMLElement) {
  this.classList.toggle("revealed")
  const revealed = this.classList.contains("revealed")
  this.setAttribute("aria-label", revealed ? "Click to hide" : "Click to reveal")
}

function onClozeKey(this: HTMLElement, ev: KeyboardEvent) {
  if (ev.key === " " || ev.key === "Enter") {
    ev.preventDefault()
    toggleCloze.call(this)
  }
}

function setupCloze() {
  const clozes = document.querySelectorAll<HTMLElement>('span.cloze:not([data-cloze-attached="1"])')
  clozes.forEach((el) => {
    el.setAttribute("data-cloze-attached", "1")
    el.addEventListener("click", toggleCloze)
    el.addEventListener("keydown", onClozeKey)
    window.addCleanup(() => {
      el.removeEventListener("click", toggleCloze)
      el.removeEventListener("keydown", onClozeKey)
    })
  })
}

// Expose so other scripts (e.g., the /review page injecting cards) can
// reattach handlers to dynamically-added DOM.
window.__setupFlashcards = setupCards
window.__setupCloze = setupCloze

document.addEventListener("nav", () => {
  setupCloze()
  setupCards()
})
