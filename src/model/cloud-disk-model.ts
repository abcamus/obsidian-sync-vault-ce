import { Notice, TFile, TFolder, TAbstractFile, Vault } from "obsidian";
import * as util from "../util";
import { Service } from "../service";
import { RemoteMeta } from "./meta-info";
import { createLogger } from "../util/logger";
import { VaultModel } from "./vault-model";
import { CloudDiskType, UserInfo, StorageInfo } from "src/service/cloud-interface";

const logger = createLogger('cloud-disk-model');

function validateRemoteMeta(metaContent: string): boolean {
	try {
		const meta = JSON.parse(metaContent);
		return meta.name === 'remoteRoot' && Array.isArray(meta.children);
	} catch (error) {
		logger.error('validateRemoteMeta failed', error);
		return false;
	}
}

class CloudDiskModel {
	private static instance: CloudDiskModel;

	info: { user: UserInfo; storage: StorageInfo };
	remoteMeta: RemoteMeta | null = null;
	pluginHomeDir: string = '';
	selectedCloudDisk: CloudDiskType = CloudDiskType.Unknown;
	remoteRoot: string = '';
	vault: Vault;

	cloudInitialized: Record<string, boolean> = {};

	/* auth */
	accessToken: string = '';
	refreshToken: string = '';
	tokenExpiryAt: string = '';

	/* sync */
	autoMode: boolean = false;

	/* log */
	logMode: boolean = false;

	/* encryption */
	encryptMode: boolean = false;
	password: string;

	/* ignore files */
	ignorePattern: string = '';
	fileSizeLimit: number = 100; // in MB

	private constructor() {
		this.info = { user: {} as UserInfo, storage: {} as StorageInfo };
	}

	static getInstance(): CloudDiskModel {
		if (!CloudDiskModel.instance) {
			CloudDiskModel.instance = new CloudDiskModel();
		}
		return CloudDiskModel.instance;
	}

	async getInfo(): Promise<{ user: UserInfo; storage: StorageInfo }> {
		logger.debug(`[getInfo] selectedCloudDisk: ${this.selectedCloudDisk}, cloudInitialized: ${this.cloudInitialized[this.selectedCloudDisk]}`)
		if (!this.cloudInitialized[this.selectedCloudDisk]) {
			logger.debug(`[getInfo] initBasicInfo`)
			await this.initBasicInfo();
			this.cloudInitialized[this.selectedCloudDisk] = true;
			logger.info(`hello, ${this.info.user.user_name}`)
		}

		return this.info;
	}

	async initBasicInfo() {
		const user = await Service.info.userInfo();
		const storage = await Service.info.storageInfo();

		if (user === null || storage === null) {
			new Notice('初始化网盘信息失败');
			return;
		}


		this.info = { user, storage };
	}

	get initialized(): boolean {
		return this.cloudInitialized[this.selectedCloudDisk] ?? false;
	}

	set initialized(initialized: boolean) {
		this.cloudInitialized[this.selectedCloudDisk] = initialized;

		if (initialized) {
			new Notice(`${this.selectedCloudDisk} initialized`);
		}
	}

	async getRemoteMeta(): Promise<RemoteMeta> {
		const remoteMetaPath = util.path.join(this.remoteRoot, '.meta', 'data.json');
		if (this.remoteMeta === null) {
			let metaContent = await Service.download.downloadFileAsString(remoteMetaPath);
			if (metaContent === null || !validateRemoteMeta(metaContent)) {
				logger.debug(`no remote meta found at: ${remoteMetaPath}, build a new one`);
				metaContent = JSON.stringify({
					name: 'remoteRoot',
					children: [],
				});
			}

			this.remoteMeta = JSON.parse(metaContent);
		}
		return this.remoteMeta!;
	}

	async getLocalFileContent(localPath: string): Promise<Uint8Array | null> {
		const file = this.vault.getFileByPath(localPath);
		if (file === null) {
			return null;
		}
		return new Uint8Array(await this.vault.readBinary(file));
	}

	async ensureFileExists(filePath: string): Promise<TAbstractFile | null> {
		const file = this.vault.getAbstractFileByPath(filePath);

		if (file !== null) {
			return file;
		}

		const dirPath = util.path.dirname(filePath);
		const dirExists = await this.vault.adapter.exists(dirPath);
		if (!dirExists) {
			await this.vault.adapter.mkdir(dirPath);
		}
		if (!(await this.vault.adapter.exists(filePath))) {
			await this.vault.create(filePath, "");
		}
		return this.vault.getAbstractFileByPath(filePath);
	}

	async saveLocalMeta() {
		const localMeta = await VaultModel.getVaultAsFileTree(this.vault);
		const localMetaPath = util.path.join('.meta', 'data.json');
		await this.ensureFileExists(localMetaPath);
		await this.vault.adapter.write(localMetaPath, JSON.stringify(localMeta, null, 2));
		logger.info(`saved local meta at: ${localMetaPath}`);
	}

	reset() {
		this.remoteMeta = null;
		this.accessToken = '';
		this.refreshToken = '';
		this.tokenExpiryAt = '';
		this.cloudInitialized = {};
	}

	set remoteRootPath(remoteRoot: string) {
		this.remoteRoot = util.path.join('/apps/sync-vault', remoteRoot);
	}

	get remoteRootPath(): string {
		return this.remoteRoot;
	}
}

export const cloudDiskModel = CloudDiskModel.getInstance();