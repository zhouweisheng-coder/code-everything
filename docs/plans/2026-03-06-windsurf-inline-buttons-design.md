# Windsurf 风格内联按钮扩展设计

> **For Claude:** Use superpowers:subagent-driven-development to implement this design.

**Goal:** 实现类似 Windsurf 的内联接受/拒绝按钮，直接显示在代码修改区域的右上角。

**Architecture:** 结合 git diff 和 VSCode API 定位修改位置，使用 Decoration API 渲染按钮。

**Tech Stack:** TypeScript, VSCode Extension API, Decoration API

---

## 1. 架构设计

```
┌─────────────────────────────────────────┐
│  用户触发 (Ctrl+Alt+D)                   │
├─────────────────────────────────────────┤
│  1. GitDiffParser                       │
│     - 执行 git diff --no-color          │
│     - 解析出文件列表和 hunk 信息         │
├─────────────────────────────────────────┤
│  2. EditorPositionMapper                │
│     - 打开修改的文件                     │
│     - 定位每个 hunk 对应的行号范围       │
├─────────────────────────────────────────┤
│  3. InlineButtonRenderer                │
│     - 使用 Decoration API 渲染按钮       │
│     - 在每个修改区域的右上角显示         │
├─────────────────────────────────────────┤
│  4. HunkActionHandler                   │
│     - Accept: git add <file>            │
│     - Reject: git checkout -- <file>     │
└─────────────────────────────────────────┘
```

---

## 2. 组件详细设计

### 2.1 GitDiffParser

复用现有的解析器，获取每个文件的 hunk 信息：
- `oldStart`: 原始文件起始行号
- `oldLines`: 原始行数
- `newStart`: 新文件起始行号
- `newLines`: 新行数

### 2.2 EditorPositionMapper

```typescript
class EditorPositionMapper {
  // 打开文件并定位 hunk 位置
  async mapHunksToEditor(
    filePath: string,
    hunks: Hunk[]
  ): Promise<EditorDecoration[]>;

  // 计算装饰器的位置范围
  calculateDecorationRange(hunk: Hunk): Range;
}
```

### 2.3 InlineButtonRenderer

```typescript
class InlineButtonRenderer {
  private acceptDecoration: vscode.TextEditorDecorationType;
  private rejectDecoration: vscode.TextEditorDecorationType;

  // 渲染按钮
  renderButtons(decorations: EditorDecoration[]): void;

  // 清除按钮
  clearButtons(): void;

  // 处理点击事件
  onAcceptClicked(hunk: Hunk): Promise<void>;
  onRejectClicked(hunk: Hunk): Promise<void>;
}
```

### 2.4 EditorDecoration

```typescript
interface EditorDecoration {
  filePath: string;
  hunk: Hunk;
  range: vscode.Range;  // 按钮显示位置
  acceptRange: vscode.Range;  // Accept 按钮范围
  rejectRange: vscode.Range;  // Reject 按钮范围
}
```

---

## 3. UI 样式

### 按钮样式
- **位置**：每个修改块右上角
- **Accept 按钮**：
  - 背景：#4CAF50 (绿色)
  - 图标：✓
  - 圆角矩形
- **Reject 按钮**：
  - 背景：#f44336 (红色)
  - 图标：✗
  - 圆角矩形
- **Hover 效果**：放大 1.1 倍

### 渲染方式
使用 `vscode.TextEditorDecorationType` 和 `before` / `after` 渲染样式

---

## 4. 数据流

```
用户触发 (Ctrl+Alt+D)
    ↓
GitDiffParser.parse() → FileDiff[]
    ↓
EditorPositionMapper.mapHunksToEditor()
    ↓
InlineButtonRenderer.renderButtons()
    ↓
显示内联按钮
    ↓
用户点击 Accept/Reject
    ↓
HunkActionHandler 执行 git 命令
    ↓
刷新按钮状态
```

---

## 5. 命令注册

| 命令 ID | 描述 | 快捷键 |
|---------|------|--------|
| `extension.showInlineButtons` | 显示内联按钮 | `Ctrl+Alt+D` |
| `extension.hideInlineButtons` | 隐藏按钮 | `Ctrl+Alt+H` |

---

## 6. 实现任务

1. **EditorPositionMapper**: 定位 hunk 在编辑器中的位置
2. **InlineButtonRenderer**: 使用 Decoration API 渲染按钮
3. **集成**: 修改 extension.ts 整合所有组件
4. **测试**: 验证按钮显示和点击功能
