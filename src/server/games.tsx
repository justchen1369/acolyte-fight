import _ from 'lodash';
import crypto from 'crypto';
import moment from 'moment';
import uniqid from 'uniqid';
import wu from 'wu';
import { Matchmaking, TicksPerSecond, MaxIdleTicks, TicksPerTurn } from '../game/constants';
import * as g from './server.model';
import * as m from '../shared/messages.model';
import * as w from '../game/world.model';
import * as auth from './auth';
import * as blacklist from './blacklist';
import * as segments from '../shared/segments';
import * as constants from '../game/constants';
import * as engine from '../game/engine';
import * as gameStorage from './gameStorage';
import * as online from './online';
import * as results from './results';
import * as statsStorage from './statsStorage';
import * as transientIds from './transientIds';
import { getStore } from './serverStore';
import { addTickMilliseconds } from './loadMetrics';
import { logger } from './logging';

const NanoTimer = require('nanotimer');
const tickTimer = new NanoTimer();

let emitJoin: JoinEmitter = null;
let emitTick: TickEmitter = null;
let emitSplit: SplitEmitter = null;
let ticksProcessing = false;

const finishedGameListeners = new Array<FinishedGameListener>();

export interface JoinEmitter {
	(join: g.JoinResult): void;
}

export interface TickEmitter {
	(gameId: string, data: m.TickMsg): void;
}

export interface SplitEmitter {
	(socketId: string, oldGameId: string, newGameId: string): void;
}

export interface FinishedGameListener {
	(game: g.Game, result: m.GameStatsMsg): void;
}

export function attachToJoinEmitter(emit: JoinEmitter) {
	emitJoin = emit;
}

export function attachToTickEmitter(emit: TickEmitter) {
	emitTick = emit;
}

export function attachToSplitEmitter(emit: SplitEmitter) {
	emitSplit = emit;
}

export function attachFinishedGameListener(listener: FinishedGameListener) {
	finishedGameListeners.push(listener);
}

export function onConnect(socketId: string, authToken: string) {
}

export function onDisconnect(socketId: string, authToken: string) {
	const store = getStore();

	store.activeGames.forEach(game => {
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

export function findNewGame(version: string, room: g.Room, partyId: string | null, newAco: number): g.Game {
	const roomId = room ? room.id : null;
	const segment = segments.calculateSegment(roomId, partyId);

	const numJoining = 1;
	const openGames = findJoinableGames(segment);

	let game: g.Game = null;
	if (openGames.length > 0) {
		// TODO: Choose game with closest skill level
		game = _.minBy(openGames, game => game.active.size);

	}

	if (game && game.active.size + numJoining > game.matchmaking.MaxPlayers) {
		// Game too full to add one more player, split it
		game = autoSplitGame(game, newAco);
	}

	if (game && game.active.size + numJoining > game.matchmaking.MaxPlayers) {
		// Still too big
		game = null;
	}

	if (!game) {
		game = initGame(version, room, partyId);
	}
	return game;
}

function findJoinableGames(segment: string) {
	const store = getStore();

	const openGames = new Array<g.Game>();
	store.joinableGames.forEach(gameId => {
		const g = store.activeGames.get(gameId);
		if (g && g.joinable) {
			if (g.segment === segment) {
				openGames.push(g);
			}
		}
		else {
			// This entry shouldn't be in here - perhaps it was terminated before it could be removed
			store.joinableGames.delete(gameId);
		}
	});
	return openGames;
}

export function findExistingGame(version: string, room: g.Room | null, partyId: string | null): g.Game {
	const roomId = room ? room.id : null;
	const segment = segments.calculateSegment(roomId, partyId);
	const store = getStore();

	const candidates = wu(store.activeGames.values()).filter(x => x.segment === segment && isGameRunning(x)).toArray();
	if (candidates.length === 0) {
		return null;
	}

	return _.maxBy(candidates, x => watchPriority(x));
}

function watchPriority(game: g.Game): number {
	if (!(game.active.size && isGameRunning(game))) {
		// Discourage watching finished game
		return 0;
	} else if (game.locked) {
		// Discourage watching locked games
		return game.active.size;
	} else if (game.winTick) {
		// Discourage watching a game which is not live
		return game.active.size;
	} else if (!game.joinable) {
		// Encourage watching a game in-progress
		return 1000 + game.active.size;
	} else {
		// Watch a game that is only starting
		return 100 + game.active.size;
	}
}

export function calculateRoomStats(segment: string): number {
	const scoreboard = getStore().scoreboards.get(segment);
	if (scoreboard) {
		return scoreboard.online.size;
	} else {
		return 0;
	}
}

export function apportionPerGame(totalPlayers: number, maxPlayers: number) {
	// Round up to nearest even number
	return Math.min(maxPlayers, Math.ceil(averagePlayersPerGame(totalPlayers, maxPlayers) / 2) * 2);
}

export function minPerGame(totalPlayers: number, maxPlayers: number) {
	return Math.floor(averagePlayersPerGame(totalPlayers, maxPlayers));
}

export function averagePlayersPerGame(totalPlayers: number, maxPlayers: number) {
	const maxGames = Math.ceil(totalPlayers / maxPlayers);
	return totalPlayers / maxGames;
}

export function receiveAction(game: g.Game, controlKey: number, data: m.ActionMsg, socketId: string) {
	const player = game.active.get(socketId);
	if (!player) {
		return;
	}

	const heroId = data.h;
	if (!heroId) {
		return;
	}

	if (game.controlKeys.get(heroId) !== controlKey) {
		return;
	}

	if (heroId === player.heroId || takeBotControl(game, heroId, socketId)) {
		queueAction(game, data);
		++player.numActionMessages;
	}
}

export function receiveSync(game: g.Game, data: m.SyncMsg, socketId: string) {
	const player = game.active.get(socketId);
	if (!player) {
		return;
	}

	queueSyncMessage(game, data);
}

export function takeBotControl(game: g.Game, heroId: string, socketId: string) {
	const controllerId = game.bots.get(heroId);
	if (controllerId) {
		return socketId === controllerId;
	}

	if (game.active.has(socketId)) {
		game.bots.set(heroId, socketId);
		return true;
	} else {
		return false;
	}
}

export function initGame(version: string, room: g.Room, partyId: string | null, locked: string = null) {
	const gameIndex = getStore().nextGameId++;
	let game: g.Game = {
		id: uniqid("g" + gameIndex + "-"),
		universe: transientIds.generate(),
		segment: segments.calculateSegment(room.id, partyId),
		matchmaking: { ...room.Matchmaking },
		roomId: room.id,
		partyId,
		mod: room ? room.mod : {},
		created: moment(),
		active: new Map<string, g.Player>(),
		bots: new Map<string, string>(),
		observers: new Map(),
		controlKeys: new Map(),
		reconnectKeys: new Map<string, string>(),
		isRankedLookup: new Map<string, boolean>(),
		socketIds: new Set<string>(),
		winTick: null,
		syncTick: 0,
		syncMessage: null,
		scores: new Map<string, m.GameStatsMsg>(),
		tick: 0,
		activeTick: 0,
		joinable: true,
		locked,
		closeTick: Matchmaking.MaxHistoryLength,
		ranked: false,
		actions: new Map(),
		controlMessages: [],
		history: [],
		splits: [],
	};
	if (room) {
		room.accessed = moment();
	}

	registerGame(game);
	queueControlMessage(game, {
		type: m.ActionType.Environment,
		seed: gameIndex,
	});

	let gameName = game.id;
	if (room) {
		gameName = room.id + "/" + gameName;
	}
	
	let lockedFormat = "";
	if (locked) {
		lockedFormat = " " + locked;
	}
	logger.info(`Game [${gameName}]: started (${game.segment})${lockedFormat}`);
	return game;
}

function registerGame(game: g.Game) {
	const store = getStore();

	store.activeGames.set(game.id, game);
	if (game.joinable && !game.locked) {
		store.joinableGames.add(game.id);
	}
}

function unregisterGame(game: g.Game) {
	const store = getStore();

	store.activeGames.delete(game.id);
	store.joinableGames.delete(game.id);
}

function cloneGame(template: g.Game): g.Game {
	const gameIndex = getStore().nextGameId++;
	const newId = uniqid("g" + gameIndex + "-");
	const universe = transientIds.generate();
	const game: g.Game = {
		...template,
		id: newId,
		universe,
		active: new Map(template.active),
		bots: new Map(template.bots),
		observers: new Map(template.observers),
		controlKeys: new Map(template.controlKeys),
		reconnectKeys: new Map(template.reconnectKeys),
		isRankedLookup: new Map(template.isRankedLookup),
		socketIds: new Set(template.socketIds),
		scores: new Map(template.scores),
		actions: new Map(template.actions),
		controlMessages: [...template.controlMessages],
		history: template.history.map(t => ({ ...t, u: universe })),
		splits: [...template.splits],
	};
	game.splits.push({ gameId: template.id, tick: template.tick });
	registerGame(game);
	return game;
}

function unassignBots(game: g.Game): g.Game {
	// Open up all bots for reassignment
	wu(game.bots.keys()).toArray().forEach((heroId) => {
		game.bots.set(heroId, null);
	});

	return game;
}

function splitGame(initial: g.Game, splitSocketIds: Set<string>): g.Game {
	// Create a copy of the initial game
	const fork = cloneGame(initial);
	const remainder = cloneGame(initial);

	// Unassign bots as simulating players may need to change
	unassignBots(fork);
	unassignBots(remainder);

	// Remove players from alternate game
	const allSocketIds = new Set(initial.active.keys());
	const replaceWithBot = false;
	allSocketIds.forEach(socketId => {
		const split = splitSocketIds.has(socketId);
		const prime = split ? fork : remainder;
		const other = split ? remainder : fork;
		leaveGame(other, socketId, replaceWithBot, prime.id);
	});

	// Move players to new game
	allSocketIds.forEach(socketId => {
		const split = splitSocketIds.has(socketId);
		const prime = split ? fork : remainder;
		emitSplit(socketId, initial.id, prime.id);
		emitJoinForSocket(prime, socketId);
	});

	// Move observers
	remainder.observers.clear();
	fork.observers.forEach(observer => {
		emitJoinForSocket(fork, observer.socketId);
	});

	// Destroy initial game
	initial.active.clear();

	logger.info(`Game [${initial.id}] split into ${fork.id} (${fork.active.size} players) and ${remainder.id} (${remainder.active.size} players) at ${initial.tick} ticks`);
	return fork;
}

function queueAction(game: g.Game, actionData: m.ActionMsg) {
	let currentPrecedence = actionPrecedence(game.actions.get(actionData.h));
	let newPrecedence = actionPrecedence(actionData);

	if (newPrecedence >= currentPrecedence) {
		game.actions.set(actionData.h, actionData);
	}

	startTickProcessing();
}

function queueControlMessage(game: g.Game, actionData: m.ControlMsg) {
	game.controlMessages.push(actionData);

	startTickProcessing();
}

function queueSyncMessage(game: g.Game, actionData: m.SyncMsg) {
	if (game.syncTick < actionData.t) {
		game.syncTick = actionData.t;
		game.syncMessage = actionData;

		startTickProcessing();
	}
}

function actionPrecedence(actionData: m.ActionMsg): number {
	if (!actionData) {
		return 0;
	} else if (actionData.type === "spells") {
		return 101;
	} else if (actionData.type === "game" && actionData.s === w.Actions.Stop) {
		return 12;
	} else if (actionData.type === "game" && actionData.s === w.Actions.MoveAndCancel) {
		return 11;
	} else if (actionData.type === "game" && actionData.s === w.Actions.Move) {
		return 10;
	} else if (actionData.type === "game" && actionData.s === w.Actions.Retarget) {
		return 1;
	} else if (actionData.type === "game" && actionData.r) {
		// Releasing key less important than casting new spell
		return 99;
	} else {
		// Casting spell
		return 100;
	}
}

function isSpell(actionData: m.ActionMsg): boolean {
	return actionData.type === "game" && !w.Actions.NonGameStarters.some(x => x === actionData.s);
}

export function receiveScore(game: g.Game, socketId: string, stats: m.GameStatsMsg) {
	game.scores.set(socketId, stats);
	if (game.scores.size >= game.active.size) {
		// Everyone has reported that the game is finished
		game.winTick = game.tick;
		rankGameIfNecessary(game);
	}
}

export function leaveGame(game: g.Game, socketId: string, replaceWithBot: boolean = true, split: string = null) {
	const player = game.active.get(socketId);
	if (player) {
		game.active.delete(socketId);
		reassignBots(game, socketId);

		let controlKey: number = null;
		if (replaceWithBot) {
			// Give the bot a new control key to avoid applying human messages to bot character or vice versa
			// (particularly spell change actions which are permanent)
			game.bots.set(player.heroId, null);
			controlKey = acquireControlKey(player.heroId, game);
		}

		queueControlMessage(game, { heroId: player.heroId, controlKey, type: "leave", split: !!split });

		if (split) {
			logger.info(`Game [${game.id}]: player ${player.name} [${socketId}] split to ${split} after ${game.tick} ticks`);
		} else {
			logger.info(`Game [${game.id}]: player ${player.name} [${socketId}] left after ${game.tick} ticks`);
		}
	}
	
	const observer = game.observers.get(socketId);
	if (observer) {
		game.observers.delete(socketId);
	}
}

function reassignBots(game: g.Game, leftSocketId: string) {
	if (game.active.size === 0) {
		// No one to simulate the bots
		game.bots.clear();
		return;
	}

	const botsToReassign = new Array<string>();
	game.bots.forEach((socketId, heroId) => {
		if (socketId === leftSocketId) {
			botsToReassign.push(heroId);
		}
	});
	if (botsToReassign.length === 0) {
		// Nothing to do
		return;
	}

	// Assign to first active player
	botsToReassign.forEach(heroId => {
		game.bots.set(heroId, null);
	});
}

function rankGameIfNecessary(game: g.Game) {
	if (!game.winTick) {
		return;
	}

	if (game.ranked) {
		return;
	}
	game.ranked = true;

	let result = results.calculateResult(game);
	if (result) {
		statsStorage.saveGame(game, result).then(newResult => {
			result = newResult || result;

			for (const listener of finishedGameListeners) {
				listener(game, result);
			}
			online.incrementStats(game.segment, result);
		});
	}
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
	let running = isGameRunning(game) || game.actions.size > 0 || game.controlMessages.length > 0;
	if (running) {
		for (let i = 0; i < TicksPerTurn; ++i) {
			gameTick(game);
		}
	}

	return running;
}

function gameTick(game: g.Game) {
	if (game.finished) {
		return;
	}

	closeGameIfNecessary(game);
	finishGameIfNecessary(game);

	const data = {
		u: game.universe,
		t: game.tick++,
	} as m.TickMsg;

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
		unregisterGame(game);
		gameStorage.saveGame(game);
		logger.info("Game [" + game.id + "]: finished after " + game.tick + " ticks");
	}
}

export function isGameRunning(game: g.Game) {
	return (game.tick - game.activeTick) < MaxIdleTicks;
}

export function joinGame(game: g.Game, params: g.JoinParameters, userId: string, aco: number): g.JoinResult {
	let heroId: string = null;
	if (params.reconnectKey) {
		const candidate = game.reconnectKeys.get(params.reconnectKey);
		if (candidate && !game.active.has(candidate)) {
			// Reconnect
			heroId = candidate;
		}
	}

	if (!heroId && !game.joinable) {
		// Not allowed to join a game in-progress
		return null;
	}

	if (!heroId) {
		heroId = findSlot(game);
	}

	if (!heroId) {
		return null;
	}

	const userHash = params.userHash;
	game.active.set(params.socketId, {
		socketId: params.socketId,
		userHash,
		userId,
		heroId,
		partyId: null,
		name: params.name,
		unranked: params.unranked,
		autoJoin: params.autoJoin,
		aco,
		numActionMessages: 0,
	});
	game.bots.delete(heroId);
	game.socketIds.add(params.socketId);

	if (userId) {
		game.isRankedLookup.set(userId, !params.unranked);
	}

	const controlKey = acquireControlKey(heroId, game);
	queueControlMessage(game, {
		heroId: heroId,
		controlKey,
		type: "join",
		userId,
		userHash,
		partyHash: params.partyHash,
		playerName: params.name,
		keyBindings: params.keyBindings,
		isMobile: params.isMobile,
	});

	return emitJoinForSocket(game, params.socketId);
}

function emitJoinForSocket(game: g.Game, socketId: string): g.JoinResult {
	const player = game.active.get(socketId);
	if (player) {
		const reconnectKey = assignReconnectKey(game, player.heroId);
		const join: g.JoinResult = {
			socketId,
			game,
			live: true,

			heroId: player.heroId,
			reconnectKey,
			autoJoin: player.autoJoin,
			
			splits: game.splits,
		};
		emitJoin(join);
		return join;
	}
	
	const observer = game.observers.get(socketId);
	if (observer) {
		const join: g.JoinResult = {
			socketId,
			game,
			live: true,

			autoJoin: observer.autoJoin,
			
			splits: game.splits,
		};
		emitJoin(join);
		return join;
	}

	return null;
}

export function observeGame(game: g.Game, params: g.JoinParameters): g.JoinResult {
	game.observers.set(params.socketId, {
		socketId: params.socketId,
		userHash: params.userHash,
		partyId: null,
		name: params.name,
		autoJoin: params.autoJoin,
	});
	return emitJoinForSocket(game, params.socketId);
}

export function replayGame(replay: g.Replay, params: g.JoinParameters) {
	emitJoin({
		socketId: params.socketId,
		game: replay,
		live: params.live,
	});
}

function assignReconnectKey(game: g.Game, heroId: string) {
	// Remove existing keys
	game.reconnectKeys.forEach((otherHeroId, otherReconnectKey) => {
		if (otherHeroId === heroId) {
			game.reconnectKeys.delete(otherReconnectKey);
		}
	});

	// Assign new key
	const reconnectKey = uniqid("k-");
	game.reconnectKeys.set(reconnectKey, heroId);

	return reconnectKey;
}

function autoSplitGame(game: g.Game, newAco: number): g.Game {
	const minPlayers = 1; // TODO: Change to 2

	const ratings = wu(game.active.values()).map(p => p.aco).toArray();
	ratings.push(newAco);
	ratings.sort();

	const threshold = calculateSplitThreshold(ratings, minPlayers);
	if (threshold === null) {
		// Cannot split
		return game;
	}

	const primeIsBelow = newAco < threshold;

	logger.info(formatSplit(ratings, threshold));

	const primeSocketIds = new Set<string>();
	game.active.forEach(player => {
		const playerIsBelow = player.aco < threshold;
		const isPrime = playerIsBelow == primeIsBelow;
		if (isPrime) {
			primeSocketIds.add(player.socketId);
		}
	});

	return splitGame(game, primeSocketIds);
}

function formatSplit(ratings: number[], threshold: number) {
	let result = `Split (${threshold.toFixed(0)}): `;
	let reachedThreshold = false;
	for (let i = 0; i < ratings.length; ++i) {
		const rating = ratings[i];
		if (i > 0) {
			result += ' ';
		}
		if (!reachedThreshold && rating >= threshold) {
			reachedThreshold = true;
			result += '| ';
		}
		result += rating.toFixed(0);
	}
	return result;
}

function calculateSplitThreshold(sortedRatings: number[], minPlayers: number) {
	minPlayers = Math.max(1, minPlayers);

	const start = minPlayers;
	const end = sortedRatings.length - minPlayers;
	if (end < start) {
		return null;
	}

	let maxDistance = 0;
	let bestSplit = start;
	for (let i = start; i <= end; ++i) {
		const splitDistance = sortedRatings[i] - sortedRatings[i-1];
		if (splitDistance > maxDistance) {
			maxDistance = splitDistance;
			bestSplit = i;
		}
	}

	const threshold = sortedRatings[bestSplit];
	return threshold;
}

function acquireControlKey(heroId: string, game: g.Game) {
	const controlKey = transientIds.generate();
	game.controlKeys.set(heroId, controlKey);
	return controlKey;
}

export function addBots(game: g.Game) {
	const targetGameSize = 1 + game.matchmaking.MinBots + Math.round(Math.random() * (game.matchmaking.MaxBots - game.matchmaking.MinBots));
	const numPlayers = game.active.size + game.bots.size;
	const botsToAdd = Math.max(1, targetGameSize - numPlayers);
	for (let i = 0; i < botsToAdd; ++i) {
		addBot(game);
	}
	logger.info(`Game [${game.id}]: added ${botsToAdd} bots`);
}

export function addBot(game: g.Game) {
	const numPlayers = game.active.size + game.bots.size;
	if (numPlayers >= game.matchmaking.MaxPlayers || game.active.size === 0 || !game.joinable) {
		return null;
	}

	const replaceBots = false;
	const heroId = findSlot(game, replaceBots);

	game.bots.set(heroId, null);

	const keyBindings = {};
	const controlKey = acquireControlKey(heroId, game);
	queueControlMessage(game, { heroId: heroId, controlKey: controlKey, type: "bot", keyBindings });

	return heroId;
}

function findSlot(game: g.Game, replaceBots: boolean = true): string {
	// Take an existing slot, if possible
	let activeHeroIds = new Set<string>(wu(game.active.values()).map(x => x.heroId));
	if (!replaceBots) {
		wu(game.bots.keys()).forEach(heroId => activeHeroIds.add(heroId));
	}

	const maxPlayers = game.matchmaking.MaxPlayers;
	for (let i = 0; i < maxPlayers; ++i) {
		let candidate = engine.formatHeroId(i);
		if (!activeHeroIds.has(candidate)) {
			return candidate;
		}
	}
	return null;
}

function closeGameIfNecessary(game: g.Game) {
	if (!game.joinable) {
		return;
	}

	let waitPeriod: number = null;
	let numTeams: number = null;

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
		if ((game.bots.size === 0 || game.matchmaking.AllowBotTeams) && wu(game.active.values()).every(x => !!x.userId)) {
			// Everyone must be logged in to activate team mode
			if (numPlayers >= 4 && Math.random() < game.matchmaking.TeamGameProbability) {
				const candidates = new Array<number>();
				for (let candidateTeams = 2; candidateTeams <= numPlayers / 2; ++candidateTeams) {
					if ((numPlayers % candidateTeams) === 0) {
						candidates.push(candidateTeams);
					}
				}
				if (candidates.length > 0) {
					numTeams = candidates[Math.floor(Math.random() * candidates.length)];
				}
			}
		}

		getStore().joinableGames.delete(game.id);
		game.joinable = false;
		waitPeriod = 0;
		logger.info("Game [" + game.id + "]: now unjoinable with " + game.active.size + " players (" + (numTeams || 1) + " teams) after " + game.tick + " ticks");
	}

	if (waitPeriod !== null) {
		queueControlMessage(game, {
			type: m.ActionType.CloseGame,
			closeTick: game.closeTick,
			waitPeriod,
			numTeams,
		});
	}
}

function calculateJoinPeriod(segment: string, numHumans: number, locked: string, maxPlayers: number): number {
	if (locked) {
		return Matchmaking.JoinPeriod;
	}

	const numInRoom = calculateRoomStats(segment);
	const targetPerGame = minPerGame(numInRoom, maxPlayers);

	if (numHumans < targetPerGame) {
		return Matchmaking.WaitForMorePeriod;
	} else {
		return Matchmaking.JoinPeriod;
	}
}