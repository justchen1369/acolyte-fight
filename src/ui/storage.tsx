import * as c from '../game/constants.model';

namespace StorageKeys {
    export const Name = "enigma-name";
    export const Buttons = "enigma-buttons";
}

export function loadName(): string {
    return window.localStorage.getItem(StorageKeys.Name);
}

export function saveName(name: string) {
    window.localStorage.setItem(StorageKeys.Name, name);
}

export function loadKeyBindingConfig(): c.KeyBindings {
    const json = window.localStorage.getItem(StorageKeys.Buttons);
    if (json) {
        return JSON.parse(json);
    } else {
        return null;
    }
}

export function saveKeyBindingConfig(config: c.KeyBindings) {
    window.localStorage.setItem(StorageKeys.Buttons, JSON.stringify(config));
}