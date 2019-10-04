import _ from 'lodash';
import moment from 'moment';
import msgpack from 'msgpack-lite';
import wu from 'wu';
import * as constants from '../../game/constants';
import * as db from '../storage/db.model';
import * as dbStorage from '../storage/dbStorage';
import * as g from '../server.model';
import * as m from '../../shared/messages.model';
import * as userStorage from '../storage/userStorage';
import * as s from '../server.model';
import { Collections, Singleton } from '../storage/db.model';
import { getFirestore } from '../storage/dbStorage';
import { logger } from '../status/logging';

export async function retrieveLeaderboard(category: string): Promise<m.GetLeaderboardResponse> {
    const firestore = getFirestore();

    const MaxLeaderboardLength = constants.Placements.MaxLeaderboardLength;
    const query = firestore.collection('user').orderBy(`ratings.${category}.acoExposure`, 'desc').limit(MaxLeaderboardLength);
    
    const now = Date.now();

    const seen = new Set<string>();
    let result = new Array<m.LeaderboardPlayer>();
    let next: number = null;
    while (result.length < MaxLeaderboardLength) {
        let chunk;
        if (next !== null) {
            chunk = query.where(`ratings.${category}.acoExposure`, '<=', next);
        } else {
            chunk = query;
        }

        let sawAny = false;
        await dbStorage.stream(chunk, doc => {
            if (seen.has(doc.id)) {
                return;
            }
            sawAny = true;
            seen.add(doc.id);

            const user = doc.data() as db.User;

            if (!(user && user.ratings && user.ratings[category])) {
                return;
            }

            const ratings = user.ratings[category];
            next = ratings.acoExposure; // Set the marker for the next iteration

            if (!(ratings.numGames && ratings.acoGames && user.accessed)) {
                // Require the player to have played a ranked game recently
                return;
            }

            const maxAge = calculateMaxLeaderboardAgeInDays(ratings.acoGames) * 24 * 60 * 60 * 1000;
            const age = now - user.accessed.toMillis();
            if (age > maxAge) {
                return;
            }

            result.push({
                userId: doc.id,
                name: user.settings && user.settings.name || doc.id,

                aco: ratings.aco,
                acoExposure: ratings.acoExposure,
                acoGames: ratings.acoGames,

                numGames: ratings.numGames,
                winRate: ratings.winRate,
                killsPerGame: ratings.killsPerGame,
                damagePerGame: ratings.damagePerGame,
            });
            sawAny = true;
        });

        if (!sawAny) {
            break;
        }
    }
    result = result.slice(0, MaxLeaderboardLength);

    const elapsed = Date.now() - now;
    logger.info(`Retrieved leaderboard in ${elapsed.toFixed(0)} ms, ${result.length}/${seen.size} results`);

    return { leaderboard: result };
}

function calculateMaxLeaderboardAgeInDays(acoGames: number) {
    return Math.min(30, acoGames);
}