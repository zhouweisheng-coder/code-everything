# VSCode Diff Review 扩展设计

## 1. 概述

**目标**：在 VSCode 中实现类似 Windsurf/Antigravity 的代码审查功能，通过全局 git diff 可视化，支持逐 hunk（最小 diff 单元）接受或拒绝修改。

**触发方式**：
- 命令面板：`Ctrl+Shift+P` → "Show Diff Review"
- 快捷键：`Ctrl+Alt+D`

---

## 2. 架构设计

```
┌─────────────────────────────────────────────────────┐
│                  VSCode Extension                    │
├─────────────────────────────────────────────────────┤
│                                                      │
│  ┌──────────────┐    ┌─────────────────────────┐   │
│  │  Sidebar     │    │  Bottom Panel          │   │
│  │  DiffTree    │    │  DiffPreview            │   │
│  └──────────────┘    └─────────────────────────┘   │
│           ↓                    ↓                    │
│  ┌─────────────────────────────────────────────┐    │
│  │           OverlayWebviewManager             │    │
│  │    (统一管理按钮位置、处理点击事件)            │    │
│  └─────────────────────────────────────────────┘    │
│           ↓                    ↓                    │
│  ┌──────────────┐    ┌─────────────────────────┐   │
│  │ GitDiffParser│    │ HunkActionHandler       │   │
│  └──────────────┘    └─────────────────────────┘   │
│                                                      │
└─────────────────────────────────────────────────────┘
```

---

## 3. 核心组件

### 3.1 GitDiffParser

**职责**：执行 `git diff` 并解析为结构化数据

**输出**：

```typescript
interface FileDiff {
  filePath: string;        // 相对路径
  status: 'modified' | 'added' | 'deleted' | 'renamed';
  hunks: Hunk[];
}

interface Hunk {
  id: string;              // 唯一标识 (UUID)
  header: string;          // @@ -1,5 +1,7 @@
  oldStart: number;        // 原始起始行
  oldLines: number;        // 原始行数
  newStart: number;        // 新起始行
  newLines: number;       // 新行数
  content: string;         // diff 内容
}
```

### 3.2 DiffTreeView (Sidebar)

**职责**：展示所有修改的文件列表

**交互**：
- 点击文件 → 在 Bottom Panel 展开详情
- 点击 hunk → 滚动到对应代码位置 + 显示接受/拒绝按钮

### 3.3 DiffPreviewPanel (Bottom Panel)

**职责**：展示选中文件的所有 hunk 详情

**UI**：每个 hunk 独立展示，包含 old/new 内容对比

### 3.4 OverlayWebview

**职责**：渲染接受/拒绝按钮

**位置**：每个 hunk 的右上角

**样式**：
- 接受按钮：绿色 (#4CAF50)，图标 ✓
- 拒绝按钮：红色 (#f44336)，图标 ✗
- hover 放大 1.1 倍，淡入动画 200ms
- 圆角矩形

### 3.5 HunkActionHandler

**职责**：执行接受/拒绝操作

**接受**：`git add <file>`（将修改 staged）
**拒绝**：`git checkout -- <file>`（恢复原样）

---

## 4. 数据流

```
用户触发 (命令/快捷键)
    ↓
GitDiffParser 执行 git diff --no-color
    ↓
解析为 FileDiff[] → Hunk[]
    ↓
DiffTreeView 渲染文件列表
    ↓
用户点击 hunk
    ↓
OverlayWebview 渲染按钮到对应位置
    ↓
用户点击 接受/拒绝
    ↓
HunkActionHandler 执行对应 git 命令
    ↓
刷新 diff 列表（移除已处理的 hunk）
```

---

## 5. 命令注册

| 命令 ID | 描述 | 快捷键 |
|---------|------|--------|
| `extension.showDiffPanel` | 打开 diff 审查面板 | `Ctrl+Alt+D` |
| `extension.acceptHunk` | 接受当前 hunk | `Ctrl+Enter` |
| `extension.rejectHunk` | 拒绝当前 hunk | `Ctrl+Backspace` |
| `extension.acceptAll` | 接受所有修改 | `Ctrl+Alt+Shift+A` |
| `extension.rejectAll` | 拒绝所有修改 | `Ctrl+Alt+Shift+D` |

---

## 6. 配置项

| 配置项 | 类型 | 默认值 | 描述 |
|--------|------|--------|------|
| `diffReview.enabled` | boolean | true | 启用扩展 |
| `diffReview.defaultView` | string | "sidebar" | 默认视图：sidebar / panel |
| `diffReview.autoRefresh` | boolean | true | 文件变更后自动刷新 |

---

## 7. 错误处理

| 场景 | 处理方式 |
|------|----------|
| 非 git 仓库 | 提示用户当前不是 git 仓库 |
| 无未提交的修改 | 提示"没有检测到修改" |
| git 命令执行失败 | 显示错误信息，允许重试 |
| accept 后产生冲突 | 提示用户手动解决 |

---

## 8. 技术选型

- **方案**：Webview 注入
- **理由**：UI 灵活，动画效果好，与 Windsurf 体验一致
- **替代方案**：Decoration API（样式受限）

---

## 9. 测试策略

- **单元测试**：GitDiffParser 解析准确性、HunkActionHandler 命令生成
- **集成测试**：实际 git 操作验证
