import { Matchmaking, TicksPerSecond } from '../game/constants';
import * as _ from 'lodash';
import * as c from '../game/constants.model';
import * as m from '../game/messages.model';

const express = require('express');
const app = express();
const http = require('http').Server(app);
const io = require('socket.io')(http);

const port = process.env.PORT || 7770;

app.use(express.static('./'));

io.on('connection', onConnection);

let server = http.listen(port, function() {
	console.log("Started listening on port " + port);
});


// Game management
interface Game {
    id: string;
    active: Map<string, Player>; // socketId -> Player
    started: boolean;
    numPlayers: number;
    tick: number;
    joinLimitTick: number | null;
	actions: Map<string, m.ActionMsg>; // heroId -> actionData
	history: m.TickMsg[];

    intervalHandle?: NodeJS.Timer;
}
interface Player {
	socketId: string;
	heroId: string;
	name: string;
}

let nextGameId = 0;
let games = new Map<string, Game>(); // id -> game

function onConnection(socket: SocketIO.Socket) {
  console.log("user " + socket.id + " connected");

	socket.on('disconnect', () => {
		console.log("user " + socket.id + " disconnected");

		games.forEach(game => {
			if (game.active.has(socket.id)) {
				leaveGame(game, socket);
			}
		});
	});

	socket.on('join', data => onJoinGameMsg(socket, data));
}

function onJoinGameMsg(socket: SocketIO.Socket, data: m.JoinMsg) {
	let game: Game = null;
	games.forEach(g => {
		if ((!g.started || g.history) && g.active.size < Matchmaking.MaxPlayers) {
			game = g;
		}
	});
	if (!game) {
		game = initGame();
	}
	
	let heroId = joinGame(game, c.sanitizeName(data.name), socket);

	socket.on('action', (actionData: m.ActionMsg) => {
		if (!isUserInitiated(actionData)) {
			console.log("Game [" + game.id + "]: user attempted to send disallowed action: " + actionData.actionType);
		} else if (actionData.heroId == heroId) {
			queueAction(game, actionData);
		} else {
			console.log("Game [" + game.id + "]: incorrect hero id! " + actionData.heroId + " should be " + heroId);
		}
	});
}

function initGame() {
	let game = {
		id: "g" + nextGameId++,
		active: new Map<string, Player>(),
		started: false,
		numPlayers: 0,
		tick: 0,
		joinLimitTick: null,
		actions: new Map<string, m.ActionMsg>(),
		history: [],
	} as Game;
	games.set(game.id, game);

	game.intervalHandle = setInterval(() => gameTick(game), 1000.0 / TicksPerSecond);

	console.log("Game [" + game.id + "]: started");
	return game;
}

function joinGame(game: Game, playerName: string, socket: SocketIO.Socket) {
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

	game.active.set(socket.id, {
		socketId: socket.id,
		heroId,
		name: playerName,
	});
	socket.join(game.id);

	socket.emit("hero", {
		gameId: game.id,
		heroId,
		numPlayers: game.numPlayers,
		history: game.history,
	} as m.HeroMsg);

	queueAction(game, { heroId, actionType: "join", playerName });

	console.log("Game [" + game.id + "]: player " + playerName + " [" + socket.id + "] joined, now " + game.numPlayers + " players");

	return heroId;
}

function formatHeroId(index: number): string {
	return "hero" + index;
}

function queueAction(game: Game, actionData: m.ActionMsg) {
	let currentPrecedence = actionPrecedence(game.actions.get(actionData.heroId));
	let newPrecedence = actionPrecedence(actionData);

	if (newPrecedence >= currentPrecedence) {
		game.actions.set(actionData.heroId, actionData);
	}

	if (!game.started && isUserInitiated(actionData)) {
		game.started = true;
		console.log("Started game " + game.id + " with " + game.numPlayers + " players");
	}

	// console.log("Game [" + game.id + "]: action received", actionData);
}

function actionPrecedence(actionData: m.ActionMsg): number {
	if (!actionData) {
		return 0;
	} else if (actionData.actionType === "leave") {
		return 1001;
	} else if (actionData.actionType === "join") {
		return 1000;
	} else if (actionData.actionType === "move") {
		return 10;
	} else {
		return 100;
	}
}

function isUserInitiated(actionData: m.ActionMsg): boolean {
	switch (actionData.actionType) {
		case "leave":
		case "join":
			return false;
		default:
			return true;
	}
}

function isSpell(actionData: m.ActionMsg): boolean {
	switch (actionData.actionType) {
		case "leave":
		case "join":
		case "move":
			return false;
		default:
			return true;
	}
}


function leaveGame(game: Game, socket: SocketIO.Socket) {
	let player = game.active.get(socket.id);
	if (!player) {
		console.log("Game [" + game.id + "]: player " + socket.id + " tried to leave but was not in the game");
		return;
	}

	queueAction(game, { heroId: player.heroId, actionType: "leave" });

	game.active.delete(socket.id);
	socket.leave(game.id);
	console.log("Game [" + game.id + "]: player " + player.name + " [" + socket.id + "] left after " + game.tick + " ticks");
}

function finishGame(game: Game) {
	games.delete(game.id);
	if (game.intervalHandle) {
		clearInterval(game.intervalHandle);
	}

	console.log("Game [" + game.id + "]: finished after " + game.tick + " ticks");
}

function gameTick(game: Game) {
	if (game.active.size === 0) {
		finishGame(game);
		return;
	}

	if (game.started || game.actions.size > 0) {
		let data = {
			gameId: game.id,
			tick: game.tick++,
			actions: [...game.actions.values()],
		} as m.TickMsg;
		game.actions.clear();

		if (game.history) {
			game.history.push(data);

			if (!game.joinLimitTick && game.active.size > 1 && _.some(data.actions, action => isSpell(action))) {
				// Casting any spell closes the game
				game.joinLimitTick = game.tick + Matchmaking.JoinPeriod;
			}
			if (game.history.length >= Matchmaking.MaxHistoryLength ||
				(game.joinLimitTick && game.tick >= game.joinLimitTick)) {
				game.history = null; // Make the game unjoinable
				console.log("Game [" + game.id + "]: now unjoinable with " + game.numPlayers + " players after " + game.tick + " ticks");
			}
		}

		io.to(game.id).emit('tick', data);
	}
}

function mapMap<K, V, Out>(map : Map<K, V>, func: (v: V) => Out) {
	let result = new Array<Out>();
	map.forEach(value => result.push(func(value)));
	return result;
}