import type { EditorMode } from "../types";
import { post_message } from "../util/vscode_api";
import { debounce } from "../util/debounce";
import { Crepe, CrepeFeature } from "@milkdown/crepe";
import "@milkdown/crepe/theme/common/style.css";
import "@milkdown/crepe/theme/frame.css";

export class RichEditMode implements EditorMode {
  private container: HTMLElement | null = null;
  private crepe: Crepe | null = null;
  private current_markdown = "";
  private is_updating = false;

  private debounced_send = debounce((markdown: string) => {
    post_message("update_document", { markdown });
  }, 300);

  async activate(container: HTMLElement, markdown: string): Promise<void> {
    this.container = container;
    this.current_markdown = markdown;
    container.innerHTML = "";

    const editor_root = document.createElement("div");
    editor_root.className = "rich-editor";
    container.appendChild(editor_root);

    this.crepe = new Crepe({
      root: editor_root,
      defaultValue: markdown,
      features: {
        [CrepeFeature.CodeMirror]: true,
        [CrepeFeature.ListItem]: true,
        [CrepeFeature.LinkTooltip]: true,
        [CrepeFeature.Table]: true,
        [CrepeFeature.BlockEdit]: true,
        [CrepeFeature.Cursor]: true,
        [CrepeFeature.ImageBlock]: true,
        [CrepeFeature.Placeholder]: true,
        [CrepeFeature.Toolbar]: true,
      },
    });

    this.crepe.on((listener: any) => {
      listener.markdownUpdated((_ctx: any, markdown: string, _prev: string) => {
        if (this.is_updating) return;
        this.current_markdown = markdown;
        this.debounced_send(markdown);
      });
    });

    await this.crepe.create();
  }

  deactivate(): void {
    if (this.crepe) {
      this.crepe.destroy();
      this.crepe = null;
    }
    if (this.container) {
      this.container.innerHTML = "";
    }
    this.container = null;
  }

  update_content(markdown: string): void {
    if (markdown === this.current_markdown) return;
    this.current_markdown = markdown;

    // Destroy and recreate to update content
    if (this.crepe && this.container) {
      this.is_updating = true;
      const container = this.container;
      this.crepe.destroy();
      this.crepe = null;

      container.innerHTML = "";
      const editor_root = document.createElement("div");
      editor_root.className = "rich-editor";
      container.appendChild(editor_root);

      this.crepe = new Crepe({
        root: editor_root,
        defaultValue: markdown,
        features: {
          [CrepeFeature.CodeMirror]: true,
          [CrepeFeature.ListItem]: true,
          [CrepeFeature.LinkTooltip]: true,
          [CrepeFeature.Table]: true,
          [CrepeFeature.BlockEdit]: true,
          [CrepeFeature.Cursor]: true,
          [CrepeFeature.ImageBlock]: true,
          [CrepeFeature.Placeholder]: true,
          [CrepeFeature.Toolbar]: true,
        },
      });

      this.crepe.on((listener: any) => {
        listener.markdownUpdated(
          (_ctx: any, md: string, _prev: string) => {
            if (this.is_updating) return;
            this.current_markdown = md;
            this.debounced_send(md);
          }
        );
      });

      this.crepe.create().then(() => {
        this.is_updating = false;
      });
    }
  }

  get_markdown(): string {
    if (this.crepe) {
      try {
        return this.crepe.getMarkdown();
      } catch {
        return this.current_markdown;
      }
    }
    return this.current_markdown;
  }
}
