export interface TelemetrySettings {
    getTelemetryLevel(): "off" | "all" | "error" | "crash" | undefined
    isTelemetryEnabled: boolean
}