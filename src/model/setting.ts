import { CloudDiskType } from '../service/cloud-interface';

export interface SyncVaultPluginSetting {
	syncPath: string;
	selectedCloudDisk: CloudDiskType;
	uploadStrategy: 'userControl';
	downloadStrategy: 'autoOnLoad' | 'manual';
	accessToken: string;
	expiryAt: string;
	logMode: boolean;
	encryptMode: boolean;
	password: string;
	fileSizeLimit: number; // in MB
}

export const DEFAULT_SETTINGS: SyncVaultPluginSetting = {
	syncPath: 'test',
	selectedCloudDisk: CloudDiskType.Aliyun,
	uploadStrategy: 'userControl',
	downloadStrategy: 'manual',
	accessToken: '',
	expiryAt: '',
	logMode: false,
	encryptMode: false,
	password: '',
	fileSizeLimit: 100, // 100MB
}
