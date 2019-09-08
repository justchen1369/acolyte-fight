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
				const isGameRunning = gameTick(game);
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

export function findNewGame(version: string, room: g.Room, partyId: string | null, isPrivate: boolean, newUserHashes: string[]): g.Game {
	const roomId = room ? room.id : null;
	const segment = segments.calculateSegment(roomId, partyId, isPrivate);

	const numJoining = newUserHashes.length;
	const openGames = findJoinableGames(segment);

	let game: g.Game = null;
	if (openGames.length > 0) {
		// TODO: Choose game with closest skill level
		game = _.minBy(openGames, game => game.active.size);

	}

	if (game && game.active.size + numJoining > game.matchmaking.MaxPlayers) {
		// Game too full to add one more player, split it
		game = autoSplitGame(game, numJoining);
	}

	if (game && game.active.size + numJoining > game.matchmaking.MaxPlayers) {
		// Still too big
		game = null;
	}

	if (!game) {
		game = initGame(version, room, partyId, isPrivate);
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

export function findExistingGame(version: string, room: g.Room | null, partyId: string | null, isPrivate: boolean): g.Game {
	const roomId = room ? room.id : null;
	const segment = segments.calculateSegment(roomId, partyId, isPrivate);
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

export function initGame(version: string, room: g.Room, partyId: string | null, isPrivate: boolean, locked: string = null) {
	const gameIndex = getStore().nextGameId++;
	let game: g.Game = {
		id: uniqid("g" + gameIndex + "-"),
		universe: transientIds.generate(),
		segment: segments.calculateSegment(room.id, partyId, isPrivate),
		matchmaking: { ...room.Matchmaking },
		roomId: room.id,
		partyId,
		isPrivate,
		mod: room ? room.mod : {},
		created: moment(),
		active: new Map<string, g.Player>(),
		bots: new Map<string, string>(),
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
		controlKeys: new Map(template.controlKeys),
		reconnectKeys: new Map(template.reconnectKeys),
		isRankedLookup: new Map(template.isRankedLookup),
		socketIds: new Set(template.socketIds),
		scores: new Map(template.scores),
		actions: new Map(template.actions),
		controlMessages: [...template.controlMessages],
		history: template.history.map(t => ({ ...t, u: universe })),
	};
	registerGame(game);
	return game;
}

function splitGame(initial: g.Game, splitSocketIds: Set<string>): g.Game {
	// Create a copy of the initial game
	const fork = cloneGame(initial);
	const remainder = cloneGame(initial);

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

	// Destroy initial game
	unregisterGame(initial);

	logger.info(`Game [${initial.id}] split into ${fork.id} (${fork.active.size} players) and ${remainder.id} (${remainder.active.size} players) at ${initial.tick} ticks`);

	return fork;
}

export function assignPartyToGames(party: g.Party) {
	const assignments = new Array<g.PartyGameAssignment>();
	const store = getStore();


	const partyHash = crypto.createHash('md5').update(party.id).digest('hex');
	const room = store.rooms.get(party.roomId);
	const remaining = _.shuffle(wu(party.active.values()).filter(p => p.ready && !p.isObserver).toArray());
	const maxPlayersPerGame = apportionPerGame(remaining.length, room.Matchmaking.MaxPlayers);
	while (remaining.length > 0) {
		const group = new Array<g.PartyMember>();
		for (let i = 0; i < maxPlayersPerGame; ++i) {
			if (remaining.length > 0) {
				const next = remaining.shift();
				group.push(next);
			} else {
				break;
			}
		}

		// Assume all party members on same engine version
		const game = findNewGame(group[0].version, room, party.id, party.isPrivate, group.map(p => p.userHash));
		for (const member of group) {
			const joinParams: g.JoinParameters = { ...member, partyHash };
			const join = joinGame(game, joinParams);
			assignments.push({ partyMember: member, join });
		}
	}

	if (assignments.length > 0) {
		const template = assignments[0].join;
		if (template) {
			const observers = wu(party.active.values()).filter(p => p.ready && p.isObserver).toArray();
			for (const observer of observers) {
				const join: g.JoinResult = {
					socketId: observer.socketId,
					game: template.game,
					live: template.live,
				};
				assignments.push({ partyMember: observer, join });
			}
		}
	}

	return assignments;
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
	let player = game.active.get(socketId);
	if (!player) {
		return;
	}

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

function gameTick(game: g.Game): boolean {
	let running = isGameRunning(game) || game.actions.size > 0 || game.controlMessages.length > 0;
	if (running) {
		for (let i = 0; i < TicksPerTurn; ++i) {
			gameTurn(game);
		}
	}

	return running;
}

function gameTurn(game: g.Game) {
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

export function joinGame(game: g.Game, params: g.JoinParameters): g.JoinResult {
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
		heroId,
		partyId: null,
		name: params.name,
		unranked: params.unranked,
		autoJoin: params.autoJoin,
		numActionMessages: 0,
	});
	game.bots.delete(heroId);

	auth.getUserIdFromAccessKey(auth.enigmaAccessKey(params.authToken)).then(userId => {
		game.isRankedLookup.set(userId, !params.unranked);
		game.socketIds.add(params.socketId);

		const player = game.active.get(params.socketId);
		if (player) {
			player.userId = userId;

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
		}
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
		};
		emitJoin(join);
		return join;
	} else {
		return null;
	}
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

function autoSplitGame(game: g.Game, numJoining: number): g.Game {
	const playerLimit = apportionPerGame(game.active.size + numJoining, game.matchmaking.MaxPlayers);
	const toRemove = Math.max(numJoining, game.active.size - playerLimit);
	const splitSocketIds = new Set<string>(wu(game.active.keys()).take(toRemove).toArray());
	return splitGame(game, splitSocketIds);
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