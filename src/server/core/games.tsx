import _ from 'lodash';
import crypto from 'crypto';
import moment from 'moment';
import uniqid from 'uniqid';
import wu from 'wu';
import { Matchmaking, TicksPerSecond, MaxIdleTicks, TicksPerTurn } from '../../game/constants';
import * as g from '../server.model';
import * as m from '../../shared/messages.model';
import * as w from '../../game/world.model';
import * as segments from '../../shared/segments';
import * as constants from '../../game/constants';
import * as engine from '../../game/engine';
import * as online from './online';
import * as ratings from '../ratings/ratings';
import * as results from './results';
import * as statsStorage from '../storage/statsStorage';
import * as transientIds from '../utils/transientIds';
import { getStore } from '../serverStore';
import { logger } from '../status/logging';

let emitJoin: JoinEmitter = null;
let emitSplit: SplitEmitter = null;

let queuedMessageListener: QueuedMessageListener = null;

const finishedGameListeners = new Array<FinishedGameListener>();

export interface JoinEmitter {
	(join: g.JoinResult): void;
}

export interface SplitEmitter {
	(socketId: string, oldGameId: string, newGameId: string): void;
}

export interface QueuedMessageListener {
	(game: g.Game): void;
}

export interface FinishedGameListener {
	(game: g.Game, result: m.GameStatsMsg): void;
}

export function attachToJoinEmitter(emit: JoinEmitter) {
	emitJoin = emit;
}

export function attachToSplitEmitter(emit: SplitEmitter) {
	emitSplit = emit;
}

export function attachQueuedMessageListener(listener: QueuedMessageListener) {
	queuedMessageListener = listener;
}

export function attachFinishedGameListener(listener: FinishedGameListener) {
	finishedGameListeners.push(listener);
}

export function calculateRoomStats(segment: string): number {
	const scoreboard = getStore().scoreboards.get(segment);
	if (scoreboard) {
		return scoreboard.online.size;
	} else {
		return 0;
	}
}

export function receiveAction(game: g.Game, data: m.ActionMsg, socketId: string) {
	const player = game.active.get(socketId);
	if (!player) {
		return;
	}

	const heroId = game.controlKeys.get(data.c);
	if (!heroId) {
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
		segment: segments.calculateSegment(version, room.id, partyId),
		matchmaking: { ...room.Matchmaking },
		roomId: room.id,
		partyId,
		mod: room ? room.mod : {},
		created: moment(),
		active: new Map<string, g.Player>(),
		bots: new Map<string, string>(),
		observers: new Map(),
		nextPlayerId: 0,
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

export function unregisterGame(game: g.Game) {
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

export function splitGame(initial: g.Game, requestedSocketIds: string[][]): g.Game[] {
	// Calculate which sockets are actually going in which game
	const allSocketIds = wu(initial.active.keys()).toArray();
	const remainingSocketIds = new Set(initial.active.keys());
	const forkSocketIds = new Array<Set<string>>();
	for (let i = 0; i < requestedSocketIds.length; ++i) {
		const socketIds = new Set<string>();
		requestedSocketIds[i].forEach(socketId => {
			if (remainingSocketIds.has(socketId)) {
				remainingSocketIds.delete(socketId);
				socketIds.add(socketId);
			}
		});
		forkSocketIds.push(socketIds);
	}
	if (remainingSocketIds.size > 0) {
		forkSocketIds.push(remainingSocketIds);
	}

	// Create a copy of the initial game
	const forks = _.range(0, forkSocketIds.length).map(_ => cloneGame(initial));

	// Unassign bots as simulating players may need to change
	forks.forEach(fork => unassignBots(fork));

	// Remove players from alternate game
	const replaceWithBot = false;
	const isSplit = true;
	for (let i = 0; i < forks.length; ++i) {
		const fork = forks[i];
		const socketIds = forkSocketIds[i];

		allSocketIds.forEach(socketId => {
			if (!socketIds.has(socketId)) {
				// Remove the player from this fork
				leaveGame(fork, socketId, replaceWithBot, isSplit);
				fork.socketIds.delete(socketId);
				fork.isRankedLookup.delete(socketId);
			}
		});
	}

	// Move players to new game
	for (let i = 0; i < forks.length; ++i) {
		const fork = forks[i];
		const socketIds = forkSocketIds[i];

		socketIds.forEach(socketId => {
			emitSplit(socketId, initial.id, fork.id);
		});
	}

	// Move observers to first game - remove from others
	for (let i = 1; i < forks.length; ++i) {
		const fork = forks[i];
		fork.observers.clear();
	}

	// Destroy initial game
	initial.active.clear();

	logger.info(`Game [${initial.id}] split into ${formatForks(forks)} at ${initial.tick} ticks`);
	return forks;
}

export function emitForks(forks: g.Game[]) {
	forks.forEach(fork => {
		fork.active.forEach(player => {
			emitJoinForSocket(fork, player.socketId);
		});
		fork.observers.forEach(observer => {
			emitJoinForSocket(fork, observer.socketId);
		});
	});
}

function formatForks(forks: g.Game[]): string {
	return forks.map(fork => `${fork.id} (${fork.active.size})`).join(', ');
}

export function queueAction(game: g.Game, actionData: m.ActionMsg) {
	const heroId = game.controlKeys.get(actionData.c);
	if (!heroId) {
		return;
	}

	let currentPrecedence = actionPrecedence(game.actions.get(heroId));
	let newPrecedence = actionPrecedence(actionData);

	if (newPrecedence >= currentPrecedence) {
		game.actions.set(heroId, actionData);
	}

	queuedMessageListener(game);
}

export function queueControlMessage(game: g.Game, actionData: m.ControlMsg) {
	game.controlMessages.push(actionData);

	queuedMessageListener(game);
}

export function queueSyncMessage(game: g.Game, actionData: m.SyncMsg) {
	if (game.syncTick < actionData.t) {
		game.syncTick = actionData.t;
		game.syncMessage = actionData;

		queuedMessageListener(game);
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

export function receiveScore(game: g.Game, socketId: string, stats: m.GameStatsMsg) {
	game.scores.set(socketId, stats);
	if (game.scores.size >= game.active.size) {
		// Everyone has reported that the game is finished
		game.winTick = game.tick;
		rankGameIfNecessary(game);
	}
}

export function leaveGame(game: g.Game, socketId: string, replaceWithBot: boolean = true, split?: boolean) {
	const player = game.active.get(socketId);
	if (player) {
		game.controlKeys.delete(player.controlKey);
		game.active.delete(socketId);
		reassignBots(game, socketId);

		let controlKey: number = null;
		if (replaceWithBot) {
			// Give the bot a new control key to avoid applying human messages to bot character or vice versa
			// (particularly spell change actions which are permanent)
			game.bots.set(player.heroId, null);
			controlKey = acquireControlKey(player.heroId, game);
		}

		queueControlMessage(game, { heroId: player.heroId, controlKey, type: "leave", split });
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
		ratings.saveGame(game, result).then(newResult => {
			result = newResult || result;

			for (const listener of finishedGameListeners) {
				listener(game, result);
			}
			online.incrementStats(game.segment, result);
		});
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
		} else {
			return null;
		}
	} else {
		if (game.joinable) {
			removeBot(game);
			heroId = generateHeroId(game);
		} else {
			// Not allowed to join a game in-progress
			return null;
		}
	}

	if (!heroId) {
		return null;
	}

	const userHash = params.userHash;
	const controlKey = acquireControlKey(heroId, game);
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
		numGames: params.numGames,
		controlKey,
		numActionMessages: 0,
	});
	game.bots.delete(heroId);
	game.socketIds.add(params.socketId);

	if (userId) {
		game.isRankedLookup.set(userId, !params.unranked);
	}

	queueControlMessage(game, {
		heroId: heroId,
		controlKey,
		type: "join",
		userId,
		userHash,
		playerName: params.name,
		keyBindings: params.keyBindings,
		isMobile: params.isMobile,
	});

	return emitJoinForSocket(game, params.socketId);
}

function emitJoinForSocket(game: g.Game, socketId: string): g.JoinResult {
	const player = game.active.get(socketId);
	if (player) {
		const controlKey = player.controlKey;
		const reconnectKey = assignReconnectKey(game, player.heroId);
		const join: g.JoinResult = {
			socketId,
			game,
			live: true,

			heroId: player.heroId,
			controlKey,
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

export function replayGame(replay: m.Replay, params: g.JoinParameters) {
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

function acquireControlKey(heroId: string, game: g.Game) {
	const controlKey = transientIds.generate();
	game.controlKeys.set(controlKey, heroId);
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

	const heroId = generateHeroId(game);

	game.bots.set(heroId, null);

	const keyBindings = {};
	const controlKey = acquireControlKey(heroId, game);
	queueControlMessage(game, { heroId: heroId, controlKey: controlKey, type: "bot", keyBindings });

	return heroId;
}

export function removeBot(game: g.Game) {
	if (game.bots.size > 0) {
		const heroId = game.bots.keys().next().value; // Take first bot
		const controlKey = findControlKey(game, heroId);

		game.controlKeys.delete(controlKey);
		game.bots.delete(heroId);

		queueControlMessage(game, { heroId: heroId, controlKey: null, type: "leave" });
		return heroId;
	} else {
		return null;
	}
}

function findControlKey(game: g.Game, heroId: string): number {
	let controlKey: number = undefined;
	game.controlKeys.forEach((h, c) => {
		if (h === heroId) {
			controlKey = c;
		}
	});
	return controlKey;
}

function generateHeroId(game: g.Game): string {
	const numPlayers = game.active.size + game.bots.size;
	if (numPlayers >= game.matchmaking.MaxPlayers) {
		return null;
	}

	return engine.formatHeroId(game.nextPlayerId++);
}
