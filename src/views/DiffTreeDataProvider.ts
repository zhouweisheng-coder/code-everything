import * as vscode from 'vscode';
import { FileDiff } from '../diff/types';

export class DiffTreeDataProvider implements vscode.TreeDataProvider<vscode.TreeItem> {
  private _onDidChangeTreeData = new vscode.EventEmitter<vscode.TreeItem | undefined>();
  readonly onDidChangeTreeData = this._onDidChangeTreeData.event;

  private files: FileDiff[] = [];

  updateFiles(files: FileDiff[]) {
    this.files = files;
    this._onDidChangeTreeData.fire(undefined);
  }

  getTreeItem(element: vscode.TreeItem): vscode.TreeItem {
    return element;
  }

  getChildren(element?: vscode.TreeItem): vscode.TreeItem[] {
    if (!element) {
      // 根节点：文件列表
      return this.files.map(file => {
        const item = new vscode.TreeItem(
          file.filePath,
          vscode.TreeItemCollapsibleState.Collapsed
        );
        item.contextValue = 'file';
        item.iconPath = new vscode.ThemeIcon('file-modified');
        return item;
      });
    }

    // 文件节点：hunk 列表
    const file = this.files.find(f => f.filePath === element.label);
    if (file) {
      return file.hunks.map(hunk => {
        const item = new vscode.TreeItem(
          hunk.header,
          vscode.TreeItemCollapsibleState.None
        );
        item.contextValue = 'hunk';
        item.id = hunk.id;
        return item;
      });
    }

    return [];
  }
}
