import { ExtensionContext } from "vscode";
import { TelemetryEvents } from "./constants";
import { TelemetryManager } from "./telemetry/telemetryManager";

export namespace Telemetry {

	let telemetryManager: TelemetryManager;
	export let serverInitializedReceived = false;

	export async function initializeTelemetry(context: ExtensionContext): Promise<TelemetryManager> {
		
		if (!!telemetryManager) {
			throw new Error("Telemetry is already initialized");
		}
		telemetryManager = new TelemetryManager(context);
		await telemetryManager.initializeReporter();
		setTimeout(sendEmptyStartUp, 60 * 1000);
		return telemetryManager;
	}

	export async function sendTelemetry(name: string, type: string, data: any = {}): Promise<void> {
		if (name == TelemetryEvents.STARTUP_EVT) {
			serverInitializedReceived = true;
			return await telemetryManager.getReporter().startEvent({ name, type });
		}

		if (name == TelemetryEvents.CLOSE_EVT) {
			return await telemetryManager.getReporter().closeEvent({ name, type });
		}

		return await telemetryManager.getReporter().send({
			name: name,
			type: type,
			data
		});
	}

	function sendEmptyStartUp() {
		if (!serverInitializedReceived) {
			return sendTelemetry(TelemetryEvents.STARTUP_EVT, TelemetryEvents.ERROR);
		}
	}
}