import { LocalFileNode, isFolderNodeEmpty } from '../../src/model/file-tree-node';
import { SyncStatus } from '../../src/model/sync-status';

console.error = jest.fn();

jest.mock('../../src/util/debug-config', () => ({
    DebugManager: {
        getInstance: jest.fn().mockReturnValue({
            config: {
                debug: false
            },
            isDebugEnabled: jest.fn().mockReturnValue(false),
        }),
    }
}));

describe('isFolderNodeEmpty', () => {
    it('should return false if the node is not a directory', () => {
        const node: LocalFileNode = {
            name: 'file.txt',
            type: "file",
            children: [],
            syncStatus: SyncStatus.FullySynced
        };
        expect(isFolderNodeEmpty(node)).toBe(false);
    });

    it('should return false if the directory contains a file', () => {
        const node: LocalFileNode = {
            name: 'folder',
            type: 'directory',
            children: [
                {
                    name: 'file.txt',
                    type: 'file',
                    children: [],
                    syncStatus: SyncStatus.FullySynced
                }
            ],
            syncStatus: SyncStatus.FullySynced
        };
        expect(isFolderNodeEmpty(node)).toBe(false);
    });

    it('should return false if the directory contains a non-empty subdirectory', () => {
        const node: LocalFileNode = {
            name: 'folder',
            type: 'directory',
            children: [
                {
                    name: 'subfolder',
                    type: 'directory',
                    children: [
                        {
                            name: 'file.txt',
                            type: 'file',
                            children: [],
                            syncStatus: SyncStatus.FullySynced
                        }
                    ],
                    syncStatus: SyncStatus.FullySynced
                }
            ],
            syncStatus: SyncStatus.FullySynced
        };
        expect(isFolderNodeEmpty(node)).toBe(false);
    });

    it('should return true if the directory and all its subdirectories are empty', () => {
        const node: LocalFileNode = {
            name: 'folder',
            type: 'directory',
            children: [
                {
                    name: 'subfolder',
                    type: 'directory',
                    children: [],
                    syncStatus: SyncStatus.FullySynced
                }
            ],
            syncStatus: SyncStatus.FullySynced
        };
        expect(isFolderNodeEmpty(node)).toBe(true);
    });

    it('should return true if the directory has no children', () => {
        const node: LocalFileNode = {
            name: 'folder',
            type: 'directory',
            children: [],
            syncStatus: SyncStatus.FullySynced
        };
        expect(isFolderNodeEmpty(node)).toBe(true);
    });
});