import { test, expect, describe, beforeEach, afterEach } from "bun:test";
import { SplitView } from "../../src/webview/reading/split_view";

describe("SplitView", () => {
  let editor_container: HTMLElement;
  let split_view: SplitView;

  beforeEach(() => {
    document.body.innerHTML = "";
    editor_container = document.createElement("div");
    editor_container.className = "editor-container";
    document.body.appendChild(editor_container);

    // Add some content including a .markdown-body element
    const markdown_body = document.createElement("div");
    markdown_body.className = "markdown-body";
    markdown_body.innerHTML = "<h1>Test</h1><p>Content here.</p>";
    editor_container.appendChild(markdown_body);

    split_view = new SplitView(editor_container);
  });

  afterEach(() => {
    split_view.destroy();
    document.body.innerHTML = "";
  });

  describe("initial state", () => {
    test("is not active by default", () => {
      expect(split_view.is_active()).toBe(false);
    });
  });

  describe("toggle - activate", () => {
    test("creates a split layout on first toggle", () => {
      split_view.toggle();

      expect(split_view.is_active()).toBe(true);
    });

    test("sets the editor container to display flex", () => {
      split_view.toggle();

      expect(editor_container.style.display).toBe("flex");
    });

    test("sets editor container overflowY to hidden", () => {
      split_view.toggle();

      expect(editor_container.style.overflowY).toBe("hidden");
    });

    test("creates left pane with split-pane-left class", () => {
      split_view.toggle();

      const left_pane = editor_container.querySelector(".split-pane-left");
      expect(left_pane).toBeTruthy();
    });

    test("creates right pane with split-pane-right class", () => {
      split_view.toggle();

      const right_pane = editor_container.querySelector(".split-pane-right");
      expect(right_pane).toBeTruthy();
    });

    test("creates a divider between panes", () => {
      split_view.toggle();

      const divider = editor_container.querySelector(".split-divider");
      expect(divider).toBeTruthy();
    });

    test("moves original content into the left pane", () => {
      split_view.toggle();

      const left_pane = editor_container.querySelector(".split-pane-left");
      expect(left_pane).toBeTruthy();

      const markdown_in_left = left_pane!.querySelector(".markdown-body");
      expect(markdown_in_left).toBeTruthy();
      expect(markdown_in_left!.querySelector("h1")!.textContent).toBe("Test");
    });

    test("clones markdown content into the right pane", () => {
      split_view.toggle();

      const right_pane = editor_container.querySelector(".split-pane-right");
      expect(right_pane).toBeTruthy();

      const markdown_in_right = right_pane!.querySelector(".markdown-body");
      expect(markdown_in_right).toBeTruthy();
      expect(markdown_in_right!.querySelector("h1")!.textContent).toBe("Test");
    });

    test("left and right panes have flex: 1", () => {
      split_view.toggle();

      const left_pane = editor_container.querySelector(".split-pane-left") as HTMLElement;
      const right_pane = editor_container.querySelector(".split-pane-right") as HTMLElement;

      // happy-dom expands shorthand "1" to "1 1 0%"
      expect(left_pane.style.flex).toContain("1");
      expect(right_pane.style.flex).toContain("1");
    });

    test("both panes have overflowY auto", () => {
      split_view.toggle();

      const left_pane = editor_container.querySelector(".split-pane-left") as HTMLElement;
      const right_pane = editor_container.querySelector(".split-pane-right") as HTMLElement;

      expect(left_pane.style.overflowY).toBe("auto");
      expect(right_pane.style.overflowY).toBe("auto");
    });

    test("divider has correct styles", () => {
      split_view.toggle();

      const divider = editor_container.querySelector(".split-divider") as HTMLElement;
      expect(divider.style.width).toBe("1px");
      expect(divider.style.flexShrink).toBe("0");
    });

    test("creates three children: left pane, divider, right pane", () => {
      split_view.toggle();

      expect(editor_container.children.length).toBe(3);
      expect((editor_container.children[0] as HTMLElement).className).toBe("split-pane-left");
      expect((editor_container.children[1] as HTMLElement).className).toBe("split-divider");
      expect((editor_container.children[2] as HTMLElement).className).toBe("split-pane-right");
    });
  });

  describe("toggle - deactivate", () => {
    test("removes split layout on second toggle", () => {
      split_view.toggle(); // activate
      expect(split_view.is_active()).toBe(true);

      split_view.toggle(); // deactivate
      expect(split_view.is_active()).toBe(false);
    });

    test("removes split panes and divider", () => {
      split_view.toggle(); // activate
      split_view.toggle(); // deactivate

      expect(editor_container.querySelector(".split-pane-left")).toBeNull();
      expect(editor_container.querySelector(".split-pane-right")).toBeNull();
      expect(editor_container.querySelector(".split-divider")).toBeNull();
    });

    test("restores original content back to the editor container", () => {
      split_view.toggle(); // activate
      split_view.toggle(); // deactivate

      const markdown_body = editor_container.querySelector(".markdown-body");
      expect(markdown_body).toBeTruthy();
      expect(markdown_body!.querySelector("h1")!.textContent).toBe("Test");
    });

    test("restores original container styles", () => {
      editor_container.style.display = "block";
      editor_container.style.overflowY = "auto";

      // Re-create split_view with the styled container
      split_view = new SplitView(editor_container);

      split_view.toggle(); // activate
      expect(editor_container.style.display).toBe("flex");

      split_view.toggle(); // deactivate
      expect(editor_container.style.display).toBe("block");
      expect(editor_container.style.overflowY).toBe("auto");
    });
  });

  describe("is_active", () => {
    test("returns false initially", () => {
      expect(split_view.is_active()).toBe(false);
    });

    test("returns true after activating", () => {
      split_view.toggle();
      expect(split_view.is_active()).toBe(true);
    });

    test("returns false after activating then deactivating", () => {
      split_view.toggle();
      split_view.toggle();
      expect(split_view.is_active()).toBe(false);
    });

    test("toggles correctly through multiple cycles", () => {
      for (let i = 0; i < 3; i++) {
        split_view.toggle();
        expect(split_view.is_active()).toBe(true);
        split_view.toggle();
        expect(split_view.is_active()).toBe(false);
      }
    });
  });

  describe("destroy", () => {
    test("deactivates if active", () => {
      split_view.toggle(); // activate
      expect(split_view.is_active()).toBe(true);

      split_view.destroy();
      expect(split_view.is_active()).toBe(false);
    });

    test("removes split panes and divider on destroy", () => {
      split_view.toggle(); // activate

      split_view.destroy();

      expect(editor_container.querySelector(".split-pane-left")).toBeNull();
      expect(editor_container.querySelector(".split-pane-right")).toBeNull();
      expect(editor_container.querySelector(".split-divider")).toBeNull();
    });

    test("restores content back to editor container on destroy", () => {
      split_view.toggle(); // activate
      split_view.destroy();

      const markdown_body = editor_container.querySelector(".markdown-body");
      expect(markdown_body).toBeTruthy();
    });

    test("does nothing if not active", () => {
      expect(split_view.is_active()).toBe(false);
      expect(() => split_view.destroy()).not.toThrow();
      expect(split_view.is_active()).toBe(false);
    });

    test("can be called multiple times safely", () => {
      split_view.toggle();
      split_view.destroy();
      expect(() => split_view.destroy()).not.toThrow();
    });
  });

  describe("edge cases", () => {
    test("handles container with no .markdown-body element", () => {
      document.body.innerHTML = "";
      const empty_container = document.createElement("div");
      document.body.appendChild(empty_container);

      const sv = new SplitView(empty_container);
      expect(() => sv.toggle()).not.toThrow();
      expect(sv.is_active()).toBe(true);

      // Right pane should exist but have no markdown-body content
      const right_pane = empty_container.querySelector(".split-pane-right");
      expect(right_pane).toBeTruthy();
      expect(right_pane!.querySelector(".markdown-body")).toBeNull();

      sv.destroy();
    });

    test("activating twice does not double the split layout", () => {
      split_view.toggle(); // activate
      // Calling toggle again should deactivate, not add another split
      split_view.toggle(); // deactivate

      expect(editor_container.querySelector(".split-pane-left")).toBeNull();
      expect(split_view.is_active()).toBe(false);
    });
  });
});
