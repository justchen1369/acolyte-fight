import * as m from '../../game/messages.model';
import * as StoreProvider from '../storeProvider';
import { getSocket } from './sockets';

const RefreshInterval = 60 * 60 * 1000;
let nextRefresh = 0;

export function onOnlineMsg(data: m.OnlineMsg) {
    StoreProvider.dispatch({
        type: "online",
        joined: data.joined,
        left: data.left,
    });
}

export function onSessionLeaderboardMsg(data: m.SessionLeaderboardEntriesMsg) {
    StoreProvider.dispatch({
        type: "sessionLeaderboard",
        entries: data.entries,
    });
}

export function refreshIfNecessary() {
    if (Date.now() >= nextRefresh) {
        refresh();
    }
}

export function refresh() {
    nextRefresh = Date.now() + RefreshInterval;

    refreshOnline();
    refreshSessionLeaderboard();
}

function refreshOnline() {
    const socket = getSocket();

    const msg: m.GetOnlineMsg = {
        category: m.GameCategory.PvP,
    };
    socket.emit('online', msg);
}

function refreshSessionLeaderboard() {
    const socket = getSocket();

    const msg: m.GetSessionLeaderboardMsg = {
        category: m.GameCategory.PvP,
    };
    socket.emit('sessionLeaderboard', msg);
}