import * as s from '../store.model';
import * as w from '../../game/world.model';
import * as notifications from './notifications';
import * as StoreProvider from '../storeProvider';
import * as url from '../url';

export function changePage(newPage: string, profileId: string = null) {
    const store = StoreProvider.getState();
    if (!store.socketId) {
        const newTarget: s.PathElements = { ...store.current, page: newPage, profileId };
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