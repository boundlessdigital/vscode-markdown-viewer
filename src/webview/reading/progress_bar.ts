export class ProgressBar {
  private bar: HTMLElement;
  private editor_container: HTMLElement;
  private scroll_handler: () => void;

  constructor(editor_container: HTMLElement) {
    this.editor_container = editor_container;

    this.bar = document.createElement("div");
    this.bar.style.position = "fixed";
    this.bar.style.top = "0";
    this.bar.style.left = "0";
    this.bar.style.height = "3px";
    this.bar.style.width = "0%";
    this.bar.style.backgroundColor = "var(--link)";
    this.bar.style.opacity = "0.7";
    this.bar.style.zIndex = "300";
    this.bar.style.transition = "width 0.1s ease-out";
    this.bar.style.pointerEvents = "none";

    document.body.prepend(this.bar);

    this.scroll_handler = () => {
      this.update_progress();
    };

    this.editor_container.addEventListener("scroll", this.scroll_handler, { passive: true });
    this.update_progress();
  }

  private update_progress(): void {
    const { scrollTop, scrollHeight, clientHeight } = this.editor_container;
    const max_scroll = scrollHeight - clientHeight;

    if (max_scroll <= 0) {
      this.bar.style.width = "100%";
      return;
    }

    const progress = (scrollTop / max_scroll) * 100;
    this.bar.style.width = `${Math.min(100, Math.max(0, progress))}%`;
  }

  destroy(): void {
    this.editor_container.removeEventListener("scroll", this.scroll_handler);
    this.bar.remove();
  }
}
