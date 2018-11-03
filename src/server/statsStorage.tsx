import _ from 'lodash';
import glicko from 'glicko2';
import moment from 'moment';
import msgpack from 'msgpack-lite';
import * as ts from 'ts-trueskill';
import * as Firestore from '@google-cloud/firestore';
import * as categories from './categories';
import * as constants from '../game/constants';
import * as db from './db.model';
import * as dbStorage from './dbStorage';
import * as g from './server.model';
import * as m from '../game/messages.model';
import * as mirroring from './mirroring';
import * as percentiles from './percentiles';
import * as userStorage from './userStorage';
import * as s from './server.model';
import { Collections  } from './db.model';
import { getFirestore } from './dbStorage';
import { logger } from './logging';

const MaxLeaderboardLength = 100;

const TrueSkill = new ts.TrueSkill();
const GlickoMultiplier = 200 / TrueSkill.beta; // In Glicko the beta (difference required for 76% win probability) is 200

interface RatingDeltas {
    [userId: string]: number;
}

interface LeaderboardCacheItem {
    leaderboardBuffer: Buffer; // m.GetLeaderboardResponse
    expiry: number; // unix timestamp
}

const leaderboardCache = new Map<string, LeaderboardCacheItem>();

function initialRating(): g.UserRating {
    return {
        numGames: 0,
        killsPerGame: 0,
        damagePerGame: 0,
        winRate: 0,
        rating: constants.Placements.InitialRating,
        rd: constants.Placements.InitialRd,
    };
}

function gameStatsToDb(data: m.GameStatsMsg): db.Game {
	const game: db.Game = {
        unixTimestamp: data.unixTimestamp,
        userIds: data.players.map(p => p.userId).filter(x => !!x),
        partyId: data.partyId || null,
        stats: {
            category: data.category,
            lengthSeconds: data.lengthSeconds,
            winner: data.winner,
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

function playerToDb(p: m.PlayerStatsMsg): db.PlayerStats {
    const result: db.PlayerStats = {
        userHash: p.userHash,
        name: p.name,
        damage: p.damage,
        kills: p.kills,
        ticks: p.ticks,
        rank: p.rank,
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

function userRatingToDb(userRating: g.UserRating, loggedIn: boolean): db.UserRating {
    const dbUserRating: db.UserRating = { ...userRating };
    if (loggedIn && userRating.numGames >= constants.Placements.MinGames) {
        dbUserRating.lowerBound = calculateLowerBound(userRating.rating, userRating.rd);
    }
    return dbUserRating;
}

function dbToGameStats(gameId: string, data: db.Game): m.GameStatsMsg {
    return {
        gameId: gameId,
        partyId: data.partyId || null,
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
        ticks: player.ticks || 0, // Might not be present in old data
        rank: player.rank || 0, // Might not be present in old data
        ratingDelta: player.ratingDelta,
    };
}

function dbToUserRating(user: db.User, category: string): g.UserRating {
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
            const rating = dbToUserRating(data, category);
            const lowerBound = calculateLowerBound(rating.rating, rating.rd);
            ratings[category] = {
                numGames: rating.numGames,
                damagePerGame: rating.damagePerGame,
                killsPerGame: rating.killsPerGame,
                winRate: rating.winRate,
                rating: rating.rating,
                rd: rating.rd,
                lowerBound,
                percentile: percentiles.estimatePercentile(lowerBound, category),
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

export async function getLeaderboard(category: string): Promise<Buffer> {
    const cached = leaderboardCache.get(category);
    if (cached && moment().unix() < cached.expiry) {
        return cached.leaderboardBuffer;
    } else {
        const leaderboard = await retrieveLeaderboard(category);
        const leaderboardBuffer = msgpack.encode(leaderboard);
        leaderboardCache.set(category, {
            leaderboardBuffer,
            expiry: moment().add(1, 'minute').unix(),
        });
        return leaderboardBuffer;
    }
}

export async function retrieveLeaderboard(category: string): Promise<m.GetLeaderboardResponse> {
    const firestore = getFirestore();
    const query = firestore.collection('user').orderBy(`ratings.${category}.lowerBound`, 'desc').limit(MaxLeaderboardLength);

    let result = new Array<m.LeaderboardPlayer>();
    await dbStorage.stream(query, doc => {
        const user = doc.data() as db.User;
        if (user && user.ratings && user.ratings[category]) {
            const ratings = user.ratings[category];
            result.push({
                userId: doc.id,
                name: user.settings && user.settings.name || doc.id,
                rating: ratings.rating,
                rd: ratings.rd,
                lowerBound: ratings.lowerBound,
                numGames: ratings.numGames,
                winRate: ratings.winRate,
                killsPerGame: ratings.killsPerGame,
                damagePerGame: ratings.damagePerGame,
            });
        }
    });
    return { leaderboard: result };
}

export async function getProfile(userId: string): Promise<m.GetProfileResponse> {
    const firestore = getFirestore();
    const doc = await firestore.collection('user').doc(userId).get();
    const profile = dbToProfile(userId, doc.data() as db.User);
    return profile;
}

async function updateRatingsIfNecessary(gameStats: m.GameStatsMsg): Promise<RatingDeltas> {
    const firestore = getFirestore();

    const category = gameStats.category;
    const knownPlayers = gameStats.players.filter(p => !!p.userId);
    if (!(knownPlayers.length >= 2)) {
        // Only rank known players
        return {};
    }

    const ratingDeltas = await firestore.runTransaction(async (transaction) => {
        // Load initial data
        const docs = await transaction.getAll(...knownPlayers.map(p => firestore.collection(Collections.User).doc(p.userId)));

        const initialRatings = new Map<string, g.UserRating>();
        const userRatings = new Map<string, g.UserRating>();
        const loggedInUsers = new Set<string>();
        for (const doc of docs) {
            const data = doc.data() as db.User;

            const initialRating = dbToUserRating(data, category);
            initialRatings.set(doc.id, initialRating);
            userRatings.set(doc.id, {...initialRating});

            const loggedIn = userStorage.dbUserLoggedIn(data)
            if (loggedIn) {
                loggedInUsers.add(doc.id);
            }
        }

        // Calculate changes
        calculateNewGlickoRatings(userRatings, knownPlayers);

        for (const player of knownPlayers) {
            const userRating = userRatings.get(player.userId);
            const isWinner = player.rank === constants.Placements.Rank1;
            calculateNewStats(userRating, player, isWinner);
        }

        // Perform update
        const ratingDeltas: RatingDeltas = {};
        for (const doc of docs) {
            const loggedIn = loggedInUsers.has(doc.id);
            const dbUserRating = userRatingToDb(userRatings.get(doc.id), loggedIn);

            // Save rating
            const delta: Partial<db.User> = {
                ratings: { [category]: dbUserRating },
            };
            transaction.update(doc.ref, delta);

            // Save rating to history
            if (loggedIn) {
                const unixDate = unixDateFromTimestamp(gameStats.unixTimestamp);
                const historyItem: db.UserRatingHistoryItem = {
                    unixDate,
                    ratings: { [category]: dbUserRating },
                };
                const historyId = moment.unix(unixDate).format("YYYY-MM-DD");
                doc.ref.collection(Collections.UserRatingHistory).doc(historyId).set(historyItem);
            }
        }

        // Calculate rating deltas
        for (const player of knownPlayers) {
            const loggedIn = loggedInUsers.has(player.userId);
            const initialRating = initialRatings.get(player.userId);
            const userRating = userRatings.get(player.userId);
            if (initialRating.numGames >= constants.Placements.MinGames) {
                ratingDeltas[player.userId] = calculateLowerBound(userRating.rating, userRating.rd) - calculateLowerBound(initialRating.rating, initialRating.rd);
            }
        }

        return ratingDeltas;
    });

    return ratingDeltas;
}

function unixDateFromTimestamp(unixTimestamp: number): number {
    const SecondsPerDay = 86400;
    return Math.floor(unixTimestamp / SecondsPerDay) * SecondsPerDay;
}

function calculateNewGlickoRatings(allRatings: Map<string, g.UserRating>, players: m.PlayerStatsMsg[]) {
    // Create initial rankings
    const userIds = new Array<string>();
    const initialRatings = new Array<ts.Rating>();
    const ranks = new Array<number>();
    for (const player of players) {
        const rating = allRatings.get(player.userId);
        if (!rating) {
            continue;
        }

        userIds.push(player.userId);
        initialRatings.push(TrueSkill.createRating(rating.rating / GlickoMultiplier, rating.rd / GlickoMultiplier));
        ranks.push(player.rank);
    }

    // Update rankings
    const teams = initialRatings.map(r => [r]);
    const finalRatings: ts.Rating[][] = TrueSkill.rate(teams, ranks);

    // Save results
    for (let i = 0; i < userIds.length; ++i) {
        const userId = userIds[i];
        const finalRating = finalRatings[i][0];
        const userRating = allRatings.get(userId);
        userRating.rating = finalRating.mu * GlickoMultiplier;
        userRating.rd = finalRating.sigma * GlickoMultiplier;
    }
}

function calculateNewStats(userRating: g.UserRating, player: m.PlayerStatsMsg, isWinner: boolean) {
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

export async function saveGame(game: g.Game, gameStats: m.GameStatsMsg): Promise<m.GameStatsMsg> {
    try {
        if (gameStats && game.category === categories.publicCategory()) { // Private games don't count towards ranking
            const ratingDeltas = await updateRatingsIfNecessary(gameStats);
            applyRatingDeltas(gameStats, ratingDeltas);
            await saveGameStats(gameStats);
            return gameStats;
        } else {
            return null;
        }
    } catch (error) {
        logger.error("Unable to save game stats:");
        logger.error(error);
        return null;
    }
}

function applyRatingDeltas(gameStats: m.GameStatsMsg, ratingDeltas: RatingDeltas) {
    for (const player of gameStats.players) {
        if (player.userId in ratingDeltas) {
            player.ratingDelta = ratingDeltas[player.userId];
        }
    }
}