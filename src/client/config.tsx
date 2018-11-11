export interface GlobalConfig {
    baseUrl?: string;
    acolyteAuthToken?: string;
    acolyteDefaultName?: string;
    acolyteFacebook?: boolean;
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

export function isFacebook() {
    return !!getConfig().acolyteFacebook;
}