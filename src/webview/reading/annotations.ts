import { post_message } from "../util/vscode_api";

export interface Annotation {
  id: string;
  text: string;
  color: string;
  context_before: string;
  context_after: string;
}

const ANNOTATION_COLORS: { name: string; hex: string }[] = [
  { name: "yellow", hex: "#fef3cd" },
  { name: "green", hex: "#d4edda" },
  { name: "blue", hex: "#cce5ff" },
  { name: "pink", hex: "#f8d7da" },
];

export class AnnotationManager {
  private editor_container: HTMLElement;
  private annotations: Annotation[] = [];
  private toolbar: HTMLElement | null = null;
  private current_selection: { text: string; range: Range } | null = null;
  private mouseup_handler: (e: MouseEvent) => void;
  private keydown_handler: (e: KeyboardEvent) => void;
  private dismiss_handler: (e: MouseEvent) => void;

  constructor(editor_container: HTMLElement) {
    this.editor_container = editor_container;

    this.mouseup_handler = (e: MouseEvent) => {
      // Ignore clicks on the toolbar itself
      if (this.toolbar?.contains(e.target as Node)) {
        return;
      }
      this.on_mouseup(e);
    };

    this.keydown_handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        this.dismiss_toolbar();
      }
    };

    this.dismiss_handler = (e: MouseEvent) => {
      if (this.toolbar && !this.toolbar.contains(e.target as Node)) {
        this.dismiss_toolbar();
      }
    };

    this.editor_container.addEventListener("mouseup", this.mouseup_handler);
    document.addEventListener("keydown", this.keydown_handler);
  }

  load_annotations(annotations: Annotation[]): void {
    this.annotations = [...annotations];
  }

  apply(markdown_body: HTMLElement): void {
    for (const annotation of this.annotations) {
      this.apply_annotation(markdown_body, annotation);
    }
  }

  destroy(): void {
    this.editor_container.removeEventListener("mouseup", this.mouseup_handler);
    document.removeEventListener("keydown", this.keydown_handler);
    document.removeEventListener("mousedown", this.dismiss_handler);
    this.dismiss_toolbar();
  }

  private on_mouseup(e: MouseEvent): void {
    const selection = window.getSelection();

    if (!selection || selection.isCollapsed || !selection.rangeCount) {
      this.dismiss_toolbar();
      return;
    }

    const text = selection.toString().trim();
    if (text.length === 0) {
      this.dismiss_toolbar();
      return;
    }

    const range = selection.getRangeAt(0);

    // Ensure the selection is within the editor container
    if (!this.editor_container.contains(range.commonAncestorContainer)) {
      this.dismiss_toolbar();
      return;
    }

    this.current_selection = { text, range: range.cloneRange() };
    this.show_toolbar(e.clientX, e.clientY);
  }

  private show_toolbar(x: number, y: number): void {
    this.dismiss_toolbar();

    this.toolbar = document.createElement("div");
    this.toolbar.style.position = "fixed";
    this.toolbar.style.left = `${x}px`;
    this.toolbar.style.top = `${y - 40}px`;
    this.toolbar.style.display = "flex";
    this.toolbar.style.gap = "6px";
    this.toolbar.style.padding = "6px 8px";
    this.toolbar.style.backgroundColor = "var(--bg-secondary, #2d2d2d)";
    this.toolbar.style.border = "1px solid var(--border, #555)";
    this.toolbar.style.borderRadius = "6px";
    this.toolbar.style.boxShadow = "0 2px 8px rgba(0,0,0,0.3)";
    this.toolbar.style.zIndex = "1000";

    for (const color of ANNOTATION_COLORS) {
      const circle = document.createElement("button");
      circle.style.width = "20px";
      circle.style.height = "20px";
      circle.style.borderRadius = "50%";
      circle.style.backgroundColor = color.hex;
      circle.style.border = "2px solid transparent";
      circle.style.cursor = "pointer";
      circle.style.padding = "0";
      circle.title = color.name;

      circle.addEventListener("mouseenter", () => {
        circle.style.border = "2px solid #fff";
      });
      circle.addEventListener("mouseleave", () => {
        circle.style.border = "2px solid transparent";
      });

      circle.addEventListener("click", (e) => {
        e.stopPropagation();
        this.create_annotation(color.hex);
      });

      this.toolbar.appendChild(circle);
    }

    document.body.appendChild(this.toolbar);

    // Defer adding the dismiss handler so the current click doesn't immediately dismiss
    requestAnimationFrame(() => {
      document.addEventListener("mousedown", this.dismiss_handler);
    });
  }

  private dismiss_toolbar(): void {
    if (this.toolbar) {
      this.toolbar.remove();
      this.toolbar = null;
    }
    document.removeEventListener("mousedown", this.dismiss_handler);
  }

  private create_annotation(color: string): void {
    if (!this.current_selection) return;

    const { text, range } = this.current_selection;
    const id = generate_id();

    // Extract context from the text content around the selection
    const context_before = this.extract_context_before(range);
    const context_after = this.extract_context_after(range);

    const annotation: Annotation = {
      id,
      text,
      color,
      context_before,
      context_after,
    };

    // Wrap the selected range in a mark element
    this.wrap_range(range, color);

    this.annotations.push(annotation);
    this.save_annotations();
    this.dismiss_toolbar();
    this.current_selection = null;

    // Clear the selection
    window.getSelection()?.removeAllRanges();
  }

  private extract_context_before(range: Range): string {
    const node = range.startContainer;
    if (node.nodeType !== Node.TEXT_NODE) return "";

    const text = node.textContent || "";
    const offset = range.startOffset;
    const start = Math.max(0, offset - 20);
    return text.slice(start, offset);
  }

  private extract_context_after(range: Range): string {
    const node = range.endContainer;
    if (node.nodeType !== Node.TEXT_NODE) return "";

    const text = node.textContent || "";
    const offset = range.endOffset;
    return text.slice(offset, offset + 20);
  }

  private wrap_range(range: Range, color: string): void {
    const mark = document.createElement("mark");
    mark.className = "annotation";
    mark.style.backgroundColor = color;

    try {
      range.surroundContents(mark);
    } catch {
      // If the range spans multiple elements, extract and wrap
      const fragment = range.extractContents();
      mark.appendChild(fragment);
      range.insertNode(mark);
    }
  }

  private apply_annotation(container: HTMLElement, annotation: Annotation): void {
    const tree_walker = document.createTreeWalker(container, NodeFilter.SHOW_TEXT);
    let node: Text | null;

    while ((node = tree_walker.nextNode() as Text | null)) {
      const text = node.textContent || "";
      const index = text.indexOf(annotation.text);

      if (index === -1) continue;

      // Verify context to ensure correct match
      if (!this.matches_context(node, index, annotation)) {
        continue;
      }

      const range = document.createRange();
      range.setStart(node, index);
      range.setEnd(node, index + annotation.text.length);

      this.wrap_range(range, annotation.color);
      break;
    }
  }

  private matches_context(node: Text, index: number, annotation: Annotation): boolean {
    const text = node.textContent || "";

    if (annotation.context_before.length > 0) {
      const before_start = Math.max(0, index - annotation.context_before.length);
      const actual_before = text.slice(before_start, index);
      if (!annotation.context_before.endsWith(actual_before) && !actual_before.endsWith(annotation.context_before)) {
        return false;
      }
    }

    if (annotation.context_after.length > 0) {
      const after_end = index + annotation.text.length;
      const actual_after = text.slice(after_end, after_end + annotation.context_after.length);
      if (!annotation.context_after.startsWith(actual_after) && !actual_after.startsWith(annotation.context_after)) {
        return false;
      }
    }

    return true;
  }

  private save_annotations(): void {
    post_message("save_annotations", { annotations: this.annotations });
  }
}

function generate_id(): string {
  return `ann_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}
