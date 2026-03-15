// NOTE: Run with --preload ./tests/preload_vscode.ts to provide the acquireVsCodeApi global

import { test, expect, describe, beforeEach, afterEach } from "bun:test";
import { BookmarkManager } from "../../src/webview/reading/bookmarks";

describe("BookmarkManager", () => {
  let editor_container: HTMLElement;
  let manager: BookmarkManager;

  beforeEach(() => {
    document.body.innerHTML = "";
    editor_container = document.createElement("div");
    editor_container.style.height = "500px";
    editor_container.style.overflow = "auto";

    // Add some headings for nearest-heading detection
    const h1 = document.createElement("h1");
    h1.textContent = "Title";
    editor_container.appendChild(h1);

    const p1 = document.createElement("p");
    p1.textContent = "Some content";
    editor_container.appendChild(p1);

    const h2 = document.createElement("h2");
    h2.textContent = "Section One";
    Object.defineProperty(h2, "offsetTop", { value: 200, writable: true });
    editor_container.appendChild(h2);

    const p2 = document.createElement("p");
    p2.textContent = "More content";
    editor_container.appendChild(p2);

    const h3 = document.createElement("h3");
    h3.textContent = "Sub Section";
    Object.defineProperty(h3, "offsetTop", { value: 500, writable: true });
    editor_container.appendChild(h3);

    document.body.appendChild(editor_container);

    manager = new BookmarkManager(editor_container);
  });

  afterEach(() => {
    manager.destroy();
    document.body.innerHTML = "";
  });

  test("add_bookmark captures scroll position", () => {
    Object.defineProperty(editor_container, "scrollTop", { value: 250, writable: true, configurable: true });

    manager.add_bookmark();

    const bookmarks = manager.get_bookmarks();
    expect(bookmarks.length).toBe(1);
    expect(bookmarks[0].scroll_top).toBe(250);
  });

  test("add_bookmark uses nearest heading as label", () => {
    Object.defineProperty(editor_container, "scrollTop", { value: 250, writable: true, configurable: true });

    manager.add_bookmark();

    const bookmarks = manager.get_bookmarks();
    expect(bookmarks.length).toBe(1);
    // The nearest heading at or above scrollTop 250 should be "Section One" (offsetTop: 200)
    expect(bookmarks[0].label).toBe("Section One");
  });

  test("add_bookmark uses position label when no heading is found", () => {
    // Create a container with no headings
    const empty_container = document.createElement("div");
    document.body.appendChild(empty_container);
    Object.defineProperty(empty_container, "scrollTop", { value: 100, writable: true, configurable: true });

    const empty_manager = new BookmarkManager(empty_container);
    empty_manager.add_bookmark();

    const bookmarks = empty_manager.get_bookmarks();
    expect(bookmarks.length).toBe(1);
    expect(bookmarks[0].label).toBe("Position 100");

    empty_manager.destroy();
  });

  test("get_bookmarks returns saved bookmarks", () => {
    Object.defineProperty(editor_container, "scrollTop", { value: 100, writable: true, configurable: true });
    manager.add_bookmark();

    Object.defineProperty(editor_container, "scrollTop", { value: 300, writable: true, configurable: true });
    manager.add_bookmark();

    const bookmarks = manager.get_bookmarks();
    expect(bookmarks.length).toBe(2);
    expect(bookmarks[0].scroll_top).toBe(100);
    expect(bookmarks[1].scroll_top).toBe(300);
  });

  test("get_bookmarks returns a copy, not the original array", () => {
    Object.defineProperty(editor_container, "scrollTop", { value: 100, writable: true, configurable: true });
    manager.add_bookmark();

    const bookmarks1 = manager.get_bookmarks();
    const bookmarks2 = manager.get_bookmarks();
    expect(bookmarks1).not.toBe(bookmarks2);
    expect(bookmarks1).toEqual(bookmarks2);
  });

  test("remove_bookmark removes by ID", () => {
    Object.defineProperty(editor_container, "scrollTop", { value: 100, writable: true, configurable: true });
    manager.add_bookmark();

    Object.defineProperty(editor_container, "scrollTop", { value: 300, writable: true, configurable: true });
    manager.add_bookmark();

    const bookmarks = manager.get_bookmarks();
    expect(bookmarks.length).toBe(2);

    const id_to_remove = bookmarks[0].id;
    manager.remove_bookmark(id_to_remove);

    const remaining = manager.get_bookmarks();
    expect(remaining.length).toBe(1);
    expect(remaining[0].id).toBe(bookmarks[1].id);
  });

  test("remove_bookmark with nonexistent ID does nothing", () => {
    Object.defineProperty(editor_container, "scrollTop", { value: 100, writable: true, configurable: true });
    manager.add_bookmark();

    manager.remove_bookmark("nonexistent_id");

    const bookmarks = manager.get_bookmarks();
    expect(bookmarks.length).toBe(1);
  });

  test("render_list creates DOM elements for bookmarks", () => {
    Object.defineProperty(editor_container, "scrollTop", { value: 100, writable: true, configurable: true });
    manager.add_bookmark();

    Object.defineProperty(editor_container, "scrollTop", { value: 300, writable: true, configurable: true });
    manager.add_bookmark();

    const list_container = document.createElement("div");
    document.body.appendChild(list_container);

    manager.render_list(list_container);

    // Should have 2 bookmark items
    expect(list_container.children.length).toBe(2);

    // Each item should have a label span and a remove button
    const first_item = list_container.children[0];
    const label = first_item.querySelector("span");
    const button = first_item.querySelector("button");
    expect(label).toBeTruthy();
    expect(button).toBeTruthy();
    expect(button!.title).toBe("Remove bookmark");
  });

  test("render_list shows empty state when no bookmarks", () => {
    const list_container = document.createElement("div");
    document.body.appendChild(list_container);

    manager.render_list(list_container);

    expect(list_container.children.length).toBe(1);
    expect(list_container.children[0].textContent).toBe("No bookmarks yet");
  });

  test("render_list clears previous content", () => {
    const list_container = document.createElement("div");
    const existing = document.createElement("div");
    existing.textContent = "old content";
    list_container.appendChild(existing);
    document.body.appendChild(list_container);

    manager.render_list(list_container);

    // Old content should be gone
    expect(list_container.innerHTML).not.toContain("old content");
  });

  test("render_list remove button removes bookmark and re-renders", () => {
    Object.defineProperty(editor_container, "scrollTop", { value: 100, writable: true, configurable: true });
    manager.add_bookmark();

    Object.defineProperty(editor_container, "scrollTop", { value: 300, writable: true, configurable: true });
    manager.add_bookmark();

    const list_container = document.createElement("div");
    document.body.appendChild(list_container);

    manager.render_list(list_container);
    expect(list_container.children.length).toBe(2);

    // Click the remove button on the first item
    const remove_btn = list_container.children[0].querySelector("button") as HTMLElement;
    remove_btn.click();

    // Should have re-rendered with one fewer bookmark
    expect(list_container.children.length).toBe(1);
    expect(manager.get_bookmarks().length).toBe(1);
  });

  test("jump_to scrolls to the bookmark position", () => {
    Object.defineProperty(editor_container, "scrollTop", { value: 400, writable: true, configurable: true });
    manager.add_bookmark();

    const bookmarks = manager.get_bookmarks();
    const id = bookmarks[0].id;

    // Mock scrollTo
    let scroll_called_with: any = null;
    editor_container.scrollTo = ((options: any) => {
      scroll_called_with = options;
    }) as any;

    manager.jump_to(id);

    expect(scroll_called_with).toBeTruthy();
    expect(scroll_called_with.top).toBe(400);
    expect(scroll_called_with.behavior).toBe("smooth");
  });

  test("jump_to with nonexistent ID does nothing", () => {
    let scroll_called = false;
    editor_container.scrollTo = (() => {
      scroll_called = true;
    }) as any;

    manager.jump_to("nonexistent_id");
    expect(scroll_called).toBe(false);
  });

  test("bookmark IDs are unique", () => {
    Object.defineProperty(editor_container, "scrollTop", { value: 100, writable: true, configurable: true });
    manager.add_bookmark();
    manager.add_bookmark();
    manager.add_bookmark();

    const bookmarks = manager.get_bookmarks();
    const ids = bookmarks.map((b) => b.id);
    const unique_ids = new Set(ids);
    expect(unique_ids.size).toBe(ids.length);
  });

  test("destroy clears all bookmarks", () => {
    Object.defineProperty(editor_container, "scrollTop", { value: 100, writable: true, configurable: true });
    manager.add_bookmark();
    manager.add_bookmark();

    expect(manager.get_bookmarks().length).toBe(2);

    manager.destroy();

    expect(manager.get_bookmarks().length).toBe(0);
  });
});
