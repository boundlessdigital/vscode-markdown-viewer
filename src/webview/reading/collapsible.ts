interface SectionInfo {
  heading: HTMLElement;
  chevron: HTMLElement;
  content_wrapper: HTMLElement;
  level: number;
  collapsed: boolean;
}

export class CollapsibleSections {
  private sections: SectionInfo[] = [];

  constructor() {}

  apply(markdown_body: HTMLElement): void {
    this.destroy();

    const children = Array.from(markdown_body.children) as HTMLElement[];
    const heading_regex = /^H[2-6]$/;

    // Identify all headings (h2-h6, skip h1)
    const heading_indices: number[] = [];
    for (let i = 0; i < children.length; i++) {
      if (heading_regex.test(children[i].tagName)) {
        heading_indices.push(i);
      }
    }

    // Process headings in reverse order so DOM mutations don't shift indices
    for (let h = heading_indices.length - 1; h >= 0; h--) {
      const heading_index = heading_indices[h];
      const heading = children[heading_index];
      const level = parseInt(heading.tagName[1], 10);

      // Find the end of this section: next heading of same or higher level
      const next_heading_index = heading_indices[h + 1];
      let section_end: number;

      if (next_heading_index !== undefined) {
        // Check if the next heading is same level or higher (lower number)
        const next_level = parseInt(children[next_heading_index].tagName[1], 10);
        if (next_level <= level) {
          section_end = next_heading_index;
        } else {
          // Find the next heading at same or higher level
          section_end = children.length;
          for (let k = h + 1; k < heading_indices.length; k++) {
            const k_level = parseInt(children[heading_indices[k]].tagName[1], 10);
            if (k_level <= level) {
              section_end = heading_indices[k];
              break;
            }
          }
        }
      } else {
        section_end = children.length;
      }

      // Collect content elements between this heading and section end
      const content_elements: HTMLElement[] = [];
      for (let i = heading_index + 1; i < section_end; i++) {
        content_elements.push(children[i]);
      }

      if (content_elements.length === 0) continue;

      // Create content wrapper
      const content_wrapper = document.createElement("div");
      content_wrapper.className = "collapsible-content";

      // Insert wrapper after heading, move content into it
      heading.after(content_wrapper);
      for (const el of content_elements) {
        content_wrapper.appendChild(el);
      }

      // Create chevron
      const chevron = document.createElement("span");
      chevron.className = "collapsible-chevron";
      chevron.style.display = "inline-block";
      chevron.style.width = "12px";
      chevron.style.height = "12px";
      chevron.style.marginRight = "6px";
      chevron.style.transition = "transform 0.15s ease";
      chevron.style.color = "var(--text-muted, #999)";
      chevron.style.fontSize = "10px";
      chevron.style.verticalAlign = "middle";
      chevron.style.userSelect = "none";
      chevron.innerHTML = `<svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M4 2L8 6L4 10"/></svg>`;
      chevron.style.transform = "rotate(90deg)";

      heading.classList.add("collapsible-heading");
      heading.style.cursor = "pointer";
      heading.insertBefore(chevron, heading.firstChild);

      const section: SectionInfo = {
        heading,
        chevron,
        content_wrapper,
        level,
        collapsed: false,
      };

      // Click handler
      const click_handler = (e: MouseEvent) => {
        e.preventDefault();
        e.stopPropagation();
        this.toggle_section(section);
      };

      heading.addEventListener("click", click_handler);
      (heading as any).__collapsible_click_handler = click_handler;

      this.sections.push(section);
    }

    // Reverse sections array so they're in document order
    this.sections.reverse();
  }

  destroy(): void {
    for (const section of this.sections) {
      const { heading, chevron, content_wrapper } = section;

      // Remove click handler
      const handler = (heading as any).__collapsible_click_handler;
      if (handler) {
        heading.removeEventListener("click", handler);
        delete (heading as any).__collapsible_click_handler;
      }

      // Remove chevron
      if (chevron.parentNode === heading) {
        heading.removeChild(chevron);
      }

      // Unwrap content back to parent
      const parent = content_wrapper.parentNode;
      if (parent) {
        while (content_wrapper.firstChild) {
          parent.insertBefore(content_wrapper.firstChild, content_wrapper);
        }
        parent.removeChild(content_wrapper);
      }

      // Remove classes and styles
      heading.classList.remove("collapsible-heading");
      heading.style.cursor = "";
    }

    this.sections = [];
  }

  private toggle_section(section: SectionInfo): void {
    section.collapsed = !section.collapsed;

    if (section.collapsed) {
      section.content_wrapper.classList.add("collapsed");
      section.content_wrapper.style.display = "none";
      section.chevron.style.transform = "rotate(0deg)";
    } else {
      section.content_wrapper.classList.remove("collapsed");
      section.content_wrapper.style.display = "";
      section.chevron.style.transform = "rotate(90deg)";
    }
  }
}
