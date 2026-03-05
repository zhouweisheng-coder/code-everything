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
exports.DiffPreviewPanel = void 0;
const vscode = __importStar(require("vscode"));
class DiffPreviewPanel {
    constructor(extensionUri, column) {
        this.extensionUri = extensionUri;
        this.panel = vscode.window.createWebviewPanel('diffPreview', 'Diff Preview', column, {
            enableScripts: true,
            retainContextWhenHidden: true
        });
        this.panel.webview.html = this.getHtmlForWebview('');
    }
    static createOrShow(extensionUri, fileDiff, hunk) {
        const column = vscode.window.activeTextEditor
            ? vscode.window.activeTextEditor.viewColumn
            : vscode.ViewColumn.One;
        // 处理 undefined 的情况
        const safeColumn = column ?? vscode.ViewColumn.One;
        if (DiffPreviewPanel.currentPanel) {
            DiffPreviewPanel.currentPanel.panel.reveal(safeColumn);
            DiffPreviewPanel.currentPanel.updateContent(fileDiff, hunk);
            return;
        }
        DiffPreviewPanel.currentPanel = new DiffPreviewPanel(extensionUri, safeColumn);
        DiffPreviewPanel.currentPanel.updateContent(fileDiff, hunk);
    }
    updateContent(fileDiff, hunk) {
        this.currentFileDiff = fileDiff;
        this.currentHunk = hunk;
        let content;
        if (hunk) {
            // 只显示选中的 hunk
            content = this.renderHunk(hunk);
        }
        else {
            // 显示文件的所有 hunks
            content = fileDiff.hunks.map(h => this.renderHunk(h)).join('\n');
        }
        this.panel.webview.html = this.getHtmlForWebview(content);
    }
    renderHunk(hunk) {
        return `<div class="hunk">
      <div class="hunk-header">${hunk.header}</div>
      <pre class="hunk-content">${hunk.content}</pre>
    </div>`;
    }
    getHtmlForWebview(content) {
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
    dispose() {
        DiffPreviewPanel.currentPanel = undefined;
        this.panel.dispose();
    }
}
exports.DiffPreviewPanel = DiffPreviewPanel;
