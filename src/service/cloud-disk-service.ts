
export interface CloudDownloadService {
    downloadFileAsString(remoteFilePath: string): Promise<string | null>;
    downloadFile(remoteFilePath: string, remoteFileInfo?: any): Promise<ArrayBuffer | null>;
}

export interface CloudUploadService {
    uploadFile(
        localPath: string, remotePath: string, params?: { ctime?: number, mtime?: number }
    ): Promise<boolean>;
    uploadContent(content: Uint8Array | ArrayBuffer, remotePath: string, params?: {
        ctime?: number,
        mtime?: number
    }, callback?: (ctime: number, mtime: number) => Promise<void>): Promise<boolean>;
}

export interface CloudFileManagementService {
    renameFile(from: string, newName: string): Promise<void>;
    deleteFile(filePath: string): Promise<boolean>;
    deleteFileById(fileId: string): Promise<void>;
    copyFile(from: string, to: string): Promise<any>;
    moveFile(from: string, to: string): Promise<void>;
    mkdir(dirPath: string): Promise<void>;
}

import { UserInfo, StorageInfo, FileEntry } from "@/types";

export interface CloudInfoService {
    userInfo(): Promise<UserInfo>;
    storageInfo(): Promise<StorageInfo>;
    listFiles(parentFileId: string, limit?: number, nextMarker?: string): Promise<[FileEntry[], string]>;
    listAllFiles(folderPath: string, folderId?: string): Promise<FileEntry[]>;
}