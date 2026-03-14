import MarkdownIt from "markdown-it";
import type { EditorMode } from "../types";
import { strip_frontmatter } from "../util/frontmatter";

const md = new MarkdownIt({
  html: true,
  linkify: true,
  typographer: true,
});

export class PreviewMode implements EditorMode {
  private container: HTMLElement | null = null;
  private current_markdown = "";

  async activate(container: HTMLElement, markdown: string): Promise<void> {
    this.container = container;
    this.current_markdown = markdown;
    this.render();
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

  private render(): void {
    if (!this.container) return;
    const clean = strip_frontmatter(this.current_markdown);
    const html = md.render(clean);
    this.container.innerHTML = `<div class="markdown-body">${html}</div>`;
  }
}
