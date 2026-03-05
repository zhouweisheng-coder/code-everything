import * as vscode from 'vscode';
import { GitDiffParser } from './diff/GitDiffParser';
import { DiffTreeDataProvider } from './views/DiffTreeDataProvider';
import { DiffPreviewPanel } from './views/DiffPreviewPanel';
import { OverlayWebview } from './webview/OverlayWebview';
import { FileDiff, Hunk } from './diff/types';

let diffTreeProvider: DiffTreeDataProvider;
let diffFiles: FileDiff[] = [];
let overlayWebview: OverlayWebview;

export function activate(context: vscode.ExtensionContext) {
  console.log('Diff Review extension activated');

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

  const command = vscode.commands.registerCommand('extension.showDiffPanel', async () => {
    const parser = new GitDiffParser();
    const result = await parser.parse();
    diffFiles = result.files;
    diffTreeProvider.updateFiles(result.files);
    vscode.commands.executeCommand('workbench.view.extension.diffReviewView');
  });

  context.subscriptions.push(command, view, overlayWebview);
}

export function deactivate() {}
