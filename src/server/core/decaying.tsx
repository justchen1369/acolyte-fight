import _ from 'lodash';
import moment from 'moment';
import * as constants from '../../game/constants';
import * as db from '../storage/db.model';
import * as dbStorage from '../storage/dbStorage';
import * as statsStorage from '../storage/statsStorage';
import * as userStorage from '../storage/userStorage';
import { Collections, Singleton } from '../storage/db.model';
import { getFirestore } from '../storage/dbStorage';
import { logger } from '../status/logging';

const AcoDecayInterval = 8 * 60 * 60;
const AcoDecayLength = constants.Placements.AcoDecayLengthDays * 24 * 60 * 60;

export function initAcoDecay(userId: string, category: string, unix: number): db.AcoDecay {
    return {
        ...acoDecayKey(userId, category, unix),
        acoDelta: 0,
        acoGamesDelta: 0,
    };
}

export function acoDecayKey(userId: string, category: string, unix: number): db.AcoDecayKey {
    return {
        userId,
        category,
        unixCeiling: acoDecayUnixCeiling(unix),
    };
}

export function acoDecayUnixCeiling(unix: number) {
    const unixCeiling = Math.ceil(unix / AcoDecayInterval) * AcoDecayInterval;
    return unixCeiling;
}

export function acoDecayKeyString(key: db.AcoDecayKey) {
    return `${key.userId}.${key.category}.${key.unixCeiling}`;
}

export async function decrementAco() {
    const firestore = getFirestore();
    const unix = moment().unix() - AcoDecayLength;
    const query = firestore.collection(Collections.AcoDecay).where('unixCeiling', '<=', unix);

    let numAffected = 0;
    await dbStorage.stream(query, async (oldDecayDoc) => {
        ++numAffected;

        await firestore.runTransaction(async (transaction) => {
            // Re-retrieve the decay so that we lock it in a transaction and don't decay twice
            const newDecayDoc = await transaction.get(firestore.collection(Collections.AcoDecay).doc(oldDecayDoc.id));
            if (!newDecayDoc.exists) {
                return;
            }

            const decay = newDecayDoc.data() as db.AcoDecay;

            const userDoc = await transaction.get(firestore.collection(Collections.User).doc(decay.userId));
            if (!userDoc.exists) {
                return;
            }
            const dbUser = userDoc.data() as db.User;

            // Calculate decay
            const rating = statsStorage.dbToUserRating(dbUser, decay.category);
            // rating.aco -= decay.acoDelta; // Don't decay the rating, just the bonus
            rating.acoGames -= decay.acoGamesDelta;

            // Save decay
            const loggedIn = userStorage.dbUserLoggedIn(dbUser);
            const dbUserRating = statsStorage.userRatingToDb(rating, loggedIn);
            const delta: Partial<db.User> = {
                ratings: { [decay.category]: dbUserRating },
            };
            transaction.update(userDoc.ref, delta);

            // Don't apply this decay again
            transaction.delete(oldDecayDoc.ref);
        });
    });

    logger.info(`Decayed ${numAffected} aco ratings`);
}