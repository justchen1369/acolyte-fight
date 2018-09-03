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
    const json = window.localStorage.getItem(StorageKeys.Buttons);
    if (json) {
        return JSON.parse(json);
    } else {
        return null;
    }
}

export function saveKeyBindingConfig(config: KeyBindings) {
    window.localStorage.setItem(StorageKeys.Buttons, JSON.stringify(config));
}

export function loadRebindingConfig(): KeyBindings {
    const json = window.localStorage.getItem(StorageKeys.Rebindings);
    if (json) {
        return JSON.parse(json);
    } else {
        return null;
    }
}

export function saveRebindingConfig(config: KeyBindings) {
    window.localStorage.setItem(StorageKeys.Rebindings, JSON.stringify(config));
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