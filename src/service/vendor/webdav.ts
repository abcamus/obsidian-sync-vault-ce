import { CloudDownloadService, CloudUploadService, CloudInfoService, CloudFileManagementService } from '@/service/cloud-disk-service';
import { cloudDiskModel } from '@/model/cloud-disk-model';
import { FileEntry, StorageInfo, UserInfo } from '@/service/cloud-interface';
import { Notice, requestUrl, RequestUrlParam, RequestUrlResponse } from 'obsidian';

import * as util from '@/util';

const logger = util.logger.createLogger('webdav.service');

interface WebDAVConfig {
    url: string;
    username: string;
    password: string;
}

interface FileStat {
    /** 文件/目录路径（相对于WebDAV根目录） */
    path: string;
    /** 类型：'file' 或 'directory' */
    type: "file" | "directory";
    /** 文件大小（字节），目录则为 undefined */
    size: number;
    /** 最后修改时间（ISO 字符串） */
    lastModified: string;
    /** 文件etag */
    etag?: string;
    /** 文件扩展名（仅文件） */
    extension?: string;
}

export class WebDAVClient {
    baseUrl: string;
    username: string;
    password: string;

    static instance: WebDAVClient;

    private constructor(config: WebDAVConfig) {
        this.baseUrl = config.url;
        this.username = config.username;
        this.password = config.password;
    }

    static createClient(config: WebDAVConfig) {
        this.instance = new WebDAVClient(config);
    }

    static getInstance(): WebDAVClient {
        if (!WebDAVClient.instance) {
            WebDAVClient.instance = new WebDAVClient({
                url: cloudDiskModel.webdavUrl,
                username: cloudDiskModel.webdavUsername,
                password: cloudDiskModel.webdavPassword,
            });
        }

        return WebDAVClient.instance;
    }

    private async request(
        method: string,
        path: string,
        data?: string | ArrayBuffer,
        headers: Record<string, string> = {}
    ): Promise<RequestUrlResponse> {
        const url = util.path.join(this.baseUrl, path);
        logger.debug(`Target url: ${url}, username: ${this.username}, pwd: ${this.password}`);
        const authHeader = {
            Authorization: 'Basic ' + btoa(`${this.username}:${this.password}`),
        };

        const options: RequestUrlParam = {
            url,
            method,
            headers: { ...authHeader, ...headers },
            throw: false
        };

        if (method === "PROPFIND") {
            options.body = `<?xml version="1.0"?>
            <d:propfind xmlns:d="DAV:">
            <d:prop>
                <d:getetag/>
                <d:displayname/>
                <d:getlastmodified/>
                <d:getcontentlength/>
                <d:resourcetype/>
            </d:prop>
            </d:propfind>`;
            options.headers = {
                ...options.headers,
                "Content-Type": "application/xml",
                "Depth": "1",
            };
        } else if (data) {
            options.body = data;
        }

        logger.debug(`[Request] ${JSON.stringify(options)}`);

        return requestUrl(options);
    }

    private parseWebDAVResponse(xmlText: string): FileStat[] {
        const parser = new DOMParser();
        const doc = parser.parseFromString(xmlText, "text/xml");

        // 检查错误
        const error = doc.querySelector("parsererror");
        if (error) {
            throw new Error(`Failed to parse XML: ${error.textContent}`);
        }

        // 兼容 d:response/D:response/无前缀等
        const responses: Element[] = [];
        const allElements = doc.getElementsByTagName("*");
        for (let i = 0; i < allElements.length; i++) {
            const el = allElements[i];
            if (el.localName === "response") {
                responses.push(el as Element);
            }
        }

        logger.debug({ 'Response count': responses.length });
        return responses.map((res) => {
            const href = (res.getElementsByTagName("d:href")[0] ||
                res.getElementsByTagName("D:href")[0] ||
                res.getElementsByTagName("href")[0])?.textContent || "";
            const decodedHref = decodeURIComponent(href);
            const path = decodedHref.replace("/dav", "");

            const isCollection = res.getElementsByTagName("d:collection").length > 0 ||
                res.getElementsByTagName("D:collection").length > 0 ||
                res.getElementsByTagName("collection").length > 0;
            const type = isCollection ? "directory" : "file";

            const sizeText = (res.getElementsByTagName("d:getcontentlength")[0] ||
                res.getElementsByTagName("lp1:getcontentlength")[0] ||
                res.getElementsByTagName("getcontentlength")[0])?.textContent;
            const size = sizeText ? parseInt(sizeText) : 0;

            const lastModifiedText = (res.getElementsByTagName("d:getlastmodified")[0] ||
                res.getElementsByTagName("lp1:getlastmodified")[0] ||
                res.getElementsByTagName("getlastmodified")[0])?.textContent;
            const lastModified = lastModifiedText ? new Date(lastModifiedText).toISOString() : '';

            const extension = type === "file" ? path.split(".").pop()?.toLowerCase() : undefined;

            const etag = (res.getElementsByTagName("d:getetag")[0] ||
                res.getElementsByTagName("lp1:getetag")[0] ||
                res.getElementsByTagName("getetag")[0])?.textContent;

            return {
                path,
                type,
                size,
                lastModified,
                etag: etag === null ? undefined : etag,
                extension,
            };
        });
    }

    async createFolder(path: string = ""): Promise<boolean> {
        try {
            // WebDAV 创建文件夹使用 MKCOL 方法
            const response = await this.request("MKCOL", path);
            if (response.status === 201 || response.status === 200) {
                logger.info(`文件夹创建成功: ${path}`);
                return true;
            } else if (response.status === 405) {
                // 405 表示文件夹已存在
                logger.warn(`文件夹已存在: ${path}`);
                return true;
            } else {
                logger.error(`创建文件夹失败: ${path}, 状态码: ${response.status}`);
                return false;
            }
        } catch (err) {
            logger.error(`创建文件夹异常: ${path}, 错误: ${err}`);
            return false;
        }
    }

    async createFolderRecursive(path: string): Promise<boolean> {
        const parts = path.split('/').filter(Boolean);
        let current = '';
        for (const part of parts) {
            current = current ? `${current}/${part}` : part;
            await this.createFolder(current);
        }
        return true;
    }

    async listDirectory(path: string = ""): Promise<FileStat[]> {
        try {
            const response = await this.request("PROPFIND", path);

            logger.debug(`response: ${response.text}`);

            return this.parseWebDAVResponse(response.text);
        } catch (error) {
            logger.error(error);
            return [];
        }
    }

    async listFilesResursive(folderPath: string): Promise<FileStat[]> {
        if (!folderPath.endsWith('/')) folderPath += '/';
        let requestCount = 0;
        const listInnerFolder = async (innerPath: string): Promise<FileStat[]> => {
            if (requestCount > 1000) {
                logger.warn(`Too many requests`);
            }
            requestCount++;
            logger.debug(`List folder: ${innerPath}`);
            const contents = await this.listDirectory(innerPath);

            logger.debug({ 'Item count': contents });
            const result: FileStat[] = [];
            for (const item of contents) {
                const itemPath = item.type === 'directory' && !item.path.endsWith('/') ? item.path + '/' : item.path;
                const comparePath = innerPath.endsWith('/') ? innerPath : innerPath + '/';
                if (itemPath === comparePath) {
                    result.push(item);
                    logger.debug(`Skip self: ${item.path}`);
                    continue;
                };
                if (item.type === 'directory') {
                    const subItems = await listInnerFolder(item.path);
                    result.push(...subItems);
                } else {
                    result.push(item);
                }
            }

            return result;
        }
        return listInnerFolder(folderPath);
    }
}

class WebdavDownloadService implements CloudDownloadService {
    async downloadFileAsString(remoteFilePath: string): Promise<string | null> {
        try {
            const client = WebDAVClient.getInstance();
            const response = await client['request']("GET", remoteFilePath);
            if (response.status >= 200 && response.status < 300) {
                return response.text;
            } else {
                logger.error(`下载文件失败: ${remoteFilePath}, 状态码: ${response.status}`);
                return null;
            }
        } catch (err) {
            logger.error(`下载文件异常: ${remoteFilePath}, 错误: ${err}`);
            return null;
        }
    }

    async downloadFile(remoteFilePath: string): Promise<ArrayBuffer | null> {
        try {
            const client = WebDAVClient.getInstance();
            const response = await client['request']("GET", remoteFilePath);
            if (response.status >= 200 && response.status < 300) {
                // response.arrayBuffer 仅在 fetch API 下有，obsidian requestUrl 返回的是 ArrayBuffer 或 text
                if (response.arrayBuffer) {
                    return response.arrayBuffer;
                }

                logger.warn(`下载文件: ${remoteFilePath}，未获取到 ArrayBuffer，返回 null`);
                return null;
            } else {
                logger.error(`下载文件失败: ${remoteFilePath}, 状态码: ${response.status}`);
                return null;
            }
        } catch (err) {
            logger.error(`下载文件异常: ${remoteFilePath}, 错误: ${err}`);
            return null;
        }
    }
}

class WebdavUploadService implements CloudUploadService {
    // Implementation of Webdav upload service methods
    async uploadFile(localPath: string, remotePath: string, params?: { ctime?: number, mtime?: number }): Promise<boolean> {
        const folderExists = await WebDAVClient.getInstance().createFolderRecursive(util.path.dirname(remotePath));
        if (!folderExists) {
            new Notice(`Folder not found: ${util.path.dirname(remotePath)}`);
            return false;
        }
        try {
            // 读取本地文件内容
            const data = await cloudDiskModel.vault.adapter.readBinary(localPath);
            // 调用 WebDAV PUT 方法上传
            const client = WebDAVClient.getInstance();
            const response = await client['request']("PUT", remotePath, data);
            logger.debug({
                UploadResponse: response
            });
            if (response.status >= 200 && response.status < 300) {
                logger.info(`上传成功: ${localPath} -> ${remotePath}`);
                return true;
            } else {
                logger.error(`上传失败: ${localPath} -> ${remotePath}, 状态码: ${response.status}`);
                return false;
            }
        } catch (err) {
            logger.error(`上传异常: ${localPath} -> ${remotePath}, 错误: ${err}`);
            return false;
        }
    }

    async uploadContent(content: Uint8Array | ArrayBuffer, remotePath: string, params?: {
        ctime?: number,
        mtime?: number
    }, callback?: (ctime: number, mtime: number) => Promise<void>): Promise<boolean> {
        const folderExists = await WebDAVClient.getInstance().createFolder(util.path.dirname(remotePath));
        if (!folderExists) {
            new Notice(`Folder not exists: ${util.path.dirname(remotePath)}`);
            return false;
        }
        try {
            const client = WebDAVClient.getInstance();
            const response = await client['request']("PUT", remotePath, content);
            if (response.status >= 200 && response.status < 300) {
                logger.info(`内容上传成功: ${remotePath}`);
                if (callback && params?.ctime && params?.mtime) {
                    await callback(params.ctime, params.mtime);
                }
                return true;
            } else {
                logger.error(`内容上传失败: ${remotePath}, 状态码: ${response.status}`);
                return false;
            }
        } catch (err) {
            logger.error(`内容上传异常: ${remotePath}, 错误: ${err}`);
            return false;
        }
    }
}

class WebdavInfoService implements CloudInfoService {
    // Implementation of Webdav info service methods
    async userInfo(): Promise<UserInfo> {
        return {
            user_id: 'webdav',
            user_name: cloudDiskModel.webdavUsername
        };
    }

    async storageInfo(): Promise<StorageInfo> {
        // FIXME: get cloud disk storage info
        return {
            total: 1000000000,
            used: 1000000000,
        }
    }

    async listFiles(parentFileId: string, limit?: number, nextMarker?: string): Promise<[FileEntry[], string]> {
        return [[], ''];
    }

    async listAllFiles(folderPath: string, folderId?: string): Promise<FileEntry[]> {
        logger.debug(`listAllFiles, path: ${folderPath}`);
        const files: FileStat[] = await WebDAVClient.getInstance().listFilesResursive(folderPath);
        const result: FileEntry[] = [];
        for (const file of files) {
            const entry: FileEntry = {
                path: file.path,
                isdir: file.type === 'directory',
                fsid: 'unexpected-fsid', // Placeholder, WebDAV does not provide fsid
                ctime: util.time.msToSec(new Date(file.lastModified).getTime()),
                mtime: util.time.msToSec(new Date(file.lastModified).getTime()),
                size: file.size,
            }
            result.push(entry);
        }

        logger.debug(`file entries: ${JSON.stringify(result, null, 2)}`);
        return result;
    }
}

class WebdavFileManagementService implements CloudFileManagementService {
    // Implementation of Webdav file management service methods
    async renameFile(from: string, newName: string): Promise<void> {
        const client = WebDAVClient.getInstance();
        const remoteFrom = util.path.join(cloudDiskModel.remoteRootPath, from);
        // 目标路径
        const to = util.path.join(util.path.dirname(remoteFrom), newName);
        const destUrl = util.path.join(client.baseUrl, to);

        const headers = {
            Destination: encodeURI(destUrl),
            Overwrite: "T"
        };
        const response = await client['request']("MOVE", remoteFrom, undefined, headers);
        if (response.status < 200 || response.status >= 300) {
            throw new Error(`重命名失败: ${remoteFrom} -> ${destUrl}, 状态码: ${response.status}`);
        }
    }
    async deleteFile(filePath: string): Promise<boolean> {
        const client = WebDAVClient.getInstance();
        const remoteFilePath = util.path.join(cloudDiskModel.remoteRootPath, filePath);
        const response = await client['request']("DELETE", remoteFilePath);
        if (response.status >= 200 && response.status < 300) {
            logger.info(`删除成功: ${filePath}`);
            return true;
        } else {
            logger.error(`删除失败: ${filePath}, 状态码: ${response.status}`);
            return false;
        }
    }

    async deleteFileById(fileId: string): Promise<void> {
        await this.deleteFile(fileId);
    }
    async copyFile(from: string, to: string): Promise<any> {
        const client = WebDAVClient.getInstance();
        const remoteFromAddr = util.path.join(cloudDiskModel.remoteRootPath, from);
        const remoteToAddr = util.path.join(cloudDiskModel.remoteRootPath, to);
        const destUrl = util.path.join(client.baseUrl, remoteToAddr);
        const headers = {
            Destination: encodeURI(destUrl),
            Overwrite: "T"
        };
        const response = await client['request']("COPY", remoteFromAddr, undefined, headers);
        if (response.status >= 200 && response.status < 300) {
            logger.info(`复制成功: ${from} -> ${to}`);
            return true;
        } else {
            logger.error(`复制失败: ${from} -> ${to}, 状态码: ${response.status}`);
            throw new Error(`复制失败: ${from} -> ${to}, 状态码: ${response.status}`);
        }
    }
    async moveFile(from: string, to: string): Promise<void> {
        const client = WebDAVClient.getInstance();
        const destUrl = util.path.join(client.baseUrl, to);
        const headers = {
            Destination: destUrl,
            Overwrite: "T"
        };
        const response = await client['request']("MOVE", from, undefined, headers);
        if (response.status >= 200 && response.status < 300) {
            logger.info(`移动成功: ${from} -> ${to}`);
        } else {
            logger.error(`移动失败: ${from} -> ${to}, 状态码: ${response.status}`);
            throw new Error(`移动失败: ${from} -> ${to}, 状态码: ${response.status}`);
        }
    }
    async mkdir(dirPath: string): Promise<void> {
        const result = WebDAVClient.getInstance().createFolder(dirPath);
        if (!result) {
            logger.error(`Create folder failed, ${dirPath}`);
            new Notice(`Create folder failed, ${dirPath}`);
        }
    }
}

export const WebdavService = {
    WebdavDownloadService,
    WebdavUploadService,
    WebdavInfoService,
    WebdavFileManagementService,
}