import _ from 'lodash';
import moment from 'moment';
import msgpack from 'msgpack-lite';
import wu from 'wu';
import * as Firestore from '@google-cloud/firestore';
import * as constants from '../../game/constants';
import * as db from '../storage/db.model';
import * as dbStorage from '../storage/dbStorage';
import * as g from '../server.model';
import * as m from '../../shared/messages.model';
import * as leaderboards from './leaderboards';
import * as statsStorage from '../storage/statsStorage';
import * as userStorage from '../storage/userStorage';
import * as s from '../server.model';
import { Collections, Singleton } from '../storage/db.model';
import { getFirestore } from '../storage/dbStorage';
import { logger } from '../status/logging';


export async function deflateAcoIfNecessary(category: string) {
    const numDecaysPerDay = 24 / constants.Placements.AcoDeflateIntervalHours;
    const decayPerInterval = constants.Placements.AcoDeflatePerDay / numDecaysPerDay;
    const intervalMilliseconds = constants.Placements.AcoDeflateIntervalHours * 60 * 60 * 1000;

    const firestore = getFirestore();
    const shouldUpdate = await firestore.runTransaction(async (t) => {
        const doc = await t.get(firestore.collection(Collections.RatingDecay).doc(Singleton));
        const data = doc.data() as db.RatingDecaySingleton;
        if (!data || Date.now() >= data.updated.toMillis() + intervalMilliseconds) {
            const newData: db.RatingDecaySingleton = {
                updated: Firestore.FieldValue.serverTimestamp() as any,
            };
            t.set(doc.ref, newData);
            return true;
        } else {
            return false;
        }
    });

    if (shouldUpdate) {
        await deflateAco(category, decayPerInterval);
    }
}

async function deflateAco(category: string, decayPerInterval: number) {
    const firestore = getFirestore();

    let numAffected = 0;
    const leaderboardResponse = await leaderboards.retrieveLeaderboard(category);
    for (const player of leaderboardResponse.leaderboard) {
        ++numAffected;

        await firestore.runTransaction(async (transaction) => {
            // Re-retrieve the user so that we lock it in a transaction
            const userDoc = await transaction.get(firestore.collection(Collections.User).doc(player.userId));
            if (!userDoc.exists) {
                return;
            }
            const dbUser = userDoc.data() as db.User;

            // Retrieve rating
            const rating = statsStorage.dbToUserRating(dbUser, category);
            rating.acoDeflate = Math.min(constants.Placements.AcoMaxDeflate, rating.acoDeflate + decayPerInterval);

            // Re-save rating
            const loggedIn = userStorage.dbUserLoggedIn(dbUser);
            const dbUserRating = statsStorage.userRatingToDb(rating, loggedIn);
            const delta: Partial<db.User> = {
                ratings: { [category]: dbUserRating },
            };
            transaction.update(userDoc.ref, delta);
        });
    }

    logger.info(`Deflated ${numAffected} aco ratings`);
}