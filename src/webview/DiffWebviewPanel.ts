import * as vscode from 'vscode';
import { FileDiff, Hunk } from '../diff/types';
import { HunkActionHandler } from '../actions/HunkActionHandler';

export class DiffWebviewPanel {
  public static currentPanel: DiffWebviewPanel | undefined;
  private readonly extensionUri: vscode.Uri;
  private files: FileDiff[] = [];
  private actionHandler: HunkActionHandler;
  private panel: vscode.WebviewPanel | undefined;

  constructor(extensionUri: vscode.Uri) {
    this.extensionUri = extensionUri;
    this.actionHandler = new HunkActionHandler();
  }

  public static createOrShow(extensionUri: vscode.Uri, files: FileDiff[]) {
    if (DiffWebviewPanel.currentPanel) {
      DiffWebviewPanel.currentPanel.files = files;
      if (DiffWebviewPanel.currentPanel.panel?.visible) {
        DiffWebviewPanel.currentPanel.updateContent();
      } else {
        // 面板已关闭，重新创建
        DiffWebviewPanel.currentPanel.createPanel();
      }
      DiffWebviewPanel.currentPanel.panel?.reveal(vscode.ViewColumn.One);
      return;
    }

    DiffWebviewPanel.currentPanel = new DiffWebviewPanel(extensionUri);
    DiffWebviewPanel.currentPanel.files = files;
    DiffWebviewPanel.currentPanel.createPanel();
  }

  private createPanel() {
    this.panel = vscode.window.createWebviewPanel(
      'diffReview',
      'Diff Review',
      vscode.ViewColumn.One,
      { enableScripts: true, retainContextWhenHidden: true }
    );

    this.panel.onDidDispose(() => {
      this.panel = undefined;
    });

    this.panel.webview.onDidReceiveMessage(async (message) => {
      if (message.command === 'accept') {
        await this.handleAccept(message.filePath, message.hunkId);
      } else if (message.command === 'reject') {
        await this.handleReject(message.filePath, message.hunkId);
      } else if (message.command === 'refresh') {
        vscode.commands.executeCommand('extension.showDiffPanel');
      }
    });

    this.updateContent();
  }

  private updateContent() {
    if (!this.panel) return;
    this.panel.webview.html = this.getHtml();
  }

  private async handleAccept(filePath: string, hunkId: string) {
    const file = this.files.find(f => f.filePath === filePath);
    const hunk = file?.hunks.find(h => h.id === hunkId);
    if (file && hunk) {
      try {
        await this.actionHandler.acceptHunk(file, hunk);
        vscode.window.showInformationMessage(`Accepted: ${filePath}`);
        vscode.commands.executeCommand('extension.showDiffPanel');
      } catch (e: any) {
        vscode.window.showErrorMessage(`Error: ${e.message}`);
      }
    }
  }

  private async handleReject(filePath: string, hunkId: string) {
    const file = this.files.find(f => f.filePath === filePath);
    const hunk = file?.hunks.find(h => h.id === hunkId);
    if (file && hunk) {
      try {
        await this.actionHandler.rejectHunk(file, hunk);
        vscode.window.showInformationMessage(`Rejected: ${filePath}`);
        vscode.commands.executeCommand('extension.showDiffPanel');
      } catch (e: any) {
        vscode.window.showErrorMessage(`Error: ${e.message}`);
      }
    }
  }

  private getHtml(): string {
    if (this.files.length === 0) {
      return `<html><body><p>No changes found</p></body></html>`;
    }

    const filesHtml = this.files.map(file => {
      const hunksHtml = file.hunks.map(hunk => `
        <div class="hunk">
          <div class="hunk-header">${hunk.header}</div>
          <pre class="hunk-content">${this.escapeHtml(hunk.content)}</pre>
          <div class="actions">
            <button class="accept-btn" onclick="accept('${file.filePath}', '${hunk.id}')">✓ Accept</button>
            <button class="reject-btn" onclick="reject('${file.filePath}', '${hunk.id}')">✗ Reject</button>
          </div>
        </div>
      `).join('');

      return `
        <div class="file">
          <div class="file-header">${file.filePath} (${file.status})</div>
          ${hunksHtml}
        </div>
      `;
    }).join('');

    return `<!DOCTYPE html>
<html>
<head>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; padding: 10px; }
    .file { margin-bottom: 20px; border: 1px solid #ddd; border-radius: 5px; overflow: hidden; }
    .file-header { background: #f5f5f5; padding: 10px; font-weight: bold; border-bottom: 1px solid #ddd; }
    .hunk { margin: 10px; padding: 10px; border: 1px solid #eee; border-radius: 3px; }
    .hunk-header { color: #666; font-size: 12px; margin-bottom: 5px; }
    .hunk-content { background: #fafafa; padding: 10px; border-radius: 3px; overflow-x: auto; }
    .actions { margin-top: 10px; display: flex; gap: 10px; }
    .accept-btn { background: #4CAF50; color: white; border: none; padding: 8px 16px; border-radius: 4px; cursor: pointer; }
    .accept-btn:hover { background: #45a049; }
    .reject-btn { background: #f44336; color: white; border: none; padding: 8px 16px; border-radius: 4px; cursor: pointer; }
    .reject-btn:hover { background: #da190b; }
  </style>
</head>
<body>
  <h2>Diff Review - ${this.files.length} file(s)</h2>
  ${filesHtml}
  <script>
    const vscode = acquireVsCodeApi();
    function accept(filePath, hunkId) { vscode.postMessage({ command: 'accept', filePath, hunkId }); }
    function reject(filePath, hunkId) { vscode.postMessage({ command: 'reject', filePath, hunkId }); }
  </script>
</body>
</html>`;
  }

  private escapeHtml(text: string): string {
    return text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }

  public dispose() {
    this.panel?.dispose();
    this.panel = undefined;
  }
}
