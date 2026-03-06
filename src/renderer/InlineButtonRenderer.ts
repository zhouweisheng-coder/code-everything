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

    // 创建 Accept 按钮装饰 (行尾)
    this.acceptDecoration = vscode.window.createTextEditorDecorationType({
      isWholeLine: true,
      after: {
        contentText: ' ✓ Accept ',
        backgroundColor: '#4CAF50',
        color: '#ffffff',
        
        margin: '0 0 0 10px',
        fontWeight: 'bold'
      }
    });

    // 创建 Reject 按钮装饰 (行首)
    this.rejectDecoration = vscode.window.createTextEditorDecorationType({
      isWholeLine: true,
      before: {
        contentText: ' Reject ✗ ',
        backgroundColor: '#f44336',
        color: '#ffffff',
        
        margin: '0 10px 0 0',
        fontWeight: 'bold'
      }
    });
  }

  async renderButtons(
    editor: vscode.TextEditor,
    decorations: EditorDecoration[]
  ): Promise<void> {
    console.log('[InlineButtonRenderer] Rendering buttons for', decorations.length, 'decorations');
    
    const acceptOptions: vscode.DecorationOptions[] = [];
    const rejectOptions: vscode.DecorationOptions[] = [];

    for (const dec of decorations) {
      const line = dec.range.start.line;
      console.log('[InlineButtonRenderer] Adding decoration at line', line);

      // Accept 按钮：整行，行尾显示
      acceptOptions.push({
        range: new vscode.Range(line, 0, line, 0),
        hoverMessage: 'Click to Accept this change'
      });

      // Reject 按钮：整行，行首显示
      rejectOptions.push({
        range: new vscode.Range(line, 0, line, 0),
        hoverMessage: 'Click to Reject this change'
      });
    }

    console.log('[InlineButtonRenderer] Setting accept decorations:', acceptOptions.length);
    console.log('[InlineButtonRenderer] Setting reject decorations:', rejectOptions.length);
    
    editor.setDecorations(this.acceptDecoration, acceptOptions);
    editor.setDecorations(this.rejectDecoration, rejectOptions);

    this.currentDecorations.set(editor.document.uri.toString(), [
      ...acceptOptions,
      ...rejectOptions
    ]);
    
    console.log('[InlineButtonRenderer] Decorations set complete');
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
