import { App, IconName, ItemView, WorkspaceLeaf, Notice } from "obsidian";
import { cloudDiskModel } from "../model/cloud-disk-model";
import { Root, createRoot } from "react-dom/client";
import FileBrowserManager from './file-browser-mng';
import { createLogger } from "src/util/logger";
import SyncVaultPlugin from "../../main";
import { i18n } from "../i18n";

const logger = createLogger('content-view');

export const CLOUD_DISK_VIEW = "cloud-disk-view";
const BYTES_PER_GB = 1024 * 1024 * 1024;

export class SyncVaultPluginView extends ItemView {
    app: App;
    root: Root | null = null;
    plugin: SyncVaultPlugin;

    constructor(leaf: WorkspaceLeaf, app: App, plugin: SyncVaultPlugin) {
        super(leaf);
        this.app = app;
        this.plugin = plugin;
    }

    getViewType(): string {
        return CLOUD_DISK_VIEW;
    }

    getDisplayText(): string {
        return i18n.t('plugin.view.cloudDisk');
    }

    getIcon(): IconName {
        return "blocks";
    }

    private async buildStatusBar(statusItem: HTMLElement) {
        await cloudDiskModel.getInfo().then((info) => {
            const freeVolume = Math.trunc(info.storage.used / BYTES_PER_GB);
            const totalVolume = Math.trunc(info.storage.total / BYTES_PER_GB);
            statusItem.append(statusItem.createDiv({ text: `${i18n.t('settingTab.cloudDisk.userName')}: ${info.user.user_name},` }));
            statusItem.append(statusItem.createDiv({ text: `${i18n.t('settingTab.cloudDisk.volume')}: ${freeVolume} GB/${totalVolume} GB` }));
        }, (rejectReason: any) => {
            statusItem.append(statusItem.createDiv({ text: i18n.t('settingTab.cloudDisk.getInfoFailed') }));
        });
    }

    protected async onOpen(): Promise<void> {
        logger.info('open view');
        await this.plugin.loadSettings();
        this.root = createRoot(this.containerEl.children[1]);

        // 检查 access_token 是否存在
        const accessToken = cloudDiskModel.accessToken;
        if (!accessToken) {
            // 显示未授权信息并引导用户去授权
            new Notice('Not authorized');
            this.containerEl.children[1].createDiv({
                text: 'Please authorize',
            })
        }

        this.root.render(
            <FileBrowserManager plugin={this.plugin} vault={this.app.vault} />
        );

        // 创建状态条容器
        const statusBarContainer = this.containerEl.createDiv({ cls: 'status-bar' });
        await this.buildStatusBar(statusBarContainer);

        // 将状态条容器添加到视图的右下方
        this.containerEl.appendChild(statusBarContainer);
    }

    protected async onClose(): Promise<void> {
        logger.info('close view');
        cloudDiskModel.reset();
        this.root?.unmount();
    }
}