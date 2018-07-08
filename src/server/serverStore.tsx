import _ from 'lodash';
import moment from 'moment';
import * as g from './server.model';
import { logger } from './logging';

let store: g.ServerStore = {
    nextGameId: 0,
    numConnections: 0,
    activeGames: new Map<string, g.Game>(),
    inactiveGames: new Map<string, g.Game>(),
    recentTickMilliseconds: [],
    region: null,
    server: null,
};

export function getStore() {
    return store;
}

export function cleanupOldInactiveGames(maxInactiveGames: number) {
    const numToCleanup = Math.max(0, store.inactiveGames.size - maxInactiveGames);
    if (numToCleanup <= 0) {
        return;
    }

    const inactiveGames = [...store.inactiveGames.values()];
    const idsToCleanup =
        _.chain(inactiveGames)
        .orderBy(x => x.created.unix())
        .map(x => x.id)
        .take(numToCleanup)
        .value();

    logger.info(`Cleaning up ${idsToCleanup.length} inactive games`); 
    idsToCleanup.forEach(id => {
        store.inactiveGames.delete(id);
    });
}