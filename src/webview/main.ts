import type { EditorMode, EditorModeType } from "./types";
import { PreviewMode } from "./modes/preview_mode";
import { RichEditMode } from "./modes/rich_edit_mode";
import { SourceEditMode } from "./modes/source_edit_mode";
import { Toolbar, type SettingsState } from "./toolbar/toolbar";
import { apply_theme } from "./themes";
import { export_html, export_pdf } from "./export";
import { post_message } from "./util/vscode_api";
import { debounce } from "./util/debounce";
import "./styles/main.css";

const modes: Record<EditorModeType, EditorMode> = {
  preview: new PreviewMode(),
  rich_edit: new RichEditMode(),
  source_edit: new SourceEditMode(),
};

let current_mode: EditorModeType = "preview";
let current_theme = "light";
let current_markdown = "";
let editor_container: HTMLElement;
let toolbar: Toolbar;
let is_initialized = false;
let source_sync_enabled = false;

function get_current_markdown(): string {
  if (is_initialized) {
    return modes[current_mode].get_markdown();
  }
  return current_markdown;
}

const send_selection = debounce((text: string) => {
  if (text.length > 0 && source_sync_enabled) {
    post_message("selection_changed", { text });
  }
}, 100);

function setup_selection_listener() {
  document.addEventListener("selectionchange", () => {
    if (!source_sync_enabled) return;
    const selection = window.getSelection();
    const text = selection ? selection.toString().trim() : "";
    if (text.length > 0) {
      send_selection(text);
    } else {
      post_message("selection_cleared");
    }
  });
}

function handle_settings_change(settings: SettingsState) {
  source_sync_enabled = settings.source_sync;
  post_message("persist_settings", { settings });

  if (settings.source_sync) {
    post_message("open_source_editor");
  }
}

function init() {
  editor_container = document.getElementById("editor-container")!;

  toolbar = new Toolbar(document.body, {
    on_mode_change: switch_mode,
    on_theme_change: change_theme,
    on_export_html: () => export_html(get_current_markdown()),
    on_export_pdf: () => export_pdf(get_current_markdown()),
    on_settings_change: handle_settings_change,
    initial_theme: current_theme,
  });

  setup_selection_listener();

  window.addEventListener("message", (event) => {
    const message = event.data;
    switch (message.type) {
      case "init":
        current_markdown = message.text;
        current_mode = message.mode || "preview";
        current_theme = message.theme || "light";
        source_sync_enabled = message.source_sync || false;
        apply_theme(current_theme);
        toolbar.set_theme(current_theme);
        toolbar.set_active(current_mode);
        if (message.file_path) {
          toolbar.set_file_path(message.file_path);
        }
        is_initialized = true;
        modes[current_mode].activate(editor_container, current_markdown);
        break;

      case "update":
        if (is_initialized) {
          current_markdown = message.text;
          modes[current_mode].update_content(current_markdown);
        }
        break;

      case "set_mode": {
        const mode_order: EditorModeType[] = ["preview", "rich_edit", "source_edit"];
        let target_mode = message.mode as EditorModeType;
        if (target_mode === ("next" as any)) {
          const idx = mode_order.indexOf(current_mode);
          target_mode = mode_order[(idx + 1) % mode_order.length];
        }
        switch_mode(target_mode);
        break;
      }
    }
  });

  post_message("ready");
}

function change_theme(theme_id: string) {
  current_theme = theme_id;
  apply_theme(theme_id);
  post_message("persist_theme", { theme: theme_id });
}

async function switch_mode(new_mode: EditorModeType) {
  if (new_mode === current_mode && is_initialized) return;

  if (is_initialized) {
    current_markdown = modes[current_mode].get_markdown();
    modes[current_mode].deactivate();
  }

  current_mode = new_mode;
  toolbar.set_active(new_mode);
  post_message("persist_mode", { mode: new_mode });

  await modes[new_mode].activate(editor_container, current_markdown);
}

document.addEventListener("DOMContentLoaded", () => {
  init();
});
