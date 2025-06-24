import 'obsidian';
import { DOMParser } from 'xmldom';

(global as any).DOMParser = DOMParser;

Object.assign(global, {
    window: {
        localStorage: {
            getItem: jest.fn().mockReturnValue('en'),
            setItem: jest.fn(),
            removeItem: jest.fn(),
            clear: jest.fn(),
            key: jest.fn(),
            length: 0
        }
    }
});

jest.mock('../../src/util', () => ({
    logger: {
        createLogger: jest.fn().mockReturnValue({
            debug: jest.fn(),
            info: jest.fn(),
            warn: jest.fn(),
            error: jest.fn()
        })
    },
    path: {
        join: jest.fn().mockImplementation((...args) => args.join('/')),
        relative: jest.fn().mockImplementation((from, to) => {
            // 简单实现：移除基础路径
            return to.replace(from + '/', '');
        }),
        dirname: jest.fn().mockImplementation((path) => {
            return path.substring(0, path.lastIndexOf('/'));
        }),
        basename: jest.fn().mockImplementation((path) => {
            return path.substring(path.lastIndexOf('/') + 1);
        }),
    },
    time: {
        msToSec: jest.fn().mockImplementation((ms) => Math.floor(ms / 1000)),
        secToMs: jest.fn().mockImplementation((sec) => sec * 1000)
    },
    ScheduleQueue: jest.fn().mockImplementation(() => ({
        enqueue: jest.fn().mockResolvedValue(undefined),
        clear: jest.fn(),
        pause: jest.fn(),
        resume: jest.fn()
    }))
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

console.error = jest.fn();
console.warn = jest.fn();

export { };