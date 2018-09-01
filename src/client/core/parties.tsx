import * as m from '../../game/messages.model';
import * as s from '../store.model';
import * as w from '../../game/world.model';
import * as ai from './ai';
import * as engine from '../../game/engine';
import * as matches from './matches';
import * as rooms from './rooms';
import * as sockets from './sockets';
import * as Storage from '../storage';
import * as StoreProvider from '../storeProvider';
import * as url from '../url';
import { notify } from './notifications';
import { readFileAsync } from './fileUtils';
import { socket } from './sockets';
import { isMobile } from './userAgent';

export interface UpdatePartyConfig {
	ready?: boolean;
	observing?: boolean;
}

sockets.listeners.onPartyMsg = onPartyMsg;

export function createPartyAsync(): Promise<void> {
	const store = StoreProvider.getState();
	return new Promise<string>((resolve, reject) => {
		let msg: m.CreatePartyRequest = {
			roomId: store.room.id,
		};
		socket.emit('party.create', msg, (response: m.CreatePartyResponseMsg) => {
			if (response.success === false) {
				reject(response.error);
			} else {
				resolve(response.partyId);
			}
		});
	}).then(partyId => joinPartyAsync(partyId));
}

export function joinPartyAsync(partyId: string): Promise<void> {
	const store = StoreProvider.getState();
	if (partyId) {
		let response: m.PartyResponse;
		return new Promise<void>((resolve, reject) => {
			let msg: m.PartyRequest = {
				joining: true,
				partyId,
				playerName: store.playerName,
				keyBindings: store.keyBindings,
				isBot: ai.playingAsAI(store),
				isMobile,
				isObserver: false,
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
		})
		.then(() => {
			StoreProvider.dispatch({
				type: "joinParty",
				party: {
					id: response.partyId,
					server: response.server,
					roomId: response.roomId,
					members: response.members,
					isPrivate: response.isPrivate,
					ready: false,
					observing: false,
				},
			});
			return joinCurrentPartyRoomAsync();
		});
	} else {
		return Promise.resolve();
	}
}

export function movePartyAsync(roomId: string | null): Promise<void> {
	const store = StoreProvider.getState();
	if (!store.party) {
		return Promise.resolve();
	}

	let msg: m.PartySettingsRequest = {
		partyId: store.party.id,
		roomId,
	};
	return updatePartySettingsAsync(msg);
}

export function privatePartyAsync(isPrivate: boolean): Promise<void> {
	const store = StoreProvider.getState();
	if (!store.party) {
		return Promise.resolve();
	}

	let msg: m.PartySettingsRequest = {
		partyId: store.party.id,
		isPrivate,
	};
	return updatePartySettingsAsync(msg);
}

function updatePartySettingsAsync(request: m.PartySettingsRequest) {
	return new Promise<void>((resolve, reject) => {
		socket.emit('party.settings', request, (response: m.PartySettingsResponseMsg) => {
			if (response.success === false) {
				reject(response.error);
			} else {
				resolve();
			}
		});
	});
}

export function updatePartyAsync(config: UpdatePartyConfig): Promise<void> {
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
			isBot: ai.playingAsAI(store),
			isMobile,
			isObserver: config.observing !== undefined ? config.observing : store.party.observing,
			ready: config.ready !== undefined ? config.ready : store.party.ready,
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

export function leavePartyAsync(): Promise<void> {
	const store = StoreProvider.getState();
	if (!store.party) {
		return Promise.resolve();
	}

	StoreProvider.dispatch({ type: "leaveParty", partyId: store.party.id });

	return new Promise<void>((resolve, reject) => {
		let msg: m.LeavePartyRequest = { partyId: store.party.id };
		socket.emit('party.leave', msg, (response: m.LeavePartyResponseMsg) => {
			if (response.success === false) {
				reject(response.error);
			} else {
				resolve();
			}
		});
	});
}

function onPartyMsg(msg: m.PartyMsg) {
	const store = StoreProvider.getState();
	if (!(store.party && store.party.id === msg.partyId)) {
		return;
	}

	StoreProvider.dispatch({
		type: "updateParty",
		partyId: msg.partyId,
		roomId: msg.roomId,
		members: msg.members,
		isPrivate: msg.isPrivate,
	});
	joinCurrentPartyRoomAsync();
}

function joinCurrentPartyRoomAsync(): Promise<void> {
	const store = StoreProvider.getState();
	if (store.party && store.room.id !== store.party.roomId) {
		console.log(`Party ${store.party.id} joined room ${store.party.roomId}`);
		if (store.party.roomId) {
			return rooms.getRoomAsync(store.party.roomId).then(response => {
				// Recheck in case the room has changed while the request was in progress
				const store2 = StoreProvider.getState();
				if (store2.party && store2.party.roomId === response.roomId) {
					rooms.joinRoomFrom(response);
				}
			});
		} else {
			rooms.leaveRoom();
		}
	}
	return Promise.resolve();
}