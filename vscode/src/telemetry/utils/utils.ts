import * as path from 'path';
import * as fs from 'fs';
export const getCurrentUTCDateInSeconds = () => {
    const date = Date.now();
    return Math.floor(date/1000);
}

export const getOriginalDateFromSeconds = (seconds : number) => {
    return new Date(seconds*1000);
}

export const readPackageJson = async (extensionPath: string): Promise<any> => {
    const packageJsonPath = path.resolve(extensionPath, 'package.json');
    const rawdata = await fs.promises.readFile(packageJsonPath);
    const packageJson = JSON.parse(rawdata.toString());
    return packageJson;
}