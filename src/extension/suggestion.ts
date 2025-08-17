// my-plugin.ts
import { EditorSuggest, EditorPosition, Editor, EditorSuggestContext, EditorSuggestTriggerInfo } from "obsidian";
import { cloudDiskModel } from "src/model/cloud-disk-model";
import { checkLocalFileNodeSyncStatus, LocalFileNode } from "src/model/file-tree-node";
import { SyncStatus } from "src/model/sync-status";
import { Service } from "src/service";
import { Snapshot } from "src/sync/snapshot";

export default class CustomLinkSuggest extends EditorSuggest<string> {
    triggerChars = ["#", "@"]; // 改为用 # 或 @ 触发链接补全

    onTrigger(cursor: EditorPosition, editor: Editor): EditorSuggestTriggerInfo | null {
        const line = editor.getLine(cursor.line);
        // 检查光标前是否有 # 或 @，并且不是在单词中间
        const match = line.substring(0, cursor.ch).match(/(?:#|@)([^\s#@]*)$/);
        if (match) {
            console.log(`Suggestion matched: ${match[1]}`);
            const startCh = cursor.ch - match[0].length;
            return {
                start: { line: cursor.line, ch: startCh },
                end: cursor,
                query: match[1] || ""
            };
        }
        console.log(`Suggestion not matched`);
        return null;
    }

    getSuggestions(context: EditorSuggestContext) {
        // 返回自定义建议列表（如过滤特定文件夹文件）
        return Snapshot.prev.files
            .filter(file => !file.isdir && file.path.contains(context.query))
            .map(file => {
                const filePath = file.path.replace(cloudDiskModel.remoteRootPath, '');
                if (filePath.startsWith('/')) {
                    return filePath.slice(1);
                } else {
                    return filePath;
                }
            });
    }

    renderSuggestion(value: string, el: HTMLElement) {
        const remoteNode = Snapshot.prev.files.find(f => {
            const filePath = f.path.replace(cloudDiskModel.remoteRootPath, '').replace(/^\//, '');
            return filePath === value;
        });
        let status = SyncStatus.FullySynced;
        const localFile = cloudDiskModel.vault.getFileByPath(value);
        if (!localFile) {
            status = SyncStatus.RemoteCreated;
        } else {
            const localNode: LocalFileNode = {
                name: localFile.name,
                type: 'file',
                mtime: new Date(localFile.stat.mtime),
                syncStatus: SyncStatus.Unknown,
            };
            status = checkLocalFileNodeSyncStatus(localNode, remoteNode!);
        }

        // 状态图标和颜色
        let statusIcon = "";
        let statusColor = "";
        switch (status) {
            case SyncStatus.FullySynced:
                statusIcon = "✔️";
                statusColor = "#4caf50";
                break;
            case SyncStatus.RemoteCreated:
                statusIcon = "☁️";
                statusColor = "#2196f3";
                break;
            case SyncStatus.Conflict:
                statusIcon = "⚠️";
                statusColor = "#ff9800";
                break;
            case SyncStatus.LocalModified:
                statusIcon = "⬆️";
                statusColor = "#f44336";
                break;
            case SyncStatus.RemoteModified:
                statusIcon = "⬇️";
                statusColor = "#9c27b0";
                break;
            default:
                statusIcon = "❓";
                statusColor = "#757575";
        }

        const container = el.createDiv({ cls: "custom-link-suggest-item" });
        // 文件名
        container.createSpan({ text: value, cls: "suggest-file-path" });
        // 状态
        const statusSpan = container.createSpan({ cls: "suggest-file-status" });
        statusSpan.setText(` ${statusIcon} ${status}`);
        statusSpan.setAttr("style", `color:${statusColor};margin-left:8px;`);
    }

    selectSuggestion(value: string) {
        this.context?.editor.replaceRange(`[[${value}]]`, this.context.start, this.context.end);
    }
}