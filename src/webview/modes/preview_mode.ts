import MarkdownIt from "markdown-it";
import hljs from "highlight.js";
import "highlight.js/styles/github.css";
import mermaid from "mermaid";
import katex from "katex";
import "katex/dist/katex.css";
import type { EditorMode } from "../types";
import { strip_frontmatter } from "../util/frontmatter";

mermaid.initialize({ startOnLoad: false, theme: "default" });

const md = new MarkdownIt({
  html: true,
  linkify: true,
  typographer: true,
  breaks: true,
  highlight(str: string, lang: string): string {
    if (lang && hljs.getLanguage(lang)) {
      try {
        return `<pre class="hljs"><code class="language-${lang}">${hljs.highlight(str, { language: lang }).value}</code></pre>`;
      } catch {
        // fall through
      }
    }
    return `<pre class="hljs"><code>${md.utils.escapeHtml(str)}</code></pre>`;
  },
});

let mermaid_id_counter = 0;

function render_katex(html: string): string {
  // Display math first ($$...$$) — must not span across HTML tags
  html = html.replace(/\$\$([^$<>]+)\$\$/g, (_match, tex) => {
    const trimmed = tex.trim();
    if (!trimmed || /^\d/.test(trimmed)) return _match;
    try {
      return katex.renderToString(trimmed, { displayMode: true, throwOnError: false });
    } catch {
      return _match;
    }
  });
  // Inline math ($...$) — exclude dollar amounts, HTML content, and multi-line spans
  html = html.replace(/\$([^$<>\n]+)\$/g, (_match, tex) => {
    const trimmed = tex.trim();
    // Skip dollar amounts like $80.00, $1,500,000
    if (!trimmed || /^\d/.test(trimmed)) return _match;
    // Skip if it looks like a currency context (preceded by common currency patterns)
    if (/^[\d,.]/.test(trimmed)) return _match;
    try {
      return katex.renderToString(trimmed, { displayMode: false, throwOnError: false });
    } catch {
      return _match;
    }
  });
  return html;
}

async function render_mermaid_diagrams(container: HTMLElement): Promise<void> {
  const mermaid_codes = container.querySelectorAll("code.language-mermaid");
  for (const code_el of Array.from(mermaid_codes)) {
    const pre = code_el.parentElement;
    if (!pre) continue;
    const graph_text = code_el.textContent || "";
    const id = `mermaid-diagram-${mermaid_id_counter++}`;
    try {
      const { svg } = await mermaid.render(id, graph_text);
      const div = document.createElement("div");
      div.className = "mermaid";
      div.innerHTML = svg;
      pre.replaceWith(div);
    } catch {
      // leave original code block on failure
    }
  }
}

export class PreviewMode implements EditorMode {
  private container: HTMLElement | null = null;
  private current_markdown = "";

  async activate(container: HTMLElement, markdown: string): Promise<void> {
    this.container = container;
    this.current_markdown = markdown;
    await this.render();
  }

  deactivate(): void {
    if (this.container) {
      this.container.innerHTML = "";
    }
    this.container = null;
  }

  update_content(markdown: string): void {
    this.current_markdown = markdown;
    this.render();
  }

  get_markdown(): string {
    return this.current_markdown;
  }

  private async render(): Promise<void> {
    if (!this.container) return;
    const clean = strip_frontmatter(this.current_markdown);
    let html = md.render(clean);
    html = html.replace(/<table>/g, '<div class="table-scroll"><table>')
               .replace(/<\/table>/g, '</table></div>');
    html = render_katex(html);
    this.container.innerHTML = `<div class="markdown-body">${html}</div>`;
    await render_mermaid_diagrams(this.container);
  }
}
