import * as g from './server.model';
import { logger } from './logging';

let store: g.ServerStore = {
    nextGameId: 0,
    activeGames: new Map<string, g.Game>(),
    inactiveGames: new Map<string, g.Game>(),
};

export function getStore() {
    return store;
}