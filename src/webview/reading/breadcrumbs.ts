interface HeadingEntry {
  element: HTMLElement;
  level: number;
  text: string;
}

export class Breadcrumbs {
  private container: HTMLElement;
  private editor_container: HTMLElement;
  private observer: IntersectionObserver | null = null;
  private headings: HeadingEntry[] = [];
  private visible_headings: Set<HTMLElement> = new Set();

  constructor(parent: HTMLElement, editor_container: HTMLElement) {
    this.editor_container = editor_container;

    this.container = document.createElement("div");
    this.container.className = "breadcrumbs-bar";
    this.container.style.height = "28px";
    this.container.style.display = "flex";
    this.container.style.alignItems = "center";
    this.container.style.padding = "0 12px";
    this.container.style.fontSize = "11px";
    this.container.style.color = "var(--text-muted)";
    this.container.style.backgroundColor = "var(--bg-secondary)";
    this.container.style.borderBottom = "1px solid var(--border)";
    this.container.style.overflow = "hidden";
    this.container.style.whiteSpace = "nowrap";
    this.container.style.gap = "4px";
    this.container.style.flexShrink = "0";

    // Insert after toolbar (before editor content)
    const toolbar = parent.querySelector(".toolbar");
    if (toolbar && toolbar.nextSibling) {
      parent.insertBefore(this.container, toolbar.nextSibling);
    } else {
      parent.appendChild(this.container);
    }
  }

  update(markdown_body: HTMLElement): void {
    this.cleanup_observer();

    const heading_elements = markdown_body.querySelectorAll<HTMLElement>("h1, h2, h3, h4, h5, h6");
    this.headings = [];

    heading_elements.forEach((el) => {
      const level = parseInt(el.tagName[1], 10);
      const text = el.textContent?.trim() || "";
      if (text) {
        this.headings.push({ element: el, level, text });
      }
    });

    this.setup_observer();
  }

  private setup_observer(): void {
    this.visible_headings.clear();

    this.observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          const heading = entry.target as HTMLElement;
          if (entry.isIntersecting) {
            this.visible_headings.add(heading);
          } else {
            this.visible_headings.delete(heading);
          }
        }
        this.render_breadcrumbs();
      },
      { root: this.editor_container, rootMargin: "0px 0px -60% 0px", threshold: 0 }
    );

    for (const heading of this.headings) {
      this.observer.observe(heading.element);
    }
  }

  private find_current_heading(): HeadingEntry | null {
    // Find the topmost visible heading
    let top_entry: HeadingEntry | null = null;
    let top_y = Infinity;

    for (const heading of this.headings) {
      if (this.visible_headings.has(heading.element)) {
        const rect = heading.element.getBoundingClientRect();
        if (rect.top < top_y) {
          top_y = rect.top;
          top_entry = heading;
        }
      }
    }

    // If no heading is visible, find the last heading scrolled past
    if (!top_entry && this.headings.length > 0) {
      for (let i = this.headings.length - 1; i >= 0; i--) {
        const rect = this.headings[i].element.getBoundingClientRect();
        if (rect.top < 0) {
          top_entry = this.headings[i];
          break;
        }
      }
    }

    return top_entry;
  }

  private build_breadcrumb_chain(current: HeadingEntry): HeadingEntry[] {
    const chain: HeadingEntry[] = [current];
    const current_idx = this.headings.indexOf(current);

    let target_level = current.level - 1;

    // Walk backwards to find parent headings
    for (let i = current_idx - 1; i >= 0 && target_level >= 1; i--) {
      if (this.headings[i].level <= target_level) {
        chain.unshift(this.headings[i]);
        target_level = this.headings[i].level - 1;
      }
    }

    return chain;
  }

  private render_breadcrumbs(): void {
    this.container.innerHTML = "";

    const current = this.find_current_heading();
    if (!current) return;

    const chain = this.build_breadcrumb_chain(current);

    for (let i = 0; i < chain.length; i++) {
      if (i > 0) {
        const separator = document.createElement("span");
        separator.textContent = ">";
        separator.style.color = "var(--text-muted)";
        separator.style.margin = "0 2px";
        separator.style.opacity = "0.6";
        this.container.appendChild(separator);
      }

      const item = document.createElement("span");
      item.className = "breadcrumb-item";
      item.textContent = chain[i].text;
      item.style.cursor = "pointer";
      item.style.opacity = i === chain.length - 1 ? "1" : "0.7";
      item.style.textOverflow = "ellipsis";
      item.style.overflow = "hidden";

      const heading_element = chain[i].element;
      item.addEventListener("click", () => {
        heading_element.scrollIntoView({ behavior: "smooth", block: "start" });
      });

      this.container.appendChild(item);
    }
  }

  private cleanup_observer(): void {
    if (this.observer) {
      this.observer.disconnect();
      this.observer = null;
    }
    this.visible_headings.clear();
  }

  destroy(): void {
    this.cleanup_observer();
    this.container.remove();
  }
}
