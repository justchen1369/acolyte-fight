import md5 from 'crypto-js/md5';
import { DefaultSettings } from './settings';
import * as engine from './engine';

export function hashSettings(settings: AcolyteFightSettings) {
    return md5(JSON.stringify(settings)).toString();
}

export const versionXX = `${engine.versionXX()}.${hashSettings(DefaultSettings)}`;