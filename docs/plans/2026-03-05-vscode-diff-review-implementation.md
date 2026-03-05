# VSCode Diff Review 扩展实现计划

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** 在 VSCode 中实现全局 git diff 可视化审查功能，支持按 hunk 逐个接受或拒绝修改。

**Architecture:** 使用 Webview 注入方案渲染接受/拒绝按钮，通过 Sidebar DiffTree 和 Bottom Panel DiffPreview 展示修改内容。

**Tech Stack:** TypeScript, VSCode Extension API, Webview

---

## 阶段 1: 项目初始化

### Task 1: 初始化 VSCode 扩展项目

**Files:**
- Create: `package.json`
- Create: `tsconfig.json`
- Create: `src/extension.ts`
- Create: `src/test/runTest.ts`
- Create: `src/test/suite/index.ts`
- Create: `.vscode/launch.json`
- Create: `.vscode/tasks.json`

**Step 1: 创建 package.json**

```json
{
  "name": "diff-review",
  "displayName": "Diff Review",
  "description": "Git diff review with accept/reject buttons",
  "version": "0.0.1",
  "publisher": "local",
  "engines": {
    "vscode": "^1.85.0"
  },
  "categories": [
    "Other"
  ],
  "activationEvents": [
    "onCommand:extension.showDiffPanel"
  ],
  "main": "./out/extension.js",
  "contributes": {
    "commands": [
      {
        "command": "extension.showDiffPanel",
        "title": "Show Diff Review"
      }
    ],
    "keybindings": [
      {
        "command": "extension.showDiffPanel",
        "key": "Ctrl+Alt+D"
      }
    ]
  },
  "scripts": {
    "vscode:prepublish": "npm run compile",
    "compile": "tsc -p ./",
    "watch": "tsc -watch -p ./",
    "test": "node ./out/test/runTest.js"
  },
  "devDependencies": {
    "@types/node": "^18.0.0",
    "@types/vscode": "^1.85.0",
    "@vscode/test-electron": "^2.3.0",
    "typescript": "^5.0.0"
  }
}
```

**Step 2: 创建 tsconfig.json**

```json
{
  "compilerOptions": {
    "target": "ES2020",
    "module": "commonjs",
    "outDir": "./out",
    "rootDir": "./src",
    "strict": true,
    "esModuleInterop": true
  },
  "include": ["src/**/*"]
}
```

**Step 3: 初始化 npm 并安装依赖**

```bash
npm init -y
npm install --save-dev typescript @types/vscode @vscode/test-electron @types/node
```

**Step 4: 创建基础扩展入口 src/extension.ts**

```typescript
import * as vscode from 'vscode';

export function activate(context: vscode.ExtensionContext) {
  console.log('Diff Review extension activated');

  const command = vscode.commands.registerCommand('extension.showDiffPanel', () => {
    vscode.window.showInformationMessage('Diff Review activated!');
  });

  context.subscriptions.push(command);
}

export function deactivate() {}
```

**Step 5: 编译并验证**

```bash
npx tsc
```

Expected: 编译成功，生成 out/extension.js

**Step 6: Commit**

```bash
git add package.json tsconfig.json src/extension.ts .vscode/launch.json .vscode/tasks.json
git commit -m "feat: 初始化 VSCode 扩展项目"
```

---

## 阶段 2: GitDiffParser 核心解析器

### Task 2: 实现 GitDiffParser

**Files:**
- Create: `src/diff/GitDiffParser.ts`
- Create: `src/diff/types.ts`
- Create: `src/test/diff/GitDiffParser.test.ts`

**Step 1: 创建类型定义 src/diff/types.ts**

```typescript
export interface Hunk {
  id: string;
  header: string;
  oldStart: number;
  oldLines: number;
  newStart: number;
  newLines: number;
  content: string;
}

export interface FileDiff {
  filePath: string;
  status: 'modified' | 'added' | 'deleted' | 'renamed';
  hunks: Hunk[];
}

export interface DiffResult {
  files: FileDiff[];
  rawDiff: string;
}
```

**Step 2: 创建 GitDiffParser 骨架 src/diff/GitDiffParser.ts**

```typescript
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
    // TODO: 实现解析逻辑
    return { files, rawDiff: diffOutput };
  }
}
```

**Step 3: 创建测试文件 src/test/diff/GitDiffParser.test.ts**

```typescript
import * as assert from 'assert';
import { GitDiffParser } from '../../diff/GitDiffParser';

suite('GitDiffParser Test', () => {
  test('should parse simple diff', async () => {
    const parser = new GitDiffParser();
    const result = await parser.parse();
    assert.ok(Array.isArray(result.files));
  });
});
```

**Step 4: 运行测试验证失败**

```bash
npx ts-node src/test/diff/GitDiffParser.test.ts
```

Expected: 测试运行但解析逻辑为空

**Step 5: 实现完整解析逻辑**

```typescript
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
```

**Step 6: 重新运行测试**

```bash
npx ts-node src/test/diff/GitDiffParser.test.ts
```

Expected: PASS

**Step 7: Commit**

```bash
git add src/diff/types.ts src/diff/GitDiffParser.ts src/test/diff/GitDiffParser.test.ts
git commit -m "feat: 实现 GitDiffParser 解析器"
```

---

## 阶段 3: DiffTreeView (Sidebar)

### Task 3: 实现 DiffTreeView

**Files:**
- Create: `src/views/DiffTreeDataProvider.ts`
- Modify: `src/extension.ts`

**Step 1: 创建 DiffTreeDataProvider**

```typescript
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
```

**Step 2: 修改 extension.ts 注册 TreeView**

```typescript
import * as vscode from 'vscode';
import { GitDiffParser } from './diff/GitDiffParser';
import { DiffTreeDataProvider } from './views/DiffTreeDataProvider';

let diffTreeProvider: DiffTreeDataProvider;

export function activate(context: vscode.ExtensionContext) {
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
```

**Step 3: 在 package.json 添加 views**

```json
"contributes": {
  "views": {
    "explorer": [
      {
        "id": "diffReviewView",
        "name": "Diff Review"
      }
    ]
  }
}
```

**Step 4: 编译测试**

```bash
npx tsc
```

Expected: 编译成功

**Step 5: Commit**

```bash
git add src/views/DiffTreeDataProvider.ts src/extension.ts package.json
git commit -m "feat: 实现 DiffTreeView Sidebar"
```

---

## 阶段 4: DiffPreviewPanel (Bottom Panel)

### Task 4: 实现 DiffPreviewPanel

**Files:**
- Create: `src/views/DiffPreviewPanel.ts`
- Modify: `src/extension.ts`

**Step 1: 创建 DiffPreviewPanel**

```typescript
import * as vscode from 'vscode';
import { FileDiff, Hunk } from '../diff/types';

export class DiffPreviewPanel {
  public static currentPanel: DiffPreviewPanel | undefined;
  private readonly panel: vscode.WebviewPanel;
  private readonly extensionUri: vscode.Uri;

  private constructor(
    extensionUri: vscode.Uri,
    column: vscode.ViewColumn
  ) {
    this.extensionUri = extensionUri;

    this.panel = vscode.window.createWebviewPanel(
      'diffPreview',
      'Diff Preview',
      column,
      {
        enableScripts: true,
        retainContextWhenHidden: true
      }
    );

    this.panel.webview.html = this.getHtmlForWebview('');
  }

  public static createOrShow(extensionUri: vscode.Uri, fileDiff: FileDiff) {
    const column = vscode.window.activeTextEditor
      ? vscode.window.activeTextEditor.viewColumn
      : vscode.ViewColumn.One;

    if (DiffPreviewPanel.currentPanel) {
      DiffPreviewPanel.currentPanel.panel.reveal(column);
      DiffPreviewPanel.currentPanel.updateContent(fileDiff);
      return;
    }

    DiffPreviewPanel.currentPanel = new DiffPreviewPanel(extensionUri, column);
    DiffPreviewPanel.currentPanel.updateContent(fileDiff);
  }

  private updateContent(fileDiff: FileDiff) {
    const content = fileDiff.hunks.map(hunk => this.renderHunk(hunk)).join('\n');
    this.panel.webview.html = this.getHtmlForWebview(content);
  }

  private renderHunk(hunk: Hunk): string {
    return `<div class="hunk">
      <div class="hunk-header">${hunk.header}</div>
      <pre class="hunk-content">${hunk.content}</pre>
    </div>`;
  }

  private getHtmlForWebview(content: string): string {
    return `<!DOCTYPE html>
      <html>
        <head>
          <style>
            body { padding: 10px; font-family: monospace; }
            .hunk { margin-bottom: 20px; }
            .hunk-header { color: #666; background: #f5f5f5; padding: 5px; }
            .hunk-content { white-space: pre-wrap; }
            pre { margin: 0; }
          </style>
        </head>
        <body>
          ${content || '<p>Select a hunk to view details</p>'}
        </body>
      </html>`;
  }

  public dispose() {
    DiffPreviewPanel.currentPanel = undefined;
    this.panel.dispose();
  }
}
```

**Step 2: 在 extension.ts 集成**

```typescript
import { DiffPreviewPanel } from './views/DiffPreviewPanel';

// 在 DiffTreeDataProvider 中添加点击事件处理
// ...
```

**Step 3: 编译测试**

```bash
npx tsc
```

**Step 4: Commit**

```bash
git add src/views/DiffPreviewPanel.ts
git commit -m "feat: 实现 DiffPreviewPanel"
```

---

## 阶段 5: OverlayWebview (接受/拒绝按钮)

### Task 5: 实现 OverlayWebview 按钮

**Files:**
- Create: `src/webview/OverlayWebview.ts`
- Modify: `src/extension.ts`

**Step 1: 创建 OverlayWebview**

```typescript
import * as vscode from 'vscode';
import { Hunk } from '../diff/types';

export class OverlayWebview {
  private panel: vscode.WebviewPanel | undefined;
  private hunks: Hunk[] = [];

  constructor(private extensionUri: vscode.Uri) {}

  public showButtons(hunks: Hunk[]) {
    this.hunks = hunks;
    this.createOrShowPanel();
  }

  private createOrShowPanel() {
    if (this.panel) {
      this.panel.reveal(vscode.ViewColumn.Two);
      this.updateContent();
      return;
    }

    this.panel = vscode.window.createWebviewPanel(
      'overlayButtons',
      'Diff Actions',
      vscode.ViewColumn.Two,
      { enableScripts: true }
    );

    this.panel.webview.onDidReceiveMessage(async (message) => {
      if (message.command === 'accept') {
        await this.handleAccept(message.hunkId);
      } else if (message.command === 'reject') {
        await this.handleReject(message.hunkId);
      }
    });

    this.updateContent();
  }

  private updateContent() {
    if (!this.panel) return;

    const buttonsHtml = this.hunks.map(hunk => `
      <div class="hunk-section" data-hunk-id="${hunk.id}">
        <div class="hunk-header">${hunk.header}</div>
        <div class="buttons">
          <button class="accept-btn" onclick="accept('${hunk.id}')">✓ Accept</button>
          <button class="reject-btn" onclick="reject('${hunk.id}')">✗ Reject</button>
        </div>
      </div>
    `).join('');

    this.panel.webview.html = this.getHtml(buttonsHtml);
  }

  private getHtml(buttonsHtml: string): string {
    return `<!DOCTYPE html>
      <html>
        <head>
          <style>
            body { padding: 10px; font-family: sans-serif; }
            .hunk-section { margin-bottom: 20px; padding: 10px; border: 1px solid #ddd; border-radius: 5px; }
            .hunk-header { color: #666; font-size: 12px; margin-bottom: 10px; }
            .buttons { display: flex; gap: 10px; }
            .accept-btn { background: #4CAF50; color: white; border: none; padding: 8px 16px; border-radius: 4px; cursor: pointer; }
            .accept-btn:hover { transform: scale(1.1); }
            .reject-btn { background: #f44336; color: white; border: none; padding: 8px 16px; border-radius: 4px; cursor: pointer; }
            .reject-btn:hover { transform: scale(1.1); }
          </style>
        </head>
        <body>
          ${buttonsHtml}
          <script>
            const vscode = acquireVsCodeApi();
            function accept(hunkId) { vscode.postMessage({ command: 'accept', hunkId }); }
            function reject(hunkId) { vscode.postMessage({ command: 'reject', hunkId }); }
          </script>
        </body>
      </html>`;
  }

  private async handleAccept(hunkId: string) {
    vscode.window.showInformationMessage(`Accept hunk: ${hunkId}`);
    // TODO: 调用 HunkActionHandler
  }

  private async handleReject(hunkId: string) {
    vscode.window.showInformationMessage(`Reject hunk: ${hunkId}`);
    // TODO: 调用 HunkActionHandler
  }

  public hideButtons() {
    this.panel?.dispose();
    this.panel = undefined;
  }
}
```

**Step 2: 编译测试**

```bash
npx tsc
```

**Step 3: Commit**

```bash
git add src/webview/OverlayWebview.ts
git commit -m "feat: 实现 OverlayWebview 接受/拒绝按钮"
```

---

## 阶段 6: HunkActionHandler (Git 操作)

### Task 6: 实现 HunkActionHandler

**Files:**
- Create: `src/actions/HunkActionHandler.ts`
- Modify: `src/webview/OverlayWebview.ts`

**Step 1: 创建 HunkActionHandler**

```typescript
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
      // 使用 git apply 将修改应用到暂存区
      const fullPath = `${this.workspaceRoot}/${fileDiff.filePath}`;
      const { stdout, stderr } = await execAsync(
        `git add "${fullPath}"`,
        { cwd: this.workspaceRoot }
      );
      vscode.window.showInformationMessage(`Accepted: ${fileDiff.filePath}`);
    } catch (error) {
      vscode.window.showErrorMessage(`Failed to accept: ${error}`);
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
    }
  }
}
```

**Step 2: 在 OverlayWebview 中集成**

```typescript
import { HunkActionHandler } from '../actions/HunkActionHandler';

// 替换 handleAccept 和 handleReject
private actionHandler = new HunkActionHandler();

private async handleAccept(hunkId: string) {
  // TODO: 获取对应的 fileDiff 和 hunk
  await this.actionHandler.acceptHunk(fileDiff, hunk);
}

private async handleReject(hunkId: string) {
  await this.actionHandler.rejectHunk(fileDiff, hunk);
}
```

**Step 3: 编译测试**

```bash
npx tsc
```

**Step 4: Commit**

```bash
git add src/actions/HunkActionHandler.ts
git commit -m "feat: 实现 HunkActionHandler Git 操作"
```

---

## 阶段 7: 集成与测试

### Task 7: 完整集成

**Step 1: 修改 extension.ts 整合所有组件**

```typescript
import * as vscode from 'vscode';
import { GitDiffParser } from './diff/GitDiffParser';
import { DiffTreeDataProvider } from './views/DiffTreeDataProvider';
import { DiffPreviewPanel } from './views/DiffPreviewPanel';
import { OverlayWebview } from './webview/OverlayWebview';

let diffTreeProvider: DiffTreeDataProvider;
let overlayWebview: OverlayWebview;
let currentDiffResult: { files: any[] } | null = null;

export function activate(context: vscode.ExtensionContext) {
  diffTreeProvider = new DiffTreeDataProvider();
  overlayWebview = new OverlayWebview(context.extensionUri);

  vscode.window.registerTreeDataProvider('diffReviewView', diffTreeProvider);

  // 主命令：显示 diff 面板
  const showDiffPanel = vscode.commands.registerCommand('extension.showDiffPanel', async () => {
    try {
      const parser = new GitDiffParser();
      const result = await parser.parse();
      currentDiffResult = result;
      diffTreeProvider.updateFiles(result.files);
      vscode.commands.executeCommand('workbench.view.extension.diffReviewView');
    } catch (error) {
      vscode.window.showErrorMessage(`Error: ${error}`);
    }
  });

  // 接受单个 hunk
  const acceptHunk = vscode.commands.registerCommand('extension.acceptHunk', async (hunkId: string) => {
    // 实现接受逻辑
  });

  // 拒绝单个 hunk
  const rejectHunk = vscode.commands.registerCommand('extension.rejectHunk', async (hunkId: string) => {
    // 实现拒绝逻辑
  });

  context.subscriptions.push(showDiffPanel, acceptHunk, rejectHunk);
}
```

**Step 2: 编译并测试**

```bash
npx tsc
```

**Step 3: Commit**

```bash
git add src/extension.ts
git commit -m "feat: 集成所有组件"
```

---

## 阶段 8: 配置项与优化

### Task 8: 添加配置项

**Modify: package.json**

```json
"configuration": {
  "title": "Diff Review",
  "properties": {
    "diffReview.enabled": {
      "type": "boolean",
      "default": true,
      "description": "Enable Diff Review extension"
    },
    "diffReview.autoRefresh": {
      "type": "boolean",
      "default": true,
      "description": "Auto refresh on file changes"
    }
  }
}
```

**Step 2: Commit**

```bash
git add package.json
git commit -m "feat: 添加配置项"
```

---

## 总结

实现顺序：
1. 项目初始化 → 2. GitDiffParser → 3. DiffTreeView → 4. DiffPreviewPanel → 5. OverlayWebview → 6. HunkActionHandler → 7. 集成测试 → 8. 配置优化

预计产出文件：
- `package.json`, `tsconfig.json`
- `src/extension.ts`
- `src/diff/types.ts`, `src/diff/GitDiffParser.ts`
- `src/views/DiffTreeDataProvider.ts`, `src/views/DiffPreviewPanel.ts`
- `src/webview/OverlayWebview.ts`
- `src/actions/HunkActionHandler.ts`
