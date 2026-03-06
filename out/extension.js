"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.activate = activate;
exports.deactivate = deactivate;
const vscode = __importStar(require("vscode"));
const GitDiffParser_1 = require("./diff/GitDiffParser");
const EditorPositionMapper_1 = require("./mapper/EditorPositionMapper");
const InlineButtonRenderer_1 = require("./renderer/InlineButtonRenderer");
let positionMapper;
let buttonRenderer;
let currentFiles = [];
function activate(context) {
    console.log('Diff Review extension activated');
    vscode.window.showInformationMessage('Diff Review loaded! Press Ctrl+Alt+D for inline buttons.');
    // 初始化组件
    positionMapper = new EditorPositionMapper_1.EditorPositionMapper();
    buttonRenderer = new InlineButtonRenderer_1.InlineButtonRenderer();
    // 获取配置
    const config = vscode.workspace.getConfiguration('diffReview');
    const enabled = config.get('enabled', true);
    if (!enabled) {
        vscode.window.showInformationMessage('Diff Review is disabled');
        return;
    }
    // 注册显示内联按钮命令
    const showCommand = vscode.commands.registerCommand('extension.showInlineButtons', async () => {
        console.log('[DiffReview] Show inline buttons command triggered');
        try {
            const parser = new GitDiffParser_1.GitDiffParser();
            const result = await parser.parse();
            console.log('[DiffReview] Found files:', result.files.length);
            if (result.files.length === 0) {
                vscode.window.showInformationMessage('No uncommitted changes found');
                return;
            }
            currentFiles = result.files;
            vscode.window.showInformationMessage(`Found ${result.files.length} file(s) with changes`);
            // 为每个文件打开编辑器并显示按钮
            for (const file of result.files) {
                console.log('[DiffReview] Processing file:', file.filePath);
                const decorations = await positionMapper.mapHunksToEditor(file);
                const editor = vscode.window.activeTextEditor;
                if (editor) {
                    await buttonRenderer.renderButtons(editor, decorations);
                }
            }
        }
        catch (error) {
            console.error('[DiffReview] Error:', error);
            vscode.window.showErrorMessage(`Error: ${error.message}`);
        }
    });
    // 注册隐藏内联按钮命令
    const hideCommand = vscode.commands.registerCommand('extension.hideInlineButtons', () => {
        buttonRenderer.clearButtons();
        vscode.window.showInformationMessage('Buttons hidden');
    });
    // 添加点击检测
    const selectionDisposable = vscode.window.onDidChangeTextEditorSelection(async (event) => {
        if (!event.textEditor || currentFiles.length === 0)
            return;
        const selection = event.selections[0];
        if (!selection)
            return;
        const document = event.textEditor.document;
        const position = selection.active;
        const line = position.line;
        const char = position.character;
        const lineContent = document.lineAt(line).text;
        // 检测行尾 - Accept
        if (char >= lineContent.length - 3) {
            const file = currentFiles.find(f => {
                return f.hunks.some(h => {
                    const hunkStart = h.oldStart - 1;
                    const hunkEnd = hunkStart + h.oldLines;
                    return line >= hunkStart && line < hunkEnd;
                });
            });
            if (file) {
                const hunk = file.hunks.find(h => {
                    const hunkStart = h.oldStart - 1;
                    const hunkEnd = hunkStart + h.oldLines;
                    return line >= hunkStart && line < hunkEnd;
                });
                if (hunk) {
                    const answer = await vscode.window.showInformationMessage(`Accept change in ${file.filePath}?`, 'Yes', 'No');
                    if (answer === 'Yes') {
                        await buttonRenderer.handleAccept(file, hunk);
                        vscode.commands.executeCommand('extension.showInlineButtons');
                    }
                }
            }
        }
        // 检测行头 - Reject
        if (char <= 3 && char > 0) {
            const file = currentFiles.find(f => {
                return f.hunks.some(h => {
                    const hunkStart = h.oldStart - 1;
                    const hunkEnd = hunkStart + h.oldLines;
                    return line >= hunkStart && line < hunkEnd;
                });
            });
            if (file) {
                const hunk = file.hunks.find(h => {
                    const hunkStart = h.oldStart - 1;
                    const hunkEnd = hunkStart + h.oldLines;
                    return line >= hunkStart && line < hunkEnd;
                });
                if (hunk) {
                    const answer = await vscode.window.showInformationMessage(`Reject change in ${file.filePath}?`, 'Yes', 'No');
                    if (answer === 'Yes') {
                        await buttonRenderer.handleReject(file, hunk);
                        vscode.commands.executeCommand('extension.showInlineButtons');
                    }
                }
            }
        }
    });
    context.subscriptions.push(showCommand, hideCommand, buttonRenderer, selectionDisposable);
}
function deactivate() {
    buttonRenderer?.dispose();
}
