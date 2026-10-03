// @ts-check
// Read-only code with line numbers.
import { html } from "htm/preact";

/** @param {{ code: string }} props */
export function CodeBlock({ code }) {
  const c = (code || "").replace(/\n$/, "");
  const lines = c.split("\n").map((_, i) => i + 1).join("\n");
  return html`<div class="codeview"><pre class="gut" aria-hidden="true">${lines}</pre><pre class="src" tabindex="0">${c}</pre></div>`;
}
