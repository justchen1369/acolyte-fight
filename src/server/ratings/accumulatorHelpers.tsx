import _ from 'lodash';
import * as categories from '../../shared/segments';
import * as constants from '../../game/constants';
import * as db from '../storage/db.model';
import * as g from '../server.model';
import * as m from '../../shared/messages.model';
import * as s from '../server.model';
import { FixedIntegerArray } from '../utils/fixedIntegerArray';
import { logger } from '../status/logging';

export function getUserRating(user: db.User, category: string) {
    if (!(user && user.ratings && user.ratings[category])) {
        return undefined;
    }

    const userRating = user.ratings[category];
    if (userRating.numGames < constants.Placements.MinGames) {
        return undefined;
    }

    if (!userRating.aco) {
        return undefined;
    }

    return userRating;
}

export function acceptGame(game: m.GameStatsMsg, category: string) {
    if (game.category !== category) {
        return false;
    }

    if (game.partyId) {
        return false; // Ignore private games
    }

    if (game.winners && game.winners.length > 1) {
        return false; // Ignore team games
    }

    return true;
}