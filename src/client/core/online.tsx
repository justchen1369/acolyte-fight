import * as m from '../../game/messages.model';
import * as StoreProvider from '../storeProvider';
import { getSocket } from './sockets';

const RefreshInterval = 60 * 60 * 1000;
let nextRefresh = 0;

export function onOnlineMsg(data: m.OnlineMsg) {
    const state = StoreProvider.getState();
    if (state.onlineSegment === data.segment) {
        StoreProvider.dispatch({
            type: "online",
            joined: data.all || data.joined || data.changed,
            left: data.left,
        });
    }
}

export function start(newSegment: string) {
    const state = StoreProvider.getState();
    const oldSegment = state.onlineSegment;
    if (oldSegment !== newSegment) {
        const socket = getSocket();

        StoreProvider.dispatch({
            type: "onlineSegment",
            segment: newSegment,
        });

        if (oldSegment) {
            const leaveMsg: m.GetOnlineStopMsg = {
                segment: oldSegment,
            }
            socket.emit('onlineStop', leaveMsg);
        }

        if (newSegment) {
            const joinMsg: m.GetOnlineStartMsg = {
                segment: newSegment,
            };
            socket.emit('online', joinMsg);
        }
    }
}

export function stop() {
    const state = StoreProvider.getState();
    const oldSegment = state.onlineSegment;
    if (oldSegment) {
        const socket = getSocket();

        StoreProvider.dispatch({
            type: "onlineSegment",
            segment: null,
        });

        const leaveMsg: m.GetOnlineStopMsg = {
            segment: oldSegment,
        }
        socket.emit('onlineStop', leaveMsg);
    }
}