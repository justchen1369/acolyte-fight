import * as Reselect from 'reselect';
import * as cloud from './cloud';
import * as StoreProvider from '../storeProvider';
import * as w from '../../game/world.model';
import { DefaultSettings } from '../../game/settings';

const Dash = "a";

export const getRebindingLookup = Reselect.createSelector(
	(rebindings: KeyBindings) => rebindings,
	(rebindings) => {
        const lookup = new Map<string, string>();
        for (const newKey in rebindings) {
            if (isSpecialKey(newKey)) {
                continue;
            }
            const initialKey = rebindings[newKey];
			lookup.set(initialKey, newKey);
        }
        
        Object.keys(DefaultSettings.Choices.Options).forEach(key => {
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