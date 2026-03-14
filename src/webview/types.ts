export type EditorModeType = "preview" | "rich_edit" | "source_edit";

export interface EditorMode {
  activate(container: HTMLElement, markdown: string): Promise<void>;
  deactivate(): void;
  update_content(markdown: string): void;
  get_markdown(): string;
}
