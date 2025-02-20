import { createLogger } from '../logger';

const logger = createLogger('smart-queue');

export enum TaskType {
    DOWNLOAD = 'download',      // doanload api
    LIST = 'list',             // list api
    GET_DOWNLOAD_URL = 'url',  // get_download_url api
    GET_BY_PATH = 'path',      // file_by_path api
    OTHER = 'other'            // other api
}

interface RateLimit {
    maxRequests: number;
    timeWindow: number;
    minInterval: number;
}

interface QueueItem {
    task: () => Promise<any>;
    resolve: (value: any) => void;
    reject: (error: any) => void;
    priority: number;
    retryCount: number;
    taskId: string;
    taskType: TaskType;
    addTime: number;
}

export class SmartQueue {
    private static instance: SmartQueue;
    private queues: Map<TaskType, QueueItem[]> = new Map();
    private requestTimes: Map<TaskType, number[]> = new Map();
    private isProcessing: Map<TaskType, boolean> = new Map();
    private running: Map<TaskType, number> = new Map();
    private isShuttingDown = false;
    private activePromises: Map<TaskType, Set<Promise<any>>> = new Map();
    private readonly SHUTDOWN_TIMEOUT = 30000; // 30s timeout

    /**
     * API limitations:
     * - 下载文件：每秒并发数不超过3
     * - list接口：每10秒不超过40次 (平均每秒4次)
     * - getDownloadUrl：每10秒不超过10次 (平均每秒1次)
     */
    private readonly rateLimits: Map<TaskType, RateLimit> = new Map([
        [TaskType.DOWNLOAD, {
            maxRequests: 3,
            timeWindow: 1000,    // 1秒
            minInterval: 334     // 1000/3 毫秒
        }],
        /* 阿里云盘list接口限制为40次/10秒，平均每秒4次，考虑到多设备并发，除以2，支持2台设备间无错误访问 */
        [TaskType.LIST, {
            maxRequests: 20,
            timeWindow: 10000,   // 10秒
            minInterval: 500     // 10000/20 毫秒
        }],
        [TaskType.GET_DOWNLOAD_URL, {
            maxRequests: 10,
            timeWindow: 10000,   // 10秒
            minInterval: 1000    // 10000/10 毫秒
        }],
        [TaskType.GET_BY_PATH, {
            maxRequests: 10,
            timeWindow: 10000,   // 10秒
            minInterval: 1000     // 1000毫秒
        }],
        [TaskType.OTHER, {
            maxRequests: 5,
            timeWindow: 1000,   // 1秒
            minInterval: 200     // 1000/5 毫秒
        }]
    ]);

    private constructor() {
        Object.values(TaskType).forEach(type => {
            this.queues.set(type, []);
            this.requestTimes.set(type, []);
            this.isProcessing.set(type, false);
            this.running.set(type, 0);
            this.activePromises.set(type, new Set());
        });
    }

    static getInstance(): SmartQueue {
        if (!this.instance) {
            this.instance = new SmartQueue();
        }
        return this.instance;
    }

    private getRateLimit(taskType: TaskType): RateLimit {
        const limit = this.rateLimits.get(taskType);
        if (!limit) {
            logger.warn(`Rate control for task: ${taskType} not found，use default`);
            return this.rateLimits.get(TaskType.OTHER)!;
        }
        return limit;
    }

    async shutdown(): Promise<void> {
        this.isShuttingDown = true;
        logger.info('shutting down smart queue...');

        try {
            // collect current active tasks info
            const activeTaskCounts = Array.from(this.activePromises.entries())
                .map(([type, promises]) => `${type}: ${promises.size}`)
                .join(', ');
            logger.info(`active task info: ${activeTaskCounts}`);

            const shutdownPromises = Array.from(this.activePromises.entries()).map(
                async ([type, promises]) => {
                    if (promises.size === 0) return;

                    logger.info(`wait for type: ${type}, number: ${promises.size} to complete`);
                    try {
                        await Promise.race([
                            Promise.all(Array.from(promises)),
                            new Promise((_, reject) => {
                                setTimeout(() => {
                                    reject(new Error(`${type} tasks shutdown timeout`));
                                }, this.SHUTDOWN_TIMEOUT);
                            })
                        ]);
                    } catch (error) {
                        logger.error(`${type} error shuting down:`, error);
                    }
                }
            );

            // wait for all tasks to be done.
            await Promise.all(shutdownPromises);

        } catch (error) {
            logger.error('error shutting down:', error);
        } finally {
            // cleanup
            this.cleanupQueues();
            logger.info('task queue closed');
        }
    }

    private cleanupQueues() {
        Object.values(TaskType).forEach(type => {
            // 清理队列
            this.queues.get(type)!.length = 0;
            this.requestTimes.get(type)!.length = 0;
            this.isProcessing.set(type, false);
            this.running.set(type, 0);
            this.activePromises.get(type)!.clear();
        });
    }

    async enqueue<T>(
        task: () => Promise<T>,
        taskId: string,
        taskType: TaskType,
        priority: number = 0
    ): Promise<T> {
        if (this.isShuttingDown) {
            throw new Error('Queue is shutting down');
        }

        const promise = new Promise<T>((resolve, reject) => {
            this.queues.get(taskType)!.push({
                task,
                resolve,
                reject,
                priority,
                taskId,
                taskType,
                retryCount: 0,
                addTime: Date.now()
            });
        });

        // 记录活动的 Promise
        this.activePromises.get(taskType)!.add(promise);
        promise.finally(() => {
            this.activePromises.get(taskType)!.delete(promise);
        });

        if (!this.isProcessing.get(taskType)) {
            this.startQueueProcessor(taskType);
        }

        return promise;
    }

    private async startQueueProcessor(taskType: TaskType) {
        if (this.isProcessing.get(taskType)) return;
        this.isProcessing.set(taskType, true);

        while (true) {
            const item = this.getNextTask(taskType);
            if (!item) {
                if (this.queues.get(taskType)!.length === 0) {
                    this.isProcessing.set(taskType, false);
                    break;
                }
                await this.wait(1000);
                continue;
            }

            this.running.set(taskType, this.running.get(taskType)! + 1);

            try {
                await this.waitForRequestSlot(taskType, item.taskId);
                this.recordRequest(taskType);

                const result = await item.task();
                item.resolve(result);
            } catch (error: any) {
                await this.handleError(item, error);
            } finally {
                this.running.set(taskType, this.running.get(taskType)! - 1);
            }
        }
    }

    private async waitForRequestSlot(taskType: TaskType, taskId: string): Promise<void> {
        const limit = this.rateLimits.get(taskType)!;
        const times = this.requestTimes.get(taskType)!;

        while (true) {
            const now = Date.now();
            // 清理过期的请求记录
            const validTimes = times.filter(time => now - time < limit.timeWindow);
            this.requestTimes.set(taskType, validTimes);

            if (validTimes.length < limit.maxRequests) {
                const lastRequest = validTimes[validTimes.length - 1];
                if (lastRequest && now - lastRequest < limit.minInterval) {
                    logger.debug(`[waitForRequestSlot] taskType: ${taskType}, id: ${taskId}, wait for minInterval: ${limit.minInterval - (now - lastRequest)}ms, minInterval: ${limit.minInterval}ms`);
                    await this.wait(limit.minInterval - (now - lastRequest));
                }
                return;
            }

            const oldestRequest = validTimes[0];
            const waitTime = limit.timeWindow - (now - oldestRequest);
            logger.debug(`[waitForRequestSlot] taskType: ${taskType}, id: ${taskId}, wait for timeWindow: ${waitTime}ms, window: ${limit.timeWindow}ms`);
            await this.wait(Math.max(waitTime, limit.minInterval));
        }
    }

    private recordRequest(taskType: TaskType) {
        const times = this.requestTimes.get(taskType)!;
        times.push(Date.now());
    }

    private getNextTask(taskType: TaskType): QueueItem | null {
        const queue = this.queues.get(taskType)!;
        const limit = this.getRateLimit(taskType);

        if (this.running.get(taskType)! >= limit.maxRequests) {
            return null;
        }

        queue.sort((a, b) => b.priority - a.priority || a.addTime - b.addTime);
        return queue.shift() || null;
    }

    private async handleError(item: QueueItem, error: any) {
        if (error?.message?.includes('403')) {
            logger.info(`task: ${item.taskId} 403, retry: ${item.retryCount}, message: ${error.message}`);
            if (item.retryCount < 5) {
                item.retryCount++;
                item.priority++;
                // 延迟后重新加入队列
                setTimeout(() => {
                    this.queues.get(item.taskType)!.push(item);
                    if (!this.isProcessing.get(item.taskType)) {
                        this.startQueueProcessor(item.taskType);
                    }
                }, 5000);
            } else {
                item.reject(error);
            }
        } else {
            item.reject(error);
        }
    }

    private wait(ms: number): Promise<void> {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    private getCurrentQPS(): number {
        const now = Date.now();
        return this.requestTimes.get(TaskType.DOWNLOAD)!.filter(
            time => now - time < 1000
        ).length;
    }

    // 获取队列状态
    getQueueStats() {
        const stats: Record<string, any> = {};
        Object.values(TaskType).forEach(type => {
            stats[type] = {
                queueLength: this.queues.get(type)!.length,
                running: this.running.get(type),
                activePromises: this.activePromises.get(type)!.size,
                isProcessing: this.isProcessing.get(type)
            };
        });
        return stats;
    }
}