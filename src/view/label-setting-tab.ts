import SyncVaultPlugin from "main";
import { App, Notice, PluginSettingTab, setIcon, Setting } from "obsidian";
import { i18n } from "src/i18n";
import { cloudDiskModel } from "src/model/cloud-disk-model";
import { CloudDiskType } from "src/service/cloud-interface";
import { checkVersion, UpgradeModal } from "src/util/upgrade";

import * as util from '../util';
const logger = util.logger.createLogger('setting-tab');

function getCloudDiskTypeDesc(type: CloudDiskType): string {
    switch (type) {
        case CloudDiskType.Aliyun:
            return i18n.t('settingTab.cloudDisk.aliyunDisk');
    }
    return 'unknown';
}

export class LabeledSettingTab extends PluginSettingTab {
    plugin: SyncVaultPlugin;
    private contentArea: HTMLElement;
    private tabBar: HTMLElement;
    private keySettingContainer: HTMLElement;
    private syncModeSettingContainer: HTMLElement;

    constructor(app: App, plugin: SyncVaultPlugin) {
        super(app, plugin);
        this.plugin = plugin;
    }

    display(): void {
        const { containerEl } = this;
        containerEl.empty();

        // 创建主容器
        const mainContainer = containerEl.createDiv({ cls: 'cloud-settings-container' });

        // 创建左侧标签栏
        this.tabBar = mainContainer.createDiv({ cls: 'cloud-settings-tab-bar' });

        // 创建右侧内容区域
        this.contentArea = mainContainer.createDiv({ cls: 'cloud-settings-content-area' });

        // 添加标签页
        this.addTab('vault', 'home', i18n.t('settingTab.label.vaultInfo'), () => this.renderVaultSettings());
        this.addTab('start', 'rocket', i18n.t('settingTab.label.startToUse'), () => this.renderStartToUseSettings());
        this.addTab('sync', 'refresh-cw', i18n.t('settingTab.label.syncSetting'), () => this.renderSyncSettings());
        this.addTab('encrypt', 'lock', i18n.t('settingTab.label.encryptSetting'), () => this.renderEncryptSettings());
        this.addTab('help', 'help-circle', i18n.t('settingTab.label.help'), () => this.renderHelpSettings());

        // 默认激活第一个标签
        this.activateTab('vault');
    }

    private addTab(id: string, icon: string, name: string, renderFn: () => void): void {
        const tabButton = this.tabBar.createDiv({
            cls: 'cloud-settings-tab-button',
            attr: { 'data-tab': id }
        });

        // 添加图标
        setIcon(tabButton.createDiv({ cls: 'cloud-settings-tab-icon' }), icon);

        // 添加标签名称
        tabButton.createEl('span', { cls: 'cloud-settings-tab-name', text: name });

        // 创建对应的内容容器
        this.contentArea.createDiv({
            cls: 'cloud-settings-tab-content',
            attr: { 'data-tab': id }
        });

        // 点击事件
        tabButton.onclick = () => this.activateTab(id, renderFn);
    }

    private activateTab(tabId: string, renderFn?: () => void): void {
        // 移除所有活动状态
        this.tabBar.findAll('.cloud-settings-tab-button').forEach(btn => {
            btn.classList.remove('active');
        });
        this.contentArea.findAll('.cloud-settings-tab-content').forEach(content => {
            content.classList.remove('active');
        });

        // 添加活动状态到当前标签
        this.tabBar.find(`.cloud-settings-tab-button[data-tab="${tabId}"]`)?.classList.add('active');
        const contentEl = this.contentArea.find(`.cloud-settings-tab-content[data-tab="${tabId}"]`);
        if (contentEl) {
            contentEl.classList.add('active');
            contentEl.empty();

            // 如果提供了渲染函数，调用它
            if (renderFn) {
                renderFn();
            } else {
                // 否则根据tabId调用对应的渲染方法
                switch (tabId) {
                    case 'vault':
                        this.renderVaultSettings();
                        break;
                    case 'start':
                        this.renderStartToUseSettings();
                        break;
                    case 'sync':
                        this.renderSyncSettings();
                        break;
                    case 'encrypt':
                        this.renderEncryptSettings();
                        break;
                    case 'help':
                        this.renderHelpSettings();
                        break;
                }
            }
        }
    }

    private renderVaultSettings(): void {
        const contentEl = this.contentArea.find(`.cloud-settings-tab-content[data-tab="vault"]`);
        if (!contentEl) return;

        new Setting(contentEl)
            .setName(i18n.t('settingTab.vault.title'))
            .setDesc(i18n.t('settingTab.vault.vaultDesc', { syncPath: `${cloudDiskModel.remoteRootPath}` }))
            .addText(text => text
                .setPlaceholder(i18n.t('settingTab.vault.enterRemotePath'))
                .setValue(this.plugin.settings.syncPath)
                .onChange(async (value) => {
                    this.plugin.settings.syncPath = value;
                    await this.plugin.saveSettings();
                }))
            .setDisabled(true);
    }

    private renderStartToUseSettings(): void {
        const contentEl = this.contentArea.find(`.cloud-settings-tab-content[data-tab="start"]`);
        if (!contentEl) return;

        let isAccessTokenValid = cloudDiskModel.isTokenValid;

        new Setting(contentEl)
            .setHeading()
            .setName(i18n.t('settingTab.menuStartToUse.title'))
            .setDesc(i18n.t('settingTab.menuStartToUse.desc'))
        new Setting(contentEl)
            .setName(i18n.t('settingTab.cloudDisk.title'))
            .setDesc(i18n.t('settingTab.cloudDisk.desc'))
            .addDropdown(dropdown => dropdown
                .addOption(CloudDiskType.Aliyun, i18n.t('settingTab.cloudDisk.aliyunDisk'))
                .setValue(this.plugin.settings.selectedCloudDisk || CloudDiskType.Aliyun)
                .onChange(async (value) => {
                    if (value !== this.plugin.settings.selectedCloudDisk) {
                        const message = getCloudDiskTypeDesc(value as CloudDiskType);
                        new Notice(i18n.t('settingTab.cloudDisk.switchTo', { message }));
                        /* 切换云盘后，重置初始化状态 */
                        this.plugin.settings.selectedCloudDisk = value as CloudDiskType;
                        cloudDiskModel.reset();
                        await this.plugin.saveSettings();
                    }
                })
            )
            .addButton(button => button
                .setButtonText(isAccessTokenValid ? i18n.t('settingTab.accessToken.revoke') : i18n.t('settingTab.accessToken.clickToAuthorize'))
                .onClick(async () => {
                    /* 触发授权逻辑 */
                    if (button.buttonEl.textContent === i18n.t('settingTab.accessToken.revoke')) {
                        button.setButtonText(i18n.t('settingTab.accessToken.clickToAuthorize'));
                        return;
                    }
                    await this.plugin.authorize((isAuthorized) => {
                        if (isAuthorized) {
                            button.setButtonText(i18n.t('settingTab.accessToken.revoke'));
                        }
                    });
                })
            );
    }

    private renderSyncSettings(): void {
        const contentEl = this.contentArea.find(`.cloud-settings-tab-content[data-tab="sync"]`);
        if (!contentEl) return;

        new Setting(contentEl)
            .setHeading()
            .setName(i18n.t('settingTab.menuSyncConfig.title'))
            .setDesc(i18n.t('settingTab.menuSyncConfig.desc'));

        new Setting(contentEl)
            .setName(i18n.t('settingTab.menuSyncConfig.switchSyncMode.title'))
            .setDesc(i18n.t('settingTab.menuSyncConfig.switchSyncMode.desc'))
            .addDropdown(dropdown => {
                dropdown
                    .addOption('restricted', i18n.t('settingTab.menuSyncConfig.mode.selfControlled'))
                    .setValue('restricted')
                    .onChange(async (value) => {
                        await this.plugin.saveSettings();
                        this.updateSyncModeSetting();
                    });
                return dropdown;
            });

        this.syncModeSettingContainer = contentEl.createDiv();
        this.updateSyncModeSetting();
    }

    private updateSyncModeSetting(): void {
        this.syncModeSettingContainer.empty();

        new Setting(this.syncModeSettingContainer)
            .setName(i18n.t('settingTab.menuSyncConfig.uploadStrategy.title'))
            .setDesc(i18n.t('settingTab.menuSyncConfig.uploadStrategy.desc'))
            .addDropdown(dropdown => dropdown
                .addOption('userControl', i18n.t('settingTab.menuSyncConfig.uploadStrategy.userControl'))
                .setValue(this.plugin.settings.uploadStrategy || 'userControl')
                .onChange(async (value) => {
                    this.plugin.settings.uploadStrategy = value as 'userControl';
                    await this.plugin.saveSettings();
                })
            );

        new Setting(this.syncModeSettingContainer)
            .setName(i18n.t('settingTab.menuSyncConfig.downloadStrategy.title'))
            .setDesc(i18n.t('settingTab.menuSyncConfig.downloadStrategy.desc'))
            .addDropdown(dropdown => dropdown
                .addOption('autoOnLoad', i18n.t('settingTab.menuSyncConfig.downloadStrategy.autoOnLoad'))
                .addOption('manual', i18n.t('settingTab.menuSyncConfig.downloadStrategy.manual'))
                .setValue(this.plugin.settings.downloadStrategy || 'manual')
                .onChange(async (value) => {
                    this.plugin.settings.downloadStrategy = value as 'autoOnLoad' | 'manual';
                    await this.plugin.saveSettings();
                })
            );

        new Setting(this.syncModeSettingContainer)
            .setName('Skip large files (unit: MB)')
            .addText(text => text
                .setValue(">=")
                .setDisabled(true)
                .then(t => {
                    t.inputEl.style.textAlign = "right";
                    t.inputEl.style.border = "none";
                    t.inputEl.style.backgroundColor = "transparent";
                })
            )
            .addText(text => text
                .setValue(String(this.plugin.settings.fileSizeLimit))
                .setPlaceholder('100')
                .onChange(async (value) => {
                    let newLimit = parseInt(value);
                    if (isNaN(newLimit) || newLimit <= 0) {
                        logger.info('invalid file size limit, use default value 100');
                        newLimit = 100;
                    }
                    this.plugin.settings.fileSizeLimit = newLimit;
                    cloudDiskModel.fileSizeLimit = newLimit;
                    await this.plugin.saveSettings();
                })
            );
    }

    private renderEncryptSettings(): void {
        const contentEl = this.contentArea.find(`.cloud-settings-tab-content[data-tab="encrypt"]`);
        if (!contentEl) return;

        new Setting(contentEl)
            .setName(i18n.t('settingTab.menuSyncConfig.encryptMode.title'))
            .setDesc(i18n.t('settingTab.menuSyncConfig.encryptMode.desc'))
            .addToggle(toggle => {
                toggle.setValue(this.plugin.settings.encryptMode)
                    .onChange(async (value) => {
                        this.plugin.settings.encryptMode = value;
                        await this.plugin.saveSettings();
                        this.updateKeySetting();
                    })
            });

        this.keySettingContainer = contentEl.createDiv();
        this.updateKeySetting();
    }

    private updateKeySetting(): void {
        this.keySettingContainer.empty();

        if (this.plugin.settings.encryptMode) {
            const passwordSetting = new Setting(this.keySettingContainer)
                .setName(i18n.t('settingTab.key.title'))
                .setDesc(i18n.t('settingTab.key.desc'))
                .addText(text => {
                    text.inputEl.type = 'password';
                    text
                        .setPlaceholder(i18n.t('settingTab.key.placeholder'))
                        .setValue(this.plugin.settings.password)
                        .onChange(async (value) => {
                            this.plugin.settings.password = value;
                            await this.plugin.saveSettings();
                        })
                });

            passwordSetting.addExtraButton(button => {
                button
                    .setIcon('eye')
                    .setTooltip(i18n.t('settingTab.key.showPassword'))
                    .onClick(() => {
                        const inputEl = passwordSetting.controlEl.querySelector('input');
                        if (inputEl) {
                            if (inputEl.type === 'password') {
                                inputEl.type = 'text';
                                button.setIcon('eye-off');
                                button.setTooltip(i18n.t('settingTab.key.hidePassword'));
                            } else {
                                inputEl.type = 'password';
                                button.setIcon('eye');
                                button.setTooltip(i18n.t('settingTab.key.showPassword'));
                            }
                        }
                    });
            });
        }
    }

    private renderHelpSettings(): void {
        const contentEl = this.contentArea.find(`.cloud-settings-tab-content[data-tab="help"]`);
        if (!contentEl) return;

        new Setting(contentEl)
            .setHeading()
            .setName(i18n.t('settingTab.menuUpgradeAndHelp.title'));

        new Setting(contentEl)
            .setName(i18n.t('settingTab.menuUpgradeAndHelp.upgrade.title'))
            .addButton(button => {
                button.buttonEl.style.cursor = 'pointer';
                return button
                    .setButtonText(i18n.t('settingTab.menuUpgradeAndHelp.upgrade.checkUpdate'))
                    .onClick(async () => {
                        const originalText = button.buttonEl.textContent;
                        button.setButtonText(i18n.t('settingTab.menuUpgradeAndHelp.upgrade.checking'));
                        button.buttonEl.disabled = true;

                        try {
                            const currentVersion = this.plugin.manifest.version;
                            logger.debug(`当前版本: ${currentVersion}`);
                            const { hasUpdate, releaseInfo } = await checkVersion(currentVersion);
                            logger.debug(releaseInfo);

                            if (hasUpdate && releaseInfo) {
                                new Notice(i18n.t('settingTab.menuUpgradeAndHelp.upgrade.updateAvailable'));
                                new UpgradeModal(this.app, releaseInfo, this.plugin.manifest).open();
                            } else {
                                new Notice(i18n.t('settingTab.menuUpgradeAndHelp.upgrade.latestVersion'));
                            }
                        } catch (error) {
                            logger.error('检查更新失败:', error);
                            new Notice(i18n.t('settingTab.menuUpgradeAndHelp.upgrade.checkFailed'));
                        } finally {
                            // 恢复按钮状态
                            button.setButtonText(originalText || '');
                            button.buttonEl.disabled = false;
                        }
                    });
            })
            .descEl.createEl('a', { text: 'click to view sync vault pro', attr: { href: 'https://kqiu.top/docs/', target: '_blank' } });

        new Setting(contentEl)
            .setName(i18n.t('settingTab.menuUpgradeAndHelp.log.title'))
            .setDesc(i18n.t('settingTab.menuUpgradeAndHelp.log.desc'))
            .addToggle(toggle => toggle
                .setValue(this.plugin.settings.logMode)
                .onChange(async (value) => {
                    this.plugin.settings.logMode = value;
                    await this.plugin.saveSettings();
                })
            )
            .addButton(button => button
                .setButtonText(i18n.t('settingTab.menuUpgradeAndHelp.log.openLogFile'))
                .onClick(() => {
                    util.LogService.instance().openLogFile();
                })
            );
    }
}