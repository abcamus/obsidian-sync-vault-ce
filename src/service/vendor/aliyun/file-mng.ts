import { requestUrl, RequestUrlParam } from 'obsidian';
import { cloudDiskModel } from '@/model/cloud-disk-model';
import { getFileInfoByPath } from './info';
import * as util from '@/util';
import { SmartQueue, TaskType } from '@/util/queue/smart-queue';
import { CloudFileManagementService } from '@/service/cloud-disk-service';
import { AliNetdiskApi } from '../../proto/aliyun';
import { MetaOperationQueue } from '@/util/queue/meta-operation-queue';
import { CloudDiskType } from '@/types';
import { QueryCache } from './query-cache';

const logger = util.logger.createLogger('aliyun.file-mng');

/* create folder recursively */
export async function createDirectoryRecursive(dirPath: string): Promise<string> {
    // root folder
    if (!dirPath || dirPath === '/' || dirPath === '.') {
        return 'root';
    }

    try {
        /* already exists */
        const cachedFileId = QueryCache.getInstance().get(dirPath);
        if (cachedFileId) {
            return cachedFileId;
        }

        const dirFileInfo = await getFileInfoByPath(dirPath);
        if (dirFileInfo && dirFileInfo.file_id) {
            QueryCache.getInstance().set(dirPath, dirFileInfo.file_id);
            return dirFileInfo.file_id;
        }
        const parentPath = util.path.dirname(dirPath);
        // create parent folder
        const parentFileId = await createDirectoryRecursive(parentPath);
        // create current folder
        logger.info(`create folder: ${dirPath}`);
        const response = await requestUrl({
            ...AliNetdiskApi.upload.create_upload_url,
            headers: {
                'Authorization': `Bearer ${cloudDiskModel.accessToken}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                drive_id: (await cloudDiskModel.getInfo()).storage.drive_id,
                parent_file_id: parentFileId,
                name: util.path.basename(dirPath),
                type: 'folder',
                check_name_mode: 'refuse' /* auto_rename, ignore, refuse */
            })
        });

        return response.json.file_id;
    } catch (error) {
        logger.error(`create folder failed, path: ${dirPath}, error: ${error}`);
        throw error;
    }
}

async function renameFile(from: string, newName: string) {
    const accessToken = cloudDiskModel.accessToken;
    const remoteSrc = util.path.join(cloudDiskModel.remoteRootPath, from);
    const driveId = (await cloudDiskModel.getInfo()).storage.drive_id;
    const fileInfo = await getFileInfoByPath(remoteSrc);
    if (!fileInfo || !fileInfo.file_id) {
        throw new Error(`file not found, src path: ${remoteSrc}`);
    }

    try {
        const response = await requestUrl({
            ...AliNetdiskApi.file_mng.rename,
            headers: {
                'Authorization': `Bearer ${accessToken}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                drive_id: driveId,
                file_id: fileInfo.file_id,
                name: newName,
                check_name_mode: 'ignore' /* 同名文件可创建 */
            })
        });
        logger.debug(`[renameFile] path: ${remoteSrc}, newName: ${newName}, response: ${JSON.stringify(response.json)}`);
        if (response.status !== 200) {
            throw new Error(`rename file failed, response: ${response.json.message || 'unknown error'}`);
        }
    } catch (error) {
        logger.error(`rename file failed, error: ${error}`);
        throw error;
    }
}

export async function deleteFileById(fileId: string) {
    const accessToken = cloudDiskModel.accessToken;
    const driveId = (await cloudDiskModel.getInfo()).storage.drive_id;

    return SmartQueue.getInstance().enqueue(async () => {
        try {
            const response = await requestUrl({
                ...AliNetdiskApi.file_mng.delete,
                headers: {
                    'Authorization': `Bearer ${accessToken}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    drive_id: driveId,
                    file_id: fileId,
                })
            });
            logger.debug(`[deleteFileById] fileId: ${fileId}, response: ${JSON.stringify(response.json)}`);
            if (response.status !== 200) {
                throw new Error(`${response.json.message || 'unknown error'}`);
            }
            return response.json;
        } catch (error) {
            logger.error(`delete file failed, error: ${error}`);
            throw error;
        }
    }, `deleteFileById:${fileId}`, TaskType.OTHER);

}

async function deleteFile(filePath: string) {
    const remotePath = util.path.join(cloudDiskModel.remoteRootPath, filePath);

    logger.debug(`[deleteFile] remotePath: ${remotePath}`);
    const fileInfo = await getFileInfoByPath(remotePath);
    if (!fileInfo || !fileInfo.file_id) {
        throw new Error(`file not found, path: ${remotePath}`);
    }

    await deleteFileById(fileInfo.file_id);
}

async function copyFile(from: string, to: string) {
    const accessToken = cloudDiskModel.accessToken;
    const remoteSrc = util.path.join(cloudDiskModel.remoteRootPath, from);
    const remoteDest = util.path.join(cloudDiskModel.remoteRootPath, to);
    const driveId = (await cloudDiskModel.getInfo()).storage.drive_id;

    // 获取源文件ID
    const fileInfo = await getFileInfoByPath(remoteSrc);
    if (!fileInfo) {
        throw new Error(`source file not found, path: ${remoteSrc}`);
    }

    const toParentInfo = await getFileInfoByPath(util.path.dirname(remoteDest));
    let newParentId;
    if (!toParentInfo || !toParentInfo.file_id) {
        logger.info(`target folder not exists, folder path: ${util.path.dirname(remoteDest)}`);
        newParentId = await createDirectoryRecursive(util.path.dirname(remoteDest));
    }

    const options: RequestUrlParam = {
        ...AliNetdiskApi.file_mng.copy,
        headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            drive_id: driveId,
            file_id: fileInfo.file_id,
            to_drive_id: driveId,
            to_parent_file_id: toParentInfo?.file_id ?? newParentId,
            new_name: util.path.basename(remoteDest),
            auto_rename: true // 如果目标文件存在，自动重命名
        })
    };

    try {
        const response = await requestUrl(options);
        logger.debug(`[copyFile] from: ${remoteSrc}, to: ${remoteDest}, response: ${JSON.stringify(response.json)}`);
        if (response.status !== 200) {
            throw new Error(`${response.json.message || 'unknown error'}`);
        }
        return response.json;
    } catch (error) {
        logger.error(`copy file failed, error: ${error}`);
        throw error;
    }
}

export async function moveFile(from: string, to: string) {
    const driveId = (await cloudDiskModel.getInfo()).storage.drive_id;
    const accessToken = cloudDiskModel.accessToken;
    const remoteFrom = util.path.join(cloudDiskModel.remoteRootPath, from);
    const remoteTo = util.path.join(cloudDiskModel.remoteRootPath, to);

    try {
        // 1. 获取源文件ID
        const fileInfo = await getFileInfoByPath(remoteFrom);
        if (!fileInfo || !fileInfo.file_id) {
            throw new Error(`src file not found, path: ${remoteFrom}`);
        }

        // 2. 获取目标文件夹ID
        const toParentPath = util.path.dirname(remoteTo);
        const toName = util.path.basename(remoteTo);
        const toParentInfo = await getFileInfoByPath(toParentPath);
        let newFolderId;

        // TODO: 通过QueryCache减少请求
        if (!toParentInfo || !toParentInfo.file_id) {
            logger.info(`target folder not exists: ${toParentPath}`);
            newFolderId = await createDirectoryRecursive(toParentPath);
        }

        const response = await requestUrl({
            ...AliNetdiskApi.file_mng.move,
            headers: {
                'Authorization': `Bearer ${accessToken}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                drive_id: driveId,
                file_id: fileInfo.file_id,
                to_drive_id: driveId,
                to_parent_file_id: toParentInfo?.file_id ?? newFolderId,
                new_name: toName
            })
        });
        logger.debug(`[moveFile] from: ${from}, to: ${to}, response: ${JSON.stringify(response.json)}`);
        if (response.status !== 200) {
            throw new Error(`${response.json.message || 'unknown error'}`);
        }
    } catch (error) {
        logger.error(`move file failed, error: ${error}`);
        throw error;
    }
}

class AliyunFileMngHander implements CloudFileManagementService {
    async deleteFile(filePath: string): Promise<boolean> {
        try {
            await deleteFile(filePath);
        } catch (error) {
            return false;
        }
        return true;
    }
    async copyFile(from: string, to: string): Promise<void> {
        await copyFile(from, to);
    }
    async moveFile(from: string, to: string): Promise<void> {
        await moveFile(from, to);
    }
    async renameFile(from: string, newName: string): Promise<void> {
        await renameFile(from, newName);
    }
    async deleteFileById(fileId: string): Promise<void> {
        await deleteFileById(fileId);
    }
    async mkdir(dirPath: string): Promise<void> {
        throw new Error('Not suppported, command: mkdir');
    }
}

export class AliyunFileManagementService implements CloudFileManagementService {
    private metaOpQueue: MetaOperationQueue;

    constructor() {
        this.metaOpQueue = MetaOperationQueue.getMetaOperationQueue(CloudDiskType.Aliyun, new AliyunFileMngHander());
    }

    async deleteFile(filePath: string): Promise<boolean> {
        try {
            await this.metaOpQueue.addOperation({
                type: 'delete',
                from: filePath,
            });
            return true;
        } catch (eror) {
            return false;
        }
    }
    async copyFile(from: string, to: string): Promise<void> {
        await this.metaOpQueue.addOperation({
            type: 'copy',
            from,
            to,
        });
    }
    async moveFile(from: string, to: string): Promise<void> {
        await this.metaOpQueue.addOperation({
            type: 'move',
            from,
            to,
        })
    }
    async renameFile(from: string, newName: string): Promise<void> {
        await this.metaOpQueue.addOperation({
            type: 'rename',
            from,
            newName
        })
    }
    async deleteFileById(fileId: string): Promise<void> {
        throw new Error('Not supported, command: deleteFileById');
    }
    async mkdir(dirPath: string): Promise<void> {
        throw new Error('Not suppported, command: mkdir');
    }
}