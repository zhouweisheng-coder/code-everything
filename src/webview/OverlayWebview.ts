import * as vscode from 'vscode';
import { Hunk, FileDiff } from '../diff/types';
import { HunkActionHandler } from '../actions/HunkActionHandler';

export class OverlayWebview {
  private panel: vscode.WebviewPanel | undefined;
  private hunks: { hunk: Hunk; fileDiff: FileDiff }[] = [];
  private actionHandler: HunkActionHandler;

  constructor(private extensionUri: vscode.Uri) {
    this.actionHandler = new HunkActionHandler();
  }

  public showButtons(hunks: { hunk: Hunk; fileDiff: FileDiff }[]) {
    this.hunks = hunks;
    this.createOrShowPanel();
  }

  private createOrShowPanel() {
    if (this.panel) {
      this.panel.reveal(vscode.ViewColumn.Two);
      this.updateContent();
      return;
    }

    this.panel = vscode.window.createWebviewPanel(
      'overlayButtons',
      'Diff Actions',
      vscode.ViewColumn.Two,
      { enableScripts: true }
    );

    this.panel.webview.onDidReceiveMessage(async (message) => {
      if (message.command === 'accept') {
        await this.handleAccept(message.hunkId, message.filePath);
      } else if (message.command === 'reject') {
        await this.handleReject(message.hunkId, message.filePath);
      }
    });

    this.updateContent();
  }

  private updateContent() {
    if (!this.panel) return;

    const buttonsHtml = this.hunks.map(({ hunk, fileDiff }) => `
      <div class="hunk-section" data-hunk-id="${hunk.id}" data-file-path="${fileDiff.filePath}">
        <div class="hunk-header">${hunk.header} - ${fileDiff.filePath}</div>
        <div class="buttons">
          <button class="accept-btn" onclick="accept('${hunk.id}', '${fileDiff.filePath}')">✓ Accept</button>
          <button class="reject-btn" onclick="reject('${hunk.id}', '${fileDiff.filePath}')">✗ Reject</button>
        </div>
      </div>
    `).join('');

    this.panel.webview.html = this.getHtml(buttonsHtml);
  }

  private getHtml(buttonsHtml: string): string {
    return `<!DOCTYPE html>
      <html>
        <head>
          <style>
            body { padding: 10px; font-family: sans-serif; }
            .hunk-section { margin-bottom: 20px; padding: 10px; border: 1px solid #ddd; border-radius: 5px; }
            .hunk-header { color: #666; font-size: 12px; margin-bottom: 10px; }
            .buttons { display: flex; gap: 10px; }
            .accept-btn { background: #4CAF50; color: white; border: none; padding: 8px 16px; border-radius: 4px; cursor: pointer; }
            .accept-btn:hover { transform: scale(1.1); }
            .reject-btn { background: #f44336; color: white; border: none; padding: 8px 16px; border-radius: 4px; cursor: pointer; }
            .reject-btn:hover { transform: scale(1.1); }
          </style>
        </head>
        <body>
          ${buttonsHtml || '<p>No hunks to display</p>'}
          <script>
            const vscode = acquireVsCodeApi();
            function accept(hunkId, filePath) { vscode.postMessage({ command: 'accept', hunkId, filePath }); }
            function reject(hunkId, filePath) { vscode.postMessage({ command: 'reject', hunkId, filePath }); }
          </script>
        </body>
      </html>`;
  }

  private async handleAccept(hunkId: string, filePath: string) {
    const target = this.hunks.find(h => h.hunk.id === hunkId && h.fileDiff.filePath === filePath);
    if (target) {
      await this.actionHandler.acceptHunk(target.fileDiff, target.hunk);
    }
  }

  private async handleReject(hunkId: string, filePath: string) {
    const target = this.hunks.find(h => h.hunk.id === hunkId && h.fileDiff.filePath === filePath);
    if (target) {
      await this.actionHandler.rejectHunk(target.fileDiff, target.hunk);
    }
  }

  public hideButtons() {
    this.panel?.dispose();
    this.panel = undefined;
  }

  public dispose() {
    this.hideButtons();
  }
}
