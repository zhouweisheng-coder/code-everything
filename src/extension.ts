import * as vscode from 'vscode';

export function activate(context: vscode.ExtensionContext) {
  console.log('Diff Review extension activated');

  const command = vscode.commands.registerCommand('extension.showDiffPanel', () => {
    vscode.window.showInformationMessage('Diff Review activated!');
  });

  context.subscriptions.push(command);
}

export function deactivate() {}
