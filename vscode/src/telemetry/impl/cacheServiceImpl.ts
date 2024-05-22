import { Uri } from "vscode";
import { CacheService } from "../types";
import { exists, getHashCode, mkdir, readFile, writeFile } from "../utils/utils";

export class CacheServiceImpl implements CacheService {

    private cacheMap = new Map<string, string>();
    constructor(private cachePath: Uri) { }

    get = async (key: string): Promise<string | undefined> => {
        try {
            const filePath = Uri.joinPath(this.cachePath, `${key}.txt`);
            const isFileExists = await exists(filePath);
            if (!isFileExists) {
                throw new Error("key doesn't exists");
            }
            if (this.cacheMap.has(key)) {
                return this.cacheMap.get(key);
            }
            const value = await readFile(filePath);
            return value;
        } catch (err) {
            return undefined;
        }
    }

    put = async (key: string, value: string): Promise<boolean> => {
        try {
            const filePath = Uri.joinPath(this.cachePath, `${key}.txt`);
            const flag = await this.isCacheDirExists();
            if (!flag) {
                await mkdir(this.cachePath);
            }
            const hash = getHashCode(value);
            await writeFile(filePath, hash);
            this.cacheMap.set(key, hash);

            return true;
        } catch (err) {
            return false;
        }
    }

    getCachePath = (): Uri => {
        return this.cachePath;
    }

    isCacheDirExists = async (): Promise<boolean> => {
        return await exists(this.cachePath)
    }
}