import { ERROR_TYPE_TELEMETRY } from "../utils/constants";
import { getCurrentUTCDateInSeconds } from "../utils/utils";
import { TelemetryEventQueue } from "./telemetryEventQueue";
import { TelemetryPrefs } from "./telemetryPrefs";
import { AnonymousIdManager } from "./AnonymousIdManager";
import { StaticInfo, TelemetryService, TelemetryEvent } from "../types";
import { postTelemetry } from "./ociMetrics";
import { OutputChannel } from 'vscode';

export class TelemetryServiceImpl implements TelemetryService {
    private activationTime: number = getCurrentUTCDateInSeconds();

    constructor(
        private queue: TelemetryEventQueue,
        private anonymousId: AnonymousIdManager,
        private settings: TelemetryPrefs,
        private staticInfo: StaticInfo,
        private logger: OutputChannel) {
    }

    public async send(event: TelemetryEvent): Promise<void> {
        if(!("data" in event)){
            event["data"] = {};
        }
        event.data.machineId = this.anonymousId.getMachineId();
        event.data.sessionId = this.anonymousId.getSessionId();

        if (this.settings.checkTelemetryStatus()) {
            this.sendEvent(event);
        } else if(!this.settings.isExtTelemetryConfigured()){
            this.queue.addEvent(event);
        }
    }

    private async sendEvent(event: TelemetryEvent): Promise<void> {
        try {
            if (["error", "crash"].includes(this.settings.getTelemetryLevel() || "off") && event.type != ERROR_TYPE_TELEMETRY) {
                return;
            }
            this.logger.appendLine(JSON.stringify(event, null, 4));
            const doc = await postTelemetry(event); 
            this.logger.appendLine("Telemetry Posted Successfully!!");
            this.logger.appendLine(doc.opcRequestId)
        } catch (err: any) {
            this.logger.appendLine(`Error Occurred!! while sending telemetry: ${event?.name}: `);
            this.logger.appendLine(err?.message || "No error message");
        }
    }

    public async startEvent(event: TelemetryEvent): Promise<void> {
        return this.send({ ...event, data: { ...event?.data, environment: this.staticInfo } });
    }

    public async closeEvent(event: TelemetryEvent): Promise<void> {
        const totalActiveSessionTimeInSeconds = getCurrentUTCDateInSeconds() - this.activationTime;
        return await this.send({ ...event, data: { ...event?.data, totalActiveSessionTimeInSeconds } });
    }

    public async dispose(): Promise<void> {
        this.queue?.emptyQueue();
    }

    public async flushQueue(): Promise<void> {
        while (this.queue.events.length) {
            const event = this.queue.events.shift();
            if (event) {
                await this.send(event);
            }
        }
        this.dispose();
    }
}