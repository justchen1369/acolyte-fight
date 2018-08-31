import * as m from '../../game/messages.model';
import * as s from '../store.model';
import * as w from '../../game/world.model';
import * as ai from './ai';
import * as engine from '../../game/engine';
import * as matches from './matches';
import * as settings from '../../game/settings';
import * as Storage from '../storage';
import * as StoreProvider from '../storeProvider';
import * as url from '../url';
import { notify } from './notifications';
import { readFileAsync } from './fileUtils';
import { socket } from './sockets';
import { isMobile } from './userAgent';

export function createRoomFromFileAsync(file: File) {
    return readFileAsync(file)
        .then(json => json ? JSON.parse(json) : {})
        .then(mod => createRoomFromModAsync(mod))
}

function createRoomFromModAsync(mod: Object) {
    return createRoomAsync(mod, false);
}

export function createRoomAsync(mod: Object, allowBots: boolean) {
    console.log("Creating room", mod, allowBots);
	return new Promise<string>((resolve, reject) => {
		let msg: m.CreateRoomRequest = { mod, allowBots };
		socket.emit('room.create', msg, (response: m.CreateRoomResponseMsg) => {
			if (response.success === false) {
				reject(response.error);
			} else {
				resolve(response.roomId);
			}
		});
	});
}

export function getRoomAsync(roomId: string): Promise<m.JoinRoomResponse> {
    return new Promise<m.JoinRoomResponse>((resolve, reject) => {
        let msg: m.JoinRoomRequest = { roomId };
        socket.emit('room', msg, (response: m.JoinRoomResponseMsg) => {
            if (response.success === false) {
                reject(response.error);
            } else {
                resolve(response);
            }
        });
    });
}

export function joinRoomAsync(roomId: string): Promise<string> {
	const store = StoreProvider.getState();
	if (store.room.id !== roomId) {
        if (roomId) {
            console.log("Joining room", roomId);
            return getRoomAsync(roomId).then(response => joinRoomFrom(response));
        } else {
            leaveRoom();
            return Promise.resolve(null);
        }
	} else {
		return Promise.resolve(roomId);
	}
}

export function joinRoomFrom(response: m.JoinRoomResponse) {
    const allowBots = response.allowBots || false;
    const mod = response.mod || {};
    StoreProvider.dispatch({
        type: "updateRoom",
        room: {
            id: response.roomId,
            mod,
            allowBots,
            settings: settings.calculateMod(mod),
        }
    });
    return response.roomId;
}

export function leaveRoom() {
    const store = StoreProvider.getState();
    if (!store.room.id) {
        return;
    }

    console.log("Leaving room", store.room.id);

	const room: s.RoomState = store.room = {
		id: null,
		mod: {},
        allowBots: false,
        settings: settings.DefaultSettings,
	};
	StoreProvider.dispatch({ type: "updateRoom", room });
}
