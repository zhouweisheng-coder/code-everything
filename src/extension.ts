import * as vscode from 'vscode';
import { GitDiffParser } from './diff/GitDiffParser';
import { DiffTreeDataProvider } from './views/DiffTreeDataProvider';
import { DiffPreviewPanel } from './views/DiffPreviewPanel';
import { FileDiff } from './diff/types';

let diffTreeProvider: DiffTreeDataProvider;
let diffFiles: FileDiff[] = [];

export function activate(context: vscode.ExtensionContext) {
  console.log('Diff Review extension activated');

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
            DiffPreviewPanel.createOrShow(context.extensionUri, file);
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

  context.subscriptions.push(command, view);
}

export function deactivate() {}
