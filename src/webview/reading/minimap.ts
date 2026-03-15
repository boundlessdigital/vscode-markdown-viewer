export class Minimap {
  private editor_container: HTMLElement;
  private minimap_container: HTMLElement;
  private minimap_content: HTMLElement;
  private viewport_indicator: HTMLElement;
  private visible = false;
  private scroll_handler: () => void;
  private click_handler: (e: MouseEvent) => void;
  private resize_observer: ResizeObserver;

  private static readonly WIDTH = 90;
  private static readonly SCALE = 0.12;

  constructor(editor_container: HTMLElement) {
    this.editor_container = editor_container;

    // Create minimap container
    this.minimap_container = document.createElement("div");
    this.minimap_container.className = "minimap-container";
    this.minimap_container.style.position = "fixed";
    this.minimap_container.style.right = "0";
    this.minimap_container.style.top = "0";
    this.minimap_container.style.bottom = "0";
    this.minimap_container.style.width = `${Minimap.WIDTH}px`;
    this.minimap_container.style.overflow = "hidden";
    this.minimap_container.style.backgroundColor = "var(--bg-secondary)";
    this.minimap_container.style.zIndex = "200";
    this.minimap_container.style.cursor = "pointer";
    this.minimap_container.style.display = "none";
    this.minimap_container.style.borderLeft = "1px solid var(--border)";

    // Create scaled content area
    this.minimap_content = document.createElement("div");
    this.minimap_content.className = "minimap-content";
    this.minimap_content.style.transformOrigin = "top right";
    this.minimap_content.style.transform = `scaleX(${Minimap.SCALE}) scaleY(${Minimap.SCALE})`;
    this.minimap_content.style.width = `${Minimap.WIDTH / Minimap.SCALE}px`;
    this.minimap_content.style.pointerEvents = "none";
    this.minimap_content.style.position = "absolute";
    this.minimap_content.style.top = "0";
    this.minimap_content.style.right = "0";
    this.minimap_container.appendChild(this.minimap_content);

    // Create viewport indicator
    this.viewport_indicator = document.createElement("div");
    this.viewport_indicator.className = "minimap-viewport";
    this.viewport_indicator.style.position = "absolute";
    this.viewport_indicator.style.right = "0";
    this.viewport_indicator.style.width = "100%";
    this.viewport_indicator.style.backgroundColor = "var(--link)";
    this.viewport_indicator.style.opacity = "0.15";
    this.viewport_indicator.style.borderTop = "1px solid var(--link)";
    this.viewport_indicator.style.borderBottom = "1px solid var(--link)";
    this.viewport_indicator.style.pointerEvents = "none";
    this.viewport_indicator.style.transition = "top 0.05s ease-out, height 0.05s ease-out";
    this.minimap_container.appendChild(this.viewport_indicator);

    document.body.appendChild(this.minimap_container);

    // Scroll handler to update viewport indicator position
    this.scroll_handler = () => {
      this.update_viewport_indicator();
    };

    // Click handler to jump to position
    this.click_handler = (e: MouseEvent) => {
      const rect = this.minimap_container.getBoundingClientRect();
      const click_ratio = (e.clientY - rect.top) / rect.height;
      const { scrollHeight, clientHeight } = this.editor_container;
      const max_scroll = scrollHeight - clientHeight;
      const target_scroll = click_ratio * max_scroll;
      this.editor_container.scrollTo({ top: target_scroll, behavior: "smooth" });
    };

    this.minimap_container.addEventListener("click", this.click_handler);
    this.editor_container.addEventListener("scroll", this.scroll_handler, { passive: true });

    // Watch for resize to update viewport indicator
    this.resize_observer = new ResizeObserver(() => {
      if (this.visible) {
        this.update_viewport_indicator();
      }
    });
    this.resize_observer.observe(this.editor_container);
  }

  update(): void {
    const markdown_body = this.editor_container.querySelector(".markdown-body");
    if (!markdown_body) return;

    const cloned = markdown_body.cloneNode(true) as HTMLElement;

    // Strip interactive elements and scripts from the clone
    const scripts = cloned.querySelectorAll("script, style, iframe");
    scripts.forEach((el) => el.remove());

    this.minimap_content.innerHTML = "";
    this.minimap_content.appendChild(cloned);
    this.update_viewport_indicator();
  }

  toggle(): void {
    if (this.visible) {
      this.minimap_container.style.display = "none";
      this.visible = false;
    } else {
      this.minimap_container.style.display = "block";
      this.visible = true;
      this.update();
    }
  }

  is_visible(): boolean {
    return this.visible;
  }

  destroy(): void {
    this.editor_container.removeEventListener("scroll", this.scroll_handler);
    this.minimap_container.removeEventListener("click", this.click_handler);
    this.resize_observer.disconnect();
    this.minimap_container.remove();
  }

  private update_viewport_indicator(): void {
    const { scrollTop, scrollHeight, clientHeight } = this.editor_container;
    const container_height = this.minimap_container.clientHeight;

    if (scrollHeight <= 0) return;

    // Calculate the scaled document height as it appears in the minimap
    const scaled_doc_height = scrollHeight * Minimap.SCALE;

    // Determine the effective rendering height (capped at container)
    const effective_height = Math.min(scaled_doc_height, container_height);

    // Viewport indicator position and size relative to the effective height
    const viewport_ratio = clientHeight / scrollHeight;
    const scroll_ratio = scrollTop / Math.max(1, scrollHeight - clientHeight);

    const indicator_height = Math.max(10, viewport_ratio * effective_height);
    const max_indicator_top = effective_height - indicator_height;
    const indicator_top = scroll_ratio * max_indicator_top;

    this.viewport_indicator.style.top = `${indicator_top}px`;
    this.viewport_indicator.style.height = `${indicator_height}px`;
  }
}
