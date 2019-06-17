import * as m from '../../game/messages.model';
import * as w from '../../game/world.model';
import * as notifications from './notifications';
import * as StoreProvider from '../storeProvider';
import { getSocket } from './sockets';

export function onOnlineMsg(data: m.OnlineMsg) {
    const state = StoreProvider.getState();
    if (state.onlineSegment === data.segment) {
        const joined = data.all || data.joined || data.changed;
        const left = data.left;
        if (joined || left) {
            StoreProvider.dispatch({ type: "online", joined, left });
        }

        if (data.texts) {
            const newNotifications = new Array<w.Notification>();
            data.texts.forEach(msg => {
                const textNotification: w.TextNotification = {
                    type: "text",
                    userHash: msg.userHash,
                    name: msg.name,
                    text: msg.text,
                };
                newNotifications.push(textNotification);
            });
            notifications.notify(...newNotifications);
        }
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

export function sendTextMessage(text: string) {
    const state = StoreProvider.getState();
    const segment = state.onlineSegment;
    if (segment) {
        const socket = getSocket();

        const msg: m.SendTextMsg = {
            segment,
            name: state.playerName,
            text,
        };
        socket.emit('text', msg);
    }
}