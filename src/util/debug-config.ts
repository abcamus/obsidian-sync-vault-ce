interface DebugConfig {
    [key: string]: boolean;
}

export class DebugManager {
    private static instance: DebugManager;
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

        's3.service': true,
        'webdav.service': false,
    };

    private constructor() {
        this.loadConfig();
    }

    static getInstance(): DebugManager {
        if (!this.instance) {
            this.instance = new DebugManager();
        }
        return this.instance;
    }

    /* load configuration from localStorage */
    private loadConfig() {
        try {
            const savedConfig = localStorage.getItem('obsidian-cloud-disk-debug');
            this.config = savedConfig ?
                JSON.parse(savedConfig) :
                { ...this.DEFAULT_CONFIG };
        } catch (error) {
            console.error('load debug configuration failed:', error);
            this.config = { ...this.DEFAULT_CONFIG };
        }
    }

    /* 保存配置到localStorage */
    private saveConfig() {
        try {
            localStorage.setItem(
                'obsidian-cloud-disk-debug',
                JSON.stringify(this.config)
            );
        } catch (error) {
            console.error('保存调试配置失败:', error);
        }
    }

    isDebugEnabled(module: string): boolean {
        return !!this.config[module];
    }

    setDebugEnabled(module: string, enabled: boolean) {
        this.config[module] = enabled;
        this.saveConfig();
    }

    getAllConfig(): DebugConfig {
        return { ...this.config };
    }
}