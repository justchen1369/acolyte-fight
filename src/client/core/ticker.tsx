import pl from 'planck-js';
import * as m from '../../game/messages.model';
import * as w from '../../game/world.model';
import * as engine from '../../game/engine';
import * as processor from './processor';
import * as sockets from './sockets';
import * as StoreProvider from '../storeProvider';
import { render, CanvasStack, RenderOptions } from '../graphics/render';
import { TicksPerTurn, TicksPerSecond, HeroColors } from '../../game/constants';
import { notify } from './notifications';

const blacklist = /circumcis|sexual|orgasm/i;

const preferredColors = new Map<string, string>(); // userHash -> color

let tickQueue = new Array<m.TickMsg>();
let incomingQueue = new Array<m.TickMsg>();
let allowedDelay = 1;

const interval = Math.floor(1000 / TicksPerSecond);
let tickEpoch = Date.now();
let tickCounter = 0;

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

export function setPreferredColor(userHash: string, color: string) {
	preferredColors.set(userHash, color);
}



function incomingLoop(minFramesToProcess: number) {
	const world = StoreProvider.getState().world;

	let numFramesToProcess;
	if (world.ui.myHeroId) {
		if (incomingQueue.length === 0) {
			numFramesToProcess = 0;
		} else if (incomingQueue.length <= TicksPerTurn + allowedDelay) {
			numFramesToProcess = 1; // We're on time, process at normal rate
		} else if (incomingQueue.length <= TicksPerSecond) {
			numFramesToProcess = 2; // We're behind, but not by much, catch up slowly
		} else {
			// We're very behind, skip ahead
			numFramesToProcess = incomingQueue.length;
		}
	} else {
		// Don't catch up to live when watching a replay
		numFramesToProcess = incomingQueue.length > 0 ? 1 : 0;
	}

	numFramesToProcess = Math.max(minFramesToProcess, numFramesToProcess);

	for (let i = 0; i < numFramesToProcess; ++i) {
		if (incomingQueue.length > 0) {
			tickQueue.push(incomingQueue.shift());
		}
	}
}

export function frame(canvasStack: CanvasStack, world: w.World, renderOptions: RenderOptions) {
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
		incomingLoop(numFrames);
	}

	while (tickQueue.length > 0 && tickQueue[0].gameId != world.ui.myGameId) {
		tickQueue.shift(); // Get rid of any leftover ticks from other games
	}
	while (tickQueue.length > 0 && tickQueue[0].tick <= world.tick) {
		let tickData = tickQueue.shift();
		if (tickData.tick < world.tick) {
			continue; // Received the same tick multiple times, skip over it
		}

		processor.applyTick(tickData, world, preferredColors);

		/*
		const hash = engine.hash(world);
		console.log(`tick ${world.ui.myGameId} ${world.tick} ${hash}`);
		*/
	}
	render(world, canvasStack, renderOptions);

	const notifications = engine.takeNotifications(world);
	if (notifications.length > 0) {
		notify(...notifications);
	}

	sendSnapshot(world);
}

export function onTickMsg(data: m.TickMsg) {
	const world = StoreProvider.getState().world;
	if (data.gameId === world.ui.myGameId) {
		incomingQueue.push(data);

		data.actions.forEach(action => {
			if (action.heroId !== world.ui.myHeroId && action.actionType === "text" && blacklist.test(action.text)) {
				const player = world.players.get(action.heroId);
				if (player && player.userHash) {
					StoreProvider.dispatch({
						type: "updateSilence",
						add: [player.userHash],
					});
				}
			}
		});
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

	const heroes = new Array<m.HeroSyncMsg>();
	snapshot.objectLookup.forEach((heroSnapshot, heroId) => {
		heroes.push({
			heroId,
			health: heroSnapshot.health,
			posX: heroSnapshot.pos.x,
			posY: heroSnapshot.pos.y,
		});
	});

	const syncMsg: m.SyncMsg = {
		actionType: m.ActionType.Sync,
		gameId: world.ui.myGameId,
		heroId: world.ui.myHeroId,
		tick: snapshot.tick,
		heroes,
	};
	send(syncMsg);
}

export function sendAction(gameId: string, heroId: string, action: w.Action) {
	const Precision = 1.0 / 1024;

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
	sockets.getSocket().emit('action', msg);
}