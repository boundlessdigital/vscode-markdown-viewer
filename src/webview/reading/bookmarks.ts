import { post_message } from "../util/vscode_api";

export interface Bookmark {
  id: string;
  label: string;
  scroll_top: number;
}

export class BookmarkManager {
  private editor_container: HTMLElement;
  private bookmarks: Bookmark[] = [];

  constructor(editor_container: HTMLElement) {
    this.editor_container = editor_container;
  }

  add_bookmark(): void {
    const scroll_top = this.editor_container.scrollTop;
    const label = this.find_nearest_heading(scroll_top);
    const id = generate_id();

    const bookmark: Bookmark = { id, label, scroll_top };
    this.bookmarks.push(bookmark);
    this.persist();
  }

  get_bookmarks(): Bookmark[] {
    return [...this.bookmarks];
  }

  remove_bookmark(id: string): void {
    this.bookmarks = this.bookmarks.filter((b) => b.id !== id);
    this.persist();
  }

  jump_to(id: string): void {
    const bookmark = this.bookmarks.find((b) => b.id === id);
    if (!bookmark) return;

    this.editor_container.scrollTo({
      top: bookmark.scroll_top,
      behavior: "smooth",
    });
  }

  render_list(container: HTMLElement): void {
    container.innerHTML = "";

    if (this.bookmarks.length === 0) {
      const empty = document.createElement("div");
      empty.textContent = "No bookmarks yet";
      empty.style.padding = "8px 12px";
      empty.style.color = "var(--text-muted, #888)";
      empty.style.fontSize = "12px";
      container.appendChild(empty);
      return;
    }

    for (const bookmark of this.bookmarks) {
      const item = document.createElement("div");
      item.style.display = "flex";
      item.style.alignItems = "center";
      item.style.justifyContent = "space-between";
      item.style.padding = "6px 12px";
      item.style.cursor = "pointer";
      item.style.fontSize = "13px";
      item.style.borderBottom = "1px solid var(--border, #333)";

      item.addEventListener("mouseenter", () => {
        item.style.backgroundColor = "var(--bg-hover, rgba(255,255,255,0.05))";
      });
      item.addEventListener("mouseleave", () => {
        item.style.backgroundColor = "";
      });

      const label_el = document.createElement("span");
      label_el.textContent = bookmark.label;
      label_el.style.overflow = "hidden";
      label_el.style.textOverflow = "ellipsis";
      label_el.style.whiteSpace = "nowrap";
      label_el.style.flex = "1";

      label_el.addEventListener("click", () => {
        this.jump_to(bookmark.id);
      });

      const remove_btn = document.createElement("button");
      remove_btn.textContent = "\u00d7";
      remove_btn.style.background = "none";
      remove_btn.style.border = "none";
      remove_btn.style.color = "var(--text-muted, #888)";
      remove_btn.style.cursor = "pointer";
      remove_btn.style.fontSize = "16px";
      remove_btn.style.padding = "0 0 0 8px";
      remove_btn.style.lineHeight = "1";
      remove_btn.title = "Remove bookmark";

      remove_btn.addEventListener("mouseenter", () => {
        remove_btn.style.color = "var(--text, #fff)";
      });
      remove_btn.addEventListener("mouseleave", () => {
        remove_btn.style.color = "var(--text-muted, #888)";
      });

      remove_btn.addEventListener("click", (e) => {
        e.stopPropagation();
        this.remove_bookmark(bookmark.id);
        this.render_list(container);
      });

      item.appendChild(label_el);
      item.appendChild(remove_btn);
      container.appendChild(item);
    }
  }

  destroy(): void {
    this.bookmarks = [];
  }

  private find_nearest_heading(scroll_top: number): string {
    const headings = this.editor_container.querySelectorAll("h1, h2, h3, h4, h5, h6");
    let nearest_heading: Element | null = null;
    let nearest_distance = Infinity;

    for (const heading of Array.from(headings)) {
      const heading_top = (heading as HTMLElement).offsetTop;

      // Find the heading that is above or at the current scroll position
      if (heading_top <= scroll_top) {
        const distance = scroll_top - heading_top;
        if (distance < nearest_distance) {
          nearest_distance = distance;
          nearest_heading = heading;
        }
      }
    }

    if (nearest_heading) {
      return nearest_heading.textContent?.trim() || `Position ${Math.round(scroll_top)}`;
    }

    return `Position ${Math.round(scroll_top)}`;
  }

  private persist(): void {
    post_message("save_bookmarks", { bookmarks: this.bookmarks });
  }
}

function generate_id(): string {
  return `bm_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}
