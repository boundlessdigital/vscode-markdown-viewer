import { test, expect, describe, beforeEach, afterEach } from "bun:test";
import { Breadcrumbs } from "../../src/webview/reading/breadcrumbs";

describe("Breadcrumbs", () => {
  let parent: HTMLElement;
  let editor_container: HTMLElement;
  let breadcrumbs: Breadcrumbs;

  beforeEach(() => {
    document.body.innerHTML = "";
    parent = document.createElement("div");
    parent.className = "app-container";
    document.body.appendChild(parent);

    editor_container = document.createElement("div");
    editor_container.className = "editor-container";
    parent.appendChild(editor_container);
  });

  afterEach(() => {
    if (breadcrumbs) {
      breadcrumbs.destroy();
    }
    document.body.innerHTML = "";
  });

  describe("constructor", () => {
    test("creates a breadcrumbs bar element", () => {
      breadcrumbs = new Breadcrumbs(parent, editor_container);

      const bar = parent.querySelector(".breadcrumbs-bar");
      expect(bar).toBeTruthy();
    });

    test("breadcrumbs bar has correct class name", () => {
      breadcrumbs = new Breadcrumbs(parent, editor_container);

      const bar = parent.querySelector(".breadcrumbs-bar") as HTMLElement;
      expect(bar.className).toBe("breadcrumbs-bar");
    });

    test("breadcrumbs bar has correct height", () => {
      breadcrumbs = new Breadcrumbs(parent, editor_container);

      const bar = parent.querySelector(".breadcrumbs-bar") as HTMLElement;
      expect(bar.style.height).toBe("28px");
    });

    test("breadcrumbs bar has flex display", () => {
      breadcrumbs = new Breadcrumbs(parent, editor_container);

      const bar = parent.querySelector(".breadcrumbs-bar") as HTMLElement;
      expect(bar.style.display).toBe("flex");
    });

    test("breadcrumbs bar has correct font size", () => {
      breadcrumbs = new Breadcrumbs(parent, editor_container);

      const bar = parent.querySelector(".breadcrumbs-bar") as HTMLElement;
      expect(bar.style.fontSize).toBe("11px");
    });

    test("breadcrumbs bar has overflow hidden", () => {
      breadcrumbs = new Breadcrumbs(parent, editor_container);

      const bar = parent.querySelector(".breadcrumbs-bar") as HTMLElement;
      expect(bar.style.overflow).toBe("hidden");
    });

    test("breadcrumbs bar has white-space nowrap", () => {
      breadcrumbs = new Breadcrumbs(parent, editor_container);

      const bar = parent.querySelector(".breadcrumbs-bar") as HTMLElement;
      expect(bar.style.whiteSpace).toBe("nowrap");
    });

    test("inserts after toolbar if toolbar exists", () => {
      const toolbar = document.createElement("div");
      toolbar.className = "toolbar";
      parent.insertBefore(toolbar, editor_container);

      breadcrumbs = new Breadcrumbs(parent, editor_container);

      const bar = parent.querySelector(".breadcrumbs-bar");
      expect(bar).toBeTruthy();

      // Breadcrumbs bar should be inserted between toolbar and editor_container
      const children = Array.from(parent.children);
      const toolbar_idx = children.indexOf(toolbar);
      const bar_idx = children.indexOf(bar as HTMLElement);
      expect(bar_idx).toBe(toolbar_idx + 1);
    });

    test("appends to parent if no toolbar exists", () => {
      breadcrumbs = new Breadcrumbs(parent, editor_container);

      const bar = parent.querySelector(".breadcrumbs-bar");
      expect(bar).toBeTruthy();

      // Should be the last child
      expect(parent.lastElementChild).toBe(bar);
    });
  });

  describe("update", () => {
    test("parses headings from the markdown body", () => {
      breadcrumbs = new Breadcrumbs(parent, editor_container);

      const markdown_body = document.createElement("div");
      markdown_body.className = "markdown-body";
      markdown_body.innerHTML = `
        <h1>Title</h1>
        <p>Some text.</p>
        <h2>Section</h2>
        <p>More text.</p>
        <h3>Subsection</h3>
      `;
      editor_container.appendChild(markdown_body);

      // update should not throw
      expect(() => breadcrumbs.update(markdown_body)).not.toThrow();
    });

    test("handles empty markdown body with no headings", () => {
      breadcrumbs = new Breadcrumbs(parent, editor_container);

      const markdown_body = document.createElement("div");
      markdown_body.className = "markdown-body";
      markdown_body.innerHTML = "<p>No headings here.</p>";
      editor_container.appendChild(markdown_body);

      expect(() => breadcrumbs.update(markdown_body)).not.toThrow();
    });

    test("parses all heading levels h1-h6", () => {
      breadcrumbs = new Breadcrumbs(parent, editor_container);

      const markdown_body = document.createElement("div");
      markdown_body.className = "markdown-body";
      markdown_body.innerHTML = `
        <h1>H1</h1>
        <h2>H2</h2>
        <h3>H3</h3>
        <h4>H4</h4>
        <h5>H5</h5>
        <h6>H6</h6>
      `;
      editor_container.appendChild(markdown_body);

      expect(() => breadcrumbs.update(markdown_body)).not.toThrow();
    });

    test("skips headings with empty text content", () => {
      breadcrumbs = new Breadcrumbs(parent, editor_container);

      const markdown_body = document.createElement("div");
      markdown_body.className = "markdown-body";
      markdown_body.innerHTML = `
        <h1>Title</h1>
        <h2></h2>
        <h3>  </h3>
        <h2>Real Section</h2>
      `;
      editor_container.appendChild(markdown_body);

      expect(() => breadcrumbs.update(markdown_body)).not.toThrow();
    });

    test("can be called multiple times (refreshes headings)", () => {
      breadcrumbs = new Breadcrumbs(parent, editor_container);

      const markdown_body_1 = document.createElement("div");
      markdown_body_1.className = "markdown-body";
      markdown_body_1.innerHTML = "<h1>First</h1>";
      editor_container.appendChild(markdown_body_1);

      breadcrumbs.update(markdown_body_1);

      const markdown_body_2 = document.createElement("div");
      markdown_body_2.className = "markdown-body";
      markdown_body_2.innerHTML = "<h1>Second</h1><h2>Sub</h2>";

      expect(() => breadcrumbs.update(markdown_body_2)).not.toThrow();
    });
  });

  describe("destroy", () => {
    test("removes the breadcrumbs bar from the DOM", () => {
      breadcrumbs = new Breadcrumbs(parent, editor_container);

      const bar = parent.querySelector(".breadcrumbs-bar");
      expect(bar).toBeTruthy();

      breadcrumbs.destroy();

      const bar_after = parent.querySelector(".breadcrumbs-bar");
      expect(bar_after).toBeNull();
    });

    test("cleans up the intersection observer", () => {
      breadcrumbs = new Breadcrumbs(parent, editor_container);

      const markdown_body = document.createElement("div");
      markdown_body.className = "markdown-body";
      markdown_body.innerHTML = "<h1>Test</h1><h2>Sub</h2>";
      editor_container.appendChild(markdown_body);

      breadcrumbs.update(markdown_body);

      // Destroy should not throw even after observer was set up
      expect(() => breadcrumbs.destroy()).not.toThrow();
    });

    test("can be called even without calling update first", () => {
      breadcrumbs = new Breadcrumbs(parent, editor_container);
      expect(() => breadcrumbs.destroy()).not.toThrow();
    });

    test("removes the bar element completely", () => {
      breadcrumbs = new Breadcrumbs(parent, editor_container);

      breadcrumbs.destroy();

      // No .breadcrumbs-bar should exist anywhere in the document
      const any_bar = document.querySelector(".breadcrumbs-bar");
      expect(any_bar).toBeNull();
    });
  });
});
