import { exec } from 'child_process';
import { promisify } from 'util';
import * as vscode from 'vscode';
import { FileDiff, Hunk } from '../diff/types';

const execAsync = promisify(exec);

export class HunkActionHandler {
  private workspaceRoot: string | undefined;

  constructor() {
    this.workspaceRoot = vscode.workspace.workspaceFolders?.[0]?.uri.fsPath;
  }

  async acceptHunk(fileDiff: FileDiff, hunk: Hunk): Promise<void> {
    if (!this.workspaceRoot) {
      throw new Error('No workspace folder found');
    }

    try {
      // 使用 git add 将修改 staged
      const fullPath = `${this.workspaceRoot}/${fileDiff.filePath}`;
      await execAsync(
        `git add "${fullPath}"`,
        { cwd: this.workspaceRoot }
      );
      vscode.window.showInformationMessage(`Accepted: ${fileDiff.filePath}`);
    } catch (error) {
      vscode.window.showErrorMessage(`Failed to accept: ${error}`);
      throw error;
    }
  }

  async rejectHunk(fileDiff: FileDiff, hunk: Hunk): Promise<void> {
    if (!this.workspaceRoot) {
      throw new Error('No workspace folder found');
    }

    try {
      const fullPath = `${this.workspaceRoot}/${fileDiff.filePath}`;
      await execAsync(
        `git checkout -- "${fullPath}"`,
        { cwd: this.workspaceRoot }
      );
      vscode.window.showInformationMessage(`Rejected: ${fileDiff.filePath}`);
    } catch (error) {
      vscode.window.showErrorMessage(`Failed to reject: ${error}`);
      throw error;
    }
  }
}
