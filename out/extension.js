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
const DiffTreeDataProvider_1 = require("./views/DiffTreeDataProvider");
const DiffPreviewPanel_1 = require("./views/DiffPreviewPanel");
const OverlayWebview_1 = require("./webview/OverlayWebview");
let diffTreeProvider;
let diffFiles = [];
let overlayWebview;
function activate(context) {
    console.log('Diff Review extension activated');
    // 初始化 OverlayWebview
    overlayWebview = new OverlayWebview_1.OverlayWebview(context.extensionUri);
    diffTreeProvider = new DiffTreeDataProvider_1.DiffTreeDataProvider();
    // 创建 TreeView 并监听选择变化
    const view = vscode.window.createTreeView('diffReviewView', {
        treeDataProvider: diffTreeProvider
    });
    view.onDidChangeSelection(async (e) => {
        if (e.selection && e.selection.length > 0) {
            const element = e.selection[0];
            if (element.contextValue === 'hunk') {
                // 查找对应的文件和 hunk
                for (const file of diffFiles) {
                    const hunk = file.hunks.find(h => h.id === element.id);
                    if (hunk) {
                        // 只显示选中的 hunk 内容
                        DiffPreviewPanel_1.DiffPreviewPanel.createOrShow(context.extensionUri, file, hunk);
                        // 显示 OverlayWebview 接受/拒绝按钮
                        overlayWebview.showButtons([{ hunk, fileDiff: file }]);
                        break;
                    }
                }
            }
        }
    });
    const command = vscode.commands.registerCommand('extension.showDiffPanel', async () => {
        const parser = new GitDiffParser_1.GitDiffParser();
        const result = await parser.parse();
        diffFiles = result.files;
        diffTreeProvider.updateFiles(result.files);
        vscode.commands.executeCommand('workbench.view.extension.diffReviewView');
    });
    context.subscriptions.push(command, view, overlayWebview);
}
function deactivate() { }
