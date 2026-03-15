import { test, expect, describe } from "bun:test";
import { calculate_reading_time } from "../../src/webview/reading/reading_time";

describe("calculate_reading_time", () => {
  test("returns '< 1 min read' for empty string", () => {
    expect(calculate_reading_time("")).toBe("< 1 min read");
  });

  test("returns '< 1 min read' for whitespace-only string", () => {
    expect(calculate_reading_time("   \n\t  ")).toBe("< 1 min read");
  });

  test("returns '1 min read' for short text under 200 words", () => {
    const short_text = Array(50).fill("word").join(" ");
    expect(calculate_reading_time(short_text)).toBe("1 min read");
  });

  test("returns '2 min read' for ~400 words", () => {
    const medium_text = Array(400).fill("word").join(" ");
    expect(calculate_reading_time(medium_text)).toBe("2 min read");
  });

  test("returns '1 min read' for exactly 200 words", () => {
    const exact_text = Array(200).fill("word").join(" ");
    expect(calculate_reading_time(exact_text)).toBe("1 min read");
  });

  test("returns '2 min read' for 201 words (ceil behavior)", () => {
    const text = Array(201).fill("word").join(" ");
    expect(calculate_reading_time(text)).toBe("2 min read");
  });

  test("returns correct time for long text (~1000 words)", () => {
    const long_text = Array(1000).fill("word").join(" ");
    expect(calculate_reading_time(long_text)).toBe("5 min read");
  });

  test("counts words even when surrounded by markdown syntax", () => {
    const markdown = `# Heading

This is **bold** and *italic* text.

- List item one
- List item two

\`\`\`
code block
\`\`\`

[link](http://example.com)`;

    const result = calculate_reading_time(markdown);
    expect(result).toBe("1 min read");
  });

  test("handles text with multiple spaces and newlines", () => {
    const text = "word1   word2\n\nword3\t\tword4";
    // 4 words -> ceil(4/200) = 1
    expect(calculate_reading_time(text)).toBe("1 min read");
  });

  test("handles large documents correctly", () => {
    const large_text = Array(2000).fill("word").join(" ");
    expect(calculate_reading_time(large_text)).toBe("10 min read");
  });
});
