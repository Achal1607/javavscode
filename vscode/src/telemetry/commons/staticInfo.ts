/**
 * Data that remanins constant for a user, used to enrich telemetry events.
 */
export interface StaticInfo {
    platform: Platform,
    location?: Location,
    username?: string
}

export interface Platform {
    name: string,
    distribution?: string,
    version?: string,
}

export interface Browser {
    name?: string,
    version?: string,
}

export interface Location {
 timezone?: string,
 locale?: string,
 country?: string,
}