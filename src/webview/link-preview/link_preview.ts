import MarkdownIt from "markdown-it";
import { post_message } from "../util/vscode_api";
import { strip_frontmatter } from "../util/frontmatter";

const md = new MarkdownIt({
  html: true,
  linkify: true,
  typographer: true,
});

let pending_preview: { popover: HTMLElement; link: HTMLElement } | null = null;
let hide_timer: ReturnType<typeof setTimeout> | null = null;

export class LinkPreview {
  private editor_container: HTMLElement;
  private message_handler: ((event: MessageEvent) => void) | null = null;

  constructor(editor_container: HTMLElement) {
    this.editor_container = editor_container;

    // Listen for hover on .md links
    this.editor_container.addEventListener("mouseover", (e) => {
      const target = e.target as HTMLElement;
      const link = target.closest("a") as HTMLAnchorElement | null;
      if (!link) return;

      const href = link.getAttribute("href") || "";
      if (!href.endsWith(".md") && !href.endsWith(".markdown")) return;
      if (href.startsWith("http://") || href.startsWith("https://")) return;

      this.request_preview(href, link);
    });

    this.editor_container.addEventListener("mouseout", (e) => {
      const target = e.target as HTMLElement;
      const link = target.closest("a");
      if (!link) return;

      hide_timer = setTimeout(() => {
        this.dismiss();
      }, 300);
    });

    // Listen for file content responses
    this.message_handler = (event: MessageEvent) => {
      const message = event.data;
      if (message.type === "link_preview_content" && pending_preview) {
        this.show_popover(message.content as string, message.file_name as string);
      }
    };
    window.addEventListener("message", this.message_handler);
  }

  destroy(): void {
    this.dismiss();
    if (this.message_handler) {
      window.removeEventListener("message", this.message_handler);
    }
  }

  private request_preview(href: string, link: HTMLElement): void {
    if (hide_timer) {
      clearTimeout(hide_timer);
      hide_timer = null;
    }

    // Dismiss any existing popover
    this.dismiss();

    // Create popover placeholder
    const popover = document.createElement("div");
    popover.className = "link-preview-popover";
    popover.innerHTML = `<div class="link-preview-loading">Loading...</div>`;

    // Keep popover alive when hovering over it
    popover.addEventListener("mouseenter", () => {
      if (hide_timer) {
        clearTimeout(hide_timer);
        hide_timer = null;
      }
    });
    popover.addEventListener("mouseleave", () => {
      hide_timer = setTimeout(() => this.dismiss(), 200);
    });

    // Position near the link
    const rect = link.getBoundingClientRect();
    const container_rect = this.editor_container.getBoundingClientRect();
    popover.style.top = `${rect.bottom - container_rect.top + this.editor_container.scrollTop + 4}px`;
    popover.style.left = `${Math.max(0, rect.left - container_rect.left - 20)}px`;

    this.editor_container.style.position = "relative";
    this.editor_container.appendChild(popover);
    pending_preview = { popover, link };

    // Ask extension host to read the file
    post_message("read_linked_file", { href });
  }

  private show_popover(content: string, file_name: string): void {
    if (!pending_preview) return;

    const { popover } = pending_preview;
    const clean = strip_frontmatter(content);
    const html = md.render(clean);

    popover.innerHTML = "";

    const header = document.createElement("div");
    header.className = "link-preview-header";
    header.textContent = file_name;
    popover.appendChild(header);

    const body = document.createElement("div");
    body.className = "link-preview-body markdown-body";
    body.innerHTML = html;
    popover.appendChild(body);
  }

  private dismiss(): void {
    if (pending_preview) {
      pending_preview.popover.remove();
      pending_preview = null;
    }
    if (hide_timer) {
      clearTimeout(hide_timer);
      hide_timer = null;
    }
  }
}
