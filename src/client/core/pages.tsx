import * as s from '../store.model';
import * as w from '../../game/world.model';
import * as StoreProvider from '../storeProvider';
import * as url from '../url';

export function changePage(newPage: string) {
    const store = StoreProvider.getState();
    if (!store.socketId) {
        const newTarget: s.PathElements = { ...store.current, page: newPage };
        window.location.href = url.getPath(newTarget);
    } else {
        StoreProvider.dispatch({ type: "updatePage", page: newPage });
    }
}

export function reloadPageIfNecessary() {
    const store = StoreProvider.getState();
    if (!store.socketId) {
        window.location.href = url.getPath(store.current);
    }
}