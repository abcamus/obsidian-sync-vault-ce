import { requestUrl, Notice } from 'obsidian';
import { cloudDiskModel } from '@/model/cloud-disk-model';
import { createLogger } from '@/util/logger';
import * as path from '@/util/path';
import { getFileInfoByPath } from './info';
import { deleteFileById } from './file-mng';
import { AliNetdiskApi } from '@/service/proto/aliyun';
import { CloudUploadService } from '@/service/cloud-disk-service';
import { encrypt } from '@/util/encryption';

import { createDirectoryRecursive } from './file-mng';

const logger = createLogger('aliyun.upload');
export let ignoreModify = false;

/* timestamp: milliseconds */
function formatTimestamp(timestamp?: number): string | undefined {
    if (!timestamp) return undefined;
    return new Date(timestamp).toISOString();  // 秒转毫秒并格式化
}

/* https://www.yuque.com/aliyundrive/zpfszx/ezlzok# */
interface CreateFileResponse {
    drive_id: string;
    file_id: string;
    status: string;
    parent_file_id: string;
    upload_id: string;
    file_name: string;
    available: boolean;
    exist: boolean;
    rapid_upload: boolean;
    part_info_list: {
        part_number: number;
        upload_url: string;
        part_size: number;
    }[];
}

function parseCreateFileResponse(json: unknown): CreateFileResponse {
    if (!json || typeof json !== 'object') {
        throw new Error('创建文件返回数据无效');
    }

    const record = json as Record<string, unknown>;
    const driveId = record.drive_id;
    const fileId = record.file_id;
    const uploadId = record.upload_id;
    const parts = record.part_info_list;

    if (typeof driveId !== 'string' || typeof fileId !== 'string' || typeof uploadId !== 'string') {
        throw new Error('创建文件返回数据无效');
    }

    if (!Array.isArray(parts)) {
        throw new Error('创建文件返回数据无效');
    }

    parts.forEach((part) => {
        if (!part || typeof part !== 'object') {
            throw new Error('创建文件返回数据无效');
        }
        const p = part as Record<string, unknown>;
        if (typeof p.part_number !== 'number' || typeof p.upload_url !== 'string' || typeof p.part_size !== 'number') {
            throw new Error('创建文件返回数据无效');
        }
    });

    return record as unknown as CreateFileResponse;
}

async function uploadContent(content: Uint8Array | ArrayBuffer, remotePath: string, params?: {
    ctime?: number,
    mtime?: number
}, callback?: (ctime: number, mtime: number) => Promise<void>): Promise<boolean> {
    const access_token = cloudDiskModel.accessToken;
    const drive_id = (await cloudDiskModel.getInfo()).storage.drive_id;

    const contentArray: ArrayBuffer = content instanceof Uint8Array
        ? new Uint8Array(content).buffer
        : content;
    const size = contentArray.byteLength;
    logger.debug(`[uploadContent] path: ${remotePath}, size: ${size}`);

    try {
        const fileInfo = await getFileInfoByPath(remotePath);
        if (fileInfo && fileInfo.file_id) {
            await deleteFileById(fileInfo.file_id);
        } else {
            logger.debug(`创建新文件: ${remotePath}`);
        }

        const parentPath = path.dirname(remotePath);
        const fileName = path.basename(remotePath);
        const parentFileId = await createDirectoryRecursive(parentPath);

        const ctime = formatTimestamp(params?.ctime);
        const mtime = formatTimestamp(params?.mtime);
        logger.debug(`[uploadContent] create file, path: ${remotePath}, ctime: ${ctime}, mtime: ${mtime}`);

        // 第一步：创建文件，获取上传地址
        const createResponse = await requestUrl({
            ...AliNetdiskApi.upload.create_upload_url,
            headers: {
                'Authorization': `Bearer ${access_token}`,
                'Content-Type': 'application/json'
            },
            /* NOTE: 不支持秒传，同名可创建 */
            body: JSON.stringify({
                drive_id: drive_id,
                parent_file_id: parentFileId,
                name: fileName,
                type: 'file',
                size,
                local_created_at: ctime,
                local_modified_at: mtime,
                check_name_mode: 'ignore'  /* 同名可创建 */
            })
        });

        if (createResponse.status !== 200) {
            throw new Error(`创建文件失败: status=${createResponse.status}, body=${createResponse.text}`);
        }

        const createData = parseCreateFileResponse(createResponse.json as unknown);

        logger.debug(`[uploadContent] createData: ${JSON.stringify(createData)}`);

        // 第二步：执行上传
        for (const part of createData.part_info_list) {
            logger.debug(`[uploadContent] uploading part ${part.part_number}, url: ${part.upload_url}`);
            const uploadResponse = await requestUrl({
                url: part.upload_url,
                method: 'PUT',
                body: contentArray
            });

            if (uploadResponse.status !== 200) {
                throw new Error(`上传文件失败: ${part.part_number}`);
            }
        }

        // 第三步：完成上传
        const completeResponse = await requestUrl({
            ...AliNetdiskApi.upload.complete_upload,
            headers: {
                'Authorization': `Bearer ${access_token}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                drive_id: drive_id,
                file_id: createData.file_id,
                upload_id: createData.upload_id
            })
        });

        if (completeResponse.status !== 200) {
            throw new Error(`完成上传失败: ${completeResponse.status}:${completeResponse.text}`);
        }

        const completeResInfo: unknown = completeResponse.json;
        /* FIXME: 阿里云盘created_at和ctime不一致 */
        if (!completeResInfo || typeof completeResInfo !== 'object') {
            throw new Error('完成上传返回数据无效');
        }

        const record = completeResInfo as Record<string, unknown>;
        const createdAt = record.created_at;
        const updatedAt = record.updated_at;
        if (typeof createdAt !== 'string' || typeof updatedAt !== 'string') {
            throw new Error('完成上传返回数据无效');
        }

        await callback?.(new Date(createdAt).getTime(), new Date(updatedAt).getTime());
        return true;
    } catch (error) {
        logger.error('Error uploading file:', error);
        new Notice(`上传文件到 ${remotePath} 失败, error: ${error}`);
        throw error;
    }
}

async function uploadFile(localPath: string, remotePath: string, shouldEncrypt: boolean = false): Promise<boolean> {
    const localFile = cloudDiskModel.vault.getFileByPath(localPath);
    if (!localFile) {
        logger.error(`file not found, path: ${localPath}`);
        return false;
    }

    const params = {
        ctime: localFile.stat.ctime,
        mtime: localFile.stat.mtime
    }

    try {
        const content = await cloudDiskModel.vault.adapter.readBinary(localPath);
        let dataToUpload;
        if (shouldEncrypt) {
            dataToUpload = await encrypt(new Uint8Array(content));
        } else {
            dataToUpload = content;
        }
        return await uploadContent(dataToUpload, remotePath, params, async (created_at: number, updated_at: number) => {
            if (updated_at !== params?.mtime) {
                logger.debug(`expected mtime: ${params?.mtime}, actual mtime: ${updated_at}`);
                const file = cloudDiskModel.vault.getFileByPath(localPath);
                if (!file) {
                    return;
                }
                ignoreModify = true;
                await cloudDiskModel.vault.modifyBinary(file, content, {
                    ctime: created_at,
                    mtime: updated_at
                })
                ignoreModify = false;
            }
        });
    } catch (error) {
        logger.error(`Error uploading file: ${localPath}`, error);
        new Notice(`上传文件失败: ${localPath}`);
        return false;
    }
}

export const AliyunUploadModule = {
    uploadContent,
    uploadFile,
};

export class AliyunUploadService implements CloudUploadService {
    async uploadFile(localPath: string, remotePath: string, params?: { ctime?: number; mtime?: number; }): Promise<boolean> {
        return await uploadFile(localPath, remotePath, cloudDiskModel.encryptMode);
    }

    async uploadContent(content: Uint8Array | ArrayBuffer, remotePath: string, params?: { ctime?: number; mtime?: number; }, callback?: (ctime: number, mtime: number) => Promise<void>): Promise<boolean> {
        return await uploadContent(content, remotePath, params);
    }
}