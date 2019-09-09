import * as pages from './pages';
import * as m from '../../shared/messages.model';
import * as s from '../store.model';
import * as StoreProvider from '../storeProvider';

export function isWatching(state: s.State) {
    if (state.current.page === "watch") {
        return true;
    }

    if (state.party) {
        const self = state.party.members.find(m => m.socketId === state.socketId);
        if (self && self.isObserver && self.ready) {
            return true;
        }
    }

    return false;
}

export function stopWatching() {
    const state = StoreProvider.getState();
    if (isWatching(state)) {
        pages.changePage("");
    }
}