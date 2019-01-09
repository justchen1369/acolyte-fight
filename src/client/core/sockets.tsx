import msgpackParser from 'socket.io-msgpack-parser';
import * as m from '../../game/messages.model';
import * as w from '../../game/world.model';
import * as SocketIO from 'socket.io-client';
import * as StoreProvider from '../storeProvider';
import { notify } from './notifications';

let currentSocket: SocketIOClient.Socket = null;

export let listeners: Listeners = {
	onTickMsg: () => { },
	onPartyMsg: () => { },
	onGameMsg: () => { },
	onHeroMsg: () => { },
	onRoomMsg: () => { },
	onReconnect: (socket) => { },
	onDisconnect: () => { },
};

export interface Listeners {
	onTickMsg: (msg: m.TickMsg) => void;
	onPartyMsg: (msg: m.PartyMsg) => void;
	onGameMsg: (msg: m.GameStatsMsg) => void;
	onHeroMsg: (msg: m.HeroMsg) => void;
	onRoomMsg: (msg: m.RoomUpdateMsg) => void;
	onReconnect: (socket: SocketIOClient.Socket) => void;
	onDisconnect: () => void;
}

export function getSocket() {
	return currentSocket;
}

export function connect(
	socketUrl: string,
	authToken: string): Promise<SocketIOClient.Socket> {

	return new Promise<SocketIOClient.Socket>((resolve, reject) => {
		const config: SocketIOClient.ConnectOpts = {
		};
		(config as any).parser = msgpackParser;

		if (authToken) {
			config.transportOptions = {
				polling: {
					extraHeaders: { [m.AuthHeader]: authToken }
				},
			};
		}
		const socket = SocketIO.default(socketUrl, config);

		let alreadyConnected = false;
		let serverInstanceId: string = null;

		socket.on('connect', () => {
			console.log("Connected as socket " + socket.id);
			socket.emit('instance', {} as m.ServerInstanceRequest, (response: m.ServerInstanceResponse) => {
				const newInstanceId = response.instanceId;
				if (serverInstanceId && serverInstanceId !== newInstanceId) {
					// The server has restarted, we need to reload because there might be a new release
					console.log("Server instance changed, forcing disconnect", serverInstanceId, newInstanceId);
					onServerRestarted();
					reject();
				} else {
					StoreProvider.dispatch({ type: "updateServer", server: response.server, region: response.region, socketId: socket.id });
					serverInstanceId = newInstanceId;

					if (alreadyConnected) {
						listeners.onReconnect(socket);
					} else {
						alreadyConnected = true;
						currentSocket = socket; // The socket is ready, make it used globally
						resolve(socket);
					}
				}
			});
		});
		socket.on('connect_error', (error: any) => {
			if (!alreadyConnected) {
				console.log("Socket connect error", error);
				reject(error);
			}
		});
		socket.on('connect_timeout', (timeout: any) => {
			if (!alreadyConnected) {
				console.log("Socket connect timeout", timeout);
				reject(timeout);
			}
		});
		socket.on('disconnect', (reason: string) => {
			console.log("Disconnected", reason);

			if (reason === 'io server disconnect') {
				onServerRestarted(); // no reconnect when the server itself has restarted
			}

			if (!alreadyConnected) {
				socket.close();
				reject("Failed to establish initial connection with server");
			}

			listeners.onDisconnect();
		});
		socket.on('tick', (msg: m.TickMsg) => listeners.onTickMsg(msg));
		socket.on('party', (msg: m.PartyMsg) => listeners.onPartyMsg(msg));
		socket.on('game', (msg: m.GameStatsMsg) => listeners.onGameMsg(msg));
		socket.on('hero', (msg: m.HeroMsg) => listeners.onHeroMsg(msg));
		socket.on('room', (msg: m.RoomUpdateMsg) => listeners.onRoomMsg(msg));
		socket.on('shutdown', (msg: any) => onServerPreparingToShutdown());
	});
}


export function proxy(socket: SocketIOClient.Socket, server: string): Promise<void> {
	if (server) {
		return new Promise<void>((resolve, reject) => {
			let msg: m.ProxyRequestMsg = { server };
			socket.emit('proxy', msg, (response: m.ProxyResponseMsg) => {
				if (response.success === false) {
					console.log(`Failed to connect to upstream ${server}`);
					reject(response.error);
				} else {
					StoreProvider.dispatch({ type: "updateServer", server: response.server, region: response.region, socketId: response.socketId });
					console.log(`Connected to upstream ${server}, changed to socketId ${response.socketId}`);
					resolve();
				}
			});
		});
	} else {
		return Promise.resolve();
	}
}

function onServerPreparingToShutdown() {
	console.log("Server preparing to shutdown");
	StoreProvider.dispatch({ type: "serverPreparingToShutdown" });
}

function onServerRestarted() {
	console.log("Server restarted");
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
	send(actionMsg);
}

export function sendTextMessage(gameId: string, heroId: string, text: string) {
	const actionMsg: m.ActionMsg = {
		gameId,
		heroId,
		actionType: m.ActionType.Text,
		text,
	};
	send(actionMsg);
}

export function sendKeyBindings(gameId: string, heroId: string, keyBindings: KeyBindings) {
	if (!(gameId && heroId)) {
		return;
	}

	const actionMsg: m.ActionMsg = {
		gameId,
		heroId,
		actionType: m.ActionType.Spells,
		keyBindings,
	}
	send(actionMsg);
}

function send(msg: m.ActionMsg) {
	getSocket().emit('action', msg);
}