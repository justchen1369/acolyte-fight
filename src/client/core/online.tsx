import * as m from '../../shared/messages.model';
import * as s from '../store.model';
import * as w from '../../game/world.model';
import * as messages from './messages';
import * as remind from './remind';
import * as silencer from './silencer';
import * as StoreProvider from '../storeProvider';
import { getSocket } from './sockets';

export function onOnlineMsg(data: m.OnlineMsg) {
    const state = StoreProvider.getState();
    if (state.onlineSegment === data.segment) {
        const all = !!data.all;
        const joined = data.all || data.joined || data.changed;
        const left = data.left;
        if (joined || left) {
            StoreProvider.dispatch({ type: "online", all, joined, left });
        }

        if (data.texts && data.texts.length > 0) {
            const textMessages = new Array<s.TextMessage>();
            data.texts.forEach(msg => {
                const textNotification: s.TextMessage = {
                    type: "text",
                    userHash: msg.userHash,
                    name: msg.name,
                    text: msg.text,
                };
                textMessages.push(textNotification);
            });
            silencer.silenceIfNecessary(textMessages);
            textMessages.forEach(message => messages.push(message));
            remind.remindIfNecessary(textMessages);
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

        const msg: m.OnlineControlMsg = {
            leave: oldSegment,
            join: newSegment,
        };
        socket.emit('online', msg);
    }
}

export function rejoin() {
    const state = StoreProvider.getState();
    if (state.onlineSegment) {
        const socket = getSocket();

        const msg: m.OnlineControlMsg = {
            join: state.onlineSegment,
        };
        socket.emit('online', msg);
    }
}

export function refresh() {
    const state = StoreProvider.getState();
    if (state.onlineSegment) {
        const socket = getSocket();

        const msg: m.OnlineControlMsg = {
            refresh: state.onlineSegment,
        };
        socket.emit('online', msg);
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

        const leaveMsg: m.OnlineControlMsg = {
            leave: oldSegment,
        }
        socket.emit('online', leaveMsg);
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