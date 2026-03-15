# Markdown Viewer for VSCode

A polished, themeable Markdown viewer and editor for Visual Studio Code. Replaces the default text editor with a beautifully rendered preview, with optional WYSIWYG editing and a rich set of features for reading, writing, and collaborating on Markdown documents.

## Features

### Preview & Editing

- **Preview Mode** — Opens `.md` files in a clean, rendered preview by default. Typography uses a refined grayscale heading hierarchy with proper spacing.
- **Rich Text Editing** — Switch to Rich Edit mode for full WYSIWYG editing powered by [Milkdown](https://milkdown.dev/) (ProseMirror-based). Bold, italic, headings, links, images, lists, blockquotes, code blocks, tables, slash commands. All edits save back as clean Markdown.
- **Font Size Controls** — Quick A−/A+ buttons in the toolbar to adjust reading size.

### Rendering

- **Syntax Highlighting** — Code blocks are highlighted using [highlight.js](https://highlightjs.org/) with language auto-detection.
- **Mermaid Diagrams** — ` ```mermaid ` code blocks render as interactive SVG diagrams.
- **KaTeX Math** — Inline `$...$` and display `$$...$$` math expressions render with [KaTeX](https://katex.org/).
- **YAML Frontmatter** — Frontmatter blocks are stripped from the preview while preserved in the source.

### Navigation & Search

- **Table of Contents** — Click "TOC" in the toolbar to open a sidebar with all headings. Click to jump, current section highlights as you scroll.
- **In-Preview Search** — `Cmd+F` / `Ctrl+F` opens a search overlay that finds and highlights matches in the rendered text, with match count and arrow navigation.
- **Linked File Preview** — Hover over a link to another `.md` file to see a floating preview of its rendered content.

### Themes

Five built-in themes, switchable from the toolbar:

- **Light** — Clean white with charcoal typography
- **Dark** — Deep dark with subtle contrast
- **Sepia** — Warm, book-like reading experience
- **Nord** — Cool-toned dark palette
- **Ocean** — Calming light blue

Theme preference persists across files and VSCode windows.

### Images

- **Drag and Drop** — Drop an image file onto the preview. It saves to an `images/` folder in your project and inserts the Markdown reference.
- **Paste from Clipboard** — Paste a screenshot and it auto-saves the same way.

### Collaboration

- **Comments / Annotations** — Click the speech bubble icon next to any heading to add notes. Comments are stored in a `.comments.json` file alongside the Markdown and don't pollute the source. Click away to dismiss.
- **Git Diff View** — Click "Diff" in the toolbar to highlight what changed since the last git commit — green for additions, red for removals.

### Export

- **Export HTML** — Saves a standalone `.html` file with all styles baked in. Looks identical to the preview.
- **Print / PDF** — Opens the rendered document in your browser for printing or saving as PDF.

### Settings

Click the gear icon in the toolbar to access:

- **Claude Code Integration** — Opens a native text editor alongside the preview. Selections in the preview are mapped back to source, allowing Claude Code to detect the active file and selected text.
- **Spell Check** — Enables browser spell checking in the editor.
- **Custom CSS** — Provide a path to a `.css` file to apply on top of any theme.

### Other

- **File Path Bar** — Subtle status bar at the bottom with the full file path and a one-click copy button.
- **Persistent Preferences** — Theme, mode, font size, and settings persist across files and VSCode windows via global state.

## Installation

### From `.vsix` file

```bash
# Clone and build
git clone https://github.com/boundlessdigital/vscode-markdown-viewer.git
cd vscode-markdown-viewer
bun install
bun run build
npx @vscode/vsce package --allow-missing-repository

# Install
code --install-extension vscode-markdown-viewer-0.1.0.vsix
```

Or in VSCode: `Cmd+Shift+P` → "Extensions: Install from VSIX..." → select the file.

### From source (development)

```bash
git clone https://github.com/boundlessdigital/vscode-markdown-viewer.git
cd vscode-markdown-viewer
bun install
bun run build
```

Open the project in VSCode, then `Cmd+Shift+P` → "Debug: Select and Start Debugging" → "Run Extension".

## Keyboard Shortcuts

| Shortcut | Action |
|----------|--------|
| `Cmd+Shift+M` / `Ctrl+Shift+M` | Cycle between viewing modes |
| `Cmd+F` / `Ctrl+F` | Search within the preview |
| `Cmd+S` / `Ctrl+S` | Save (works in all modes) |

## Architecture

The extension uses VSCode's `CustomTextEditorProvider` API with two runtime environments:

- **Extension Host** (Node.js) — Manages the `TextDocument`, file I/O, bidirectional sync, export, git diff, image saving, comments persistence, and linked file reading.
- **Webview** (Browser) — Renders Preview (markdown-it + highlight.js + mermaid + KaTeX) and Rich Edit (Milkdown Crepe) modes. Handles themes, toolbar, TOC, search, comments UI, link preview, and selection detection.

### Key Libraries

- [markdown-it](https://github.com/markdown-it/markdown-it) — Markdown → HTML
- [Milkdown](https://milkdown.dev/) — WYSIWYG editor (ProseMirror + remark)
- [highlight.js](https://highlightjs.org/) — Syntax highlighting
- [mermaid](https://mermaid.js.org/) — Diagram rendering
- [KaTeX](https://katex.org/) — Math rendering
- [diff](https://github.com/kpdecker/jsdiff) — Git diff computation
- [Bun](https://bun.sh/) — Build tooling and package management

## License

MIT
