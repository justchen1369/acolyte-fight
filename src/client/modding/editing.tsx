import _ from 'lodash';
import * as Reselect from 'reselect';
import * as e from './editor.model';
import * as m from '../../shared/messages.model';
import * as s from '../store.model';
import * as convert from './convert';
import * as loadHandler from './loadHandler';
import * as matches from '../core/matches';
import * as modder from '../../game/modder';
import * as pages from '../core/pages';
import * as parties from '../core/parties';
import * as rooms from '../core/rooms';
import * as settings from '../../game/settings';
import * as storage from '../storage';
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

export function canonlicalize(mod: ModTree) {
    StoreProvider.dispatch({ type: "updateCodeTree", codeTree: convert.modToCode(mod) });
}

export async function previewMod(mod: ModTree, layoutId: string = null) {
    if (mod) {
        if (layoutId) {
            mod = {
                ...mod,
                World: {
                    ...mod.World,
                    Layouts: [layoutId],
                },
            };
        }

        const roomId = await rooms.createRoomAsync(mod)
        await matches.joinNewGame({ roomId, locked: m.LockType.ModPreview, autoJoin: false });
    }
}

export async function autoSaveMod(mod: ModTree) {
    storage.saveMod(mod); // Don't await
}

export async function exitEditor(mod: ModTree, nextPage: string = "") {
    await loadHandler.loadModIntoGame(mod);
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