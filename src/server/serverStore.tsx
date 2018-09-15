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
    storedGameIds: new Set<string>(),
    recentTickMilliseconds: [],
};

export function getStore() {
    return store;
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