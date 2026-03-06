import * as vscode from 'vscode';
import { FileDiff, Hunk } from '../diff/types';

export interface EditorDecoration {
  filePath: string;
  hunk: Hunk;
  range: vscode.Range;
}

export class EditorPositionMapper {
  private workspaceRoot: string | undefined;

  constructor() {
    this.workspaceRoot = vscode.workspace.workspaceFolders?.[0]?.uri.fsPath;
  }

  async mapHunksToEditor(fileDiff: FileDiff): Promise<EditorDecoration[]> {
    const decorations: EditorDecoration[] = [];

    // 打开文件
    const fileUri = vscode.Uri.file(`${this.workspaceRoot}/${fileDiff.filePath}`);
    const document = await vscode.workspace.openTextDocument(fileUri);
    const editor = await vscode.window.showTextDocument(document, {
      viewColumn: vscode.ViewColumn.One,
      preserveFocus: false
    });

    // 为每个 hunk 创建装饰位置
    for (const hunk of fileDiff.hunks) {
      const startLine = hunk.oldStart - 1; // VSCode 行号从 0 开始
      const endLine = startLine + hunk.oldLines;

      const range = new vscode.Range(startLine, 0, endLine, 0);
      decorations.push({
        filePath: fileDiff.filePath,
        hunk,
        range
      });
    }

    return decorations;
  }

  async openAllModifiedFiles(files: FileDiff[]): Promise<void> {
    for (const file of files) {
      await this.mapHunksToEditor(file);
    }
  }
}
