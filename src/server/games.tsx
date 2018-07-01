import moment from 'moment';
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

export function cleanupOldInactiveGames(expiryHours: number) {
    const now = moment();

    let idsToCleanup = new Array<string>();
    store.inactiveGames.forEach(game => {
        const hoursSinceCreated = now.diff(game.created, "hours", true);
        if (hoursSinceCreated > expiryHours) {
            idsToCleanup.push(game.id);
        }
    });
    logger.info(`Cleaning up ${idsToCleanup.length} inactive games`);

    idsToCleanup.forEach(id => {
        store.inactiveGames.delete(id);
    });
}