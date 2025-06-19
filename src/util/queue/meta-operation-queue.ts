import { CloudFileManagementService } from "src/service/cloud-disk-service";
import { CloudDiskType } from "../../service/cloud-interface";
import { createLogger } from "../logger";

const logger = createLogger('meta-op-queue');

type MetaOperation = {
    type: 'rename' | 'move' | 'copy' | 'delete' | 'mkdir';
    from: string;
    to?: string;
    newName?: string;
};

export class MetaOperationQueue {
    private queue: MetaOperation[] = [];
    private isProcessing: boolean = false;
    static queueObjs: { [key: string]: any } = {};
    private fileMngService: CloudFileManagementService;

    /* single instance */
    static getMetaOperationQueue(cloudDiskType: CloudDiskType, fileMngService: CloudFileManagementService): MetaOperationQueue {
        if (!MetaOperationQueue.queueObjs[cloudDiskType]) {
            const queue = new MetaOperationQueue();
            queue.fileMngService = fileMngService;
            MetaOperationQueue.queueObjs[cloudDiskType] = queue;
        }

        return MetaOperationQueue.queueObjs[cloudDiskType];
    }

    /* add operation to queue */
    public async addOperation(operation: MetaOperation): Promise<void> {
        this.queue.push(operation);
        logger.debug(`[MetaOperationQueue] Added operation: ${JSON.stringify(operation)}`);

        if (!this.isProcessing) {
            await this.processQueue();
        }
    }

    private async processQueue(): Promise<void> {
        if (this.isProcessing || this.queue.length === 0) {
            return;
        }

        this.isProcessing = true;
        logger.debug(`[MetaOperationQueue] Start processing queue, length: ${this.queue.length}`);

        try {
            while (this.queue.length > 0) {
                const operation = this.queue[0];
                await this.processOperation(operation);
                this.queue.shift(); // 移除已处理的操作
                await new Promise(resolve => setTimeout(resolve, 100));
            }
        } catch (error) {
            logger.error('[MetaOperationQueue] Error processing queue:', error);
            const failedOp = this.queue.shift();
            if (failedOp) {
                logger.debug(`[MetaOperationQueue] Removing failed operation: ${JSON.stringify(failedOp)}`);
            }
            throw error;
        } finally {
            this.isProcessing = false;
            logger.debug('[MetaOperationQueue] Queue processing completed');
        }
    }

    private async processOperation(operation: MetaOperation): Promise<void> {
        logger.debug(`[MetaOperationQueue] Processing operation: ${JSON.stringify(operation)}`);

        try {
            switch (operation.type) {
                case 'rename':
                    if (!operation.newName) {
                        throw new Error('New name is required for rename operation');
                    }
                    await this.fileMngService.renameFile(operation.from, operation.newName);
                    break;

                case 'move':
                    if (!operation.to) {
                        throw new Error('Destination path is required for move operation');
                    }
                    await this.fileMngService.moveFile(operation.from, operation.to);
                    break;

                case 'copy':
                    if (!operation.to) {
                        throw new Error('Destination path is required for copy operation');
                    }
                    await this.fileMngService.copyFile(operation.from, operation.to);
                    break;

                case 'delete':
                    await this.fileMngService.deleteFile(operation.from);
                    break;

                case 'mkdir':
                    await this.fileMngService.mkdir(operation.from);
                    break;

                default:
                    throw new Error(`Unknown operation type: ${(operation as any).type}`);
            }
        } catch (error) {
            logger.error(`[MetaOperationQueue] Operation failed:`, error);
            throw error;
        }
    }

    public get length(): number {
        return this.queue.length;
    }

    public clear(): void {
        this.queue = [];
        logger.debug('[MetaOperationQueue] Queue cleared');
    }
}