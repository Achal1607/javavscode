import { OUTPUT_CHANNEL_NAME } from "../../utils/constants";
import { getCurrentUTCDateInSeconds } from "../../utils/time";
import { StaticInfo } from "../staticInfo";
import { TelemetryClient } from "../telemetryClient";
import { TelemetryEvent } from "../telemetryEvent";
import { TelemetrySettings } from "../telemetrySettings";
import { TelemetryEventQueue } from "./telemetryEventQueue";
import { OutputChannel, window } from "vscode";

export class TelemetryClientImpl implements TelemetryClient {
    private activationTime: number;
    private logger: OutputChannel;
    constructor(
        private queue: TelemetryEventQueue,
        private settings: TelemetrySettings,
        private staticInfo: StaticInfo) {
        this.activationTime = getCurrentUTCDateInSeconds();
        this.logger = window.createOutputChannel(OUTPUT_CHANNEL_NAME);
    }

    async sendEvent(event: TelemetryEvent): Promise<void> {
        try {
            if (this.settings.isTelemetryEnabled) {
                this.logger.appendLine("EVENT START");
                this.logger.appendLine(event.type);
                this.logger.appendLine(event.data);
                this.logger.appendLine(event.extras);
                this.logger.appendLine(event.uuid as string);
                this.logger.appendLine("EVENT END");
            }
        } catch (err) {
        }
    }
    async startEvent(): Promise<void> {
        return this.sendEvent({ type: "Start", data: { environment: this.staticInfo } });
    }
    async closeEvent(): Promise<void> {
        const totalActiveSessionTimeInSeconds = getCurrentUTCDateInSeconds() - this.activationTime;
        return await this.sendEvent({ type: "Close", data: { totalActiveSessionTimeInSeconds } });
    }
    async dispose(): Promise<void> {
        this.queue?.emptyQueue();
    }
    async flushQueue(): Promise<void> {
        while (this.queue.events.length) {
            const event = this.queue.events.shift();
            if (event) {
                await this.sendEvent(event);
            }
        }
    }
}