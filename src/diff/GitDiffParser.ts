import { exec } from 'child_process';
import { promisify } from 'util';
import * as vscode from 'vscode';
import { FileDiff, DiffResult, Hunk } from './types';

const execAsync = promisify(exec);

export class GitDiffParser {
  private workspaceRoot: string | undefined;

  constructor() {
    this.workspaceRoot = vscode.workspace.workspaceFolders?.[0]?.uri.fsPath;
  }

  async parse(): Promise<DiffResult> {
    if (!this.workspaceRoot) {
      throw new Error('No workspace folder found');
    }

    const { stdout } = await execAsync('git diff --no-color', {
      cwd: this.workspaceRoot
    });

    return this.parseDiffOutput(stdout);
  }

  private parseDiffOutput(diffOutput: string): DiffResult {
    const files: FileDiff[] = [];
    const lines = diffOutput.split('\n');

    let currentFile: FileDiff | null = null;
    let currentHunk: Hunk | null = null;
    let hunkContent: string[] = [];

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];

      // 文件头: diff --git a/path b/path
      if (line.startsWith('diff --git')) {
        if (currentFile) {
          files.push(currentFile);
        }
        const pathMatch = line.match(/diff --git a\/(.+) b\/(.+)/);
        const filePath = pathMatch ? pathMatch[2] : '';
        currentFile = { filePath, status: 'modified', hunks: [] };
        continue;
      }

      // 新文件: new file mode
      if (line.startsWith('new file mode')) {
        if (currentFile) currentFile.status = 'added';
        continue;
      }

      // 删除文件: deleted file mode
      if (line.startsWith('deleted file mode')) {
        if (currentFile) currentFile.status = 'deleted';
        continue;
      }

      // Hunk 头: @@ -1,5 +1,7 @@
      if (line.startsWith('@@')) {
        if (currentHunk && currentFile) {
          currentHunk.content = hunkContent.join('\n');
          currentFile.hunks.push(currentHunk);
        }
        const hunkMatch = line.match(/@@ -(\d+),?(\d*) \+(\d+),?(\d*) @@/);
        if (hunkMatch) {
          currentHunk = {
            id: `hunk-${Date.now()}-${i}`,
            header: line,
            oldStart: parseInt(hunkMatch[1]),
            oldLines: parseInt(hunkMatch[2] || '1'),
            newStart: parseInt(hunkMatch[3]),
            newLines: parseInt(hunkMatch[4] || '1'),
            content: ''
          };
          hunkContent = [];
        }
        continue;
      }

      // 内容行
      if ((line.startsWith('+') || line.startsWith('-') || line.startsWith(' ')) && currentHunk) {
        hunkContent.push(line);
      }
    }

    // 最后一个文件
    if (currentHunk && currentFile) {
      currentHunk.content = hunkContent.join('\n');
      currentFile.hunks.push(currentHunk);
    }
    if (currentFile) {
      files.push(currentFile);
    }

    return { files, rawDiff: diffOutput };
  }
}
