import { test, expect, describe, beforeEach, afterEach } from "bun:test";
import { CommentsManager, type Comment } from "../../src/webview/comments/comments";

describe("CommentsManager", () => {
  let editor_container: HTMLElement;
  let manager: CommentsManager;

  beforeEach(() => {
    document.body.innerHTML = "";
    editor_container = document.createElement("div");
    editor_container.className = "editor-container";
    document.body.appendChild(editor_container);

    manager = new CommentsManager(editor_container);
  });

  afterEach(() => {
    manager.destroy();
    document.body.innerHTML = "";
  });

  describe("load_comments", () => {
    test("stores comments", () => {
      const comments: Comment[] = [
        {
          id: "c1",
          heading_text: "Introduction",
          content: "Great intro!",
          created_at: "2024-01-01T00:00:00Z",
        },
      ];

      manager.load_comments(comments);

      const loaded = manager.get_comments();
      expect(loaded.length).toBe(1);
      expect(loaded[0].id).toBe("c1");
      expect(loaded[0].content).toBe("Great intro!");
    });

    test("stores multiple comments", () => {
      const comments: Comment[] = [
        {
          id: "c1",
          heading_text: "Section A",
          content: "Comment one",
          created_at: "2024-01-01T00:00:00Z",
        },
        {
          id: "c2",
          heading_text: "Section B",
          content: "Comment two",
          created_at: "2024-01-02T00:00:00Z",
        },
        {
          id: "c3",
          heading_text: "Section A",
          content: "Comment three",
          created_at: "2024-01-03T00:00:00Z",
        },
      ];

      manager.load_comments(comments);

      const loaded = manager.get_comments();
      expect(loaded.length).toBe(3);
    });

    test("replaces previous comments when loading new ones", () => {
      manager.load_comments([
        {
          id: "c1",
          heading_text: "Old",
          content: "Old comment",
          created_at: "2024-01-01T00:00:00Z",
        },
      ]);

      manager.load_comments([
        {
          id: "c2",
          heading_text: "New",
          content: "New comment",
          created_at: "2024-02-01T00:00:00Z",
        },
      ]);

      const loaded = manager.get_comments();
      expect(loaded.length).toBe(1);
      expect(loaded[0].id).toBe("c2");
      expect(loaded[0].content).toBe("New comment");
    });

    test("makes a copy of the comments array", () => {
      const comments: Comment[] = [
        {
          id: "c1",
          heading_text: "Title",
          content: "Comment",
          created_at: "2024-01-01T00:00:00Z",
        },
      ];

      manager.load_comments(comments);

      // Mutating the original should not affect the manager
      comments.push({
        id: "c2",
        heading_text: "Extra",
        content: "Extra comment",
        created_at: "2024-02-01T00:00:00Z",
      });

      const loaded = manager.get_comments();
      expect(loaded.length).toBe(1);
    });

    test("loading empty array clears comments", () => {
      manager.load_comments([
        {
          id: "c1",
          heading_text: "Title",
          content: "A comment",
          created_at: "2024-01-01T00:00:00Z",
        },
      ]);

      manager.load_comments([]);

      expect(manager.get_comments().length).toBe(0);
    });
  });

  describe("attach_to_headings", () => {
    test("adds comment indicators to headings", () => {
      const markdown_body = document.createElement("div");
      markdown_body.className = "markdown-body";
      markdown_body.innerHTML = "<h1>Title</h1><h2>Section</h2>";
      editor_container.appendChild(markdown_body);

      manager.attach_to_headings(markdown_body);

      const indicators = markdown_body.querySelectorAll(".comment-indicator");
      expect(indicators.length).toBe(2);
    });

    test("indicators have correct title attribute", () => {
      const markdown_body = document.createElement("div");
      markdown_body.className = "markdown-body";
      markdown_body.innerHTML = "<h1>Title</h1>";
      editor_container.appendChild(markdown_body);

      manager.attach_to_headings(markdown_body);

      const indicator = markdown_body.querySelector(".comment-indicator") as HTMLElement;
      expect(indicator.title).toBe("Toggle comments");
    });

    test("indicator shows count when comments exist for a heading", () => {
      manager.load_comments([
        {
          id: "c1",
          heading_text: "Title",
          content: "A comment",
          created_at: "2024-01-01T00:00:00Z",
        },
        {
          id: "c2",
          heading_text: "Title",
          content: "Another comment",
          created_at: "2024-01-02T00:00:00Z",
        },
      ]);

      const markdown_body = document.createElement("div");
      markdown_body.className = "markdown-body";
      markdown_body.innerHTML = "<h1>Title</h1>";
      editor_container.appendChild(markdown_body);

      manager.attach_to_headings(markdown_body);

      const indicator = markdown_body.querySelector(".comment-indicator") as HTMLElement;
      expect(indicator.textContent).toContain("2");
    });

    test("indicator shows just the icon when no comments exist for a heading", () => {
      const markdown_body = document.createElement("div");
      markdown_body.className = "markdown-body";
      markdown_body.innerHTML = "<h1>Empty Section</h1>";
      editor_container.appendChild(markdown_body);

      manager.attach_to_headings(markdown_body);

      const indicator = markdown_body.querySelector(".comment-indicator") as HTMLElement;
      expect(indicator.textContent).not.toContain("0");
      // Should just be the speech bubble emoji
      expect(indicator.textContent).toContain("\uD83D\uDCAC");
    });

    test("adds indicators to all heading levels", () => {
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

      manager.attach_to_headings(markdown_body);

      const indicators = markdown_body.querySelectorAll(".comment-indicator");
      expect(indicators.length).toBe(6);
    });

    test("sets heading position to relative", () => {
      const markdown_body = document.createElement("div");
      markdown_body.className = "markdown-body";
      markdown_body.innerHTML = "<h1>Title</h1>";
      editor_container.appendChild(markdown_body);

      manager.attach_to_headings(markdown_body);

      const h1 = markdown_body.querySelector("h1") as HTMLElement;
      expect(h1.style.position).toBe("relative");
    });

    test("clicking indicator toggles comment panel", () => {
      const markdown_body = document.createElement("div");
      markdown_body.className = "markdown-body";
      markdown_body.innerHTML = "<h1>Title</h1>";
      editor_container.appendChild(markdown_body);

      manager.attach_to_headings(markdown_body);

      const indicator = markdown_body.querySelector(".comment-indicator") as HTMLElement;

      // Click to open
      indicator.click();

      const panel = markdown_body.querySelector(".comments-panel");
      expect(panel).toBeTruthy();

      // Click again to close
      indicator.click();

      const panel_after = markdown_body.querySelector(".comments-panel");
      expect(panel_after).toBeNull();
    });

    test("comment panel contains input and submit button", () => {
      const markdown_body = document.createElement("div");
      markdown_body.className = "markdown-body";
      markdown_body.innerHTML = "<h1>Title</h1>";
      editor_container.appendChild(markdown_body);

      manager.attach_to_headings(markdown_body);

      const indicator = markdown_body.querySelector(".comment-indicator") as HTMLElement;
      indicator.click();

      const panel = document.querySelector(".comments-panel");
      expect(panel).toBeTruthy();

      const input = panel!.querySelector(".comment-input") as HTMLInputElement;
      expect(input).toBeTruthy();
      expect(input.placeholder).toBe("Add a comment...");

      const submit = panel!.querySelector(".comment-submit");
      expect(submit).toBeTruthy();
      expect(submit!.textContent).toBe("Add");
    });

    test("comment panel displays existing comments", () => {
      manager.load_comments([
        {
          id: "c1",
          heading_text: "Title",
          content: "First comment",
          created_at: "2024-01-01T00:00:00Z",
        },
        {
          id: "c2",
          heading_text: "Title",
          content: "Second comment",
          created_at: "2024-01-02T00:00:00Z",
        },
      ]);

      const markdown_body = document.createElement("div");
      markdown_body.className = "markdown-body";
      markdown_body.innerHTML = "<h1>Title</h1>";
      editor_container.appendChild(markdown_body);

      manager.attach_to_headings(markdown_body);

      const indicator = markdown_body.querySelector(".comment-indicator") as HTMLElement;
      indicator.click();

      const entries = document.querySelectorAll(".comment-entry");
      expect(entries.length).toBe(2);

      const contents = document.querySelectorAll(".comment-content");
      expect(contents[0].textContent).toBe("First comment");
      expect(contents[1].textContent).toBe("Second comment");
    });

    test("cleans up old indicators when called again", () => {
      const markdown_body = document.createElement("div");
      markdown_body.className = "markdown-body";
      markdown_body.innerHTML = "<h1>Title</h1><h2>Section</h2>";
      editor_container.appendChild(markdown_body);

      manager.attach_to_headings(markdown_body);

      // Call again with different content
      const new_markdown_body = document.createElement("div");
      new_markdown_body.className = "markdown-body";
      new_markdown_body.innerHTML = "<h1>New Title</h1>";
      editor_container.innerHTML = "";
      editor_container.appendChild(new_markdown_body);

      manager.attach_to_headings(new_markdown_body);

      // Old indicators should be removed
      const all_indicators = document.querySelectorAll(".comment-indicator");
      expect(all_indicators.length).toBe(1);
    });
  });

  describe("get_comments", () => {
    test("returns loaded comments", () => {
      const comments: Comment[] = [
        {
          id: "c1",
          heading_text: "Title",
          content: "My comment",
          created_at: "2024-01-01T00:00:00Z",
        },
      ];

      manager.load_comments(comments);

      const result = manager.get_comments();
      expect(result).toEqual(comments);
    });

    test("returns empty array when no comments loaded", () => {
      const result = manager.get_comments();
      expect(result).toEqual([]);
    });

    test("returns a copy (not the internal array)", () => {
      manager.load_comments([
        {
          id: "c1",
          heading_text: "Title",
          content: "Comment",
          created_at: "2024-01-01T00:00:00Z",
        },
      ]);

      const result = manager.get_comments();
      result.push({
        id: "c_extra",
        heading_text: "Extra",
        content: "Should not affect internal state",
        created_at: "2024-02-01T00:00:00Z",
      });

      expect(manager.get_comments().length).toBe(1);
    });
  });

  describe("destroy", () => {
    test("clears all comments", () => {
      manager.load_comments([
        {
          id: "c1",
          heading_text: "Title",
          content: "Comment",
          created_at: "2024-01-01T00:00:00Z",
        },
      ]);

      manager.destroy();

      expect(manager.get_comments().length).toBe(0);
    });

    test("removes all indicators from the DOM", () => {
      const markdown_body = document.createElement("div");
      markdown_body.className = "markdown-body";
      markdown_body.innerHTML = "<h1>Title</h1><h2>Section</h2>";
      editor_container.appendChild(markdown_body);

      manager.attach_to_headings(markdown_body);

      expect(document.querySelectorAll(".comment-indicator").length).toBe(2);

      manager.destroy();

      expect(document.querySelectorAll(".comment-indicator").length).toBe(0);
    });

    test("removes all open panels from the DOM", () => {
      const markdown_body = document.createElement("div");
      markdown_body.className = "markdown-body";
      markdown_body.innerHTML = "<h1>Title</h1>";
      editor_container.appendChild(markdown_body);

      manager.attach_to_headings(markdown_body);

      // Open a panel
      const indicator = markdown_body.querySelector(".comment-indicator") as HTMLElement;
      indicator.click();

      expect(document.querySelectorAll(".comments-panel").length).toBe(1);

      manager.destroy();

      expect(document.querySelectorAll(".comments-panel").length).toBe(0);
    });

    test("can be called multiple times safely", () => {
      manager.destroy();
      expect(() => manager.destroy()).not.toThrow();
    });

    test("cleans up even when no headings were attached", () => {
      expect(() => manager.destroy()).not.toThrow();
      expect(manager.get_comments().length).toBe(0);
    });
  });
});
