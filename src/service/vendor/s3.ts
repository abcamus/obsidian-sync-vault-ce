import {
    S3Client as AWSS3Client,
    GetObjectCommand,
    DeleteObjectCommand,
    ListObjectsV2Command,
    CopyObjectCommand
} from "@aws-sdk/client-s3";
import { Upload } from "@aws-sdk/lib-storage";
import * as util from "@/util";

import { CloudDownloadService, CloudFileManagementService, CloudInfoService, CloudUploadService } from "../cloud-disk-service";
import { FileEntry, StorageInfo, UserInfo } from "../cloud-interface";
import { cloudDiskModel } from "@/model/cloud-disk-model";

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
    private client: AWSS3Client;
    private config: S3Config;

    private constructor() {
        this.config = {
            endpoint: cloudDiskModel.s3Config.endpoint,
            region: cloudDiskModel.s3Config.region || 'us-east-1',
            accessKeyId: cloudDiskModel.s3Config.accessKeyId,
            secretAccessKey: cloudDiskModel.s3Config.secretAccessKey,
            bucket: cloudDiskModel.s3Config.bucket
        };

        this.client = new AWSS3Client({
            endpoint: this.config.endpoint,
            region: this.config.region,
            credentials: {
                accessKeyId: this.config.accessKeyId,
                secretAccessKey: this.config.secretAccessKey
            }
        });
    }

    public static getInstance(): S3Client {
        if (!S3Client.instance) {
            S3Client.instance = new S3Client();
        }
        return S3Client.instance;
    }

    async uploadFile(content: Buffer | Uint8Array, key: string): Promise<boolean> {
        try {
            const upload = new Upload({
                client: this.client,
                params: {
                    Bucket: this.config.bucket,
                    Key: key,
                    Body: content
                }
            });

            await upload.done();
            return true;
        } catch (err) {
            logger.error(`上传文件失败: ${key}, 错误: ${err}`);
            return false;
        }
    }

    async downloadToBuffer(key: string): Promise<Buffer | null> {
        try {
            const command = new GetObjectCommand({
                Bucket: this.config.bucket,
                Key: key
            });
            const response = await this.client.send(command);

            if (!response.Body) {
                return null;
            }

            const chunks: Buffer[] = [];
            for await (const chunk of response.Body as any) {
                chunks.push(Buffer.from(chunk));
            }
            return Buffer.concat(chunks);
        } catch (err) {
            logger.error(`下载文件失败: ${key}, 错误: ${err}`);
            return null;
        }
    }

    async deleteObject(key: string): Promise<boolean> {
        try {
            const command = new DeleteObjectCommand({
                Bucket: this.config.bucket,
                Key: key
            });
            await this.client.send(command);
            return true;
        } catch (err) {
            logger.error(`删除文件失败: ${key}, 错误: ${err}`);
            return false;
        }
    }

    async listObjects(prefix: string = ''): Promise<{
        key: string;
        size: number;
        lastModified: Date;
    }[]> {
        try {
            const command = new ListObjectsV2Command({
                Bucket: this.config.bucket,
                Prefix: prefix
            });
            const response = await this.client.send(command);

            return (response.Contents || []).map(item => ({
                key: item.Key || '',
                size: item.Size || 0,
                lastModified: item.LastModified || new Date()
            }));
        } catch (err) {
            logger.error(`列出文件失败: ${prefix}, 错误: ${err}`);
            return [];
        }
    }

    async copyObject(fromKey: string, toKey: string): Promise<boolean> {
        try {
            const command = new CopyObjectCommand({
                Bucket: this.config.bucket,
                CopySource: `${this.config.bucket}/${fromKey}`,
                Key: toKey
            });
            await this.client.send(command);
            return true;
        } catch (err) {
            logger.error(`复制文件失败: ${fromKey} -> ${toKey}, 错误: ${err}`);
            return false;
        }
    }
}

class S3DownloadService implements CloudDownloadService {
    async downloadFileAsString(remoteFilePath: string): Promise<string | null> {
        return null;
    }

    async downloadFile(remoteFilePath: string, remoteFileInfo?: any): Promise<ArrayBuffer | null> {
        return null;
    }
}

class S3UploadService implements CloudUploadService {
    async uploadFile(localFilePath: string, remoteFilePath: string): Promise<boolean> {
        return true;
    }

    async uploadContent(content: Uint8Array | ArrayBuffer, remotePath: string, params?: {
        ctime?: number,
        mtime?: number
    }, callback?: (ctime: number, mtime: number) => Promise<void>): Promise<boolean> {
        return true;
    }
}

class S3InfoService implements CloudInfoService {
    async userInfo(): Promise<UserInfo> {
        return {
            user_id: 's3',
            user_name: 'unknown',
        };
    }

    async storageInfo(): Promise<StorageInfo> {
        // TODO: get storage info
        return {
            total: -1,
            used: -1,
            free: -1,
        };
    }

    async listFiles(parentFileId: string, limit?: number, nextMarker?: string): Promise<[FileEntry[], string]> {
        return [[], ''];
    }

    async listAllFiles(folderPath: string, folderId?: string): Promise<FileEntry[]> {
        return [];
    }
}

class S3FileManagementService implements CloudFileManagementService {
    async renameFile(from: string, newName: string): Promise<void> {

    }

    async deleteFile(filePath: string): Promise<boolean> {
        return true;
    }

    async deleteFileById(fileId: string): Promise<void> {
        await this.deleteFile(fileId);
    }

    async copyFile(from: string, to: string): Promise<any> {

    }

    async moveFile(from: string, to: string): Promise<void> {

    }

    async mkdir(dirPath: string): Promise<void> {

    }
}

export const S3Service = {
    S3DownloadService,
    S3UploadService,
    S3InfoService,
    S3FileManagementService,
}