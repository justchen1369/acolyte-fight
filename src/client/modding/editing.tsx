import _ from 'lodash';
import * as Reselect from 'reselect';
import * as e from './editor.model';
import * as m from '../../shared/messages.model';
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
        await matches.joinNewGame({ layoutId, roomId, locked: m.LockType.ModPreview });
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

export const modToSettings = Reselect.createSelector(
    (mod: ModTree) => mod,
    (mod: ModTree) => {
        if (mod) {
            return modder.modToSettings(mod)
        } else {
            return settings.DefaultSettings;
        }
    });