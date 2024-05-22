import * as path from 'path';
import * as fs from 'fs';
import * as crypto from 'crypto';
import { getTimezone } from 'countries-and-timezones';
import { Uri, workspace } from 'vscode';

export const getCurrentUTCDateInSeconds = () => {
    const date = Date.now();
    return Math.floor(date / 1000);
}

export const getOriginalDateFromSeconds = (seconds: number) => {
    return new Date(seconds * 1000);
}

export const readPackageJson = async (extensionPath: string): Promise<any> => {
    const packageJsonPath = path.resolve(extensionPath, 'package.json');
    const rawdata = await fs.promises.readFile(packageJsonPath);
    const packageJson = JSON.parse(rawdata.toString());
    return packageJson;
}

export const getCountry = (timezone: string): string => {
    const tz = getTimezone(timezone);
    if (tz && tz?.countries) {
        return tz.countries[0];
    }
    return "Not found";
}

export const exists = async (pathOrUri: Uri | string): Promise<boolean> => {
    const uri = getUri(pathOrUri);
    try {
        await workspace.fs.stat(uri);
        return true;
    } catch (e) {
        return false;
    }
}

export const writeFile = async (pathOrUri: Uri | string, content: string): Promise<void> => {
    const uri = getUri(pathOrUri);
    const parent = Uri.joinPath(uri, "..");
    if (!(await exists(parent))) {
        await mkdir(parent);
    }
    const res: Uint8Array = new TextEncoder().encode(content);
    return workspace.fs.writeFile(uri, res);
}

export const readFile = async (pathOrUri: Uri | string): Promise<string | undefined> => {
    const uri = getUri(pathOrUri);
    if (!(await exists(uri))) {
        return undefined;
    }
    const read = await workspace.fs.readFile(uri);
    return new TextDecoder().decode(read);
}

export const mkdir = async (pathOrUri: Uri | string): Promise<void> => {
    const uri = getUri(pathOrUri);
    await workspace.fs.createDirectory(uri);
}

export const getHashCode = (value: string) => {
    const hash: string = crypto.createHash('sha256').update(value).digest('hex');
    return hash;
}

const getUri = (pathOrUri: Uri | string): Uri => {
    if (pathOrUri instanceof Uri) {
        return pathOrUri;
    }
    return Uri.file(pathOrUri);
}
