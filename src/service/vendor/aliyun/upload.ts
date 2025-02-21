import { Notice, TFile } from 'obsidian';

import { requestUrl } from 'obsidian';
import { cloudDiskModel } from '../../../model/cloud-disk-model';
import { createLogger } from '../../../util/logger';
import * as path from '../../../util/path';
import { getFileInfoByPath } from './info';
import { deleteFileById } from './file-mng';
import { AliNetdiskApi } from './api';
import { CloudUploadService } from 'src/service/cloud-disk-service';
import { encrypt } from 'src/util/encryption';

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

async function uploadContent(content: Uint8Array | ArrayBuffer, remotePath: string, params?: {
    ctime?: number,
    mtime?: number
}, callback?: (ctime: number, mtime: number) => Promise<void>): Promise<boolean> {
    const access_token = cloudDiskModel.accessToken;
    const drive_id = (await cloudDiskModel.getInfo()).storage.drive_id;
    const contentArray = content instanceof Uint8Array ? content.buffer : content;
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
            throw new Error(`创建文件失败: ${createResponse}`);
        }

        const createData: CreateFileResponse = createResponse.json;

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
            throw new Error(`完成上传失败: ${completeResponse}`);
        }

        const completeResInfo = completeResponse.json;
        /* FIXME: 阿里云盘created_at和ctime不一致 */
        await callback?.(new Date(completeResInfo.created_at).getTime(), new Date(completeResInfo.updated_at).getTime());
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