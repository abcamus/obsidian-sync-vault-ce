import { App, Modal, Setting } from 'obsidian';
import { i18n } from 'src/i18n';
import { cloudDiskModel, FtpConfig } from 'src/model/cloud-disk-model';

export class SftpLoginModal extends Modal {
    onSubmit: (result: FtpConfig) => void;

    constructor(
        app: App,
        onSubmit: (result: FtpConfig) => void
    ) {
        super(app);
        this.onSubmit = onSubmit;
    }

    onOpen() {
        const { contentEl } = this;
        contentEl.empty();
        contentEl.createEl('h2', { text: 'FTP Configuration' });

        // FTP 服务器地址
        new Setting(contentEl)
            .setName('FTP Server')
            .addText(text => text
                .setValue(cloudDiskModel.ftpConfig.server || '')
                .onChange(async (value) => {
                    cloudDiskModel.ftpConfig.server = value;
                }));

        // FTP 端口
        new Setting(contentEl)
            .setName('FTP Port')
            .addText(text => text
                .setValue(cloudDiskModel.ftpConfig.port?.toString() || '21')
                .onChange(async (value) => {
                    cloudDiskModel.ftpConfig.port = parseInt(value) || 21;
                }));

        // FTP 用户名
        new Setting(contentEl)
            .setName('FTP Username')
            .addText(text => text
                .setValue(cloudDiskModel.ftpConfig.username || '')
                .onChange(async (value) => {
                    cloudDiskModel.ftpConfig.username = value;
                }));

        // FTP 密码
        const passwordSetting = new Setting(contentEl)
            .setName('FTP Password')
            .addText(text => {
                text.inputEl.type = 'password';
                text
                    .setValue(cloudDiskModel.ftpConfig.password || '')
                    .onChange(async (value) => {
                        cloudDiskModel.ftpConfig.password = value;
                    });
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

        // 远程目录路径
        new Setting(contentEl)
            .setName('FTP Remote Path')
            .addText(text => text
                .setValue(cloudDiskModel.ftpConfig.remotePath || '/')
                .onChange(async (value) => {
                    cloudDiskModel.ftpConfig.remotePath = value;
                }));

        // 保存按钮
        new Setting(contentEl)
            .addButton(btn => btn
                .setButtonText('Save')
                .setCta()
                .onClick(async () => {
                    this.onSubmit(cloudDiskModel.ftpConfig);
                    this.close();
                }));
    }

    onClose() {
        const { contentEl } = this;
        contentEl.empty();
    }
}