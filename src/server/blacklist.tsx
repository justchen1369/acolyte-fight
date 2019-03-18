const blocked = new Set<string>();

export function isBlocked(socket: SocketIO.Socket) {
    return blocked.has(socket.id);
}

export function setBlocked(socket: SocketIO.Socket, block: boolean) {
    if (block) {
        blocked.add(socket.id);
    } else {
        blocked.delete(socket.id);
    }
}