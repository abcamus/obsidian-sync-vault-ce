import { cloudAuthService } from './auth';
import { CloudService } from './factory';

/* 提供各种服务 */
export const Service = {
  get download() { return CloudService.download; },
  get upload() { return CloudService.upload; },
  get fileMng() { return CloudService.fileMng; },
  get info() { return CloudService.info; },
  auth: cloudAuthService,
};