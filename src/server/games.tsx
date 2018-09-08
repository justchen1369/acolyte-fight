import _ from 'lodash';
import crypto from 'crypto';
import moment from 'moment';
import { Matchmaking, TicksPerSecond, MaxIdleTicks, TicksPerTurn } from '../game/constants';
import * as c from '../game/world.model';
import * as g from './server.model';
import * as m from '../game/messages.model';
import { getStore } from './serverStore';
import { addTickMilliseconds } from './loadMetrics';
import { logger } from './logging';
import { DefaultSettings } from '../game/settings';

const NanoTimer = require('nanotimer');
const tickTimer = new NanoTimer();

let emitTick: Emitter<m.TickMsg> = null;
let ticksProcessing = false;

export interface Emitter<T> {
	(data: T): void;
}

export function attachToTickEmitter(_emit: Emitter<m.TickMsg>) {
	emitTick = _emit;
}

export interface DisconnectResult {
	changedParties: g.Party[];
}

export interface PartyGameAssignment {
	partyMember: g.PartyMember;
	game: g.Game;
	heroId: string;
}

export function onConnect(socketId: string, authToken: string) {
}

export function onDisconnect(socketId: string, authToken: string): DisconnectResult {
	const changedParties = new Array<g.Party>();
	getStore().activeGames.forEach(game => {
		if (game.active.has(socketId)) {
			leaveGame(game, socketId);
		}
	});
	getStore().parties.forEach(party => {
		if (party.active.has(socketId)) {
			removePartyMember(party, socketId);
			changedParties.push(party);
		}
	});
	return { changedParties }
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

export function findNewGame(room: g.Room | null, allowBots: boolean, numNewPlayers: number = 1): g.Game {
	const roomId = room ? room.id : null;
	const store = getStore();

	let numPlayers = numNewPlayers; // +1 player because the current player calling this method is a new player
	let openGames = new Array<g.Game>();
	store.activeGames.forEach(g => {
		if (g.roomId === roomId && g.allowBots == allowBots) {
			if (isGameRunning(g)) {
				numPlayers += g.active.size;
			}
			if (g.joinable && (g.active.size + numNewPlayers) <= Matchmaking.MaxPlayers) {
				openGames.push(g);
			}
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
		game = initGame(room, allowBots);
	}
	return game;
}

function apportionPerGame(totalPlayers: number) {
	const maxGames = Math.ceil(totalPlayers / Matchmaking.MaxPlayers);
	return Math.ceil(totalPlayers / maxGames);
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

export function initParty(leaderSocketId: string, roomId: string = null): g.Party {
	const partyIndex = getStore().nextPartyId++;
	const party: g.Party = {
		id: "p" + partyIndex + "-" + Math.floor(Math.random() * 1e9).toString(36),
		created: moment(),
		modified: moment(),
		leaderSocketId,
		roomId,
		active: new Map<string, g.PartyMember>(),
		isPrivate: false,
	};
	getStore().parties.set(party.id, party);
	return party;
}

export function initGame(room: g.Room, allowBots: boolean) {
	const gameIndex = getStore().nextGameId++;
	let game: g.Game = {
		id: "g" + gameIndex + "-" + Math.floor(Math.random() * 1e9).toString(36),
		roomId: room ? room.id : null,
		mod: room ? room.mod : {},
		allowBots,
		created: moment(),
		active: new Map<string, g.Player>(),
		bots: new Map<string, string>(),
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
	logger.info("Game [" + gameName + "]: started");
	return game;
}

export function updatePartyRoom(party: g.Party, roomId: string): boolean {
	let changed = false;
	if (party.roomId !== roomId) {
		party.roomId = roomId;
		changed = true;
		party.active.forEach(member => { // Unready so users can read new settings
			if (!member.isObserver) {
				member.ready = false;
			}
		});

		logger.info(`Party ${party.id} moved to room=${party.roomId}`);
	}
	return changed;
}

export function updatePartyPrivacy(party: g.Party, isPrivate: boolean): boolean {
	let changed = false;
	if (party.isPrivate !== isPrivate) {
		party.isPrivate = isPrivate;
		changed = true;

		logger.info(`Party ${party.id} changed to isPrivate=${party.isPrivate}`);
	}
	return changed;
}

export function updatePartyMember(party: g.Party, member: g.PartyMember, joining: boolean) {
	const socketId = member.socketId;
	party.active.set(socketId, member);
	party.modified = moment();

	if (joining) {
		logger.info(`Party ${party.id} joined by user ${member.name} [${member.authToken}]]`);
	}
}

export function removePartyMember(party: g.Party, socketId: string) {
	const member = party.active.get(socketId);
	if (!member) {
		return;
	}

	party.active.delete(socketId);
	logger.info(`Party ${party.id} left by user ${member.name} [${member.socketId}]`);

	if (party.active.size > 0) {
		// All members become unready when someone leaves
		party.active.forEach(member => {
			if (!member.isObserver) {
				member.ready = false;
			}
		});
	} else {
		// This party is finished, delete it
		const store = getStore();
		store.parties.delete(party.id);
		logger.info(`Party ${party.id} deleted`);
	}
}

export function startPartyIfReady(party: g.Party): PartyGameAssignment[] {
	const assignments = new Array<PartyGameAssignment>();
	if (party.active.size === 0) {
		return assignments;
	}

	;
	if ([...party.active.values()].every(p => p.ready)) {
		assignPartyToGames(party, assignments);
		logger.info(`Party ${party.id} started with ${party.active.size} players`);
	}
	return assignments;
}

function assignPartyToGames(party: g.Party, assignments: PartyGameAssignment[]) {
	const store = getStore();

	const room = store.rooms.get(party.roomId);
	const allowBots = [...party.active.values()].some(p => p.isBot);
	const remaining = _.shuffle([...party.active.values()].filter(p => p.ready && !p.isObserver));
	const maxPlayersPerGame = apportionPerGame(remaining.length);
	while (remaining.length > 0) {
		const group = new Array<g.PartyMember>();
		for (let i = 0; i < maxPlayersPerGame; ++i) {
			group.push(remaining.shift());
		}

		const game = party.isPrivate ? initGame(room, allowBots) : findNewGame(room, allowBots, group.length);
		for (const member of group) {
			member.ready = false;
			const heroId = joinGame(game, member.name, member.keyBindings, member.isBot, member.isMobile, member.authToken, member.socketId);
			assignments.push({ partyMember: member, game, heroId });
		}

		if (party.isPrivate) {
			game.joinable = false;
		}
	}

	if (assignments.length > 0) {
		const observers = [...party.active.values()].filter(p => p.ready && p.isObserver);
		const game = assignments[0].game;
		for (const observer of observers) {
			assignments.push({ game, partyMember: observer, heroId: null });
		}
	}
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
	} else if (actionData.actionType === "join" || actionData.actionType === "leave" || actionData.actionType === "bot") {
		return 1000;
	} else if (actionData.actionType === "game" && actionData.spellId === "move") {
		return 10;
	} else if (actionData.actionType === "game" && actionData.spellId === "retarget") {
		return 1;
	} else {
		return 100;
	}
}

function isSpell(actionData: m.ActionMsg): boolean {
	return actionData.actionType === "game" && actionData.spellId !== "move" && actionData.spellId !== "retarget";
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

	finishGameIfNecessary(game);
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

function finishGameIfNecessary(game: g.Game) {
	if (game.active.size === 0) {
		game.bots.clear();
		getStore().activeGames.delete(game.id);
		getStore().inactiveGames.set(game.id, game);

		logger.info("Game [" + game.id + "]: finished after " + game.tick + " ticks");
		return true;
	} else {
		return false;
	}
}

function gameTick(game: g.Game): boolean {
	if (finishGameIfNecessary(game)) {
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
	emitTick(data);
}

export function isGameRunning(game: g.Game) {
	return (game.tick - game.activeTick) < MaxIdleTicks;
}

export function joinGame(game: g.Game, playerName: string, keyBindings: KeyBindings, isBot: boolean, isMobile: boolean, authToken: string, socketId: string) {
	if (!game.joinable || game.active.size >= Matchmaking.MaxPlayers) {
		return null;
	}

	let heroId: string = findExistingSlot(game);

	// No existing slots, create a new one
	if (!heroId) {
		heroId = formatHeroId(game.numPlayers++);
	}

	game.active.set(socketId, {
		socketId,
		heroId,
		partyId: null,
		name: playerName,
	});
	game.bots.delete(heroId);
	game.playerNames.push(playerName);

	if (authToken) {
		game.accessTokens.add(authToken);
	}

	queueAction(game, { gameId: game.id, heroId, actionType: "join", playerName, keyBindings, isBot, isMobile });

	return heroId;
}

export function addBot(game: g.Game) {
	if (game.numPlayers >= Matchmaking.MaxPlayers || game.active.size === 0) {
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

	let statusChanged = false;

	if ((game.active.size + game.bots.size) > 1 && data.actions.some(action => isSpell(action))) {
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
		logger.info("Game [" + game.id + "]: now unjoinable with " + game.active.size + " players after " + game.tick + " ticks");
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