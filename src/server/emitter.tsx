import * as games from './games';
import { AuthHeader, getAuthTokenFromSocket } from './auth';
import { getStore } from './serverStore';
import { getLocation, sanitizeHostname } from './mirroring';
import { logger } from './logging';
import * as PlayerName from '../game/playerName';
import * as g from './server.model';
import * as m from '../game/messages.model';
import socketClient from 'socket.io-client';

interface RoomStats {
	numGames: number;
	numPlayers: number;
}

let upstreams = new Map<string, SocketIOClient.Socket>(); // socketId -> upstream

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
		const upstream = upstreams.get(socket.id);
		if (upstream) {
			upstream.disconnect();
			upstreams.delete(socket.id);
		}

		--getStore().numConnections;
		logger.info(`socket ${socket.id} disconnected${upstream ? " + upstream" : ""}`);

		games.onDisconnect(socket.id, authToken);
	});

	socket.on('proxy', (data, callback) => {
		const upstream = upstreams.get(socket.id);
		if (upstream) {
			logger.error(`Error: socket ${socket.id} attempted to proxy multiple times`);
			callback({ error: "Cannot connect to new server - already connected to an existing server" });
		} else {
			onProxyMsg(socket, authToken, data, callback);
		}
	});
	socket.use((packet: SocketIO.Packet, next) => {
		const upstream = upstreams.get(socket.id);
		if (upstream) {
			(upstream as any).emit(...packet);
		} else {
			next();
		}
	});

	socket.on('room', (data, callback) => onRoomMsg(socket, authToken, data, callback));
	socket.on('join', (data, callback) => onJoinGameMsg(socket, authToken, data, callback));
	socket.on('bot', data => onBotMsg(socket, data));
	socket.on('leave', data => onLeaveGameMsg(socket, data));
	socket.on('action', data => onActionMsg(socket, data));
}

function onProxyMsg(socket: SocketIO.Socket, authToken: string, data: m.ProxyRequestMsg, callback: (msg: m.ProxyResponseMsg) => void) {
	const location = getLocation();
	if (!location.server || !data.server || location.server === data.server) {
		// Already connected to the correct server
		callback({ success: true });
	} else {
		const server = sanitizeHostname(data.server);
		const upstream = socketClient(`http://${server}${location.upstreamSuffix}`, {
			forceNew: true,
			transportOptions: {
				polling: {
					extraHeaders: { [AuthHeader]: authToken }
				}
			},
		});

		let attached = false;
		upstream.on('connect', () => {
			if (!attached) {
				attached = true;
				upstreams.set(socket.id, upstream);
				callback({ success: true });
				logger.error(`Socket ${socket.id} connected to upstream ${server}`);
			}
		});
		upstream.on('connect_error', (error: any) => {
			if (!attached) {
				attached = true;
				callback({ success: false, error: `${error}` });
				logger.error(`Socket ${socket.id} could not connect to upstream ${server}: ${error}`);
			}
		});
		upstream.on('connect_timeout', () => {
			if (!attached) {
				attached = true;
				callback({ success: false, error: "Timed out connecting to upstream server" });
				logger.error(`Socket ${socket.id} could not connect to upstream ${server}: timeout`);
			}
		});
		upstream.on('tick', (data: any) => socket.emit('tick', data));
		upstream.on('disconnect', () => {
			// Only disconnect if we've actually connected before
			if (!attached) { return; }
			socket.disconnect();
		});
	}
}

function onRoomMsg(socket: SocketIO.Socket, authToken: string, data: m.JoinRoomRequest, callback: (output: m.JoinRoomResponseMsg) => void) {
	const store = getStore();
	const room = store.rooms.get(data.roomId);
	if (room) {
		callback({ success: true, roomId: room.id, mod: room.mod, allowBots: room.allowBots });
	} else {
		callback({ success: false, error: `Unable to find room ${data.roomId}` });
	}
}

function onJoinGameMsg(socket: SocketIO.Socket, authToken: string, data: m.JoinMsg, callback: (hero: m.JoinResponseMsg) => void) {
	const store = getStore();
	const playerName = PlayerName.sanitizeName(data.name);

	const roomId = data.room ? PlayerName.sanitizeName(data.room) : null;
	const room = roomId ? store.rooms.get(roomId) : null;

	let game: g.Game = null;
	if (data.gameId) {
		game = store.activeGames.get(data.gameId) || store.inactiveGames.get(data.gameId);
	}
	if (!game) {
		game = games.findNewGame(room);
	}

	if (game) {
		let heroId = null;
		if (!data.observe) {
			heroId = games.joinGame(game, playerName, data.keyBindings, data.isBot, authToken, socket.id);
		}

		const roomStats = calculateRoomStats(roomId);

		socket.join(game.id);
		callback({
			gameId: game.id,
			heroId,
			room: game.room,
			history: game.history,
			numGames: roomStats.numGames,
			numPlayers: roomStats.numPlayers,
		});

		let gameName = game.id;
		if (roomId) {
			gameName = roomId + "/" + gameName;
		}
		if (heroId) {
			logger.info(`Game [${gameName}]: player ${playerName} (${authToken}) [${socket.id}] joined, now ${game.numPlayers} players`);
		} else {
			logger.info(`Game [${gameName}]: player ${playerName} (${authToken}) [${socket.id}] joined as observer`);
		}
	} else {
		logger.info("Game [" + data.gameId + "]: unable to find game for " + playerName);
		callback(null);
	}
}

function onBotMsg(socket: SocketIO.Socket, data: m.BotMsg) {
	const game = getStore().activeGames.get(data.gameId);
	if (game && game.active.has(socket.id) && game.active.size <= 1 && game.bots.size === 0) { // Only allow adding one bot
		games.addBot(game, {});
	}
}

function onLeaveGameMsg(socket: SocketIO.Socket, data: m.LeaveMsg) {
	const game = getStore().activeGames.get(data.gameId);
	if (game) {
		games.leaveGame(game, socket.id);
		socket.leave(game.id);
	}
}

function onActionMsg(socket: SocketIO.Socket, data: m.ActionMsg) {
	const game = getStore().activeGames.get(data.gameId);
	if (game) {
		games.receiveAction(game, data, socket.id);
	}
}

function calculateRoomStats(room: string): RoomStats {
	let numGames = 0;
	let numPlayers = 0;
	getStore().activeGames.forEach(game => {
		if (game.room === room && games.isGameRunning(game)) {
			numGames += 1;
			numPlayers += game.active.size;
		}
	});
	return { numGames, numPlayers };
}