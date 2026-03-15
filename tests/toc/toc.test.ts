import { test, expect, describe, beforeEach, afterEach } from "bun:test";
import { TableOfContents } from "../../src/webview/toc/toc";

describe("TableOfContents", () => {
  let editor_container: HTMLElement;
  let content_container: HTMLElement;
  let toc: TableOfContents;

  beforeEach(() => {
    document.body.innerHTML = "";

    editor_container = document.createElement("div");
    editor_container.id = "editor";
    document.body.appendChild(editor_container);

    content_container = document.createElement("div");
    content_container.className = "markdown-body";
    editor_container.appendChild(content_container);

    toc = new TableOfContents(editor_container);
  });

  afterEach(() => {
    toc.destroy();
    document.body.innerHTML = "";
  });

  function build_headings(headings: { tag: string; text: string }[]): void {
    content_container.innerHTML = "";
    for (const { tag, text } of headings) {
      const el = document.createElement(tag);
      el.textContent = text;
      content_container.appendChild(el);
    }
  }

  test("is_visible returns false initially", () => {
    expect(toc.is_visible()).toBe(false);
  });

  test("toggle shows the sidebar", () => {
    build_headings([
      { tag: "h1", text: "Title" },
      { tag: "h2", text: "Section" },
    ]);
    toc.update(content_container);

    toc.toggle();

    expect(toc.is_visible()).toBe(true);
    expect(editor_container.classList.contains("has-toc")).toBe(true);
  });

  test("toggle hides the sidebar when called twice", () => {
    build_headings([
      { tag: "h1", text: "Title" },
      { tag: "h2", text: "Section" },
    ]);
    toc.update(content_container);

    toc.toggle(); // show
    expect(toc.is_visible()).toBe(true);

    toc.toggle(); // hide
    expect(toc.is_visible()).toBe(false);
    expect(editor_container.classList.contains("has-toc")).toBe(false);
  });

  test("update parses headings correctly", () => {
    build_headings([
      { tag: "h1", text: "Title" },
      { tag: "h2", text: "Introduction" },
      { tag: "h3", text: "Background" },
      { tag: "h2", text: "Main Content" },
    ]);

    toc.update(content_container);
    toc.toggle(); // make visible to inspect sidebar

    const sidebar = editor_container.querySelector(".toc-sidebar") as HTMLElement;
    expect(sidebar).toBeTruthy();

    const links = sidebar.querySelectorAll("a");
    expect(links.length).toBe(4);
    expect(links[0].textContent).toBe("Title");
    expect(links[1].textContent).toBe("Introduction");
    expect(links[2].textContent).toBe("Background");
    expect(links[3].textContent).toBe("Main Content");
  });

  test("update assigns toc-level classes to list items", () => {
    build_headings([
      { tag: "h1", text: "Title" },
      { tag: "h2", text: "Section" },
      { tag: "h3", text: "Sub Section" },
    ]);

    toc.update(content_container);
    toc.toggle();

    const sidebar = editor_container.querySelector(".toc-sidebar") as HTMLElement;
    const items = sidebar.querySelectorAll("li");

    expect(items[0].className).toBe("toc-level-1");
    expect(items[1].className).toBe("toc-level-2");
    expect(items[2].className).toBe("toc-level-3");
  });

  test("heading IDs are generated when missing", () => {
    build_headings([
      { tag: "h1", text: "My Title" },
      { tag: "h2", text: "Section One" },
      { tag: "h3", text: "Sub Section!" },
    ]);

    toc.update(content_container);

    const h1 = content_container.querySelector("h1") as HTMLElement;
    const h2 = content_container.querySelector("h2") as HTMLElement;
    const h3 = content_container.querySelector("h3") as HTMLElement;

    expect(h1.id).toBe("toc-my-title");
    expect(h2.id).toBe("toc-section-one");
    expect(h3.id).toBe("toc-sub-section");
  });

  test("existing heading IDs are preserved", () => {
    const h2 = document.createElement("h2");
    h2.textContent = "Section";
    h2.id = "custom-id";
    content_container.innerHTML = "";
    content_container.appendChild(h2);

    toc.update(content_container);

    expect(h2.id).toBe("custom-id");
  });

  test("empty headings are excluded from TOC", () => {
    const h2 = document.createElement("h2");
    h2.textContent = "";
    content_container.innerHTML = "";
    content_container.appendChild(h2);

    const h3 = document.createElement("h3");
    h3.textContent = "Valid Section";
    content_container.appendChild(h3);

    toc.update(content_container);
    toc.toggle();

    const sidebar = editor_container.querySelector(".toc-sidebar") as HTMLElement;
    const links = sidebar.querySelectorAll("a");
    expect(links.length).toBe(1);
    expect(links[0].textContent).toBe("Valid Section");
  });

  test("is_visible returns correct state after toggle", () => {
    expect(toc.is_visible()).toBe(false);

    toc.toggle();
    expect(toc.is_visible()).toBe(true);

    toc.toggle();
    expect(toc.is_visible()).toBe(false);
  });

  test("show creates content wrapper and moves children", () => {
    build_headings([
      { tag: "h2", text: "Section" },
    ]);
    toc.update(content_container);

    toc.toggle(); // show

    const content_wrapper = editor_container.querySelector(".editor-content");
    expect(content_wrapper).toBeTruthy();

    const sidebar = editor_container.querySelector(".toc-sidebar");
    expect(sidebar).toBeTruthy();
  });

  test("hide restores children and removes wrapper", () => {
    build_headings([
      { tag: "h2", text: "Section" },
    ]);
    toc.update(content_container);

    toc.toggle(); // show
    toc.toggle(); // hide

    const content_wrapper = editor_container.querySelector(".editor-content");
    expect(content_wrapper).toBeNull();

    const sidebar = editor_container.querySelector(".toc-sidebar");
    expect(sidebar).toBeNull();
  });

  test("destroy cleans up observer and hides sidebar", () => {
    build_headings([
      { tag: "h1", text: "Title" },
      { tag: "h2", text: "Section" },
    ]);
    toc.update(content_container);
    toc.toggle(); // show

    expect(toc.is_visible()).toBe(true);

    toc.destroy();

    expect(toc.is_visible()).toBe(false);
    // sidebar should be removed from DOM
    const sidebar = document.querySelector(".toc-sidebar");
    expect(sidebar).toBeNull();
  });

  test("destroy works when sidebar was never shown", () => {
    // Should not throw
    toc.destroy();
    expect(toc.is_visible()).toBe(false);
  });

  test("update can be called multiple times", () => {
    build_headings([
      { tag: "h2", text: "First" },
    ]);
    toc.update(content_container);

    build_headings([
      { tag: "h2", text: "Updated" },
      { tag: "h3", text: "New Sub" },
    ]);
    toc.update(content_container);
    toc.toggle();

    const sidebar = editor_container.querySelector(".toc-sidebar") as HTMLElement;
    const links = sidebar.querySelectorAll("a");
    expect(links.length).toBe(2);
    expect(links[0].textContent).toBe("Updated");
    expect(links[1].textContent).toBe("New Sub");
  });

  test("TOC sidebar has nav element with correct class", () => {
    toc.toggle();

    const sidebar = editor_container.querySelector("nav.toc-sidebar");
    expect(sidebar).toBeTruthy();
  });

  test("TOC link titles match heading text", () => {
    build_headings([
      { tag: "h2", text: "My Section" },
    ]);
    toc.update(content_container);
    toc.toggle();

    const sidebar = editor_container.querySelector(".toc-sidebar") as HTMLElement;
    const link = sidebar.querySelector("a") as HTMLAnchorElement;
    expect(link.title).toBe("My Section");
    expect(link.textContent).toBe("My Section");
  });
});
