import * as m from '../../shared/messages.model';
import * as s from '../store.model';
import * as w from '../../game/world.model';
import * as engine from '../../game/engine';
import * as rooms from './rooms';
import * as StoreProvider from '../storeProvider';
import * as url from '../url';
import { getSocket } from './sockets';
import { loaded } from './loader';
import { isMobile } from './userAgent';

export async function createPartyAsync(): Promise<void> {
	await loaded(); // Ensure the correct room has been joined

	const store = StoreProvider.getState();
	return new Promise<string>((resolve, reject) => {
		let msg: m.CreatePartyRequest = {
			roomId: store.room.id,
			playerName: store.playerName,
			keyBindings: store.keyBindings,
			isMobile,
			unranked: store.options.unranked || false,
			version: engine.version(),
		};
		getSocket().emit('party.create', msg, (response: m.CreatePartyResponseMsg) => {
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
				isMobile,
				unranked: store.options.unranked || false,
				version: engine.version(),
			};
			getSocket().emit('party', msg, (_response: m.PartyResponseMsg) => {
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
					region: response.region,
					roomId: response.roomId,
					members: response.members,
					isLocked: response.isLocked,
					initialObserver: response.initialObserver,
					waitForPlayers: response.waitForPlayers,
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

export function updatePartySettingsAsync(request: m.PartySettingsRequest) {
	return new Promise<void>((resolve, reject) => {
		getSocket().emit('party.settings', request, (response: m.PartySettingsResponseMsg) => {
			if (response.success === false) {
				reject(response.error);
			} else {
				resolve();
			}
		});
	});
}

export function updatePartyAsync(): Promise<void> {
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
			isMobile,
			unranked: store.options.unranked,
			version: engine.version(),
		};
		getSocket().emit('party', msg, (response: m.PartyResponseMsg) => {
			if (response.success === false) {
				reject(response.error);
			} else {
				resolve();
			}
		});
	});
}

export async function kick(memberId: string): Promise<void> {
	const store = StoreProvider.getState();
	if (!store.party) {
		return;
	}

	return updatePartyStatusAsync({ partyId: store.party.id, memberId, kick: true });
}

export async function makeLeaderAsync(memberId: string, isLeader: boolean = true): Promise<void> {
	const store = StoreProvider.getState();
	if (!store.party) {
		return;
	}

	return updatePartyStatusAsync({ partyId: store.party.id, memberId, isLeader });
}

export async function makeObserverAsync(memberId: string, isObserver: boolean): Promise<void> {
	const store = StoreProvider.getState();
	if (!store.party) {
		return;
	}

	return updatePartyStatusAsync({ partyId: store.party.id, memberId, isObserver, isReady: false });
}

export async function updateReadyStatusAsync(isReady: boolean): Promise<void> {
	const store = StoreProvider.getState();
	if (!store.party) {
		return;
	}

	return updatePartyStatusAsync({ partyId: store.party.id, isReady });
}

async function updatePartyStatusAsync(request: m.PartyStatusRequest): Promise<void> {
	return new Promise<void>((resolve, reject) => {
		getSocket().emit('party.status', request, (response: m.PartyStatusResponseMsg) => {
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
		let msg: m.PartyStatusRequest = { partyId: store.party.id, kick: true };
		getSocket().emit('party.status', msg, (response: m.PartyStatusResponseMsg) => {
			if (response.success === false) {
				reject(response.error);
			} else {
				resolve();
			}
		});
	});
}

export async function onPartyMsg(msg: m.PartyMsg) {
	const store = StoreProvider.getState();
	if (!(store.party && store.party.id === msg.partyId)) {
		return;
	}

	if (msg.members.some(m => m.socketId === store.socketId)) {
		StoreProvider.dispatch({
			type: "updateParty",
			partyId: msg.partyId,
			roomId: msg.roomId,
			members: msg.members,
			isLocked: msg.isLocked,
			waitForPlayers: msg.waitForPlayers,
			initialObserver: msg.initialObserver,
		});
		await joinCurrentPartyRoomAsync();
	} else {
		await leavePartyAsync();
	}
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