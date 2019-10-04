import _ from 'lodash';
import moment from 'moment';
import msgpack from 'msgpack-lite';
import wu from 'wu';
import * as constants from '../../game/constants';
import * as g from '../server.model';
import * as m from '../../shared/messages.model';
import * as s from '../server.model';
import * as leaderboards from './leaderboards';
import { logger } from '../status/logging';

interface LeaderboardCacheItem {
    leaderboardBuffer: Buffer; // m.GetLeaderboardResponse
    expiry: number; // unix timestamp
}

const leaderboardCache = new Map<string, LeaderboardCacheItem>();


function leaderboardCacheKey(category: string) {
    return `${category}`;
}

export async function getLeaderboard(category: string): Promise<Buffer> {
    const cached = leaderboardCache.get(leaderboardCacheKey(category));
    if (cached && moment().unix() < cached.expiry) {
        return cached.leaderboardBuffer;
    } else {
        const leaderboard = await leaderboards.retrieveLeaderboard(category);
        const leaderboardBuffer = msgpack.encode(leaderboard);
        leaderboardCache.set(category, {
            leaderboardBuffer,
            expiry: moment().add(constants.Placements.LeaderboardCacheMinutes, 'minute').unix(),
        });
        return leaderboardBuffer;
    }
}