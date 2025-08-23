import { Client } from 'basic-ftp';
import { Writable } from 'stream';
import { cloudDiskModel } from '@/model/cloud-disk-model';
import { Notice } from 'obsidian';
import * as util from '@/util';
import { CloudDownloadService, CloudFileManagementService, CloudInfoService, CloudUploadService } from '../cloud-disk-service';
import { FileEntry, StorageInfo, UserInfo } from '../cloud-interface';

const logger = util.logger.createLogger('ftp.service');

interface FtpConfig {
    host: string;
    port: number;
    username: string;
    password: string;
    privateKey?: string | Buffer;
}

interface FileStat {
    path: string;
    type: "file" | "directory";
    size: number;
    lastModified: string;
    extension?: string;
}

/*
export class FtpClient {
    private client: Client;
    static instance: FtpClient;

    private constructor(private config: FtpConfig) {
        this.client = new Client();
    }

    static createClient(config: FtpConfig) {
        this.instance = new FtpClient(config);
    }

    static getInstance(): FtpClient {
        if (!FtpClient.instance) {
            FtpClient.instance = new FtpClient({
                host: cloudDiskModel.ftpServer,
                port: cloudDiskModel.ftpPort || 21,
                username: cloudDiskModel.ftpUsername,
                password: cloudDiskModel.ftpPassword,
            });
        }
        return FtpClient.instance;
    }

    private async ensureConnect() {
        try {
            try {
                await this.client.list('/');
                // 如果成功，说明已连接
                return;
            } catch {
                // 如果失败，建立新连接
            }
            await this.client.connect({
                host: this.config.host,
                port: this.config.port,
                username: this.config.username,
                password: this.config.password,
                privateKey: this.config.privateKey
            });
        } catch (err) {
            logger.error(`FTP连接失败: ${err}`);
            throw new Error(`FTP连接失败: ${err}`);
        }
    }

    async createFolder(path: string = ""): Promise<boolean> {
        try {
            await this.ensureConnect();
            await this.client.mkdir(path);
            logger.info(`文件夹创建成功: ${path}`);
            return true;
        } catch (err) {
            logger.error(`创建文件夹异常: ${path}, 错误: ${err}`);
            return false;
        }
    }

    async createFolderRecursive(path: string): Promise<boolean> {
        try {
            await this.ensureConnect();
            await this.client.mkdir(path);
            return true;
        } catch (err) {
            logger.error(`递归创建文件夹失败: ${path}, 错误: ${err}`);
            return false;
        }
    }

    async listDirectory(path: string = ""): Promise<FileStat[]> {
        try {
            await this.ensureConnect();
            const list = await this.client.list(path);
            return list.map(item => ({
                path: util.path.join(path, item.name),
                type: item.type === 'd' ? "directory" : "file",
                size: item.size,
                lastModified: new Date(item.modifyTime || Date.now()).toISOString(),
                extension: item.type === '-' ? item.name.split('.').pop()?.toLowerCase() : undefined
            }));
        } catch (err) {
            logger.error(`列出目录失败: ${path}, 错误: ${err}`);
            return [];
        }
    }

    async listFilesRecursive(folderPath: string): Promise<FileStat[]> {
        const result: FileStat[] = [];
        try {
            await this.ensureConnect();
            const listInnerFolder = async (innerPath: string): Promise<void> => {
                const items = await this.listDirectory(innerPath);
                for (const item of items) {
                    result.push(item);
                    if (item.type === 'directory') {
                        await listInnerFolder(item.path);
                    }
                }
            };
            await listInnerFolder(folderPath);
        } catch (err) {
            logger.error(`递归列出文件失败: ${folderPath}, 错误: ${err}`);
        }
        return result;
    }

    async uploadFile(localPath: string, remotePath: string): Promise<boolean> {
        try {
            await this.ensureConnect();
            await this.createFolder(util.path.dirname(remotePath));
            await this.client.put(localPath, remotePath);
            return true;
        } catch (err) {
            logger.error(`上传文件失败: ${localPath} -> ${remotePath}, 错误: ${err}`);
            return false;
        }
    }

    async downloadFile(remotePath: string, localPath: string): Promise<boolean> {
        try {
            await this.ensureConnect();
            await this.client.get(localPath, remotePath);
            return true;
        } catch (err) {
            logger.error(`下载文件失败: ${remotePath} -> ${localPath}, 错误: ${err}`);
            return false;
        }
    }

    async downloadToBuffer(remotePath: string): Promise<Buffer | null> {
        try {
            await this.ensureConnect();
            const data = await this.client.get(remotePath, undefined, {
                readStreamOptions: {
                    encoding: null
                }
            });
            if (Buffer.isBuffer(data)) {
                return data;
            }

            logger.error(`下载的数据不是Buffer类型: ${remotePath}`);
            return null;
        } catch (err) {
            logger.error(`下载文件到Buffer失败: ${remotePath}, 错误: ${err}`);
            return null;
        }
    }

    async deleteFile(path: string): Promise<boolean> {
        try {
            await this.ensureConnect();
            await this.client.delete(path);
            return true;
        } catch (err) {
            logger.error(`删除文件失败: ${path}, 错误: ${err}`);
            return false;
        }
    }

    async rename(from: string, to: string): Promise<boolean> {
        try {
            await this.ensureConnect();
            await this.client.rename(from, to);
            return true;
        } catch (err) {
            logger.error(`重命名失败: ${from} -> ${to}, 错误: ${err}`);
            return false;
        }
    }

    disconnect() {
        this.client.end();
    }
}

class SftpDownloadService implements CloudDownloadService {
    async downloadFileAsString(remoteFilePath: string): Promise<string | null> {
        const client = FtpClient.getInstance();
        const data = await client.downloadToBuffer(remoteFilePath);

        if (!data) {
            return null;
        }

        return data.toString();
    }

    async downloadFile(remoteFilePath: string, remoteFileInfo?: any): Promise<ArrayBuffer | null> {
        const client = FtpClient.getInstance();
        const data = await client.downloadToBuffer(remoteFilePath);

        if (!data) {
            return null;
        }

        return new Uint8Array(data).buffer;
    }
}

class SftpUploadService implements CloudUploadService {
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

class SftpInfoService implements CloudInfoService {
    async userInfo(): Promise<UserInfo> {
        return {
            user_id: 'ftp',
            user_name: cloudDiskModel.ftpUsername,
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
        const client = FtpClient.getInstance();
        try {
            const files = await client.listDirectory(parentFileId);
            const fileEntries: FileEntry[] = files.map(file => ({
                fsid: file.path,
                name: util.path.basename(file.path),
                isdir: file.type === 'directory',
                size: file.size,
                ctime: new Date(file.lastModified).getTime(),
                mtime: new Date(file.lastModified).getTime(),
                path: file.path
            }));

            return [fileEntries, ''];
        } catch (err) {
            logger.error(`列出文件失败: ${parentFileId}, 错误: ${err}`);
            return [[], ''];
        }
    }

    async listAllFiles(folderPath: string, folderId?: string): Promise<FileEntry[]> {
        const client = FtpClient.getInstance();
        try {
            const files = await client.listFilesRecursive(folderPath);
            return files.map(file => ({
                fsid: file.path,
                name: util.path.basename(file.path),
                isdir: file.type === 'directory',
                size: file.size,
                ctime: new Date(file.lastModified).getTime(),
                mtime: new Date(file.lastModified).getTime(),
                path: file.path
            }));
        } catch (err) {
            logger.error(`递归列出文件失败: ${folderPath}, 错误: ${err}`);
            return [];
        }
    }
}

class SftpFileManagementService implements CloudFileManagementService {
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

export const SftpService = {
    SftpDownloadService,
    SftpUploadService,
    SftpInfoService,
    SftpFileManagementService,
}
*/