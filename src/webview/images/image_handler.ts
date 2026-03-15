import { post_message } from "../util/vscode_api";

export class ImageHandler {
  private editor_container: HTMLElement;
  private bound_dragover: (e: DragEvent) => void;
  private bound_dragleave: (e: DragEvent) => void;
  private bound_drop: (e: DragEvent) => void;
  private bound_paste: (e: ClipboardEvent) => void;
  private bound_message: (e: MessageEvent) => void;

  constructor(editor_container: HTMLElement) {
    this.editor_container = editor_container;

    this.bound_dragover = this.handle_dragover.bind(this);
    this.bound_dragleave = this.handle_dragleave.bind(this);
    this.bound_drop = this.handle_drop.bind(this);
    this.bound_paste = this.handle_paste.bind(this);
    this.bound_message = this.handle_message.bind(this);

    this.editor_container.addEventListener("dragover", this.bound_dragover);
    this.editor_container.addEventListener("dragleave", this.bound_dragleave);
    this.editor_container.addEventListener("drop", this.bound_drop);
    this.editor_container.addEventListener("paste", this.bound_paste);
    window.addEventListener("message", this.bound_message);
  }

  private handle_dragover(e: DragEvent): void {
    e.preventDefault();
    e.stopPropagation();
    this.editor_container.classList.add("drag-over");
  }

  private handle_dragleave(e: DragEvent): void {
    e.preventDefault();
    e.stopPropagation();
    this.editor_container.classList.remove("drag-over");
  }

  private async handle_drop(e: DragEvent): Promise<void> {
    e.preventDefault();
    e.stopPropagation();
    this.editor_container.classList.remove("drag-over");

    const files = e.dataTransfer?.files;
    if (!files) return;

    for (const file of Array.from(files)) {
      if (file.type.startsWith("image/")) {
        const data_base64 = await this.file_to_base64(file);
        post_message("save_image", { name: file.name, data_base64 });
      }
    }
  }

  private async handle_paste(e: ClipboardEvent): Promise<void> {
    const items = e.clipboardData?.items;
    if (!items) return;

    for (const item of Array.from(items)) {
      if (item.type.startsWith("image/")) {
        e.preventDefault();
        const file = item.getAsFile();
        if (!file) continue;

        const extension = file.type.split("/")[1] || "png";
        const name = `pasted-image-${Date.now()}.${extension}`;
        const data_base64 = await this.file_to_base64(file);
        post_message("save_image", { name, data_base64 });
      }
    }
  }

  private handle_message(e: MessageEvent): void {
    const message = e.data;
    if (message?.type === "image_saved" && message.path) {
      post_message("insert_text", { text: `![](${message.path})` });
    }
  }

  private file_to_base64(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        const result = reader.result as string;
        const base64 = result.split(",")[1] || "";
        resolve(base64);
      };
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  }

  destroy(): void {
    this.editor_container.removeEventListener("dragover", this.bound_dragover);
    this.editor_container.removeEventListener("dragleave", this.bound_dragleave);
    this.editor_container.removeEventListener("drop", this.bound_drop);
    this.editor_container.removeEventListener("paste", this.bound_paste);
    window.removeEventListener("message", this.bound_message);
  }
}
