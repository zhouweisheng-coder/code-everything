import * as vscode from 'vscode';
import { Hunk } from '../diff/types';
import { HunkActionHandler } from '../actions/HunkActionHandler';
import { FileDiff } from '../diff/types';
import { EditorDecoration } from '../mapper/EditorPositionMapper';

export class InlineButtonRenderer {
  private acceptDecoration: vscode.TextEditorDecorationType;
  private rejectDecoration: vscode.TextEditorDecorationType;
  private actionHandler: HunkActionHandler;
  private currentDecorations: Map<string, vscode.DecorationOptions[]> = new Map();

  constructor() {
    this.actionHandler = new HunkActionHandler();

    // 创建 Accept 按钮装饰 (右侧)
    this.acceptDecoration = vscode.window.createTextEditorDecorationType({
      after: {
        contentText: ' ✓ ',
        backgroundColor: '#4CAF50',
        color: '#ffffff',
        margin: '0 0 0 8px',
      }
    });

    // 创建 Reject 按钮装饰 (左侧)
    this.rejectDecoration = vscode.window.createTextEditorDecorationType({
      before: {
        contentText: ' ✗ ',
        backgroundColor: '#f44336',
        color: '#ffffff',
        margin: '0 8px 0 0',
      }
    });
  }

  async renderButtons(
    editor: vscode.TextEditor,
    decorations: EditorDecoration[]
  ): Promise<void> {
    const acceptOptions: vscode.DecorationOptions[] = [];
    const rejectOptions: vscode.DecorationOptions[] = [];

    for (const dec of decorations) {
      const line = dec.range.start.line;

      // Accept 按钮：行尾
      acceptOptions.push({
        range: new vscode.Range(line, 0, line, 0),
        hoverMessage: 'Accept this change'
      });

      // Reject 按钮：行首
      rejectOptions.push({
        range: new vscode.Range(line, 0, line, 0),
        hoverMessage: 'Reject this change'
      });
    }

    editor.setDecorations(this.acceptDecoration, acceptOptions);
    editor.setDecorations(this.rejectDecoration, rejectOptions);

    // 存储当前装饰器以便清除
    this.currentDecorations.set(editor.document.uri.toString(), [
      ...acceptOptions,
      ...rejectOptions
    ]);
  }

  clearButtons(): void {
    const editors = vscode.window.visibleTextEditors;
    for (const editor of editors) {
      editor.setDecorations(this.acceptDecoration, []);
      editor.setDecorations(this.rejectDecoration, []);
    }
    this.currentDecorations.clear();
  }

  async handleAccept(fileDiff: FileDiff, hunk: Hunk): Promise<void> {
    await this.actionHandler.acceptHunk(fileDiff, hunk);
  }

  async handleReject(fileDiff: FileDiff, hunk: Hunk): Promise<void> {
    await this.actionHandler.rejectHunk(fileDiff, hunk);
  }

  dispose(): void {
    this.acceptDecoration.dispose();
    this.rejectDecoration.dispose();
  }
}
