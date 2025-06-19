import { Vault, TFile, TFolder } from "obsidian";
import { LocalFileNode } from "./file-tree-node";
import { SyncStatus } from "./sync-status";

export class VaultModel {
    static async getVaultAsFileTree(vault: Vault, callback?: (path: string, node: LocalFileNode) => void): Promise<LocalFileNode> {
        const rootFolder = vault.getRoot();
        return this.buildFileTree(vault, rootFolder, callback);
    }

    private static async buildFileTree(vault: Vault, folder: TFolder, callback?: (path: string, node: LocalFileNode) => void): Promise<LocalFileNode> {
        const children: LocalFileNode[] = [];

        folder.children.forEach(async child => {
            if (child instanceof TFolder) {
                children.push(await this.buildFileTree(vault, child, callback));
                /* 深度优先：最后处理目录节点 */
                if (callback) {
                    callback(child.path, children[children.length - 1]);
                }
            } else if (child instanceof TFile) {
                children.push({
                    name: child.name,
                    type: 'file',
                    md5: '',
                    size: child.stat.size,
                    ctime: new Date(child.stat.ctime),
                    mtime: new Date(child.stat.mtime),
                    syncStatus: SyncStatus.LocalCreated,
                });
                if (callback) {
                    callback(child.path, children[children.length - 1]);
                }
            }
        });

        const folderStat = await vault.adapter.stat(folder.path);

        return {
            name: folder.name,
            type: 'directory',
            md5: '',
            children: children,
            size: undefined,
            mtime: new Date(folderStat!.mtime),
            syncStatus: SyncStatus.LocalCreated,
        };
    }
}