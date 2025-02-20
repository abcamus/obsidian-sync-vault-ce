import { checkLocalFileNodeSyncStatus } from '../../src/model/file-tree-node';
import { SyncStatus } from '../../src/model/sync-status';
import { LocalFileNode } from '../../src/model/file-tree-node';
import { FileEntry } from '../../src/service/cloud-interface';

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

describe('checkLocalFileNodeSyncStatus', () => {
    const baseTime = new Date('2024-01-01T00:00:00Z').getTime();
    
    test('should return FullySynced when md5 matches', () => {
        const localNode: LocalFileNode = {
            name: 'test.md',
            type: 'file',
            md5: '123abc',
            mtime: new Date(baseTime),
            syncStatus: SyncStatus.Unknown
        };

        const remoteNode: FileEntry = {
            path: 'test.md',
            md5: '123abc',
            mtime: baseTime / 1000,
            size: 100,
            isdir: false,
            fsid: 1,
            ctime: 0,
        };

        expect(checkLocalFileNodeSyncStatus(localNode, remoteNode))
            .toBe(SyncStatus.FullySynced);
    });

    test('should return LocalCreated when remote node does not exist', () => {
        const localNode: LocalFileNode = {
            name: 'test.md',
            type: 'file',
            md5: '123abc',
            mtime: new Date(baseTime),
            syncStatus: SyncStatus.Unknown
        };

        expect(checkLocalFileNodeSyncStatus(localNode, null))
            .toBe(SyncStatus.LocalCreated);
    });

    test('should return LocalModified when local mtime is newer', () => {
        const localNode: LocalFileNode = {
            name: 'test.md',
            type: 'file',
            md5: '123abc',
            mtime: new Date(baseTime + 1000), // 1 second later
            syncStatus: SyncStatus.Unknown
        };

        const remoteNode: FileEntry = {
            path: 'test.md',
            md5: 'xyz789',
            mtime: baseTime / 1000,
            size: 100,
            isdir: false,
            fsid: 1,
            ctime: 0,
        };

        expect(checkLocalFileNodeSyncStatus(localNode, remoteNode))
            .toBe(SyncStatus.LocalModified);
    });

    test('should return RemoteModified when remote mtime is newer', () => {
        const localNode: LocalFileNode = {
            name: 'test.md',
            type: 'file',
            md5: '123abc',
            mtime: new Date(baseTime),
            syncStatus: SyncStatus.Unknown
        };

        const remoteNode: FileEntry = {
            path: 'test.md',
            md5: 'xyz789',
            mtime: baseTime / 1000 + 1, // 1 second later
            size: 100,
            isdir: false,
            fsid: 1,
            ctime: 0,
        };

        expect(checkLocalFileNodeSyncStatus(localNode, remoteNode))
            .toBe(SyncStatus.RemoteModified);
    });

    test('should handle undefined mtimes correctly', () => {
        const localNode: LocalFileNode = {
            name: 'test.md',
            type: 'file',
            md5: '123abc',
            syncStatus: SyncStatus.Unknown
        };

        const remoteNode: FileEntry = {
            path: 'test.md',
            md5: 'xyz789',
            mtime: baseTime / 1000 + 1, // 1 second later
            size: 100,
            isdir: false,
            fsid: 1,
            ctime: 0,
        };

        expect(checkLocalFileNodeSyncStatus(localNode, remoteNode))
            .toBe(SyncStatus.RemoteModified);
    });

    test('should handle millisecond precision in mtime comparison', () => {
        const localNode: LocalFileNode = {
            name: 'test.md',
            type: 'file',
            md5: '123abc',
            mtime: new Date(baseTime + 500), // add 500ms
            syncStatus: SyncStatus.Unknown
        };

        const remoteNode: FileEntry = {
            path: 'test.md',
            md5: 'xyz789',
            mtime: baseTime / 1000, // seconds precision
            size: 100,
            isdir: false,
            fsid: 1,
            ctime: 0,
        };

        // 应该比较秒级时间戳
        expect(checkLocalFileNodeSyncStatus(localNode, remoteNode))
            .toBe(SyncStatus.FullySynced);
    });

    test('should handle edge cases with very close mtimes', () => {
        const localNode: LocalFileNode = {
            name: 'test.md',
            type: 'file',
            md5: '123abc',
            mtime: new Date(baseTime + 999), // just under 1 second
            syncStatus: SyncStatus.Unknown
        };

        const remoteNode: FileEntry = {
            path: 'test.md',
            md5: 'xyz789',
            mtime: baseTime / 1000,
            size: 100,
            isdir: false,
            fsid: 1,
            ctime: 0,
        };

        // 不到1秒的差异应该被视为相同时间
        expect(checkLocalFileNodeSyncStatus(localNode, remoteNode))
            .toBe(SyncStatus.FullySynced);
    });
});