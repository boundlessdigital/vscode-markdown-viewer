# Markdown Viewer for VSCode

A polished, themeable Markdown editor for Visual Studio Code that replaces the default text editor with a beautifully rendered preview — with optional rich text (WYSIWYG) editing, export capabilities, and Claude Code integration.

## Features

### Preview Mode
Opens `.md` files in a clean, rendered preview by default. Typography is carefully designed with a grayscale heading hierarchy, proper spacing, and antialiased rendering.

### Rich Text Editing
Switch to Rich Edit mode for full WYSIWYG markdown editing powered by [Milkdown](https://milkdown.dev/) (ProseMirror-based). Includes a toolbar with support for:
- Bold, italic, strikethrough
- Headings, links, images
- Ordered and unordered lists
- Blockquotes, code blocks, tables
- Slash commands and keyboard shortcuts

All edits are saved back as clean Markdown — no HTML conversion artifacts.

### Color Themes
Five built-in themes, switchable from the toolbar:
- **Light** — Clean white with charcoal typography
- **Dark** — Deep dark with subtle contrast
- **Sepia** — Warm, book-like reading experience
- **Nord** — Cool-toned dark palette
- **Ocean** — Calming light blue

Theme preference persists across files and VSCode windows.

### Export
- **Export HTML** — Saves a standalone `.html` file with all styles baked in. Looks identical to the preview.
- **Print / PDF** — Opens the rendered document in your browser for printing or saving as PDF via `Cmd+P` / `Ctrl+P`.

### YAML Frontmatter
Files with YAML frontmatter (common in static site generators, documentation systems, etc.) are handled gracefully — the frontmatter block is stripped from the preview while preserved in the underlying source.

### File Path Bar
A subtle status bar at the bottom shows the full file path with a one-click copy button.

### Claude Code Integration (Optional)
Enable via the gear icon in the toolbar. When turned on, the extension opens the same file in a native VSCode text editor alongside the preview. Text selections in the preview are mapped back to the source and highlighted in the native editor, allowing Claude Code (and other extensions) to detect the active file and selected text.

## Installation

### From `.vsix` file

1. Build the extension (see below)
2. Package it:
   ```bash
   npx @vscode/vsce package
   ```
3. Install the generated `.vsix` file:
   ```bash
   code --install-extension vscode-markdown-viewer-0.0.1.vsix
   ```
   Or in VSCode: `Cmd+Shift+P` → "Extensions: Install from VSIX..." → select the file.

### From source (development)

```bash
git clone https://github.com/boundlessdigital/vscode-markdown-viewer.git
cd vscode-markdown-viewer
bun install
bun run build
```

Then open the project in VSCode and press `F5` (or `Cmd+Shift+P` → "Debug: Select and Start Debugging" → "Run Extension") to launch the Extension Development Host.

## Building

The extension uses [Bun](https://bun.sh/) for package management and building.

```bash
# Install dependencies
bun install

# Build the extension (compiles TypeScript, bundles webview)
bun run build

# Package as .vsix for distribution
npx @vscode/vsce package
```

The build script (`build.ts`) produces two bundles:
- `out/extension.js` — Extension host code (Node.js target, CJS)
- `out/webview/main.js` + `out/webview/main.css` — Webview code (browser target)

## Architecture

The extension uses VSCode's `CustomTextEditorProvider` API with two runtime environments:

- **Extension Host** (Node.js): Manages the `TextDocument`, handles file I/O, bidirectional sync with the webview, export functionality, and Claude Code integration.
- **Webview** (Browser): Renders the UI with three modes — Preview (markdown-it), Rich Edit (Milkdown Crepe), and an internal Source mode. Handles theme application, toolbar, and selection detection.

### Key Libraries
- [markdown-it](https://github.com/markdown-it/markdown-it) — Markdown to HTML rendering
- [Milkdown](https://milkdown.dev/) (via Crepe API) — WYSIWYG editor (ProseMirror + remark)
- [Bun](https://bun.sh/) — Build tooling and package management

## Keyboard Shortcuts

| Shortcut | Action |
|----------|--------|
| `Cmd+Shift+M` / `Ctrl+Shift+M` | Cycle between viewing modes |
| `Cmd+S` / `Ctrl+S` | Save (works in all modes) |

## Configuration

All preferences (theme, viewing mode, Claude Code integration) are persisted via VSCode's global state and apply across all files and windows. No manual configuration files needed.

## License

MIT
