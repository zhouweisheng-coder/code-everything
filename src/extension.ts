import * as vscode from 'vscode';
import { GitDiffParser } from './diff/GitDiffParser';
import { EditorPositionMapper } from './mapper/EditorPositionMapper';
import { InlineButtonRenderer } from './renderer/InlineButtonRenderer';
import { FileDiff } from './diff/types';

let positionMapper: EditorPositionMapper;
let buttonRenderer: InlineButtonRenderer;
let currentFiles: FileDiff[] = [];

export function activate(context: vscode.ExtensionContext) {
  console.log('Diff Review extension activated');
  vscode.window.showInformationMessage('Diff Review loaded! Press Ctrl+Shift+D for inline buttons.');

  positionMapper = new EditorPositionMapper();
  buttonRenderer = new InlineButtonRenderer();

  const showCommand = vscode.commands.registerCommand('extension.showInlineButtons', async () => {
    try {
      const parser = new GitDiffParser();
      const result = await parser.parse();

      if (result.files.length === 0) {
        vscode.window.showInformationMessage('No uncommitted changes found');
        return;
      }

      currentFiles = result.files;
      vscode.window.showInformationMessage(`Found ${result.files.length} file(s) with changes`);

      // 为每个文件显示按钮
      for (const file of result.files) {
        const decorations = await positionMapper.mapHunksToEditor(file);
        const editor = vscode.window.activeTextEditor;
        if (editor) {
          await buttonRenderer.renderButtons(editor, decorations, result.files);
        }
      }
    } catch (error: any) {
      vscode.window.showErrorMessage(`Error: ${error.message}`);
    }
  });

  // 点击检测 - 点击行尾 accept，行头 reject
  const selectionDisposable = vscode.window.onDidChangeTextEditorSelection(async (event) => {
    if (!event.textEditor || currentFiles.length === 0) return;

    const selection = event.selections[0];
    if (!selection) return;

    const document = event.textEditor.document;
    const line = selection.active.line;
    const char = selection.active.character;
    const lineContent = document.lineAt(line).text;

    // 点击行尾 (Accept)
    if (char >= lineContent.length - 3) {
      await buttonRenderer.handleAcceptAtLine(line);
      buttonRenderer.clearButtons();
      // 刷新
      vscode.commands.executeCommand('extension.showInlineButtons');
      return;
    }

    // 点击行头 (Reject)
    if (char <= 3) {
      await buttonRenderer.handleRejectAtLine(line);
      buttonRenderer.clearButtons();
      vscode.commands.executeCommand('extension.showInlineButtons');
      return;
    }
  });

  context.subscriptions.push(showCommand, buttonRenderer, selectionDisposable);
}

export function deactivate() {
  buttonRenderer?.dispose();
}
