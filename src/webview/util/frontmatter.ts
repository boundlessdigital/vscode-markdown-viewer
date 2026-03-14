const FRONTMATTER_RE = /^---\r?\n[\s\S]*?\r?\n---\r?\n?/;

export function strip_frontmatter(markdown: string): string {
  return markdown.replace(FRONTMATTER_RE, "");
}
