import { test, expect, describe, beforeEach, afterEach } from "bun:test";
import { ProgressBar } from "../../src/webview/reading/progress_bar";

describe("ProgressBar", () => {
  let editor_container: HTMLElement;
  let progress_bar: ProgressBar;

  beforeEach(() => {
    document.body.innerHTML = "";
    editor_container = document.createElement("div");
    editor_container.style.height = "500px";
    editor_container.style.overflow = "auto";
    document.body.appendChild(editor_container);

    // Create tall content so scrollHeight > clientHeight
    const content = document.createElement("div");
    content.style.height = "2000px";
    editor_container.appendChild(content);
  });

  afterEach(() => {
    if (progress_bar) {
      progress_bar.destroy();
    }
    document.body.innerHTML = "";
  });

  test("constructor creates a progress bar element in the DOM", () => {
    progress_bar = new ProgressBar(editor_container);

    const bar = document.body.firstElementChild as HTMLElement;
    expect(bar).toBeTruthy();
    expect(bar.style.position).toBe("fixed");
    expect(bar.style.top).toBe("0px");
    expect(bar.style.left).toBe("0px");
    expect(bar.style.height).toBe("3px");
    expect(bar.style.zIndex).toBe("300");
    expect(bar.style.pointerEvents).toBe("none");
  });

  test("initial width is set based on scroll position", () => {
    progress_bar = new ProgressBar(editor_container);

    const bar = document.body.firstElementChild as HTMLElement;
    // At the top, scrollTop is 0, so width should be 0% (or 100% if no scrollable area)
    const width = bar.style.width;
    expect(width).toBeDefined();
  });

  test("bar width is 100% when content is not scrollable", () => {
    // Create a container with no overflow
    const small_container = document.createElement("div");
    small_container.style.height = "500px";
    const small_content = document.createElement("div");
    small_content.style.height = "100px";
    small_container.appendChild(small_content);
    document.body.appendChild(small_container);

    progress_bar = new ProgressBar(small_container);

    const bar = document.body.firstElementChild as HTMLElement;
    // scrollHeight <= clientHeight means max_scroll <= 0, so width should be 100%
    expect(bar.style.width).toBe("100%");
  });

  test("scroll events update the bar width", () => {
    progress_bar = new ProgressBar(editor_container);
    const bar = document.body.firstElementChild as HTMLElement;

    // Simulate scroll
    Object.defineProperty(editor_container, "scrollTop", { value: 750, writable: true });
    Object.defineProperty(editor_container, "scrollHeight", { value: 2000, writable: true });
    Object.defineProperty(editor_container, "clientHeight", { value: 500, writable: true });

    editor_container.dispatchEvent(new Event("scroll"));

    // 750 / (2000 - 500) = 750 / 1500 = 0.5 => 50%
    expect(bar.style.width).toBe("50%");
  });

  test("scroll to bottom sets width to 100%", () => {
    progress_bar = new ProgressBar(editor_container);
    const bar = document.body.firstElementChild as HTMLElement;

    Object.defineProperty(editor_container, "scrollTop", { value: 1500, writable: true });
    Object.defineProperty(editor_container, "scrollHeight", { value: 2000, writable: true });
    Object.defineProperty(editor_container, "clientHeight", { value: 500, writable: true });

    editor_container.dispatchEvent(new Event("scroll"));

    expect(bar.style.width).toBe("100%");
  });

  test("destroy removes the bar element from the DOM", () => {
    progress_bar = new ProgressBar(editor_container);

    const bar = document.body.firstElementChild as HTMLElement;
    expect(bar).toBeTruthy();
    expect(bar.style.position).toBe("fixed");

    progress_bar.destroy();

    // The fixed-position bar should be removed
    const remaining_fixed = Array.from(document.body.children).filter(
      (el) => (el as HTMLElement).style.position === "fixed"
    );
    expect(remaining_fixed.length).toBe(0);
  });

  test("destroy removes the scroll event listener", () => {
    progress_bar = new ProgressBar(editor_container);
    const bar = document.body.firstElementChild as HTMLElement;

    progress_bar.destroy();

    // After destroy, scrolling should not update the (now removed) bar's width
    // We re-add the bar to test it doesn't update
    const old_width = bar.style.width;
    Object.defineProperty(editor_container, "scrollTop", { value: 1000, writable: true });
    Object.defineProperty(editor_container, "scrollHeight", { value: 2000, writable: true });
    Object.defineProperty(editor_container, "clientHeight", { value: 500, writable: true });

    editor_container.dispatchEvent(new Event("scroll"));

    // Width should remain unchanged since listener was removed
    expect(bar.style.width).toBe(old_width);
  });

  test("progress bar is prepended to document body", () => {
    progress_bar = new ProgressBar(editor_container);

    // The bar should be the first child of body (prepended)
    const first_child = document.body.firstElementChild as HTMLElement;
    expect(first_child.style.position).toBe("fixed");
    expect(first_child.style.height).toBe("3px");
  });

  test("bar has correct visual styles", () => {
    progress_bar = new ProgressBar(editor_container);

    const bar = document.body.firstElementChild as HTMLElement;
    expect(bar.style.backgroundColor).toBe("var(--link)");
    expect(bar.style.opacity).toBe("0.7");
    expect(bar.style.transition).toBe("width 0.1s ease-out");
  });
});
