import { ConfigurationChangeEvent, ExtensionContext, window, workspace } from "vscode";
import { AnonymousIdManager } from "./impl/AnonymousIdManager";
import { TelemetryPrefs } from "./impl/telemetryPrefs";
import { TelemetryEventQueue } from "./impl/telemetryEventQueue";
import { readPackageJson } from "./utils/utils";
import { getStaticInfo } from "./impl/staticInfoImpl";
import { TelemetryServiceImpl } from "./impl/telemetryServiceImpl";
import { StaticInfo, TelemetryService } from "./types";
import { ElasticDatabase } from "./database/localAnalytics";
import { TELEMETRY_COMMAND } from "./utils/constants";

export class TelemetryManager {
    private extensionContext: ExtensionContext;
    private settings: TelemetryPrefs = new TelemetryPrefs();
    private anonymousId: AnonymousIdManager = new AnonymousIdManager();
    private environment?: StaticInfo;
    private reporter?: TelemetryService;
    private packageJson?: any;
    private client?: ElasticDatabase;

    constructor(extensionContext: ExtensionContext) {
        this.extensionContext = extensionContext;
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
        if (!this.client) {
            this.client = new ElasticDatabase();
        }

        const queue = new TelemetryEventQueue();
        this.reporter = new TelemetryServiceImpl(this.client, queue, this.anonymousId!, this.settings, this.environment!);
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
            const enable = await window.showInformationMessage(`Do you want to enable telemetry for ${this?.packageJson?.name} extension?`, "Yes", "No");
            if(enable == undefined) return;
            await this.settings.updateTelemetryEnabledConfig(enable === "Yes");
        }
    }

    private onDidChangeTelemetryEnabled = () => {
        return workspace.onDidChangeConfiguration(
            (e: ConfigurationChangeEvent) => {
              if (e.affectsConfiguration(TELEMETRY_COMMAND) || e.affectsConfiguration("telemetry")) {
                this.reporter.flushQueue();
              }
            }
          );
    }

};