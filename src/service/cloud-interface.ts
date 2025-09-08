export interface FileEntry {
    path: string; // relative path from remote root
    isdir: boolean;
    fsid: number | string;
    ctime: number; /* 秒 */
    mtime: number; /* 秒 */
    size: number; /* 字节 */
    md5?: string;
    mimetype?: string;
}

export interface UserInfo {
    user_id: string;
    user_name: string;
    vip_type?: number;
    avatar?: string;
    email?: string;
    diskType?: string;
}

export interface StorageInfo {
    total: number;
    used: number;
    free?: number;
    expire?: boolean; /* 处理会员过期 */
    drive_id?: string; /* 阿里云 */
    resource_drive_id?: string; /* 阿里云 */
    usedPercent?: number;
    status?: string;
}

export interface FileInfo {
    drive_id: string;
    file_id: string;
    parent_file_id: string;
    name: string;
    size: number;
    mtime?: string;
}

export enum CloudDiskType {
    Aliyun = 'aliyun',
    Webdav = 'webdav',
    Ftp = 'ftp',
    S3 = 'sss',
    Unknown = 'unknown',
}

export function getCloudDiskName(type: CloudDiskType) {
    switch (type) {
        case CloudDiskType.Aliyun:
            return 'AliDrive';
        case CloudDiskType.Webdav:
            return 'WebDAV';
        default:
            return 'Unknown';
    }
}