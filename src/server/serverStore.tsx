import _ from 'lodash';
import moment from 'moment';
import * as g from './server.model';
import { logger } from './logging';

let store: g.ServerStore = {
    nextPartyId: 0,
    nextGameId: 0,
    numConnections: 0,
    playerCounts: {},
    rooms: new Map<string, g.Room>(),
    parties: new Map<string, g.Party>(),
    joinableGames: new Set<string>(),
    activeGames: new Map<string, g.Game>(),
    inactiveGames: new Map<string, g.Game>(),
    recentTickMilliseconds: [],
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

export function cleanupOldRooms(maxAgeUnusedHours: number) {
    const now = moment();

    const idsToCleanup = new Array<string>();
    store.rooms.forEach(room => {
        const ageInHours = moment(now).diff(room.accessed, 'hours', true);
        if (ageInHours > maxAgeUnusedHours) {
            idsToCleanup.push(room.id);
        }
    });

    if (idsToCleanup.length === 0) {
        return;
    }

    logger.info(`Cleaning up ${idsToCleanup.length} old rooms`); 
    idsToCleanup.forEach(id => {
        store.rooms.delete(id);
    });
}