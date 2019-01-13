import _ from 'lodash';
import glicko from 'glicko2';
import moment from 'moment';
import msgpack from 'msgpack-lite';
import * as ts from 'ts-trueskill';
import * as Firestore from '@google-cloud/firestore';
import * as aco from './aco';
import * as categories from './segments';
import * as constants from '../game/constants';
import * as db from './db.model';
import * as dbStorage from './dbStorage';
import * as g from './server.model';
import * as m from '../game/messages.model';
import * as mirroring from './mirroring';
import * as percentiles from './percentiles';
import * as userStorage from './userStorage';
import * as s from './server.model';
import { Collections } from './db.model';
import { getFirestore } from './dbStorage';
import { logger } from './logging';

const MaxLeaderboardLength = 100;

const Aco = new aco.Aco(10);
const AcoDecayLength = 7 * 24 * 60 * 60;
const AcoDecayInterval = 1 * 60 * 60;
const ActivityBonusPerGame = 3;
const MaxActivityGames = 100;

const TrueSkill = new ts.TrueSkill();
const GlickoMultiplier = 200 / TrueSkill.beta; // In Glicko the beta (difference required for 76% win probability) is 200

interface UpdateRatingsResult {
    glickoDeltas: RatingDeltas;
    acoDeltas: RatingDeltas;
}
interface RatingDeltas {
    [userId: string]: number;
}

interface LeaderboardCacheItem {
    leaderboardBuffer: Buffer; // m.GetLeaderboardResponse
    system: string;
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
        aco: constants.Placements.InitialAco,
        acoGames: 0,
    };
}

function initAcoDecay(userId: string, category: string, unix: number): db.AcoDecay {
    return {
        ...acoDecayKey(userId, category, unix),
        acoDelta: 0,
        acoGamesDelta: 0,
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
    if (p.acoDelta) {
        result.acoDelta = p.acoDelta;
    }

    return result;
}

function userRatingToDb(userRating: g.UserRating, loggedIn: boolean): db.UserRating {
    const dbUserRating: db.UserRating = { ...userRating };
    if (loggedIn && userRating.numGames >= constants.Placements.MinGames) {
        dbUserRating.acoExposure = calculateAcoExposure(userRating.aco, userRating.acoGames);
        dbUserRating.lowerBound = calculateGlickoLowerBound(userRating.rating, userRating.rd);
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
        acoDelta: player.acoDelta,
    };
}

function dbToUserRating(user: db.User, category: string): g.UserRating {
    const result = initialRating();
    const userRating = user && user.ratings && user.ratings[category]
    if (userRating) {
        Object.assign(result, userRating);
        if (!userRating.aco && userRating.rating && userRating.rd) {
            result.aco = calculateGlickoLowerBound(userRating.rating, userRating.rd); // Seed aco with Glicko
        }
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
            const lowerBound = calculateGlickoLowerBound(rating.rating, rating.rd);
            const acoExposure = calculateAcoExposure(rating.aco, rating.acoGames);
            ratings[category] = {
                numGames: rating.numGames,
                damagePerGame: rating.damagePerGame,
                killsPerGame: rating.killsPerGame,
                winRate: rating.winRate,
                rating: rating.rating,
                rd: rating.rd,
                lowerBound,
                aco: rating.aco,
                acoGames: rating.acoGames,
                acoExposure,
                percentile: percentiles.estimatePercentile(lowerBound, category, m.RatingSystem.Glicko),
                acoPercentile: percentiles.estimatePercentile(acoExposure, category, m.RatingSystem.Aco),
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

function acoDecayKey(userId: string, category: string, unix: number): db.AcoDecayKey {
    return {
        userId,
        category,
        unixCeiling: acoDecayUnixCeiling(unix),
    };
}

function acoDecayUnixCeiling(unix: number) {
    const unixCeiling = Math.ceil(unix / AcoDecayInterval) * AcoDecayInterval;
    return unixCeiling;
}

function acoDecayKeyString(key: db.AcoDecayKey) {
    return `${key.userId}.${key.category}.${key.unixCeiling}`;
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

function leaderboardCacheKey(category: string, system: string) {
    return `${category}.${system}`;
}

export async function getLeaderboard(category: string, system: string): Promise<Buffer> {
    const cached = leaderboardCache.get(leaderboardCacheKey(category, system));
    if (cached && moment().unix() < cached.expiry) {
        return cached.leaderboardBuffer;
    } else {
        const leaderboard = await retrieveLeaderboard(category, system);
        const leaderboardBuffer = msgpack.encode(leaderboard);
        leaderboardCache.set(category, {
            leaderboardBuffer,
            system,
            expiry: moment().add(1, 'minute').unix(),
        });
        return leaderboardBuffer;
    }
}

export async function retrieveLeaderboard(category: string, system: string): Promise<m.GetLeaderboardResponse> {
    const firestore = getFirestore();

    const field = system === m.RatingSystem.Aco ? "acoExposure" : "lowerBound";
    const query = firestore.collection('user').orderBy(`ratings.${category}.${field}`, 'desc').limit(MaxLeaderboardLength);
    
    const now = Date.now();

    const seen = new Set<string>();
    let result = new Array<m.LeaderboardPlayer>();
    while (result.length < MaxLeaderboardLength) {
        let chunk;
        if (result.length > 0) {
            const lowestPlayer = result[result.length - 1];
            const lowest = (lowestPlayer as any)[field] as number;
            chunk = query.where(`ratings.${category}.${field}`, '<=', lowest);
        } else {
            chunk = query;
        }

        let addedAny = false;
        await dbStorage.stream(chunk, doc => {
            if (seen.has(doc.id)) {
                return;
            }
            seen.add(doc.id);

            const user = doc.data() as db.User;
            if (!(user && user.accessed && user.ratings && user.ratings[category])) {
                return;
            }

            const ratings = user.ratings[category];
            if (!ratings.numGames) {
                return;
            }

            const maxAge = calculateMaxLeaderboardAgeInDays(ratings.numGames) * 24 * 60 * 60 * 1000;
            const age = now - user.accessed.toMillis();
            if (age > maxAge) {
                return;
            }

            result.push({
                userId: doc.id,
                name: user.settings && user.settings.name || doc.id,

                rating: ratings.rating,
                rd: ratings.rd,
                lowerBound: ratings.lowerBound,

                aco: ratings.aco,
                acoExposure: ratings.acoExposure,
                acoGames: ratings.acoGames,

                numGames: ratings.numGames,
                winRate: ratings.winRate,
                killsPerGame: ratings.killsPerGame,
                damagePerGame: ratings.damagePerGame,
            });
            addedAny = true;
        });

        if (!addedAny) {
            break;
        }
    }
    result = result.slice(0, MaxLeaderboardLength);

    const elapsed = Date.now() - now;
    logger.info(`Retrieved leaderboard in ${elapsed.toFixed(0)} ms, ${result.length}/${seen.size} results`);

    return { leaderboard: result };
}

function calculateMaxLeaderboardAgeInDays(numGames: number) {
    return Math.min(365, numGames / 10);
}

export async function decayGlickoLeaderboardIfNecessary(category: string): Promise<void> {
    const numDecaysPerDay = 24 / constants.Placements.RdDecayIntervalHours;
    const decayPerInterval = constants.Placements.RdDecayPerDay / numDecaysPerDay;
    const intervalMilliseconds = constants.Placements.RdDecayIntervalHours * 60 * 60 * 1000;

    const firestore = getFirestore();
    const shouldUpdate = await firestore.runTransaction(async (t) => {
        const doc = await t.get(firestore.collection('ratingDecay').doc('singleton'));
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
        await decayGlickoLeaderboard(category, decayPerInterval);
    }
}

async function decayGlickoLeaderboard(category: string, decay: number): Promise<void> {
    const start = Date.now();
    const firestore = getFirestore();

    // Find lowest rating to be on leaderboard
    const response = await retrieveLeaderboard(category, m.RatingSystem.Glicko);
    if (response.leaderboard.length === 0) {
        return;
    }
    const tailProfile = response.leaderboard[response.leaderboard.length - 1];
    const cutoff = tailProfile.lowerBound;

    // Decay all users (logged in or not) who are above the cutoff
    let numUsers = 0;
    const promises = new Array<Promise<void>>();
    const query = firestore.collection('user').orderBy(`ratings.${category}.lowerBound`, 'desc').where(`ratings.${category}.lowerBound`, '>=', cutoff);
    await dbStorage.stream(query, doc => {
        ++numUsers;
        promises.push(decayUser(doc.id, category, decay));
    });
    await Promise.all(promises);

    const elapsed = Date.now() - start;
    logger.info(`Decayed ${numUsers} by ${decay} rd in ${elapsed.toFixed(0)} ms`);
}

async function decayUser(userId: string, category: string, decay: number): Promise<void> {
    const firestore = getFirestore();
    await firestore.runTransaction(async (t) => {
        const doc = await t.get(firestore.collection('user').doc(userId));
        const user = doc.data() as db.User;
        if (!(user && user.ratings && user.ratings[category])) {
            return;
        }

        const userRating = dbToUserRating(user, category);
        userRating.rd = Math.min(constants.Placements.InitialRd, userRating.rd + decay);

        const loggedIn = userStorage.dbUserLoggedIn(user);
        const dbUserRating = userRatingToDb(userRating, loggedIn);

        await t.update(doc.ref, {
            ratings: { [category]: dbUserRating },
        });
    });
}

export async function decayAco() {
    const firestore = getFirestore();
    const unix = moment().unix() - AcoDecayLength;
    const query = firestore.collection(Collections.AcoDecay).where('unixCeiling', '<=', unix);

    let numAffected = 0;
    await dbStorage.stream(query, async (decayDoc) => {
        const decay = decayDoc.data() as db.AcoDecay;
        await firestore.runTransaction(async (transaction) => {
            const userDoc = await transaction.get(firestore.collection(Collections.User).doc(decay.userId));
            if (!userDoc.exists) {
                return;
            }
            const dbUser = userDoc.data() as db.User;

            // Calculate decay
            const rating = dbToUserRating(dbUser, decay.category);
            // rating.aco -= decay.acoDelta; // Don't decay the rating, just the bonus
            rating.acoGames -= decay.acoGamesDelta;

            // Save decay
            const loggedIn = userStorage.dbUserLoggedIn(dbUser);
            const dbUserRating = userRatingToDb(rating, loggedIn);
            const delta: Partial<db.User> = {
                ratings: { [decay.category]: dbUserRating },
            };
            transaction.update(userDoc.ref, delta);

            // Don't apply this decay again
            transaction.delete(decayDoc.ref);
        });

        ++numAffected;
    });

    logger.info(`Decayed ${numAffected} aco ratings`);
}

export async function getProfile(userId: string): Promise<m.GetProfileResponse> {
    const firestore = getFirestore();
    const doc = await firestore.collection('user').doc(userId).get();
    const profile = dbToProfile(userId, doc.data() as db.User);
    return profile;
}

async function updateRatingsIfNecessary(gameStats: m.GameStatsMsg): Promise<UpdateRatingsResult> {
    const firestore = getFirestore();

    const category = gameStats.category;
    const knownPlayers = gameStats.players.filter(p => !!p.userId);
    if (!(knownPlayers.length >= 2)) {
        // Only rank known players
        return null;
    }

    const unix = gameStats.unixTimestamp || moment().unix();

    const result = await firestore.runTransaction(async (transaction) => {
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

        // Load current decays so they can be updated later
        const decayDocs = await transaction.getAll(
            ...knownPlayers.map(p => 
                firestore.collection(Collections.AcoDecay)
                .doc(acoDecayKeyString(acoDecayKey(p.userId, category, unix))))
        );
        const initialDecays = new Map<string, db.AcoDecay>();
        for (const doc of decayDocs) {
            if (doc.exists) {
                const data = doc.data() as db.AcoDecay;
                initialDecays.set(data.userId, data);
            }
        }

        // Calculate changes
        calculateNewGlickoRatings(userRatings, knownPlayers);
        calculateNewAcoRatings(userRatings, knownPlayers);

        for (const player of knownPlayers) {
            const userRating = userRatings.get(player.userId);
            const isWinner = player.rank === constants.Placements.Rank1;
            calculateNewStats(userRating, player, isWinner);
        }

        // Perform update
        const glickoDeltas: RatingDeltas = {};
        const acoDeltas: RatingDeltas = {};
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
                transaction.set(doc.ref.collection(Collections.UserRatingHistory).doc(historyId), historyItem);
            }
        }

        // Calculate glicko deltas
        for (const player of knownPlayers) {
            const initialRating = initialRatings.get(player.userId);
            const userRating = userRatings.get(player.userId);

            glickoDeltas[player.userId] = calculateGlickoLowerBound(userRating.rating, userRating.rd) - calculateGlickoLowerBound(initialRating.rating, initialRating.rd);
        }

        // Calculate aco deltas
        for (const player of knownPlayers) {
            const initialRating = initialRatings.get(player.userId);
            const userRating = userRatings.get(player.userId);

            // Update aco decay
            const decay = initialDecays.get(player.userId) || initAcoDecay(player.userId, category, unix);

            decay.acoDelta += userRating.aco - initialRating.aco;
            decay.acoGamesDelta += userRating.acoGames - initialRating.acoGames;

            const key = acoDecayKeyString(decay);
            transaction.set(firestore.collection(Collections.AcoDecay).doc(key), decay);

            // Output delta
            const exposureDelta = calculateAcoExposure(userRating.aco, userRating.acoGames) - calculateAcoExposure(initialRating.aco, initialRating.acoGames);
            acoDeltas[player.userId] = exposureDelta;
        }

        // Don't report deltas on players who haven't placed
        for (const player of knownPlayers) {
            const initialRating = initialRatings.get(player.userId);
            if (initialRating.numGames < constants.Placements.MinGames) {
                delete glickoDeltas[player.userId];
                delete acoDeltas[player.userId];
            }
        }

        const result: UpdateRatingsResult = { glickoDeltas, acoDeltas };
        return result;
    });

    return result;
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
        const mean = finalRating.mu * GlickoMultiplier;
        const rd = finalRating.sigma * GlickoMultiplier;

        const userRating = allRatings.get(userId);
        const isWinner = i === 0;
        if (isWinner) {
            const previousLowerBound = calculateGlickoLowerBound(userRating.rating, userRating.rd);
            const newLowerBound = calculateGlickoLowerBound(mean, rd);
            if (newLowerBound < previousLowerBound) {
                // Don't let the winner lose points
                continue;
            }
        }

        userRating.rating = mean;
        userRating.rd = rd;
    }
}

function calculateNewAcoRatings(allRatings: Map<string, g.UserRating>, players: m.PlayerStatsMsg[]) {
    const deltas = players.map(_ => 0);
    let numPlayers = 0;
    for (let i = 0; i < players.length; ++i) {
        const self = players[i];
        const selfRating = allRatings.get(self.userId);
        if (!selfRating) {
            continue;
        }
        ++numPlayers;

        let delta = 0;
        for (let j = 0; j < players.length; ++j) {
            if (i == j) {
                continue;
            }

            const other = players[j];
            const otherRating = allRatings.get(other.userId);
            if (!otherRating) {
                continue;
            }

            const score = i < j ? 1 : 0; // win === 1, loss === 0
            delta += Aco.adjustment(selfRating.aco, otherRating.aco, score);
        }

        deltas[i] = delta;
    }

    for (let i = 0; i < players.length; ++i) {
        const self = players[i];
        const selfRating = allRatings.get(self.userId);
        if (!selfRating) {
            continue;
        }

        selfRating.aco += deltas[i];
        ++selfRating.acoGames;
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

function calculateGlickoLowerBound(rating: number, rd: number) {
    return rating - 2 * rd;
}

function calculateAcoExposure(aco: number, acoGames: number) {
    return aco + ActivityBonusPerGame * Math.min(MaxActivityGames, acoGames);
}

export async function saveGame(game: g.Game, gameStats: m.GameStatsMsg): Promise<m.GameStatsMsg> {
    try {
        if (gameStats && game.segment === categories.publicSegment()) { // Private games don't count towards ranking
            const updateResult = await updateRatingsIfNecessary(gameStats);
            if (updateResult) {
                applyRatingDeltas(gameStats, updateResult);
            }
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

function applyRatingDeltas(gameStats: m.GameStatsMsg, updateResult: UpdateRatingsResult) {
    for (const player of gameStats.players) {
        if (player.userId in updateResult.glickoDeltas) {
            player.ratingDelta = updateResult.glickoDeltas[player.userId];
        }
        if (player.userId in updateResult.acoDeltas) {
            player.acoDelta = updateResult.acoDeltas[player.userId];
        }
    }
}