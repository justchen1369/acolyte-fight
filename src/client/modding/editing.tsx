import * as Reselect from 'reselect';
import * as e from './editor.model';
import * as s from '../store.model';
import * as convert from './convert';
import * as matches from '../core/matches';
import * as modder from '../../game/modder';
import * as pages from '../core/pages';
import * as parties from '../core/parties';
import * as rooms from '../core/rooms';
import * as settings from '../../game/settings';
import * as StoreProvider from '../storeProvider';

export { stringify, modToCode } from './convert';

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
        await matches.joinNewGame({ layoutId, roomId, locked: true });
    }
}

export async function exitEditor(mod: ModTree, nextPage: string = "") {
    let roomId: string = null;
    if (mod) {
        roomId = await rooms.createRoomAsync(mod);
    } else {
        roomId = rooms.DefaultRoom;
    }

    await rooms.joinRoomAsync(roomId);
    await parties.movePartyAsync(roomId);
    await pages.changePage(nextPage);
    StoreProvider.dispatch({ type: "updateHash", hash: null });
}

export const codeToSettings = Reselect.createSelector(
    (codeTree: e.CodeTree) => codeTree,
    (codeTree: e.CodeTree) => modToSettings(codeToMod(codeTree).mod));

function modToSettings(mod: ModTree) {
    return mod ? modder.modToSettings(mod) : null;
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
