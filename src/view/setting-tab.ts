import { App, PluginSettingTab, Setting, ButtonComponent, Modal, Notice, PluginManifest, ProgressBarComponent } from 'obsidian';
import SyncVaultPlugin from '../../main';
import { CloudDiskType } from '../service/cloud-interface';
import { cloudDiskModel } from '../model/cloud-disk-model';
import { i18n } from '../i18n';
import { LogService } from 'src/util/file-log';
import * as util from '../util';

const logger = util.logger.createLogger('setting-tab');

function getCloudDiskTypeDesc(type: CloudDiskType): string {
  switch (type) {
    case CloudDiskType.Aliyun:
      return i18n.t('settingTab.cloudDisk.aliyunDisk');
  }
  return 'unknown';
}

export class CloudDiskSettingTab extends PluginSettingTab {
  plugin: SyncVaultPlugin;
  private keySettingContainer: HTMLElement;
  private syncModeSettingContainer: HTMLElement;

  constructor(app: App, plugin: SyncVaultPlugin) {
    super(app, plugin);
    this.plugin = plugin;
  }

  private addVaultInfoSetting() {
    new Setting(this.containerEl)
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

  private async addStartToUseSetting() {
    let isAccessTokenValid = await this.plugin.checkAndRefreshToken();

    new Setting(this.containerEl)
      .setHeading()
      .setName(i18n.t('settingTab.menuStartToUse.title'))
      .setDesc(i18n.t('settingTab.menuStartToUse.desc'))
    new Setting(this.containerEl)
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
            await this.plugin.refreshView(this.app.workspace);
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

  private addSyncSetting() {
    new Setting(this.containerEl)
      .setHeading()
      .setName(i18n.t('settingTab.menuSyncConfig.title'))
      .setDesc(i18n.t('settingTab.menuSyncConfig.desc'));

    new Setting(this.containerEl)
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

    this.syncModeSettingContainer = this.containerEl.createDiv();
    this.updateSyncModeSetting();
  }

  private addUpgradeAndHelpSetting() {
    new Setting(this.containerEl)
      .setName(i18n.t('settingTab.log.title'))
      .setDesc(i18n.t('settingTab.log.desc'))
      .addToggle(toggle => toggle
        .setValue(this.plugin.settings.logMode)
        .onChange(async (value) => {
          this.plugin.settings.logMode = value;
          await this.plugin.saveSettings();
        })
      )
      .addButton(button => button
        .setButtonText(i18n.t('settingTab.log.openLogFile'))
        .onClick(() => {
          LogService.instance().openLogFile();
        })
      );
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

  private addEncryptSetting() {
    new Setting(this.containerEl)
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

    this.keySettingContainer = this.containerEl.createDiv();
    this.updateKeySetting();
  }

  async display(): Promise<void> {
    const { containerEl } = this;
    containerEl.empty();

    this.addVaultInfoSetting();
    await this.addStartToUseSetting();
    this.addSyncSetting();
    this.addEncryptSetting();
    this.addUpgradeAndHelpSetting();
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
  }
}