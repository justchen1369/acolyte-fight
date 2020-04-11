import pl from 'planck-js';
import * as m from '../../shared/messages.model';
import * as s from '../store.model';
import * as w from '../../game/world.model';
import * as ai from '../ai/ai';
import * as activated from './activated';
import * as engine from '../../game/engine';
import * as messages from './messages';
import * as performance from './performance';
import * as processor from './processor';
import * as sockets from './sockets';
import * as StoreProvider from '../storeProvider';
import { render, direct, CanvasStack, RenderOptions} from '../graphics/render';
import { TicksPerTurn, TicksPerSecond } from '../../game/constants';

type PlayersMessage = s.JoinMessage | s.LeaveMessage | s.SplitMessage;
type PlayersMessageType = PlayersMessage['type'];
type DiscriminatePlayersMessage<T extends PlayersMessageType> = Extract<PlayersMessage, {type: T}>

export interface NotificationListener {
    (newNotifications: w.Notification[]): void;
}

const listeners = new Array<NotificationListener>();

let tickQueue = new Array<m.TickMsg>();
let incomingQueue = new Array<m.TickMsg>();
let allowedDelay = 1;

export const interval = Math.floor(1000 / TicksPerSecond);
let tickEpoch = Date.now();
let tickCounter = 0;

let previousFrameTime = 0;

export function attachListener(listener: NotificationListener) {
    listeners.push(listener);
}

export function reset(history: m.TickMsg[], live: boolean) {
	if (live) {
		tickQueue = [...history];
		incomingQueue = [];
	} else {
		// Skip to start of game
		tickQueue = [];
		incomingQueue = [...history];

		while (incomingQueue.length > 0 && !processor.isStartGameTick(incomingQueue[0])) {
			tickQueue.push(incomingQueue.shift());
		}
	}
}

export function purge(universeId: number) {
	tickQueue = tickQueue.filter(t => t.u !== universeId);
	incomingQueue = incomingQueue.filter(t => t.u !== universeId);
}

function calculateTicksFromCurrentTime() {
	const tickTarget = Math.floor((Date.now() - tickEpoch) / interval);
	if (tickTarget > tickCounter) {
		// Try to handle the fact that the frame rate might not be a perfect multiple of the tick rate
		let numFrames = tickTarget - tickCounter;
		if (numFrames > 4) {
			// Too many frames behind, we probably closed the window or exited a game and started a new one, just proceed at the normal pace
			tickEpoch = Date.now();
			tickCounter = 0;
			numFrames = 1;
		} else {
			tickCounter += numFrames;
		}
		return numFrames;
	} else {
		return 0;
	}
}

function calculateCatchupTicks() {
	const world = StoreProvider.getState().world;

	if (world.ui.live) {
		if (incomingQueue.length === 0) {
			return 0;
		} else if (incomingQueue.length <= TicksPerTurn + allowedDelay) {
			return 0; // We're on time, process at normal rate
		} else if (incomingQueue.length <= TicksPerSecond) {
			return 2; // We're behind, but not by much, catch up slowly
		} else {
			// We're very behind, skip ahead
			return Math.max(0, incomingQueue.length - allowedDelay);
		}
	} else {
		// Don't catch up to live when watching a replay
		return 0;
	}
}

function queueTicks(numFramesToProcess: number) {
	let unavailable = 0;
	for (let i = 0; i < numFramesToProcess; ++i) {
		if (incomingQueue.length > 0) {
			tickQueue.push(incomingQueue.shift());
		} else {
			++unavailable;
		}
	}
	tickQueue.sort(tickComparer);
	return unavailable;
}

function tickComparer(a: m.TickMsg, b: m.TickMsg) {
	if (a.t < b.t) {
		return -1;
	} else if (a.t > b.t) {
		return 1;
	} else {
		return 0;
	}
}

export function frame(canvasStack: CanvasStack, world: w.World, renderOptions: RenderOptions, visible: boolean = true) {
	const active = visible && (activated.isActive() || !world.ui.myHeroId); // If playing, must be playing actively

	if (active && world.ui.renderedTick && previousFrameTime) {
		// If have rendered before so the initial render overhead is not counted
		const now = Date.now();
		const renderMilliseconds = now - previousFrameTime;
		performance.recordGraphics(renderMilliseconds);
	}

	const start = Date.now();
	const numTicks = Math.max(
		calculateTicksFromCurrentTime(),
		calculateCatchupTicks());
	const unavailable = queueTicks(numTicks);

	let numTicksProcessed = 0;
	while (tickQueue.length > 0) {
		const next = tickQueue.shift();
		if (next.u === world.ui.universeId && next.t === world.tick) {
			// Drain ticks from other queues or repeated ticks
			processor.applyTick(next, world);
			++numTicksProcessed;

			/*
			const hash = engine.hash(world);
			console.log(`tick ${world.ui.myGameId} ${world.tick} ${hash}`);
			*/
		}
	}

	if (world.finished || !world.ui.myGameId) {
		// Server is done, tick forward without server messages
		for (let i = 0; i < unavailable; ++i) {
			engine.tick(world);
			++numTicksProcessed;
		}
	} else {
		if (active) {
			const success = !unavailable;
			performance.recordNetwork(success);
		}
	}

	if (world.tick > 0) { // Tick 0 does not have the map yet, don't render it otherwise the screen flashes
		direct(world, canvasStack, renderOptions);
		render(world, canvasStack, renderOptions);
	}

	sendSnapshot(world);
	notificationTick(world);
	aiTick(world);

	if (numTicksProcessed > 0) {
		const calculationMilliseconds = Date.now() - start; 
		performance.recordCalculation(calculationMilliseconds / numTicksProcessed);
	}

	// Only update this after CPU processing is complete so we can measure graphics by itself
	if (active) {
		performance.tick();
	}
	previousFrameTime = Date.now();
}

function notificationTick(world: w.World) {
	const notifications = engine.takeNotifications(world);
	if (notifications.length === 0) {
		return;
	}

    for (const notif of notifications) {
        handleNotification(notif, world);
	}

    listeners.forEach(listener => listener(notifications));
}

function aiTick(world: w.World) {
	ai.onTick(world, {
		action: sendActionXX,
		spells: sendKeyBindingsXX,
	})
}

export function onTickMsg(data: m.TickMsg) {
	const world = StoreProvider.getState().world;
	if (data.u === world.ui.universeId) {
		incomingQueue.push(data);
	}
}

function sendSnapshot(world: w.World) {
	if (!(world.ui.myGameId && world.ui.myHeroId && world.snapshots.length > 0)) {
		return;
	}

	const snapshot = world.snapshots[world.snapshots.length - 1];
	if (snapshot.tick <= world.ui.sentSnapshotTick) {
		return;
	}
	world.ui.sentSnapshotTick = snapshot.tick;

	const heroes = new Array<m.ObjectSyncMsg>();
	snapshot.objectLookup.forEach((heroSnapshot, heroId) => {
		heroes.push({
			id: heroId,
			h: heroSnapshot.health,
			x: heroSnapshot.pos.x,
			y: heroSnapshot.pos.y,
		});
	});

	const syncMsg: m.SyncMsg = {
		t: snapshot.tick,
		o: heroes,
	};
	const packet: m.SyncMsgPacket = {
		g: world.ui.myGameId,
		s: syncMsg,
	};

	sockets.getSocket().emit('sync', packet);
}

export function sendActionXX(gameId: string, heroId: number, action: w.Action, controlKey?: number) {
	const Precision = 1.0 / 1024;

	if (!(gameId && heroId)) {
		return;
	}

	const state = StoreProvider.getState();
	const world = state.world;
	if (!(world.ui.myGameId === gameId && world.objects.has(heroId))) {
		// Don't send any actions for dead heroes
		return;
	}

	const actionMsg: m.ActionMsg = {
		c: controlKey || world.ui.controlKeyXX,
		type: m.ActionType.GameAction,
		s: action.type,
		x: Math.round(action.target.x / Precision) * Precision,
		y: Math.round(action.target.y / Precision) * Precision,
		r: action.release,
	}

	send(gameId, heroId, actionMsg);
}

export function sendKeyBindingsXX(gameId: string, heroId: number, keyBindings: KeyBindings, controlKey?: number) {
	if (!(gameId && heroId)) {
		return;
	}

	const state = StoreProvider.getState();
	const world = state.world;
	const actionMsg: m.ActionMsg = {
		c: controlKey || world.ui.controlKeyXX,
		type: m.ActionType.Spells,
		keyBindings,
	}

	send(gameId, heroId, actionMsg);
}

function send(gameId: string, heroId: number, actionMsg: m.ActionMsg) {
	const state = StoreProvider.getState();
	const world = state.world;
	if (!(world.ui.myGameId === gameId && world.objects.has(heroId))) {
		// Don't send any actions for dead heroes
		return;
	}
	sockets.getSocket().emit('action', actionMsg);
}

function handleNotification(notif: w.Notification, world: w.World) {
    switch (notif.type) {
		case "closing": return handleClosing(notif, world);
		case "teams": return handleTeams(notif, world);
		case "join": return handleJoin(notif, world);
		case "bot": return handleBot(notif, world);
		case "leave": return handleLeave(notif, world);
		case "kill": return handleKill(notif, world);
        case "win": return handleWin(notif, world);
    }
}

function handleClosing(notif: w.CloseGameNotification, world: w.World) {
	messages.push({ ...notif, gameId: world.ui.myGameId, type: "starting" });
}

function handleTeams(notif: w.TeamsNotification, world: w.World) {
	messages.push({ ...notif, gameId: world.ui.myGameId, type: "teams" });
}

function handleJoin(notif: w.JoinNotification, world: w.World) {
	const gameId = world.ui.myGameId;
	appendPlayerToMessage("join", gameId, notif.player);
}

function handleBot(notif: w.BotNotification, world: w.World) {
	const gameId = world.ui.myGameId;
	appendPlayerToMessage("join", gameId, notif.player);
}

function handleLeave(notif: w.LeaveNotification, world: w.World) {
	const gameId = world.ui.myGameId;
	if (notif.split) {
		appendPlayerToMessage("split", gameId, notif.player);
	} else {
		appendPlayerToMessage("leave", gameId, notif.player);
	}
}

function appendPlayerToMessage(type: PlayersMessageType, gameId: string, newPlayer: w.Player) {
	messages.update(type, previous => {
		return {
			type,
			gameId,
			players: appendPlayer(gameId, previous, newPlayer),
		};
	});
}

function appendPlayer(gameId: string, previous: PlayersMessage, newPlayer: w.Player) {
	let players = new Array<w.Player>();
	if (previous && previous.gameId === gameId) {
		players.push(...previous.players);

		if (newPlayer.userHash) { // Don't repeat a player in the list
			players = players.filter(p => p.userHash !== newPlayer.userHash);
		}
	}
	players.push(newPlayer);
	return players;
}

function handleKill(notif: w.KillNotification, world: w.World) {
	messages.push({ ...notif, gameId: world.ui.myGameId, type: "kill" });
}

function handleWin(notif: w.WinNotification, world: w.World) {
	messages.push({ ...notif, gameId: world.ui.myGameId, type: "win" });
}