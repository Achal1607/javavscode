export interface TelemetryEvent{
    type: string,
    uuid?: string,
    data?: any,
    extras?: any
}