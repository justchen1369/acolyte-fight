import msgpack from 'msgpack-lite';
import * as m from '../../game/messages.model';
import * as w from '../../game/world.model';
import * as engine from '../../game/engine';
import * as StoreProvider from '../storeProvider';
import { notify } from './notifications';

let serverInstanceId: string = null;

export let socket: SocketIOClient.Socket = null;

export let listeners: Listeners = {
	onTickMsg: () => { },
	onPartyMsg: () => { },
	onGameMsg: () => { },
	onHeroMsg: () => { },
};

export interface Listeners {
	onTickMsg: (msg: ArrayBuffer) => void;
	onPartyMsg: (msg: m.PartyMsg) => void;
	onGameMsg: (msg: m.GameStatsMsg) => void;
	onHeroMsg: (msg: ArrayBuffer) => void;
}

export function connectToServer(server: string): Promise<void> {
	if (server) {
		return new Promise<void>((resolve, reject) => {
			let msg: m.ProxyRequestMsg = { server };
			socket.emit('proxy', msg, (response: m.ProxyResponseMsg) => {
				if (response.success === false) {
					console.log(`Failed to connect to upstream ${server}`);
					reject(response.error);
				} else {
					StoreProvider.dispatch({ type: "updateServer", server: response.server });
					console.log(`Connected to upstream ${server}`);
					resolve();
				}
			});
		});
	} else {
		return Promise.resolve();
	}
}

export function attachToSocket(_socket: SocketIOClient.Socket, onConnect: () => void) {
	socket = _socket;
	socket.on('connect', () => {
		console.log("Connected as socket " + socket.id);
		socket.emit('instance', {} as m.ServerInstanceRequest, (response: m.ServerInstanceResponse) => {
			const newInstanceId = response.instanceId;
			if (serverInstanceId && serverInstanceId !== newInstanceId) {
				// The server has restarted, we need to reload because there might be a new release
				onDisconnectMsg();
			} else {
				StoreProvider.dispatch({ type: "updateServer", server: response.server });
				serverInstanceId = newInstanceId;
				onConnect();
			}
		});
	});
	socket.on('disconnect', () => {
		console.log("Disconnected");
		onDisconnectMsg();
	});
	socket.on('tick', (msg: ArrayBuffer) => listeners.onTickMsg(msg));
	socket.on('party', (msg: m.PartyMsg) => listeners.onPartyMsg(msg));
	socket.on('game', (msg: m.GameStatsMsg) => listeners.onGameMsg(msg));
	socket.on('hero', (msg: ArrayBuffer) => listeners.onHeroMsg(msg));
}
function onDisconnectMsg() {
	StoreProvider.dispatch({ type: "disconnected" });
	notify({ type: "disconnected" });
}

export function sendAction(gameId: string, heroId: string, action: w.Action) {
	const Precision = 0.001;

	if (!(gameId && heroId)) {
		return;
	}

	const actionMsg: m.ActionMsg = {
		gameId,
		heroId,
		actionType: m.ActionType.GameAction,
		spellId: action.type,
		targetX: Math.round(action.target.x / Precision) * Precision,
		targetY: Math.round(action.target.y / Precision) * Precision,
	}
	const buffer = msgpack.encode(actionMsg);
	socket.emit('action', buffer);
}

export function sendTextMessage(gameId: string, heroId: string, text: string) {
	const actionMsg: m.ActionMsg = {
		gameId,
		heroId,
		actionType: m.ActionType.Text,
		text,
	};
	const buffer = msgpack.encode(actionMsg);
	socket.emit('action', buffer);
}