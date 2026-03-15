import { diffWords } from "diff";
import MarkdownIt from "markdown-it";

const md = new MarkdownIt({ html: true });

export class DiffView {
  /**
   * Returns HTML string with diff markings applied to the rendered markdown.
   * Runs diffWords on the raw markdown, wraps changes in <ins>/<del> tags,
   * then renders through markdown-it.
   */
  static render_diff(current: string, previous: string): string {
    const changes = diffWords(previous, current);
    let marked_markdown = "";

    for (const part of changes) {
      const escaped_value = part.value;

      if (part.added) {
        marked_markdown += `<ins class="diff-added">${escaped_value}</ins>`;
      } else if (part.removed) {
        marked_markdown += `<del class="diff-removed">${escaped_value}</del>`;
      } else {
        marked_markdown += escaped_value;
      }
    }

    return md.render(marked_markdown);
  }
}
