import moment from 'moment';
import { Matchmaking, TicksPerSecond, MaxIdleTicks, TicksPerTurn } from '../game/constants';
import { Spells } from '../game/settings';
import * as _ from 'lodash';
import * as c from '../game/world.model';
import * as g from './server.model';
import * as m from '../game/messages.model';
import { getStore } from './serverStore';
import { addTickMilliseconds } from './loadMetrics';
import { logger } from './logging';

const NanoTimer = require('nanotimer');
const tickTimer = new NanoTimer();

let emit: TickEmitter = null;
let ticksProcessing = false;

export interface TickEmitter {
	(data: m.TickMsg): void;
}

export function attachToEmitter(_emit: TickEmitter) {
	emit = _emit;
}

export function onConnect(socketId: string, authToken: string) {
}

export function onDisconnect(socketId: string, authToken: string) {
	getStore().activeGames.forEach(game => {
		if (game.active.has(socketId)) {
			leaveGame(game, socketId);
		}
	});
}

function startTickProcessing() {
	if (ticksProcessing) {
		return;
	}
	ticksProcessing = true;

	tickTimer.setInterval(() => {
		const milliseconds = tickTimer.time(() => {
			let anyGameRunning = false;

			getStore().activeGames.forEach(game => {
				const isGameRunning = gameTick(game);
				anyGameRunning = anyGameRunning || isGameRunning;
			});

			if (!anyGameRunning) {
				ticksProcessing = false;
				tickTimer.clearInterval();
				logger.info("Stopped processing ticks");
			}
		}, '', 'm');
		addTickMilliseconds(milliseconds);
	}, '', Math.floor(TicksPerTurn * (1000 / TicksPerSecond)) + 'm');
}

export function findNewGame(roomId: string = null): g.Game {
	let game: g.Game = null;
	getStore().activeGames.forEach(g => {
		if (g.joinable && g.active.size < Matchmaking.MaxPlayers && g.room === roomId) {
			game = g;
		}
	});
	if (!game) {
		const room: g.Room = getStore().rooms.get(roomId);
		game = initGame(room);
	}
	return game;
}

export function receiveAction(game: g.Game, data: m.ActionMsg, socketId: string) {
	if (data.actionType !== "game") {
		logger.info("Game [" + game.id + "]: action message received from socket " + socketId + " with wrong action type: " + data.actionType);
		return;
	}

	const player = game.active.get(socketId);
	if (!player) {
		return;
	}

	if (data.heroId !== player.heroId) {
		logger.info("Game [" + game.id + "]: incorrect hero id from socket " + socketId + " - received " + data.heroId + " should be " + player.heroId);
		return;
	}

	queueAction(game, data);
}

export function initRoom(mod: Object = {}): g.Room {
	const roomIndex = getStore().nextRoomId++;
	const room: g.Room = {
		id: "r" + roomIndex + "-" + Math.floor(Math.random() * 1e9).toString(36),
		created: moment(),
		mod,
	};
	getStore().rooms.set(room.id, room);
	return room;
}

export function initGame(room: g.Room = null) {
	const gameIndex = getStore().nextGameId++;
	let game: g.Game = {
		id: "g" + gameIndex + "-" + Math.floor(Math.random() * 1e9).toString(36),
		room: room ? room.id : null,
		created: moment(),
		active: new Map<string, g.Player>(),
		playerNames: new Array<string>(),
		accessTokens: new Set<string>(),
		numPlayers: 0,
		tick: 0,
		activeTick: 0,
		joinable: true,
		closeTick: Matchmaking.MaxHistoryLength,
		actions: new Map<string, m.ActionMsg>(),
		history: [],
	};
	getStore().activeGames.set(game.id, game);

	const heroId = systemHeroId(m.ActionType.Environment);
	game.actions.set(heroId, {
		gameId: game.id,
		heroId,
		actionType: m.ActionType.Environment,
		seed: gameIndex,
	});
	startTickProcessing();

	logger.info("Game [" + game.id + "]: started");
	return game;
}

function formatHeroId(index: number): string {
	return "hero" + index;
}

function queueAction(game: g.Game, actionData: m.ActionMsg) {
	let currentPrecedence = actionPrecedence(game.actions.get(actionData.heroId));
	let newPrecedence = actionPrecedence(actionData);

	if (newPrecedence >= currentPrecedence) {
		game.actions.set(actionData.heroId, actionData);
	}

	startTickProcessing();
}

function actionPrecedence(actionData: m.ActionMsg): number {
	if (!actionData) {
		return 0;
	} else if (actionData.actionType === "join") {
		return 1000;
	} else if (actionData.actionType === "leave") {
		return 1000;
	} else if (actionData.actionType === "game" && actionData.spellId === Spells.move.id) {
		return 10;
	} else {
		return 100;
	}
}

function isSpell(actionData: m.ActionMsg): boolean {
	return actionData.actionType === "game" && actionData.spellId !== Spells.move.id;
}

export function leaveGame(game: g.Game, socketId: string) {
	let player = game.active.get(socketId);
	if (!player) {
		return;
	}

	queueAction(game, { gameId: game.id, heroId: player.heroId, actionType: "leave" });

	game.active.delete(socketId);
	logger.info("Game [" + game.id + "]: player " + player.name + " [" + socketId + "] left after " + game.tick + " ticks");
}

function finishGame(game: g.Game) {
	getStore().activeGames.delete(game.id);
	getStore().inactiveGames.set(game.id, game);

	logger.info("Game [" + game.id + "]: finished after " + game.tick + " ticks");
}

function gameTick(game: g.Game): boolean {
	if (game.active.size === 0) {
		finishGame(game);
		return false;
	}

	if (isGameRunning(game) || game.actions.size > 0) {
		for (let i = 0; i < TicksPerTurn; ++i) {
			gameTurn(game);
		}

		return true;
	} else {
		return false;
	}
}

function gameTurn(game: g.Game) {
	let data = {
		gameId: game.id,
		tick: game.tick++,
		actions: [...game.actions.values()],
	} as m.TickMsg;
	if (game.actions.size > 0) {
		game.activeTick = game.tick;
	}
	game.actions.clear();

	if (game.history) {
		if (game.history.length < Matchmaking.MaxHistoryLength) {
			game.history.push(data);
		} else {
			game.closeTick = Math.min(game.closeTick, game.tick); // New players cannot join without the full history
		}
	}

	closeGameIfNecessary(game, data);
	emit(data);
}

export function isGameRunning(game: g.Game) {
	return (game.tick - game.activeTick) < MaxIdleTicks;
}

export function joinGame(game: g.Game, playerName: string, keyBindings: KeyBindings, authToken: string, socketId: string) {
	if (!game.joinable || game.active.size >= Matchmaking.MaxPlayers) {
		return null;
	}

	let heroId: string = null;

	// Take an existing slot, if possible
	let activeHeroIds = new Set<string>(mapMap(game.active, x => x.heroId));
	for (let i = 0; i < game.numPlayers; ++i) {
		let candidate = formatHeroId(i);
		if (!activeHeroIds.has(candidate)) {
			heroId = candidate;
			break;
		}
	}

	// No existing slots, create a new one
	if (!heroId) {
		heroId = formatHeroId(game.numPlayers++);
	}

	game.active.set(socketId, {
		socketId,
		heroId,
		name: playerName,
	});
	game.playerNames.push(playerName);

	if (authToken) {
		game.accessTokens.add(authToken);
	}

	queueAction(game, { gameId: game.id, heroId, actionType: "join", playerName, keyBindings });

	return heroId;
}

function closeGameIfNecessary(game: g.Game, data: m.TickMsg) {
	if (!game.joinable) {
		return;
	}

	let statusChanged = false;

	if (game.active.size > 1 && _.some(data.actions, action => isSpell(action))) {

		// Casting any spell closes the game
		const newCloseTick = game.tick + Matchmaking.JoinPeriod;
		if (newCloseTick < game.closeTick) {
			game.closeTick = newCloseTick;
			statusChanged = true;
		}
	}

	if (game.tick >= game.closeTick) {
		game.joinable = false;
		statusChanged = true;
		logger.info("Game [" + game.id + "]: now unjoinable with " + game.numPlayers + " players after " + game.tick + " ticks");
	}

	if (statusChanged) {
		queueAction(game, {
			gameId: game.id,
			heroId: systemHeroId(m.ActionType.CloseGame),
			actionType: m.ActionType.CloseGame,
			closeTick: game.closeTick,
		});
	}
}

function systemHeroId(actionType: string) {
	return "_" + actionType;
}

function mapMap<K, V, Out>(map : Map<K, V>, func: (v: V) => Out) {
	let result = new Array<Out>();
	map.forEach(value => result.push(func(value)));
	return result;
}