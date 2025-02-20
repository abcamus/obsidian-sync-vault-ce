import { LocalFileNode } from './file-tree-node';
import { RemoteMeta, findRemoteFile, insertRemoteFile } from './meta-info';
import { createLogger } from '../util/logger';

const logger = createLogger('sync-status');

export enum SyncStatus {
    FullySynced = 'FullySynced',
    Conflict = 'Conflict',
    Syncing = 'Syncing',

    // to upload
    LocalModified = 'LocalModified',
    LocalCreated = 'LocalCreated',
    LocalDeleted = 'LocalDeleted',

    // to download
    RemoteCreated = 'RemoteCreated',
    RemoteModified = 'RemoteModified',
    RemoteDeleted = 'RemoteDeleted',

    SyncError = 'SyncError',
    Unknown = 'Unknown'
}

export const updateRemoteMetaAfterSync = (
    file: LocalFileNode,
    remotePath: string,
    remoteMeta: RemoteMeta,
    by: string,
) => {
    let remoteFile = findRemoteFile(remoteMeta, remotePath);
    const now = new Date().toISOString();
    logger.debug(`[updateRemoteMetaAfterSync] local file: `, file, `remote meta node: `, remoteFile);
    if (remoteFile) {
        remoteFile.lastSync = {
            time: now,
            by: by,
        }
        remoteFile.mtime = file.mtime?.getTime() || Date.now();
        remoteFile.size = file.size || 0;
        remoteFile.md5 = file.md5;
        remoteFile.encrypt = file.remoteEncrypt;
    } else {
        remoteFile = {
            name: file.name,
            type: file.type,
            size: file.size || 0,
            md5: file.md5,
            mtime: file.mtime?.getTime() || Date.now(),
            encrypt: file.remoteEncrypt,
            lastSync: {
                time: now,
                by: by,
            }
        };
    }
    logger.debug(`[updateRemoteMetaAfterSync] updated, local file:`, file, `remote: `, remoteFile);
    insertRemoteFile(remoteMeta, remotePath, remoteFile);
};

export const getSyncButtonClass = (status: SyncStatus): string => {
    switch (status) {
        case SyncStatus.FullySynced:
            return 'synced';
        case SyncStatus.Syncing:
            return 'syncing';
        case SyncStatus.Conflict:
            return 'conflict';
        case SyncStatus.LocalModified:
        case SyncStatus.LocalCreated:
        case SyncStatus.LocalDeleted:
            return 'upload';
        case SyncStatus.RemoteCreated:
        case SyncStatus.RemoteDeleted:
        case SyncStatus.RemoteModified:
            return 'download';
        default:
            return 'unsynced';
    }
};

export const getSyncButtonText = (status: SyncStatus): string => {
    switch (status) {
        case SyncStatus.FullySynced:
            return '已同步';
        case SyncStatus.LocalModified:
            return '本地修改，点击上传';
        case SyncStatus.RemoteModified:
            return '远程最新，点击下载';
        case SyncStatus.LocalCreated:
            return '本地创建，点击上传';
        case SyncStatus.RemoteCreated:
            return '远程创建，点击下载';
        case SyncStatus.LocalDeleted:
            return '本地删除，点击上传';
        case SyncStatus.RemoteDeleted:
            return '远程删除，点击下载';
        case SyncStatus.Conflict:
            return '所有文件需同步，点击同步';
        case SyncStatus.Unknown:
            return '未知';
        case SyncStatus.Syncing:
            return '同步中';
        default:
            return '未知';
    }
};

/**
 * 在根节点中找到目标路径对应的节点，并用新的节点替换旧的节点
 * @param root 根节点
 * @param targetPath 目标路径数组
 * @param newNode 新的节点
 */
export function updateLocalFileStatusRecursively(root: LocalFileNode, targetPath: string[], newNode: LocalFileNode): LocalFileNode {
    if (targetPath.length === 0) return root;

    const [nextName, ...restPath] = targetPath;
    if (root.children) {
        const newChildren = root.children.map(child => {
            if (child.name === nextName) {
                if (restPath.length === 0) {
                    return newNode;
                } else {
                    return updateLocalFileStatusRecursively(child, restPath, newNode);
                }
            }
            return child;
        });
        return { ...root, children: newChildren };
    }
    return root;
}

export function shouldDownload(syncStatus: SyncStatus): boolean {
    return syncStatus === SyncStatus.RemoteCreated || syncStatus === SyncStatus.RemoteModified;
}

export function shouldUpload(syncStatus: SyncStatus): boolean {
    return syncStatus === SyncStatus.LocalModified || syncStatus === SyncStatus.LocalCreated;
}

export function hasRemoteChanges(syncStatus: SyncStatus): boolean {
    return syncStatus === SyncStatus.RemoteCreated || syncStatus === SyncStatus.RemoteModified;
}
