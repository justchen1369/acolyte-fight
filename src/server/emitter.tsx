import * as games from './games';
import { getAuthTokenFromSocket } from './auth';
import { getStore } from './serverStore';
import { logger } from './logging';
import * as PlayerName from '../game/playerName';
import * as m from '../game/messages.model';

export function attachToSocket(io: SocketIO.Server) {
    io.on('connection', onConnection);

    games.attachToEmitter(data => io.to(data.gameId).emit("tick", data));
}

function onConnection(socket: SocketIO.Socket) {
    const authToken = getAuthTokenFromSocket(socket);

	logger.info(`socket ${socket.id} connected - user ${authToken}`);
    ++getStore().numConnections;
    
    games.onConnect(socket.id, authToken);

	socket.on('disconnect', () => {
		--getStore().numConnections;
		logger.info("socket " + socket.id + " disconnected");

        games.onDisconnect(socket.id, authToken);
	});

	socket.on('join', (data, callback) => onJoinGameMsg(socket, authToken, data, callback));
	socket.on('leave', data => onLeaveGameMsg(socket, data));
	socket.on('watch', (data, callback) => onWatchGameMsg(socket, data, callback));
	socket.on('action', data => onActionMsg(socket, data));
}

function onJoinGameMsg(socket: SocketIO.Socket, authToken: string, data: m.JoinMsg, callback: (hero: m.HeroMsg) => void) {
	const game = games.findNewGame();
	const playerName = PlayerName.sanitizeName(data.name);
	if (game) {
		const heroId = games.joinGame(game, playerName, data.keyBindings, authToken, socket.id);

		socket.join(game.id);
		callback({ gameId: game.id, heroId, history: game.history, observer: false });
	}
}

function onLeaveGameMsg(socket: SocketIO.Socket, data: m.LeaveMsg) {
	const game = getStore().activeGames.get(data.gameId);
	if (game) {
		games.leaveGame(game, socket.id);
		socket.leave(game.id);
	}
}

function onWatchGameMsg(socket: SocketIO.Socket, data: m.WatchMsg, callback: (hero: m.HeroMsg) => void) {
	const store = getStore();
	const game = store.activeGames.get(data.gameId) || store.inactiveGames.get(data.gameId);
	const playerName = PlayerName.sanitizeName(data.name);

	if (game) {
		logger.info("Game [" + game.id + "]: " + playerName + " joined as observer");
		socket.join(game.id);
		callback({ gameId: game.id, heroId: "_observer", history: game.history, observer: true });
	} else {
		logger.info("Game [" + data.gameId + "]: unable to find game for " + playerName);
		callback(null);
	}
}

function onActionMsg(socket: SocketIO.Socket, data: m.ActionMsg) {
	const game = getStore().activeGames.get(data.gameId);
	if (game) {
		games.receiveAction(game, data, socket.id);
	}
}