'use strict'
var express = require('express');
var app = express();
var http = require('http').Server(app);
var io = require('socket.io')(http);

const port = process.env.PORT || 7770;

app.use(express.static('./'));

io.on('connection', onConnection);

var server = http.listen(port, function() {
	console.log("Started listening on port " + port);
});


// Game management
var TicksPerSecond = 60;
var JoinPeriod = 5 * TicksPerSecond;
var MaxHistoryLength = 60 * TicksPerSecond;
var MaxPlayers = 10;
var nextGameId = 0;
var games = new Map();

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
	var game = null;
	games.forEach(g => {
		if ((!g.started || g.history) && g.active.size < MaxPlayers) {
			game = g;
		}
	});
	if (!game) {
		game = initGame();
	}
	
	var heroId = joinGame(game, socket);

	socket.on('action', (actionData) => {
		if (actionData.heroId == heroId) {
			queueAction(game, actionData);
		} else {
			console.log("Game [" + game.id + "]: incorrect hero id! " + actionData.heroId + " should be " + heroId);
		}
	});
}

function initGame() {
	var game = {
		id: "g" + nextGameId++,
		active: new Map(),
		started: false,
		numPlayers: 0,
		tick: 0,
		joinLimitTick: Infinity,
		actions: new Map(),
		history: [],
	};
	games.set(game.id, game);

	game.intervalHandle = setInterval(() => gameTick(game), 1000.0 / TicksPerSecond);

	console.log("Game [" + game.id + "]: started");
	return game;
}

function joinGame(game, socket) {
	var heroId = null;

	// Take an existing slot, if possible
	var activeHeroIds = new Set(game.active.values());
	for (var i = 0; i < game.numPlayers; ++i) {
		var candidate = formatHeroId(i);
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
	var currentPrecedence = actionPrecedence(game.actions.get(actionData.heroId));
	var newPrecedence = actionPrecedence(actionData);

	if (newPrecedence >= currentPrecedence) {
		game.actions.set(actionData.heroId, actionData);
	}

	if (game.started) {
		if (game.history && isUnjoinable(actionData)) {
			game.joinLimitTick = game.tick + JoinPeriod;
		}
	} else {
		if (shouldStartGame(actionData)) {
			game.started = true;
			console.log("Started game " + game.id + " with " + game.numPlayers + " players");
		}
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

function shouldStartGame(actionData) {
	switch (actionData.actionType) {
		case "leave":
		case "join":
			return false;
		default:
			return true;
	}
}

function isUnjoinable(actionData) {
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
	var heroId = game.active.get(socket.id);
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
	clearInterval(game.intervalHandle);
	console.log("Game [" + game.id + "]: finished after " + game.tick + " ticks");
}

function gameTick(game) {
	if (game.active.size === 0) {
		finishGame(game);
		return;
	}

	if (game.started || game.actions.size > 0) {
		var data = {
			gameId: game.id,
			tick: game.tick++,
			actions: [...game.actions.values()],
		};
		game.actions.clear();

		if (game.history) {
			game.history.push(data);
			if (game.history.length >= MaxHistoryLength || game.tick == game.joinLimitTick) {
				game.history = null; // Make the game unjoinable
				console.log("Game [" + game.id + "]: now unjoinable with " + game.numPlayers + " players after " + game.tick + " ticks");
			}
		}

		io.to(game.id).emit('tick', data);
	}
}
