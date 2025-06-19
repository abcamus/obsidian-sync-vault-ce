import * as md5 from './md5';
import * as path from './path';
import * as logger from './logger';
import * as uuid from './uuid';
import { LogService } from './file-log';
import { SimpleQueue } from './queue/simple-queue';
import { SmartQueue } from './queue/smart-queue';
import * as time from './time';
import * as encryption from './encryption';

function generateRandomString(length: number = 16): string {
    const array = new Uint8Array(length);
    crypto.getRandomValues(array);
    return Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('');
}

export {
    md5,
    path,
    logger,
    uuid,
    encryption,
    time,
    LogService, SimpleQueue, SmartQueue,
    generateRandomString
};
