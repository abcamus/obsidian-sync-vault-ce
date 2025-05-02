import React, { useState, useEffect, useCallback, useRef } from 'react';
import { TAbstractFile, TFile, TFolder, Vault, Notice } from 'obsidian';
import { VaultModel } from '../../model/vault-model';
import { cloudDiskModel } from '../../model/cloud-disk-model';
import { uploadFileNode, downloadFileNodes } from '../../model/sync-action';
import { renderFileItem } from "./render";
import * as util from '../../util';
import { Snapshot } from '../../sync/snapshot';
import { isFolderNodeEmpty } from '../../model/file-tree-node';
import { i18n } from '../../i18n';

import * as metaInfo from '../../model/meta-info';

import {
    checkLocalFileNodeSyncStatus,
    findNodeAt,
    insertNodeAt,
    LocalFileNode,
    removeNodeAt,
    updateLocalNodeSyncStatus,
    renameNode,
} from '../../model/file-tree-node';

import {
    SyncStatus,
    updateRemoteMetaAfterSync,
    shouldUpload,
    shouldDownload,
    hasRemoteChanges,
} from '../../model/sync-status';
import { Service } from '../../service';
import { ignoreModify } from '../../service/vendor/aliyun/upload';
import { CloudDiskType } from 'src/service/cloud-interface';
import { shouldIgnore } from 'src/sync/ignore';

const logger = util.logger.createLogger('local-file-browser');

interface FileBrowserProps {
    vault: Vault;
    currentPath: string[];
    onFileSelect: (file: LocalFileNode) => void;
}

type FileState = {
    currentFiles: LocalFileNode[];
    rootNode: LocalFileNode | null;
    remoteMeta: metaInfo.RemoteMeta | null;
}

type LoadingState = {
    isLoading: boolean; /* 加载文件夹内容 */
    isLoadingRemoteMeta: boolean; /* 加载远程meta */
    isLoadingRootNode: boolean; /* 加载本地根节点 */
    isFirstLoad: boolean; /* 是否是第一次加载 */
}

type SyncState = {
    syncingFiles: Set<string>;
    syncProgress: { [key: string]: { completed: number, total: number } };
    isUploading: boolean;
    isDownloading: boolean;
    isAutoSync: boolean;
    autoSyncItem: string;
    autoSyncProgress: { completed: number, total: number };
}

const LocalFileBrowser: React.FC<FileBrowserProps> = ({ vault, currentPath, onFileSelect }) => {
    const [fileState, setFileState] = useState<FileState>({
        currentFiles: [],
        rootNode: null,
        remoteMeta: null,
    });

    const [loadingState, setLoadingState] = useState<LoadingState>({
        isLoading: false,
        isLoadingRemoteMeta: true,
        isLoadingRootNode: false,
        isFirstLoad: true,
    });

    const [syncState, setSyncState] = useState<SyncState>({
        syncingFiles: new Set(),
        syncProgress: {},
        isUploading: false,
        isDownloading: false,
        isAutoSync: false,
        autoSyncItem: '',
        autoSyncProgress: { completed: 0, total: 0 },
    });

    const currentPathRef = useRef(currentPath);
    const fileStateRef = useRef(fileState);
    const syncStateRef = useRef(syncState);

    const loadFolderContents = useCallback(async (targetPath?: string[]) => {
        setLoadingState(prev => ({ ...prev, isLoading: true }));

        if (!fileState.rootNode || !fileState.remoteMeta) {
            setLoadingState(prev => ({ ...prev, isLoading: false }));
            return;
        }
        const pathToLoad = targetPath || currentPathRef.current;

        try {
            let localNodes: LocalFileNode[];
            localNodes = pathToLoad.length === 0 ? fileState.rootNode?.children || [] : findFolderByPath(fileState.rootNode, pathToLoad)?.children || [];
            const remoteNodes = metaInfo.getRemoteContentsByPath(fileState.remoteMeta!, pathToLoad);
            const mergedContents = new Map<string, LocalFileNode>();
            localNodes.forEach(item => {
                mergedContents.set(item.name, item);
            });

            remoteNodes.forEach(item => {
                /* NOTE: 云端空文件夹不同步 */
                if (item.type === 'directory' && isFolderNodeEmpty(item)) {
                    return;
                }
                if (!mergedContents.has(item.name)) {
                    mergedContents.set(item.name, {
                        ...item,
                        syncStatus: SyncStatus.RemoteCreated,
                    });
                } else {
                    const localFile = mergedContents.get(item.name)!;
                    const localFilePath = util.path.join(pathToLoad.join('/'), localFile.name);
                    const remoteNode = metaInfo.findRemoteFile(fileState.remoteMeta!, localFilePath);
                    updateLocalNodeSyncStatus(pathToLoad, localFile, remoteNode!);
                    logger.debug(`[loadFolderContents] resolving item: ${item.name}, status: ${localFile.syncStatus}, children: ${localFile?.children?.length}, remoteChildren: ${item?.children?.length}`);
                    insertNodeAt(fileState.rootNode!, localFilePath, localFile);
                }
            });

            /* 如果本地文件夹为空，且无云端内容，则设置为已同步 */
            mergedContents.forEach((node, path) => {
                if (node.type === 'directory' && !hasRemoteChanges(node.syncStatus) && isFolderNodeEmpty(node)) {
                    node.syncStatus = SyncStatus.FullySynced;
                }
            });

            const sortedContents = sortFiles(Array.from(mergedContents.values()));
            setFileState(prev => ({ ...prev, currentFiles: sortedContents }));
        } catch (error) {
            logger.error(`Error loading folder contents: ${error}, path: ${pathToLoad.join('/')}`);
        } finally {
            setLoadingState(prev => ({ ...prev, isLoading: false, isFirstLoad: false }));
        }
    }, [fileState.rootNode, fileState.remoteMeta, currentPath]);

    const sortFiles = (files: LocalFileNode[]): LocalFileNode[] => {
        return files.sort((a, b) => {
            // 首先按类型排序：文件夹在前，文件在后
            if (a.type !== b.type) {
                return a.type === 'directory' ? -1 : 1;
            }
            // 然后按名字字母顺序排序
            return a.name.localeCompare(b.name, undefined, { numeric: true, sensitivity: 'base' });
        });
    };

    const loadRootNode = async () => {
        try {
            const localRootNode = await VaultModel.getVaultAsFileTree(vault);
            setFileState(prev => ({ ...prev, rootNode: localRootNode }));
        } catch (error) {
            logger.error('加载本地根节点时出错:', error);
        } finally {
            logger.debug('加载本地文件信息完成');
            setLoadingState(prev => ({ ...prev, isLoadingRootNode: false }));
        }
    };

    async function generateRemoteMetaFromSnapshot(): Promise<metaInfo.RemoteMeta | null> {
        const name = cloudDiskModel.selectedCloudDisk.toString();
        try {
            const files = await Service.info.listAllFiles(cloudDiskModel.remoteRootPath);
            const remoteSnapshot = Snapshot.createWithFiles(files);
            logger.info(`获取云盘元数据，文件数: ${Object.keys(remoteSnapshot.data).length}`);

            // 创建新的 RemoteMeta 结构
            const remoteMeta: metaInfo.RemoteMeta = {
                name: cloudDiskModel.vault.getName(),
                md5: '',
                children: []
            };

            // 遍历所有已同步的文件
            logger.debug(`[generateRemoteMetaFromSnapshot] remoteSnapshot: ${JSON.stringify(remoteSnapshot.data)}`);
            for (const [filePath, fileInfo] of Object.entries(remoteSnapshot.data)) {
                // 忽略隐藏文件和文件夹
                if (filePath.startsWith('.')) {
                    continue;
                }
                const fileNode: metaInfo.RemoteFileNode = {
                    name: filePath.split('/').pop()!,
                    type: fileInfo.isdir ? 'directory' : 'file',
                    size: fileInfo.size,
                    md5: fileInfo.md5,
                    mtime: util.time.secToMs(fileInfo.mtime),
                    children: fileInfo.isdir ? [] : undefined,
                };

                // 将文件节点插入到正确的路径
                logger.debug(`insert remote file: ${filePath}, node: ${JSON.stringify(fileNode)}`);
                metaInfo.insertRemoteFile(remoteMeta, filePath, fileNode);
            }

            const hasChanges = metaInfo.removeEmptyDir(remoteMeta);
            logger.info(`快照生成完成, 删除空文件夹: ${hasChanges}`);
            return remoteMeta;
        } catch (error) {
            logger.error('快照生成失败,', error);
            return null;
        }
    }

    const loadRemoteMeta = async (retryCount = 0) => {
        const maxRetries = 5;
        try {
            if (!cloudDiskModel.initialized) {
                if (retryCount >= maxRetries) {
                    logger.error('CloudDiskModel initialization timeout after 5 retries');
                    new Notice('初始化云盘信息失败，请重试');
                    return;
                }
                logger.info('CloudDiskModel not initialized yet, waiting...');
                setTimeout(async () => {
                    await loadRemoteMeta(retryCount + 1);
                }, 1000);
                return;
            }
            let remoteMeta = await generateRemoteMetaFromSnapshot();
            if (!remoteMeta) {
                remoteMeta = await cloudDiskModel.getRemoteMeta();
            }
            setFileState(prev => ({ ...prev, remoteMeta: remoteMeta }));
            setLoadingState(prev => ({ ...prev, isLoadingRemoteMeta: false }));
        } catch (error) {
            logger.error('Failed to load remote meta:', error);
            new Notice('加载远程文件信息失败，请稍后重试');
        } finally {
            // setLoadingState(prev => ({ ...prev, isLoadingRemoteMeta: false }));
        }
    }

    useEffect(() => {
        currentPathRef.current = currentPath;
    }, [currentPath]);

    useEffect(() => {
        fileStateRef.current = fileState;
    }, [fileState]);

    useEffect(() => {
        syncStateRef.current = syncState;
    }, [syncState]);

    /* 启动 */
    useEffect(() => {
        setLoadingState(prev => ({
            ...prev,
            isLoadingRemoteMeta: true,
            isLoadingRootNode: true
        }));
    }, []);

    /* 加载meta */
    useEffect(() => {
        if (loadingState.isLoadingRemoteMeta) {
            loadRemoteMeta();
        }
    }, [loadingState.isLoadingRemoteMeta]);

    /* 如果远程meta加载成功，则加载本地根节点 */
    useEffect(() => {
        if (!loadingState.isLoadingRemoteMeta && loadingState.isLoadingRootNode) {
            loadRootNode();
        }
    }, [loadingState.isLoadingRemoteMeta, loadingState.isLoadingRootNode]);

    useEffect(() => {
        if (!loadingState.isFirstLoad) {
            setSyncState(prev => ({ ...prev, isAutoSync: cloudDiskModel.autoMode }));
        }
    }, [loadingState.isFirstLoad]);

    /* 处理自动同步 */
    useEffect(() => {
        const asyncHandleAutoSync = async () => {
            logger.debug('[handleAutoSync]', {
                loadingState: 'loadingState',
                syncState: 'syncState',
                fileState: 'fileState'
            });
            if (!syncState.isAutoSync) {
                return;
            }
            logger.debug('[handleAutoSync] start');
            const nodes = fileStateRef.current.currentFiles.filter(node => {
                const nodePath = util.path.join(currentPathRef.current.join('/'), node.name);
                return shouldDownload(node.syncStatus) && !shouldIgnore(nodePath, node);
            });

            for (const node of nodes) {
                await handleSync('download', node);
            }
            setSyncState(prev => ({ ...prev, isAutoSync: false }));
        }
        asyncHandleAutoSync();
    }, [syncState.isAutoSync]);

    useEffect(() => {
        /* 本地修改和远端下载同步都会触发修改事件，
           修改不会触发remote相关更新
        */
        const onFileModify = async (file: TAbstractFile) => {
            const fileState = fileStateRef.current;

            if (syncState.isDownloading ||
                syncState.isAutoSync ||
                (cloudDiskModel.selectedCloudDisk === CloudDiskType.Aliyun && ignoreModify)) {
                logger.debug(`[onFileModify] syncing, ignore file modify event: ${file.name}, at: ${file.path}`);
                return;
            }

            /* 文件夹更新名字，文件更新名字和修改时间 */
            logger.debug(`[onFileModify] ${file instanceof TFile ? 'file' : 'folder'} modify: ${file.name}, at: ${file.path}, mtime: ${file instanceof TFile ? file.stat.mtime : null}`);

            /* Step 1: 先处理local */
            if (!fileState.rootNode) {
                logger.error('rootNode is null, maybe rootNode is broken');
                return;
            }

            const localNode = findNodeAt(fileState.rootNode!, file.path);
            if (!localNode) {
                logger.error(`node: ${file.path} not found, maybe rootNode is broken`);
                return;
            }


            const newLocalNode: LocalFileNode = {
                ...localNode,
                mtime: (file instanceof TFile) ? new Date(file.stat.mtime) : localNode.mtime,
                size: (file instanceof TFile) ? file.stat.size : localNode.size,
            };

            const remoteNode = fileState.remoteMeta!.children?.find(child => child.name === file.name);
            const newStatus = checkLocalFileNodeSyncStatus(newLocalNode, remoteNode ? remoteNode : null);
            logger.debug(`[onFileModify] status, from: ${localNode.syncStatus}, to: ${newStatus}`);
            newLocalNode.syncStatus = newStatus;

            insertNodeAt(fileState.rootNode!, file.path, newLocalNode);

            /* 在非加密模式下，如果文件在远端存在，则需要上传 */
            if (metaInfo.findRemoteFile(fileState.remoteMeta!, file.path) && shouldUpload(newStatus)) {
                const uploadResult = await handleUpload(file.path);
                if (!uploadResult) {
                    logger.error(`upload file failed: ${file.path}`);
                }

                /* 更新current视图 */
                loadFolderContents();
            };
        };

        /* 本地删除文件，先删除meta，再删除远端文件 */
        const onFileDelete = async (file: TAbstractFile) => {
            const fileState = fileStateRef.current;

            const isFolder = file instanceof TFolder;
            logger.debug(`[onFileDelete] ${isFolder ? 'folder' : 'file'} delete: ${file.name}, at: ${file.path}`);

            /* NOTE: 子文件夹回调删除顺序为先子文件夹自身，再子文件夹内容，会导致删除文件夹内容的时候找不到meta节点 */
            if (fileState.remoteMeta && metaInfo.findRemoteFile(fileState.remoteMeta, file.path)) {
                metaInfo.removeMetaNodeAt(fileState.remoteMeta, file.path);
            }

            if (!isFolder) {
                /* NOTE: 留下空文件夹 */
                const deleteResult = await Service.fileMng.deleteFile(file.path);
                if (!deleteResult) {
                    logger.error(`delete file failed: ${file.path}`);
                }
            }

            /* 删除本地节点，因为文件已经删除 */
            if (fileState.rootNode && findNodeAt(fileState.rootNode, file.path)) {
                removeNodeAt(fileState.rootNode, file.path);
            }

            const parentPath = util.path.dirname(file.path).split('/').filter(Boolean);
            if (util.path.join(currentPathRef.current.join('/')) === util.path.join(parentPath.join('/'))) {
                await loadFolderContents();
            }
        };

        /* 本地创建新文件，更新local root。
           从远程下载文件后，也会触发create事件，更新local root
           创建不会触发remote相关更新
        */
        const onFileCreate = async (file: TAbstractFile) => {
            const fileState = fileStateRef.current;

            if (syncState.isAutoSync || syncState.isDownloading) {
                logger.debug(`[onFileCreate] syncing, ignore file create event: ${file.name}, at: ${file.path}`);
                return;
            }

            logger.debug(`[onFileCreate] ${file instanceof TFile ? 'file' : 'folder'} create: ${file.name}, at: ${file.path}, mtime: ${file instanceof TFile ? file.stat.mtime : null}`);

            insertNodeAt(fileState.rootNode!, file.path, {
                name: file.name,
                type: file instanceof TFile ? 'file' : 'directory',
                syncStatus: SyncStatus.LocalCreated,
                md5: '',
                size: file instanceof TFile ? file.stat.size : 0,
                mtime: file instanceof TFile ? new Date(file.stat.mtime) : new Date(),
                children: [],
            });
            loadFolderContents();
        };

        // 重命名文件，更新local root，再更新远端文件，最后更新remote meta
        // 如果远程文件rename失败，不应该更新remote meta
        const onFileRename = async (file: TAbstractFile, oldPath: string) => {
            const fileState = fileStateRef.current;

            logger.debug(`[onFileRename] ${file.name}, old: ${oldPath}, new: ${file.path}`);
            if (syncState.isAutoSync || syncState.isDownloading) {
                logger.debug(`[onFileRename] syncing, ignore file rename event: ${file.name}, old: ${oldPath}, new: ${file.path}`);
                return;
            }
            renameNode(fileState.rootNode!, oldPath, file.path);
            try {
                if (metaInfo.findRemoteFile(fileState.remoteMeta!, oldPath)) {
                    if (util.path.dirname(oldPath) === util.path.dirname(file.path)) {
                        Service.fileMng.renameFile(oldPath, file.name);
                    } else {
                        Service.fileMng.moveFile(oldPath, file.path);
                    }
                    metaInfo.renameMetaNode(fileState.remoteMeta!, oldPath, file.path);
                }
            } catch (error) {
                logger.error(`Error renaming file: ${error}, old: ${oldPath}, new: ${file.path}`);
            }
            loadFolderContents();
        }

        vault.on('modify', onFileModify);
        vault.on('delete', onFileDelete);
        vault.on('create', onFileCreate);
        vault.on('rename', onFileRename);

        return () => {
            vault.off('modify', onFileModify);
            vault.off('delete', onFileDelete);
            vault.off('create', onFileCreate);
            vault.off('rename', onFileRename);
        };
    }, [vault, loadFolderContents, syncState.isDownloading, syncState.isAutoSync]);

    useEffect(() => {
        loadFolderContents();
    }, [loadFolderContents]);

    const findFolderByPath = (node: LocalFileNode | null, path: string[]): LocalFileNode | undefined => {
        if (!node || node.type !== 'directory') return undefined;
        if (path.length === 0) return node;
        const [first, ...rest] = path;
        const child = node.children?.find(c => c.name === first);
        return child ? findFolderByPath(child, rest) : undefined;
    };

    const handleUpload = async (localPath: string, remoteEncrypt: boolean = false): Promise<boolean> => {
        let localFile = vault.getAbstractFileByPath(localPath);
        let syncResult = true;
        const fileState = fileStateRef.current;

        if (!localFile) {
            throw new Error(`File not found: ${localPath}`);
        }
        const currentNode = findNodeAt(fileState.rootNode!, localPath);
        if (!currentNode) {
            throw new Error(`node not found during upload: ${localPath}`);
        }
        currentNode.remoteEncrypt = remoteEncrypt;

        const processKey = localPath;

        logger.debug(`[handleUpload] start upload: ${localPath}`);
        setSyncState(prev => ({
            ...prev,
            syncingFiles: new Set(prev.syncingFiles).add(processKey),
        }));

        try {
            if (currentNode.type === 'file' && shouldUpload(currentNode.syncStatus)) {
                setSyncState(prev => ({
                    ...prev,
                    syncProgress: {
                        ...prev.syncProgress,
                        [processKey]: { completed: 0, total: 1 }
                    }
                }));
                const result = await uploadFileNode(localFile, currentNode, (done: number, total: number) => {
                    setSyncState(prev => ({
                        ...prev,
                        syncProgress: {
                            ...prev.syncProgress,
                            [processKey]: { completed: done, total: total }
                        }
                    }));
                });

                if (result) {
                    // 更新单个文件的同步状态
                    currentNode.syncStatus = SyncStatus.FullySynced;
                    logger.debug(`[handleUpload] synced: ${localPath}, node: ${JSON.stringify(currentNode)}`);
                    insertNodeAt(fileState.rootNode!, localPath, currentNode);
                    updateRemoteMetaAfterSync(currentNode, localPath, fileState.remoteMeta!, 'local');
                }

                return result;
            }

            /* 上传目录 */
            const uploadChildren = (currentNode.children || []).filter(child => shouldUpload(child.syncStatus));
            setSyncState(prev => ({
                ...prev,
                syncProgress: {
                    ...prev.syncProgress,
                    [processKey]: { completed: 0, total: uploadChildren.length }
                }
            }));
            let completed = 0;
            for (const child of uploadChildren) {
                const childKey = util.path.join(processKey, child.name);
                setSyncState(prev => ({
                    ...prev,
                    syncingFiles: new Set(prev.syncingFiles).add(childKey),
                }));
                try {
                    const result = await handleUpload(util.path.join(localPath, child.name), remoteEncrypt);
                    syncResult = syncResult && result;
                } catch (error) {
                    logger.error(`Error uploading ${child.name}: ${error}`);
                } finally {
                    completed++;
                    setSyncState(prev => ({
                        ...prev,
                        syncProgress: {
                            ...prev.syncProgress,
                            [processKey]: { completed: completed, total: uploadChildren.length }
                        }
                    }));
                }
            }

            if (syncResult) {
                /* 更新目录的同步状态 */
                currentNode.syncStatus = SyncStatus.FullySynced;

                // 强制更新当前视图
                await loadFolderContents();
            }

            return syncResult;
        } catch (error) {
            logger.error(`Error uploading ${localPath}: ${error}`);
            return false;
        } finally {
            setSyncState(prev => {
                const newSyncingFiles = new Set(prev.syncingFiles);
                newSyncingFiles.delete(processKey);
                return { ...prev, syncingFiles: newSyncingFiles };
            });
        }
    }

    /* download file/folder at localPath */
    const handleDownload = async (localPath: string): Promise<boolean> => {
        logger.debug(`[handleDownload] downloading from: ${localPath}, to: ${localPath}`);
        let syncResult = true;

        try {
            setSyncState(prev => ({
                ...prev,
                syncingFiles: new Set(prev.syncingFiles).add(localPath),
            }));

            const remoteFileNode = metaInfo.findRemoteFile(fileState.remoteMeta!, localPath);
            if (!remoteFileNode) {
                throw new Error(`download failed, remote meta not found: ${localPath}`);
            }

            const localNode = findNodeAt(fileState.rootNode!, localPath);

            if (remoteFileNode.type === 'file' && shouldDownload(localNode?.syncStatus || SyncStatus.RemoteCreated)) {
                setSyncState(prev => ({
                    ...prev,
                    syncProgress: {
                        ...prev.syncProgress,
                        [localPath]: { completed: 0, total: 1 }
                    }
                }));
                syncResult = await downloadFileNodes([{ node: remoteFileNode, path: localPath }], vault,
                    (completed: number, newNode: LocalFileNode | null, path: string, status: boolean) => {
                        setSyncState(prev => ({
                            ...prev,
                            syncProgress: {
                                ...prev.syncProgress,
                                [localPath]: { completed: completed, total: 1 }
                            }
                        }));
                        if (status && newNode) {
                            newNode.syncStatus = SyncStatus.FullySynced;
                            insertNodeAt(fileState.rootNode!, path, newNode);
                        }
                    });
            } else {
                logger.info(`[download folder] ${localPath}, children: ${remoteFileNode.children?.length}`);
                if (remoteFileNode.children?.length === 0) {
                    /* NOTE: 处理空文件夹 */
                    return true;
                }
                setSyncState(prev => ({
                    ...prev,
                    syncProgress: {
                        ...prev.syncProgress,
                        [localPath]: { completed: 0, total: remoteFileNode.children?.length || 0 }
                    }
                }));
                let completed = 0;
                for (const child of remoteFileNode.children || []) {
                    const childKey = util.path.join(localPath, child.name);
                    syncResult = syncResult && await handleDownload(childKey);

                    completed++;
                    setSyncState(prev => ({
                        ...prev,
                        syncProgress: {
                            ...prev.syncProgress,
                            [localPath]: { completed: completed, total: remoteFileNode.children?.length || 0 }
                        }
                    }));
                }
            }
            return syncResult;
        } catch (error) {
            logger.error(`Error downloading ${localPath}: ${error}`);
            return false;
        } finally {
            setSyncState(prev => {
                const newSyncingFiles = new Set(prev.syncingFiles);
                newSyncingFiles.delete(localPath);
                return { ...prev, syncingFiles: newSyncingFiles };
            });

            if (syncResult) {
                // 强制更新当前视图
                await loadFolderContents();
            }
        }
    }

    const handleSync = async (
        action: 'upload' | 'download' | 'stop' | null,
        node: LocalFileNode,
        dir?: string
    ) => {
        if (action === 'stop' || action === null) {
            logger.debug(`[handleSync] silent stop: ${node.name}, action: ${action}`);
            return;
        }

        setSyncState(prev => ({ ...prev, syncingFiles: new Set(prev.syncingFiles).add(node.name) }));

        const localPath = dir !== undefined ? util.path.join(dir, node.name) :
            currentPath.length > 0 ?
                util.path.join(currentPath.join('/'), node.name) :
                node.name;

        try {
            switch (action) {
                case 'upload':
                    await handleUpload(localPath, false);
                    break;
                case 'download':
                    setSyncState(prev => ({ ...prev, isDownloading: true }));
                    /* 下载时解密通过meta中remoteEncrypt字段控制 */
                    await handleDownload(localPath);
                    setSyncState(prev => ({ ...prev, isDownloading: false }));
                    break;
            }
        } catch (error) {
            logger.error(`Error syncing ${localPath}: ${error}`);
        } finally {
            setSyncState(prev => {
                const newSyncingFiles = new Set(prev.syncingFiles);
                newSyncingFiles.delete(node.name);
                return {
                    ...prev,
                    syncingFiles: newSyncingFiles,
                }
            });
        }
    };

    // 在渲染部分使用导入的函数
    const handleItemClick = (item: LocalFileNode) => {
        onFileSelect(item);
    };

    useEffect(() => {
        logger.debug(`[render] loadingState: ${JSON.stringify(loadingState)}`);
    }, [loadingState]);

    return (
        <div className="file-browser">
            {loadingState.isLoadingRemoteMeta && (
                <div className="loading">{i18n.t('sync.message.loadingRemoteMeta')}</div>
            )}
            {!loadingState.isLoadingRemoteMeta && loadingState.isLoading && (
                <div className="loading">{i18n.t('sync.loading')}</div>
            )}
            {!loadingState.isLoadingRemoteMeta && !loadingState.isLoading && (
                <div className="file-list">
                    {fileState.currentFiles.map(file => {
                        const filePath = util.path.join(currentPath.join('/'), file.name);
                        return renderFileItem(filePath, file, handleItemClick,
                            syncState.syncingFiles.has(filePath),
                            handleSync,
                            syncState.syncProgress[filePath] ? { 'completed': syncState.syncProgress[filePath]?.completed, 'total': syncState.syncProgress[filePath]?.total } : undefined)
                    })}
                </div>
            )}
        </div>
    );
};

export default LocalFileBrowser;