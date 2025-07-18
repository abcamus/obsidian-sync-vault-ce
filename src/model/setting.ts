import { CloudDiskType } from '../service/cloud-interface';

export interface SyncVaultPluginSetting {
	syncPath: string;
	selectedCloudDisk: CloudDiskType;
	cloudDiskName: string;
	uploadStrategy: 'userControl';
	downloadStrategy: 'autoOnLoad' | 'manual';
	accessToken: string;
	expiryAt: string;
	logMode: boolean;
	encryptMode: boolean;
	password: string;
	fileSizeLimit: number; // in MB
	webDAVAccount: Record<string, {
		url: string,
		name: string;
		password: string;
	}>;
}

export const DEFAULT_SETTINGS: SyncVaultPluginSetting = {
	syncPath: 'test',
	selectedCloudDisk: CloudDiskType.Aliyun,
	cloudDiskName: 'aliyun',
	uploadStrategy: 'userControl',
	downloadStrategy: 'manual',
	accessToken: '',
	expiryAt: '',
	logMode: false,
	encryptMode: false,
	password: '',
	fileSizeLimit: 100, // 100MB
	webDAVAccount: {}
}
