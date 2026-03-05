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
exports.GitDiffParser = void 0;
const child_process_1 = require("child_process");
const util_1 = require("util");
const vscode = __importStar(require("vscode"));
const execAsync = (0, util_1.promisify)(child_process_1.exec);
class GitDiffParser {
    constructor() {
        this.workspaceRoot = vscode.workspace.workspaceFolders?.[0]?.uri.fsPath;
    }
    async parse() {
        if (!this.workspaceRoot) {
            throw new Error('No workspace folder found');
        }
        const { stdout } = await execAsync('git diff --no-color', {
            cwd: this.workspaceRoot
        });
        return this.parseDiffOutput(stdout);
    }
    parseDiffOutput(diffOutput) {
        const files = [];
        const lines = diffOutput.split('\n');
        let currentFile = null;
        let currentHunk = null;
        let hunkContent = [];
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
                if (currentFile)
                    currentFile.status = 'added';
                continue;
            }
            // 删除文件: deleted file mode
            if (line.startsWith('deleted file mode')) {
                if (currentFile)
                    currentFile.status = 'deleted';
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
exports.GitDiffParser = GitDiffParser;
