function toggleCloze(this: HTMLElement) {
  this.classList.toggle("revealed")
  const revealed = this.classList.contains("revealed")
  this.setAttribute("aria-label", revealed ? "Click to hide" : "Click to reveal")
}

function onKey(this: HTMLElement, ev: KeyboardEvent) {
  if (ev.key === " " || ev.key === "Enter") {
    ev.preventDefault()
    toggleCloze.call(this)
  }
}

function setupFlashcards() {
  const clozes = document.querySelectorAll<HTMLElement>("span.cloze")
  clozes.forEach((el) => {
    el.addEventListener("click", toggleCloze)
    el.addEventListener("keydown", onKey)
    window.addCleanup(() => {
      el.removeEventListener("click", toggleCloze)
      el.removeEventListener("keydown", onKey)
    })
  })
}

document.addEventListener("nav", setupFlashcards)
