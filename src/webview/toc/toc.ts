interface TocEntry {
  element: HTMLElement;
  level: number;
  text: string;
}

export class TableOfContents {
  private sidebar: HTMLElement;
  private editor_container: HTMLElement;
  private content_wrapper: HTMLElement | null = null;
  private entries: TocEntry[] = [];
  private observer: IntersectionObserver | null = null;
  private visible = false;
  private active_link: HTMLAnchorElement | null = null;
  private visible_headings: Set<HTMLElement> = new Set();

  constructor(editor_container: HTMLElement) {
    this.editor_container = editor_container;

    this.sidebar = document.createElement("nav");
    this.sidebar.className = "toc-sidebar";
  }

  update(container: HTMLElement): void {
    this.cleanup_observer();

    const headings = container.querySelectorAll<HTMLElement>("h1, h2, h3, h4, h5, h6");
    this.entries = [];

    headings.forEach((el) => {
      const level = parseInt(el.tagName[1], 10);
      const text = el.textContent?.trim() || "";
      if (text) {
        if (!el.id) {
          el.id = "toc-" + text.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
        }
        this.entries.push({ element: el, level, text });
      }
    });

    this.render_list();
    this.setup_observer();
  }

  destroy(): void {
    this.cleanup_observer();
    this.hide();
    this.sidebar.remove();
  }

  toggle(): void {
    if (this.visible) {
      this.hide();
    } else {
      this.show();
    }
  }

  is_visible(): boolean {
    return this.visible;
  }

  private show(): void {
    this.visible = true;

    // Wrap existing content in a scrollable div
    if (!this.content_wrapper) {
      this.content_wrapper = document.createElement("div");
      this.content_wrapper.className = "editor-content";

      // Move all existing children into the wrapper
      while (this.editor_container.firstChild) {
        this.content_wrapper.appendChild(this.editor_container.firstChild);
      }

      this.editor_container.appendChild(this.sidebar);
      this.editor_container.appendChild(this.content_wrapper);
    }

    this.editor_container.classList.add("has-toc");
  }

  private hide(): void {
    this.visible = false;
    this.editor_container.classList.remove("has-toc");

    // Unwrap content back to editor container
    if (this.content_wrapper) {
      while (this.content_wrapper.firstChild) {
        this.editor_container.appendChild(this.content_wrapper.firstChild);
      }
      this.content_wrapper.remove();
      this.sidebar.remove();
      this.content_wrapper = null;
    }
  }

  private render_list(): void {
    this.sidebar.innerHTML = "";
    const ul = document.createElement("ul");

    for (const entry of this.entries) {
      const li = document.createElement("li");
      li.className = `toc-level-${entry.level}`;

      const a = document.createElement("a");
      a.textContent = entry.text;
      a.title = entry.text;
      a.addEventListener("click", (e) => {
        e.preventDefault();
        entry.element.scrollIntoView({ behavior: "smooth", block: "start" });
      });

      li.appendChild(a);
      ul.appendChild(li);
    }

    this.sidebar.appendChild(ul);
  }

  private setup_observer(): void {
    this.visible_headings.clear();
    this.active_link = null;

    const scroll_root = this.content_wrapper || this.editor_container;

    this.observer = new IntersectionObserver(
      (observer_entries) => {
        for (const oe of observer_entries) {
          const heading = oe.target as HTMLElement;
          if (oe.isIntersecting) {
            this.visible_headings.add(heading);
          } else {
            this.visible_headings.delete(heading);
          }
        }
        this.highlight_current();
      },
      { root: scroll_root, rootMargin: "0px 0px -60% 0px", threshold: 0 }
    );

    for (const entry of this.entries) {
      this.observer.observe(entry.element);
    }
  }

  private highlight_current(): void {
    if (this.active_link) {
      this.active_link.classList.remove("toc-active");
      this.active_link = null;
    }

    let top_entry: TocEntry | null = null;
    let top_y = Infinity;

    for (const entry of this.entries) {
      if (this.visible_headings.has(entry.element)) {
        const rect = entry.element.getBoundingClientRect();
        if (rect.top < top_y) {
          top_y = rect.top;
          top_entry = entry;
        }
      }
    }

    if (!top_entry && this.entries.length > 0) {
      for (let i = this.entries.length - 1; i >= 0; i--) {
        const rect = this.entries[i].element.getBoundingClientRect();
        if (rect.top < 0) {
          top_entry = this.entries[i];
          break;
        }
      }
    }

    if (top_entry) {
      const idx = this.entries.indexOf(top_entry);
      const links = this.sidebar.querySelectorAll<HTMLAnchorElement>("a");
      if (links[idx]) {
        links[idx].classList.add("toc-active");
        this.active_link = links[idx];
      }
    }
  }

  private cleanup_observer(): void {
    if (this.observer) {
      this.observer.disconnect();
      this.observer = null;
    }
    this.visible_headings.clear();
  }
}
