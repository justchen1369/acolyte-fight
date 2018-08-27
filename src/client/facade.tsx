import pl from 'planck-js';
import { TicksPerTurn, TicksPerSecond } from '../game/constants';
import { render, CanvasStack } from './render';
import { DefaultSettings, calculateMod } from '../game/settings';
import * as ai from './ai';
import * as engine from '../game/engine';
import * as m from '../game/messages.model';
import * as s from './store.model';
import * as w from '../game/world.model';

export { worldPointFromInterfacePoint, whichKeyClicked, touchControls, resetRenderState, CanvasStack } from './render';

const BufferDecayPerTick = 0.999;

interface NotificationListener {
	(notifications: w.Notification[]): void;
}

let room: s.RoomState = {
	id: null,
	mod: {},
	allowBots: false,
};
let world = engine.initialWorld(room.mod, room.allowBots);

let socket: SocketIOClient.Socket = null;

let tickQueue = new Array<m.TickMsg>();
let incomingQueue = new Array<m.TickMsg>();
let allowedDelay = 1;

let notificationListeners = new Array<NotificationListener>();

let preferredColors = new Map<string, string>(); // player name -> color

ai.attach(sendAction);
        
setInterval(incomingLoop, Math.floor(1000 / TicksPerSecond));
setInterval(() => ai.onTick(world), 200);

export function getCurrentWorld(): w.World {
	return world;
}
        
function incomingLoop() {
	let numFramesToProcess;
	if (world.ui.myHeroId) {
		if (incomingQueue.length === 0) {
			numFramesToProcess = 0;
			allowedDelay = Math.min(TicksPerSecond, allowedDelay + 1);
		} else if (incomingQueue.length <= TicksPerTurn + allowedDelay) {
			numFramesToProcess = 1; // We're on time, process at normal rate
		} else if (incomingQueue.length <= TicksPerSecond) {
			numFramesToProcess = 2; // We're behind, but not by much, catch up slowly
			allowedDelay = Math.max(1, allowedDelay - 1);
		} else {
			// We're very behind, skip ahead
			numFramesToProcess = incomingQueue.length;
			allowedDelay = 0;
		}

		if (allowedDelay > 1) {
			allowedDelay = Math.max(1, allowedDelay * BufferDecayPerTick);
		}
	} else {
		// Don't catch up to live when watching a replay
		numFramesToProcess = incomingQueue.length > 0 ? 1 : 0;
	}

	for (let i = 0; i < numFramesToProcess; ++i) {
		tickQueue.push(incomingQueue.shift());
	}
}

export function connectToServer(server: string): Promise<void> {
	if (server) {
		return new Promise<void>((resolve, reject) => {
			let msg: m.ProxyRequestMsg = { server };
			socket.emit('proxy', msg, (response: m.ProxyResponseMsg) => {
				if (response.success === false) {
					reject(response.error);
				} else {
					resolve();
				}
			});
		});
	} else {
		return Promise.resolve();
	}
}

export function createRoom(mod: Object, allowBots: boolean): Promise<m.CreateRoomResponse> {
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
	if (roomId) {
		return new Promise<void>((resolve, reject) => {
			let msg: m.JoinRoomRequest = { roomId };
			socket.emit('room', msg, (response: m.JoinRoomResponseMsg) => {
				if (response.success === false) {
					reject(response.error);
				} else {
					room = {
						id: roomId,
						mod: response.mod || {},
						allowBots: response.allowBots || false,
					};
					world = engine.initialWorld(room.mod, room.allowBots);
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
	room = {
		id: null,
		mod: {},
		allowBots: false,
	};
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

export function joinNewGame(playerName: string, keyBindings: KeyBindings, observeGameId?: string) {
	leaveCurrentGame();

	const msg: m.JoinMsg = {
		gameId: observeGameId || null,
		name: playerName,
		keyBindings,
		room: room.id,
		isBot: ai.playingAsAI(room.allowBots) && !observeGameId,
		observe: !!observeGameId,
	};
	socket.emit('join', msg, (hero: m.JoinResponseMsg) => {
		if (hero) {
			onHeroMsg(hero);
		} else {
			notify({ type: "replayNotFound" });
		}
	});
}

export function addBotToCurrentGame() {
	if (world.ui.myGameId && world.ui.myHeroId) {
		const botMsg: m.BotMsg = { gameId: world.ui.myGameId };
		socket.emit('bot', botMsg);
	}
}

export function leaveCurrentGame() {
	world.players.forEach(player => {
		preferredColors.set(player.name, player.uiColor);
	});

	if (world.ui.myGameId) {
		const leaveMsg: m.LeaveMsg = { gameId: world.ui.myGameId };
		socket.emit('leave', leaveMsg);
	}

	world = engine.initialWorld(room.mod, room.allowBots);

	notify({ type: "quit" });
}

export function attachNotificationListener(listener: NotificationListener) {
	notificationListeners.push(listener);
}

export function frame(canvasStack: CanvasStack) {
	while (tickQueue.length > 0 && tickQueue[0].gameId != world.ui.myGameId) {
		tickQueue.shift(); // Get rid of any leftover ticks from other games
	}
	while (tickQueue.length > 0 && tickQueue[0].tick <= world.tick) {
		let tickData = tickQueue.shift();
		if (tickData.tick < world.tick) {
			continue; // Received the same tick multiple times, skip over it
		}

		applyTickActions(tickData, world);
		engine.tick(world);
	}
	render(world, canvasStack);

	const notifications = engine.takeNotifications(world);
	notify(...notifications);
}

export function notify(...notifications: w.Notification[]) {
	if (notifications.length > 0) {
		notificationListeners.forEach(listener => listener(notifications));
	}
}

// Sockets
export function attachToSocket(_socket: SocketIOClient.Socket, onConnect: () => void) {
	socket = _socket;
	socket.on('connect', () => {
		console.log("Connected as socket " + socket.id);
		onConnect();
	});
	socket.on('disconnect', () => {
		console.log("Disconnected");
		onDisconnectMsg();
	});
	socket.on('tick', onTickMsg);
	socket.on('party', onPartyMsg);
}
function onHeroMsg(data: m.JoinResponseMsg) {
	world = engine.initialWorld(data.mod, data.allowBots);
	tickQueue = [];
	incomingQueue = [...data.history];

	world.ui.myGameId = data.gameId;
	world.ui.myHeroId = data.heroId;

	// Skip to start of game
	while (incomingQueue.length > 0 && !isStartGameTick(incomingQueue[0])) {
		tickQueue.push(incomingQueue.shift());
	}

	console.log("Joined game " + world.ui.myGameId + " as hero id " + world.ui.myHeroId, data.mod, data.allowBots);

	notify({
		type: "new",
		gameId: world.ui.myGameId,
		heroId: world.ui.myHeroId,
		room: data.room,
		numGames: data.numGames,
		numPlayers: data.numPlayers,
	});
}
function onTickMsg(data: m.TickMsg) {
	if (data.gameId === world.ui.myGameId) {
		incomingQueue.push(data);
	}
}
function onDisconnectMsg() {
	world.activePlayers.clear();
	notify({ type: "disconnected" });
}
export function sendAction(gameId: string, heroId: string, action: w.Action) {
	if (!(gameId && heroId)) {
		return;
	}

	const actionMsg: m.ActionMsg = {
		gameId,
		heroId,
		actionType: m.ActionType.GameAction,
		spellId: action.type,
		targetX: action.target.x,
		targetY: action.target.y,
	}
	socket.emit('action', actionMsg);
}
function applyTickActions(tickData: m.TickMsg, world: w.World) {
	if (tickData.gameId !== world.ui.myGameId) {
		return;
	}

	tickData.actions.forEach(actionData => {
		if (actionData.gameId !== world.ui.myGameId) {
			// Skip this action
		} else if (actionData.actionType === m.ActionType.GameAction) {
			world.actions.set(actionData.heroId, {
				type: actionData.spellId,
				target: pl.Vec2(actionData.targetX, actionData.targetY),
			});
		} else if (actionData.actionType === m.ActionType.CloseGame) {
			world.occurrences.push({
				type: "closing",
				startTick: actionData.closeTick,
			});
		} else if (actionData.actionType === m.ActionType.Join) {
			world.occurrences.push({
				type: "join",
				heroId: actionData.heroId,
				playerName: actionData.playerName || "Acolyte",
				keyBindings: actionData.keyBindings,
				preferredColor: preferredColors.get(actionData.playerName) || null,
				isBot: actionData.isBot,
			});
		} else if (actionData.actionType === m.ActionType.Bot) {
			world.occurrences.push({
				type: "botting",
				heroId: actionData.heroId,
				keyBindings: actionData.keyBindings,
			});
		} else if (actionData.actionType === m.ActionType.Leave) {
			world.occurrences.push({
				type: "leave",
				heroId: actionData.heroId,
			});
		} else if (actionData.actionType === m.ActionType.Environment) {
			world.occurrences.push({
				type: "environment",
				seed: actionData.seed,
			});
		}
	});
}

function isStartGameTick(tickData: m.TickMsg) {
	let result = false;
	tickData.actions.forEach(actionData => {
		if (actionData.actionType === m.ActionType.CloseGame) {
			result = true;
		}
	});
	return result;
}

function onPartyMsg(msg: m.PartyMsg) {
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
	if (msg.members.length > 0 && allReady && meReady && worldInterruptible(world)) {
		notify({
			type: "startParty",
			partyId: msg.partyId,
		});
	}
}

export function worldInterruptible(world: w.World) {
	return world.activePlayers.size <= 1
		|| !!world.winner
		|| !world.ui.myHeroId
		|| !world.objects.has(world.ui.myHeroId);
}