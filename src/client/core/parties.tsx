import * as m from '../../game/messages.model';
import * as s from '../store.model';
import * as w from '../../game/world.model';
import * as engine from '../../game/engine';
import * as matches from './matches';
import * as sockets from './sockets';
import * as Storage from './storage';
import * as StoreProvider from '../storeProvider';
import * as url from './url';
import { notify } from './notifications';
import { readFileAsync } from './fileUtils';
import { socket } from './sockets';

sockets.listeners.onPartyMsg = onPartyMsg;

export function createRoomFromFile(file: File, current: url.PathElements) {
    return readFileAsync(file)
        .then(json => json ? JSON.parse(json) : {})
        .then(mod => createRoomFromMod(mod, current))
}

function createRoomFromMod(mod: Object, current: url.PathElements) {
    return createRoom(mod, false, current);
}

export function createRoom(mod: Object, allowBots: boolean, current: url.PathElements, nextPage: string = "share") {
    console.log("Creating room", mod, allowBots);
    return createRoomCall(mod, allowBots).then(response => createParty(response.roomId, Storage.getOrCreatePlayerName()))
        .then(msg => {
            const path = url.getPath(Object.assign({}, current, {
                gameId: null,
                page: nextPage,
                party: msg.partyId,
                server: msg.server,
            }));
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
	const store = StoreProvider.getStore();
	if (roomId) {
		return new Promise<void>((resolve, reject) => {
			let msg: m.JoinRoomRequest = { roomId };
			socket.emit('room', msg, (response: m.JoinRoomResponseMsg) => {
				if (response.success === false) {
					reject(response.error);
				} else {
					const room: s.RoomState = store.room = {
						id: roomId,
						mod: response.mod || {},
						allowBots: response.allowBots || false,
					};
					store.world = engine.initialWorld(room.mod, room.allowBots);
					notify({ type: "room", roomId: response.roomId });
					resolve();
				}
			});
		});
	} else {
		return Promise.resolve();
	}
}

export function leaveRoom(): Promise<void> {
	const store = StoreProvider.getStore();

	const room: s.RoomState = store.room = {
		id: null,
		mod: {},
		allowBots: false,
	};
	store.world = engine.initialWorld(room.mod, room.allowBots);
	notify({ type: "room", roomId: null });
	return Promise.resolve();
}

export function createParty(roomId: string, playerName: string): Promise<m.PartyResponse> {
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
	}).then(partyId => joinParty(partyId, playerName));
}

export function joinParty(partyId: string, playerName: string): Promise<m.PartyResponse> {
	if (partyId) {
		let response: m.PartyResponse;
		return new Promise<void>((resolve, reject) => {
			let msg: m.PartyRequest = {
				partyId,
				playerName,
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
		.then(() => notify({ type: "joinParty", partyId: response.partyId, server: response.server, members: response.members }))
		.then(() => response)
	} else {
		return Promise.resolve<m.PartyResponse>(null);
	}
}

export function updateParty(partyId: string, playerName: string, ready: boolean): Promise<void> {
	return new Promise<void>((resolve, reject) => {
		let msg: m.PartyRequest = {
			partyId,
			playerName,
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

export function leaveParty(partyId: string): Promise<void> {
	if (partyId) {
		return new Promise<void>((resolve, reject) => {
			let msg: m.PartyRequest = {
				partyId,
				playerName: null,
				ready: false,
			};
			socket.emit('party', msg, (response: m.PartyResponseMsg) => {
				if (response.success === false) {
					reject(response.error);
				} else {
					notify({ type: "leaveParty", partyId: response.partyId });
					resolve();
				}
			});
		}).then(() => leaveRoom());
	} else {
		return Promise.resolve();
	}
}

function onPartyMsg(msg: m.PartyMsg) {
    const world = StoreProvider.getStore().world;

	notify({
		type: "updateParty",
		partyId: msg.partyId,
		members: msg.members,
	});

	let meReady = false;
	let allReady = true;
	msg.members.forEach(member => {
		if (!member.ready) {
			allReady = false;
		}
		if (member.socketId === socket.id) {
			meReady = member.ready;
		}
	});
	if (msg.members.length > 0 && allReady && meReady && matches.worldInterruptible(world)) {
		notify({
			type: "startParty",
			partyId: msg.partyId,
		});
	}
}