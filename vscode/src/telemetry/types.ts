export interface StaticInfo {
    extension: ExtensionInfo,
    vscodeInfo: VscodeInfo,
    platform: Platform,
    location?: Location,
    username?: string
}

export interface ExtensionInfo {
    id: string,
    name: string,
    version: string
}

export interface VscodeInfo {
    name: string,
    version: string,
    host: string,
    locale: string
}
export interface Platform {
    name: string,
    archType?: string,
    distribution?: string,
    version?: string
}

export interface Location {
    timezone?: string,
    locale?: string,
    country?: string,
}

export interface TelemetryEvent {
    machineId?: string,
    sessionId?: string,
    type: string,
    name: string,
    data?: any
}

export interface TelemetryService {
    startEvent(event: TelemetryEvent): Promise<void>;

    send(event: TelemetryEvent): Promise<void>;

    closeEvent(event: TelemetryEvent): Promise<void>;

    flushQueue(): Promise<void>;

    dispose(): Promise<void>;
}