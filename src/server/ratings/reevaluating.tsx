import _ from 'lodash';
import moment from 'moment';
import wu from 'wu';
import * as db from '../storage/db.model';
import * as g from '../server.model';
import * as m from '../../shared/messages.model';
import * as aco from '../core/aco';
import * as categories from '../../shared/segments';
import * as constants from '../../game/constants';
import * as dbStorage from '../storage/dbStorage';
import * as statsStorage from '../storage/statsStorage';
import * as userStorage from '../storage/userStorage';
import { Collections, Singleton } from '../storage/db.model';
import { getFirestore } from '../storage/dbStorage';
import { logger } from '../status/logging';

export async function reevaluteAco() {
    const firestore = getFirestore();
    const category = m.GameCategory.PvP;
    const query = firestore.collection(Collections.User);

    let numAffected = 0;
    const userIds = new Array<string>();
    await dbStorage.stream(query, async (doc) => {
        userIds.push(doc.id);
    });

    for (const userId of userIds) {
        await firestore.runTransaction(async (transaction) => {
            // Re-retrieve the user so that we lock it in a transaction
            const userDoc = await transaction.get(firestore.collection(Collections.User).doc(userId));
            if (!userDoc.exists) {
                return;
            }
            const dbUser = userDoc.data() as db.User;

            // Retrieve rating
            const rating = statsStorage.dbToUserRating(dbUser, category);

            // Re-save rating
            const loggedIn = userStorage.dbUserLoggedIn(dbUser);
            const dbUserRating = statsStorage.userRatingToDb(rating, loggedIn);
            const delta: Partial<db.User> = {
                ratings: { [category]: dbUserRating },
            };
            transaction.update(userDoc.ref, delta);
        });

        ++numAffected;
        if (numAffected % 100 === 0) {
            logger.info(`Re-evaluated ${numAffected} aco ratings`);
        }
    }

    logger.info(`Completed re-evaluation of ${numAffected} aco ratings`);
    return numAffected;
}