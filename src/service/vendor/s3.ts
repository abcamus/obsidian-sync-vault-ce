/*
 * Tencent Cloud Object Storage (COS) Client
 *
 * API explorer: https://console.cloud.tencent.com/api/explorer?Product=cos&Version=2018-11-26&Action=PutBucketCors
 * Diagnose tool: https://console.cloud.tencent.com/cos/diagnose
 */

import * as util from "@/util";

import { CloudDownloadService, CloudFileManagementService, CloudInfoService, CloudUploadService } from "../cloud-disk-service";
import { FileEntry, StorageInfo, UserInfo } from "../cloud-interface";
import { cloudDiskModel } from "@/model/cloud-disk-model";
import { ListObjectsResult, TencentCosClient } from "./cos";
import { Notice } from "obsidian";

const logger = util.logger.createLogger('s3.service');

interface S3Config {
    endpoint: string;
    region: string;
    accessKeyId: string;
    secretAccessKey: string;
    bucket: string;
}

export class S3Client {
    private static instance: S3Client;
    private clients: Record<string, TencentCosClient> = {};
    private initialized = false;

    private config: S3Config;

    private constructor() {
        this.config = {
            endpoint: cloudDiskModel.s3Config.endpoint,
            region: cloudDiskModel.s3Config.region || 'us-east-1',
            accessKeyId: cloudDiskModel.s3Config.accessKeyId,
            secretAccessKey: cloudDiskModel.s3Config.secretAccessKey,
            bucket: cloudDiskModel.s3Config.bucket
        };

        // this.clients.aws = new AWSS3Client({
        //     endpoint: this.config.endpoint,
        //     region: this.config.region,
        //     credentials: {
        //         accessKeyId: this.config.accessKeyId,
        //         secretAccessKey: this.config.secretAccessKey
        //     }
        // });

        // this.clients.cos = new COS({
        //     SecretId: this.config.accessKeyId,
        //     SecretKey: this.config.secretAccessKey,
        // });
        this.clients.cos = new TencentCosClient({
            secretId: this.config.accessKeyId,
            secretKey: this.config.secretAccessKey,
            bucket: this.config.bucket,
            region: this.config.region
        });
    }

    public static getInstance(): S3Client {
        if (!S3Client.instance) {
            S3Client.instance = new S3Client();
        }
        return S3Client.instance;
    }

    private async init(): Promise<void> {
        if (!this.clients.cos) {
            throw new Error('COS client is not created.');
        }

        if (this.initialized) {
            return;
        }

        try {
            // Initialize any necessary resources or connections
            const bucketCors = await this.clients.cos.getBucketCors();

            const corsRule = bucketCors.CORSConfiguration.CORSRule;
            logger.debug('CORS rule:', { corsRule });
            if (corsRule && corsRule.AllowedOrigin === '*' &&
                corsRule.ExposeHeader.includes('x-cos-meta-mtime') &&
                corsRule.AllowedMethod.includes('PUT') &&
                corsRule.AllowedMethod.includes('GET') &&
                corsRule.AllowedMethod.includes('HEAD') &&
                corsRule.AllowedMethod.includes('DELETE')
            ) {
                logger.info('CORS configuration looks good.');
                new Notice('CORS is properly configured.');
                this.initialized = true;
            } else {
                logger.warn('CORS configuration is not properly set.');
                new Notice('CORS is not properly configured.');
            }
        } catch (err) {
            logger.error(`初始化 COS 客户端失败: ${err}`);
            new Notice('Init COS client failed. Please check your CORS configuration.');
        }
    }

    async uploadFile(content: Buffer | Uint8Array, key: string, mtime?: number): Promise<boolean> {
        if (!this.initialized) {
            await this.init();
        }
        const localMtime = mtime ? new Date(mtime).toISOString() : new Date().toISOString();
        logger.debug('Uploading file with metadata:', {
            key,
            mtime: localMtime,
            metadata: { 'x-cos-meta-mtime': localMtime }
        });

        try {
            await this.clients.cos.putObject(key, content, localMtime);

            // await this.verifyMetadata(key);

            return true;
        } catch (err) {
            logger.error(`上传文件失败: ${key}, 错误: ${err}`);
            return false;
        }
    }

    private async verifyMetadata(key: string): Promise<void> {
        try {
            const headResult = await this.clients.cos.getObjectMetadata(key);

            logger.debug('元数据验证结果:', {
                key,
                metadata: headResult.Metadata,
                lastModified: headResult.LastModified,
                result: headResult
            });
        } catch (error) {
            logger.warn(`元数据验证失败: ${key}`, error);
        }
    }

    async downloadToBuffer(key: string): Promise<Buffer | null> {
        if (!this.initialized) {
            await this.init();
        }

        try {
            const data = await this.clients.cos.getObject(key);
            if (!data) {
                logger.warn(`文件不存在或内容为空: ${key}`);
                return null;
            }

            return data;
        } catch (err) {
            logger.error(`下载文件失败: ${key}, 错误: ${err}`);
            return null;
        }
    }

    async deleteFile(key: string): Promise<boolean> {
        if (!this.initialized) {
            await this.init();
        }

        logger.debug('Deleting file:', { key });

        try {
            await this.clients.cos.deleteObject(key);
            return true;
        } catch (err) {
            logger.error(`删除文件失败: ${key}, 错误: ${err}`);
            return false;
        }
    }

    async listObjects(prefix = ''): Promise<{
        key: string;
        size: number;
        lastModified: Date;
    }[]> {
        if (!this.initialized) {
            await this.init();
        }

        try {
            const response: ListObjectsResult = await this.clients.cos.listObjects({
                prefix,
            });

            logger.debug('List objects response:', response);

            const objects = []

            for (const item of response.Contents || []) {
                objects.push({
                    key: item.Key || '',
                    size: Number(item.Size) || 0,
                    // 优先使用元数据中的 mtime，如果没有则使用 object的 LastModified
                    lastModified: item.Metadata?.['mtime'] ?
                        new Date(item.Metadata['mtime']) :
                        (new Date(item.LastModified) || new Date())
                });
            }

            return objects;
        } catch (err) {
            logger.error(`列出文件失败: ${prefix}, 错误: ${err}`);
            throw err;
        }
    }

    async copyObject(fromKey: string, toKey: string): Promise<boolean> {
        if (!this.initialized) {
            await this.init();
        }

        try {
            await this.clients.cos.copyObject(fromKey, toKey);
            return true;
        } catch (err) {
            logger.error(`复制文件失败: ${fromKey} -> ${toKey}, 错误: ${err}`);
            return false;
        }
    }

    updateConfig(newConfig: Partial<S3Config>) {
        this.config = { ...this.config, ...newConfig };
        this.clients = {
            cos: new TencentCosClient({
                secretId: this.config.accessKeyId,
                secretKey: this.config.secretAccessKey,
                bucket: this.config.bucket,
                region: this.config.region,
            })
        };
    }

    async getBucketUsage(): Promise<{ storageUsage: number }> {
        // TODO
        throw new Error('Not implemented');
    }
}

class S3DownloadService implements CloudDownloadService {
    async downloadFileAsString(remoteFilePath: string): Promise<string | null> {
        const buffer = await S3Client.getInstance().downloadToBuffer(remoteFilePath);
        if (!buffer) {
            return null;
        }
        return buffer.toString('utf-8');
    }

    async downloadFile(remoteFilePath: string, remoteFileInfo?: any): Promise<ArrayBuffer | null> {
        const buffer = await S3Client.getInstance().downloadToBuffer(remoteFilePath);
        if (!buffer) {
            return null;
        }
        return new Uint8Array(buffer).buffer;
    }
}

class S3UploadService implements CloudUploadService {
    async uploadFile(localFilePath: string, remoteFilePath: string): Promise<boolean> {
        logger.debug('Upload file', { localFilePath, remoteFilePath });
        try {
            const content = await cloudDiskModel.vault.adapter.readBinary(localFilePath);
            const stat = await cloudDiskModel.vault.adapter.stat(localFilePath);
            return await S3Client.getInstance().uploadFile(
                new Uint8Array(content),
                remoteFilePath,
                stat?.mtime
            );
        } catch (err) {
            logger.error(`上传本地文件失败: ${localFilePath} -> ${remoteFilePath}, 错误: ${err}`);
            return false;
        }
    }

    async uploadContent(content: Uint8Array | ArrayBuffer, remotePath: string, params?: {
        ctime?: number,
        mtime?: number
    }, callback?: (ctime: number, mtime: number) => Promise<void>): Promise<boolean> {
        try {
            const success = await S3Client.getInstance().uploadFile(new Uint8Array(content), remotePath);

            if (success && callback) {
                const now = Date.now();
                await callback(now, now);
            }

            return success;
        } catch (err) {
            logger.error(`上传内容失败: ${remotePath}, 错误: ${err}`);
            return false;
        }
    }
}

class S3InfoService implements CloudInfoService {
    async userInfo(): Promise<UserInfo> {
        return {
            user_id: cloudDiskModel.s3Config.accessKeyId,
            user_name: `${cloudDiskModel.s3Config.bucket}@${cloudDiskModel.s3Config.region}`,
        };
    }

    async storageInfo(): Promise<StorageInfo> {
        try {
            const objects = await S3Client.getInstance().listObjects();
            const totalSize = objects.reduce((sum, obj) => sum + obj.size, 0);

            return {
                total: -1, // S3 API 无法获取存储桶容量限制
                used: totalSize,
                free: -1, // S3 API 无法获取剩余空间
            };
        } catch (err) {
            logger.error('获取存储信息失败:', err);
            return {
                total: -1,
                used: -1,
                free: -1,
            };
        }
    }

    async listFiles(parentPath: string, limit?: number, nextMarker?: string): Promise<[FileEntry[], string]> {
        if (parentPath.startsWith('/')) {
            parentPath = parentPath.slice(1);
        }
        try {
            const objects = await S3Client.getInstance().listObjects(parentPath);
            const fileEntries = objects
                .filter(obj => obj.key.startsWith(parentPath))
                .map(obj => ({
                    fsid: obj.key,
                    name: util.path.basename(obj.key),
                    isdir: obj.key.endsWith('/') ? true : false,
                    size: obj.size,
                    ctime: util.time.msToSec(obj.lastModified.getTime()),
                    mtime: util.time.msToSec(obj.lastModified.getTime()),
                    path: obj.key.startsWith('/') ? obj.key : `/${obj.key}`,
                }));

            return [fileEntries, ''];
        } catch (err) {
            logger.error(`列出文件失败: ${parentPath}, 错误: ${err}`);
            return [[], ''];
        }
    }

    async listAllFiles(folderPath: string, folderId?: string): Promise<FileEntry[]> {
        const [files] = await this.listFiles(folderPath);
        logger.debug({ folderPath, files });
        return files;
    }
}

class S3FileManagementService implements CloudFileManagementService {
    async renameFile(from: string, newName: string): Promise<void> {
        const remoteFrom = util.path.join(cloudDiskModel.remoteRootPath, from);
        const to = util.path.join(util.path.dirname(remoteFrom), newName);
        const success = await S3Client.getInstance().copyObject(remoteFrom, to);
        if (!success) {
            throw new Error(`重命名失败: ${from} -> ${newName}`);
        }
        await S3Client.getInstance().deleteFile(remoteFrom);
    }

    async deleteFile(filePath: string): Promise<boolean> {
        const remoteFilePath = util.path.join(cloudDiskModel.remoteRootPath, filePath);
        return await S3Client.getInstance().deleteFile(remoteFilePath);
    }

    async deleteFileById(fileId: string): Promise<void> {
        const success = await this.deleteFile(fileId);
        if (!success) {
            throw new Error(`删除文件失败: ${fileId}`);
        }
    }

    async copyFile(from: string, to: string): Promise<any> {
        const remoteFrom = util.path.join(cloudDiskModel.remoteRootPath, from);
        const remoteTo = util.path.join(cloudDiskModel.remoteRootPath, to);
        const success = await S3Client.getInstance().copyObject(remoteFrom, remoteTo);
        if (!success) {
            throw new Error(`复制文件失败: ${from} -> ${to}`);
        }
    }

    async moveFile(from: string, to: string): Promise<void> {
        const remoteFrom = util.path.join(cloudDiskModel.remoteRootPath, from);
        const remoteTo = util.path.join(cloudDiskModel.remoteRootPath, to);
        const success = await S3Client.getInstance().copyObject(remoteFrom, remoteTo);
        if (!success) {
            throw new Error(`移动文件失败: ${from} -> ${to}`);
        }
        await S3Client.getInstance().deleteFile(remoteFrom);
    }

    async mkdir(dirPath: string): Promise<void> {
        const remoteDirPath = util.path.join(cloudDiskModel.remoteRootPath, dirPath);
        const success = await S3Client.getInstance().uploadFile(Buffer.from(''), `${remoteDirPath}/.keep`);
        if (!success) {
            throw new Error(`创建目录失败: ${dirPath}`);
        }
    }
}

export const S3Service = {
    S3DownloadService,
    S3UploadService,
    S3InfoService,
    S3FileManagementService,
}