import * as vscode from 'vscode';
import { FileDiff, Hunk } from '../diff/types';

export class DiffPreviewPanel {
  public static currentPanel: DiffPreviewPanel | undefined;
  private readonly panel: vscode.WebviewPanel;
  private readonly extensionUri: vscode.Uri;
  private currentFileDiff: FileDiff | undefined;
  private currentHunk: Hunk | undefined;

  private constructor(
    extensionUri: vscode.Uri,
    column: vscode.ViewColumn
  ) {
    this.extensionUri = extensionUri;

    this.panel = vscode.window.createWebviewPanel(
      'diffPreview',
      'Diff Preview',
      column,
      {
        enableScripts: true,
        retainContextWhenHidden: true
      }
    );

    this.panel.webview.html = this.getHtmlForWebview('');
  }

  public static createOrShow(extensionUri: vscode.Uri, fileDiff: FileDiff, hunk?: Hunk) {
    const column = vscode.window.activeTextEditor
      ? vscode.window.activeTextEditor.viewColumn
      : vscode.ViewColumn.One;

    // 处理 undefined 的情况
    const safeColumn = column ?? vscode.ViewColumn.One;

    if (DiffPreviewPanel.currentPanel) {
      DiffPreviewPanel.currentPanel.panel.reveal(safeColumn);
      DiffPreviewPanel.currentPanel.updateContent(fileDiff, hunk);
      return;
    }

    DiffPreviewPanel.currentPanel = new DiffPreviewPanel(extensionUri, safeColumn);
    DiffPreviewPanel.currentPanel.updateContent(fileDiff, hunk);
  }

  private updateContent(fileDiff: FileDiff, hunk?: Hunk) {
    this.currentFileDiff = fileDiff;
    this.currentHunk = hunk;

    let content: string;
    if (hunk) {
      // 只显示选中的 hunk
      content = this.renderHunk(hunk);
    } else {
      // 显示文件的所有 hunks
      content = fileDiff.hunks.map(h => this.renderHunk(h)).join('\n');
    }
    this.panel.webview.html = this.getHtmlForWebview(content);
  }

  private renderHunk(hunk: Hunk): string {
    return `<div class="hunk">
      <div class="hunk-header">${hunk.header}</div>
      <pre class="hunk-content">${hunk.content}</pre>
    </div>`;
  }

  private getHtmlForWebview(content: string): string {
    return `<!DOCTYPE html>
      <html>
        <head>
          <style>
            body { padding: 10px; font-family: monospace; }
            .hunk { margin-bottom: 20px; }
            .hunk-header { color: #666; background: #f5f5f5; padding: 5px; }
            .hunk-content { white-space: pre-wrap; }
            pre { margin: 0; }
          </style>
        </head>
        <body>
          ${content || '<p>Select a hunk to view details</p>'}
        </body>
      </html>`;
  }

  public dispose() {
    DiffPreviewPanel.currentPanel = undefined;
    this.panel.dispose();
  }
}
