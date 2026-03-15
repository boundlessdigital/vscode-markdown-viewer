import type { EditorMode, EditorModeType } from "./types";
import { PreviewMode } from "./modes/preview_mode";
import { RichEditMode } from "./modes/rich_edit_mode";
import { SourceEditMode } from "./modes/source_edit_mode";
import { Toolbar, type SettingsState } from "./toolbar/toolbar";
import { TableOfContents } from "./toc/toc";
import { SearchOverlay } from "./search/search";
import { ImageHandler } from "./images/image_handler";
import { CommentsManager } from "./comments/comments";
import { LinkPreview } from "./link-preview/link_preview";
import { apply_theme } from "./themes";
import { export_html, export_pdf } from "./export";
import { post_message } from "./util/vscode_api";
import { debounce } from "./util/debounce";
import "./styles/main.css";
import "./styles/toc.css";
import "./styles/search.css";
import "./styles/images.css";
import "./styles/diff.css";
import "./styles/comments.css";
import "./styles/link-preview.css";

const modes: Record<EditorModeType, EditorMode> = {
  preview: new PreviewMode(),
  rich_edit: new RichEditMode(),
  source_edit: new SourceEditMode(),
};

let current_mode: EditorModeType = "preview";
let current_theme = "light";
let current_markdown = "";
let current_font_size = 15.5;
let editor_container: HTMLElement;
let toolbar: Toolbar;
let toc: TableOfContents | null = null;
let search: SearchOverlay | null = null;
let image_handler: ImageHandler | null = null;
let comments_manager: CommentsManager | null = null;
let link_preview: LinkPreview | null = null;
let is_initialized = false;
let source_sync_enabled = false;
let diff_enabled = false;
let diff_base = "";
let custom_css_el: HTMLStyleElement | null = null;

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

  // Spell check
  const container = document.getElementById("editor-container");
  if (container) {
    container.setAttribute("spellcheck", settings.spell_check ? "true" : "false");
  }

  // Custom CSS
  if (settings.custom_css) {
    post_message("load_custom_css", { path: settings.custom_css });
  } else if (custom_css_el) {
    custom_css_el.textContent = "";
  }
}

function change_font_size(delta: number) {
  current_font_size = Math.max(10, Math.min(24, current_font_size + delta));
  document.documentElement.style.setProperty("--user-font-size", `${current_font_size}px`);
}

function toggle_toc() {
  if (!toc) {
    toc = new TableOfContents(editor_container);
  }
  toc.toggle();
  // Update TOC with current headings
  const body = editor_container.querySelector(".markdown-body");
  if (body && toc.is_visible()) {
    toc.update(body as HTMLElement);
  }
}

function toggle_diff() {
  diff_enabled = !diff_enabled;
  if (diff_enabled) {
    post_message("get_git_diff");
  } else {
    diff_base = "";
    // Re-render without diff
    if (is_initialized) {
      modes[current_mode].update_content(current_markdown);
      update_toc();
    }
  }
}

function update_toc() {
  if (toc && toc.is_visible()) {
    const body = editor_container.querySelector(".markdown-body");
    if (body) {
      toc.update(body as HTMLElement);
    }
  }
}

function update_comments() {
  if (comments_manager && current_mode === "preview") {
    const body = editor_container.querySelector(".markdown-body");
    if (body) {
      comments_manager.attach_to_headings(body as HTMLElement);
    }
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
    on_font_size_change: change_font_size,
    on_toggle_toc: toggle_toc,
    on_toggle_diff: toggle_diff,
    initial_theme: current_theme,
  });

  search = new SearchOverlay(editor_container);
  image_handler = new ImageHandler(editor_container);
  comments_manager = new CommentsManager(editor_container);
  link_preview = new LinkPreview(editor_container);

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
        if (message.comments) {
          comments_manager?.load_comments(message.comments);
        }
        is_initialized = true;
        modes[current_mode].activate(editor_container, current_markdown).then(() => {
          update_toc();
          update_comments();
        });
        break;

      case "update":
        if (is_initialized) {
          current_markdown = message.text;
          modes[current_mode].update_content(current_markdown);
          setTimeout(() => {
            update_toc();
            update_comments();
          }, 50);
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

      case "git_diff_result":
        diff_base = message.text || "";
        if (diff_enabled && is_initialized) {
          // Re-render with diff - DiffView will be used in preview_mode
          modes[current_mode].update_content(current_markdown);
          update_toc();
        }
        break;

      case "image_saved":
        if (message.path) {
          post_message("insert_text", { text: `![](${message.path})` });
        }
        break;

      case "custom_css_loaded":
        if (!custom_css_el) {
          custom_css_el = document.createElement("style");
          document.head.appendChild(custom_css_el);
        }
        custom_css_el.textContent = message.css || "";
        break;
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
  update_toc();
  update_comments();
}

document.addEventListener("DOMContentLoaded", () => {
  init();
});
