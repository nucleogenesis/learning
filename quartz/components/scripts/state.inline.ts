/**
 * Unified client-side state for the learning site.
 *
 * Single localStorage key: `learning-notes-state-v1`. One blob holds SRS
 * scheduling, TODO check state, page-done flags, per-block annotations, the
 * sync endpoint+secret, and a tiny meta record. All other inline scripts go
 * through `window.LearningState.{read,update,reset}` — no direct localStorage
 * access elsewhere.
 *
 * One-time migration on first load folds the legacy Phase-4 keys
 * (`learning-notes-srs-v1` and the per-checkbox `<slug>-checkbox-<idx>`
 * pattern Quartz's bundled checkbox script wrote) into the new blob, then
 * removes the old keys.
 */

type CardState = {
  ef: number
  reps: number
  intervalDays: number
  dueMs: number
  lastReviewMs: number
}
type PageState = { doneAt: number }
type AnnotationState = { text: string; createdAt: number; updatedAt: number }

type State = {
  schemaVersion: 1
  user: { name?: string }
  sync: { endpoint?: string; secret?: string }
  cards: Record<string, CardState>
  todos: Record<string, boolean>
  pages: Record<string, PageState>
  annots: Record<string, AnnotationState>
  meta: { lastSyncedAt?: number; lastWriteAt?: number }
}

declare global {
  interface Window {
    LearningState?: {
      read: () => State
      update: (fn: (s: State) => void) => State
      reset: () => void
    }
  }
}

// IIFE-wrap to keep module-level identifiers out of global scope (see
// comment in review.inline.ts for why this matters).
;(() => {
const STORE_KEY = "learning-notes-state-v1"
const LEGACY_SRS_KEY = "learning-notes-srs-v1"
const LEGACY_CHECKBOX_RE = /^(.+)-checkbox-(\d+)$/

function defaultState(): State {
  return {
    schemaVersion: 1,
    user: {},
    sync: {},
    cards: {},
    todos: {},
    pages: {},
    annots: {},
    meta: {},
  }
}

function safeParse(s: string | null): unknown {
  if (!s) return null
  try {
    return JSON.parse(s)
  } catch {
    return null
  }
}

function migrateFromLegacy(): State | null {
  const state = defaultState()
  let migrated = false

  // 1) SRS — straight copy of the v1 dict.
  const legacySrs = safeParse(localStorage.getItem(LEGACY_SRS_KEY)) as
    | Record<string, CardState>
    | null
  if (legacySrs && typeof legacySrs === "object") {
    state.cards = legacySrs
    migrated = true
  }

  // 2) TODOs — scan for `<slug>-checkbox-<idx>` keys and fold into state.todos
  //    keyed by `<slug>/<idx>`. Values were stored as "true"/"false" strings.
  const legacyTodoKeys: string[] = []
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i)
    if (!key) continue
    const m = key.match(LEGACY_CHECKBOX_RE)
    if (m) {
      legacyTodoKeys.push(key)
      const [, slug, idx] = m
      const checked = localStorage.getItem(key) === "true"
      state.todos[`${slug}/${idx}`] = checked
      migrated = true
    }
  }

  if (!migrated) return null

  // Clean up legacy keys so they can't drift from the new blob.
  localStorage.removeItem(LEGACY_SRS_KEY)
  for (const k of legacyTodoKeys) localStorage.removeItem(k)

  state.meta.lastWriteAt = Date.now()
  return state
}

function readRaw(): State {
  const existing = safeParse(localStorage.getItem(STORE_KEY)) as State | null
  if (existing && existing.schemaVersion === 1) return existing

  // Either no blob yet, or a future-schema blob we can't read. Try a legacy
  // migration; if there's nothing to migrate, return a fresh default. A
  // future-schema blob is *preserved* by not overwriting until update() runs.
  const migrated = migrateFromLegacy()
  if (migrated) {
    localStorage.setItem(STORE_KEY, JSON.stringify(migrated))
    return migrated
  }
  return defaultState()
}

function writeRaw(state: State): void {
  try {
    localStorage.setItem(STORE_KEY, JSON.stringify(state))
  } catch {
    // Out of quota or sandboxed iframe — silently fail. The site keeps working;
    // just doesn't persist this write.
  }
}

if (!window.LearningState) {
  window.LearningState = {
    read: () => readRaw(),
    update: (fn) => {
      const state = readRaw()
      fn(state)
      state.meta.lastWriteAt = Date.now()
      writeRaw(state)
      window.dispatchEvent(new CustomEvent("learning-state-change", { detail: state }))
      return state
    },
    reset: () => {
      localStorage.removeItem(STORE_KEY)
      const fresh = defaultState()
      writeRaw(fresh)
      window.dispatchEvent(new CustomEvent("learning-state-change", { detail: fresh }))
    },
  }

  // Trigger migration on first script load so legacy keys move into the new
  // blob even before any feature script runs.
  readRaw()
}
})()
