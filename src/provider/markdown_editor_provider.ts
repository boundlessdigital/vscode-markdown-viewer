import * as vscode from "vscode";
import * as os from "os";
import * as path from "path";
import * as fs from "fs";

const STATE_KEY_MODE = "markdownViewer.mode";
const STATE_KEY_THEME = "markdownViewer.theme";
const STATE_KEY_SOURCE_SYNC = "markdownViewer.sourceSync";

export class MarkdownEditorProvider implements vscode.CustomTextEditorProvider {
  public static readonly VIEW_TYPE = "markdownViewer.editor";

  private static readonly DEBOUNCE_MS = 50;

  constructor(private readonly context: vscode.ExtensionContext) {}

  public static register(
    context: vscode.ExtensionContext
  ): vscode.Disposable {
    const provider = new MarkdownEditorProvider(context);

    const provider_registration =
      vscode.window.registerCustomEditorProvider(
        MarkdownEditorProvider.VIEW_TYPE,
        provider,
        {
          webviewOptions: {
            retainContextWhenHidden: true,
          },
        }
      );

    const toggle_command = vscode.commands.registerCommand(
      "markdownViewer.toggleMode",
      () => {
        vscode.commands.executeCommand(
          "workbench.action.webview.postMessage",
          { type: "set_mode", mode: "next" }
        );
      }
    );

    return vscode.Disposable.from(provider_registration, toggle_command);
  }

  public async resolveCustomTextEditor(
    document: vscode.TextDocument,
    webview_panel: vscode.WebviewPanel,
    _token: vscode.CancellationToken
  ): Promise<void> {
    const webview = webview_panel.webview;

    webview.options = {
      enableScripts: true,
      localResourceRoots: [
        vscode.Uri.joinPath(this.context.extensionUri, "out", "webview"),
      ],
    };

    webview.html = this.get_html(webview);

    let is_updating_from_webview = false;
    let debounce_timer: ReturnType<typeof setTimeout> | undefined;
    let source_editor: vscode.TextEditor | undefined;

    const change_subscription = vscode.workspace.onDidChangeTextDocument(
      (e) => {
        if (e.document.uri.toString() !== document.uri.toString()) return;
        if (is_updating_from_webview) {
          is_updating_from_webview = false;
          return;
        }
        if (debounce_timer) clearTimeout(debounce_timer);
        debounce_timer = setTimeout(() => {
          webview.postMessage({ type: "update", text: document.getText() });
        }, MarkdownEditorProvider.DEBOUNCE_MS);
      }
    );

    const message_subscription = webview.onDidReceiveMessage(
      async (message) => {
        switch (message.type) {
          case "ready": {
            const comments = this.load_comments(document);
            webview.postMessage({
              type: "init",
              text: document.getText(),
              mode: this.context.globalState.get<string>(STATE_KEY_MODE, "preview"),
              theme: this.context.globalState.get<string>(STATE_KEY_THEME, "light"),
              file_path: document.uri.fsPath,
              source_sync: this.context.globalState.get<boolean>(STATE_KEY_SOURCE_SYNC, false),
              comments,
              annotations: this.load_json_file(document, ".annotations.json"),
            });
            break;
          }

          case "update_document": {
            const new_text = message.markdown as string;
            if (new_text === document.getText()) return;
            is_updating_from_webview = true;
            const edit = new vscode.WorkspaceEdit();
            edit.replace(
              document.uri,
              new vscode.Range(
                document.positionAt(0),
                document.positionAt(document.getText().length)
              ),
              new_text
            );
            vscode.workspace.applyEdit(edit);
            break;
          }

          case "insert_text": {
            const text = message.text as string;
            const current = document.getText();
            is_updating_from_webview = true;
            const edit = new vscode.WorkspaceEdit();
            edit.insert(document.uri, document.positionAt(current.length), "\n" + text + "\n");
            await vscode.workspace.applyEdit(edit);
            break;
          }

          case "persist_mode":
            await this.context.globalState.update(STATE_KEY_MODE, message.mode);
            break;

          case "persist_theme":
            await this.context.globalState.update(STATE_KEY_THEME, message.theme);
            break;

          case "persist_settings":
            if (message.settings) {
              await this.context.globalState.update(STATE_KEY_SOURCE_SYNC, message.settings.source_sync ?? false);
            }
            break;

          case "export":
            await this.handle_export(message.format as string, message.content as string, document);
            break;

          case "selection_changed":
            this.sync_selection_to_source_editor(document, message.text as string, source_editor);
            break;

          case "open_source_editor":
            source_editor = await this.open_source_editor(document, webview_panel);
            break;

          case "selection_cleared":
            if (source_editor) {
              const pos = source_editor.selection.active;
              source_editor.selection = new vscode.Selection(pos, pos);
            }
            break;

          case "get_git_diff":
            await this.send_git_diff(document, webview);
            break;

          case "save_image":
            await this.save_image(document, message.name as string, message.data_base64 as string, webview);
            break;

          case "save_comments":
            this.persist_comments(document, message.comments);
            break;

          case "load_custom_css":
            await this.load_custom_css(message.path as string, webview);
            break;

          case "save_annotations":
            this.save_json_file(document, ".annotations.json", message.annotations);
            break;

          case "save_bookmarks":
            await this.context.globalState.update(
              `bookmarks:${document.uri.fsPath}`,
              message.bookmarks
            );
            break;

          case "read_linked_file":
            await this.read_linked_file(document, message.href as string, webview);
            break;
        }
      }
    );

    webview_panel.onDidDispose(() => {
      change_subscription.dispose();
      message_subscription.dispose();
      if (debounce_timer) clearTimeout(debounce_timer);
    });
  }

  private async send_git_diff(
    document: vscode.TextDocument,
    webview: vscode.Webview
  ): Promise<void> {
    try {
      const file_path = document.uri.fsPath;
      const { execSync } = require("child_process");
      const dir = path.dirname(file_path);
      const result = execSync(`git show HEAD:${path.relative(dir, file_path).replace(/\\/g, "/")}`, {
        cwd: dir,
        encoding: "utf-8",
        timeout: 5000,
      });
      webview.postMessage({ type: "git_diff_result", text: result });
    } catch {
      webview.postMessage({ type: "git_diff_result", text: "" });
    }
  }

  private async save_image(
    document: vscode.TextDocument,
    name: string,
    data_base64: string,
    webview: vscode.Webview
  ): Promise<void> {
    try {
      const dir = path.dirname(document.uri.fsPath);
      const images_dir = path.join(dir, "images");
      if (!fs.existsSync(images_dir)) {
        fs.mkdirSync(images_dir, { recursive: true });
      }
      const safe_name = name.replace(/[^a-zA-Z0-9._-]/g, "_");
      const file_path = path.join(images_dir, safe_name);
      const buffer = Buffer.from(data_base64, "base64");
      fs.writeFileSync(file_path, buffer);
      webview.postMessage({ type: "image_saved", path: `images/${safe_name}` });
    } catch (e) {
      vscode.window.showErrorMessage(`Failed to save image: ${e}`);
    }
  }

  private load_json_file(document: vscode.TextDocument, suffix: string): any[] {
    try {
      const p = document.uri.fsPath + suffix;
      if (fs.existsSync(p)) return JSON.parse(fs.readFileSync(p, "utf-8"));
    } catch { /* ignore */ }
    return [];
  }

  private save_json_file(document: vscode.TextDocument, suffix: string, data: any[]): void {
    try {
      const p = document.uri.fsPath + suffix;
      if (!data || data.length === 0) {
        if (fs.existsSync(p)) fs.unlinkSync(p);
      } else {
        fs.writeFileSync(p, JSON.stringify(data, null, 2), "utf-8");
      }
    } catch { /* ignore */ }
  }

  private load_comments(document: vscode.TextDocument): any[] {
    try {
      const comments_path = document.uri.fsPath + ".comments.json";
      if (fs.existsSync(comments_path)) {
        return JSON.parse(fs.readFileSync(comments_path, "utf-8"));
      }
    } catch { /* ignore */ }
    return [];
  }

  private persist_comments(document: vscode.TextDocument, comments: any[]): void {
    try {
      const comments_path = document.uri.fsPath + ".comments.json";
      if (comments.length === 0) {
        if (fs.existsSync(comments_path)) fs.unlinkSync(comments_path);
      } else {
        fs.writeFileSync(comments_path, JSON.stringify(comments, null, 2), "utf-8");
      }
    } catch { /* ignore */ }
  }

  private async read_linked_file(
    document: vscode.TextDocument,
    href: string,
    webview: vscode.Webview
  ): Promise<void> {
    try {
      const dir = path.dirname(document.uri.fsPath);
      const file_path = path.resolve(dir, href);
      if (fs.existsSync(file_path)) {
        const content = fs.readFileSync(file_path, "utf-8");
        const file_name = path.basename(file_path);
        webview.postMessage({ type: "link_preview_content", content, file_name });
      }
    } catch { /* ignore */ }
  }

  private async load_custom_css(css_path: string, webview: vscode.Webview): Promise<void> {
    try {
      if (fs.existsSync(css_path)) {
        const css = fs.readFileSync(css_path, "utf-8");
        webview.postMessage({ type: "custom_css_loaded", css });
      }
    } catch { /* ignore */ }
  }

  private async open_source_editor(
    document: vscode.TextDocument,
    webview_panel: vscode.WebviewPanel
  ): Promise<vscode.TextEditor | undefined> {
    try {
      const editor = await vscode.window.showTextDocument(document, {
        viewColumn: vscode.ViewColumn.Beside,
        preserveFocus: true,
        preview: false,
      });
      webview_panel.reveal(webview_panel.viewColumn, false);
      return editor;
    } catch {
      return undefined;
    }
  }

  private strip_md(line: string): string {
    return line
      .replace(/^#{1,6}\s+/, "")
      .replace(/^[\s>]*[-*+]\s+/, "")
      .replace(/^[\s>]*\d+\.\s+/, "")
      .replace(/^>\s*/, "")
      .replace(/\*\*(.+?)\*\*/g, "$1")
      .replace(/\*(.+?)\*/g, "$1")
      .replace(/__(.+?)__/g, "$1")
      .replace(/_(.+?)_/g, "$1")
      .replace(/`(.+?)`/g, "$1")
      .replace(/\[(.+?)\]\(.+?\)/g, "$1")
      .trim();
  }

  private sync_selection_to_source_editor(
    document: vscode.TextDocument,
    selected_text: string,
    source_editor: vscode.TextEditor | undefined
  ): void {
    if (!selected_text || !source_editor) return;
    if (source_editor.document.uri.toString() !== document.uri.toString()) return;

    const source = document.getText();
    const exact_idx = source.indexOf(selected_text);
    if (exact_idx !== -1) {
      const start = document.positionAt(exact_idx);
      const end = document.positionAt(exact_idx + selected_text.length);
      source_editor.selection = new vscode.Selection(start, end);
      source_editor.revealRange(new vscode.Range(start, end), vscode.TextEditorRevealType.InCenter);
      return;
    }

    const sel_lines = selected_text.split("\n").map((l) => l.trim()).filter((l) => l.length > 0);
    if (sel_lines.length === 0) return;

    const src_lines = source.split("\n");
    const first_sel = sel_lines[0];
    let best_start = -1;
    let best_score = 0;

    for (let i = 0; i < src_lines.length; i++) {
      const stripped = this.strip_md(src_lines[i]);
      if (stripped.length === 0) continue;
      if (first_sel.includes(stripped) || stripped.includes(first_sel)) {
        const score = Math.min(stripped.length, first_sel.length);
        if (score > best_score) {
          best_score = score;
          best_start = i;
        }
      }
    }

    if (best_start === -1) return;

    let best_end = best_start;
    if (sel_lines.length > 1) {
      const last_sel = sel_lines[sel_lines.length - 1];
      for (let i = best_start + 1; i < Math.min(best_start + sel_lines.length + 10, src_lines.length); i++) {
        const stripped = this.strip_md(src_lines[i]);
        if (stripped.length > 0 && (last_sel.includes(stripped) || stripped.includes(last_sel))) {
          best_end = i;
          break;
        }
      }
      if (best_end === best_start) {
        best_end = Math.min(best_start + sel_lines.length - 1, src_lines.length - 1);
      }
    }

    const start = new vscode.Position(best_start, 0);
    const end = new vscode.Position(best_end, src_lines[best_end].length);
    source_editor.selection = new vscode.Selection(start, end);
    source_editor.revealRange(new vscode.Range(start, end), vscode.TextEditorRevealType.InCenter);
  }

  private async handle_export(
    format: string,
    html_content: string,
    document: vscode.TextDocument
  ): Promise<void> {
    const base_name = document.uri.path.split("/").pop()?.replace(/\.md$/i, "") || "document";

    if (format === "html") {
      const uri = await vscode.window.showSaveDialog({
        defaultUri: vscode.Uri.file(`${base_name}.html`),
        filters: { "HTML Files": ["html"] },
      });
      if (uri) {
        await vscode.workspace.fs.writeFile(uri, Buffer.from(html_content, "utf-8"));
        vscode.window.showInformationMessage(`Exported to ${uri.fsPath}`);
      }
    } else if (format === "pdf") {
      const tmp_path = path.join(os.tmpdir(), `${base_name}_print.html`);
      fs.writeFileSync(tmp_path, html_content, "utf-8");
      await vscode.env.openExternal(vscode.Uri.file(tmp_path));
      vscode.window.showInformationMessage("Opened in browser. Use Cmd+P / Ctrl+P to print or save as PDF.");
    }
  }

  private get_html(webview: vscode.Webview): string {
    const script_uri = webview.asWebviewUri(
      vscode.Uri.joinPath(this.context.extensionUri, "out", "webview", "main.js")
    );
    const style_uri = webview.asWebviewUri(
      vscode.Uri.joinPath(this.context.extensionUri, "out", "webview", "main.css")
    );
    const nonce = get_nonce();

    return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src ${webview.cspSource} 'unsafe-inline'; script-src 'nonce-${nonce}'; font-src ${webview.cspSource}; img-src ${webview.cspSource} https: data:;">
  <link href="${style_uri}" rel="stylesheet">
  <title>Markdown Viewer</title>
</head>
<body>
  <div id="editor-container"></div>
  <script nonce="${nonce}" src="${script_uri}"></script>
</body>
</html>`;
  }
}

function get_nonce(): string {
  let text = "";
  const possible = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
  for (let i = 0; i < 32; i++) {
    text += possible.charAt(Math.floor(Math.random() * possible.length));
  }
  return text;
}
