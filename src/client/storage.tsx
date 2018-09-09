import { DefaultSettings } from '../game/settings';

namespace StorageKeys {
    export const Name = "enigma-name";
    export const Buttons = "enigma-buttons";
    export const Rebindings = "enigma-rebindings";
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

export function getOrCreatePlayerName(): string {
    let name = loadName();
    if (!name) {
        name = "Acolyte" + (Math.random() * 10000).toFixed(0);
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