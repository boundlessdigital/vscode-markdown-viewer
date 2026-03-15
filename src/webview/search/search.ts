export class SearchOverlay {
  private container: HTMLElement;
  private overlay: HTMLElement;
  private input: HTMLInputElement;
  private count_display: HTMLElement;
  private matches: HTMLElement[] = [];
  private current_index: number = -1;
  private keydown_handler: (e: KeyboardEvent) => void;

  constructor(editor_container: HTMLElement) {
    this.container = editor_container;
    this.overlay = this.build_overlay();
    this.input = this.overlay.querySelector("input")!;
    this.count_display = this.overlay.querySelector(".search-count")!;

    document.body.appendChild(this.overlay);

    this.keydown_handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "f") {
        e.preventDefault();
        this.open();
      }
    };
    document.addEventListener("keydown", this.keydown_handler);
  }

  private build_overlay(): HTMLElement {
    const el = document.createElement("div");
    el.className = "search-overlay hidden";
    el.innerHTML = `
      <input type="text" placeholder="Search..." />
      <span class="search-count"></span>
      <button class="search-prev" title="Previous (Shift+Enter)">&#x25B2;</button>
      <button class="search-next" title="Next (Enter)">&#x25BC;</button>
      <button class="search-close" title="Close (Escape)">&times;</button>
    `;

    const input = el.querySelector("input")!;
    input.addEventListener("input", () => this.perform_search(input.value));
    input.addEventListener("keydown", (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        this.close();
      } else if (e.key === "Enter" && e.shiftKey) {
        e.preventDefault();
        this.navigate(-1);
      } else if (e.key === "Enter") {
        e.preventDefault();
        this.navigate(1);
      }
    });

    el.querySelector(".search-prev")!.addEventListener("click", () => this.navigate(-1));
    el.querySelector(".search-next")!.addEventListener("click", () => this.navigate(1));
    el.querySelector(".search-close")!.addEventListener("click", () => this.close());

    return el;
  }

  open(): void {
    this.overlay.classList.remove("hidden");
    this.input.focus();
    this.input.select();
  }

  close(): void {
    this.overlay.classList.add("hidden");
    this.clear_marks();
    this.input.value = "";
    this.count_display.textContent = "";
  }

  destroy(): void {
    this.close();
    document.removeEventListener("keydown", this.keydown_handler);
    this.overlay.remove();
  }

  private perform_search(query: string): void {
    this.clear_marks();

    if (!query) {
      this.count_display.textContent = "";
      return;
    }

    const body = this.container.querySelector(".markdown-body") ?? this.container;
    const text_nodes = this.collect_text_nodes(body);
    const lower_query = query.toLowerCase();

    for (const node of text_nodes) {
      const text = node.textContent ?? "";
      const lower_text = text.toLowerCase();
      let offset = 0;
      let index = lower_text.indexOf(lower_query, offset);

      if (index === -1) continue;

      const parent = node.parentNode!;
      const frag = document.createDocumentFragment();
      let last_end = 0;

      while (index !== -1) {
        if (index > last_end) {
          frag.appendChild(document.createTextNode(text.slice(last_end, index)));
        }
        const mark = document.createElement("mark");
        mark.className = "search-match";
        mark.textContent = text.slice(index, index + query.length);
        frag.appendChild(mark);
        this.matches.push(mark);
        last_end = index + query.length;
        index = lower_text.indexOf(lower_query, last_end);
      }

      if (last_end < text.length) {
        frag.appendChild(document.createTextNode(text.slice(last_end)));
      }

      parent.replaceChild(frag, node);
    }

    if (this.matches.length > 0) {
      this.current_index = 0;
      this.highlight_current();
    }

    this.update_count();
  }

  private collect_text_nodes(root: Element | Node): Text[] {
    const nodes: Text[] = [];
    const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, {
      acceptNode: (node) => {
        const parent = node.parentElement;
        if (parent && (parent.tagName === "SCRIPT" || parent.tagName === "STYLE" || parent.closest(".search-overlay"))) {
          return NodeFilter.FILTER_REJECT;
        }
        return NodeFilter.FILTER_ACCEPT;
      },
    });

    let current: Node | null;
    while ((current = walker.nextNode())) {
      nodes.push(current as Text);
    }
    return nodes;
  }

  private clear_marks(): void {
    const marks = this.container.querySelectorAll("mark.search-match");
    for (const mark of Array.from(marks)) {
      const parent = mark.parentNode;
      if (!parent) continue;
      const text_node = document.createTextNode(mark.textContent ?? "");
      parent.replaceChild(text_node, mark);
      parent.normalize();
    }
    this.matches = [];
    this.current_index = -1;
  }

  private navigate(direction: number): void {
    if (this.matches.length === 0) return;
    this.current_index = (this.current_index + direction + this.matches.length) % this.matches.length;
    this.highlight_current();
  }

  private highlight_current(): void {
    for (const m of this.matches) {
      m.classList.remove("search-current");
    }
    if (this.current_index >= 0 && this.current_index < this.matches.length) {
      const current = this.matches[this.current_index];
      current.classList.add("search-current");
      current.scrollIntoView({ behavior: "smooth", block: "center" });
    }
    this.update_count();
  }

  private update_count(): void {
    if (this.matches.length === 0) {
      this.count_display.textContent = this.input.value ? "0 results" : "";
    } else {
      this.count_display.textContent = `${this.current_index + 1} of ${this.matches.length}`;
    }
  }
}
