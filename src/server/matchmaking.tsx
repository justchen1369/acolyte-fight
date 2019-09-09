import * as auth from './auth';
import * as g from './server.model';
import * as statsStorage from './statsStorage';

export async function retrieveRating(userId: string, category: string, unranked: boolean): Promise<number> {
    const userRating = await retrieveUserRatingOrDefault(userId, category);
    if (unranked) {
        return userRating.acoUnranked;
    } else {
        return userRating.aco;
    }
}

async function retrieveUserRatingOrDefault(userId: string, category: string): Promise<g.UserRating> {
    if (!userId) {
        return statsStorage.initialRating();
    }

    const userRating = await statsStorage.getUserRating(userId, category);
    return userRating || statsStorage.initialRating();
}