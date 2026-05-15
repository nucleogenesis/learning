/**
 * Persist TODO checkbox state through `window.LearningState.todos`.
 *
 * The flashcards transformer's HAST pass enables each `<input type="checkbox">`
 * and stamps it with `data-todo-id="<slug>/<idx>"`. On every nav we:
 *   - Read state.todos and restore the checked attribute from there.
 *   - Attach a change listener that writes back through LearningState.update.
 *
 * Replaces the bundled Quartz `checkbox.inline.ts` (which used a per-key
 * `<slug>-checkbox-<idx>` scheme); the migration in state.inline.ts folds
 * the legacy keys into state.todos on first load.
 */

// Each inline script is bundled in isolation; redeclare the bits we touch.
declare global {
  interface Window {
    LearningState?: {
      read: () => { todos: Record<string, boolean> }
      update: (fn: (s: { todos: Record<string, boolean> }) => void) => void
    }
  }
}

function onChange(this: HTMLInputElement) {
  const id = this.dataset.todoId
  if (!id) return
  const checked = this.checked
  window.LearningState?.update((s) => {
    s.todos[id] = checked
  })
}

function setupCheckboxes() {
  if (!window.LearningState) return
  const state = window.LearningState.read()
  const inputs = document.querySelectorAll<HTMLInputElement>("input.checkbox-toggle[data-todo-id]")
  inputs.forEach((el) => {
    const id = el.dataset.todoId!
    if (id in state.todos) el.checked = state.todos[id]
    el.addEventListener("change", onChange)
    window.addCleanup(() => el.removeEventListener("change", onChange))
  })
}

document.addEventListener("nav", setupCheckboxes)
