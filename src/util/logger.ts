import log, { LogLevelNames, LogLevelNumbers } from 'loglevel';
import { DebugManager } from './debug-config';

/**
 * 基于 loglevel 封装的成熟日志模块
 * 
 * 优势：
 * 1. 支持全局和模块级的日志等级控制
 * 2. 性能优于直接调用 console
 * 3. 插件禁用时可以一键关闭所有日志输出
 */
export function createLogger(moduleName: string) {
    const logger = log.getLogger(moduleName);
    const debugManager = DebugManager.getInstance();

    // 映射 DebugManager 配置到 loglevel 等级
    // 如果该模块开启了调试，则设为 DEBUG，否则默认为 INFO（显示 info, warn, error）
    if (debugManager.isDebugEnabled(moduleName)) {
        logger.setLevel('debug');
    } else {
        logger.setLevel('info');
    }

    // 自定义日志格式：添加模块名和时间戳
    const originalFactory = logger.methodFactory;
    logger.methodFactory = (methodName: LogLevelNames, logLevel: LogLevelNumbers, loggerName: string) => {
        const rawMethod = originalFactory(methodName, logLevel, loggerName);
        return (...args: unknown[]) => {
            const currentTime = new Date().toLocaleString();
            const prefix = `[${loggerName}][${currentTime}]`;
            rawMethod(prefix, ...args);
        };
    };

    // 必须重新调用 setLevel 使 methodFactory 生效
    logger.setLevel(logger.getLevel());

    return logger;
}