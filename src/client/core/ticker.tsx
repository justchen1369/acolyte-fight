import pl from 'planck-js';
import * as m from '../../game/messages.model';
import * as w from '../../game/world.model';
import * as engine from '../../game/engine';
import * as sockets from './sockets';
import * as StoreProvider from '../storeProvider';
import { render, CanvasStack } from './render';
import { TicksPerTurn, TicksPerSecond, HeroColors } from '../../game/constants';
import { notify } from './notifications';

const preferredColors = new Map<string, string>(); // userHash -> color

let tickQueue = new Array<m.TickMsg>();
let incomingQueue = new Array<m.TickMsg>();
let allowedDelay = 1;

const interval = Math.floor(1000 / TicksPerSecond);
let tickEpoch = Date.now();
let tickCounter = 0;
sockets.listeners.onTickMsg = onTickMsg;

export function reset(history: m.TickMsg[]) {
	// Skip to start of game
	tickQueue = [];
	incomingQueue = [...history];

	while (incomingQueue.length > 0 && !isStartGameTick(incomingQueue[0])) {
		tickQueue.push(incomingQueue.shift());
	}
}

export function setPreferredColor(userHash: string, color: string) {
	preferredColors.set(userHash, color);
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

export function frame(canvasStack: CanvasStack) {
    const store = StoreProvider.getState();
	const world = store.world;
	
	const tickTarget = Math.floor((Date.now() - tickEpoch) / interval);
	if (tickTarget > tickCounter) {
		const numFrames = tickTarget - tickCounter;
		incomingLoop(numFrames);
		if (numFrames <= 4) {
			// Try to handle the fact that the frame rate might not be a perfect multiple of the tick rate
			tickCounter += numFrames;
		} else {
			// Too many frames behind, stop trying to catch up
			tickEpoch = Date.now();
			tickCounter = 0;
		}
	}

	while (tickQueue.length > 0 && tickQueue[0].gameId != world.ui.myGameId) {
		tickQueue.shift(); // Get rid of any leftover ticks from other games
	}
	while (tickQueue.length > 0 && tickQueue[0].tick <= world.tick) {
		let tickData = tickQueue.shift();
		if (tickData.tick < world.tick) {
			continue; // Received the same tick multiple times, skip over it
		}

		applyTickActions(tickData, world, preferredColors);
		engine.tick(world);
	}
	render(world, canvasStack, {
		wheelOnRight: store.options.wheelOnRight,
		rebindings: store.rebindings,
	});

	const notifications = engine.takeNotifications(world);
	notify(...notifications);
}

function onTickMsg(data: m.TickMsg) {
	const world = StoreProvider.getState().world;
	if (data.gameId === world.ui.myGameId) {
		incomingQueue.push(data);
	}
}

function applyTickActions(tickData: m.TickMsg, world: w.World, preferredColors: Map<string, string>) {
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
				ticksUntilClose: actionData.waitPeriod,
			});
		} else if (actionData.actionType === m.ActionType.Join) {
			world.occurrences.push({
				type: "join",
				heroId: actionData.heroId,
				userId: actionData.userId,
				userHash: actionData.userHash,
				playerName: actionData.playerName || "Acolyte",
				keyBindings: actionData.keyBindings,
				preferredColor: preferredColors.get(actionData.userHash),
				isBot: actionData.isBot,
				isMobile: actionData.isMobile,
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
		} else if (actionData.actionType === m.ActionType.Text) {
			world.occurrences.push({
				type: "text",
				heroId: actionData.heroId,
				text: actionData.text,
			});
		}
	});
}