import * as vscode from 'vscode';
import { GitDiffParser } from './diff/GitDiffParser';
import { EditorPositionMapper } from './mapper/EditorPositionMapper';
import { InlineButtonRenderer } from './renderer/InlineButtonRenderer';
import { DiffTreeDataProvider } from './views/DiffTreeDataProvider';
import { DiffPreviewPanel } from './views/DiffPreviewPanel';
import { OverlayWebview } from './webview/OverlayWebview';
import { FileDiff, Hunk } from './diff/types';

let positionMapper: EditorPositionMapper;
let buttonRenderer: InlineButtonRenderer;
let diffTreeProvider: DiffTreeDataProvider;
let diffFiles: FileDiff[] = [];
let overlayWebview: OverlayWebview;
let currentFiles: FileDiff[] = [];

export function activate(context: vscode.ExtensionContext) {
  console.log('Diff Review extension activated');

  // 初始化内联按钮组件
  positionMapper = new EditorPositionMapper();
  buttonRenderer = new InlineButtonRenderer();

  // 获取配置
  const config = vscode.workspace.getConfiguration('diffReview');
  const enabled = config.get<boolean>('enabled', true);
  const autoRefresh = config.get<boolean>('autoRefresh', true);

  if (!enabled) {
    vscode.window.showInformationMessage('Diff Review is disabled');
    return;
  }

  // 初始化 OverlayWebview
  overlayWebview = new OverlayWebview(context.extensionUri);

  diffTreeProvider = new DiffTreeDataProvider();

  // 创建 TreeView 并监听选择变化
  const view = vscode.window.createTreeView('diffReviewView', {
    treeDataProvider: diffTreeProvider
  });

  view.onDidChangeSelection(async (e) => {
    if (e.selection && e.selection.length > 0) {
      const element = e.selection[0];
      if (element.contextValue === 'hunk') {
        // 查找对应的文件和 hunk
        for (const file of diffFiles) {
          const hunk = file.hunks.find(h => h.id === element.id);
          if (hunk) {
            // 只显示选中的 hunk 内容
            DiffPreviewPanel.createOrShow(context.extensionUri, file, hunk);
            // 显示 OverlayWebview 接受/拒绝按钮
            overlayWebview.showButtons([{ hunk, fileDiff: file }]);
            break;
          }
        }
      }
    }
  });

  // 注册显示内联按钮命令
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

      // 为每个文件打开编辑器并显示按钮
      for (const file of result.files) {
        const decorations = await positionMapper.mapHunksToEditor(file);
        const editor = vscode.window.activeTextEditor;
        if (editor) {
          await buttonRenderer.renderButtons(editor, decorations);
        }
      }
    } catch (error: any) {
      vscode.window.showErrorMessage(`Error: ${error.message}`);
    }
  });

  // 注册隐藏内联按钮命令
  const hideCommand = vscode.commands.registerCommand('extension.hideInlineButtons', () => {
    buttonRenderer.clearButtons();
    vscode.window.showInformationMessage('Buttons hidden');
  });

  const command = vscode.commands.registerCommand('extension.showDiffPanel', async () => {
    const parser = new GitDiffParser();
    const result = await parser.parse();
    diffFiles = result.files;
    diffTreeProvider.updateFiles(result.files);
    vscode.commands.executeCommand('workbench.view.extension.diffReviewView');
  });

  context.subscriptions.push(showCommand, hideCommand, command, view, overlayWebview, buttonRenderer);
}

export function deactivate() {
  buttonRenderer?.dispose();
}
