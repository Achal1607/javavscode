import axios from "axios";
import { TelemetryEvent } from "../types";
import { randomUUID } from "crypto";

export const postTelemetry = async (event: TelemetryEvent) => {
    const { data, name: type } = event;
    const SERVER_URL = 'SERVER_URL';

    const res = await axios.post(`${SERVER_URL}/20210610/vscode/java/sendTelemetry`, {
        telemetryId: randomUUID(),
        telemetryData: JSON.stringify(data),
        telemetryType: type
    });

    return res.statusText;
}