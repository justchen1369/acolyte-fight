import * as s from '../store.model';
import * as w from '../../game/world.model';
import * as matches from './matches';
import * as StoreProvider from '../storeProvider';
import * as url from '../url';

export function changePage(newPage: string, profileId: string = null) {
    const store = StoreProvider.getState();
    if (!store.socketId) {
        const newTarget: s.PathElements = { ...store.current, page: newPage, profileId, hash: null };
        window.location.href = url.getPath(newTarget);
    } else {
        StoreProvider.dispatch({ type: "updatePage", page: newPage, profileId });
    }
}

export function reloadPageIfNecessary() {
    const store = StoreProvider.getState();
    if (!store.socketId) {
        window.location.href = url.getPath({ ...store.current, gameId: null });
    }
}

export function go(elems: s.PathElements) {
    const store = StoreProvider.getState();
    if (elems.gameId && store.world.ui.myGameId !== elems.gameId) {
        matches.joinNewGame({ observeGameId: elems.gameId });
    } else {
        if (store.world.ui.myGameId) {
            matches.leaveCurrentGame();
        }
        changePage(elems.page, elems.profileId);
    }
}