import * as vscode from 'vscode';
import { GitDiffParser } from './diff/GitDiffParser';
import { DiffTreeDataProvider } from './views/DiffTreeDataProvider';

let diffTreeProvider: DiffTreeDataProvider;

export function activate(context: vscode.ExtensionContext) {
  console.log('Diff Review extension activated');

  diffTreeProvider = new DiffTreeDataProvider();

  vscode.window.registerTreeDataProvider('diffReviewView', diffTreeProvider);

  const command = vscode.commands.registerCommand('extension.showDiffPanel', async () => {
    const parser = new GitDiffParser();
    const result = await parser.parse();
    diffTreeProvider.updateFiles(result.files);
    vscode.commands.executeCommand('workbench.view.extension.diffReviewView');
  });

  context.subscriptions.push(command);
}

export function deactivate() {}
