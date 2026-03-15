import { test, expect, describe, beforeEach, afterEach } from "bun:test";
import { SearchOverlay } from "../../src/webview/search/search";

describe("SearchOverlay", () => {
  let editor_container: HTMLElement;
  let search: SearchOverlay;

  beforeEach(() => {
    document.body.innerHTML = "";

    editor_container = document.createElement("div");
    editor_container.id = "editor";

    const markdown_body = document.createElement("div");
    markdown_body.className = "markdown-body";

    const p1 = document.createElement("p");
    p1.textContent = "Hello world, this is a test paragraph.";
    markdown_body.appendChild(p1);

    const p2 = document.createElement("p");
    p2.textContent = "Another paragraph with test content here.";
    markdown_body.appendChild(p2);

    const p3 = document.createElement("p");
    p3.textContent = "Final paragraph with no matches.";
    markdown_body.appendChild(p3);

    editor_container.appendChild(markdown_body);
    document.body.appendChild(editor_container);

    search = new SearchOverlay(editor_container);
  });

  afterEach(() => {
    search.destroy();
    document.body.innerHTML = "";
  });

  test("constructor creates overlay element in the DOM", () => {
    const overlay = document.querySelector(".search-overlay");
    expect(overlay).toBeTruthy();
    expect(overlay!.classList.contains("hidden")).toBe(true);
  });

  test("overlay contains input, count display, and buttons", () => {
    const overlay = document.querySelector(".search-overlay") as HTMLElement;
    expect(overlay.querySelector("input")).toBeTruthy();
    expect(overlay.querySelector(".search-count")).toBeTruthy();
    expect(overlay.querySelector(".search-prev")).toBeTruthy();
    expect(overlay.querySelector(".search-next")).toBeTruthy();
    expect(overlay.querySelector(".search-close")).toBeTruthy();
  });

  test("open removes hidden class from overlay", () => {
    search.open();

    const overlay = document.querySelector(".search-overlay") as HTMLElement;
    expect(overlay.classList.contains("hidden")).toBe(false);
  });

  test("close adds hidden class to overlay", () => {
    search.open();
    search.close();

    const overlay = document.querySelector(".search-overlay") as HTMLElement;
    expect(overlay.classList.contains("hidden")).toBe(true);
  });

  test("close clears the input value", () => {
    search.open();

    const input = document.querySelector(".search-overlay input") as HTMLInputElement;
    input.value = "test";
    input.dispatchEvent(new Event("input"));

    search.close();

    expect(input.value).toBe("");
  });

  test("close clears the count display", () => {
    search.open();

    const input = document.querySelector(".search-overlay input") as HTMLInputElement;
    input.value = "test";
    input.dispatchEvent(new Event("input"));

    search.close();

    const count = document.querySelector(".search-count") as HTMLElement;
    expect(count.textContent).toBe("");
  });

  test("searching marks matching text in the DOM", () => {
    search.open();

    const input = document.querySelector(".search-overlay input") as HTMLInputElement;
    input.value = "test";
    input.dispatchEvent(new Event("input"));

    const marks = editor_container.querySelectorAll("mark.search-match");
    expect(marks.length).toBe(2); // "test" appears in p1 and p2
  });

  test("search is case insensitive", () => {
    search.open();

    const input = document.querySelector(".search-overlay input") as HTMLInputElement;
    input.value = "hello";
    input.dispatchEvent(new Event("input"));

    const marks = editor_container.querySelectorAll("mark.search-match");
    expect(marks.length).toBe(1);
    expect(marks[0].textContent).toBe("Hello");
  });

  test("match count updates correctly", () => {
    search.open();

    const input = document.querySelector(".search-overlay input") as HTMLInputElement;
    const count = document.querySelector(".search-count") as HTMLElement;

    input.value = "paragraph";
    input.dispatchEvent(new Event("input"));

    // "paragraph" appears 3 times
    expect(count.textContent).toBe("1 of 3");
  });

  test("match count shows 0 results when no matches", () => {
    search.open();

    const input = document.querySelector(".search-overlay input") as HTMLInputElement;
    const count = document.querySelector(".search-count") as HTMLElement;

    input.value = "nonexistent";
    input.dispatchEvent(new Event("input"));

    expect(count.textContent).toBe("0 results");
  });

  test("match count is empty when search query is empty", () => {
    search.open();

    const input = document.querySelector(".search-overlay input") as HTMLInputElement;
    const count = document.querySelector(".search-count") as HTMLElement;

    input.value = "";
    input.dispatchEvent(new Event("input"));

    expect(count.textContent).toBe("");
  });

  test("first match gets search-current class", () => {
    search.open();

    const input = document.querySelector(".search-overlay input") as HTMLInputElement;
    input.value = "paragraph";
    input.dispatchEvent(new Event("input"));

    const marks = editor_container.querySelectorAll("mark.search-match");
    expect(marks[0].classList.contains("search-current")).toBe(true);
    expect(marks[1].classList.contains("search-current")).toBe(false);
  });

  test("next button navigates to the next match", () => {
    search.open();

    const input = document.querySelector(".search-overlay input") as HTMLInputElement;
    input.value = "paragraph";
    input.dispatchEvent(new Event("input"));

    const next_btn = document.querySelector(".search-next") as HTMLElement;
    next_btn.click();

    const marks = editor_container.querySelectorAll("mark.search-match");
    const count = document.querySelector(".search-count") as HTMLElement;

    expect(marks[0].classList.contains("search-current")).toBe(false);
    expect(marks[1].classList.contains("search-current")).toBe(true);
    expect(count.textContent).toBe("2 of 3");
  });

  test("prev button navigates to the previous match", () => {
    search.open();

    const input = document.querySelector(".search-overlay input") as HTMLInputElement;
    input.value = "paragraph";
    input.dispatchEvent(new Event("input"));

    const next_btn = document.querySelector(".search-next") as HTMLElement;
    next_btn.click(); // go to 2nd

    const prev_btn = document.querySelector(".search-prev") as HTMLElement;
    prev_btn.click(); // back to 1st

    const marks = editor_container.querySelectorAll("mark.search-match");
    const count = document.querySelector(".search-count") as HTMLElement;

    expect(marks[0].classList.contains("search-current")).toBe(true);
    expect(count.textContent).toBe("1 of 3");
  });

  test("navigation wraps around from last to first", () => {
    search.open();

    const input = document.querySelector(".search-overlay input") as HTMLInputElement;
    input.value = "paragraph";
    input.dispatchEvent(new Event("input"));

    const next_btn = document.querySelector(".search-next") as HTMLElement;
    next_btn.click(); // 2nd
    next_btn.click(); // 3rd
    next_btn.click(); // wraps to 1st

    const count = document.querySelector(".search-count") as HTMLElement;
    expect(count.textContent).toBe("1 of 3");
  });

  test("navigation wraps around from first to last", () => {
    search.open();

    const input = document.querySelector(".search-overlay input") as HTMLInputElement;
    input.value = "paragraph";
    input.dispatchEvent(new Event("input"));

    const prev_btn = document.querySelector(".search-prev") as HTMLElement;
    prev_btn.click(); // wraps to last (3rd)

    const count = document.querySelector(".search-count") as HTMLElement;
    expect(count.textContent).toBe("3 of 3");
  });

  test("close removes all mark elements from the DOM", () => {
    search.open();

    const input = document.querySelector(".search-overlay input") as HTMLInputElement;
    input.value = "test";
    input.dispatchEvent(new Event("input"));

    expect(editor_container.querySelectorAll("mark.search-match").length).toBeGreaterThan(0);

    search.close();

    expect(editor_container.querySelectorAll("mark.search-match").length).toBe(0);
  });

  test("close restores original text nodes", () => {
    const original_text = editor_container.querySelector(".markdown-body p")!.textContent;

    search.open();

    const input = document.querySelector(".search-overlay input") as HTMLInputElement;
    input.value = "Hello";
    input.dispatchEvent(new Event("input"));

    search.close();

    const restored_text = editor_container.querySelector(".markdown-body p")!.textContent;
    expect(restored_text).toBe(original_text);
  });

  test("new search clears previous marks", () => {
    search.open();

    const input = document.querySelector(".search-overlay input") as HTMLInputElement;
    input.value = "test";
    input.dispatchEvent(new Event("input"));

    const initial_marks = editor_container.querySelectorAll("mark.search-match").length;
    expect(initial_marks).toBe(2);

    input.value = "Hello";
    input.dispatchEvent(new Event("input"));

    const new_marks = editor_container.querySelectorAll("mark.search-match");
    expect(new_marks.length).toBe(1);
    expect(new_marks[0].textContent).toBe("Hello");
  });

  test("destroy removes the overlay from the DOM", () => {
    search.destroy();

    const overlay = document.querySelector(".search-overlay");
    expect(overlay).toBeNull();
  });

  test("destroy removes keydown event listener", () => {
    search.destroy();

    // After destroy, Ctrl+F should not re-open the overlay
    // (overlay is removed, so we just verify no error is thrown)
    const event = new KeyboardEvent("keydown", {
      key: "f",
      ctrlKey: true,
    });
    document.dispatchEvent(event);

    const overlay = document.querySelector(".search-overlay");
    expect(overlay).toBeNull();
  });

  test("Escape key in input closes the search", () => {
    search.open();

    const input = document.querySelector(".search-overlay input") as HTMLInputElement;
    const escape_event = new KeyboardEvent("keydown", {
      key: "Escape",
      bubbles: true,
    });
    input.dispatchEvent(escape_event);

    const overlay = document.querySelector(".search-overlay") as HTMLElement;
    expect(overlay.classList.contains("hidden")).toBe(true);
  });

  test("Enter key in input navigates to next match", () => {
    search.open();

    const input = document.querySelector(".search-overlay input") as HTMLInputElement;
    input.value = "paragraph";
    input.dispatchEvent(new Event("input"));

    const enter_event = new KeyboardEvent("keydown", {
      key: "Enter",
      bubbles: true,
    });
    input.dispatchEvent(enter_event);

    const count = document.querySelector(".search-count") as HTMLElement;
    expect(count.textContent).toBe("2 of 3");
  });

  test("Shift+Enter key in input navigates to previous match", () => {
    search.open();

    const input = document.querySelector(".search-overlay input") as HTMLInputElement;
    input.value = "paragraph";
    input.dispatchEvent(new Event("input"));

    const shift_enter_event = new KeyboardEvent("keydown", {
      key: "Enter",
      shiftKey: true,
      bubbles: true,
    });
    input.dispatchEvent(shift_enter_event);

    const count = document.querySelector(".search-count") as HTMLElement;
    expect(count.textContent).toBe("3 of 3");
  });

  test("close button clicks close the search", () => {
    search.open();

    const close_btn = document.querySelector(".search-close") as HTMLElement;
    close_btn.click();

    const overlay = document.querySelector(".search-overlay") as HTMLElement;
    expect(overlay.classList.contains("hidden")).toBe(true);
  });

  test("multiple occurrences in a single text node are all marked", () => {
    // Create content with repeated word in one paragraph
    const markdown_body = editor_container.querySelector(".markdown-body")!;
    markdown_body.innerHTML = "";
    const p = document.createElement("p");
    p.textContent = "foo bar foo baz foo";
    markdown_body.appendChild(p);

    search.open();

    const input = document.querySelector(".search-overlay input") as HTMLInputElement;
    input.value = "foo";
    input.dispatchEvent(new Event("input"));

    const marks = editor_container.querySelectorAll("mark.search-match");
    expect(marks.length).toBe(3);
  });
});
