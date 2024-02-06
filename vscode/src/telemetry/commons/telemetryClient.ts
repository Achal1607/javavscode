import { TelemetryEvent } from "./telemetryEvent";

export interface TelemetryClient {
    startEvent() : Promise<void>;

    sendEvent(event: TelemetryEvent): Promise<void>;

    closeEvent() : Promise<void>;

    flushQueue(): Promise<void>;

    dispose(): Promise<void>;
}