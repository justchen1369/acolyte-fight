import _ from 'lodash';
import * as settings from './settings';

const DeleteKey = "$delete";

export function modToSettings(mod: Object): AcolyteFightSettings {
    return merge(settings.DefaultSettings, mod);
}

export function merge(base: any, mod: any) {
    if (mod === undefined) {
        return base;
    } else if (base === undefined) {
        return mod;
    } else if (typeof mod === "object" && mod[DeleteKey]) {
        return undefined;
    } else if (typeof base === "object") {
        if (base === null || mod === null) {
            return mod; // Nothing to merge
        } else if (base instanceof Array || mod instanceof Array) {
            return [ ...mod ]; // Replace arrays entirely, no merging
        } else {
            let result: any = {};
            for (const key in base) {
                const value = merge(base[key], mod[key]);
                if (value !== undefined) {
                    result[key] = value;
                } else {
                    delete result[key];
                }
            }
            for (const key in mod) {
                if (!(key in base)) { // New key
                    const value = mod[key];
                    if (value !== undefined) {
                        result[key] = value;
                    }
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
        if (result === undefined) {
            return { [DeleteKey]: true };
        } else if (base === null || result === null || base instanceof Array) { // No merging, just replace if not equal
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