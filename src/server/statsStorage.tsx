import _ from 'lodash';
import crypto from 'crypto';
import glicko from 'glicko2';
import stream from 'stream';
import * as Firestore from '@google-cloud/firestore';
import * as constants from '../game/constants';
import * as db from './db.model';
import * as g from './server.model';
import * as m from '../game/messages.model';
import * as mirroring from './mirroring';
import * as s from './server.model';
import { Collections  } from './db.model';
import { firestore } from './dbStorage';
import { logger } from './logging';

interface CandidateHash {
    gameStats: m.GameStatsMsg;
    hash: string;
    frequency: number;
}

interface RatingDeltas {
    [userId: string]: number;
}

const glickoSettings: glicko.Settings = {
    tau: 0.2,
    rating: 1100,
    rd: 50,
    vol: 0.06,
};

function initialRating(): db.UserRating {
    return {
        numGames: 0,
        killsPerGame: 0,
        damagePerGame: 0,
        winRate: 0,
        rating: glickoSettings.rating,
        rd: glickoSettings.rd,
        lowerBound: calculateLowerBound(glickoSettings.rating, glickoSettings.rd),
    };
}

function gameStatsToDb(data: m.GameStatsMsg): db.Game {
	return {
        unixTimestamp: data.unixTimestamp,
        userIds: data.players.map(p => p.userId).filter(x => !!x),
        stats: {
            category: data.category,
            lengthSeconds: data.lengthSeconds,
            winner: data.winner,
            players: data.players.map(playerToDb),
            server: data.server,
        }
    };
}

function playerToDb(p: m.PlayerStatsMsg): db.PlayerStats {
    const result: db.PlayerStats = {
        userHash: p.userHash,
        name: p.name,
        damage: p.damage,
        kills: p.kills,
    };

    if (p.userId) {
        // Don't store userId in database unless it is actually set
        result.userId = p.userId;
    }
    if (p.ratingDelta) {
        result.ratingDelta = p.ratingDelta;
    }

    return result;
}

function dbToGameStats(gameId: string, data: db.Game): m.GameStatsMsg {
    return {
        gameId: gameId,
		category: data.stats.category,
		lengthSeconds: data.stats.lengthSeconds,
		unixTimestamp: data.unixTimestamp,
		winner: data.stats.winner,
        players: data.stats.players.map(dbToPlayer),
		server: data.stats.server,
    }
}

function dbToPlayer(player: db.PlayerStats): m.PlayerStatsMsg {
    return {
        userId: player.userId,
        userHash: player.userHash,
        name: player.name,
        damage: player.damage,
        kills: player.kills,
        ratingDelta: player.ratingDelta,
    };
}

function dbToUserRating(user: db.User, category: string): db.UserRating {
    const result = initialRating();
    const userRating = user && user.ratings && user.ratings[category]
    if (userRating) {
        Object.assign(result, userRating);
    }
    return result;
}

function dbToProfile(userId: string, data: db.User): m.GetProfileResponse {
    if (!data) {
        return null;
    }

    const ratings: m.UserRatingLookup = {};

    if (data.ratings) {
        for (const category in data.ratings) {
            const rating = data.ratings[category];
            ratings[category] = {
                numGames: rating.numGames,
                damagePerGame: rating.damagePerGame,
                killsPerGame: rating.killsPerGame,
                winRate: rating.winRate,
                rating: rating.rating,
                rd: rating.rd,
                lowerBound: rating.lowerBound,
            };
        }
    }

    return {
        userId,
        name: data.settings && data.settings.name || userId,
        ratings,
    };
}

export async function loadGamesForUser(userId: string, after: number | null, before: number | null, limit: number) {
    let query = firestore.collection(Collections.Game).where('userIds', 'array-contains', userId).orderBy("unixTimestamp", "desc");
    if (after) {
        query = query.startAfter(after);
    }
    if (before) {
        query = query.endBefore(before);
    }
    const querySnapshot = await query.limit(limit).get();

    const games = new Array<m.GameStatsMsg>();
    for (const gameDoc of querySnapshot.docs) {
        const game = dbToGameStats(gameDoc.id, await gameDoc.data() as db.Game);
        games.push(game);
    }

    return games;
}

export async function saveGameStats(gameStats: m.GameStatsMsg) {
    const data = gameStatsToDb(gameStats);
    await firestore.collection(Collections.Game).doc(gameStats.gameId).set(data);
}

export async function getLeaderboard(category: string): Promise<m.LeaderboardPlayer[]> {
    const querySnapshot = await firestore.collection('user').orderBy(`ratings.${category}.lowerBound`, 'desc').limit(100).get();

    let result = new Array<m.LeaderboardPlayer>();
    for (const doc of querySnapshot.docs) {
        const user = doc.data() as db.User;
        if (user && user.ratings && user.ratings[category]) {
            const ratings = user.ratings[category];
            result.push({
                userId: doc.id,
                name: user.settings && user.settings.name || doc.id,
                rating: ratings.rating,
                rd: ratings.rd,
                lowerBound: ratings.lowerBound,
            });
        }
    }
    return result;
}

export async function getProfile(userId: string): Promise<m.GetProfileResponse> {
    const doc = await firestore.collection('user').doc(userId).get();
    return dbToProfile(userId, doc.data() as db.User);
}

async function updateRatingsIfNecessary(gameStats: m.GameStatsMsg): Promise<RatingDeltas> {
    const category = gameStats.category;
    const knownPlayers = gameStats.players.filter(p => !!p.userId);
    const winningPlayer = knownPlayers.find(p => p.userHash === gameStats.winner);
    if (!(knownPlayers.length >= 2 && winningPlayer)) {
        // Only rank known players
        return {};
    }

    const ratingDeltas = await firestore.runTransaction(async (transaction) => {
        // Load initial data
        const docs = await transaction.getAll(...knownPlayers.map(p => firestore.collection(Collections.User).doc(p.userId)));

        const initialRatings = new Map<string, db.UserRating>();
        const userRatings = new Map<string, db.UserRating>();
        for (const doc of docs) {
            const initialRating = dbToUserRating(doc.data() as db.User, category);
            initialRatings.set(doc.id, initialRating);
            userRatings.set(doc.id, {...initialRating});
        }

        // Calculate changes
        calculateNewGlickoRatings(userRatings, winningPlayer.userId);

        for (const player of knownPlayers) {
            const userRating = userRatings.get(player.userId);
            const isWinner = winningPlayer === player;
            calculateNewStats(userRating, player, isWinner);
        }

        // Performupdate
        for (const doc of docs) {
            const userRating = userRatings.get(doc.id);

            const delta: Partial<db.User> = {
                ratings: { [category]: userRating },
            };
            transaction.update(doc.ref, delta);
        }

        // Calculate rating deltas
        const ratingDeltas: RatingDeltas = {};
        for (const player of knownPlayers) {
            const initialRating = initialRatings.get(player.userId);
            const userRating = userRatings.get(player.userId);
            ratingDeltas[player.userId] = userRating.lowerBound - initialRating.lowerBound;
        }

        return ratingDeltas;
    });

    return ratingDeltas;
}

function calculateNewGlickoRatings(allRatings: Map<string, db.UserRating>, winningUserId: string) {
    const glicko2 = new glicko.Glicko2(glickoSettings);

    // Create players
    const allPlayers = new Map<string, glicko.Player>();
    allRatings.forEach((rating, userId) => {
        allPlayers.set(userId, glicko2.makePlayer(rating.rating, rating.rd));
    });

    // Update ratings
    const race = glicko2.makeRace([
        [allPlayers.get(winningUserId)], // Winner
        [...allRatings.keys()].filter(userId => userId !== winningUserId).map(userId => allPlayers.get(userId)),
    ]);
    glicko2.updateRatings(race);

    // Save results
    allPlayers.forEach((player, userId) => {
        const userRating = allRatings.get(userId);
        userRating.rating = player.getRating();
        userRating.rd = player.getRd();
        userRating.lowerBound = calculateLowerBound(userRating.rating, userRating.rd);
    });
}

function calculateNewStats(userRating: db.UserRating, player: m.PlayerStatsMsg, isWinner: boolean) {
    const previousGames = Math.min(constants.MaxGamesToKeep, userRating.numGames);
    userRating.damagePerGame = incrementAverage(userRating.damagePerGame, previousGames, player.damage);
    userRating.killsPerGame = incrementAverage(userRating.killsPerGame, previousGames, player.kills);
    userRating.winRate = incrementAverage(userRating.winRate, previousGames, isWinner ? 1 : 0);
    ++userRating.numGames;
}

function incrementAverage(current: number, count: number, newValue: number) {
    return (current * count + newValue) / (count + 1);
}

function calculateLowerBound(rating: number, rd: number) {
    return rating - 2 * rd;
}

export async function saveGame(game: g.Game) {
    try {
        const gameStats = findStats(game);
        if (gameStats) {
            // TODO: Validate players are actually in the game

            const ratingDeltas = await updateRatingsIfNecessary(gameStats);
            applyRatingDeltas(gameStats, ratingDeltas);
            await saveGameStats(gameStats);
        }
    } catch (error) {
        logger.error("Unable to save game stats:");
        logger.error(error);
    }
}

function applyRatingDeltas(gameStats: m.GameStatsMsg, ratingDeltas: RatingDeltas) {
    for (const player of gameStats.players) {
        if (player.userId in ratingDeltas) {
            player.ratingDelta = ratingDeltas[player.userId];
        }
    }
}

function findStats(game: g.Game): m.GameStatsMsg {
    if (game.scores.size <= 1) {
        // Only store multiplayer games because people can fake stats otherwise
        return null;
    }
    const corroborateThreshold = Math.max(2, Math.ceil(game.scores.size / 2)); // Majority must agree
    const candidates = new Map<string, CandidateHash>();
    for (const gameStats of game.scores.values()) {
        const hash = hashStats(gameStats);
        if (candidates.has(hash)) {
            const candidate = candidates.get(hash);
            candidate.frequency += 1;
            if (candidate.frequency >= corroborateThreshold) {
                // This candidate has been corroborated by enough players
                return candidate.gameStats;
            }
        } else {
            candidates.set(hash, { gameStats, hash, frequency: 1 });
        }
    }
    // No candidates corroborated
    return null;
}

export function hashStats(gameStats: m.GameStatsMsg): string {
    return crypto.createHash('md5').update(JSON.stringify(gameStats)).digest('hex');
} 