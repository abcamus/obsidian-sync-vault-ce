import { FileEntry } from "../service/cloud-interface";
import { cloudDiskModel } from "../model/cloud-disk-model";
import * as util from "../util";

const logger = util.logger.createLogger("snapshot");

export class Snapshot {
    private _data: Record<string, FileEntry>;

    private constructor(files: FileEntry[]) {
        this._data = {};
        logger.debug(`[Snapshot] remoteRoot: ${cloudDiskModel.remoteRootPath}`);
        const remoteRoot = cloudDiskModel.remoteRootPath;
        for (const file of files) {
            const relativePath = util.path.relative(remoteRoot, file.path);
            this._data[relativePath] = file;
        }
    }

    static createWithFiles(files: FileEntry[]): Snapshot {
        return new Snapshot(files);
    }

    get size(): number {
        return Object.keys(this._data).length;
    }

    get files(): FileEntry[] {
        return Object.values(this._data);
    }

    get data(): Record<string, FileEntry> {
        return this._data;
    }

    toJSON(): string {
        return JSON.stringify(this._data, null, 2);
    }
}
