'use strict'
var express = require('express');
var app = express();
var http = require('http').Server(app);
var io = require('socket.io')(http);

const port = 7770;

app.use(express.static('./'));

io.on('connection', onConnection);

var server = http.listen(port, function() {
	console.log("Started listening on port " + port);
});


// Game management
var TicksPerSecond = 60;
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
		if (!g.started) {
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
		actions: new Map(),
	};
	games.set(game.id, game);

	game.intervalHandle = setInterval(() => gameTick(game), 1000.0 / TicksPerSecond);

	console.log("Game [" + game.id + "]: started");
	return game;
}

function joinGame(game, socket) {
	var heroId = "hero" + game.numPlayers++;
	game.active.set(socket.id, heroId);
	socket.join(game.id);

	socket.emit("hero", { gameId: game.id, heroId, numPlayers: game.numPlayers });
	socket.broadcast.to(game.id).emit("join", { gameId: game.id, numPlayers: game.numPlayers });

	console.log("Game [" + game.id + "]: player " + socket.id + " joined, now " + game.numPlayers + " players");

	return heroId;
}

function queueAction(game, actionData) {
	var currentPrecedence = actionPrecedence(game.actions.get(actionData.heroId));
	var newPrecedence = actionPrecedence(actionData);

	if (newPrecedence >= currentPrecedence) {
		game.actions.set(actionData.heroId, actionData);
	}
	// console.log("Game [" + game.id + "]: action received", actionData);
}

function actionPrecedence(actionData) {
	if (!actionData) {
		return 0;
	} else if (actionData.actionType === "move") {
		return 100;
	} else {
		return 1000;
	}
}


function leaveGame(game, socket) {
	var heroId = game.active.get(socket.id);
	if (!heroId) {
	console.log("Game [" + game.id + "]: player " + socket.id + " tried to leave but was not in the game");
		return;
	}

	game.active.delete(socket.id);
	
	socket.broadcast.to(game.id).emit("leave", { gameId: game.id, heroId });
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

	if (!game.started && game.actions.size > 0) {
		game.started = true;
		console.log("Started game " + game.id + " with " + game.numPlayers + " players");
	}

	if (game.started) {
		var data = {
			gameId: game.id,
			tick: game.tick++,
			actions: [...game.actions.values()],
		};
		game.actions.clear();

		if (data.actions.length > 0) {
			// console.log("Game [" + game.id + "]: tick #" + data.tick + ", " + data.actions.length + " actions");
		}

		io.to(game.id).emit('tick', data);
	}
}
