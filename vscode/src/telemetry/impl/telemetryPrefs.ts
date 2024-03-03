import { workspace } from "vscode";
import { TELEMETRY_COMMAND } from "../utils/constants";

export class TelemetryPrefs {
  public isTelemetryEnabled: boolean = this.checkTelemetryStatus();
  public telemetryLevel: "off" | "all" | "error" | "crash" | undefined = this.getTelemetryLevel();

  constructor() {
  }

  private checkTelemetryStatus(): boolean {
    return this.getTelemetryLevel() !== 'off' && this.getTelemetryConfiguration().get<boolean>('enabled', false);
  }

  private getTelemetryLevel(): "off" | "all" | "error" | "crash" | undefined {
    if (workspace.getConfiguration().get("telemetry.enableTelemetry") == false
      || workspace.getConfiguration().get("telemetry.enableCrashReporter") == false
    ) {
      return "off";
    }
    return workspace.getConfiguration().get("telemetry.telemetryLevel", "off");
  }

  public isTelemetryConfigured(): boolean {
    const config = workspace.getConfiguration().inspect(`${TELEMETRY_COMMAND}.enabled`);
    return (
      config?.workspaceFolderValue !== undefined ||
      config?.workspaceFolderLanguageValue !== undefined ||
      config?.workspaceValue !== undefined ||
      config?.workspaceLanguageValue !== undefined ||
      config?.globalValue !== undefined ||
      config?.globalLanguageValue !== undefined
    );
  }

  public async updateTelemetryEnabledConfig(value: boolean): Promise<void> {
    return await this.getTelemetryConfiguration().update('enabled', value, true);
  }

  private getTelemetryConfiguration() {
    return workspace.getConfiguration(TELEMETRY_COMMAND);
  }

}