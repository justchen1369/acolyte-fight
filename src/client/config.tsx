export interface GlobalConfig {
    baseUrl?: string;
    acolyteAuthToken?: string;
    acolyteDefaultName?: string;
}

export function getConfig() {
    return window as any as GlobalConfig;
}

export function getBaseUrl() {
    return getConfig().baseUrl;
}

export function getAuthToken() {
    return getConfig().acolyteAuthToken;
}

export function getDefaultName() {
    return getConfig().acolyteDefaultName;
}