import { requestUrl } from 'obsidian';
import { cloudDiskModel } from '../../../model/cloud-disk-model';
import { RemoteFileNode } from '../../../model/meta-info';
import { getFileInfoByPath } from './info';
import * as util from '../../../util';
import { SmartQueue, TaskType } from '../../../util/queue/smart-queue';

import { CloudDownloadService } from '../../cloud-disk-service';
import { AliNetdiskApi } from './api';
import { FileInfo } from 'src/service/cloud-interface';

const logger = util.logger.createLogger('aliyun.download');
const chunkSize = 6 * 1024 * 1024;

async function getDownloadUrl(fileId: string): Promise<string | null> {
    return SmartQueue.getInstance().enqueue(async () => {
        const driveId = (await cloudDiskModel.getInfo()).storage.drive_id;
        const downloadUrlRes = await requestUrl({
            url: AliNetdiskApi.download.get_download_url.url,
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${cloudDiskModel.accessToken}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                drive_id: driveId,
                file_id: fileId
            }),
            throw: false,
        });

        return downloadUrlRes.json?.url;
    }, `aliyun-download:getDownloadUrl:${fileId}`, TaskType.GET_DOWNLOAD_URL);
}

export class AliyunDownloadService implements CloudDownloadService {
    async downloadFileAsString(remoteFilePath: string): Promise<string | null> {
        const arrayBuffer = await this.downloadFile(remoteFilePath);
        if (!arrayBuffer) {
            return null;
        }
        return new TextDecoder('utf-8').decode(arrayBuffer);
    }

    async downloadFile(
        remoteFilePath: string,
        remoteFileInfo?: RemoteFileNode
    ): Promise<ArrayBuffer | null> {
        let fileInfo: FileInfo | null = null;
        let downloadUrl: string | null = null;

        logger.info('Downloading ' + remoteFilePath);

        if (!remoteFilePath.startsWith('/')) {
            remoteFilePath = '/' + remoteFilePath;
        }

        /* Step 1: 获取文件信息 */
        try {
            fileInfo = await getFileInfoByPath(remoteFilePath);
            if (fileInfo === null) {
                throw new Error(`文件不存在, path: ${remoteFilePath}`);
            }

            const fileId = fileInfo.file_id;
            /* Step 2: 获取下载链接 */
            logger.debug(`[downloadFile] 获取下载链接, request time: ${new Date().toLocaleString()}`);
            downloadUrl = await getDownloadUrl(fileId);
            if (!downloadUrl) {
                throw new Error(`无法获取下载链接`);
            }
        } catch (error) {
            util.LogService.instance().logError(
                new Error('download file failed'),
                'downloadFile',
                { remotePath: remoteFilePath }
            );
            logger.error(`Download ${remoteFilePath} failed,`, error);
            return null;
        }


        /* Step 3: 下载文件内容, 403 错误码时重试 */
        const taskId = `downloadFile:${remoteFilePath}`;
        let downloadSize = 0;
        let data = new ArrayBuffer(0);
        const startTime = Date.now();
        while (downloadSize < fileInfo.size) {
            const rangeStart = downloadSize;
            const rangeEnd = Math.min(downloadSize + chunkSize - 1, fileInfo.size - 1);

            const sliceData = await SmartQueue.getInstance().enqueue(async () => {
                logger.debug(`[downloadFile] 下载文件, request time: ${new Date().toLocaleString()}`);
                const response = await requestUrl({
                    url: downloadUrl!,
                    headers: {
                        'Range': 'bytes=' + rangeStart + '-' + rangeEnd,
                        'Referer': 'https://www.aliyundrive.com/',
                        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/110.0.0.0 Safari/537.36'
                    },
                    throw: false,
                })
                if (response.status !== 200 && response.status !== 206) {
                    throw new Error(`下载文件失败, 状态码: ${response.status}, 响应: ${response.text}`);
                }

                return response.arrayBuffer;
            }, taskId, TaskType.DOWNLOAD);
            data = new Uint8Array([...new Uint8Array(data), ...new Uint8Array(sliceData)]).buffer;
            downloadSize += sliceData.byteLength;
        }

        const endTime = Date.now();
        logger.debug(`[downloadFile] 下载文件完成, 大小: ${downloadSize}, 耗时: ${endTime - startTime}ms, 速度: ${(downloadSize / (endTime - startTime)).toFixed(2)}KB/s}`);

        let u8Array = new Uint8Array(data);
        try {
            if (util.encryption.isEncrypted(u8Array)) {
                u8Array = await util.encryption.decrypt(u8Array)
            }
            return u8Array.buffer;
        } catch (error) {
            util.LogService.instance().logError(
                new Error('decrypt file failed'),
                'downloadFile',
                { remotePath: remoteFilePath }
            );
            return null;
        }
    }
}
