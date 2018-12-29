import * as Reselect from 'reselect';
import * as e from './editor.model';
import * as s from '../store.model';
import * as convert from './convert';
import * as matches from '../core/matches';
import * as rooms from '../core/rooms';
import * as settings from '../../game/settings';
import * as StoreProvider from '../storeProvider';

export const defaultTree = convert.settingsToCode(settings.DefaultSettings);

export function updateItem(sectionKey: string, itemId: string, code: string) {
    StoreProvider.dispatch({ type: "updateCodeItem", sectionKey, itemId, code });
}

export function deleteItem(sectionKey: string, itemId: string) {
    StoreProvider.dispatch({ type: "deleteCodeItem", sectionKey, itemId });
}

export function updateSelected(selectedId: string) {
    StoreProvider.dispatch({ type: "updateHash", hash: selectedId });
}

export async function previewMod(mod: ModTree, layoutId: string = null) {
    if (mod) {
        const roomId = await rooms.createRoomAsync(mod)
        await matches.joinNewGame({ layoutId, roomId });
    }
}

export const codeToSettings = Reselect.createSelector(
    (codeTree: e.CodeTree) => codeTree,
    (codeTree: e.CodeTree) => modToSettings(codeToMod(codeTree).mod));

function modToSettings(mod: ModTree) {
    return mod ? settings.calculateMod(mod) : null;
}

export const codeToMod = Reselect.createSelector(
    (codeTree: e.CodeTree) => codeTree,
    (codeTree: e.CodeTree) => {
        const result: ModResult = {
            mod: null,
            errors: {},
        };
        if (!codeTree) {
            return result;
        }

        try {
            result.mod = convert.codeToMod(codeTree);
        } catch (exception) {
            if (exception instanceof e.ParseException) {
                result.errors = exception.errors;
            } else {
                throw exception;
            }
        }
        return result;
    }
);

export interface ModResult {
    mod: ModTree;
    errors: e.ErrorTree;
}
