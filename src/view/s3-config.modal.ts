import { App, Modal, Notice, Setting } from 'obsidian';
import { i18n } from 'src/i18n';
import { cloudDiskModel, S3Config } from 'src/model/cloud-disk-model';
import { S3Client } from '@/service/vendor/s3';

export class S3ConfigModal extends Modal {
    onSubmit: (config: S3Config) => void;

    constructor(
        app: App,
        onSubmit: (config: S3Config) => void
    ) {
        super(app);
        this.onSubmit = onSubmit;
    }

    onOpen() {
        const { contentEl } = this;
        contentEl.empty();
        contentEl.createEl('h2', { text: 'S3 Configuration' });

        // Endpoint 配置
        new Setting(contentEl)
            .setName('Endpoint')
            .setDesc('The endpoint for your S3 bucket')
            .addText(text => text
                .setPlaceholder('https://s3.amazonaws.com')
                .setValue(cloudDiskModel.s3Config.endpoint || '')
                .onChange(async (value) => {
                    cloudDiskModel.s3Config.endpoint = value;
                }));

        // Region 配置
        new Setting(contentEl)
            .setName('Region')
            .setDesc('The AWS region for your S3 bucket')
            .addText(text => text
                .setPlaceholder('us-east-1')
                .setValue(cloudDiskModel.s3Config.region || 'us-east-1')
                .onChange(async (value) => {
                    cloudDiskModel.s3Config.region = value;
                }));

        // Access Key ID
        new Setting(contentEl)
            .setName('Access Key ID')
            .setDesc('The access key ID for your S3 account')
            .addText(text => text
                .setValue(cloudDiskModel.s3Config.accessKeyId || '')
                .onChange(async (value) => {
                    cloudDiskModel.s3Config.accessKeyId = value;
                }));

        // Secret Access Key
        const secretKeySetting = new Setting(contentEl)
            .setName('Secret Access Key')
            .setDesc('The secret access key for your S3 account')
            .addText(text => {
                text
                    .setValue(cloudDiskModel.s3Config.secretAccessKey || '')
                    .onChange(async (value) => {
                        cloudDiskModel.s3Config.secretAccessKey = value;
                    });
                text.inputEl.type = 'password';
            });

        secretKeySetting.addExtraButton(button => {
            button
                .setIcon('eye')
                .setTooltip(i18n.t('settingTab.key.showPassword'))
                .onClick(() => {
                    const inputEl = secretKeySetting.controlEl.querySelector('input');
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

        // Bucket 名称
        new Setting(contentEl)
            .setName('bucket')
            .addText(text => text
                .setValue(cloudDiskModel.s3Config.bucket || '')
                .onChange(async (value) => {
                    cloudDiskModel.s3Config.bucket = value;
                }));

        // 测试连接按钮
        new Setting(contentEl)
            .addButton(btn => btn
                .setButtonText('Test Connection')
                .setCta()
                .onClick(async () => {
                    try {
                        const client = S3Client.getInstance();
                        client.updateConfig(cloudDiskModel.s3Config);
                        await client.listObjects();
                        new Notice('Test connection successful');
                    } catch (err) {
                        new Notice('Test connection failed');
                        console.error('S3 连接测试失败:', err);
                    }
                }));

        // 保存按钮
        new Setting(contentEl)
            .addButton(btn => btn
                .setButtonText('Save')
                .setCta()
                .onClick(async () => {
                    const client = S3Client.getInstance();
                    client.updateConfig(cloudDiskModel.s3Config);
                    this.onSubmit(cloudDiskModel.s3Config);
                    this.close();
                }));
    }

    onClose() {
        const { contentEl } = this;
        contentEl.empty();
    }
}

