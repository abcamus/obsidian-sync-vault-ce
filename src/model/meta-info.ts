import { createLogger } from '../util/logger';
import { EMPTY_FILE_MD5 } from '../util/md5';
import { LocalFileNode } from './file-tree-node';
import { SyncStatus, shouldDownload } from './sync-status';
import { findNodeAt, checkLocalFileNodeSyncStatus } from './file-tree-node';

const logger = createLogger('meta-info');

export interface LastSync {
    by: string; // device name
    time: string; // ISO format
}

export interface RemoteFileNode {
    name: string;
    size: number;
    type: 'file' | 'directory';
    mtime: number;
    md5?: string;
    encrypt?: boolean;
    children?: RemoteFileNode[];
    lastSync?: LastSync;
}

// 远程文件系统元数据
export interface RemoteMeta {
    name: string;
    md5: string;
    latest?: LastSync;
    children: RemoteFileNode[];
}

export function findRemoteFile(remoteMeta: RemoteMeta, path: string): RemoteFileNode | null {
    const parts = path.split('/').filter(part => part !== '');
    let current: RemoteFileNode | RemoteMeta = remoteMeta;

    for (const part of parts) {
        if ('children' in current && Array.isArray(current.children)) {
            const found: RemoteFileNode | undefined = current.children.find(child => child.name === part);
            if (!found) {
                return null;
            }
            current = found;
        } else {
            return null;
        }
    }

    return 'type' in current ? current : null;
}

export function insertRemoteFile(root: RemoteMeta, path: string, newFile: RemoteFileNode): boolean {
    const parts = path.split('/').filter(part => part !== '');
    let current: RemoteFileNode | RemoteMeta = root;

    for (let i = 0; i < parts.length - 1; i++) {
        const part = parts[i];
        if ('children' in current && Array.isArray(current.children)) {
            let found: RemoteFileNode | undefined = current.children.find(child => child.name === part);
            if (!found) {
                found = {
                    name: part,
                    size: 0,
                    md5: EMPTY_FILE_MD5,
                    mtime: Date.now(),
                    type: 'directory',
                    children: []
                };
                current.children.push(found);
            } else if (found.type !== 'directory') {
                logger.error(`invalid inner path, found: ${JSON.stringify(found)} is not a directory`);
                return false;
            }
            current = found;
        } else {
            logger.error(`invalid current node: ${JSON.stringify(current)} is not a directory`);
            return false;
        }
    }

    if ('children' in current && Array.isArray(current.children)) {
        const existingFile = current.children.find(child => child.name === newFile.name);
        if (existingFile) {
            existingFile.mtime = newFile.mtime;
            existingFile.lastSync = newFile.lastSync;
            existingFile.children = newFile.children;
        } else {
            current.children.push(newFile);
        }
        return true;
    }

    const existingFile = current.children?.find(child => child.name === newFile.name);
    if (existingFile) {
        existingFile.mtime = newFile.mtime;
        existingFile.lastSync = newFile.lastSync;
        existingFile.children = newFile.children;
    } else {
        if (current.children) {
            current.children.push(newFile);
        } else {
            current.children = [newFile];
        }
    }
    return true;
}

export function removeMetaNodeAt(root: RemoteMeta, path: string): RemoteFileNode | null {
    const parts = path.split('/').filter(part => part !== '');
    let currentNode: RemoteMeta | RemoteFileNode = root;

    for (let i = 0; i < parts.length - 1; i++) {
        const part = parts[i];
        if ('children' in currentNode && Array.isArray(currentNode.children)) {
            const found: RemoteFileNode | undefined = currentNode.children.find(child => child.name === part);
            if (!found) {
                logger.error(`path not found: ${path}`);
                return null;
            }
            currentNode = found;
        } else {
            logger.error(`invalid current node: ${JSON.stringify(currentNode)} is not a directory`);
            return null;
        }
    }

    const nodeNameToDelete = parts[parts.length - 1];
    if ('children' in currentNode && Array.isArray(currentNode.children)) {
        const index = currentNode.children.findIndex(child => child.name === nodeNameToDelete);
        if (index !== -1) {
            const oldNodes = currentNode.children.splice(index, 1); // 删除节点
            logger.debug(`[removeMetaNodeAt] deleted node: ${nodeNameToDelete} at path: ${path}`);
            return oldNodes[0];
        } else {
            logger.error(`node not found: ${nodeNameToDelete}`);
            return null;
        }
    }
    return null;
}

export function renameMetaNode(root: RemoteMeta, from: string, to: string) {
    if (from === to) {
        return true;
    }

    const nodeToRename = removeMetaNodeAt(root, from);
    if (!nodeToRename) {
        logger.error(`node not found at path: ${from}`);
        return false;
    }

    nodeToRename.name = to.split('/').pop() || to;

    const insertSuccess = insertRemoteFile(root, to, nodeToRename);
    if (!insertSuccess) {
        logger.error(`failed to insert node at path: ${to}`);
        return false;
    }

    return true;
}

function processChildren(children: any[]): LocalFileNode[] {
    return children?.map((child): LocalFileNode => (
        {
            name: child.name,
            size: child.size,
            type: child.type,
            mtime: new Date(child.mtime),
            md5: child.md5,
            remoteEncrypt: child.encrypt,
            syncStatus: child.lastSync ? SyncStatus.RemoteModified : SyncStatus.RemoteCreated,
            children: processChildren(child.children || [])
        }
    )) || [];
}

export function getRemoteContentsByPath(remoteMeta: RemoteMeta, path: string[]): LocalFileNode[] {
    let current: RemoteMeta | RemoteFileNode = remoteMeta;

    for (const part of path) {
        if ('children' in current && Array.isArray(current.children)) {
            const found: RemoteFileNode | undefined = current.children.find(child => child.name === part);
            if (!found) {
                return [];
            }
            current = found;
        } else {
            return [];
        }
    }

    return 'children' in current ? current.children?.map((file): LocalFileNode => (
        {
            name: file.name,
            size: file.size,
            type: file.type,
            mtime: new Date(file.mtime),
            md5: file.md5,
            remoteEncrypt: file.encrypt,
            syncStatus: file.lastSync ? SyncStatus.RemoteModified : SyncStatus.RemoteCreated,
            children: processChildren(file.children || []),
        })) || [] : [];
}

function checkRemoteFileSyncStatusByPath(remoteNode: RemoteFileNode, remoteFilePath: string, root: LocalFileNode): SyncStatus {
    const localNode = findNodeAt(root, remoteFilePath);
    if (!localNode) {
        return SyncStatus.RemoteCreated;
    }
    return checkLocalFileNodeSyncStatus(localNode, remoteNode);
}

export interface DownloadItem {
    node: RemoteFileNode;
    path: string;
}

export function getDownloadFileListOfNode(remote: RemoteFileNode, local: LocalFileNode | undefined, nodePath: string): DownloadItem[] {
    const result: DownloadItem[] = [];
    if (remote.type === 'file' && (!local || !local.mtime || remote.mtime > local.mtime.getTime())) {
        result.push({ node: remote, path: nodePath });
    }

    if (remote.children) {
        remote.children.forEach(remoteChild => {
            const localChild = local?.children?.find(l => l.name === remoteChild.name);
            result.push(...getDownloadFileListOfNode(remoteChild, localChild, `${nodePath}/${remoteChild.name}`));
        });
    }

    return result;
}

export function getDownloadFileListOfAll(remoteMeta: RemoteMeta, localRoot: LocalFileNode): DownloadItem[] {
    const result: DownloadItem[] = [];

    // visit
    if (remoteMeta.children) {
        remoteMeta.children.forEach(remoteChild => {
            const localChild = localRoot.children?.find(l => l.name === remoteChild.name);
            result.push(...getDownloadFileListOfNode(remoteChild, localChild, remoteChild.name));
        });
    }

    return result.filter(item => {
        // FIXME: checkRemoteFileSyncStatusByPath和getDownloadFileListOfNode在判断同步状态的时候逻辑重复
        const syncStatus = checkRemoteFileSyncStatusByPath(item.node, item.path, localRoot);
        // NOTE: getDownloadFileListOfNode已经过滤了文件，不会将文件夹加入到下载列表中
        return shouldDownload(syncStatus);
    });
}

/**
 * delete empty folders in RemoteMeta recursively
 * @param remoteMeta
 * @returns has deletion or not
 */
export function removeEmptyDir(remoteMeta: RemoteMeta): boolean {
    let hasChanges = false;

    /**
     * check and delete empty folder
     * @param node current node
     * @returns isEmptyFolder
     */
    function removeEmptyDirRecursive(node: RemoteFileNode | RemoteMeta): boolean {
        if ('type' in node && node.type === 'file') {
            return false;
        }

        if (!node.children || node.children.length === 0) {
            return true;
        }

        for (let i = node.children.length - 1; i >= 0; i--) {
            const child = node.children[i];
            
            if (removeEmptyDirRecursive(child)) {
                if (child.type === 'directory') {
                    node.children.splice(i, 1);
                    hasChanges = true;
                    logger.debug(`[removeEmptyDir] Removed empty directory: ${child.name}`);
                }
            }
        }

        return node.children.length === 0;
    }

    removeEmptyDirRecursive(remoteMeta);

    if (hasChanges) {
        logger.info('[removeEmptyDir] Empty directories have been removed from RemoteMeta');
    }

    return hasChanges;
}