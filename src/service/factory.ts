import { CloudDownloadService, CloudUploadService, CloudInfoService, CloudFileManagementService } from "./cloud-disk-service";
import { CloudDiskType } from "./cloud-interface";
import { AliyunService } from "./vendor/aliyun";
import { cloudDiskModel } from "../model/cloud-disk-model";
import { WebdavService } from "./vendor/webdav";

export class CloudService {
    private downloadService: CloudDownloadService;
    private uploadService: CloudUploadService;
    private infoService: CloudInfoService;
    private fileMngService: CloudFileManagementService;
    static instances: Record<CloudDiskType, CloudService | null> = {
        [CloudDiskType.Aliyun]: null,
        [CloudDiskType.Webdav]: null,
        [CloudDiskType.Unknown]: null,
    };

    private constructor(cloudType: CloudDiskType) {
        switch (cloudType) {
            case CloudDiskType.Aliyun:
                this.downloadService = new AliyunService.AliyunDownloadService();
                this.uploadService = new AliyunService.AliyunUploadService();
                this.infoService = new AliyunService.AliyunInfoService();
                this.fileMngService = new AliyunService.AliyunFileManagementService();
                CloudService.instances[CloudDiskType.Aliyun] = this;
                break;
            case CloudDiskType.Webdav:
                this.downloadService = new WebdavService.WebdavDownloadService();
                this.uploadService = new WebdavService.WebdavUploadService();
                this.infoService = new WebdavService.WebdavInfoService();
                this.fileMngService = new WebdavService.WebdavFileManagementService();
                CloudService.instances[CloudDiskType.Webdav] = this;
                break;
        }
    }

    static getService(): CloudService {
        if (!CloudService.instances[cloudDiskModel.selectedCloudDisk]) {
            CloudService.instances[cloudDiskModel.selectedCloudDisk] = new CloudService(cloudDiskModel.selectedCloudDisk);
        }
        return CloudService.instances[cloudDiskModel.selectedCloudDisk]!;
    }

    static get download(): CloudDownloadService {
        return CloudService.getService().downloadService;
    }

    static get upload(): CloudUploadService {
        return CloudService.getService().uploadService;
    }

    static get info(): CloudInfoService {
        return CloudService.getService().infoService;
    }

    static get fileMng(): CloudFileManagementService {
        return CloudService.getService().fileMngService;
    }
}