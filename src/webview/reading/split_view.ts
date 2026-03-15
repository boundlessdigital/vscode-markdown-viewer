export class SplitView {
  private editor_container: HTMLElement;
  private active = false;
  private left_pane: HTMLElement | null = null;
  private right_pane: HTMLElement | null = null;
  private divider: HTMLElement | null = null;
  private original_styles: {
    display: string;
    overflow_y: string;
  } | null = null;

  constructor(editor_container: HTMLElement) {
    this.editor_container = editor_container;
  }

  toggle(): void {
    if (this.active) {
      this.deactivate();
    } else {
      this.activate();
    }
  }

  is_active(): boolean {
    return this.active;
  }

  destroy(): void {
    if (this.active) {
      this.deactivate();
    }
  }

  private activate(): void {
    if (this.active) return;

    // Save original container styles
    this.original_styles = {
      display: this.editor_container.style.display,
      overflow_y: this.editor_container.style.overflowY,
    };

    // Create left pane and move all existing children into it
    this.left_pane = document.createElement("div");
    this.left_pane.className = "split-pane-left";
    this.left_pane.style.flex = "1";
    this.left_pane.style.overflowY = "auto";
    this.left_pane.style.minWidth = "0";

    while (this.editor_container.firstChild) {
      this.left_pane.appendChild(this.editor_container.firstChild);
    }

    // Create divider
    this.divider = document.createElement("div");
    this.divider.className = "split-divider";
    this.divider.style.width = "1px";
    this.divider.style.flexShrink = "0";
    this.divider.style.backgroundColor = "var(--border)";
    this.divider.style.alignSelf = "stretch";

    // Create right pane with a copy of the rendered markdown
    this.right_pane = document.createElement("div");
    this.right_pane.className = "split-pane-right";
    this.right_pane.style.flex = "1";
    this.right_pane.style.overflowY = "auto";
    this.right_pane.style.minWidth = "0";

    const markdown_body = this.left_pane.querySelector(".markdown-body");
    if (markdown_body) {
      const cloned = markdown_body.cloneNode(true) as HTMLElement;
      this.right_pane.appendChild(cloned);
    }

    // Set up the flex container
    this.editor_container.style.display = "flex";
    this.editor_container.style.overflowY = "hidden";
    this.editor_container.appendChild(this.left_pane);
    this.editor_container.appendChild(this.divider);
    this.editor_container.appendChild(this.right_pane);

    this.active = true;
  }

  private deactivate(): void {
    if (!this.active) return;

    // Move children from left pane back to editor container
    if (this.left_pane) {
      // Remove the split panes and divider first
      if (this.right_pane) {
        this.right_pane.remove();
        this.right_pane = null;
      }
      if (this.divider) {
        this.divider.remove();
        this.divider = null;
      }

      // Move left pane children back to the editor container
      while (this.left_pane.firstChild) {
        this.editor_container.appendChild(this.left_pane.firstChild);
      }
      this.left_pane.remove();
      this.left_pane = null;
    }

    // Restore original styles
    if (this.original_styles) {
      this.editor_container.style.display = this.original_styles.display;
      this.editor_container.style.overflowY = this.original_styles.overflow_y;
      this.original_styles = null;
    }

    this.active = false;
  }
}
