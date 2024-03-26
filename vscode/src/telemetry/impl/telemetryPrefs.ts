import { workspace, env } from "vscode";
import { TELEMETRY_COMMAND } from "../utils/constants";

export class TelemetryPrefs {
  public checkTelemetryStatus(): boolean {
    return this.getTelemetryLevel() !== 'off' && this.getTelemetryConfiguration().get<boolean>('enabled', false);
  }

  public getTelemetryLevel(): "off" | "all" | "error" | "crash" | undefined {
    if (workspace.getConfiguration().get("telemetry.enableTelemetry") == false
      || workspace.getConfiguration().get("telemetry.enableCrashReporter") == false
    ) {
      return "off";
    }
    return workspace.getConfiguration().get("telemetry.telemetryLevel", "off");
  }

  private configPref(configCommand: string): boolean {
    const config = workspace.getConfiguration().inspect(configCommand);
    return (
      config?.workspaceFolderValue !== undefined ||
      config?.workspaceFolderLanguageValue !== undefined ||
      config?.workspaceValue !== undefined ||
      config?.workspaceLanguageValue !== undefined ||
      config?.globalValue !== undefined ||
      config?.globalLanguageValue !== undefined
    );
  }
  
  public isExtTelemetryConfigured(): boolean {
    return this.configPref(`${TELEMETRY_COMMAND}.enabled`); 
  }

  public async updateTelemetryEnabledConfig(value: boolean): Promise<void> {
    return await this.getTelemetryConfiguration().update('enabled', value, true);
  }

  public didUserDisableVscodeTelemetry(): boolean {
    if (env.isTelemetryEnabled) {
      return false;
    }
    return this.configPref("telemetry.telemetryLevel") && workspace.getConfiguration().get("telemetry.telemetryLevel") === "off";
  }

  private getTelemetryConfiguration() {
    return workspace.getConfiguration(TELEMETRY_COMMAND);
  }
}