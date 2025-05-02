import { cloudDiskModel } from "../model/cloud-disk-model";
import { LocalFileNode } from "../model/file-tree-node";

export function shouldIgnore(filePath: string, nodeInfo?: LocalFileNode): boolean {
    const normalizedPath = filePath.replace(/\\/g, '/');
    if (cloudDiskModel.ignorePattern && new RegExp(cloudDiskModel.ignorePattern).test(normalizedPath)) {
        return true;
    }

    if (nodeInfo?.size && shouldSkipLargeFile(nodeInfo.size)) {
        return true;
    }

    const tfile = cloudDiskModel.vault.getFileByPath(filePath);
    if (tfile && shouldSkipLargeFile(tfile.stat.size)) {
        return true;
    }

    /* NOTE: 过滤隐藏文件 */
    return normalizedPath.split('/').some(path => path.startsWith('.'));
}

// size: bytes
function shouldSkipLargeFile(size: number): boolean {
    return size > cloudDiskModel.fileSizeLimit * 1024 * 1024;
}