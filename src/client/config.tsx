import * as s from './store.model';

export function getConfig() {
    return window as any as s.GlobalConfig;
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