import _ from 'lodash';
import * as Reselect from 'reselect';
import * as cloud from './cloud';
import * as m from '../../shared/messages.model';
import * as parties from './parties';
import * as Storage from '../storage';
import * as StoreProvider from '../storeProvider';
import * as w from '../../game/world.model';
import { DefaultSettings } from '../../game/settings';

const Dash = "a";

const uploadSettingsDebounced = _.debounce(() => uploadSettings(), 500);

function uploadSettings() {
    parties.updatePartyAsync();
    cloud.uploadSettings();
}

export interface RebindingsLookupInput {
    settings: AcolyteFightSettings;
    rebindings: KeyBindings;
}

export const getRebindingLookup = Reselect.createSelector(
	(input: RebindingsLookupInput) => input.rebindings,
	(input: RebindingsLookupInput) => input.settings,
	(rebindings, settings) => {
        const lookup = new Map<string, string>();
        for (const newKey in rebindings) {
            if (isSpecialKey(newKey)) {
                continue;
            }
            const initialKey = rebindings[newKey];
			lookup.set(initialKey, newKey);
        }
        
        Object.keys(settings.Choices.Options).forEach(key => {
            if (key && !lookup.has(key) && !rebindings[key]) {
                lookup.set(key, key);
            }
        });
		return lookup;
	}
);

export function readKey(e: KeyboardEvent) {
    switch (e.code) {
        case "KeyQ": return 'q';
        case "KeyW": return 'w';
        case "KeyE": return 'e';
        case "KeyR": return 'r';
        case "KeyT": return 't';
        case "KeyY": return 'y';
        case "KeyU": return 'u';
        case "KeyI": return 'i';
        case "KeyO": return 'o';
        case "KeyP": return 'p';
        case "KeyA": return 'a';
        case "KeyS": return 's';
        case "KeyD": return 'd';
        case "KeyF": return 'f';
        case "KeyG": return 'g';
        case "KeyH": return 'h';
        case "KeyJ": return 'j';
        case "KeyK": return 'k';
        case "KeyL": return 'l';
        case "KeyZ": return 'z';
        case "KeyX": return 'x';
        case "KeyC": return 'c';
        case "KeyV": return 'v';
        case "KeyB": return 'b';
        case "KeyN": return 'n';
        case "KeyM": return 'm';
        case "Digit0": return '0';
        case "Digit1": return '1';
        case "Digit2": return '2';
        case "Digit3": return '3';
        case "Digit4": return '4';
        case "Digit5": return '5';
        case "Digit6": return '6';
        case "Digit7": return '7';
        case "Digit8": return '8';
        case "Digit9": return '9';
        case "Minus": return '-';
        case "Equal": return '=';
        case "BracketLeft": return '[';
        case "BracketRight": return ']';
        case "Semicolon": return ';';
        case "Quote": return "'";
        case "Comma": return ',';
        case "Period": return '.';
        case "Space": return ' ';
        default: return e.key && e.key.toLowerCase();
    }
}

export function isSpecialKey(key: string) {
    return key && key.length > 1;
}

export function autoBindDoubleTap(): string {
    const doubleTapKey: string = Dash;
    saveRebinding(w.SpecialKeys.DoubleTap, doubleTapKey);
    return doubleTapKey;
}

export function autoBindRightClick(rightClickedFirst: boolean): string {
    let rightClickKey: string;
    if (rightClickedFirst) {
        // If the first button they use is right click, then move with right click, don't dash
        rightClickKey = w.SpecialKeys.Move;
    } else {
        // Moved with the left click first, bind the right click to dash
        rightClickKey = Dash;
    }

    saveRebinding(w.SpecialKeys.RightClick, rightClickKey);

    return rightClickKey;
}

function saveRebinding(key: string, value: string) {
    const store = StoreProvider.getState();
    const rebindings = { ...store.rebindings };
    rebindings[key] = value;
    StoreProvider.dispatch({ type: "updateRebindings", rebindings });
    setTimeout(() => cloud.uploadSettings(), 1);
}

export function updateKeyBindings(config: KeyBindings) {
    StoreProvider.dispatch({ type: "updateKeyBindings", keyBindings: config });
    Storage.saveKeyBindingConfig(config);
    uploadSettingsDebounced();
}

export function updateLoadouts(loadouts: m.Loadout[]) {
    StoreProvider.dispatch({ type: "loadouts", loadouts });
    Storage.saveLoadouts(loadouts);
    uploadSettingsDebounced();
}

export function defaultLoadoutName(slot: number) {
    return `Loadout #${slot + 1}`;
}

export function allKeys(settings: AcolyteFightSettings) {
    const Options = settings.Choices.Options;
    return Object.keys(Options);
}

export function randomizeBtn(settings: AcolyteFightSettings) {
    const keys = allKeys(settings);
    const key = keys[Math.floor(Math.random() * keys.length)];
    return key;
}

export function randomizeSpellId(btn: string, config: KeyBindings, settings: AcolyteFightSettings) {
    const Options = settings.Choices.Options;

    const currentSpellId = config[btn];
    const spellIds = _.flatten(Options[btn]).filter(x => x !== currentSpellId);
    return spellIds[Math.floor(Math.random() * spellIds.length)];
}