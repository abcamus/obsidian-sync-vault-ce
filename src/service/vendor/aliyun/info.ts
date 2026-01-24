import { Notice, requestUrl } from "obsidian";

import { UserInfo, StorageInfo, FileEntry, FileInfo } from "@/types";
import { cloudDiskModel } from "@/model/cloud-disk-model";
import { SmartQueue, TaskType } from "@/util/queue/smart-queue";
import * as util from "@/util";
import { CloudInfoService } from "@/service/cloud-disk-service";
import { AliNetdiskApi } from "./api";

const logger = util.logger.createLogger('aliyun.info');

interface AliyunFileItem {
    name: string;
    type: string;
    file_id: string;
    created_at: string;  // ISO 8601 格式
    updated_at: string;  // ISO 8601 格式
    size: number;
}

async function userInfo(): Promise<UserInfo> {
    const access_token = cloudDiskModel.accessToken;
    try {
        const headers = {
            'Authorization': `Bearer ${access_token}`,
            'Content-Type': 'application/json',
        }
        const response = await requestUrl({
            url: AliNetdiskApi.info.get_user_info.url,
            headers: headers,
            throw: false,
        })

        if (response.status !== 200) {
            logger.error({ error: response });
            throw new Error(`${response.json.code}`);
        }
        const data = response.json;
        const userInfo: UserInfo = {
            user_id: data.id,
            user_name: data.name,
            vip_type: 0,
        };
        return userInfo;
    } catch (error) {
        new Notice(`Get user info failed, ${error}`);
        throw error;
    }
}

async function storageInfo(): Promise<StorageInfo> {
    const access_token = cloudDiskModel.accessToken;
    try {
        const headers = {
            'Authorization': `Bearer ${access_token}`,
            'Content-Type': 'application/json',
        };

        // 获取空间信息
        const spaceResponse = await requestUrl({
            ...AliNetdiskApi.info.get_space_info,
            headers: headers
        });
        const spaceData = spaceResponse.json;

        // 获取会员信息
        const driveResponse = await requestUrl({
            ...AliNetdiskApi.info.get_drive_info,
            headers: headers
        });
        const driveInfo = driveResponse.json;

        logger.debug(`[storageInfo] spaceData: ${JSON.stringify(spaceData)}`);
        logger.debug(`[storageInfo] driveInfo: ${JSON.stringify(driveInfo)}`);
        const storageInfo: StorageInfo = {
            total: spaceData.personal_space_info.total_size,
            used: spaceData.personal_space_info.used_size,
            drive_id: driveInfo.default_drive_id,
            expire: false,
        };

        return storageInfo;
    } catch (error) {
        logger.error('Error fetching storage info:', error);
        new Notice('获取容量信息失败');
        throw error;
    }
}

export async function getFileIdByPath(remoteFilePath: string): Promise<string | null> {
    const fileInfo = await getFileInfoByPath(remoteFilePath);
    if (fileInfo) {
        return fileInfo.file_id;
    }
    return null;
}

/* NOTE: 有qps限制，通过SmartQueue获取文件信息 */
export async function getFileInfoByPath(remoteFilePath: string): Promise<FileInfo | null> {
    const accessToken = cloudDiskModel.accessToken;
    const driveId = (await cloudDiskModel.getInfo()).storage!.drive_id;

    const headers = {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json'
    }

    return SmartQueue.getInstance().enqueue(async () => {
        const response = await requestUrl({
            ...AliNetdiskApi.info.get_file_info_by_path,
            headers: headers,
            body: JSON.stringify({
                drive_id: driveId,
                file_path: remoteFilePath
            }),
            /* 防止429错误抛出异常，由SmartQueue处理 */
            throw: false,
        });
        if (response.status === 200 && response.json.file_id) {
            return response.json as FileInfo;
        }
        if (response.status === 429) {
            logger.error(`[getFileInfoByPath] qps limit, remoteFilePath: ${remoteFilePath}, headers: ${JSON.stringify(response.headers)}`);
            throw new Error(`error: ${response.status}, response: ${JSON.stringify(response.json)}`);
        }

        logger.debug(`[getFileInfoByPath] error, remoteFilePath: ${remoteFilePath}, response: ${response.text}`);
        return null;
    }, `getFileInfoByPath:${remoteFilePath}`, TaskType.GET_BY_PATH);
}

async function listFiles(parentFileId: string, limit: number = 100, nextMarker: string = ''): Promise<[FileEntry[], string]> {
    const accessToken = cloudDiskModel.accessToken;
    const driveId = (await cloudDiskModel.getInfo()).storage!.drive_id;

    /* 有qps限制，通过SmartQueue获取文件信息 */
    return SmartQueue.getInstance().enqueue(async () => {
        const headers = {
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/json'
        }
        const response = await requestUrl({
            ...AliNetdiskApi.info.list,
            headers: headers,
            body: JSON.stringify({
                drive_id: driveId,
                parent_file_id: parentFileId,
                limit: limit,
                marker: nextMarker,
            }),
            throw: false,
        });
        if (response.status !== 200) {
            throw new Error(`error: ${response.status}, response: ${JSON.stringify(response.json)}`);
        }
        return [response.json['items'].map((item: AliyunFileItem) => ({
            path: item.name,
            isdir: item.type === 'folder',
            fsid: item.file_id,
            ctime: util.time.msToSec(new Date(item.created_at).getTime()),
            mtime: util.time.msToSec(new Date(item.updated_at).getTime()),
            size: item.size,
        } as FileEntry)), response.json['next_marker']];
    }, `listFiles:${parentFileId}`, TaskType.LIST);
}

async function listAllItemsOfFolder(folderPath: string, folderId: string): Promise<FileEntry[]> {
    let allFiles: FileEntry[] = [];
    let nextMarker: string = '';
    let files: FileEntry[] = [];
    while (true) {
        [files, nextMarker] = await listFiles(folderId, 100, nextMarker);
        allFiles.push(...files);
        if (nextMarker === '') {
            break;
        }
    }
    /* 修正文件路径 */
    allFiles.forEach((file) => {
        file.path = '/' + util.path.join(folderPath, file.path);
    });
    return allFiles;
}

async function listAllFiles(folderPath: string, folderId?: string): Promise<FileEntry[]> {
    try {
        const myFolderId = folderId || (await getFileIdByPath(folderPath));
        if (!myFolderId) {
            throw new Error(`folder not found, folderPath: ${folderPath}`);
        }
        logger.debug(`[listAllFiles] list folder: ${folderPath}`);
        const allItems = await listAllItemsOfFolder(folderPath, myFolderId);
        const allFiles: FileEntry[] = [];
        for (const item of allItems) {
            if (item.isdir) {
                allFiles.push(item);
                logger.debug(`[listAllFiles] list sub folder: ${item.path}`);
                allFiles.push(...await listAllFiles(item.path, item.fsid as string));
            } else {
                allFiles.push(item);
            }
        }
        return allFiles;
    } catch (error) {
        logger.error(`list all files failed, error: ${error}`);
        throw error;
    }
}

export class AliyunInfoService implements CloudInfoService {
    async userInfo(): Promise<UserInfo> {
        return await userInfo();
    }
    async storageInfo(): Promise<StorageInfo> {
        return await storageInfo();
    }
    async listFiles(parentFileId: string, limit: number = 100, nextMarker: string = ''): Promise<[FileEntry[], string]> {
        return await listFiles(parentFileId, limit, nextMarker);
    }
    async listAllFiles(folderPath: string, folderId?: string): Promise<FileEntry[]> {
        return await listAllFiles(folderPath, folderId);
    }
}