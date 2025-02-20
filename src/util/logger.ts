import { DebugManager } from './debug-config';

export function createLogger(moduleName: string) {
    const debugManager = DebugManager.getInstance();

    return {
        log: (...args: any[]) => console.log(`[${moduleName}]`, ...args),
        error: (...args: any[]) => console.error(`[${moduleName}]`, ...args),
        warn: (...args: any[]) => console.warn(`[${moduleName}]`, ...args),
        info: (...args: any[]) => console.info(`[${moduleName}]`, ...args),
        debug: (...args: any[]) => {
            if (debugManager.isDebugEnabled(moduleName)) {
                console.log(`[${moduleName}]`, ...args);
            }
        },
    };
}