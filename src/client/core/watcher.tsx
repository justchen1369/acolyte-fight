import * as pages from './pages';
import * as s from '../store.model';
import * as StoreProvider from '../storeProvider';

export function isWatching(state: s.State) {
    return state.current.page === "watch";
}

export function stopWatching() {
    const state = StoreProvider.getState();
    if (isWatching(state)) {
        pages.changePage("");
    }
}