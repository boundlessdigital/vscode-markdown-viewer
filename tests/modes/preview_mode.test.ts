import { mock } from "bun:test";

mock.module("mermaid", () => ({
  default: {
    initialize: () => {},
    render: async () => ({ svg: "<svg></svg>" }),
  },
}));

mock.module("highlight.js/styles/github.css", () => ({}));
mock.module("katex/dist/katex.css", () => ({}));

import { test, expect, describe, beforeEach, afterEach } from "bun:test";
import { PreviewMode } from "../../src/webview/modes/preview_mode";

describe("PreviewMode", () => {
  let container: HTMLElement;
  let preview: PreviewMode;

  beforeEach(() => {
    document.body.innerHTML = "";
    container = document.createElement("div");
    document.body.appendChild(container);
    preview = new PreviewMode();
  });

  afterEach(() => {
    preview.deactivate();
    document.body.innerHTML = "";
  });

  describe("activate", () => {
    test("renders markdown as HTML into the container", async () => {
      await preview.activate(container, "# Hello World");

      const markdown_body = container.querySelector(".markdown-body");
      expect(markdown_body).toBeTruthy();
      expect(markdown_body!.innerHTML).toContain("Hello World");
    });

    test("stores the markdown content", async () => {
      const md = "# Test Content";
      await preview.activate(container, md);

      expect(preview.get_markdown()).toBe(md);
    });
  });

  describe("heading rendering", () => {
    test("renders h1 heading", async () => {
      await preview.activate(container, "# Heading 1");

      const h1 = container.querySelector("h1");
      expect(h1).toBeTruthy();
      expect(h1!.textContent).toBe("Heading 1");
    });

    test("renders h2 heading", async () => {
      await preview.activate(container, "## Heading 2");

      const h2 = container.querySelector("h2");
      expect(h2).toBeTruthy();
      expect(h2!.textContent).toBe("Heading 2");
    });

    test("renders h3 heading", async () => {
      await preview.activate(container, "### Heading 3");

      const h3 = container.querySelector("h3");
      expect(h3).toBeTruthy();
      expect(h3!.textContent).toBe("Heading 3");
    });

    test("renders multiple heading levels", async () => {
      const md = `# H1\n## H2\n### H3\n#### H4\n##### H5\n###### H6`;
      await preview.activate(container, md);

      expect(container.querySelector("h1")).toBeTruthy();
      expect(container.querySelector("h2")).toBeTruthy();
      expect(container.querySelector("h3")).toBeTruthy();
      expect(container.querySelector("h4")).toBeTruthy();
      expect(container.querySelector("h5")).toBeTruthy();
      expect(container.querySelector("h6")).toBeTruthy();
    });
  });

  describe("paragraph rendering", () => {
    test("renders a paragraph", async () => {
      await preview.activate(container, "This is a paragraph.");

      const p = container.querySelector("p");
      expect(p).toBeTruthy();
      expect(p!.textContent).toBe("This is a paragraph.");
    });

    test("renders multiple paragraphs", async () => {
      const md = "First paragraph.\n\nSecond paragraph.";
      await preview.activate(container, md);

      const paragraphs = container.querySelectorAll("p");
      expect(paragraphs.length).toBe(2);
      expect(paragraphs[0].textContent).toBe("First paragraph.");
      expect(paragraphs[1].textContent).toBe("Second paragraph.");
    });
  });

  describe("list rendering", () => {
    test("renders an unordered list", async () => {
      const md = "- Item 1\n- Item 2\n- Item 3";
      await preview.activate(container, md);

      const ul = container.querySelector("ul");
      expect(ul).toBeTruthy();

      const items = ul!.querySelectorAll("li");
      expect(items.length).toBe(3);
      expect(items[0].textContent).toBe("Item 1");
      expect(items[1].textContent).toBe("Item 2");
      expect(items[2].textContent).toBe("Item 3");
    });

    test("renders an ordered list", async () => {
      const md = "1. First\n2. Second\n3. Third";
      await preview.activate(container, md);

      const ol = container.querySelector("ol");
      expect(ol).toBeTruthy();

      const items = ol!.querySelectorAll("li");
      expect(items.length).toBe(3);
      expect(items[0].textContent).toBe("First");
    });
  });

  describe("code block rendering", () => {
    test("renders a fenced code block", async () => {
      const md = "```\nconsole.log('hello');\n```";
      await preview.activate(container, md);

      const pre = container.querySelector("pre");
      expect(pre).toBeTruthy();

      const code = container.querySelector("code");
      expect(code).toBeTruthy();
      expect(code!.textContent).toContain("console.log");
    });

    test("renders a code block with language highlighting", async () => {
      const md = "```javascript\nconst x = 42;\n```";
      await preview.activate(container, md);

      const pre = container.querySelector("pre.hljs");
      expect(pre).toBeTruthy();

      const code = container.querySelector("code.language-javascript");
      expect(code).toBeTruthy();
    });

    test("renders inline code", async () => {
      const md = "Use `const` for constants.";
      await preview.activate(container, md);

      const code = container.querySelector("code");
      expect(code).toBeTruthy();
      expect(code!.textContent).toBe("const");
    });
  });

  describe("frontmatter stripping", () => {
    test("strips YAML frontmatter from rendered output", async () => {
      const md = `---
title: My Document
date: 2024-01-01
---
# Hello`;

      await preview.activate(container, md);

      const content = container.innerHTML;
      expect(content).not.toContain("title: My Document");
      expect(content).not.toContain("date: 2024-01-01");

      const h1 = container.querySelector("h1");
      expect(h1).toBeTruthy();
      expect(h1!.textContent).toBe("Hello");
    });

    test("strips frontmatter but preserves all body content", async () => {
      const md = `---
title: Test
tags: [a, b]
---
# Heading

Some paragraph content.

- List item`;

      await preview.activate(container, md);

      expect(container.querySelector("h1")).toBeTruthy();
      expect(container.querySelector("p")).toBeTruthy();
      expect(container.querySelector("li")).toBeTruthy();
      expect(container.innerHTML).not.toContain("tags: [a, b]");
    });

    test("renders correctly when there is no frontmatter", async () => {
      const md = "# No Frontmatter\n\nJust content.";
      await preview.activate(container, md);

      expect(container.querySelector("h1")!.textContent).toBe("No Frontmatter");
      expect(container.querySelector("p")!.textContent).toBe("Just content.");
    });
  });

  describe("update_content", () => {
    test("re-renders with new markdown", async () => {
      await preview.activate(container, "# Original");
      expect(container.querySelector("h1")!.textContent).toBe("Original");

      preview.update_content("# Updated");

      // Allow async render to complete
      await new Promise((r) => setTimeout(r, 10));

      expect(container.querySelector("h1")!.textContent).toBe("Updated");
      expect(preview.get_markdown()).toBe("# Updated");
    });

    test("replaces previous content entirely", async () => {
      await preview.activate(container, "# First\n\nParagraph one.");

      preview.update_content("## Second\n\nParagraph two.");
      await new Promise((r) => setTimeout(r, 10));

      expect(container.querySelector("h1")).toBeNull();
      expect(container.querySelector("h2")!.textContent).toBe("Second");
      expect(container.querySelector("p")!.textContent).toBe("Paragraph two.");
    });
  });

  describe("deactivate", () => {
    test("clears the container innerHTML", async () => {
      await preview.activate(container, "# Hello");
      expect(container.innerHTML).not.toBe("");

      preview.deactivate();
      expect(container.innerHTML).toBe("");
    });

    test("sets container reference to null internally", async () => {
      await preview.activate(container, "# Hello");
      preview.deactivate();

      // After deactivate, update_content should not throw
      // (it should be a no-op since container is null)
      expect(() => preview.update_content("# New")).not.toThrow();
    });
  });

  describe("get_markdown", () => {
    test("returns the current markdown string", async () => {
      const md = "# Test\n\nSome content.";
      await preview.activate(container, md);

      expect(preview.get_markdown()).toBe(md);
    });

    test("returns updated markdown after update_content", async () => {
      await preview.activate(container, "# Original");

      const new_md = "# New Content\n\nWith paragraph.";
      preview.update_content(new_md);

      expect(preview.get_markdown()).toBe(new_md);
    });

    test("returns empty string before activation", () => {
      const fresh_preview = new PreviewMode();
      expect(fresh_preview.get_markdown()).toBe("");
    });
  });

  describe("KaTeX rendering", () => {
    test("renders inline math with $...$", async () => {
      const md = "The formula is $x^2$ in this line.";
      await preview.activate(container, md);

      const katex_el = container.querySelector(".katex");
      expect(katex_el).toBeTruthy();
    });

    test("renders display math with $$...$$", async () => {
      const md = "Here is a formula:\n\n$$E=mc^2$$";
      await preview.activate(container, md);

      const katex_display = container.querySelector(".katex-display");
      expect(katex_display).toBeTruthy();
    });

    test("renders multiple inline math expressions", async () => {
      const md = "Both $a^2$ and $b^2$ are here.";
      await preview.activate(container, md);

      const katex_elements = container.querySelectorAll(".katex");
      expect(katex_elements.length).toBeGreaterThanOrEqual(2);
    });

    test("preserves text around math expressions", async () => {
      const md = "Before $x$ after.";
      await preview.activate(container, md);

      const text_content = container.textContent || "";
      expect(text_content).toContain("Before");
      expect(text_content).toContain("after.");
    });
  });

  describe("markdown-body wrapper", () => {
    test("wraps rendered content in a .markdown-body div", async () => {
      await preview.activate(container, "# Hello");

      const markdown_body = container.querySelector(".markdown-body");
      expect(markdown_body).toBeTruthy();
      expect(markdown_body!.tagName.toLowerCase()).toBe("div");
    });

    test("all rendered content is inside .markdown-body", async () => {
      await preview.activate(container, "# Hello\n\nParagraph.");

      const markdown_body = container.querySelector(".markdown-body");
      expect(markdown_body).toBeTruthy();
      expect(markdown_body!.querySelector("h1")).toBeTruthy();
      expect(markdown_body!.querySelector("p")).toBeTruthy();
    });
  });

  describe("additional markdown features", () => {
    test("renders blockquotes", async () => {
      const md = "> This is a blockquote.";
      await preview.activate(container, md);

      const blockquote = container.querySelector("blockquote");
      expect(blockquote).toBeTruthy();
      expect(blockquote!.textContent).toContain("This is a blockquote.");
    });

    test("renders links", async () => {
      const md = "[Click here](https://example.com)";
      await preview.activate(container, md);

      const link = container.querySelector("a");
      expect(link).toBeTruthy();
      expect(link!.getAttribute("href")).toBe("https://example.com");
      expect(link!.textContent).toBe("Click here");
    });

    test("renders bold and italic text", async () => {
      const md = "This is **bold** and *italic* text.";
      await preview.activate(container, md);

      const strong = container.querySelector("strong");
      expect(strong).toBeTruthy();
      expect(strong!.textContent).toBe("bold");

      const em = container.querySelector("em");
      expect(em).toBeTruthy();
      expect(em!.textContent).toBe("italic");
    });

    test("renders horizontal rules", async () => {
      const md = "Above\n\n---\n\nBelow";
      await preview.activate(container, md);

      const hr = container.querySelector("hr");
      expect(hr).toBeTruthy();
    });
  });
});
