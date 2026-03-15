import { post_message } from "../util/vscode_api";

export interface Comment {
  id: string;
  heading_text: string;
  content: string;
  created_at: string;
}

export class CommentsManager {
  private comments: Comment[] = [];
  private editor_container: HTMLElement;
  private panels: Map<string, HTMLElement> = new Map();
  private indicators: Map<string, HTMLElement> = new Map();

  constructor(editor_container: HTMLElement) {
    this.editor_container = editor_container;

    // Close comment panels when clicking outside
    document.addEventListener("click", (e) => {
      const target = e.target as HTMLElement;
      if (!target.closest(".comments-panel") && !target.closest(".comment-indicator")) {
        this.close_all_panels();
      }
    });
  }

  private close_all_panels(): void {
    for (const panel of this.panels.values()) {
      panel.remove();
    }
    this.panels.clear();
  }

  load_comments(comments: Comment[]): void {
    this.comments = [...comments];
  }

  attach_to_headings(markdown_body: HTMLElement): void {
    this.cleanup_elements();

    const headings = markdown_body.querySelectorAll<HTMLElement>("h1, h2, h3, h4, h5, h6");

    for (const heading of Array.from(headings)) {
      const heading_text = heading.textContent?.trim() ?? "";
      const heading_comments = this.get_comments_for_heading(heading_text);

      const indicator = document.createElement("span");
      indicator.className = "comment-indicator";
      indicator.textContent = heading_comments.length > 0 ? `\uD83D\uDCAC ${heading_comments.length}` : "\uD83D\uDCAC";
      indicator.title = "Toggle comments";
      indicator.addEventListener("click", (e) => {
        e.stopPropagation();
        this.toggle_panel(heading, heading_text);
      });

      heading.style.position = "relative";
      heading.appendChild(indicator);
      this.indicators.set(heading_text, indicator);
    }
  }

  get_comments(): Comment[] {
    return [...this.comments];
  }

  destroy(): void {
    this.cleanup_elements();
    this.comments = [];
  }

  private cleanup_elements(): void {
    for (const panel of this.panels.values()) {
      panel.remove();
    }
    this.panels.clear();

    for (const indicator of this.indicators.values()) {
      indicator.remove();
    }
    this.indicators.clear();
  }

  private get_comments_for_heading(heading_text: string): Comment[] {
    return this.comments.filter((c) => c.heading_text === heading_text);
  }

  private toggle_panel(heading: HTMLElement, heading_text: string): void {
    const existing = this.panels.get(heading_text);
    if (existing) {
      existing.remove();
      this.panels.delete(heading_text);
      return;
    }

    const panel = document.createElement("div");
    panel.className = "comments-panel";

    this.render_panel_contents(panel, heading_text);

    heading.insertAdjacentElement("afterend", panel);
    this.panels.set(heading_text, panel);
  }

  private render_panel_contents(panel: HTMLElement, heading_text: string): void {
    panel.innerHTML = "";

    const heading_comments = this.get_comments_for_heading(heading_text);

    for (const comment of heading_comments) {
      const entry = document.createElement("div");
      entry.className = "comment-entry";

      const date_el = document.createElement("span");
      date_el.className = "comment-date";
      date_el.textContent = new Date(comment.created_at).toLocaleString();

      const content_el = document.createElement("p");
      content_el.className = "comment-content";
      content_el.textContent = comment.content;

      entry.appendChild(date_el);
      entry.appendChild(content_el);
      panel.appendChild(entry);
    }

    const input_row = document.createElement("div");
    input_row.className = "comment-input-row";

    const input = document.createElement("input");
    input.type = "text";
    input.className = "comment-input";
    input.placeholder = "Add a comment...";

    const submit_btn = document.createElement("button");
    submit_btn.className = "comment-submit";
    submit_btn.textContent = "Add";
    submit_btn.addEventListener("click", () => {
      const text = input.value.trim();
      if (!text) return;

      const new_comment: Comment = {
        id: crypto.randomUUID(),
        heading_text,
        content: text,
        created_at: new Date().toISOString(),
      };

      this.comments.push(new_comment);
      this.persist_comments();
      this.render_panel_contents(panel, heading_text);
      this.update_indicator(heading_text);
    });

    input.addEventListener("keydown", (e) => {
      if (e.key === "Enter") submit_btn.click();
    });

    input_row.appendChild(input);
    input_row.appendChild(submit_btn);
    panel.appendChild(input_row);
  }

  private update_indicator(heading_text: string): void {
    const indicator = this.indicators.get(heading_text);
    if (!indicator) return;
    const count = this.get_comments_for_heading(heading_text).length;
    indicator.textContent = count > 0 ? `\uD83D\uDCAC ${count}` : "\uD83D\uDCAC";
  }

  private persist_comments(): void {
    post_message("save_comments", { comments: this.comments });
  }
}
