import _ from 'lodash';
import * as settings from './settings';

export function modToSettings(mod: Object): AcolyteFightSettings {
    return merge(settings.DefaultSettings, mod);
}

export function merge(base: any, mod: any) {
    if (mod === undefined) {
        return base;
    } else if (base === undefined) {
        return mod;
    } else if (typeof base === "object") {
        if (base === null || mod === null) {
            return mod; // Nothing to merge
        } else if (base instanceof Array) {
            return [ ...mod ]; // Replace arrays entirely, no merging
        } else {
            let result: any = {};
            for (const key in base) {
                result[key] = merge(base[key], mod[key]);
            }
            for (const key in mod) {
                if (!(key in base)) { // New key
                    result[key] = mod[key];
                }
            }
            return result;
        }
    } else {
        return mod;
    }
}

export function diff(base: any, result: any) {
    if (result === base) {
        return undefined;
    } else if (typeof base === "object") {
        if (base === null || result === null || base instanceof Array) { // No merging, just replace if not equal
            if (_.isEqual(base, result)) {
                return undefined;
            } else {
                return result;
            }
        } else {
            let mod: any = {};
            for (const key in base) {
                const valueDiff = diff(base[key], result[key]);
                if (valueDiff !== undefined) {
                    mod[key] = valueDiff;
                }
            }
            for (const key in result) {
                if (!(key in base)) { // New key
                    mod[key] = result[key];
                }
            }
            if (Object.keys(mod).length > 0) {
                return mod;
            } else {
                return undefined;
            }
        }
    } else {
        return result;
    }
}