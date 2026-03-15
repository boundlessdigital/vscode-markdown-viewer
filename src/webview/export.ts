import MarkdownIt from "markdown-it";
import { THEMES, type Theme } from "./themes";
import { post_message } from "./util/vscode_api";
import { strip_frontmatter } from "./util/frontmatter";

const md = new MarkdownIt({
  html: true,
  linkify: true,
  typographer: true,
  breaks: true,
});

function get_current_theme(): Theme {
  const theme_id = document.documentElement.dataset.theme || "light";
  return THEMES.find((t) => t.id === theme_id) || THEMES[0];
}

function build_standalone_html(markdown: string): string {
  const theme = get_current_theme();
  const rendered = md.render(strip_frontmatter(markdown));

  const css_vars = Object.entries(theme.vars)
    .map(([key, value]) => `  ${key}: ${value};`)
    .join("\n");

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Markdown Export</title>
  <style>
    :root {
${css_vars}
    }
    * { margin: 0; padding: 0; box-sizing: border-box; }
    html, body {
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", "Noto Sans", Helvetica, Arial, sans-serif;
      font-size: 16px; color: var(--text); background-color: var(--bg);
      -webkit-font-smoothing: antialiased;
    }
    .markdown-body {
      max-width: 720px; margin: 0 auto; padding: 56px 32px 96px;
      line-height: 1.72; color: var(--text); font-size: 15.5px; word-wrap: break-word;
    }
    .markdown-body h1 {
      font-size: 1.75em; font-weight: 700; color: var(--h1); margin-top: 0; margin-bottom: 20px;
      padding-bottom: 0.4em; border-bottom: 1px solid var(--heading-rule);
      line-height: 1.25; letter-spacing: -0.025em;
    }
    .markdown-body h2 {
      font-size: 1.35em; font-weight: 600; color: var(--h2); margin-top: 44px; margin-bottom: 14px;
      padding-bottom: 0.3em; border-bottom: 1px solid var(--heading-rule); line-height: 1.28;
    }
    .markdown-body h3 { font-size: 1.15em; font-weight: 600; color: var(--h3); margin-top: 36px; margin-bottom: 10px; }
    .markdown-body h4 { font-size: 1em; font-weight: 600; color: var(--h4); margin-top: 28px; margin-bottom: 8px; }
    .markdown-body h5 { font-size: 0.9em; font-weight: 500; color: var(--h5); margin-top: 24px; margin-bottom: 6px; }
    .markdown-body h6 { font-size: 0.85em; font-weight: 500; color: var(--h6); margin-top: 24px; margin-bottom: 6px; }
    .markdown-body p { margin-top: 0; margin-bottom: 16px; }
    .markdown-body a { color: var(--link); text-decoration: none; }
    .markdown-body a:hover { text-decoration: underline; }
    .markdown-body strong { font-weight: 600; color: var(--h3); }
    .markdown-body em { font-style: italic; }
    .markdown-body code {
      padding: 0.2em 0.4em; font-size: 84%; background: var(--code-bg);
      border-radius: 4px; font-family: "SF Mono", Menlo, Consolas, monospace; color: var(--code-text);
    }
    .markdown-body pre {
      padding: 16px 18px; overflow: auto; font-size: 13px; line-height: 1.55;
      background: var(--code-block-bg); border-radius: 6px; margin-bottom: 16px; border: 1px solid var(--border);
    }
    .markdown-body pre code { padding: 0; background: transparent; font-size: 100%; border: none; color: var(--text); }
    .markdown-body blockquote {
      margin: 0 0 16px 0; padding: 0 1em; color: var(--blockquote-text);
      border-left: 3px solid var(--blockquote-border);
    }
    .markdown-body blockquote p:last-child { margin-bottom: 0; }
    .markdown-body ul, .markdown-body ol { margin: 0 0 16px; padding-left: 2em; }
    .markdown-body li { margin-top: 3px; line-height: 1.72; }
    .markdown-body img { max-width: 100%; border-radius: 6px; }
    .markdown-body table { border-collapse: collapse; margin-bottom: 16px; font-size: 14px; }
    .markdown-body table th, .markdown-body table td { padding: 8px 14px; border: 1px solid var(--border); }
    .markdown-body table th { font-weight: 600; color: var(--h4); background: var(--bg-secondary); font-size: 13px; }
    .markdown-body table tr:nth-child(2n) { background: var(--bg-secondary); }
    .markdown-body hr { margin: 32px 0; border: 0; border-bottom: 1px solid var(--border); }
    @media print { .markdown-body { padding: 24px; } }
  </style>
</head>
<body>
  <div class="markdown-body">
${rendered}
  </div>
</body>
</html>`;
}

export function export_html(markdown: string): void {
  const html = build_standalone_html(markdown);
  post_message("export", { format: "html", content: html });
}

export function export_pdf(markdown: string): void {
  const html = build_standalone_html(markdown);
  post_message("export", { format: "pdf", content: html });
}
