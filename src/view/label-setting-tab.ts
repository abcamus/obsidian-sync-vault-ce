import SyncVaultPlugin from "main";
import { App, Notice, PluginSettingTab, setIcon, Setting } from "obsidian";
import { i18n } from "src/i18n";
import { cloudDiskModel, FtpConfig, S3Config } from "src/model/cloud-disk-model";
import { CloudDiskType } from "src/service/cloud-interface";
import { checkVersion, UpgradeModal } from "src/util/upgrade";

import * as util from '../util';
import { WebDAVLoginModal } from "./webdav-login-modal";
import { createClient } from "webdav";
import { WebDAVClient } from "@/service/vendor/webdav";
import { SftpLoginModal } from "./ftp-login-modal";
import { S3ConfigModal } from "./s3-config.modal";

const logger = util.logger.createLogger('setting-tab');

export function getCloudDiskTypeDesc(type: CloudDiskType): string {
    switch (type) {
        case CloudDiskType.Aliyun:
            return i18n.t('settingTab.cloudDisk.aliyunDisk');
        case CloudDiskType.Webdav:
            return 'WebDAV';
    }
    return 'unknown';
}

const cloudDiskOptions = [
    {
        type: CloudDiskType.Aliyun,
        name: i18n.t('settingTab.cloudService.aliyunDisk'),
        logo: `<svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <circle cx="12" cy="12" r="10.5" stroke="#7B9CFF" stroke-width="3" fill="none" opacity="0.3"/>
                <path d="M22 12a10 10 0 1 1-10-10" stroke="#7B9CFF" stroke-width="3" stroke-linecap="round" fill="none"/>
               </svg>`,
    },
    {
        type: CloudDiskType.Webdav,
        name: "坚果云",
        logo: `<svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M6 17 Q2 17 2 12 Q2 7 6 7 Q7 2 12 4 Q14 2 18 4 Q22 4 22 8 Q24 8 24 12 Q24 17 18 17 Z"
                    fill="#fff" stroke="#B97A3A" stroke-width="1.2"/>
                <ellipse cx="15" cy="15" rx="6" ry="6" fill="#F9D488" stroke="#B97A3A" stroke-width="1.2"/>
                <ellipse cx="15" cy="15" rx="4.5" ry="4.5" fill="#E2B15B" opacity="0.5"/>
                <path d="M9.5 12 Q15 9 20.5 12 Q18.5 11 15 12 Q11.5 11 9.5 12 Z"
                        fill="#8B5C2B" stroke="#6B3F1A" stroke-width="1"/>
                <path d="M15 12 Q16 16 15 21" stroke="#B97A3A" stroke-width="1"/>
              </svg>`,
    },
    {
        type: CloudDiskType.Webdav,
        name: "InfiniCloud",
        logo: `<svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M12 21c-4.32 0-7.83-2.92-7.83-6.5 0-3.58 3.51-6.5 7.83-6.5 2.17 0 3.93 1.05 3.93 2.33s-1.76 2.33-3.93 2.33c-1.3 0-2.35-0.52-2.35-1.17 0-0.65 1.05-1.17 2.35-1.17" stroke="#F39800" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round" fill="none"/>
                <path d="M12 3c4.32 0 7.83 2.92 7.83 6.5 0 3.58-3.51 6.5-7.83 6.5-2.17 0-3.93-1.05-3.93-2.33s1.76-2.33 3.93-2.33c1.3 0 2.35 0.52 2.35 1.17 0 0.65-1.05 1.17-2.35 1.17" stroke="#F39800" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round" fill="none"/>
              </svg>`,
    },
    {
        type: CloudDiskType.Ftp,
        name: 'FTP',
        logo: `<svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <rect x="4" y="4" width="16" height="16" rx="2" stroke="#6B7280" stroke-width="2" fill="none"/>
            <path d="M8 8h8M8 12h8M8 16h4" stroke="#6B7280" stroke-width="2" stroke-linecap="round"/>
            <path d="M16 12l2 2-2 2" stroke="#6B7280" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
          </svg>`,
    },
    {
        type: CloudDiskType.S3,
        name: 'S3',
        logo: `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 428 512">
  <defs>
    <style>
      .cls-1 {
        fill: #e25444;
      }
      .cls-1, .cls-2, .cls-3 {
        fill-rule: evenodd;
      }
      .cls-2 {
        fill: #7b1d13;
      }
      .cls-3 {
        fill: #58150d;
      }
    </style>
  </defs>
  <path class="cls-1" d="M378,99L295,257l83,158,34-19V118Z"/>
  <path class="cls-2" d="M378,99L212,118,127.5,257,212,396l166,19V99Z"/>
  <path class="cls-3" d="M43,99L16,111V403l27,12L212,257Z"/>
  <path class="cls-1" d="M42.637,98.667l169.587,47.111V372.444L42.637,415.111V98.667Z"/>
  <path class="cls-3" d="M212.313,170.667l-72.008-11.556,72.008-81.778,71.83,81.778Z"/>
  <path class="cls-3" d="M284.143,159.111l-71.919,11.733-71.919-11.733V77.333"/>
  <path class="cls-3" d="M212.313,342.222l-72.008,13.334,72.008,70.222,71.83-70.222Z"/>
  <path class="cls-2" d="M212,16L140,54V159l72.224-20.333Z"/>
  <path class="cls-2" d="M212.224,196.444l-71.919,7.823V309.105l71.919,8.228V196.444Z"/>
  <path class="cls-2" d="M212.224,373.333L140.305,355.3V458.363L212.224,496V373.333Z"/>
  <path class="cls-1" d="M284.143,355.3l-71.919,18.038V496l71.919-37.637V355.3Z"/>
  <path class="cls-1" d="M212.224,196.444l71.919,7.823V309.105l-71.919,8.228V196.444Z"/>
  <path class="cls-1" d="M212,16l72,38V159l-72-20V16Z"/>
</svg>`,
    }
];

function renderCloudDiskList(
    selectedType: CloudDiskType,
    selectedName: string,
    onSelect: (cloudType: CloudDiskType, cloudName: string) => void,
    container: HTMLElement
) {
    container.empty();
    cloudDiskOptions.forEach(option => {
        const item = container.createDiv({
            cls: `cloud-disk-option${selectedName === option.name ? ' selected' : ''}`,
            attr: { 'data-type': option.type }
        });
        item.createDiv({ cls: 'cloud-disk-logo' }).innerHTML = option.logo;
        item.createSpan({ text: option.name, cls: 'cloud-disk-name' });
        item.onclick = () => onSelect(option.type, option.name);
    });
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
        this.addTab('advanced', 'zap', i18n.t('settingTab.label.advancedSetting'), () => this.renderAdvancedSettings());
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
                    case 'advanced':
                        this.renderAdvancedSettings();
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
            .setName(i18n.t('settingTab.cloudService.title'))
            .setDesc(i18n.t('settingTab.cloudService.desc'))
            .addButton(button => button
                .setButtonText(isAccessTokenValid ? i18n.t('settingTab.accessToken.revoke') : i18n.t('settingTab.accessToken.clickToAuthorize'))
                .onClick(async () => {
                    /* 触发授权逻辑 */
                    if (button.buttonEl.textContent === i18n.t('settingTab.accessToken.revoke')) {
                        button.setButtonText(i18n.t('settingTab.accessToken.clickToAuthorize'));
                        return;
                    }
                    if (cloudDiskModel.selectedCloudDisk === CloudDiskType.Webdav) {
                        new WebDAVLoginModal(this.app, (result) => {
                            if (result) {
                                this.plugin.settings.webDAVAccount[this.plugin.settings.cloudDiskName] = {
                                    url: result.url,
                                    name: result.username,
                                    password: result.password,
                                };
                                this.plugin.saveSettings().then(() => {
                                    new Notice(`${this.plugin.settings.cloudDiskName} login`);
                                    button.setButtonText(i18n.t('settingTab.accessToken.revoke'));
                                });
                            }
                        }).open();
                    } else if (cloudDiskModel.selectedCloudDisk === CloudDiskType.Ftp) {
                        new SftpLoginModal(this.app, (result: FtpConfig) => {
                            if (result) {
                                this.plugin.settings.ftpAccount = {
                                    url: result.server,
                                    port: result.port,
                                    path: result.remotePath,
                                    username: result.username,
                                    password: result.password,
                                };
                                this.plugin.saveSettings().then(() => {
                                    new Notice(`${this.plugin.settings.cloudDiskName} login`);
                                    button.setButtonText(i18n.t('settingTab.accessToken.revoke'));
                                });
                            }
                        }).open();
                    } else if (cloudDiskModel.selectedCloudDisk === CloudDiskType.S3) {
                        new S3ConfigModal(this.app, (result: S3Config) => {
                            this.plugin.saveSettings().then(() => {
                                // TODO: save settings
                                this.plugin.settings.s3Account = {
                                    accessKeyId: result.accessKeyId,
                                    secretAccessKey: result.secretAccessKey,
                                    region: result.region,
                                    endpoint: result.endpoint,
                                    bucket: result.bucket,
                                };
                                this.plugin.saveSettings().then(() => {
                                    new Notice(`${this.plugin.settings.cloudDiskName} login`);
                                    button.setButtonText(i18n.t('settingTab.accessToken.revoke'));
                                });
                            });
                        }).open();
                    } else {
                        await this.plugin.authorize((isAuthorized) => {
                            if (isAuthorized) {
                                button.setButtonText(i18n.t('settingTab.accessToken.revoke'));
                            }
                        });
                    }
                })
            );

        const cloudDiskListContainer = contentEl.createDiv({ cls: 'cloud-disk-list' });
        const onSelectCloudDisk = async (type: CloudDiskType, cloudName: string) => {
            if (cloudName !== this.plugin.settings.cloudDiskName) {
                const message = cloudName;
                new Notice(i18n.t('settingTab.cloudDisk.switchTo', { message }));
                this.plugin.settings.selectedCloudDisk = type;
                this.plugin.settings.cloudDiskName = cloudName;
                cloudDiskModel.reset();
                await this.plugin.saveSettings();
                this.plugin.closeContentView();
                if (type === CloudDiskType.Webdav) {
                    WebDAVClient.createClient({
                        url: cloudDiskModel.webdavUrl,
                        username: cloudDiskModel.webdavUsername,
                        password: cloudDiskModel.webdavPassword,
                    });
                }
                renderCloudDiskList(type, cloudName, onSelectCloudDisk, cloudDiskListContainer);
            }
        };
        renderCloudDiskList(
            this.plugin.settings.selectedCloudDisk || CloudDiskType.Aliyun,
            this.plugin.settings.cloudDiskName,
            onSelectCloudDisk,
            cloudDiskListContainer
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

        new Setting(contentEl)
            .setHeading()
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

    private renderAdvancedSettings(): void {
        const contentEl = this.contentArea.find(`.cloud-settings-tab-content[data-tab="advanced"]`);
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