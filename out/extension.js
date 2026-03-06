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
    vscode.window.showInformationMessage('Diff Review loaded! Press Ctrl+Shift+D for inline buttons.');
    positionMapper = new EditorPositionMapper_1.EditorPositionMapper();
    buttonRenderer = new InlineButtonRenderer_1.InlineButtonRenderer();
    const showCommand = vscode.commands.registerCommand('extension.showInlineButtons', async () => {
        try {
            const parser = new GitDiffParser_1.GitDiffParser();
            const result = await parser.parse();
            if (result.files.length === 0) {
                vscode.window.showInformationMessage('No uncommitted changes found');
                return;
            }
            currentFiles = result.files;
            vscode.window.showInformationMessage(`Found ${result.files.length} file(s) with changes`);
            // 为每个文件显示按钮
            for (const file of result.files) {
                const decorations = await positionMapper.mapHunksToEditor(file);
                const editor = vscode.window.activeTextEditor;
                if (editor) {
                    await buttonRenderer.renderButtons(editor, decorations, result.files);
                }
            }
        }
        catch (error) {
            vscode.window.showErrorMessage(`Error: ${error.message}`);
        }
    });
    // 点击检测 - 点击行尾 accept，行头 reject
    const selectionDisposable = vscode.window.onDidChangeTextEditorSelection(async (event) => {
        if (!event.textEditor || currentFiles.length === 0)
            return;
        const selection = event.selections[0];
        if (!selection)
            return;
        const document = event.textEditor.document;
        const line = selection.active.line;
        const char = selection.active.character;
        const lineContent = document.lineAt(line).text;
        // 点击行尾 (Accept)
        if (char >= lineContent.length - 3) {
            await buttonRenderer.handleAcceptAtLine(line);
            buttonRenderer.clearButtons();
            // 刷新
            vscode.commands.executeCommand('extension.showInlineButtons');
            return;
        }
        // 点击行头 (Reject)
        if (char <= 3) {
            await buttonRenderer.handleRejectAtLine(line);
            buttonRenderer.clearButtons();
            vscode.commands.executeCommand('extension.showInlineButtons');
            return;
        }
    });
    context.subscriptions.push(showCommand, buttonRenderer, selectionDisposable);
}
function deactivate() {
    buttonRenderer?.dispose();
}
