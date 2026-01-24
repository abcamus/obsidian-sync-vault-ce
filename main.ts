import { Plugin, Workspace, Notice } from 'obsidian';

import { cloudDiskModel } from "@/model/cloud-disk-model";
import { DEFAULT_SETTINGS, SyncVaultPluginSetting } from '@/model/setting';
import { SyncVaultPluginView, CLOUD_DISK_VIEW } from "@/view/content-view";
import { CloudDiskType, getCloudDiskName } from '@/types';
import { Service } from '@/service';
import * as util from '@/util';
import { i18n } from '@/i18n';
import { LabeledSettingTab } from '@/view/label-setting-tab';
import { myExtension } from '@/extension/highlight-todo';
import { imageViewPlugin } from '@/extension/image-viewer';

const logger = util.logger.createLogger('SyncVaultPlugin');

export default class SyncVaultPlugin extends Plugin {
	settings: SyncVaultPluginSetting;
	currentView: string = CLOUD_DISK_VIEW;

	async loadSettings() {
		this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
		const vaultName = this.app.vault.getName();
		this.settings.syncPath = vaultName; // force the syncPath the same as vault name
		cloudDiskModel.autoMode = this.settings.downloadStrategy === 'autoOnLoad';
		cloudDiskModel.selectedCloudDisk = this.settings.selectedCloudDisk as CloudDiskType;
		cloudDiskModel.password = this.settings.password;
		cloudDiskModel.remoteRootPath = this.settings.syncPath;
		cloudDiskModel.accessToken = this.settings.accessToken;
		cloudDiskModel.encryptMode = this.settings.encryptMode;
		cloudDiskModel.fileSizeLimit = this.settings.fileSizeLimit;
		const cloudDiskName = this.settings.cloudDiskName;
		cloudDiskModel.webdavUrl = this.settings.webDAVAccount[cloudDiskName]?.url || '';
		cloudDiskModel.webdavUsername = this.settings.webDAVAccount[cloudDiskName]?.name || '';
		cloudDiskModel.webdavPassword = this.settings.webDAVAccount[cloudDiskName]?.password || '';
		this.currentView = CLOUD_DISK_VIEW;

		cloudDiskModel.ftpConfig.server = this.settings.ftpAccount.url;
		cloudDiskModel.ftpConfig.port = this.settings.ftpAccount.port;
		cloudDiskModel.ftpConfig.remotePath = this.settings.ftpAccount.path;
		cloudDiskModel.ftpConfig.username = this.settings.ftpAccount.username;
		cloudDiskModel.ftpConfig.password = this.settings.ftpAccount.password;

		cloudDiskModel.s3Config.accessKeyId = this.settings.s3Account.accessKeyId;
		cloudDiskModel.s3Config.secretAccessKey = this.settings.s3Account.secretAccessKey;
		cloudDiskModel.s3Config.region = this.settings.s3Account.region;
		cloudDiskModel.s3Config.endpoint = this.settings.s3Account.endpoint;
		cloudDiskModel.s3Config.bucket = this.settings.s3Account.bucket;

		logger.info({
			cloudType: cloudDiskModel.selectedCloudDisk,
			cloudName: cloudDiskName,
			webDAVURL: cloudDiskModel.webdavUrl,
			webDAVName: cloudDiskModel.webdavUsername,
			webDAVPassword: cloudDiskModel.webdavPassword
		});
	}

	async saveSettings() {
		cloudDiskModel.autoMode = this.settings.downloadStrategy === 'autoOnLoad';
		cloudDiskModel.selectedCloudDisk = this.settings.selectedCloudDisk as CloudDiskType;
		cloudDiskModel.remoteRootPath = this.settings.syncPath;
		cloudDiskModel.password = this.settings.password;
		cloudDiskModel.accessToken = this.settings.accessToken;
		cloudDiskModel.encryptMode = this.settings.encryptMode;
		const cloudDiskName = this.settings.cloudDiskName;
		cloudDiskModel.webdavUrl = this.settings.webDAVAccount[cloudDiskName]?.url || '';
		cloudDiskModel.webdavUsername = this.settings.webDAVAccount[cloudDiskName]?.name || '';
		cloudDiskModel.webdavPassword = this.settings.webDAVAccount[cloudDiskName]?.password || '';

		await this.saveData(this.settings);
	}

	isTokenExpired(tokenExpiryAt: string): boolean {
		const expiryDate = new Date(tokenExpiryAt);

		/* GMT时间 */
		const currentDate = new Date(); // 获取当前日期

		// 比较日期
		logger.debug(`expiryDate: ${expiryDate}, currentDate: ${currentDate}`);
		return expiryDate.getTime() <= currentDate.getTime();
	}

	async checkAndRefreshToken(): Promise<boolean> {
		const tokenExpiredAt = this.settings.expiryAt;
		if (this.isTokenExpired(tokenExpiredAt)) {
			logger.info('access token expired');
			return false;
		}
		return true;
	}

	async checkAndRefreshTokenInterval(): Promise<boolean> {
		const diskName = getCloudDiskName(cloudDiskModel.selectedCloudDisk);

		/* 比较当前时间和expires_at，如果小于当前时间，则刷新token,expires_at格式为2025-01-09 08:24:50 */
		if (!this.isTokenExpired(cloudDiskModel.tokenExpiryAt)) {
			logger.debug(`${diskName} access token 未过期, 有效期: ${cloudDiskModel.tokenExpiryAt}`);
			return true;
		}

		cloudDiskModel.isTokenValid = await this.checkAndRefreshToken();
		return cloudDiskModel.isTokenValid;
	}

	async onload() {
		logger.info(`hello: ${this.app.vault.getName()}`);
		await this.loadSettings();

		cloudDiskModel.pluginHomeDir = this.manifest.dir!;

		this.registerInterval(
			/* 每分钟检查一次token */
			window.setInterval(async () => await this.checkAndRefreshTokenInterval(), 1000 * 60)
		);

		this.addSettingTab(new LabeledSettingTab(this.app, this));

		this.addRibbonIcon('cloud', i18n.t('plugin.title'), async (evt) => {
			const { workspace } = this.app;
			this.toggleView(workspace);
		});

		this.registerView(
			CLOUD_DISK_VIEW,
			(leaf) => new SyncVaultPluginView(leaf, this.app, this)
		);

		this.registerObsidianProtocolHandler('sync-vault-auth-cb', async (params) => {
			const { action, code, state } = params;
			if (action === 'sync-vault-auth-cb') {
				if (code) {
					logger.debug(`get token, code: ${code}`);
					const data = await Service.auth.authorize('get_token', { 'code': code, 'state': state });
					const { access_token, expires_at } = data;
					if (!access_token || !expires_at) {
						new Notice('acquire access token failed');
						return;
					}
					this.settings.accessToken = access_token;
					this.settings.expiryAt = expires_at;
					logger.debug(`access token: ${access_token}, expires_at: ${expires_at}`);
					this.saveSettings();
					new Notice(i18n.t('plugin.authorize.success'));
				}
			}
		});

		this.registerEditorExtension(myExtension);
		// this.registerEditorSuggest(new CustomLinkSuggest(this.app));
		this.registerEditorExtension(imageViewPlugin);

		this.registerMarkdownPostProcessor((el, ctx) => {
			// 查找所有图片
			el.querySelectorAll('img').forEach(img => {
				const src = img.getAttribute('src');
				if (src && src.includes('pan.baidu.com')) {
					// 这里可以异步获取真实图片链接
					// 这里只做占位演示
					img.src = "https://placehold.co/600x400/e5e7eb/000?text=BD+Image&font=roboto";
					img.alt = "百度网盘图片";
					img.style.maxWidth = "400px";
					img.style.border = "1px solid #eee";
				}
			});
		});

		cloudDiskModel.vault = this.app.vault;

		util.LogService.init(this.app, this.manifest.dir!);
	}

	async openContentView(workspace: Workspace) {
		try {
			const leaf = workspace.getLeftLeaf(false);
			await leaf?.setViewState({ type: this.currentView, active: true });
			if (leaf) {
				await workspace.revealLeaf(leaf);
			}

		} catch (error) {
			logger.error('打开视图失败:', error);
		}
	}

	async closeContentView() {
		const { workspace } = this.app;

		workspace.detachLeavesOfType(this.currentView);
	}

	async toggleView(workspace: Workspace) {
		const leaves = workspace.getLeavesOfType(this.currentView);

		if (leaves.length === 0) {
			this.openContentView(workspace);
		} else {
			/* focus on current view */
			workspace.revealLeaf(leaves[0]);
		}
	}

	async onunload() {
		logger.info('exiting...');

		try {
			const queue = util.SmartQueue.getInstance();
			const stats = queue.getQueueStats();

			// 计算所有类型的活动任务和待处理任务总数
			const totalActive = Object.values(stats).reduce(
				(sum, typeStats) => sum + typeStats.activePromises, 0
			);
			const totalPending = Object.values(stats).reduce(
				(sum, typeStats) => sum + typeStats.queueLength, 0
			);

			if (totalActive > 0 || totalPending > 0) {
				// 按任务类型输出详细信息
				const details = Object.entries(stats)
					.map(([type, typeStats]) =>
						`- ${type}:\n` +
						`  活动任务: ${typeStats.activePromises}\n` +
						`  待处理: ${typeStats.queueLength}`
					)
					.join('\n');

				logger.debug(
					`等待任务队列完成:\n` +
					`总计:\n` +
					`- 活动任务: ${totalActive}\n` +
					`- 待处理任务: ${totalPending}\n\n` +
					`详细信息:\n${details}`
				);

				await queue.shutdown();
			}

		} catch (error) {
			logger.error('关闭任务队列失败:', error);
		}

		logger.info('Bye!');
	}

	async authorize(callback: (isAuthorized: boolean) => void): Promise<void> {
		logger.info('start authorize');
		await Service.auth.authorize('get_code');
		/* TODO: notify */
		if (callback) {
			callback(true);
		}
	}
}
