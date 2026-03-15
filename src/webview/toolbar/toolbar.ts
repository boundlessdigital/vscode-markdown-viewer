import type { EditorModeType } from "../types";
import { THEMES } from "../themes";

export interface SettingsState {
  source_sync: boolean;
  spell_check: boolean;
  custom_css: string;
}

interface ToolbarConfig {
  on_mode_change: (mode: EditorModeType) => void;
  on_theme_change: (theme_id: string) => void;
  on_export_html: () => void;
  on_export_pdf: () => void;
  on_settings_change: (settings: SettingsState) => void;
  on_font_size_change: (delta: number) => void;
  on_toggle_toc: () => void;
  on_toggle_diff: () => void;
  initial_theme?: string;
  initial_settings?: SettingsState;
  file_path?: string;
}

const MODE_BUTTONS: { mode: EditorModeType; label: string }[] = [
  { mode: "preview", label: "Preview" },
  { mode: "rich_edit", label: "Rich Edit" },
];

export class Toolbar {
  private container: HTMLElement;
  private buttons: Map<EditorModeType, HTMLButtonElement> = new Map();
  private theme_select: HTMLSelectElement;
  private current_mode: EditorModeType = "preview";
  private path_bar: HTMLElement | null = null;
  private parent_element: HTMLElement;
  private settings_panel: HTMLElement | null = null;
  private settings: SettingsState;
  private config: ToolbarConfig;

  constructor(parent: HTMLElement, config: ToolbarConfig) {
    this.parent_element = parent;
    this.config = config;
    this.settings = config.initial_settings || { source_sync: false, spell_check: false, custom_css: "" };

    this.container = document.createElement("div");
    this.container.className = "toolbar";

    // Mode buttons
    const mode_group = document.createElement("div");
    mode_group.className = "toolbar-group";

    for (const { mode, label } of MODE_BUTTONS) {
      const button = document.createElement("button");
      button.className = "toolbar-button";
      button.dataset.mode = mode;
      button.textContent = label;
      button.addEventListener("click", () => config.on_mode_change(mode));
      mode_group.appendChild(button);
      this.buttons.set(mode, button);
    }
    this.container.appendChild(mode_group);

    // Divider
    this.add_divider();

    // TOC toggle
    const toc_btn = this.create_subtle_button("TOC", "Toggle table of contents");
    toc_btn.addEventListener("click", config.on_toggle_toc);
    this.container.appendChild(toc_btn);

    // Diff toggle
    const diff_btn = this.create_subtle_button("Diff", "Show changes since last git commit");
    diff_btn.addEventListener("click", config.on_toggle_diff);
    this.container.appendChild(diff_btn);

    // Divider
    this.add_divider();

    // Font size controls
    const font_group = document.createElement("div");
    font_group.className = "toolbar-group";

    const font_minus = this.create_subtle_button("A\u2212", "Decrease font size");
    font_minus.style.fontSize = "11px";
    font_minus.addEventListener("click", () => config.on_font_size_change(-1));
    font_group.appendChild(font_minus);

    const font_plus = this.create_subtle_button("A+", "Increase font size");
    font_plus.style.fontSize = "13px";
    font_plus.addEventListener("click", () => config.on_font_size_change(1));
    font_group.appendChild(font_plus);

    this.container.appendChild(font_group);

    // Spacer
    const spacer = document.createElement("div");
    spacer.className = "toolbar-spacer";
    this.container.appendChild(spacer);

    // Export buttons
    const export_group = document.createElement("div");
    export_group.className = "toolbar-group";

    const html_btn = this.create_subtle_button("Export HTML");
    html_btn.addEventListener("click", config.on_export_html);
    export_group.appendChild(html_btn);

    const pdf_btn = this.create_subtle_button("Print / PDF");
    pdf_btn.addEventListener("click", config.on_export_pdf);
    export_group.appendChild(pdf_btn);

    this.container.appendChild(export_group);

    // Divider
    this.add_divider();

    // Theme selector
    const theme_wrapper = document.createElement("div");
    theme_wrapper.className = "toolbar-group theme-group";

    const theme_label = document.createElement("span");
    theme_label.className = "theme-label";
    theme_label.textContent = "Theme";
    theme_wrapper.appendChild(theme_label);

    this.theme_select = document.createElement("select");
    this.theme_select.className = "theme-select";
    for (const theme of THEMES) {
      const option = document.createElement("option");
      option.value = theme.id;
      option.textContent = theme.label;
      this.theme_select.appendChild(option);
    }
    if (config.initial_theme) {
      this.theme_select.value = config.initial_theme;
    }
    this.theme_select.addEventListener("change", () => {
      config.on_theme_change(this.theme_select.value);
    });
    theme_wrapper.appendChild(this.theme_select);
    this.container.appendChild(theme_wrapper);

    // Divider
    this.add_divider();

    // Settings gear
    const gear_btn = document.createElement("button");
    gear_btn.className = "toolbar-button toolbar-gear";
    gear_btn.title = "Settings";
    gear_btn.innerHTML = `<svg width="15" height="15" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.2"><circle cx="8" cy="8" r="2.5"/><path d="M8 1.5v2M8 12.5v2M1.5 8h2M12.5 8h2M3.05 3.05l1.4 1.4M11.55 11.55l1.4 1.4M3.05 12.95l1.4-1.4M11.55 4.45l1.4-1.4"/></svg>`;
    gear_btn.addEventListener("click", (e) => {
      e.stopPropagation();
      this.toggle_settings_panel();
    });
    this.container.appendChild(gear_btn);

    parent.prepend(this.container);

    document.addEventListener("click", () => {
      if (this.settings_panel) {
        this.settings_panel.remove();
        this.settings_panel = null;
      }
    });

    if (config.file_path) {
      this.create_path_bar(parent, config.file_path);
    }

    this.set_active("preview");
  }

  private create_subtle_button(text: string, title?: string): HTMLButtonElement {
    const btn = document.createElement("button");
    btn.className = "toolbar-button toolbar-button-subtle";
    btn.textContent = text;
    if (title) btn.title = title;
    return btn;
  }

  private add_divider(): void {
    const d = document.createElement("div");
    d.className = "toolbar-divider";
    this.container.appendChild(d);
  }

  private toggle_settings_panel(): void {
    if (this.settings_panel) {
      this.settings_panel.remove();
      this.settings_panel = null;
      return;
    }

    this.settings_panel = document.createElement("div");
    this.settings_panel.className = "settings-panel";
    this.settings_panel.addEventListener("click", (e) => e.stopPropagation());

    this.add_settings_toggle("Claude Code integration", "Opens source editor alongside for selection sync", this.settings.source_sync, (v) => {
      this.settings.source_sync = v;
      this.config.on_settings_change({ ...this.settings });
    });

    this.add_settings_toggle("Spell check", "Enable browser spell check in editors", this.settings.spell_check, (v) => {
      this.settings.spell_check = v;
      this.config.on_settings_change({ ...this.settings });
    });

    // Custom CSS input
    const css_row = document.createElement("div");
    css_row.className = "settings-row settings-row-vertical";

    const css_label = document.createElement("span");
    css_label.className = "settings-label-text";
    css_label.textContent = "Custom CSS path";
    css_row.appendChild(css_label);

    const css_desc = document.createElement("span");
    css_desc.className = "settings-label-desc";
    css_desc.textContent = "Absolute path to a .css file to apply on top of the theme";
    css_row.appendChild(css_desc);

    const css_input = document.createElement("input");
    css_input.type = "text";
    css_input.className = "settings-input";
    css_input.placeholder = "/path/to/custom.css";
    css_input.value = this.settings.custom_css || "";
    css_input.addEventListener("change", () => {
      this.settings.custom_css = css_input.value;
      this.config.on_settings_change({ ...this.settings });
    });
    css_row.appendChild(css_input);

    this.settings_panel.appendChild(css_row);
    this.container.appendChild(this.settings_panel);
  }

  private add_settings_toggle(label: string, desc: string, checked: boolean, on_change: (v: boolean) => void): void {
    if (!this.settings_panel) return;

    const row = document.createElement("label");
    row.className = "settings-row";

    const checkbox = document.createElement("input");
    checkbox.type = "checkbox";
    checkbox.className = "settings-checkbox";
    checkbox.checked = checked;
    checkbox.addEventListener("change", () => on_change(checkbox.checked));
    row.appendChild(checkbox);

    const wrap = document.createElement("div");
    wrap.className = "settings-label-wrap";

    const text = document.createElement("span");
    text.className = "settings-label-text";
    text.textContent = label;
    wrap.appendChild(text);

    const description = document.createElement("span");
    description.className = "settings-label-desc";
    description.textContent = desc;
    wrap.appendChild(description);

    row.appendChild(wrap);
    this.settings_panel.appendChild(row);
  }

  private create_path_bar(parent: HTMLElement, file_path: string): void {
    this.path_bar = document.createElement("div");
    this.path_bar.className = "path-bar";

    const path_text = document.createElement("span");
    path_text.className = "path-text";
    path_text.textContent = file_path;
    path_text.title = file_path;
    this.path_bar.appendChild(path_text);

    const copy_btn = document.createElement("button");
    copy_btn.className = "path-copy-btn";
    copy_btn.title = "Copy path to clipboard";
    copy_btn.innerHTML = `<svg width="14" height="14" viewBox="0 0 16 16" fill="none"><path d="M5 2H13V12H5V2Z" stroke="currentColor" stroke-width="1.2"/><path d="M3 4V14H11" stroke="currentColor" stroke-width="1.2"/></svg>`;
    copy_btn.addEventListener("click", () => {
      navigator.clipboard.writeText(file_path).then(() => {
        copy_btn.classList.add("copied");
        copy_btn.innerHTML = `<svg width="14" height="14" viewBox="0 0 16 16" fill="none"><path d="M3 8.5L6.5 12L13 4" stroke="currentColor" stroke-width="1.5"/></svg>`;
        setTimeout(() => {
          copy_btn.classList.remove("copied");
          copy_btn.innerHTML = `<svg width="14" height="14" viewBox="0 0 16 16" fill="none"><path d="M5 2H13V12H5V2Z" stroke="currentColor" stroke-width="1.2"/><path d="M3 4V14H11" stroke="currentColor" stroke-width="1.2"/></svg>`;
        }, 1500);
      });
    });
    this.path_bar.appendChild(copy_btn);
    parent.appendChild(this.path_bar);
  }

  set_file_path(file_path: string): void {
    if (!this.path_bar) {
      this.create_path_bar(this.parent_element, file_path);
    } else {
      const text = this.path_bar.querySelector(".path-text");
      if (text) {
        text.textContent = file_path;
        (text as HTMLElement).title = file_path;
      }
    }
  }

  set_active(mode: EditorModeType): void {
    this.current_mode = mode;
    for (const [btn_mode, button] of this.buttons) {
      button.classList.toggle("active", btn_mode === mode);
    }
  }

  set_theme(theme_id: string): void {
    this.theme_select.value = theme_id;
  }

  get_settings(): SettingsState {
    return this.settings;
  }

  get_current_mode(): EditorModeType {
    return this.current_mode;
  }
}
