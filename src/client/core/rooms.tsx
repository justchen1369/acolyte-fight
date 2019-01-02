import * as m from '../../game/messages.model';
import * as s from '../store.model';
import * as w from '../../game/world.model';
import * as modder from '../../game/modder';
import * as sockets from './sockets';
import * as settings from '../../game/settings';
import * as StoreProvider from '../storeProvider';
import * as url from '../url';
import { readFileAsync } from './fileUtils';
import { socket } from './sockets';

export const DefaultRoom = m.DefaultRoomId;

export function createRoomFromFileAsync(file: File) {
    return readFileAsync(file)
        .then(json => json ? JSON.parse(json) : {})
        .then(mod => createRoomAsync(mod))
}

export function createRoomAsync(mod: Object) {
    console.log("Creating room", mod);
	return new Promise<string>((resolve, reject) => {
		let msg: m.CreateRoomRequest = { mod };
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
            return getRoomAsync(roomId).then(response => joinRoomFrom(response));
        } else {
            leaveRoom();
            return Promise.resolve(null);
        }
	} else {
		return Promise.resolve(roomId);
	}
}

export function joinRoomFrom(response: m.RoomUpdateMsg) {
    console.log("Joining room", response.roomId, response.mod);
    const mod = response.mod || {};
    StoreProvider.dispatch({
        type: "updateRoom",
        room: {
            id: response.roomId,
            mod,
            settings: modder.modToSettings(mod),
        }
    });
    return response.roomId;
}

export function onRoomMsg(msg: m.RoomUpdateMsg) {
    const store = StoreProvider.getState();
    if (store.room.id === msg.roomId) {
        joinRoomFrom(msg);
    }
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
        settings: settings.DefaultSettings,
	};
	StoreProvider.dispatch({ type: "updateRoom", room });
}


export function isModded(room: s.RoomState) {
    return room.id && room.id !== DefaultRoom;
}