import _ from 'lodash';
import localForage from 'localforage';
import moment from 'moment';
import { MaxGamesToKeep } from '../game/constants';
import { DefaultSettings } from '../game/settings';
import * as d from './stats.model';
import * as m from '../game/messages.model';

const settingsStorage = localForage.createInstance({ name: 'acolyte-fight-settings' });
const gameStorage = localForage.createInstance({ name: 'acolyte-fight-games' });

namespace StorageKeys {
    export const Name = "enigma-name";
    export const Buttons = "enigma-buttons";
    export const Rebindings = "enigma-rebindings";
}

namespace SettingsKeys {
    export const LatestGameStatUnixTimestamp = "latest-game-unix";
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
    return "Acolyte" + (Math.random() * 10000).toFixed(0);
}

export function getOrCreatePlayerName(): string {
    let name = loadName();
    if (!name) {
        name = createPlayerName();
        saveName(name);
    }
    return name;
}

export function getKeyBindingsOrDefaults() {
    return loadKeyBindingConfig() || DefaultSettings.Choices.Defaults;
}

export function getRebindingsOrDefaults() {
    return loadRebindingConfig() || {};
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