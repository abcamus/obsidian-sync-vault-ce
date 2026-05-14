import { DebugManager } from './debug-config';

export function createLogger(moduleName: string) {
    const debugManager = DebugManager.getInstance();

    return {
        log: (...args: unknown[]) => console.log(`[${moduleName}]`, ...args),
        error: (...args: unknown[]) => console.error(`[${moduleName}]`, ...args),
        warn: (...args: unknown[]) => console.warn(`[${moduleName}]`, ...args),
        info: (...args: unknown[]) => console.info(`[${moduleName}]`, ...args),
        debug: (...args: unknown[]) => {
            if (debugManager.isDebugEnabled(moduleName)) {
                console.log(`[${moduleName}]`, ...args);
            }
        },
    };
}