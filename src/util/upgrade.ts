import { requestUrl, Notice, Vault } from 'obsidian';
import * as util from '../util';
import { i18n } from '../i18n';

export type ReleaseInfo = GiteeRelease;

const logger = util.logger.createLogger('upgrade');

const owner = 'abcamus';
const repo = 'obsidian-sync-vault-release';

interface GiteeRelease {
    tag_name: string;
    created_at: string;
    assets: Array<{
        name: string;
        browser_download_url: string;
    }>;
}

export async function checkVersion(currentVersion: string): Promise<{ hasUpdate: boolean, releaseInfo: GiteeRelease | null }> {
    try {
        const owner = 'abcamus';
        const repo = 'obsidian-sync-vault-release';

        const response = await requestUrl({
            url: `https://gitee.com/api/v5/repos/${owner}/${repo}/releases/latest`,
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
            },
        });

        if (response.status !== 200) {
            throw new Error('Failed to fetch release info');
        }

        logger.debug(response.json);
        const releaseInfo: GiteeRelease = response.json;

        /* 移除版本号前的 'v' 前缀（如果有） */
        const latestVersion = releaseInfo.tag_name.replace(/^v/, '');
        const currentVersionClean = currentVersion.replace(/^v/, '');

        /* 比较版本号 */
        const hasUpdate = compareVersions(latestVersion, currentVersionClean);
        return { hasUpdate, releaseInfo };
    } catch (error) {
        console.error('检查更新失败:', error);
        return {
            hasUpdate: false,
            releaseInfo: null,
        };
    }
}

/* 版本号比较函数 */
function compareVersions(latest: string, current: string): boolean {
    const latestParts = latest.split('.').map(Number);
    const currentParts = current.split('.').map(Number);

    for (let i = 0; i < 3; i++) {
        const latestPart = latestParts[i] || 0;
        const currentPart = currentParts[i] || 0;

        if (latestPart > currentPart) {
            return true;  /* 有新版本 */
        } else if (latestPart < currentPart) {
            return false; /* 当前版本更新 */
        }
    }

    return false; /* 版本相同 */
}

async function backupCurrentVersion(currentVersion: string, pluginDir: string, vault: Vault) {
    try {
        /* 创建备份目录 */
        const backupDir = `${pluginDir}/sync-vault-backup/${currentVersion}`;
        await vault.adapter.mkdir(backupDir);

        /* 需要备份的文件 */
        const files = ['main.js', 'manifest.json', 'styles.css', 'checksums.json'];

        /* 移动文件到备份目录 */
        for (const file of files) {
            const sourcePath = `${pluginDir}/${file}`;
            const targetPath = `${backupDir}/${file}`;

            if (await vault.adapter.exists(sourcePath)) {
                const content = await vault.adapter.read(sourcePath);
                await vault.adapter.write(targetPath, content);
            }
        }

        logger.info(`备份版本 ${currentVersion} 完成`);
        return true;
    } catch (error) {
        logger.error('备份失败:', error);
        return false;
    }
}

async function getChecksums(): Promise<Record<string, string>> {
    const response = await requestUrl({
        url: `https://gitee.com/${owner}/${repo}/raw/master/checksums.json`,
        method: 'GET',
    });

    if (response.status !== 200) {
        throw new Error('获取校验和失败');
    }

    return JSON.parse(response.text);
}

export async function downloadAndInstallUpdate(
    currentVersion: string,
    releaseInfo: GiteeRelease,
    pluginDir: string,
    vault: Vault
) {
    try {
        const owner = 'abcamus';
        const repo = 'obsidian-sync-vault-release';
        const fileName = releaseInfo.assets[0]?.name;

        if (!fileName) {
            throw new Error('未找到下载链接');
        }

        /* Step 1: 备份当前版本 */
        if (await backupCurrentVersion(currentVersion, pluginDir, vault) === false) {
            throw new Error('备份失败');
        }

        /* Step 2: 获取校验和 */
        const checksums = await getChecksums();

        /* Step 3: 下载更新 */
        const downloadFiles = [
            {
                name: 'main.js',
                url: `https://gitee.com/${owner}/${repo}/raw/master/main.js`,
                needChecksum: true,
            },
            {
                name: 'styles.css',
                url: `https://gitee.com/${owner}/${repo}/raw/master/styles.css`,
                needChecksum: false,
            },
            {
                name: 'manifest.json',
                url: `https://gitee.com/${owner}/${repo}/raw/master/manifest.json`,
                needChecksum: false,
            }
        ];

        new Notice('[1/3] ' + i18n.t('settingTab.upgradeAndHelp.downloading'));
        const fileContents: Record<string, string> = {};
        for (const item of downloadFiles) {
            const response = await requestUrl({
                url: item.url,
                method: 'GET',
                headers: {
                    'Accept': '*/*',
                },
            });

            if (response.status !== 200) {
                throw new Error('下载更新失败');
            }

            fileContents[item.name] = response.text;
            logger.info(`下载文件 ${item.name} 成功`);
        }

        /* Step 4: 写入文件 */
        new Notice('[2/3] ' + i18n.t('settingTab.upgradeAndHelp.updating'));
        for (const item of downloadFiles) {
            const filePath = util.path.join(pluginDir, item.name);
            await vault.adapter.write(filePath, fileContents[item.name]);
        }

        /* 保存checksum */
        const checksumPath = util.path.join(pluginDir, 'checksums.json');
        await vault.adapter.write(checksumPath, JSON.stringify(checksums, null, 2));
        logger.info('Checksums saved to:', checksumPath);

        new Notice('[3/3] ' + i18n.t('settingTab.upgradeAndHelp.updateInstalled'));
        return true;
    } catch (error) {
        logger.info('下载更新失败:', error);
        new Notice('[3/3] ' + i18n.t('settingTab.upgradeAndHelp.updateInstallFailed') + error);
        return false;
    }
}

import { App, Setting, Modal, PluginManifest } from "obsidian";

export class UpgradeModal extends Modal {
    private releaseInfo: any;
    private pluginDir: string;
    private currentVersion: string;
    constructor(app: App, releaseInfo: ReleaseInfo, manifest: PluginManifest) {
        super(app);
        this.releaseInfo = releaseInfo;
        this.pluginDir = manifest.dir!;
        this.currentVersion = manifest.version;
    }

    onOpen() {
        const { contentEl } = this;
        contentEl.empty();

        contentEl.createEl('h2', { text: i18n.t('settingTab.menuUpgradeAndHelp.upgrade.newVersion') });

        /* 版本信息 */
        const infoDiv = contentEl.createDiv({ cls: 'update-info' });
        infoDiv.createEl('p', { text: i18n.t('settingTab.menuUpgradeAndHelp.upgrade.version', { version: this.releaseInfo.tag_name }) });

        /* 更新说明 */
        const descDiv = contentEl.createDiv({ cls: 'update-description' });
        descDiv.createEl('h3', { text: i18n.t('settingTab.menuUpgradeAndHelp.upgrade.releaseNotes') });
        const notesDiv = descDiv.createDiv({ cls: 'notes' });
        notesDiv.innerHTML = (this.releaseInfo.body || i18n.t('settingTab.menuUpgradeAndHelp.upgrade.noReleaseNotes'))
            .replace(/\r\n|\n/g, '<br>');

        /* 自动更新提示 */
        const warningDiv = contentEl.createDiv({ cls: 'update-warning' });
        const warningList = warningDiv.createEl('ul', { cls: 'warning-list' });
        i18n.tArray('settingTab.menuUpgradeAndHelp.upgrade.autoUpdateWarning.items').forEach((item: string) => {
            warningList.createEl('li', { text: item, cls: 'warning-item' });
        });

        /* 按钮组 */
        new Setting(contentEl)
            .addButton((btn) => {
                btn.setButtonText(i18n.t('settingTab.menuUpgradeAndHelp.upgrade.autoUpdate'))
                    .setCta()
                    .onClick(async () => {
                        this.close();
                        try {
                            await downloadAndInstallUpdate(this.currentVersion, this.releaseInfo, this.pluginDir, this.app.vault);
                        } catch (error) {
                            new Notice(i18n.t('settingTab.menuUpgradeAndHelp.upgrade.autoUpdateFailed'));
                            console.error('自动更新失败:', error);
                        }
                    });
                return btn;
            })
            .addButton((btn) => {
                btn.setButtonText(i18n.t('settingTab.menuUpgradeAndHelp.upgrade.manualUpdate'))
                    .onClick(() => {
                        window.open('https://kqiu.top/download/cloud-disk-sync-vault/');
                        this.close();
                    });
                return btn;
            })
            .addButton((btn) => {
                btn.setButtonText(i18n.t('settingTab.menuUpgradeAndHelp.upgrade.cancel'))
                    .onClick(() => {
                        this.close();
                    });
                return btn;
            });
    }
    onClose() {
        const { contentEl } = this;
        contentEl.empty();
    }
}