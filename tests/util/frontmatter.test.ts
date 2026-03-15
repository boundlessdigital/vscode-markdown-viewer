import { test, expect, describe } from "bun:test";
import { strip_frontmatter } from "../../src/webview/util/frontmatter";

describe("strip_frontmatter", () => {
  test("strips standard YAML frontmatter", () => {
    const input = `---
title: Hello World
date: 2024-01-01
---
# My Document

Some content here.`;

    const result = strip_frontmatter(input);
    expect(result).toBe(`# My Document

Some content here.`);
  });

  test("returns unchanged content when there is no frontmatter", () => {
    const input = `# Just a heading

Some regular markdown content.`;

    const result = strip_frontmatter(input);
    expect(result).toBe(input);
  });

  test("does not strip empty frontmatter (no content between delimiters)", () => {
    // The regex requires at least a newline of content between --- delimiters,
    // so ---\n--- does not match as frontmatter
    const input = `---
---
Content after empty frontmatter.`;

    const result = strip_frontmatter(input);
    expect(result).toBe(input);
  });

  test("strips frontmatter with only whitespace content", () => {
    const input = `---

---
Content after whitespace frontmatter.`;

    const result = strip_frontmatter(input);
    expect(result).toBe("Content after whitespace frontmatter.");
  });

  test("strips frontmatter with various content types", () => {
    const input = `---
title: Test
tags: [a, b, c]
nested:
  key: value
  list:
    - item1
    - item2
number: 42
boolean: true
---
Body content.`;

    const result = strip_frontmatter(input);
    expect(result).toBe("Body content.");
  });

  test("preserves all content after frontmatter", () => {
    const input = `---
title: Test
---
# Heading 1

Paragraph one.

## Heading 2

Paragraph two.

- List item 1
- List item 2`;

    const result = strip_frontmatter(input);
    expect(result).toBe(`# Heading 1

Paragraph one.

## Heading 2

Paragraph two.

- List item 1
- List item 2`);
  });

  test("does not strip frontmatter that is not at the start of the file", () => {
    const input = `Some content first.

---
title: Not frontmatter
---

More content.`;

    const result = strip_frontmatter(input);
    expect(result).toBe(input);
  });

  test("handles frontmatter with Windows-style line endings", () => {
    const input = "---\r\ntitle: Test\r\n---\r\nContent here.";

    const result = strip_frontmatter(input);
    expect(result).toBe("Content here.");
  });

  test("handles frontmatter with multiline string values", () => {
    const input = `---
description: |
  This is a long
  multiline description
---
# Document`;

    const result = strip_frontmatter(input);
    expect(result).toBe("# Document");
  });
});
