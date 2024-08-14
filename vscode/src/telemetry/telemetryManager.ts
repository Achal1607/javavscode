import { ConfigurationChangeEvent, ExtensionContext, OutputChannel, Uri, window, workspace } from "vscode";
import { AnonymousIdManager } from "./impl/AnonymousIdManager";
import { TelemetryPrefs } from "./impl/telemetryPrefs";
import { TelemetryEventQueue } from "./impl/telemetryEventQueue";
import { readPackageJson } from "./utils/utils";
import { getStaticInfo } from "./impl/staticInfoImpl";
import { TelemetryServiceImpl } from "./impl/telemetryServiceImpl";
import { CacheService, StaticInfo, TelemetryService } from "./types";
import { TELEMETRY_COMMAND } from "./utils/constants";
import { CacheServiceImpl } from "./impl/cacheServiceImpl";
import * as path from "path";

export class TelemetryManager {
    private extensionContext: ExtensionContext;
    private settings: TelemetryPrefs = new TelemetryPrefs();
    private anonymousId: AnonymousIdManager = new AnonymousIdManager();
    private environment?: StaticInfo;
    private reporter?: TelemetryService;
    private packageJson?: any;
    private cacheService?: CacheService;
    public logger: OutputChannel;

    constructor(extensionContext: ExtensionContext) {
        this.extensionContext = extensionContext;
        this.logger = window.createOutputChannel("Oracle Java Telemetry");
    }

    public async setStaticInfo(): Promise<TelemetryManager> {
        if (!this.packageJson) {
            await this.setPackageJson();
        }
        this.environment = await getStaticInfo(this.extensionContext, this.packageJson);
        return this;
    }
    public async setCacheService(): Promise<TelemetryManager> {
        const cachePath = Uri.joinPath(this.extensionContext.globalStorageUri, "telemetry", "cache");
        this.cacheService = new CacheServiceImpl(cachePath)
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
        if (!this.cacheService) {
            await this.setCacheService()
        }

        const queue = new TelemetryEventQueue();
        this.reporter = new TelemetryServiceImpl(queue, this.anonymousId!, this.settings, this.environment!, this.logger, this.cacheService!);
        this.extensionContext.subscriptions.push(this.onDidChangeTelemetryEnabled());
        this.openTelemetryDialog();

        return this;
    }

    public getReporter(): TelemetryService {
        if (!this.reporter) {
            throw new Error("Reporter not initiaized");
        }
        return this.reporter;
    }

    private openTelemetryDialog = async () => {
        if (!this.settings.isExtTelemetryConfigured() && !this.settings.didUserDisableVscodeTelemetry()) {
            this.logger.appendLine("Telemetry not enabled yet!!");
            const enable = await window.showInformationMessage(`Do you want to enable telemetry for ${this?.packageJson?.name} extension?`, "Yes", "No");
            if (enable == undefined) {
                return;
            }
            await this.settings.updateTelemetryEnabledConfig(enable === "Yes");
            if (enable === "Yes") {
                this.logger.appendLine("Telemetry is now enabled!!");
            }
        }
    }

    private onDidChangeTelemetryEnabled = () => {
        return workspace.onDidChangeConfiguration(
            (e: ConfigurationChangeEvent) => {
                if (e.affectsConfiguration(TELEMETRY_COMMAND) || e.affectsConfiguration("telemetry")) {
                    this.reporter?.flushQueue();
                }
            }
        );
    }

};