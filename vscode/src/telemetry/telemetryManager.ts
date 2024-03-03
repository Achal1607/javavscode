import { ExtensionContext } from "vscode";
import { AnonymousIdManager } from "./impl/AnonymousIdManager";
import { TelemetryPrefs } from "./impl/telemetryPrefs";
import { TelemetryEventQueue } from "./impl/telemetryEventQueue";
import { readPackageJson } from "./utils/utils";
import { getStaticInfo } from "./impl/staticInfoImpl";
import { TelemetryServiceImpl } from "./impl/telemetryServiceImpl";
import { StaticInfo, TelemetryService } from "./types";

export class TelemetryManager {
    private extensionContext: ExtensionContext;
    private settings: TelemetryPrefs = new TelemetryPrefs();
    private anonymousId: AnonymousIdManager = new AnonymousIdManager();
    private environment?: StaticInfo;
    private reporter?: TelemetryService;
    private packageJson?: any;

    constructor(extensionContext: ExtensionContext) {
        this.extensionContext = extensionContext;
    }

    public async updateTelemetrySettings(enable: boolean): Promise<TelemetryManager> {
        await this.settings?.updateTelemetryEnabledConfig(enable);
        return this;
    }

    public async setStaticInfo(): Promise<TelemetryManager> {
        if (!this.packageJson) {
            await this.setPackageJson();
        }
        this.environment = await getStaticInfo(this.extensionContext, this.packageJson);
        return this;
    }

    public async setPackageJson(): Promise<TelemetryManager> {
        this.packageJson = await readPackageJson(this.extensionContext.extension.extensionPath);
        return this;
    }

    public async initializeReporter(): Promise<TelemetryManager> {
        if (!this.environment) {
            await this.setStaticInfo();
        }
        const queue = new TelemetryEventQueue();
        this.reporter = new TelemetryServiceImpl(queue, this.anonymousId!, this.settings, this.environment!);

        return this;
    }

    public getReporter(): TelemetryService {
        if (!this.reporter) {
            throw new Error("Reporter not initiaized");
        }
        return this.reporter;
    }

};