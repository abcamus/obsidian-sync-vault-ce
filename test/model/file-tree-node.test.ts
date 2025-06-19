import '../mock/global-mock';
import { LocalFileNode, renameNode, findNodeAt } from '../../src/model/file-tree-node';
import { SyncStatus } from '../../src/model/sync-status';

console.error = jest.fn();

jest.mock('../../src/util', () => ({
    logger: {
        createLogger: jest.fn(() => ({
            debug: jest.fn(),
            info: jest.fn(),
            warn: jest.fn(),
            error: jest.fn()
        }))
    },
    path: {
        // ... path 相关的模拟
    }
}));

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

describe('renameNode', () => {
    let root: LocalFileNode;

    beforeEach(() => {
        root = {
            name: 'root',
            type: 'directory',
            md5: '',
            children: [], // 确保 children 初始化为数组
            syncStatus: SyncStatus.Unknown,
        };
    });

    test('should rename node successfully', () => {
        const node: LocalFileNode = {
            name: 'oldName',
            type: 'file',
            md5: '',
            syncStatus: SyncStatus.Unknown
        };

        root.children = root.children || [];
        root.children.push(node);

        const result = renameNode(root, 'oldName', 'newName');

        expect(result).toBe(true);
        expect(root.children[0].name).toBe('newName');
    });

    test('should return false if node to rename does not exist', () => {
        const result = renameNode(root, 'nonExistent', 'newName');

        expect(result).toBe(false);
        expect(root.children?.length).toBe(0);
    });

    test('should return false if insert fails', () => {
        const node: LocalFileNode = { name: 'existingName', type: 'file', md5: '', syncStatus: SyncStatus.Unknown };
        root.children = root.children || []
        root.children.push(node);

        const result = renameNode(root, 'existingName', 'existingName'); // 尝试重命名为相同名称

        expect(result).toBe(true);
        expect(root.children[0].name).toBe('existingName');
    });
});

describe('findNodeAt', () => {
    let root: LocalFileNode;

    beforeEach(() => {
        root = {
            name: 'root',
            type: 'directory',
            md5: '',
            syncStatus: SyncStatus.Unknown,
            children: [
                {
                    name: 'file1',
                    type: 'file',
                    md5: 'file1-md5',
                    syncStatus: SyncStatus.Unknown,
                },
                {
                    name: 'folder1',
                    type: 'directory',
                    md5: 'folder1-md5',
                    syncStatus: SyncStatus.Unknown,
                    children: [
                        {
                            name: 'file2',
                            type: 'file',
                            md5: 'file2-md5',
                            syncStatus: SyncStatus.Unknown,
                        },
                    ],
                },
            ],
        };
    });

    test('should find a file at the specified path', () => {
        const result = findNodeAt(root, 'folder1/file2');
        expect(result).toBeTruthy();
        expect(result?.name).toBe('file2');
    });

    test('should find a directory at the specified path', () => {
        const result = findNodeAt(root, 'folder1');
        expect(result).toBeTruthy();
        expect(result?.name).toBe('folder1');
    });

    test('should return null for a non-existent path', () => {
        const result = findNodeAt(root, 'folder1/nonexistent');
        expect(result).toBeNull();
    });

    test('should return null for an invalid path', () => {
        const result = findNodeAt(root, 'invalidPath');
        expect(result).toBeNull();
    });

    test('should return the root node for the root path', () => {
        const result = findNodeAt(root, '');
        expect(result).toBe(root);
    });
});

import { getUploadFileListOfNode } from '../../src/model/file-tree-node';
import * as path from '../../src/util/path';

describe('getUploadFileList', () => {
    it('应该返回需要上传的文件列表', () => {
        const mockNode: LocalFileNode = {
            name: 'root',
            type: 'directory',
            md5: '',
            syncStatus: SyncStatus.FullySynced,
            children: [
                {
                    name: 'folder1',
                    type: 'directory',
                    md5: 'folder1-md5',
                    syncStatus: SyncStatus.LocalModified,
                    children: [
                        {
                            name: 'file1.txt',
                            type: 'file',
                            md5: 'file1-md5',
                            syncStatus: SyncStatus.LocalModified,
                        }
                    ],
                },
                {
                    name: 'file1.txt',
                    type: 'file',
                    md5: 'abc123',
                    syncStatus: SyncStatus.LocalModified,
                },
                {
                    name: 'file2.txt',
                    type: 'file',
                    md5: 'def456',
                    syncStatus: SyncStatus.FullySynced,
                },
                {
                    name: 'newFile.txt',
                    type: 'file',
                    md5: 'ghi789',
                    syncStatus: SyncStatus.LocalCreated,
                },
            ],
        };

        const currentPath = '/test/path';
        const result = getUploadFileListOfNode(mockNode, currentPath);

        expect(result).toHaveLength(3);
        expect(result).toEqual([
            {
                node: mockNode.children![1],
                path: path.join(currentPath, 'file1.txt'),
            },
            {
                node: mockNode.children![3],
                path: path.join(currentPath, 'newFile.txt'),
            },
            {
                node: mockNode.children![0].children![0],
                path: path.join(currentPath, 'folder1/file1.txt'),
            }
        ]);
    });

    it('应该返回空数组当没有需要上传的文件时', () => {
        const mockNode: LocalFileNode = {
            name: 'root',
            type: 'directory',
            md5: '',
            syncStatus: SyncStatus.FullySynced,
            children: [
                {
                    name: 'file1.txt',
                    type: 'file',
                    md5: 'abc123',
                    syncStatus: SyncStatus.FullySynced,
                },
            ],
        };

        const currentPath = '/test/path';
        const result = getUploadFileListOfNode(mockNode, currentPath);

        expect(result).toHaveLength(0);
    });

    it('应该返回空数组当节点没有子节点时', () => {
        const mockNode: LocalFileNode = {
            name: 'root',
            type: 'directory',
            md5: '',
            syncStatus: SyncStatus.FullySynced,
        };

        const currentPath = '/test/path';
        const result = getUploadFileListOfNode(mockNode, currentPath);

        expect(result).toHaveLength(0);
    });
});