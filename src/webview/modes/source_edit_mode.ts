import type { EditorMode } from "../types";
import { post_message } from "../util/vscode_api";
import { debounce } from "../util/debounce";

export class SourceEditMode implements EditorMode {
  private container: HTMLElement | null = null;
  private textarea: HTMLTextAreaElement | null = null;
  private current_markdown = "";
  private is_updating = false;

  private debounced_send = debounce((markdown: string) => {
    post_message("update_document", { markdown });
  }, 300);

  async activate(container: HTMLElement, markdown: string): Promise<void> {
    this.container = container;
    this.current_markdown = markdown;

    const textarea = document.createElement("textarea");
    textarea.className = "source-editor";
    textarea.value = markdown;
    textarea.spellcheck = false;

    textarea.addEventListener("input", () => {
      if (this.is_updating) return;
      this.current_markdown = textarea.value;
      this.debounced_send(textarea.value);
    });

    // Tab key inserts spaces instead of changing focus
    textarea.addEventListener("keydown", (e) => {
      if (e.key === "Tab") {
        e.preventDefault();
        const start = textarea.selectionStart;
        const end = textarea.selectionEnd;
        textarea.value =
          textarea.value.substring(0, start) +
          "  " +
          textarea.value.substring(end);
        textarea.selectionStart = textarea.selectionEnd = start + 2;
        this.current_markdown = textarea.value;
        this.debounced_send(textarea.value);
      }
    });

    container.innerHTML = "";
    container.appendChild(textarea);
    this.textarea = textarea;
    textarea.focus();
  }

  deactivate(): void {
    if (this.container) {
      this.container.innerHTML = "";
    }
    this.textarea = null;
    this.container = null;
  }

  update_content(markdown: string): void {
    this.current_markdown = markdown;
    if (this.textarea) {
      this.is_updating = true;
      this.textarea.value = markdown;
      this.is_updating = false;
    }
  }

  get_markdown(): string {
    return this.current_markdown;
  }
}
