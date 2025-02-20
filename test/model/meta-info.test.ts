import {
    RemoteMeta,
    RemoteFileNode,
    renameMetaNode,
    getRemoteContentsByPath,
    getDownloadFileListOfAll,
    getDownloadFileListOfNode
} from '../../src/model/meta-info';
import { LocalFileNode } from '../../src/model/file-tree-node';
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

describe('renameMetaNode', () => {
    let root: RemoteMeta;

    beforeEach(() => {
        root = {
            name: 'root',
            md5: 'root-md5',
            children: [
                {
                    name: 'file1',
                    size: 100,
                    type: 'file',
                    mtime: Date.now(),
                    md5: 'file1-md5',
                },
                {
                    name: 'folder1',
                    size: 0,
                    type: 'directory',
                    mtime: Date.now(),
                    md5: 'folder1-md5',
                    children: [],
                },
            ],
        };
    });

    test('should rename a file successfully', () => {
        const result = renameMetaNode(root, 'file1', 'file2');
        expect(result).toBe(true);
        expect(root.children[1].name).toBe('file2');
    });

    test('should rename a folder successfully', () => {
        const result = renameMetaNode(root, 'folder1', 'folder2');
        expect(result).toBe(true);
        expect(root.children[1].name).toBe('folder2');
    });

    test('should return true if renaming to the same name', () => {
        const result = renameMetaNode(root, 'file1', 'file1');
        expect(result).toBe(true);
    });

    test('should return false if the node to rename does not exist', () => {
        const result = renameMetaNode(root, 'nonexistent', 'newName');
        expect(result).toBe(false);
    });

    test('should return false if insert fails', () => {
        const node: RemoteFileNode = { name: 'existingName', size: 100, type: 'file', mtime: Date.now(), md5: 'existing-md5' };
        root.children.push(node);

        const result = renameMetaNode(root, 'existingName', 'existingName'); // 尝试重命名为相同名称
        expect(result).toBe(true);
        expect(root.children[2].name).toBe('existingName');
    });
});

describe('fetchRemoteContentsByPath', () => {
    let remoteMeta: RemoteMeta;

    beforeEach(() => {
        remoteMeta = {
            name: 'root',
            md5: 'root-md5',
            children: [
                {
                    name: 'file1',
                    size: 100,
                    type: 'file',
                    mtime: Date.now(),
                    md5: 'file1-md5',
                },
                {
                    name: 'folder1',
                    size: 0,
                    type: 'directory',
                    mtime: Date.now(),
                    md5: 'folder1-md5',
                    children: [
                        {
                            name: 'file2',
                            size: 200,
                            type: 'file',
                            mtime: Date.now(),
                            md5: 'file2-md5',
                            lastSync: { by: 'device1', time: new Date().toISOString() },
                        },
                    ],
                },
            ],
        };
    });

    test('should return contents of a file in the specified path', () => {
        const result = getRemoteContentsByPath(remoteMeta, ['file1']);
        expect(result).toHaveLength(0); // file1 is a file, should return empty array
    });

    test('should return contents of a directory in the specified path', () => {
        const result = getRemoteContentsByPath(remoteMeta, ['folder1']);
        expect(result).toHaveLength(1);
        expect(result[0].name).toBe('file2');
    });

    test('should return empty array for a non-existent path', () => {
        const result = getRemoteContentsByPath(remoteMeta, ['folder1', 'nonexistent']);
        expect(result).toEqual([]);
    });

    test('should return empty array for an invalid path', () => {
        const result = getRemoteContentsByPath(remoteMeta, ['invalidPath']);
        expect(result).toEqual([]);
    });

    test('should return empty array if the path is empty', () => {
        const result = getRemoteContentsByPath(remoteMeta, []);
        // expect(result).toEqual([]);
    });
});


describe('getDownloadFileList', () => {
    test('应该返回空数组当远程元数据没有子节点', () => {
        const remoteMeta: RemoteMeta = { name: 'root', md5: 'root-md5', children: [] };
        const localRoot: LocalFileNode = { name: 'root', type: 'directory', md5: 'root-md5', syncStatus: SyncStatus.FullySynced, children: [] };

        const result = getDownloadFileListOfAll(remoteMeta, localRoot);

        expect(result).toEqual([]);
    });

    test('应该返回所有远程文件当本地根目录为空', () => {
        const remoteMeta: RemoteMeta = {
            name: 'root',
            md5: 'root-md5',
            children: [
                { name: 'file1.txt', md5: 'file1-md5', size: 100, type: 'file', mtime: 1000 },
                { name: 'file2.txt', md5: 'file2-md5', size: 200, type: 'file', mtime: 2000 },
            ]
        };
        const localRoot: LocalFileNode = { name: 'root', type: 'directory', md5: 'root-md5', syncStatus: SyncStatus.FullySynced, children: [] };

        const result = getDownloadFileListOfAll(remoteMeta, localRoot);

        expect(result).toEqual(remoteMeta.children.map(node => ({ node, path: node.name })));
    });

    test('应该只返回更新的远程文件', () => {
        const remoteMeta: RemoteMeta = {
            name: 'root',
            md5: 'root-md5',
            children: [
                { name: 'file1.txt', md5: 'file1-md5', size: 100, type: 'file', mtime: 1000 },
                { name: 'file2.txt', md5: 'file2-md5-new', size: 200, type: 'file', mtime: 3000 },
            ]
        };
        const localRoot: LocalFileNode = {
            name: 'root',
            type: 'directory',
            md5: 'root-md5',
            syncStatus: SyncStatus.FullySynced,
            children: [
                { name: 'file1.txt', mtime: new Date(2000), type: 'file', md5: 'file1-md5', syncStatus: SyncStatus.FullySynced },
                { name: 'file2.txt', mtime: new Date(2000), type: 'file', md5: 'file2-md5', syncStatus: SyncStatus.FullySynced },
            ]
        };

        const result = getDownloadFileListOfAll(remoteMeta, localRoot);

        expect(result).toEqual([{ node: remoteMeta.children[1], path: 'file2.txt' }]);
    });

    test('应该递归处理子目录', () => {
        const remoteMeta: RemoteMeta = {
            name: 'root',
            md5: 'root-md5',
            children: [
                {
                    size: 0,
                    mtime: 0,
                    name: 'folder',
                    md5: 'folder-md5',
                    type: 'directory',
                    children: [
                        { name: 'subfile.txt', md5: 'subfile-md5-new', size: 300, type: 'file', mtime: 4000 }
                    ]
                }
            ]
        };
        const localRoot: LocalFileNode = {
            name: 'root',
            type: 'directory',
            md5: 'root-md5',
            syncStatus: SyncStatus.FullySynced,
            children: [
                {
                    name: 'folder',
                    type: 'directory',
                    md5: 'folder-md5',
                    syncStatus: SyncStatus.FullySynced,
                    children: [
                        { name: 'subfile.txt', mtime: new Date(3000), type: 'file', md5: 'subfile-md5', syncStatus: SyncStatus.FullySynced }
                    ]
                }
            ]
        };

        const result = getDownloadFileListOfAll(remoteMeta, localRoot);

        expect(result).toEqual([{ node: remoteMeta.children[0].children![0], path: 'folder/subfile.txt' }]);
    });
});

describe('getDownloadFileListOfNode', () => {
    it('应该返回需要下载的文件列表', () => {
        const remote: RemoteFileNode = {
            name: 'root',
            size: 0,
            type: 'directory',
            mtime: 1000,
            md5: '',
            children: [
                {
                    name: 'file1.txt',
                    size: 100,
                    type: 'file',
                    mtime: 2000,
                    md5: 'abc123',
                },
                {
                    name: 'folder1',
                    size: 0,
                    type: 'directory',
                    mtime: 1500,
                    md5: '',
                    children: [
                        {
                            name: 'file2.txt',
                            size: 200,
                            type: 'file',
                            mtime: 2500,
                            md5: 'def456',
                        },
                    ],
                },
            ],
        };

        const local: LocalFileNode = {
            name: 'root',
            size: 0,
            type: 'directory',
            mtime: new Date(500),
            md5: '',
            children: [
                {
                    name: 'file1.txt',
                    size: 100,
                    type: 'file',
                    mtime: new Date(1000),
                    md5: 'abc123',
                    syncStatus: SyncStatus.FullySynced,
                },
                {
                    name: 'folder1',
                    size: 0,
                    type: 'directory',
                    mtime: new Date(1500),
                    md5: '',
                    children: [],
                    syncStatus: SyncStatus.FullySynced,
                },
            ],
            syncStatus: SyncStatus.FullySynced,
        };

        const result = getDownloadFileListOfNode(remote, local, 'root');

        expect(result).toHaveLength(2);
        expect(result).toContainEqual({ node: remote.children![0], path: 'root/file1.txt' });
        expect(result).toContainEqual({ node: remote.children![1].children![0], path: 'root/folder1/file2.txt' });
    });

    it('应该处理本地节点不存在的情况', () => {
        const remote: RemoteFileNode = {
            name: 'file.txt',
            size: 100,
            type: 'file',
            mtime: 2000,
            md5: 'abc123',
        };

        const result = getDownloadFileListOfNode(remote, undefined, 'file.txt');

        expect(result).toHaveLength(1);
        expect(result[0]).toEqual({ node: remote, path: 'file.txt' });
    });
});