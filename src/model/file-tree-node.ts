`
A file tree is originally depicted by json.

see doc/file-tree.json
`

import { SyncStatus, shouldUpload } from '@/model/sync-status';
import { createLogger } from '@/util/logger';
import { RemoteMeta, findRemoteFile, RemoteFileNode } from '@/model/meta-info';
import { EMPTY_FILE_MD5 } from '@/util/md5';
import * as path from '@/util/path';
import { FileEntry } from '@/types';
const logger = createLogger('file-tree');

export interface LocalFileNode {
    name: string;
    type: 'file' | 'directory';
    md5?: string;
    size?: number; // in Bytes
    ctime?: Date;  // file creation time
    mtime?: Date;  // file modification time
    syncStatus: SyncStatus;
    lastSyncTime?: Date;
    children?: LocalFileNode[];
    remoteEncrypt?: boolean;
}

export function insertNodeAt(rootNode: LocalFileNode, path: string, node: LocalFileNode) {
    logger.debug(`[insertNodeAt] node: ${JSON.stringify(node, null, 2)}, at: ${path}`);
    const parts = path.split('/').filter(part => part != '');

    let currentNode = rootNode;

    // if folder does not exist, create it
    for (let i = 0; i < parts.length - 1; i++) {
        const part = parts[i];
        if ('children' in currentNode && Array.isArray(currentNode.children)) {
            let found = currentNode.children.find(child => child.name === part);
            if (!found) {
                found = {
                    name: part,
                    md5: EMPTY_FILE_MD5,
                    mtime: new Date(),
                    type: 'directory',
                    children: [],
                    syncStatus: SyncStatus.Unknown,
                };
                currentNode.children.push(found);
            } else if (found.type !== 'directory') {
                logger.error(`invalid inner path, found: ${JSON.stringify(found)} is not a directory`);
                return false;
            }
            currentNode = found;
        } else {
            logger.error(`invalid current node: ${JSON.stringify(currentNode)} is not a directory`);
            return false;
        }
    }

    logger.debug(`[insertNodeAt] searching node: ${node.name}`);
    if ('children' in currentNode && Array.isArray(currentNode.children)) {
        const existingFile = currentNode.children.find(child => child.name === node.name);
        if (existingFile) {
            existingFile.children = node.children;
            existingFile.syncStatus = node.syncStatus;
            existingFile.mtime = node.mtime;
            existingFile.size = node.size;
        } else {
            currentNode.children.push(node);
        }
        return true;
    }
    logger.debug(`[insertNodeAt] find node: ${JSON.stringify(node, null, 2)}`);
    return false;
}

export function removeNodeAt(rootNode: LocalFileNode, path: string): LocalFileNode | null {
    const parts = path.split('/').filter(part => part !== '');
    let currentNode = rootNode;

    for (let i = 0; i < parts.length - 1; i++) {
        const part = parts[i];
        if ('children' in currentNode && Array.isArray(currentNode.children)) {
            const found = currentNode.children.find(child => child.name === part);
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
            const deletedNode = currentNode.children.splice(index, 1);
            logger.debug(`[removeNodeAt] deleted node: ${nodeNameToDelete} at path: ${path}`);
            return deletedNode[0];
        } else {
            logger.error(`node not found: ${nodeNameToDelete}`);
            return null;
        }
    }
    return null;
}

export function renameNode(root: LocalFileNode, fromPath: string, toPath: string) {
    if (fromPath === toPath) {
        return true;
    }

    const nodeToRename = removeNodeAt(root, fromPath);
    if (!nodeToRename) {
        logger.error(`node not found at path: ${fromPath}`);
        return false;
    }

    nodeToRename.name = toPath.split('/').pop() || toPath;

    const insertSuccess = insertNodeAt(root, toPath, nodeToRename);
    if (!insertSuccess) {
        logger.error(`failed to insert node at path: ${toPath}`);
        return false;
    }

    return true;
}

export function findNodeAt(root: LocalFileNode, at: string): LocalFileNode | null {
    const parts = at.split('/').filter(part => part !== '');
    let currentNode: LocalFileNode | null = root;

    for (const part of parts) {
        if (currentNode && 'children' in currentNode && Array.isArray(currentNode.children)) {
            const found: LocalFileNode | undefined = currentNode.children.find(child => child.name === part);
            if (found) {
                currentNode = found;
            } else {
                return null;
            }
        } else {
            return null;
        }
    }

    return currentNode;
}

// set syncStatus to SyncStatus.FullySynced
export function markAsSyncedRecursively(node: LocalFileNode): LocalFileNode {
    node.syncStatus = SyncStatus.FullySynced;
    if (node.type === 'directory' && node.children) {
        node.children = node.children.map(child => markAsSyncedRecursively(child));
    }
    return node;
}

export function deepCopyNode(node: LocalFileNode): LocalFileNode {
    const newNode = { ...node };
    if (node.children) {
        newNode.children = node.children.map(child => deepCopyNode(child));
    }
    return newNode;
}

function isFileEntry(node: RemoteFileNode | FileEntry): node is FileEntry {
    return 'fsid' in node;
}

export function checkLocalFileNodeSyncStatus(localNode: LocalFileNode, remoteNode: RemoteFileNode | FileEntry | null): SyncStatus {
    if (remoteNode?.md5 && (remoteNode?.md5 === localNode.md5)) {
        // FIXME: extra md5 check
        return SyncStatus.FullySynced;
    }

    if (!remoteNode) {
        return SyncStatus.LocalCreated;
    }

    // NOTE: compare time in seconds(windows mtime is in seconds)
    const localMtime = Math.floor((localNode.mtime?.getTime() || 0) / 1000);
    const remoteMtime = isFileEntry(remoteNode) ? remoteNode.mtime : Math.floor(remoteNode.mtime / 1000);

    logger.debug(`[checkLocalFileNodeSyncStatus] local mtime: ${localMtime}, remote mtime: ${remoteMtime}`);

    if (localMtime > remoteMtime) {
        return SyncStatus.LocalModified;
    }

    if (localMtime < remoteMtime) {
        return SyncStatus.RemoteModified;
    }

    return SyncStatus.FullySynced;
}

export function checkLocalNodeSyncStatus(localNode: LocalFileNode, nodePath: string, remoteMeta: RemoteMeta, deviceName: string): SyncStatus {
    const remoteNode = findRemoteFile(remoteMeta, nodePath);
    return localNode.type === 'directory' ?
        checkLocalFolderSyncStatus(localNode, remoteNode ? remoteNode : null, nodePath) :
        checkLocalFileNodeSyncStatus(localNode, remoteNode ? remoteNode : null);
}

export const updateLocalNodeSyncStatus = (currentPath: string[], node: LocalFileNode, remoteNode: RemoteFileNode) => {
    const localPath = currentPath.length > 0 ? `${currentPath.join('/')}/${node.name}` : node.name;

    if (node.type === 'directory') {
        node.syncStatus = checkLocalFolderSyncStatus(node, remoteNode, localPath);
    } else {
        node.syncStatus = checkLocalFileNodeSyncStatus(node, remoteNode);
    }
};

export interface UploadItem {
    node: LocalFileNode;
    path: string;
}

export function getUploadFileListOfNode(node: LocalFileNode, currentPath: string): UploadItem[] {
    let result: UploadItem[] = [];

    if (node.children) {
        result = node.children
            .filter(child => child.type === 'file' && shouldUpload(child.syncStatus))
            .map(child => ({ node: child, path: path.join(currentPath, child.name) }));
    }

    // recursive
    if (node.children) {
        node.children
            .filter(child => child.type === 'directory')
            .forEach(child => {
                result = result.concat(getUploadFileListOfNode(child, path.join(currentPath, child.name)));
            });
    }

    return result;
}

function checkLocalFolderSyncStatus(folder: LocalFileNode, remoteNode: RemoteFileNode | null, path: string): SyncStatus {
    let hasLocalModified = false;
    let hasRemoteModified = false;
    let hasConflict = false;
    let hasSyncing = false;
    let hasFullySynced = true;

    // create remote file map
    const remoteFiles = new Map<string, RemoteFileNode>();
    remoteNode?.children?.forEach(child => {
        remoteFiles.set(child.name, child);
    });

    // generate sync status
    for (const child of folder.children || []) {
        const childPath = `${path}/${child.name}`;
        const remoteChild = remoteFiles.get(child.name) ?? null;
        remoteFiles.delete(child.name);

        let childStatus: SyncStatus;
        if (child.type === 'directory') {
            childStatus = checkLocalFolderSyncStatus(child, remoteChild, childPath);
        } else {
            childStatus = checkLocalFileNodeSyncStatus(child, remoteChild);
        }

        switch (childStatus) {
            case SyncStatus.LocalModified:
            case SyncStatus.LocalCreated:
            case SyncStatus.LocalDeleted:
                hasLocalModified = true;
                hasFullySynced = false;
                break;
            case SyncStatus.RemoteModified:
            case SyncStatus.RemoteCreated:
            case SyncStatus.RemoteDeleted:
                hasRemoteModified = true;
                hasFullySynced = false;
                break;
            case SyncStatus.Conflict:
                hasConflict = true;
                hasFullySynced = false;
                break;
            case SyncStatus.Syncing:
                hasSyncing = true;
                hasFullySynced = false;
                break;
            case SyncStatus.FullySynced:
                break;
            default:
                hasFullySynced = false;
                break;
        }
    }

    if (remoteFiles.size > 0) {
        hasRemoteModified = true;
        hasFullySynced = false;
    }

    if (hasConflict) {
        return SyncStatus.Conflict;
    } else if (hasSyncing) {
        return SyncStatus.Syncing;
    } else if (hasLocalModified && !hasRemoteModified) {
        return SyncStatus.LocalModified;
    } else if (hasRemoteModified && !hasLocalModified) {
        return SyncStatus.RemoteModified;
    } else if (hasFullySynced) {
        return SyncStatus.FullySynced;
    } else {
        return SyncStatus.Unknown;
    }
}

export const isFolderNodeEmpty = (node: LocalFileNode) => {
    if (node.type !== 'directory') {
        return false;
    }

    for (const child of node.children || []) {
        if (child.type === 'file') {
            return false;
        }
        if (!isFolderNodeEmpty(child)) {
            return false;
        }
    }

    return true;
}