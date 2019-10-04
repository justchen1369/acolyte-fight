import _ from 'lodash';
import moment from 'moment';
import wu from 'wu';
import * as constants from '../../game/constants';
import * as db from './db.model';
import * as dbStorage from './dbStorage';
import * as g from '../server.model';
import * as m from '../../shared/messages.model';
import * as s from '../server.model';
import { Collections, Singleton } from './db.model';
import { getFirestore } from './dbStorage';
import { logger } from '../status/logging';

export interface EstimatePercentile {
    (ratingLB: number, category: string): number
}

export function initialRating(): g.UserRating {
    return {
        numGames: 0,
        killsPerGame: 0,
        damagePerGame: 0,
        winRate: 0,
        aco: constants.Placements.InitialAco,
        acoUnranked: constants.Placements.InitialAco,
        acoGames: 0,
        acoDeflate: 0,
    };
}

export function gameStatsToDb(data: m.GameStatsMsg): db.Game {
	const game: db.Game = {
        unixTimestamp: data.unixTimestamp,
        userIds: data.players.map(p => p.userId).filter(x => !!x),
        partyId: data.partyId || null,
        stats: {
            category: data.category,
            lengthSeconds: data.lengthSeconds,
            winner: data.winner,
            winners: data.winners,
            players: data.players.map(playerToDb),
            server: data.server,
        }
    };

    const winningPlayer = data.players && data.players.find(p => p.userHash === data.winner);
    if (winningPlayer && winningPlayer.userId) {
        game.stats.winnerUserId = winningPlayer.userId;
    }

    return game;
}

export function playerToDb(p: m.PlayerStatsMsg): db.PlayerStats {
    const result: db.PlayerStats = {
        userHash: p.userHash,
        teamId: p.teamId,
        name: p.name,
        damage: p.damage,
        kills: p.kills,
        outlasts: p.outlasts,
        ticks: p.ticks,
        rank: p.rank,

        initialNumGames: p.initialNumGames,

        initialAco: p.initialAco,
        initialAcoExposure: p.initialAcoExposure,
        initialAcoGames: p.initialAcoGames,

        acoChanges: p.acoChanges,
        acoDelta: p.acoDelta,
    };

    if (p.userId) {
        // Don't store userId in database unless it is actually set
        result.userId = p.userId;
    }

    return _.omitBy(result, _.isUndefined) as db.PlayerStats;
}

export function userRatingToDb(userRating: g.UserRating, loggedIn: boolean): db.UserRating {
    const dbUserRating: db.UserRating = { ...userRating };
    if (loggedIn && userRating.numGames >= constants.Placements.MinGames) {
        dbUserRating.acoExposure = calculateAcoExposure(userRating.aco, userRating.acoGames, userRating.acoDeflate);
    }
    return dbUserRating;
}

export function dbToGameStats(gameId: string, data: db.Game): m.GameStatsMsg {
    return {
        gameId: gameId,
        partyId: data.partyId || null,
		category: data.stats.category,
		lengthSeconds: data.stats.lengthSeconds,
		unixTimestamp: data.unixTimestamp,
        winner: data.stats.winner,
        winners: data.stats.winners || [data.stats.winner],
        players: data.stats.players.map(dbToPlayer),
		server: data.stats.server,
    }
}

export function dbToPlayer(player: db.PlayerStats): m.PlayerStatsMsg {
    return {
        userId: player.userId,
        userHash: player.userHash,
        teamId: player.teamId,
        name: player.name,
        damage: player.damage,
        kills: player.kills,
        outlasts: player.outlasts,
        ticks: player.ticks || 0, // Might not be present in old data
        rank: player.rank || 0, // Might not be present in old data
        initialNumGames: player.initialNumGames,
        initialAco: player.initialAco,
        initialAcoGames: player.initialAcoGames,
        initialAcoExposure: player.initialAcoExposure,
        acoChanges: player.acoChanges,
        acoDelta: player.acoDelta,
    };
}

export function dbToUserRating(user: db.User, category: string): g.UserRating {
    const result = initialRating();
    const userRating = user && user.ratings && user.ratings[category]
    if (userRating) {
        Object.assign(result, userRating);
        if (userRating.aco && !userRating.acoUnranked) {
            result.acoUnranked = userRating.aco; // Seed unranked with ranked score
        }
    }
    return result;
}

export function dbToProfile(userId: string, data: db.User, estimatePercentile: EstimatePercentile): m.GetProfileResponse {
    if (!data) {
        return null;
    }

    const ratings: m.UserRatingLookup = {};

    if (data.ratings) {
        for (const category in data.ratings) {
            const rating = dbToUserRating(data, category);
            const acoExposure = calculateAcoExposure(rating.aco, rating.acoGames, rating.acoDeflate);
            ratings[category] = {
                numGames: rating.numGames,
                damagePerGame: rating.damagePerGame,
                killsPerGame: rating.killsPerGame,
                winRate: rating.winRate,
                aco: rating.aco,
                acoGames: rating.acoGames,
                acoExposure,
                acoPercentile: estimatePercentile(acoExposure, category),
            };
        }
    }

    let bindings: KeyBindings = {};
    if (data.settings && data.settings.buttons) {
        bindings = data.settings.buttons;
    }

    return {
        userId,
        name: data.settings && data.settings.name || userId,
        ratings,
        bindings,
    };
}

export async function loadGame(gameId: string) {
    const firestore = getFirestore();
    const gameDoc = await firestore.collection(Collections.Game).doc(gameId).get();
    if (gameDoc.exists) {
        const game = dbToGameStats(gameDoc.id, gameDoc.data() as db.Game);
        return game;
    } else {
        return null;
    }
}

export async function loadGamesForUser(userId: string, after: number | null, before: number | null, limit: number) {
    const firestore = getFirestore();
    let query = firestore.collection(Collections.Game).where('userIds', 'array-contains', userId).orderBy("unixTimestamp", "desc").limit(limit);
    if (after) {
        query = query.startAfter(after);
    }
    if (before) {
        query = query.endBefore(before);
    }

    const games = new Array<m.GameStatsMsg>();
    await dbStorage.stream(query, gameDoc => {
        const game = dbToGameStats(gameDoc.id, gameDoc.data() as db.Game);
        games.push(game);
    });

    return games;
}

export async function loadAllGames(category: string, callback: (game: m.GameStatsMsg) => void) {
    const firestore = getFirestore();
    let query = firestore.collection(Collections.Game);

    await dbStorage.stream(query, gameDoc => {
        const game = dbToGameStats(gameDoc.id, gameDoc.data() as db.Game);
        if (game.category === category) {
            callback(game);
        }
    });
}

export async function loadAllUserRatings(callback: (user: db.User) => void) {
    const firestore = getFirestore();
    const query = firestore.collection(db.Collections.User).select('ratings');

    await dbStorage.stream(query, doc => {
        const user = doc.data() as db.User;
        callback(user);
    });
}

export async function saveGameStats(gameStats: m.GameStatsMsg) {
    const firestore = getFirestore();
    const data = gameStatsToDb(gameStats);
    await firestore.collection(Collections.Game).doc(gameStats.gameId).set(data);
}

export async function cleanupGames(maxAgeDays: number) {
    const firestore = getFirestore();
    const cutoff = moment().subtract(maxAgeDays, 'days').unix();
    const query = firestore.collection(Collections.Game).where('unixTimestamp', '<', cutoff);

    let numDeleted = 0;
    await dbStorage.stream(query, doc => {
        ++numDeleted;
        doc.ref.delete();
    });

    if (numDeleted > 0) {
        logger.info(`Deleted ${numDeleted} games from database`);
    }
}

export async function getProfile(userId: string, estimatePercentile: EstimatePercentile): Promise<m.GetProfileResponse> {
    const firestore = getFirestore();
    const doc = await firestore.collection('user').doc(userId).get();
    const profile = dbToProfile(userId, doc.data() as db.User, estimatePercentile);
    return profile;
}

export async function getUserRating(userId: string, category: string): Promise<g.UserRating> {
    const firestore = getFirestore();
    const doc = await firestore.collection('user').doc(userId).get();
    return dbToUserRating(doc.data() as db.User, category);
}

export function calculateAcoExposure(aco: number, acoGames: number, acoDeflate: number) {
    // Force maximum activity bonus always (we're not using it anymore)
    return aco + constants.Placements.ActivityBonusPerGame * constants.Placements.MaxActivityGames - acoDeflate;
}