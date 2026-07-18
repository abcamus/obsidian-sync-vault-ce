import type { App } from 'obsidian';

interface DebugConfig {
    [key: string]: boolean;
}

export class DebugManager {
    private static instance: DebugManager;
    private static readonly STORAGE_KEY = 'obsidian-cloud-disk-debug';

    private app?: App;
    private config: DebugConfig = {};

    /* default debug configuration */
    private readonly DEFAULT_CONFIG: DebugConfig = {
        'smart-queue': false,
        'cloud-disk-model': false,
        'content-view': false,
        'local-file-browser': false,
        'metaop-queue': false,
        'auth': false,

        'setting-tab': false,
        'file-tree': false,
        'snapshot': false,
        'service.info': false,

        'aliyun.info': false,
        'aliyun.upload': false,
        'aliyun.file-mng': false,
        'aliyun.download': false,

        's3.service': false,
        'webdav.service': false,

        'cos-client': false,
    };

    private constructor(app?: App) {
        this.app = app;
        this.loadConfig();
    }

    static getInstance(app?: App): DebugManager {
        if (!this.instance) {
            this.instance = new DebugManager(app);
            return this.instance;
        }

        if (app) {
            this.instance.setApp(app);
        }

        return this.instance;
    }

    setApp(app: App): void {
        this.app = app;
        this.loadConfig();
    }

    private getObsidianApp(): App | undefined {
        if (this.app) {
            return this.app;
        }

        const w = window as unknown as { app?: App };
        return w.app;
    }

    private parseSavedConfig(saved: unknown): DebugConfig {
        const next: DebugConfig = { ...this.DEFAULT_CONFIG };

        if (!saved) {
            return next;
        }

        let obj: unknown = saved;
        if (typeof saved === 'string') {
            try {
                obj = JSON.parse(saved) as unknown;
            } catch {
                return next;
            }
        }

        if (!obj || typeof obj !== 'object') {
            return next;
        }

        Object.entries(obj).forEach(([key, value]) => {
            if (typeof value === 'boolean') {
                next[key] = value;
            }
        });

        return next;
    }

    private loadConfig(): void {
        try {
            const app = this.getObsidianApp() as unknown as {
                loadLocalStorage?: (key: string) => unknown;
            } | undefined;

            const saved = app?.loadLocalStorage?.(DebugManager.STORAGE_KEY);
            this.config = this.parseSavedConfig(saved);
        } catch (error) {
            console.error('load debug configuration failed:', error);
            this.config = { ...this.DEFAULT_CONFIG };
        }
    }

    private saveConfig(): void {
        try {
            const app = this.getObsidianApp() as unknown as {
                saveLocalStorage?: (key: string, data: unknown) => void;
            } | undefined;

            app?.saveLocalStorage?.(DebugManager.STORAGE_KEY, this.config);
        } catch (error) {
            console.error('保存调试配置失败:', error);
        }
    }

    isDebugEnabled(module: string): boolean {
        return !!this.config[module];
    }

    setDebugEnabled(module: string, enabled: boolean): void {
        this.config[module] = enabled;
        this.saveConfig();
    }

    getAllConfig(): DebugConfig {
        return { ...this.config };
    }
}