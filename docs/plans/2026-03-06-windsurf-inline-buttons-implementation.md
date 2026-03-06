# Windsurf 内联按钮实现计划

> **For Claude:** Use superpowers:subagent-driven-development to implement this plan task-by-task.

**Goal:** 实现 Windsurf 风格的内联接受/拒绝按钮

**Architecture:** 使用 Decoration API 在代码编辑器中渲染按钮

**Tech Stack:** TypeScript, VSCode Extension API

---

## Task 1: EditorPositionMapper

**Files:**
- Create: `src/mapper/EditorPositionMapper.ts`

**Step 1: 创建 EditorPositionMapper**

```typescript
import * as vscode from 'vscode';
import { FileDiff, Hunk } from '../diff/types';

export interface EditorDecoration {
  filePath: string;
  hunk: Hunk;
  range: vscode.Range;
}

export class EditorPositionMapper {
  private workspaceRoot: string | undefined;

  constructor() {
    this.workspaceRoot = vscode.workspace.workspaceFolders?.[0]?.uri.fsPath;
  }

  async mapHunksToEditor(fileDiff: FileDiff): Promise<EditorDecoration[]> {
    const decorations: EditorDecoration[] = [];

    // 打开文件
    const fileUri = vscode.Uri.file(`${this.workspaceRoot}/${fileDiff.filePath}`);
    const document = await vscode.workspace.openTextDocument(fileUri);
    const editor = await vscode.window.showTextDocument(document, {
      viewColumn: vscode.ViewColumn.One,
      preserveFocus: false
    });

    // 为每个 hunk 创建装饰位置
    for (const hunk of fileDiff.hunks) {
      const startLine = hunk.oldStart - 1; // VSCode 行号从 0 开始
      const endLine = startLine + hunk.oldLines;

      const range = new vscode.Range(startLine, 0, endLine, 0);
      decorations.push({
        filePath: fileDiff.filePath,
        hunk,
        range
      });
    }

    return decorations;
  }

  async openAllModifiedFiles(files: FileDiff[]): Promise<void> {
    for (const file of files) {
      await this.mapHunksToEditor(file);
    }
  }
}
```

**Step 2: Commit**

```bash
git add src/mapper/EditorPositionMapper.ts
git commit -m "feat: 实现 EditorPositionMapper"
```

---

## Task 2: InlineButtonRenderer

**Files:**
- Create: `src/renderer/InlineButtonRenderer.ts`
- Modify: `src/extension.ts`

**Step 1: 创建 InlineButtonRenderer**

```typescript
import * as vscode from 'vscode';
import { Hunk } from '../diff/types';
import { HunkActionHandler } from '../actions/HunkActionHandler';
import { FileDiff } from '../diff/types';
import { EditorDecoration } from '../mapper/EditorPositionMapper';

export class InlineButtonRenderer {
  private acceptDecoration: vscode.TextEditorDecorationType;
  private rejectDecoration: vscode.TextEditorDecorationType;
  private actionHandler: HunkActionHandler;
  private currentDecorations: Map<string, vscode.Decoration[]> = new Map();

  constructor() {
    this.actionHandler = new HunkActionHandler();

    // 创建 Accept 按钮装饰 (右侧)
    this.acceptDecoration = vscode.window.createTextEditorDecorationType({
      after: {
        contentText: ' ✓ ',
        backgroundColor: '#4CAF50',
        color: '#ffffff',
        borderRadius: '4px',
        margin: '0 0 0 8px',
        cursor: 'pointer'
      }
    });

    // 创建 Reject 按钮装饰 (左侧)
    this.rejectDecoration = vscode.window.createTextEditorDecorationType({
      before: {
        contentText: ' ✗ ',
        backgroundColor: '#f44336',
        color: '#ffffff',
        borderRadius: '4px',
        margin: '0 8px 0 0',
        cursor: 'pointer'
      }
    });
  }

  async renderButtons(
    editor: vscode.TextEditor,
    decorations: EditorDecoration[]
  ): Promise<void> {
    const acceptOptions: vscode.DecorationOptions[] = [];
    const rejectOptions: vscode.DecorationOptions[] = [];

    for (const dec of decorations) {
      const line = dec.range.start.line;

      // Accept 按钮：行尾
      acceptOptions.push({
        range: new vscode.Range(line, 0, line, 0),
        hoverMessage: 'Accept this change'
      });

      // Reject 按钮：行首
      rejectOptions.push({
        range: new vscode.Range(line, 0, line, 0),
        hoverMessage: 'Reject this change'
      });
    }

    editor.setDecorations(this.acceptDecoration, acceptOptions);
    editor.setDecorations(this.rejectDecoration, rejectOptions);

    // 存储当前装饰器以便清除
    this.currentDecorations.set(editor.document.uri.toString(), [
      ...acceptOptions,
      ...rejectOptions
    ]);
  }

  clearButtons(): void {
    const editors = vscode.window.textEditors;
    for (const editor of editors) {
      editor.setDecorations(this.acceptDecoration, []);
      editor.setDecorations(this.rejectDecoration, []);
    }
    this.currentDecorations.clear();
  }

  async handleAccept(fileDiff: FileDiff, hunk: Hunk): Promise<void> {
    await this.actionHandler.acceptHunk(fileDiff, hunk);
  }

  async handleReject(fileDiff: FileDiff, hunk: Hunk): Promise<void> {
    await this.actionHandler.rejectHunk(fileDiff, hunk);
  }

  dispose(): void {
    this.acceptDecoration.dispose();
    this.rejectDecoration.dispose();
  }
}
```

**Step 2: Commit**

```bash
git add src/renderer/InlineButtonRenderer.ts
git commit -m "feat: 实现 InlineButtonRenderer"
```

---

## Task 3: 集成到 extension.ts

**Files:**
- Modify: `src/extension.ts`

**Step 1: 修改 extension.ts**

```typescript
import * as vscode from 'vscode';
import { GitDiffParser } from './diff/GitDiffParser';
import { EditorPositionMapper } from './mapper/EditorPositionMapper';
import { InlineButtonRenderer } from './renderer/InlineButtonRenderer';
import { FileDiff } from './diff/types';

let positionMapper: EditorPositionMapper;
let buttonRenderer: InlineButtonRenderer;
let currentFiles: FileDiff[] = [];

export function activate(context: vscode.ExtensionContext) {
  positionMapper = new EditorPositionMapper();
  buttonRenderer = new InlineButtonRenderer();

  // 注册显示按钮命令
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

  // 注册隐藏按钮命令
  const hideCommand = vscode.commands.registerCommand('extension.hideInlineButtons', () => {
    buttonRenderer.clearButtons();
    vscode.window.showInformationMessage('Buttons hidden');
  });

  // 添加鼠标点击处理
  vscode.window.onDidChangeTextEditorSelection(async (event) => {
    // 检测点击位置是否在按钮上
    // TODO: 实现点击检测
  });

  context.subscriptions.push(showCommand, hideCommand, buttonRenderer);
}

export function deactivate() {
  buttonRenderer?.dispose();
}
```

**Step 2: 更新 package.json 添加命令**

```json
{
  "command": "extension.showInlineButtons",
  "title": "Show Inline Buttons"
},
{
  "command": "extension.hideInlineButtons",
  "title": "Hide Inline Buttons"
}
```

**Step 3: 编译并测试**

```bash
npx tsc
```

**Step 4: Commit**

```bash
git add src/extension.ts package.json
git commit -m "feat: 集成内联按钮功能"
```

---

## Task 4: 添加点击事件处理

**Files:**
- Modify: `src/renderer/InlineButtonRenderer.ts`

**Step 1: 添加点击事件检测**

```typescript
// 在 InlineButtonRenderer 中添加
setupClickHandler(): void {
  vscode.window.onDidChangeTextEditorSelection(async (event) => {
    const editor = event.textEditor;
    if (!editor) return;

    const position = event.selections[0];
    const line = position.line;

    // 检查是否点击了 Accept 按钮位置
    // 这里需要更精确的检测逻辑
  });
}
```

**Step 2: Commit**

```bash
git add src/renderer/InlineButtonRenderer.ts
git commit -m "feat: 添加点击事件处理"
```

---

## 总结

实现顺序：
1. EditorPositionMapper → 2. InlineButtonRenderer → 3. 集成 → 4. 点击事件

预计产出文件：
- `src/mapper/EditorPositionMapper.ts`
- `src/renderer/InlineButtonRenderer.ts`
- 修改 `src/extension.ts`
- 修改 `package.json`
