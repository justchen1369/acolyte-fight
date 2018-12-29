import * as e from './editor.model';
import * as s from '../store.model';
import * as matches from '../core/matches';
import * as rooms from '../core/rooms';
import * as selectors from './selectors';
import * as StoreProvider from '../storeProvider';

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