import { ERROR_TYPE_TELEMETRY, OUTPUT_TELEMETRY_CHANNEL_NAME } from "../utils/constants";
import { getCurrentUTCDateInSeconds } from "../utils/utils";
import { TelemetryEventQueue } from "./telemetryEventQueue";
import { OutputChannel, window } from "vscode";
import { TelemetryPrefs } from "./telemetryPrefs";
import { AnonymousIdManager } from "./AnonymousIdManager";
import { StaticInfo, TelemetryService, TelemetryEvent } from "../types";

export class TelemetryServiceImpl implements TelemetryService {
    private activationTime: number = getCurrentUTCDateInSeconds();
    private logger: OutputChannel = window.createOutputChannel(OUTPUT_TELEMETRY_CHANNEL_NAME);

    constructor(
        private queue: TelemetryEventQueue,
        private anonymousId: AnonymousIdManager,
        private settings: TelemetryPrefs,
        private staticInfo: StaticInfo) {
    }

    public async send(event: TelemetryEvent): Promise<void> {
        event.machineId = this.anonymousId.getMachineId();
        event.sessionId = this.anonymousId.getSessionId();

        if (this.settings.isTelemetryEnabled) {
            if (["error", "crash"].includes(this.settings.telemetryLevel || "off") && event.type != ERROR_TYPE_TELEMETRY) {
                this.queue.addEvent(event);
            } else {
                this.sendEvent(event)
            }
        } else {
            this.queue.addEvent(event);
        }
    }

    public async sendError({name , data}: {name: string, data?: any}): Promise<void> {
        return await this.send({ name, data, type: ERROR_TYPE_TELEMETRY });
    }

    private async sendEvent(event: TelemetryEvent): Promise<void> {
        try {
            console.log(event);
            this.logger.appendLine("EVENT START");
            this.logger.appendLine(event.machineId || "");
            this.logger.appendLine(event.sessionId || "");
            this.logger.appendLine(event.type);
            this.logger.appendLine(event.data);
            this.logger.appendLine("EVENT END");
        } catch (err) {
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
                await this.sendEvent(event);
            }
        }
    }
}