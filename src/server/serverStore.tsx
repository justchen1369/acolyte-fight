import _ from 'lodash';
import moment from 'moment';
import * as g from './server.model';
import { logger } from './logging';

let store: g.ServerStore = {
    nextPartyId: 0,
    nextGameId: 0,
    numConnections: 0,
    scoreboards: new Map(),
    rooms: new Map<string, g.Room>(),
    parties: new Map<string, g.Party>(),
    joinableGames: new Set<string>(),
    activeGames: new Map<string, g.Game>(),
    assignments: new Map(),
    storedGameIds: new Set<string>(),
    recentTickMilliseconds: [],
};

export function getStore() {
    return store;
}