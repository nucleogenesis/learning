import { QuartzComponent, QuartzComponentConstructor, QuartzComponentProps } from "./types"
import { classNames } from "../util/lang"

const LlmDisclaimer: QuartzComponent = ({ displayClass }: QuartzComponentProps) => {
  return (
    <aside class={classNames(displayClass, "llm-disclaimer")} role="note" aria-label="AI-generated content notice">
      <strong>Heads up:</strong> this site's content was substantially generated
      with an AI assistant. Treat it as a useful starting point, not as
      authoritative — verify anything you plan to act on.
    </aside>
  )
}

LlmDisclaimer.css = `
.llm-disclaimer {
  margin: 1.2rem 0 0.4rem 0;
  padding: 0.6rem 0.9rem;
  border-left: 3px solid var(--secondary);
  background: color-mix(in srgb, var(--secondary) 7%, transparent);
  font-size: 0.85em;
  color: var(--darkgray);
  border-radius: 0 4px 4px 0;
}
.llm-disclaimer strong {
  color: var(--dark);
}
`

export default (() => LlmDisclaimer) satisfies QuartzComponentConstructor
