import { SimpleQueue } from '../../src/util/queue/simple-queue';

describe('SimpleQueue', () => {
  let queue: SimpleQueue;

  beforeEach(() => {
    queue = new SimpleQueue();
  });

  test('should process tasks in order', async () => {
    const results: number[] = [];

    // 添加三个异步任务
    const task1 = queue.enqueue(async () => {
      await delay(30);
      results.push(1);
      return 1;
    });

    const task2 = queue.enqueue(async () => {
      await delay(20);
      results.push(2);
      return 2;
    });

    const task3 = queue.enqueue(async () => {
      await delay(10);
      results.push(3);
      return 3;
    });

    // 等待所有任务完成
    const values = await Promise.all([task1, task2, task3]);

    // 验证执行顺序
    expect(results).toEqual([1, 2, 3]);
    // 验证返回值
    expect(values).toEqual([1, 2, 3]);
  });

  test('should handle errors without breaking the queue', async () => {
    const results: string[] = [];

    // 添加一个会失败的任务
    const task1 = queue.enqueue(async () => {
      results.push('start 1');
      throw new Error('Task 1 failed');
    }).catch(err => {
      results.push('error 1');
      return err;
    });

    // 添加一个正常的任务
    const task2 = queue.enqueue(async () => {
      results.push('task 2');
      return 'success';
    });

    await Promise.all([task1, task2]);

    expect(results).toEqual(['start 1', 'error 1', 'task 2']);
  });

  test('should clear queue', async () => {
    queue.enqueue(async () => delay(100));
    queue.enqueue(async () => delay(100));
    queue.enqueue(async () => delay(100));
    
    expect(queue.size).toBe(2);
    queue.clear();
    expect(queue.isEmpty).toBe(true);
  });
});

// 辅助函数：延迟指定时间
function delay(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}
