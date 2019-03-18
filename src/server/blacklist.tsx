const blocked = new Set<string>();

export function isBlocked(socketId: string) {
    return blocked.has(socketId);
}

export function block(socketId: string) {
    blocked.add(socketId);
}

export function unblock(socketId: string) {
    blocked.delete(socketId);
}