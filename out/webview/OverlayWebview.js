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
exports.OverlayWebview = void 0;
const vscode = __importStar(require("vscode"));
const HunkActionHandler_1 = require("../actions/HunkActionHandler");
class OverlayWebview {
    constructor(extensionUri) {
        this.extensionUri = extensionUri;
        this.hunks = [];
        this.actionHandler = new HunkActionHandler_1.HunkActionHandler();
    }
    showButtons(hunks) {
        this.hunks = hunks;
        this.createOrShowPanel();
    }
    createOrShowPanel() {
        if (this.panel) {
            this.panel.reveal(vscode.ViewColumn.Two);
            this.updateContent();
            return;
        }
        this.panel = vscode.window.createWebviewPanel('overlayButtons', 'Diff Actions', vscode.ViewColumn.Two, { enableScripts: true });
        this.panel.webview.onDidReceiveMessage(async (message) => {
            if (message.command === 'accept') {
                await this.handleAccept(message.hunkId, message.filePath);
            }
            else if (message.command === 'reject') {
                await this.handleReject(message.hunkId, message.filePath);
            }
        });
        this.updateContent();
    }
    updateContent() {
        if (!this.panel)
            return;
        const buttonsHtml = this.hunks.map(({ hunk, fileDiff }) => `
      <div class="hunk-section" data-hunk-id="${hunk.id}" data-file-path="${fileDiff.filePath}">
        <div class="hunk-header">${hunk.header} - ${fileDiff.filePath}</div>
        <div class="buttons">
          <button class="accept-btn" onclick="accept('${hunk.id}', '${fileDiff.filePath}')">✓ Accept</button>
          <button class="reject-btn" onclick="reject('${hunk.id}', '${fileDiff.filePath}')">✗ Reject</button>
        </div>
      </div>
    `).join('');
        this.panel.webview.html = this.getHtml(buttonsHtml);
    }
    getHtml(buttonsHtml) {
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
          ${buttonsHtml || '<p>No hunks to display</p>'}
          <script>
            const vscode = acquireVsCodeApi();
            function accept(hunkId, filePath) { vscode.postMessage({ command: 'accept', hunkId, filePath }); }
            function reject(hunkId, filePath) { vscode.postMessage({ command: 'reject', hunkId, filePath }); }
          </script>
        </body>
      </html>`;
    }
    async handleAccept(hunkId, filePath) {
        const target = this.hunks.find(h => h.hunk.id === hunkId && h.fileDiff.filePath === filePath);
        if (target) {
            await this.actionHandler.acceptHunk(target.fileDiff, target.hunk);
        }
    }
    async handleReject(hunkId, filePath) {
        const target = this.hunks.find(h => h.hunk.id === hunkId && h.fileDiff.filePath === filePath);
        if (target) {
            await this.actionHandler.rejectHunk(target.fileDiff, target.hunk);
        }
    }
    hideButtons() {
        this.panel?.dispose();
        this.panel = undefined;
    }
    dispose() {
        this.hideButtons();
    }
}
exports.OverlayWebview = OverlayWebview;
