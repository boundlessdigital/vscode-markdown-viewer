import * as vscode from "vscode";
import { MarkdownEditorProvider } from "./provider/markdown_editor_provider";

export function activate(context: vscode.ExtensionContext) {
  context.subscriptions.push(MarkdownEditorProvider.register(context));
}

export function deactivate() {}
