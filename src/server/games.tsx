import _ from 'lodash';
import crypto from 'crypto';
import moment from 'moment';
import uniqid from 'uniqid';
import { Matchmaking, TicksPerSecond, MaxIdleTicks, TicksPerTurn } from '../game/constants';
import * as g from './server.model';
import * as m from '../game/messages.model';
import * as w from '../game/world.model';
import * as auth from './auth';
import * as categories from './categories';
import * as constants from '../game/constants';
import * as gameStorage from './gameStorage';
import * as results from './results';
import * as statsStorage from './statsStorage';
import { getStore } from './serverStore';
import { addTickMilliseconds } from './loadMetrics';
import { logger } from './logging';
import { DefaultSettings } from '../game/settings';
import { required, optional } from './schema';

const NanoTimer = require('nanotimer');
const tickTimer = new NanoTimer();

let emitTick: Emitter<m.TickMsg> = null;
let ticksProcessing = false;

const finishedGameListeners = new Array<FinishedGameListener>();

export interface Emitter<T> {
	(data: T): void;
}

export interface FinishedGameListener {
	(game: g.Game, result: m.GameStatsMsg): void;
}

export function attachToTickEmitter(_emit: Emitter<m.TickMsg>) {
	emitTick = _emit;
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
			let anyGameRunning = false;

			const playerCounts: g.PlayerCounts = {};
			getStore().activeGames.forEach(game => {
				const isGameRunning = gameTick(game);
				anyGameRunning = anyGameRunning || isGameRunning;

				if (isGameRunning) {
					playerCounts[game.category] = (playerCounts[game.category] || 0) + game.active.size;
				}
			});
			getStore().playerCounts = playerCounts;

			if (!anyGameRunning) {
				ticksProcessing = false;
				tickTimer.clearInterval();
				logger.info("Stopped processing ticks");
			}
		}, '', 'm');
		addTickMilliseconds(milliseconds);
	}, '', Math.floor(TicksPerTurn * (1000 / TicksPerSecond)) + 'm');
}

export function findNewGame(version: string, room: g.Room | null, partyId: string | null, isPrivate: boolean, allowBots: boolean, numNewPlayers: number = 1): g.Game {
	const roomId = room ? room.id : null;
	const category = categories.calculateGameCategory(version, roomId, partyId, isPrivate, allowBots);
	const store = getStore();

	let numPlayers = (store.playerCounts[category] || 0) + numNewPlayers; // +1 player because the current player calling this method is a new player
	let openGames = new Array<g.Game>();
	store.joinableGames.forEach(gameId => {
		const g = store.activeGames.get(gameId);
		if (g && g.joinable) {
			if (g.category === category && (g.active.size + numNewPlayers) <= Matchmaking.MaxPlayers) {
				openGames.push(g);
			}
		} else {
			// This entry shouldn't be in here - perhaps it was terminated before it could be removed
			store.joinableGames.delete(gameId);
		}
	});

	const targetPlayersPerGame = numPlayers > Matchmaking.MaxPlayers ? apportionPerGame(numPlayers) : Matchmaking.MaxPlayers;

	let game: g.Game = null;
	if (openGames.length > 0) {
		let minSize = Infinity;
		openGames.forEach(g => {
			const size = g.active.size;
			if (size < Matchmaking.MaxPlayers && size < minSize) {
				minSize = size;
				game = g;
			}
		});
	}
	if (game && game.active.size >= targetPlayersPerGame && openGames.length <= 1) {
		// Start a new game early to stop a single player ending up in the same game
		game = null;
	}

	if (!game) {
		game = initGame(version, room, partyId, isPrivate, allowBots);
	}
	return game;
}

export function findExistingGame(version: string, room: g.Room | null, partyId: string | null, isPrivate: boolean, allowBots: boolean): g.Game {
	const roomId = room ? room.id : null;
	const category = categories.calculateGameCategory(version, roomId, partyId, isPrivate, allowBots);
	const store = getStore();

	const candidates = [...store.activeGames.values()].filter(x => x.category === category);
	if (candidates.length === 0) {
		return null;
	}

	return _.maxBy(candidates, x => watchPriority(x));
}

function watchPriority(game: g.Game): number {
	if (!(game.active.size && isGameRunning(game))) {
		// Discourage watching finished game
		return 0;
	} else if (game.winTick) {
		// Discourage watching a game which is not live
		return game.numPlayers;
	} else if (!game.joinable) {
		// Encourage watching a game in-progress
		return 1000 + game.numPlayers;
	} else {
		// Watch a game that is only starting
		return 100 + game.numPlayers;
	}
}

export function calculateRoomStats(category: string): number {
	return getStore().playerCounts[category] || 0;
}

export function apportionPerGame(totalPlayers: number) {
	return Math.ceil(averagePlayersPerGame(totalPlayers));
}

export function minPerGame(totalPlayers: number) {
	return Math.floor(averagePlayersPerGame(totalPlayers));
}

export function averagePlayersPerGame(totalPlayers: number) {
	const maxGames = Math.ceil(totalPlayers / Matchmaking.MaxPlayers);
	return totalPlayers / maxGames;
}

export function receiveAction(game: g.Game, data: m.ActionMsg, socketId: string) {
	if (!(
		(
			data.actionType === "game"
			&& required(data.spellId, "string")
			&& required(data.targetX, "number")
			&& required(data.targetY, "number")
		) || (
			data.actionType === "text"
			&& required(data.text, "string")
		) || (
			data.actionType === "spells"
			&& required(data.keyBindings, "object")
		)
	)) {
		logger.info("Game [" + game.id + "]: action message received from socket " + socketId + " with wrong action type: " + data.actionType);
		return;
	}

	if (data.actionType === "text" && (data.text.length > constants.MaxTextMessageLength || data.text.indexOf("\n") !== -1)) {
		logger.info("Game [" + game.id + "]: text message received from socket " + socketId + " was invalid");
		return;
	}

	const player = game.active.get(socketId);
	if (!player) {
		return;
	}

	if (data.heroId === player.heroId || game.bots.get(data.heroId) === socketId) {
		queueAction(game, data);
	}
}

export function initRoom(mod: Object, authToken: string): g.Room {
	const store = getStore();

	// Same settings -> same room
	const id = crypto.createHash('md5').update(JSON.stringify({mod})).digest('hex');
	let room = store.rooms.get(id);
	if (!room) {
		room = {
			id,
			created: moment(),
			accessed: moment(),
			mod,
		};
		store.rooms.set(room.id, room);

        logger.info(`Room ${room.id} created by user ${authToken} mod ${JSON.stringify(mod).substr(0, 1000)}`);
	} else {
        logger.info(`Room ${room.id} joined by user ${authToken}`);
	}
	return room;
}

export function initGame(version: string, room: g.Room | null, partyId: string | null, isPrivate: boolean, allowBots: boolean) {
	const store = getStore();
	const roomId = room ? room.id : null;

	const gameIndex = getStore().nextGameId++;
	let game: g.Game = {
		id: uniqid("g" + gameIndex + "-"),
		category: categories.calculateGameCategory(version, roomId, partyId, isPrivate, allowBots),
		roomId,
		partyId,
		isPrivate,
		mod: room ? room.mod : {},
		allowBots,
		created: moment(),
		active: new Map<string, g.Player>(),
		bots: new Map<string, string>(),
		playerNames: new Array<string>(),
		userIds: new Set<string>(),
		socketIds: new Set<string>(),
		numPlayers: 0,
		winTick: null,
		scores: new Map<string, m.GameStatsMsg>(),
		tick: 0,
		activeTick: 0,
		joinable: true,
		closeTick: Matchmaking.MaxHistoryLength,
		ranked: false,
		actions: new Map<string, m.ActionMsg>(),
		messages: new Array<m.TextMsg>(),
		history: [],
	};
	store.activeGames.set(game.id, game);
	store.joinableGames.add(game.id);
	if (room) {
		room.accessed = moment();
	}

	const heroId = systemHeroId(m.ActionType.Environment);
	game.actions.set(heroId, {
		gameId: game.id,
		heroId,
		actionType: m.ActionType.Environment,
		seed: gameIndex,
	});
	startTickProcessing();

	let gameName = game.id;
	if (room) {
		gameName = room.id + "/" + gameName;
	}
	logger.info(`Game [${gameName}]: started (${game.category})`);
	return game;
}

export function assignPartyToGames(party: g.Party) {
	const assignments = new Array<g.PartyGameAssignment>();
	const store = getStore();

	const room = store.rooms.get(party.roomId);
	const allowBots = [...party.active.values()].some(p => p.isBot);
	const remaining = _.shuffle([...party.active.values()].filter(p => p.ready && !p.isObserver));
	const maxPlayersPerGame = apportionPerGame(remaining.length);
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
		const game = findNewGame(group[0].version, room, party.id, party.isPrivate, allowBots, group.length);
		for (const member of group) {
			const heroId = joinGame(game, member);
			assignments.push({ partyMember: member, game, heroId });
		}
	}

	if (assignments.length > 0) {
		const observers = [...party.active.values()].filter(p => p.ready && p.isObserver);
		const game = assignments[0].game;
		for (const observer of observers) {
			assignments.push({ game, partyMember: observer, heroId: null });
		}
	}

	return assignments;
}

function formatHeroId(index: number): string {
	return "hero" + index;
}

function queueAction(game: g.Game, actionData: m.ActionMsg) {
	if (actionData.actionType === "text") {
		game.messages.push(actionData);
		return;
	}

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
	} else if (actionData.actionType === "join" || actionData.actionType === "leave" || actionData.actionType === "bot") {
		return 1000;
	} else if (actionData.actionType === "spells") {
		return 101;
	} else if (actionData.actionType === "game" && actionData.spellId === w.Actions.MoveAndCancel) {
		return 11;
	} else if (actionData.actionType === "game" && actionData.spellId === w.Actions.Move) {
		return 10;
	} else if (actionData.actionType === "game" && actionData.spellId === w.Actions.Retarget) {
		return 1;
	} else {
		return 100;
	}
}

function isSpell(actionData: m.ActionMsg): boolean {
	return actionData.actionType === "game" && !w.Actions.NonGameStarters.some(x => x === actionData.spellId);
}

export function receiveScore(game: g.Game, socketId: string, stats: m.GameStatsMsg) {
	game.scores.set(socketId, stats);
	if (game.scores.size >= game.active.size) {
		// Everyone has reported that the game is finished
		game.winTick = game.tick;
		rankGameIfNecessary(game);
	}
}

export function leaveGame(game: g.Game, socketId: string) {
	let player = game.active.get(socketId);
	if (!player) {
		return;
	}

	game.active.delete(socketId);
	reassignBots(game, player.heroId, socketId);

	queueAction(game, { gameId: game.id, heroId: player.heroId, actionType: "leave" });

	logger.info("Game [" + game.id + "]: player " + player.name + " [" + socketId + "] left after " + game.tick + " ticks");

	// Update counts
	{
		// Note, this can be a little bit wrong if a player leaves a game that was not being counted due to inactivity - it gets fixed up every 32 milliseconds so we don't care
		const playerCounts = getStore().playerCounts;
		playerCounts[game.category] = Math.max(0, (playerCounts[game.category] || 0) - 1);
	}
}

function reassignBots(game: g.Game, leavingHeroId: string, leftSocketId: string) {
	if (game.active.size === 0) {
		// No one to simulate the bots
		game.bots.clear();
		return;
	}

	const botsToReassign = [leavingHeroId];
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
	const newPlayer = [...game.active.values()][0];
	botsToReassign.forEach(heroId => {
		game.bots.set(heroId, newPlayer.socketId);
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

	const result = results.calculateResult(game);
	statsStorage.saveGame(game, result).then(newResult => {
		for (const listener of finishedGameListeners) {
			listener(game, newResult || result);
		}
	});
}

function finishGameIfNecessary(game: g.Game) {
	if (game.active.size === 0) {
		game.bots.clear();
		getStore().activeGames.delete(game.id);

		gameStorage.saveGame(game);

		logger.info("Game [" + game.id + "]: finished after " + game.tick + " ticks");
		return true;
	} else {
		return false;
	}
}

function gameTick(game: g.Game): boolean {
	let running = isGameRunning(game) || game.actions.size > 0;
	if (running) {
		for (let i = 0; i < TicksPerTurn; ++i) {
			gameTurn(game);
		}
	}

	if (finishGameIfNecessary(game)) {
		running = false;
	}

	return running;
}

function gameTurn(game: g.Game) {
	let data = {
		gameId: game.id,
		tick: game.tick++,
		actions: [...game.actions.values(), ...game.messages],
	} as m.TickMsg;
	if (game.actions.size > 0 || game.messages.length > 0) {
		game.activeTick = game.tick;
	}
	game.actions.clear();
	game.messages.length = 0;

	if (game.history) {
		if (game.history.length < Matchmaking.MaxHistoryLength) {
			game.history.push(data);
		} else {
			game.closeTick = Math.min(game.closeTick, game.tick); // New players cannot join without the full history
		}
	}

	closeGameIfNecessary(game, data);
	emitTick(data);
}

export function isGameRunning(game: g.Game) {
	return (game.tick - game.activeTick) < MaxIdleTicks;
}

export function joinGame(game: g.Game, params: g.JoinParameters) {
	if (!game.joinable || game.active.size >= Matchmaking.MaxPlayers) {
		return null;
	}

	let heroId: string = findExistingSlot(game);

	// No existing slots, create a new one
	if (!heroId) {
		heroId = formatHeroId(game.numPlayers++);
	}

	game.active.set(params.socketId, {
		socketId: params.socketId,
		heroId,
		partyId: null,
		name: params.name,
	});
	game.bots.delete(heroId);
	game.playerNames.push(params.name);

	const userHash = params.authToken ? auth.getUserHashFromAuthToken(params.authToken) : null;
	auth.getUserIdFromAccessKey(auth.enigmaAccessKey(params.authToken)).then(userId => {
		game.userIds.add(userId);
		game.socketIds.add(params.socketId);
		queueAction(game, {
			gameId: game.id,
			heroId,
			actionType: "join",
			userId,
			userHash,
			playerName: params.name,
			keyBindings: params.keyBindings,
			isBot: params.isBot,
			isMobile: params.isMobile,
		 });
	});

	// Update counts
	{
		const playerCounts = getStore().playerCounts;
		playerCounts[game.category] = (playerCounts[game.category] || 0) + 1;
	}

	return heroId;
}

export function addBot(game: g.Game) {
	if (game.numPlayers >= Matchmaking.MaxPlayers || game.active.size === 0 || !game.joinable) {
		return null;
	}

	const replaceBots = false;
	const heroId = findExistingSlot(game, replaceBots) || formatHeroId(game.numPlayers++);

	// Nominate first player as simulator
	const player = [...game.active.values()][0];
	game.bots.set(heroId, player.socketId);

	const keyBindings = randomKeyBindings(game);
	queueAction(game, { gameId: game.id, heroId, actionType: "bot", keyBindings });

	return heroId;
}

function randomKeyBindings(game: g.Game): KeyBindings {
	const keyBindings: KeyBindings = {};
	const allOptions = DefaultSettings.Choices.Options
	for (const key in allOptions) {
		const options = allOptions[key];
		if (options.length > 1) {
			keyBindings[key] = options[Math.floor(Math.random() * options.length)];
		}
	}
	return keyBindings;
}

function findExistingSlot(game: g.Game, replaceBots: boolean = true): string {
	// Take an existing slot, if possible
	let activeHeroIds = new Set<string>([...game.active.values()].map(x => x.heroId));
	if (!replaceBots) {
		[...game.bots.keys()].forEach(heroId => activeHeroIds.add(heroId));
	}

	for (let i = 0; i < game.numPlayers; ++i) {
		let candidate = formatHeroId(i);
		if (!activeHeroIds.has(candidate)) {
			return candidate;
		}
	}
	return null;
}

function closeGameIfNecessary(game: g.Game, data: m.TickMsg) {
	if (!game.joinable) {
		return;
	}

	let waitPeriod: number = null;

	const numPlayers = game.active.size + game.bots.size;
	if (numPlayers > 1 && data.actions.some(action => isSpell(action))) {
		// Casting any spell closes the game
		const joinPeriod = calculateJoinPeriod(game.category, game.active.size);

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
		queueAction(game, {
			gameId: game.id,
			heroId: systemHeroId(m.ActionType.CloseGame),
			actionType: m.ActionType.CloseGame,
			closeTick: game.closeTick,
			waitPeriod,
		});
	}
}

function calculateJoinPeriod(category: string, numHumans: number): number {
	const numInRoom = calculateRoomStats(category);
	const targetPerGame = minPerGame(numInRoom);
	if (numHumans < targetPerGame) {
		return Matchmaking.WaitForMorePeriod;
	} else {
		return Matchmaking.JoinPeriod;
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