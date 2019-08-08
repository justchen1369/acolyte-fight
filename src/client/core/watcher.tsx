import * as pages from './pages';
import * as m from '../../shared/messages.model';
import * as s from '../store.model';
import * as StoreProvider from '../storeProvider';
import { isLocal } from './userAgent';

export function numMatches(state: s.State) {
    if (!(state.profile && state.profile.ratings)) {
        return 0;
    }
    const rating = state.profile.ratings[m.GameCategory.PvP];
    if (rating) {
        return rating.numGames;
    } else {
        return 0;
    }
}

export function allowedToWatch(state: s.State) {
    return isLocal || state.loggedIn && numMatches(state) >= 1000;
}

export function isWatching(state: s.State) {
    return state.current.page === "watch" && allowedToWatch(state);
}

export function stopWatching() {
    const state = StoreProvider.getState();
    if (isWatching(state)) {
        pages.changePage("");
    }
}