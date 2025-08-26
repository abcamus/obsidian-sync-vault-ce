import { TAbstractFile, TFile, TFolder, Vault } from "obsidian";
import { Service } from "../service";
import { cloudDiskModel } from "./cloud-disk-model";
import { LocalFileNode, getUploadFileListOfNode } from "./file-tree-node";
import { SyncStatus } from "./sync-status";
import { DownloadItem } from "./meta-info";
import * as util from "../util";

const logger = util.logger.createLogger('sync-action');

export async function uploadFileNode(
    node: TAbstractFile,
    currentNode: LocalFileNode,
    reportProgress: (done: number, total: number) => void
): Promise<boolean> {
    let currentProgress = 0;
    const itemPath = node.path;
    const remoteRoot = cloudDiskModel.remoteRootPath;

    if (node instanceof TFile) {
        reportProgress(currentProgress, 1);
        const totalCount = 1;
        const remoteFilePath = util.path.join(remoteRoot, itemPath);
        logger.info(`upload file to: ${remoteFilePath}`);
        const result = await Service.upload.uploadFile(node.path, remoteFilePath);
        if (result) {
            currentProgress += 1;
            reportProgress(currentProgress, totalCount);
            return true;
        }
        return false;
    } else if (node instanceof TFolder) {
        const uploadList = getUploadFileListOfNode(currentNode, itemPath);
        const totalCount = uploadList.length;
        reportProgress(currentProgress, totalCount);
        for (const item of uploadList) {
            const file = cloudDiskModel.vault.getFileByPath(item.path);
            if (!file) {
                logger.error(`file not found: ${item.path}`);
                continue;
            }
            const result = await Service.upload.uploadFile(file.path, util.path.join(remoteRoot, item.path));
            if (!result) {
                return false;
            } else {
                currentProgress += 1;
                reportProgress(currentProgress, totalCount);
            }
        }
        return true;
    }
    return false;
}

export async function downloadFileNodes(
    nodeList: DownloadItem[],
    vault: Vault,
    callback?: (completed: number, newNode: LocalFileNode | null, path: string, status: boolean) => void
): Promise<boolean> {
    let doneCount = 0;

    for (const item of nodeList) {
        try {
            let content = await Service.download.downloadFile(util.path.join(cloudDiskModel.remoteRootPath, item.path), item.node);
            if (!content) {
                logger.error(`download file ${item.path} failed, content is null`);
                doneCount += 1;
                callback?.(doneCount, null, item.path, false);
                continue;
            }
            const file = await cloudDiskModel.ensureFileExists(item.path);
            if (file && (file instanceof TFile)) {
                logger.info('Node info: ', {
                    name: item.node.name,
                    mtime: item.node.mtime,
                });
                await vault.modifyBinary(file, content, { mtime: item.node.mtime });
            }

            const newLocalNode = {
                name: item.node.name,
                type: item.node.type,
                md5: item.node.md5,
                size: item.node.size,
                mtime: new Date(item.node.mtime),
                syncStatus: SyncStatus.FullySynced,
            };
            doneCount += 1;
            callback?.(doneCount, newLocalNode, item.path, true);
        } catch (error) {
            logger.error(`download file ${item.path} failed, error: ${error}`);
            doneCount += 1;
            callback?.(doneCount, null, item.path, false);
        }
    }
    return true;
}
