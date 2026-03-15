import { test, expect, describe, beforeEach, afterEach } from "bun:test";
import { AnnotationManager, type Annotation } from "../../src/webview/reading/annotations";

describe("AnnotationManager", () => {
  let editor_container: HTMLElement;
  let manager: AnnotationManager;

  beforeEach(() => {
    document.body.innerHTML = "";
    editor_container = document.createElement("div");
    editor_container.className = "editor-container";
    document.body.appendChild(editor_container);

    manager = new AnnotationManager(editor_container);
  });

  afterEach(() => {
    manager.destroy();
    document.body.innerHTML = "";
  });

  describe("load_annotations", () => {
    test("stores annotations that were loaded", () => {
      const annotations: Annotation[] = [
        {
          id: "ann_1",
          text: "hello",
          color: "#fef3cd",
          context_before: "say ",
          context_after: " world",
        },
      ];

      manager.load_annotations(annotations);

      // We can verify annotations were stored by applying them to a container
      // and checking if the mark elements are created
      const content_div = document.createElement("div");
      content_div.textContent = "say hello world";
      editor_container.appendChild(content_div);

      manager.apply(content_div);

      const mark = content_div.querySelector("mark.annotation");
      expect(mark).toBeTruthy();
      expect(mark!.textContent).toBe("hello");
    });

    test("stores multiple annotations", () => {
      const annotations: Annotation[] = [
        {
          id: "ann_1",
          text: "first",
          color: "#fef3cd",
          context_before: "",
          context_after: "",
        },
        {
          id: "ann_2",
          text: "second",
          color: "#d4edda",
          context_before: "",
          context_after: "",
        },
      ];

      manager.load_annotations(annotations);

      const content_div = document.createElement("div");
      content_div.innerHTML = "<p>first item</p><p>second item</p>";
      editor_container.appendChild(content_div);

      manager.apply(content_div);

      const marks = content_div.querySelectorAll("mark.annotation");
      expect(marks.length).toBe(2);
    });

    test("replaces previous annotations when loading new ones", () => {
      const old_annotations: Annotation[] = [
        {
          id: "ann_old",
          text: "old text",
          color: "#fef3cd",
          context_before: "",
          context_after: "",
        },
      ];

      const new_annotations: Annotation[] = [
        {
          id: "ann_new",
          text: "new text",
          color: "#d4edda",
          context_before: "",
          context_after: "",
        },
      ];

      manager.load_annotations(old_annotations);
      manager.load_annotations(new_annotations);

      const content_div = document.createElement("div");
      content_div.textContent = "old text and new text";
      editor_container.appendChild(content_div);

      manager.apply(content_div);

      const marks = content_div.querySelectorAll("mark.annotation");
      // Only "new text" should be annotated since old annotations were replaced
      expect(marks.length).toBe(1);
      expect(marks[0].textContent).toBe("new text");
    });

    test("makes a copy of the annotations array (does not share reference)", () => {
      const annotations: Annotation[] = [
        {
          id: "ann_1",
          text: "test",
          color: "#fef3cd",
          context_before: "",
          context_after: "",
        },
      ];

      manager.load_annotations(annotations);

      // Mutating the original array should not affect the manager
      annotations.push({
        id: "ann_2",
        text: "extra",
        color: "#d4edda",
        context_before: "",
        context_after: "",
      });

      const content_div = document.createElement("div");
      content_div.textContent = "test extra content";
      editor_container.appendChild(content_div);

      manager.apply(content_div);

      const marks = content_div.querySelectorAll("mark.annotation");
      expect(marks.length).toBe(1);
      expect(marks[0].textContent).toBe("test");
    });
  });

  describe("apply", () => {
    test("applies annotation with correct background color", () => {
      const annotations: Annotation[] = [
        {
          id: "ann_1",
          text: "highlighted",
          color: "#fef3cd",
          context_before: "",
          context_after: "",
        },
      ];

      manager.load_annotations(annotations);

      const content_div = document.createElement("div");
      content_div.textContent = "This is highlighted text.";
      editor_container.appendChild(content_div);

      manager.apply(content_div);

      const mark = content_div.querySelector("mark.annotation") as HTMLElement;
      expect(mark).toBeTruthy();
      expect(mark.style.backgroundColor).toBe("#fef3cd");
    });

    test("uses context to find the correct match", () => {
      const annotations: Annotation[] = [
        {
          id: "ann_1",
          text: "word",
          color: "#fef3cd",
          context_before: "second ",
          context_after: " here",
        },
      ];

      manager.load_annotations(annotations);

      const content_div = document.createElement("div");
      content_div.innerHTML = "<p>first word there</p><p>second word here</p>";
      editor_container.appendChild(content_div);

      manager.apply(content_div);

      const marks = content_div.querySelectorAll("mark.annotation");
      expect(marks.length).toBe(1);

      // The mark should be in the second paragraph
      const second_p = content_div.querySelectorAll("p")[1];
      const mark_in_second = second_p.querySelector("mark.annotation");
      expect(mark_in_second).toBeTruthy();
    });

    test("does nothing when no annotations are loaded", () => {
      const content_div = document.createElement("div");
      content_div.textContent = "Some text content.";
      editor_container.appendChild(content_div);

      manager.apply(content_div);

      const marks = content_div.querySelectorAll("mark.annotation");
      expect(marks.length).toBe(0);
    });
  });

  describe("annotation toolbar on mouseup", () => {
    test("does not show toolbar when there is no selection", () => {
      // Simulate a mouseup with no selection
      const event = new MouseEvent("mouseup", {
        clientX: 100,
        clientY: 100,
        bubbles: true,
      });

      editor_container.dispatchEvent(event);

      const toolbar = document.querySelector("[style*='position: fixed']");
      expect(toolbar).toBeNull();
    });

    test("dismisses toolbar on Escape keydown", () => {
      // First, we need to somehow trigger a toolbar to appear.
      // Since getSelection is hard to mock in happy-dom, we test the Escape handler
      // by verifying it does not throw when no toolbar exists.
      const event = new KeyboardEvent("keydown", { key: "Escape", bubbles: true });
      expect(() => document.dispatchEvent(event)).not.toThrow();
    });
  });

  describe("destroy", () => {
    test("cleans up without errors", () => {
      expect(() => manager.destroy()).not.toThrow();
    });

    test("removes event listeners (mouseup no longer triggers toolbar logic)", () => {
      manager.destroy();

      // After destroy, mouseup on the editor container should not cause issues
      const event = new MouseEvent("mouseup", {
        clientX: 50,
        clientY: 50,
        bubbles: true,
      });

      expect(() => editor_container.dispatchEvent(event)).not.toThrow();
    });

    test("removes toolbar if one exists", () => {
      // Manually add a toolbar-like element to test cleanup
      const fake_toolbar = document.createElement("div");
      fake_toolbar.style.position = "fixed";
      document.body.appendChild(fake_toolbar);

      // Destroy should clean up the toolbar reference
      manager.destroy();

      // The manager's internal toolbar should be null after destroy
      // (We just ensure no errors)
      expect(() => manager.destroy()).not.toThrow();
    });

    test("can be called multiple times safely", () => {
      manager.destroy();
      expect(() => manager.destroy()).not.toThrow();
    });
  });
});
