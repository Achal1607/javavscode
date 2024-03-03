import * as os from 'os';
import * as path from 'path';

export const OUTPUT_TELEMETRY_CHANNEL_NAME = "Oracle Java Telemetry";
export const ANONYMOUS_ID_FILE_PATH = path.join(os.homedir(), ".oracle-vscode", "anonymousId");
export const TELEMETRY_COMMAND = "jdk.telemetry"
export const ERROR_TYPE_TELEMETRY = "ERROR"