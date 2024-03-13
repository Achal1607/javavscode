import * as os from 'os';
import { env as vscodeEnv, version, ExtensionContext } from 'vscode';
import { promisify } from 'util';
import * as getos from 'getos';
import { LinuxOs } from 'getos';
import { StaticInfo } from '../types';

export const PLATFORM = getPlatform();
export const ARCH_TYPE = getArchType();
export const PLATFORM_VERSION = getPlatformVersion();
export const DISTRO = getDistribution();
export const TIMEZONE = getTimeZone();
export const LOCALE = getLocale();
export const USERNAME = getUsername();


function getPlatform(): string {
    const platform: string = os.platform();
    if (platform.startsWith('darwin')) {
        return 'Mac';
    }
    if (platform.startsWith('win')) {
        return 'Windows';
    }
    return platform.charAt(0).toUpperCase() + platform.slice(1);
}

function getArchType(): string {
    return os.arch();
}

function getPlatformVersion(): string {
    return os.version();
}

function getTimeZone(): string {
    return Intl.DateTimeFormat().resolvedOptions().timeZone;
}

function getLocale(): string {
    return Intl.DateTimeFormat().resolvedOptions().locale;
}

async function getDistribution(): Promise<string | undefined> {
    if (os.platform() === 'linux') {
        const platorm = await promisify(getos)() as LinuxOs;
        return platorm.dist;
    }
    return undefined;
}

function getUsername(): string | undefined {
    const env = process.env || {};
    let username = (
        env.SUDO_USER ||
        env.LOGNAME ||
        env.USER ||
        env.LNAME ||
        env.USERNAME
    );
    if (!username) {
        username = os.userInfo()?.username;
    }
    return username;
}

export async function getStaticInfo(context: ExtensionContext, packageJson: any): Promise<StaticInfo> {
    return {
        extension: {
            id: context.extension.id,
            name: packageJson.name,
            version: packageJson.version
        },
        vscodeInfo: {
            name: vscodeEnv.appName,
            version: version,
            host: vscodeEnv.appHost,
            locale: vscodeEnv.language,
        },
        platform: {
            name: PLATFORM,
            archType: ARCH_TYPE,
            version: PLATFORM_VERSION,
            distribution: await DISTRO
        },
        location: {
            timezone: TIMEZONE,
            locale: LOCALE,
            country: ''
        },
        username: USERNAME
    };
}