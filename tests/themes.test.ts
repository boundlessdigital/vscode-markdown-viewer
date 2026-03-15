import { test, expect, describe, beforeEach } from "bun:test";
import { THEMES, apply_theme, type Theme } from "../src/webview/themes";

const REQUIRED_CSS_VARS = [
  "--bg",
  "--bg-secondary",
  "--bg-tertiary",
  "--text",
  "--text-secondary",
  "--text-muted",
  "--h1",
  "--h2",
  "--h3",
  "--h4",
  "--h5",
  "--h6",
  "--heading-rule",
  "--border",
  "--link",
  "--code-bg",
  "--code-block-bg",
  "--code-text",
  "--blockquote-border",
  "--blockquote-text",
  "--toolbar-bg",
  "--toolbar-active-bg",
  "--toolbar-text",
  "--toolbar-active-text",
  "--toolbar-shadow",
  "--scrollbar",
  "--scrollbar-hover",
  "--source-bg",
  "--source-text",
];

describe("THEMES", () => {
  test("contains expected theme IDs", () => {
    const theme_ids = THEMES.map((t) => t.id);
    expect(theme_ids).toContain("light");
    expect(theme_ids).toContain("dark");
    expect(theme_ids).toContain("sepia");
    expect(theme_ids).toContain("nord");
    expect(theme_ids).toContain("ocean");
  });

  test("all themes have required CSS variables", () => {
    for (const theme of THEMES) {
      for (const css_var of REQUIRED_CSS_VARS) {
        expect(theme.vars).toHaveProperty(css_var);
        expect(typeof theme.vars[css_var]).toBe("string");
        expect(theme.vars[css_var].length).toBeGreaterThan(0);
      }
    }
  });

  test("all themes have a label", () => {
    for (const theme of THEMES) {
      expect(typeof theme.label).toBe("string");
      expect(theme.label.length).toBeGreaterThan(0);
    }
  });

  test("all theme IDs are unique", () => {
    const theme_ids = THEMES.map((t) => t.id);
    const unique_ids = new Set(theme_ids);
    expect(unique_ids.size).toBe(theme_ids.length);
  });
});

describe("apply_theme", () => {
  beforeEach(() => {
    // Reset document element styles and dataset
    const root = document.documentElement;
    root.removeAttribute("style");
    delete root.dataset.theme;
  });

  test("sets CSS variables on documentElement", () => {
    apply_theme("light");

    const root = document.documentElement;
    const light_theme = THEMES.find((t) => t.id === "light")!;

    for (const [key, value] of Object.entries(light_theme.vars)) {
      expect(root.style.getPropertyValue(key)).toBe(value);
    }
  });

  test("sets data-theme attribute on documentElement", () => {
    apply_theme("dark");

    const root = document.documentElement;
    expect(root.dataset.theme).toBe("dark");
  });

  test("does nothing with an invalid theme ID", () => {
    const root = document.documentElement;
    const style_before = root.getAttribute("style");
    const dataset_theme_before = root.dataset.theme;

    apply_theme("nonexistent-theme");

    expect(root.getAttribute("style")).toBe(style_before);
    expect(root.dataset.theme).toBe(dataset_theme_before);
  });

  test("overrides previously applied theme", () => {
    apply_theme("light");
    apply_theme("dark");

    const root = document.documentElement;
    const dark_theme = THEMES.find((t) => t.id === "dark")!;

    expect(root.dataset.theme).toBe("dark");
    expect(root.style.getPropertyValue("--bg")).toBe(dark_theme.vars["--bg"]);
  });

  test("applies all theme variants correctly", () => {
    for (const theme of THEMES) {
      apply_theme(theme.id);

      const root = document.documentElement;
      expect(root.dataset.theme).toBe(theme.id);
      expect(root.style.getPropertyValue("--bg")).toBe(theme.vars["--bg"]);
    }
  });
});
