import { LocalFileNode } from '../../model/file-tree-node';
import { SyncStatus, getSyncButtonText } from '../../model/sync-status';
import {
    FolderOutlined,
    DescriptionOutlined,
    LockOutlined,
    Sync,
    CloudDone,
    CloudDownloadOutlined,
    CloudUploadOutlined,
    ErrorOutline,
    HourglassEmpty
} from '@mui/icons-material';
import { styled } from '@mui/material/styles';
import { createLogger } from '../../util/logger';

import React from 'react';
import Tooltip from '@mui/material/Tooltip';

const logger = createLogger('render');

interface StyledIconProps {
    $hoverable?: boolean;
}

const StyledIcon = styled('span')<StyledIconProps>(({ $hoverable = true }) => ({
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    color: 'var(--icon-color)',
    fontSize: 'var(--font-ui-large)',
    transition: 'all 0.2s ease',
    position: 'relative',
    // padding: '4px',
    borderRadius: '4px',
    '& .MuiSvgIcon-root': {
        fontSize: 'var(--font-ui-large)',
    },
    ...($hoverable && {
        '&:hover': {
            color: 'var(--interactive-accent)',
            backgroundColor: 'var(--background-modifier-hover)',
            transform: 'translateY(-2px)',
            boxShadow: '0 2px 5px rgba(0,0,0,0.1)',
        },
    }),
}));

interface SyncProgress {
    completed: number;
    total: number;
}

const formatSize = (size: number | undefined | null) => {
    if (size === undefined || size === null) return ' --';
    if (size < 1024) return `${size} B`;
    if (size < 1024 * 1024) return `${(size / 1024).toFixed(2)} KB`;
    return `${(size / (1024 * 1024)).toFixed(2)} MB`;
};

const formatDate = (date: Date | undefined) => {
    if (!date) return '';
    return date.toLocaleString();
};

/**
 * 根据文件的同步状态生成对应的图标
 * @param syncStatus 文件的同步状态
 * @param onSyncClick 同步点击事件, 如果为null，则不操作，upload表示上传，download表示下载，stop表示停止
 * @returns 同步状态图标
 */
export const getSyncStatusIcon = (syncStatus: SyncStatus, remoteEncrypt: boolean | undefined, onSyncClick: (action: 'upload' | 'download' | 'stop' | null) => void) => {
    const renderIcon = (icon: JSX.Element, title: string, action: 'upload' | 'download' | 'stop' | null) => (
        <Tooltip title={title} arrow>
            {React.cloneElement(icon, {
                onClick: () => onSyncClick(action),
                style: { color: 'var(--interactive-accent)' },
                'aria-label': undefined,
            })}
        </Tooltip>
    );

    const statusIcon = (icon: JSX.Element, lock: boolean = false) => {
        return (
            <StyledIcon $hoverable={false}>
                {icon}
                {lock && (
                    <LockOutlined style={{
                        fontSize: '14px',
                        position: 'absolute',
                        bottom: -4,
                        right: -6,
                        background: 'var(--background-primary)',
                        borderRadius: '50%',
                        padding: '2px'
                    }} />
                )}
            </StyledIcon>
        );
    }

    /* 上传加密 */
    const uploadEncrypt = false;
    /* 远程文件加密，下载的时候需要解密 */
    const downloadEncrypt = remoteEncrypt || false;
    const buttonText = getSyncButtonText(syncStatus);
    switch (syncStatus) {
        case SyncStatus.Syncing:
            return renderIcon(statusIcon(<Sync />, false), buttonText, 'stop');
        case SyncStatus.FullySynced:
            return renderIcon(statusIcon(<CloudDone />, false),buttonText, null);
        case SyncStatus.RemoteCreated:
            return renderIcon(statusIcon(<CloudDownloadOutlined />, downloadEncrypt), buttonText, 'download');
        case SyncStatus.RemoteDeleted:
            return renderIcon(statusIcon(<CloudUploadOutlined />, uploadEncrypt), buttonText, 'upload');
        case SyncStatus.RemoteModified:
            return renderIcon(statusIcon(<CloudDownloadOutlined />, downloadEncrypt), buttonText, 'download');
        case SyncStatus.Conflict:
            return renderIcon(<StyledIcon><ErrorOutline /></StyledIcon>, buttonText, null);
        case SyncStatus.LocalCreated:
            return renderIcon(statusIcon(<CloudUploadOutlined />, uploadEncrypt), buttonText, 'upload');
        case SyncStatus.LocalModified:
            return renderIcon(statusIcon(<CloudUploadOutlined />, uploadEncrypt),buttonText, 'upload');
        case SyncStatus.LocalDeleted:
            return renderIcon(statusIcon(<CloudUploadOutlined />, uploadEncrypt), buttonText, 'upload');
        default:
            return renderIcon(statusIcon(<HourglassEmpty />, false), buttonText, null);
    }
};

const renderFileIcon = (file: LocalFileNode, onClick: (item: LocalFileNode) => void) => {
    return (
        <div className="file-icon" onClick={() => onClick(file)}>
            <StyledIcon $hoverable={false}>
                {file.type === 'directory' ? <FolderOutlined /> : <DescriptionOutlined />}
            </StyledIcon>
        </div>
    );
};

const renderFileName = (file: LocalFileNode, onClick: (item: LocalFileNode) => void) => {
    return (
        <div className="file-name" onClick={() => onClick(file)}>
            {file.name}
            {file.type === 'directory' && (
                <span className="file-count"> ({file.children?.length || 0} 项)</span>
            )}
        </div>
    );
};
const renderFileSize = (file: LocalFileNode) => {
    return (
        <div className="file-size hide-on-mobile">{formatSize(file.size)}</div>
    );
};

const renderFileModified = (file: LocalFileNode) => {
    return (
        <div className="file-modified hide-on-mobile">
            {formatDate(file.mtime)}
        </div>
    );
};

const renderFileSyncStatus = (file: LocalFileNode, onClick: (action: 'upload' | 'download' | 'stop' | null, node: LocalFileNode) => void, isSyncing: boolean, syncProgress?: SyncProgress) => {
    if (file.syncStatus === SyncStatus.FullySynced) {
        return <div className='file-sync-status-placeholder'></div>;
    }

    return (
        <div className="file-sync-status">
            {isSyncing && (
                <span className="spinner"></span>
            )}
            {isSyncing && syncProgress ? (
                <span className="sync-progress">
                    {syncProgress.completed}/{syncProgress.total}
                </span>
            ) : (
                getSyncStatusIcon(file.syncStatus, file.remoteEncrypt, (action) => onClick(action, file))
            )}
        </div>
    );
};

export function renderFileItem(
    file: LocalFileNode,
    onItemClick: (item: LocalFileNode) => void,
    isSyncing: boolean,
    onSyncClick: (action: 'upload' | 'download' | 'stop' | null, node: LocalFileNode) => Promise<void>,
    syncProgress?: SyncProgress,
) {
    logger.debug(`[renderFileItem] ${file.name}, isSyncing: ${isSyncing}`);
    return (
        <div key={file.name} className="file-item">
            {renderFileIcon(file, onItemClick)}
            {renderFileName(file, onItemClick)}
            {renderFileSyncStatus(file, onSyncClick, isSyncing, syncProgress)}
            {renderFileSize(file)}
            {renderFileModified(file)}
        </div>
    );
};