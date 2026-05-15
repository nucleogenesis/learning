import { QuartzComponent, QuartzComponentConstructor, QuartzComponentProps } from "./types"
import { classNames } from "../util/lang"
// @ts-ignore
import script from "./scripts/page-done.inline"

const PageDoneToggle: QuartzComponent = ({ fileData, displayClass }: QuartzComponentProps) => {
  const slug = (fileData.slug ?? "") as string
  if (!slug.startsWith("Learning/")) return null
  return (
    <div class={classNames(displayClass, "page-done-wrap")}>
      <button
        type="button"
        class="page-done-toggle"
        data-page-slug={slug}
        aria-pressed="false"
        aria-label="Mark page as done"
      >
        <span class="page-done-icon" aria-hidden="true">
          ✓
        </span>
        <span class="page-done-label">Mark as done</span>
      </button>
    </div>
  )
}

PageDoneToggle.css = `
.page-done-wrap {
  display: flex;
  justify-content: flex-end;
  margin: 0.4rem 0 0.6rem;
}
.page-done-toggle {
  display: inline-flex;
  align-items: center;
  gap: 0.4rem;
  padding: 0.3rem 0.8rem;
  border: 1px solid var(--lightgray);
  border-radius: 999px;
  background: transparent;
  color: var(--darkgray);
  font-size: 0.85em;
  cursor: pointer;
  transition: border-color 0.15s, background-color 0.15s, color 0.15s;
}
.page-done-toggle:hover {
  border-color: var(--secondary);
  color: var(--dark);
}
.page-done-toggle .page-done-icon {
  opacity: 0.4;
  transition: opacity 0.15s;
}
.page-done-toggle[aria-pressed="true"] {
  border-color: color-mix(in srgb, var(--tertiary) 60%, var(--lightgray));
  background: color-mix(in srgb, var(--tertiary) 14%, transparent);
  color: var(--dark);
}
.page-done-toggle[aria-pressed="true"] .page-done-icon {
  opacity: 1;
}
`

PageDoneToggle.afterDOMLoaded = script

export default (() => PageDoneToggle) satisfies QuartzComponentConstructor
