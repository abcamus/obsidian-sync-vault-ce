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
        contentEl.createEl('h2', { text: i18n.t('modal.s3Config.title') });

        // Endpoint 配置
        new Setting(contentEl)
            .setName(i18n.t('modal.s3Config.endpoint'))
            .setDesc(i18n.t('modal.s3Config.endpointDesc'))
            .addText(text => text
                .setPlaceholder('https://s3.amazonaws.com')
                .setValue(cloudDiskModel.s3Config.endpoint || '')
                .onChange(async (value) => {
                    cloudDiskModel.s3Config.endpoint = value;
                }));

        // Region 配置
        new Setting(contentEl)
            .setName(i18n.t('modal.s3Config.region'))
            .setDesc(i18n.t('modal.s3Config.regionDesc'))
            .addText(text => text
                .setPlaceholder('us-east-1')
                .setValue(cloudDiskModel.s3Config.region || 'us-east-1')
                .onChange(async (value) => {
                    cloudDiskModel.s3Config.region = value;
                }));

        // Access Key ID
        new Setting(contentEl)
            .setName(i18n.t('modal.s3Config.accessKeyId'))
            .setDesc(i18n.t('modal.s3Config.accessKeyIdDesc'))
            .addText(text => text
                .setValue(cloudDiskModel.s3Config.accessKeyId || '')
                .onChange(async (value) => {
                    cloudDiskModel.s3Config.accessKeyId = value;
                }));

        // Secret Access Key
        new Setting(contentEl)
            .setName(i18n.t('modal.s3Config.secretAccessKey'))
            .setDesc(i18n.t('modal.s3Config.secretAccessKeyDesc'))
            .addText(text => {
                text
                    .setValue(cloudDiskModel.s3Config.secretAccessKey || '')
                    .onChange(async (value) => {
                        cloudDiskModel.s3Config.secretAccessKey = value;
                    });
                text.inputEl.type = 'password';
            });

        // Bucket 名称
        new Setting(contentEl)
            .setName(i18n.t('modal.s3Config.bucket'))
            .setDesc(i18n.t('modal.s3Config.bucketDesc'))
            .addText(text => text
                .setValue(cloudDiskModel.s3Config.bucket || '')
                .onChange(async (value) => {
                    cloudDiskModel.s3Config.bucket = value;
                }));

        // 测试连接按钮
        new Setting(contentEl)
            .addButton(btn => btn
                .setButtonText(i18n.t('modal.s3Config.testConnection'))
                .setCta()
                .onClick(async () => {
                    try {
                        const client = S3Client.getInstance();
                        await client.listObjects();
                        new Notice(i18n.t('modal.s3Config.testSuccess'));
                    } catch (err) {
                        new Notice(i18n.t('modal.s3Config.testFailed'));
                        console.error('S3 连接测试失败:', err);
                    }
                }));

        // 保存按钮
        new Setting(contentEl)
            .addButton(btn => btn
                .setButtonText('Save')
                .setCta()
                .onClick(async () => {
                    this.onSubmit(cloudDiskModel.s3Config);
                    this.close();
                }));
    }

    onClose() {
        const { contentEl } = this;
        contentEl.empty();
    }
}