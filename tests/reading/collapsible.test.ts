import { test, expect, describe, beforeEach, afterEach } from "bun:test";
import { CollapsibleSections } from "../../src/webview/reading/collapsible";

describe("CollapsibleSections", () => {
  let markdown_body: HTMLElement;
  let collapsible: CollapsibleSections;

  beforeEach(() => {
    document.body.innerHTML = "";
    markdown_body = document.createElement("div");
    markdown_body.className = "markdown-body";
    document.body.appendChild(markdown_body);

    collapsible = new CollapsibleSections();
  });

  afterEach(() => {
    collapsible.destroy();
    document.body.innerHTML = "";
  });

  function build_markdown_body(elements: { tag: string; text: string }[]): void {
    markdown_body.innerHTML = "";
    for (const { tag, text } of elements) {
      const el = document.createElement(tag);
      el.textContent = text;
      markdown_body.appendChild(el);
    }
  }

  test("apply adds chevrons to h2-h6 headings", () => {
    build_markdown_body([
      { tag: "h2", text: "Section A" },
      { tag: "p", text: "Content A" },
      { tag: "h3", text: "Sub Section B" },
      { tag: "p", text: "Content B" },
      { tag: "h4", text: "Sub Sub Section C" },
      { tag: "p", text: "Content C" },
      { tag: "h5", text: "Deep Section D" },
      { tag: "p", text: "Content D" },
      { tag: "h6", text: "Deepest Section E" },
      { tag: "p", text: "Content E" },
    ]);

    collapsible.apply(markdown_body);

    const chevrons = markdown_body.querySelectorAll(".collapsible-chevron");
    expect(chevrons.length).toBeGreaterThanOrEqual(5);

    // All h2-h6 should have the collapsible-heading class
    const headings = markdown_body.querySelectorAll(".collapsible-heading");
    expect(headings.length).toBeGreaterThanOrEqual(5);
  });

  test("apply skips h1 headings", () => {
    build_markdown_body([
      { tag: "h1", text: "Title" },
      { tag: "p", text: "Intro paragraph" },
      { tag: "h2", text: "Section" },
      { tag: "p", text: "Section content" },
    ]);

    collapsible.apply(markdown_body);

    const h1 = markdown_body.querySelector("h1");
    expect(h1).toBeTruthy();
    expect(h1!.classList.contains("collapsible-heading")).toBe(false);
    expect(h1!.querySelector(".collapsible-chevron")).toBeNull();
  });

  test("apply wraps content after heading in a collapsible-content div", () => {
    build_markdown_body([
      { tag: "h2", text: "Section" },
      { tag: "p", text: "Paragraph 1" },
      { tag: "p", text: "Paragraph 2" },
    ]);

    collapsible.apply(markdown_body);

    const content_wrapper = markdown_body.querySelector(".collapsible-content");
    expect(content_wrapper).toBeTruthy();
    expect(content_wrapper!.children.length).toBe(2);
    expect(content_wrapper!.children[0].textContent).toBe("Paragraph 1");
    expect(content_wrapper!.children[1].textContent).toBe("Paragraph 2");
  });

  test("clicking a heading hides its content", () => {
    build_markdown_body([
      { tag: "h2", text: "Section" },
      { tag: "p", text: "Content here" },
    ]);

    collapsible.apply(markdown_body);

    const heading = markdown_body.querySelector("h2") as HTMLElement;
    const content_wrapper = markdown_body.querySelector(".collapsible-content") as HTMLElement;

    expect(content_wrapper.style.display).not.toBe("none");

    // Click to collapse
    heading.click();

    expect(content_wrapper.style.display).toBe("none");
    expect(content_wrapper.classList.contains("collapsed")).toBe(true);
  });

  test("clicking a heading twice restores content visibility", () => {
    build_markdown_body([
      { tag: "h2", text: "Section" },
      { tag: "p", text: "Content here" },
    ]);

    collapsible.apply(markdown_body);

    const heading = markdown_body.querySelector("h2") as HTMLElement;
    const content_wrapper = markdown_body.querySelector(".collapsible-content") as HTMLElement;

    // Click to collapse
    heading.click();
    expect(content_wrapper.style.display).toBe("none");

    // Click to expand
    heading.click();
    expect(content_wrapper.style.display).toBe("");
    expect(content_wrapper.classList.contains("collapsed")).toBe(false);
  });

  test("chevron rotates on collapse and expand", () => {
    build_markdown_body([
      { tag: "h2", text: "Section" },
      { tag: "p", text: "Content here" },
    ]);

    collapsible.apply(markdown_body);

    const heading = markdown_body.querySelector("h2") as HTMLElement;
    const chevron = heading.querySelector(".collapsible-chevron") as HTMLElement;

    // Initially expanded: rotate(90deg)
    expect(chevron.style.transform).toBe("rotate(90deg)");

    // Click to collapse
    heading.click();
    expect(chevron.style.transform).toBe("rotate(0deg)");

    // Click to expand
    heading.click();
    expect(chevron.style.transform).toBe("rotate(90deg)");
  });

  test("heading gets cursor pointer style", () => {
    build_markdown_body([
      { tag: "h2", text: "Section" },
      { tag: "p", text: "Content" },
    ]);

    collapsible.apply(markdown_body);

    const heading = markdown_body.querySelector("h2") as HTMLElement;
    expect(heading.style.cursor).toBe("pointer");
  });

  test("sections at the same level are independent", () => {
    build_markdown_body([
      { tag: "h2", text: "Section A" },
      { tag: "p", text: "Content A" },
      { tag: "h2", text: "Section B" },
      { tag: "p", text: "Content B" },
    ]);

    collapsible.apply(markdown_body);

    const headings = markdown_body.querySelectorAll("h2");
    const wrappers = markdown_body.querySelectorAll(".collapsible-content");

    expect(headings.length).toBe(2);
    expect(wrappers.length).toBe(2);

    // Collapse first section
    (headings[0] as HTMLElement).click();

    expect((wrappers[0] as HTMLElement).style.display).toBe("none");
    expect((wrappers[1] as HTMLElement).style.display).not.toBe("none");
  });

  test("nested headings are included in parent section content", () => {
    build_markdown_body([
      { tag: "h2", text: "Parent" },
      { tag: "p", text: "Parent content" },
      { tag: "h3", text: "Child" },
      { tag: "p", text: "Child content" },
    ]);

    collapsible.apply(markdown_body);

    // The h2's content wrapper should contain the h3 and its content wrapper
    const h2 = markdown_body.querySelector("h2") as HTMLElement;
    const h2_wrapper = h2.nextElementSibling as HTMLElement;
    expect(h2_wrapper.className).toBe("collapsible-content");

    // The h3 and its collapsible content should be inside h2's wrapper
    const nested_h3 = h2_wrapper.querySelector("h3");
    expect(nested_h3).toBeTruthy();
  });

  test("heading with no following content is skipped", () => {
    build_markdown_body([
      { tag: "h2", text: "Section A" },
      { tag: "p", text: "Content A" },
      { tag: "h2", text: "Empty Section" },
    ]);

    collapsible.apply(markdown_body);

    const headings = markdown_body.querySelectorAll(".collapsible-heading");
    // Only the first h2 should be collapsible since the second has no content
    expect(headings.length).toBe(1);
  });

  test("destroy removes chevrons from headings", () => {
    build_markdown_body([
      { tag: "h2", text: "Section" },
      { tag: "p", text: "Content" },
    ]);

    collapsible.apply(markdown_body);

    const chevrons_before = markdown_body.querySelectorAll(".collapsible-chevron");
    expect(chevrons_before.length).toBe(1);

    collapsible.destroy();

    const chevrons_after = markdown_body.querySelectorAll(".collapsible-chevron");
    expect(chevrons_after.length).toBe(0);
  });

  test("destroy restores original DOM structure", () => {
    build_markdown_body([
      { tag: "h2", text: "Section" },
      { tag: "p", text: "Paragraph 1" },
      { tag: "p", text: "Paragraph 2" },
    ]);

    collapsible.apply(markdown_body);

    // After apply, content is wrapped
    expect(markdown_body.querySelectorAll(".collapsible-content").length).toBe(1);

    collapsible.destroy();

    // After destroy, content should be unwrapped
    expect(markdown_body.querySelectorAll(".collapsible-content").length).toBe(0);

    // The paragraphs should be direct children of markdown_body again
    const children = Array.from(markdown_body.children);
    const p_elements = children.filter((el) => el.tagName === "P");
    expect(p_elements.length).toBe(2);
    expect(p_elements[0].textContent).toBe("Paragraph 1");
    expect(p_elements[1].textContent).toBe("Paragraph 2");
  });

  test("destroy removes collapsible-heading class", () => {
    build_markdown_body([
      { tag: "h2", text: "Section" },
      { tag: "p", text: "Content" },
    ]);

    collapsible.apply(markdown_body);

    const heading = markdown_body.querySelector("h2") as HTMLElement;
    expect(heading.classList.contains("collapsible-heading")).toBe(true);

    collapsible.destroy();

    expect(heading.classList.contains("collapsible-heading")).toBe(false);
    expect(heading.style.cursor).toBe("");
  });

  test("destroy removes click handlers from headings", () => {
    build_markdown_body([
      { tag: "h2", text: "Section" },
      { tag: "p", text: "Content" },
    ]);

    collapsible.apply(markdown_body);
    collapsible.destroy();

    const heading = markdown_body.querySelector("h2") as HTMLElement;
    // The private handler reference should be cleaned up
    expect((heading as any).__collapsible_click_handler).toBeUndefined();
  });

  test("apply can be called multiple times (destroy is called internally)", () => {
    build_markdown_body([
      { tag: "h2", text: "Section" },
      { tag: "p", text: "Content" },
    ]);

    collapsible.apply(markdown_body);
    collapsible.apply(markdown_body);

    // Should not duplicate chevrons or wrappers
    const chevrons = markdown_body.querySelectorAll(".collapsible-chevron");
    expect(chevrons.length).toBe(1);
  });
});
