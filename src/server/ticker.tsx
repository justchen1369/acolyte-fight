import _ from 'lodash';
import crypto from 'crypto';
import moment from 'moment';
import uniqid from 'uniqid';
import wu from 'wu';
import { Matchmaking, TicksPerSecond, MaxIdleTicks, TicksPerTurn } from '../game/constants';
import * as g from './server.model';
import * as m from '../shared/messages.model';
import * as w from '../game/world.model';
import * as games from './games';
import * as gameStorage from './gameStorage';
import * as matchmaking from './matchmaking';
import * as online from './online';
import { getStore } from './serverStore';
import { addTickMilliseconds } from './loadMetrics';
import { logger } from './logging';

const NanoTimer = require('nanotimer');
const tickTimer = new NanoTimer();

let emitTick: TickEmitter = null;
let ticksProcessing = false;

export interface TickEmitter {
	(gameId: string, data: m.TickMsg): void;
}

export function attachToTickEmitter(emit: TickEmitter) {
	emitTick = emit;
}

export function init() {
    games.attachQueuedMessageListener(() => startTickProcessing());
}

function startTickProcessing() {
	if (ticksProcessing) {
		return;
	}
	ticksProcessing = true;

	tickTimer.setInterval(() => {
		const milliseconds = tickTimer.time(() => {
			const running = new Array<g.Game>();
			getStore().activeGames.forEach(game => {
				const isGameRunning = gameTurn(game);
				if (isGameRunning) {
					running.push(game);
				}
			});

			online.updateOnlinePlayers(running);

			if (running.length === 0) {
				ticksProcessing = false;
				tickTimer.clearInterval();
				logger.info("Stopped processing ticks");
			}
		}, '', 'm');
		addTickMilliseconds(milliseconds);
	}, '', Math.floor(TicksPerTurn * (1000 / TicksPerSecond)) + 'm');
}

function finishGameIfNecessary(game: g.Game) {
	if (game.finished) {
		return;
	}

	if (game.active.size > 0) {
		return;
	}

	game.finished = true;
	game.controlMessages.push({ type: "finish" });
}

function gameTurn(game: g.Game): boolean {
	let running = games.isGameRunning(game) || game.actions.size > 0 || game.controlMessages.length > 0;
	if (running) {
		for (let i = 0; i < TicksPerTurn; ++i) {
			gameTick(game);
        }
        matchmaking.finalizeMatchupIfNecessary(game); // Needs to be outside of tick processing because it may split the game
    }

	return running;
}

function gameTick(game: g.Game) {
	if (game.finished) {
		return;
	}

	closeGameIfNecessary(game);
	finishGameIfNecessary(game);

	const data: m.TickMsg = {
		u: game.universe,
		t: game.tick++,
	};

	if (game.controlMessages.length > 0) {
		data.c = game.controlMessages;
		game.controlMessages = [];
	}

	if (game.syncMessage) {
		data.s = game.syncMessage;
		game.syncMessage = null;
	}

	if (game.actions.size > 0) {
		data.a = wu(game.actions.values()).toArray();
		game.actions.clear();
		game.activeTick = game.tick;
	}

	if (game.history) {
		if (game.history.length < Matchmaking.MaxHistoryLength) {
			game.history.push(data);
		} else {
			game.closeTick = Math.min(game.closeTick, game.tick); // New players cannot join without the full history
		}
	}
	emitTick(game.id, data);

	if (game.finished) {
		game.bots.clear();
		games.unregisterGame(game);
		gameStorage.saveGame(game);
		logger.info("Game [" + game.id + "]: finished after " + game.tick + " ticks");
	}
}

function closeGameIfNecessary(game: g.Game) {
	if (!game.joinable) {
		return;
	}

	let waitPeriod: number = null;

	const numPlayers = game.active.size + game.bots.size;
	if (numPlayers > 1 && wu(game.actions.values()).some(action => isSpell(action))) {
		// Casting any spell closes the game
		const joinPeriod = calculateJoinPeriod(game.segment, game.active.size, game.locked, game.matchmaking.MaxPlayers);

		const newCloseTick = game.tick + joinPeriod;
		if (newCloseTick < game.closeTick) {
			game.closeTick = newCloseTick;
			waitPeriod = joinPeriod;
		}
	}

	if (game.tick >= game.closeTick) {
		getStore().joinableGames.delete(game.id);
		game.joinable = false;
		waitPeriod = 0;
		logger.info("Game [" + game.id + "]: now unjoinable with " + game.active.size + " players after " + game.tick + " ticks");
	}

	if (waitPeriod !== null) {
		games.queueControlMessage(game, {
			type: m.ActionType.CloseGame,
			closeTick: game.closeTick,
			waitPeriod,
		});
	}
}

function isSpell(actionData: m.ActionMsg): boolean {
	return actionData.type === "game" && !w.Actions.NonGameStarters.some(x => x === actionData.s);
}

function calculateJoinPeriod(segment: string, numHumans: number, locked: string, maxPlayers: number): number {
	if (locked) {
		return Matchmaking.JoinPeriod;
	}

	const numInRoom = games.calculateRoomStats(segment);
	const targetPerGame = matchmaking.minPerGame(numInRoom, maxPlayers);

	if (numHumans < targetPerGame) {
		return Matchmaking.WaitForMorePeriod;
	} else {
		return Matchmaking.JoinPeriod;
	}
}