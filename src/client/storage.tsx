import _ from 'lodash';
import localForage from 'localforage';
import moment from 'moment';
import { MaxGamesToKeep } from '../game/constants';
import { DefaultSettings } from '../game/settings';
import * as d from './stats.model';
import * as m from '../game/messages.model';
import * as options from './options';
import * as sanitize from '../game/sanitize';

const settingsStorage = localForage.createInstance({ name: 'acolyte-fight-settings' });
const gameStorage = localForage.createInstance({ name: 'acolyte-fight-games' });

namespace StorageKeys {
    export const Name = "enigma-name";
    export const Buttons = "enigma-buttons";
    export const Rebindings = "enigma-rebindings";
    export const Options = "enigma-options";
}

namespace SettingsKeys {
    export const Known = "known";
    export const NumGames = "num-games";
    export const SeenVersion = "seen-version";
    export const LatestGameStatUnixTimestamp = "latest-game-unix";
}

export async function clear() {
    await settingsStorage.clear();
    await gameStorage.clear();
    window.localStorage.clear();
}

export function loadName(): string {
    return window.localStorage.getItem(StorageKeys.Name);
}

export function saveName(name: string) {
    window.localStorage.setItem(StorageKeys.Name, name);
}

export function loadKeyBindingConfig(): KeyBindings {
    return loadJson(StorageKeys.Buttons) as KeyBindings;
}

export function saveKeyBindingConfig(config: KeyBindings) {
    saveJson(StorageKeys.Buttons, config);
}

export function loadRebindingConfig(): KeyBindings {
    return loadJson(StorageKeys.Rebindings) as KeyBindings;
}

export function saveRebindingConfig(config: KeyBindings) {
    saveJson(StorageKeys.Rebindings, config);
}

export function loadOptions(): m.GameOptions {
    return loadJson(StorageKeys.Options) as m.GameOptions;
}

export function saveOptions(options: m.GameOptions) {
    saveJson(StorageKeys.Options, options);
}

function loadJson(key: string): Object {
    const json = window.localStorage.getItem(key);
    if (json) {
        return JSON.parse(json);
    } else {
        return null;
    }
}

function saveJson(key: string, data: Object) {
    window.localStorage.setItem(key, JSON.stringify(data));
}

export function createPlayerName(): string {
    let name = sanitize.sanitizeName(options.getProvider().playerName);
    if (!sanitize.validName(name)) {
        name = "Acolyte" + (Math.random() * 10000).toFixed(0);
    }
    return name;
}

export function getOrCreatePlayerName(): string {
    let name = loadName();
    if (!sanitize.validName(name)) {
        name = createPlayerName();
        saveName(name);
    }
    return name;
}

export function getKeyBindingsOrDefaults() {
    const keyBindings = loadKeyBindingConfig() || {};
    saveKeyBindingConfig(keyBindings);
    return keyBindings;
}

export function getRebindingsOrDefaults(defaults: KeyBindings) {
    const rebindings = loadRebindingConfig() || defaults;
    saveRebindingConfig(rebindings);
    return rebindings;
}

export function getOptionsOrDefaults(): m.GameOptions {
    const options: m.GameOptions = loadOptions() || {};
    saveOptions(options);
    return options;
}

export function loadAllGameStats(): Promise<d.GameStats[]> {
    const allGames = new Array<d.GameStats>();
    return gameStorage.iterate<d.GameStats, void>(game => {
        allGames.push(migrateGame(game));
    }).then(() => Promise.resolve(allGames));
}

export function loadGameStats(gameId: string): Promise<d.GameStats> {
    return gameStorage.getItem<d.GameStats>(gameId).then(migrateGame);
}

export function saveGameStats(gameStats: d.GameStats): Promise<void> {
    return gameStorage.setItem(gameStats.id, gameStats).then(() => Promise.resolve());
}

export async function getStatsLoadedUntil(): Promise<moment.Moment> {
    const unix = await settingsStorage.getItem<number>(SettingsKeys.LatestGameStatUnixTimestamp);
    if (unix) {
        return moment.unix(unix);
    } else {
        return null;
    }
}

export async function setStatsLoadedUntil(until: moment.Moment) {
    await settingsStorage.setItem(SettingsKeys.LatestGameStatUnixTimestamp, until.unix());
}

export async function getNumGames() {
    const numGames = await settingsStorage.getItem<number>(SettingsKeys.NumGames);
    return numGames || 0;
}

export async function incrementNumGames() {
    const numGames = await getNumGames();
    await settingsStorage.setItem(SettingsKeys.NumGames, numGames + 1);
}

export async function resetNumGames() {
    await settingsStorage.setItem(SettingsKeys.NumGames, 0);
}

export async function getKnownUser() {
    const nonAnonymous = await settingsStorage.getItem<boolean>(SettingsKeys.Known) || false;
    return nonAnonymous;
}

export async function setKnownUser(known: boolean) {
    await settingsStorage.setItem(SettingsKeys.Known, known);
}

export async function getSeenVersion() {
    return await settingsStorage.getItem<number>(SettingsKeys.SeenVersion) || 0;
}

export async function setSeenVersion(version: number) {
    await settingsStorage.setItem(SettingsKeys.SeenVersion, version);
}

function migrateGame(game: d.GameStats): d.GameStats {
    return {
        ...game,
        category: game.category || m.GameCategory.PvP,
    };
}

export function cleanupGameStats() {
    loadAllGameStats().then(games => {
        const ids = _.sortBy(games, (g: d.GameStats) => -moment(g.timestamp).unix()).map(g => g.id);
        const idsToDelete = _.drop(ids, MaxGamesToKeep);
        idsToDelete.forEach(id => gameStorage.removeItem(id));
    });
}