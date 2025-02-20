type SimpleQueueTask<T> = () => Promise<T>;

export class SimpleQueue {
  private queue: SimpleQueueTask<any>[] = [];
  private isProcessing = false;

  /**
   * add tasks to queue
   * @param task the task to be added
   * @returns Promise，resolve when task is done
   */
  enqueue<T>(task: SimpleQueueTask<T>): Promise<T> {
    return new Promise((resolve, reject) => {
      this.queue.push(async () => {
        try {
          const result = await task();
          resolve(result);
        } catch (error) {
          reject(error);
        }
      });

      this.processQueue();
    });
  }

  private async processQueue() {
    if (this.isProcessing || this.queue.length === 0) {
      return;
    }

    this.isProcessing = true;

    while (this.queue.length > 0) {
      const task = this.queue.shift();
      if (task) {
        try {
          await task();
        } catch (error) {
          console.error('Task execution failed:', error);
        }
      }
    }

    this.isProcessing = false;
  }

  clear() {
    this.queue = [];
  }

  get size(): number {
    return this.queue.length;
  }

  get isEmpty(): boolean {
    return this.queue.length === 0;
  }

  waitUntilEmpty(): Promise<void> {
    return new Promise((resolve) => {
      const interval = setInterval(() => {
        if (this.isEmpty) {
          clearInterval(interval);
          resolve();
        }
      }, 100);
    });
  }
}
