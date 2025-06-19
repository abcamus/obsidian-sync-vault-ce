import React, { useState, useCallback, useEffect } from 'react';
import { LocalFileNode } from '../model/file-tree-node';
import FileNavBar from './file-navbar';
import LocalFileBrowser from './file-browser/local-file-browser';
import { Plugin, Vault, TFile } from 'obsidian';
import { createLogger } from 'src/util/logger';

const logger = createLogger('file-browser-mng');

interface FileBrowserManagerProps {
    plugin: Plugin;
    vault: Vault;
}

const FileBrowserManager: React.FC<FileBrowserManagerProps> = ({ plugin, vault }) => {
    const [currentPath, setCurrentPath] = useState<string[]>([]);

    const handleNavigation = useCallback((path: string[]) => {
        setCurrentPath(path);
    }, []);

    const handleFileSelect = useCallback((file: LocalFileNode) => {
        if (file.type === 'directory') {
            handleNavigation([...currentPath, file.name]);
        } else {
            logger.debug(`[handleFileSelect] selected file: ${JSON.stringify(file, null, 2)}`);
            const filePath = currentPath.length > 0 ? currentPath.join('/') + '/' + file.name : file.name;
            const localFile = vault.getAbstractFileByPath(filePath);
            if (localFile instanceof TFile) {
                plugin.app.workspace.getLeaf().openFile(localFile);
            }
        }
    }, [currentPath, handleNavigation]);

    useEffect(() => {
        logger.debug('[FileBrowserManager] mounted');

        return () => {
            logger.debug('[FileBrowserManager] unmounted');
        }
    }, []);

    return (
        <div className="file-browser-manager">
            <FileNavBar
                currentPath={currentPath}
                onNavigate={handleNavigation}
            />
            <LocalFileBrowser
                vault={vault}
                currentPath={currentPath}
                onFileSelect={handleFileSelect}
            />
        </div>
    );
};

export default FileBrowserManager;