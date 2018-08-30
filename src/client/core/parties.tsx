import * as m from '../../game/messages.model';
import * as s from '../store.model';
import * as w from '../../game/world.model';
import * as ai from './ai';
import * as engine from '../../game/engine';
import * as matches from './matches';
import * as sockets from './sockets';
import * as Storage from '../storage';
import * as StoreProvider from '../storeProvider';
import * as url from '../url';
import { notify } from './notifications';
import { readFileAsync } from './fileUtils';
import { socket } from './sockets';
import { isMobile } from './userAgent';

sockets.listeners.onPartyMsg = onPartyMsg;

export function getPartyHomePath(current: s.PathElements) {
    return url.getPath({ ...current, page: null });
}

export function createRoomFromFile(file: File) {
    return readFileAsync(file)
        .then(json => json ? JSON.parse(json) : {})
        .then(mod => createRoomFromMod(mod))
}

function createRoomFromMod(mod: Object) {
    return createRoom(mod, false);
}

export function createRoom(mod: Object, allowBots: boolean, nextPage: string = "party") {
    console.log("Creating room", mod, allowBots);
    return createRoomCall(mod, allowBots).then(response => createParty(response.roomId))
        .then(msg => {
            const path = url.getPath({
                gameId: null,
                page: nextPage,
                party: msg.partyId,
                server: msg.server,
            });
            window.location.href = path;
        })
}

function createRoomCall(mod: Object, allowBots: boolean): Promise<m.CreateRoomResponse> {
	return new Promise<m.CreateRoomResponse>((resolve, reject) => {
		let msg: m.CreateRoomRequest = { mod, allowBots };
		socket.emit('room.create', msg, (response: m.CreateRoomResponseMsg) => {
			if (response.success === false) {
				reject(response.error);
			} else {
				resolve(response);
			}
		});
	});
}

export function joinRoom(roomId: string): Promise<void> {
	const store = StoreProvider.getState();
	if (roomId) {
		return new Promise<void>((resolve, reject) => {
			let msg: m.JoinRoomRequest = { roomId };
			socket.emit('room', msg, (response: m.JoinRoomResponseMsg) => {
				if (response.success === false) {
					reject(response.error);
				} else {
					StoreProvider.dispatch({
						type: "updateRoom",
						room: {
							id: roomId,
							mod: response.mod || {},
							allowBots: response.allowBots || false,
						}
					});
					resolve();
				}
			});
		});
	} else {
		return Promise.resolve();
	}
}

export function leaveRoom(): Promise<void> {
	const store = StoreProvider.getState();

	const room: s.RoomState = store.room = {
		id: null,
		mod: {},
		allowBots: false,
	};
	StoreProvider.dispatch({ type: "updateRoom", room });
	return Promise.resolve();
}

export function createParty(roomId: string): Promise<m.PartyResponse> {
	return new Promise<string>((resolve, reject) => {
		let msg: m.CreatePartyRequest = {
			roomId,
		};
		socket.emit('party.create', msg, (response: m.CreatePartyResponseMsg) => {
			if (response.success === false) {
				reject(response.error);
			} else {
				resolve(response.partyId);
			}
		});
	}).then(partyId => joinParty(partyId));
}

export function joinParty(partyId: string): Promise<m.PartyResponse> {
	const store = StoreProvider.getState();
	if (partyId) {
		let response: m.PartyResponse;
		return new Promise<void>((resolve, reject) => {
			let msg: m.PartyRequest = {
				joining: true,
				partyId,
				playerName: store.playerName,
				keyBindings: store.keyBindings,
				isBot: ai.playingAsAI(store.room.allowBots),
				isMobile,
				ready: false,
			};
			socket.emit('party', msg, (_response: m.PartyResponseMsg) => {
				if (_response.success === false) {
					reject(_response.error);
				} else {
					response = _response;
					resolve();
				}
			});
		}).then(() => joinRoom(response.roomId))
		.then(() => {
			StoreProvider.dispatch({
				type: "joinParty",
				party: {
					id: response.partyId,
					members: response.members,
					ready: false,
				},
				server: response.server,
			});
		})
		.then(() => response)
	} else {
		return Promise.resolve<m.PartyResponse>(null);
	}
}

export function updateParty(ready: boolean): Promise<void> {
	const store = StoreProvider.getState();
	if (!store.party) {
		return Promise.resolve();
	}

	return new Promise<void>((resolve, reject) => {
		let msg: m.PartyRequest = {
			joining: false,
			partyId: store.party.id,
			playerName: store.playerName,
			keyBindings: store.keyBindings,
			isBot: ai.playingAsAI(store.room.allowBots),
			isMobile,
			ready,
		};
		socket.emit('party', msg, (response: m.PartyResponseMsg) => {
			if (response.success === false) {
				reject(response.error);
			} else {
				resolve();
			}
		});
	});
}

export function leaveParty(): Promise<void> {
	const store = StoreProvider.getState();
	if (!store.party) {
		return Promise.resolve();
	}

	return new Promise<void>((resolve, reject) => {
		let msg: m.LeavePartyRequest = { partyId: store.party.id };
		socket.emit('party.leave', msg, (response: m.LeavePartyResponseMsg) => {
			if (response.success === false) {
				reject(response.error);
			} else {
				StoreProvider.dispatch({ type: "leaveParty", partyId: response.partyId });
				resolve();
			}
		});
	}).then(() => leaveRoom());
}

function onPartyMsg(msg: m.PartyMsg) {
	const store = StoreProvider.getState();
	if (!(store.party && store.party.id === msg.partyId)) {
		return;
	}

	StoreProvider.dispatch({ type: "updateParty", partyId: msg.partyId, members: msg.members });
}