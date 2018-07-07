import * as games from './games';
import { getAuthTokenFromSocket } from './auth';
import { getStore } from './serverStore';
import { logger } from './logging';

let io: SocketIO.Server = null;

export function attachToSocket(_io: SocketIO.Server ) {
    io = _io;
    io.on('connection', onConnection);

    games.attachToEmitter(emit);
}

function emit(room: string, event: string, data: any) {
    io.to(room).emit(event, data);
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

	socket.on('join', data => games.onJoinGameMsg(socket.id, authToken, data));
	socket.on('leave', data => games.onLeaveGameMsg(socket.id, data));
	socket.on('watch', data => games.onWatchGameMsg(socket.id, data));
	socket.on('action', data => games.onActionMsg(socket.id, data));
}
