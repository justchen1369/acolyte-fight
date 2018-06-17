import { TicksPerSecond } from './game/constants';

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
let JoinPeriod = 5 * TicksPerSecond;
let MaxHistoryLength = 180 * TicksPerSecond;
let MaxPlayers = 10;
let nextGameId = 0;
let games = new Map();

function onConnection(socket) {
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

function onJoinGameMsg(socket, data) {
	let game = null;
	games.forEach(g => {
		if ((!g.started || g.history) && g.active.size < MaxPlayers) {
			game = g;
		}
	});
	if (!game) {
		game = initGame();
	}
	
	let heroId = joinGame(game, socket);

	socket.on('action', (actionData) => {
		if (!isUserInitiated(actionData)) {
			console.log("Game [" + game.id + "]: user attempted to send disallowed action: " + actionData.type);
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
		active: new Map(),
		started: false,
		numPlayers: 0,
		tick: 0,
		joinLimitTick: Infinity,
		actions: new Map(),
		intervalHandle: null,
		history: [],
	};
	games.set(game.id, game);

	game.intervalHandle = setInterval(() => gameTick(game), 1000.0 / TicksPerSecond);

	console.log("Game [" + game.id + "]: started");
	return game;
}

function joinGame(game, socket) {
	let heroId = null;

	// Take an existing slot, if possible
	let activeHeroIds = new Set(game.active.values());
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

	game.active.set(socket.id, heroId);
	socket.join(game.id);

	socket.emit("hero", {
		gameId: game.id, heroId,
		numPlayers: game.numPlayers,
		history: game.history,
	});

	queueAction(game, { heroId, actionType: "join" });

	console.log("Game [" + game.id + "]: player " + socket.id + " joined, now " + game.numPlayers + " players");

	return heroId;
}

function formatHeroId(index) {
	return "hero" + index;
}

function queueAction(game, actionData) {
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

function actionPrecedence(actionData) {
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

function isUserInitiated(actionData) {
	switch (actionData.actionType) {
		case "leave":
		case "join":
			return false;
		default:
			return true;
	}
}

function isSpell(actionData) {
	switch (actionData.actionType) {
		case "leave":
		case "join":
		case "move":
			return false;
		default:
			return true;
	}
}


function leaveGame(game, socket) {
	let heroId = game.active.get(socket.id);
	if (!heroId) {
		console.log("Game [" + game.id + "]: player " + socket.id + " tried to leave but was not in the game");
		return;
	}

	queueAction(game, { heroId, actionType: "leave" });

	game.active.delete(socket.id);
	socket.leave(game.id);
	console.log("Game [" + game.id + "]: player " + socket.id + " left after " + game.tick + " ticks");
}

function finishGame(game) {
	games.delete(game.id);
	if (game.intervalHandle) {
		clearInterval(game.intervalHandle);
	}

	console.log("Game [" + game.id + "]: finished after " + game.tick + " ticks");
}

function gameTick(game) {
	if (game.active.size === 0) {
		finishGame(game);
		return;
	}

	if (game.started || game.actions.size > 0) {
		let data = {
			gameId: game.id,
			tick: game.tick++,
			actions: [...game.actions.values()],
		};
		game.actions.clear();

		if (game.history) {
			game.history.push(data);

			if (game.active.size > 1 && any(data.actions, action => isSpell(action))) {
				// Casting any spell closes the game
				game.joinLimitTick = game.tick + JoinPeriod;
			}
			if (game.history.length >= MaxHistoryLength || game.tick == game.joinLimitTick) {
				game.history = null; // Make the game unjoinable
				console.log("Game [" + game.id + "]: now unjoinable with " + game.numPlayers + " players after " + game.tick + " ticks");
			}
		}

		io.to(game.id).emit('tick', data);
	}
}

function any(collection, predicate) {
	for (let value of collection) {
		if (predicate(value)) {
			return true;
		}
	}
	return false;
}

