import moment from 'moment';
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

    games.attachToTickEmitter(data => io.to(data.gameId).emit("tick", data));
    games.attachToPartyEmitter(party => io.to(party.id).emit("party", {
		partyId: party.id,
		members: partyMembersToContract(party),
	} as m.PartyMsg));
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
	socket.on('room.create', (data, callback) => onRoomCreateMsg(socket, authToken, data, callback));
	socket.on('party', (data, callback) => onPartyMsg(socket, authToken, data, callback));
	socket.on('party.create', (data, callback) => onPartyCreateMsg(socket, authToken, data, callback));
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
		upstream.on('party', (data: any) => socket.emit('party', data));
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

function onRoomCreateMsg(socket: SocketIO.Socket, authToken: string, data: m.CreateRoomRequest, callback: (output: m.CreateRoomResponseMsg) => void) {
    if (data && data.mod && typeof data.mod === "object" && typeof data.allowBots === "boolean") {
        const room = games.initRoom(data.mod, data.allowBots);
        const result: m.CreateRoomResponse = {
			success: true,
            roomId: room.id,
            server: getLocation().server,
        };
        logger.info(`Room ${room.id} created by user ${authToken} with bots=${data.allowBots} and mod ${JSON.stringify(data.mod).substr(0, 1000)}`);
        callback(result);
    } else {
        callback({ success: false, error: `Bad request` });
    }
}

function onPartyCreateMsg(socket: SocketIO.Socket, authToken: string, data: m.CreatePartyRequest, callback: (output: m.CreatePartyResponseMsg) => void) {
	const party = games.initParty(data.roomId);
	logger.info(`Party ${party.id} created by user ${authToken}`);

	const result: m.CreatePartyResponse = {
		success: true,
		partyId: party.id,
		roomId: party.roomId,
		server: getLocation().server,
	};
	callback(result);
}

function onPartyMsg(socket: SocketIO.Socket, authToken: string, data: m.PartyRequest, callback: (output: m.PartyResponseMsg) => void) {
	if (!data.partyId) {
		callback({ success: false, error: `Party field required` });
		return;
	}

	const store = getStore();

	let party = store.parties.get(data.partyId);
	if (!party) {
		logger.info(`Party ${data.partyId} not found for user ${authToken}`);
		callback({ success: false, error: `Party ${data.partyId} not found` });
		return;
	}

	if (data.playerName) {
		const joining = !party.active.has(socket.id);
		if (joining) {
			socket.join(party.id);
		}
		games.updatePartyMember(party, socket.id, authToken, data.playerName, data.ready);
	} else {
		games.removePartyMember(party, socket.id);
		socket.leave(party.id);
	}

	const result: m.PartyResponse = {
		success: true,
		partyId: party.id,
		members: partyMembersToContract(party),
		roomId: party.roomId,
		server: getLocation().server,
	};
	callback(result);
}

function onJoinGameMsg(socket: SocketIO.Socket, authToken: string, data: m.JoinMsg, callback: (hero: m.JoinResponseMsg) => void) {
	const store = getStore();
	const playerName = PlayerName.sanitizeName(data.name);

	const roomId = data.room;
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
			room: game.roomId,
			mod: game.mod,
			allowBots: game.allowBots,
			history: game.history,
			numGames: roomStats.numGames,
			numPlayers: roomStats.numPlayers,
		});

		if (heroId) {
			const botLog = data.isBot ? " (bot)" : "";
			logger.info(`Game [${game.id}]: player ${playerName}${botLog} (${authToken}) [${socket.id}] joined, now ${game.numPlayers} players`);
		} else {
			logger.info(`Game [${game.id}]: player ${playerName} (${authToken}) [${socket.id}] joined as observer`);
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
		logger.info(`Game [${game.id}]: playing vs AI`);
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
		if (game.roomId === room && games.isGameRunning(game)) {
			numGames += 1;
			numPlayers += game.active.size;
		}
	});
	return { numGames, numPlayers };
}

function partyMembersToContract(party: g.Party) {
	let members = new Array<m.PartyMemberMsg>();
	party.active.forEach(member => {
		members.push({
			socketId: member.socketId,
			name: member.name,
			ready: member.ready,
		});
	});
	return members;
}