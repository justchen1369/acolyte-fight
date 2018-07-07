import _ from 'lodash';
import { getStore } from './serverStore';
import { TicksPerTurn, TicksPerSecond } from '../game/constants';
import * as m from '../game/messages.model';

export function addTickMilliseconds(milliseconds: number) {
    getStore().recentTickMilliseconds.push(milliseconds);
    if(getStore().recentTickMilliseconds.length >= 7200) {
        getStore().recentTickMilliseconds = getStore().recentTickMilliseconds.splice(0, 3600);
    }
}

function getLoadAverage() {
    const recentTickMilliseconds = getStore().recentTickMilliseconds;
    if (recentTickMilliseconds.length === 0) {
        return 0;
    }

    const averageMilliseconds = _.mean(recentTickMilliseconds);
    const maxMilliseconds = TicksPerTurn * 1000 / TicksPerSecond;
    const load = averageMilliseconds / maxMilliseconds;
    return load;
}

export function getServerStats(): m.ServerStats {
    const store = getStore();
	return {
        numGames: store.activeGames.size,
        numPlayers: store.numConnections,
        serverLoad: getLoadAverage(),
    };
}