import { App, Notice } from 'obsidian';
import { cloudDiskModel } from '../model/cloud-disk-model';

export class LogService {
    private static _instance: LogService;
    private app: App;
    private logFolderPath: string;
    private currentLogFile: string;

    private constructor(app: App, manifestDir: string) {
        this.app = app;
        this.logFolderPath = manifestDir + '/logs';
        this.currentLogFile = `error-log-${this.getDateString()}.md`;
    }

    static init(app: App, manifestDir: string): void {
        if (!LogService._instance) {
            LogService._instance = new LogService(app, manifestDir);
        }
    }

    static instance(): LogService {
        if (!LogService._instance) {
            throw new Error('LogService is not initialized');
        }
        return LogService._instance;
    }

    private getDateString(): string {
        const date = new Date();
        return date.toISOString().split('T')[0];
    }

    private getTimeString(): string {
        return new Date().toLocaleString();
    }

    private async ensureLogFile(): Promise<void> {
        if (!await this.app.vault.adapter.exists(this.logFolderPath)) {
            await this.app.vault.createFolder(this.logFolderPath);
        }

        const filePath = `${this.logFolderPath}/${this.currentLogFile}`;
        if (!await this.app.vault.adapter.exists(filePath)) {
            await this.app.vault.adapter.write(filePath, '');
        }
    }

    async logError(error: Error, context: string, details?: unknown): Promise<void> {
        if (!cloudDiskModel.logMode) {
            return;
        }

        const logEntry = this.formatLogEntry(error, context, details);
        const filePath = `${this.logFolderPath}/${this.currentLogFile}`;

        await this.ensureLogFile();

        try {
            let content = '';
            if (await this.app.vault.adapter.exists(filePath)) {
                content = await this.app.vault.adapter.read(filePath);
            }

            content = logEntry + '\n' + content;

            await this.app.vault.adapter.write(filePath, content);
        } catch (e) {
            console.error('Failed to write log:', e);
        }
    }

    async logInfo(message: string, context: string, details?: unknown): Promise<void> {
        if (!cloudDiskModel.logMode) {
            return;
        }

        const logEntry = this.formatInfoEntry(message, context, details);
        const filePath = `${this.logFolderPath}/${this.currentLogFile}`;

        await this.ensureLogFile();

        try {
            let content = '';
            if (await this.app.vault.adapter.exists(filePath)) {
                content = await this.app.vault.adapter.read(filePath);
            }

            content = logEntry + '\n' + content;

            await this.app.vault.adapter.write(filePath, content);
        } catch (e) {
            console.error('Failed to write log:', e);
        }
    }

    private formatInfoEntry(message: string, context: string, details?: unknown): string {
        return `## [${this.getTimeString()}] ℹ️ ${context}\n`
            + `### 信息\n`
            + `\`\`\`\n${message}\n\`\`\`\n`
            + (details ? `### 详细信息\n\`\`\`json\n${JSON.stringify(details, null, 2)}\n\`\`\`\n` : '')
            + `---\n`;
    }

    private formatLogEntry(error: Error, context: string, details?: unknown): string {
        return `## [${this.getTimeString()}] ❌ ${context}\n`
            + `### 错误信息\n`
            + `\`\`\`\n${error.message}\n\`\`\`\n`
            + `### 堆栈跟踪\n`
            + `\`\`\`\n${error.stack}\n\`\`\`\n`
            + (details ? `### 详细信息\n\`\`\`json\n${JSON.stringify(details, null, 2)}\n\`\`\`\n` : '')
            + `---\n`;
    }

    async openLogFile(): Promise<void> {
        const filePath = `${this.logFolderPath}/${this.currentLogFile}`;
        if (await this.app.vault.adapter.exists(filePath)) {
            const content = await this.app.vault.adapter.read(filePath);
        
            /* 在临时位置创建文件 */
            const date = new Date();
            const tempFileName = `temp-log-${date.toISOString().split('T')[0]}.md`;
            let tempFile = this.app.vault.getFileByPath(tempFileName);
            if (tempFile) {
                await this.app.fileManager.trashFile(tempFile);
            }
            tempFile = await this.app.vault.create(tempFileName, content);
            if (tempFile) {
                await this.app.workspace.getLeaf().openFile(tempFile);
            }
        } else {
            new Notice('当前无错误日志');
        }
    }
}