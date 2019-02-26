import _ from 'lodash';
import glicko from 'glicko2';
import moment from 'moment';
import msgpack from 'msgpack-lite';
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

const Aco = new aco.Aco();
const AcoDecayLength = constants.Placements.AcoDecayLengthDays * 24 * 60 * 60;
const AcoDecayInterval = 1 * 60 * 60;

interface UpdateRatingsResult {
    [userId: string]: PlayerRatingUpdate;
}

interface PlayerRatingUpdate {
    isRanked: boolean;

    initialNumGames: number;

    initialAco: number;
    initialAcoGames: number;
    initialAcoExposure: number;

    acoChanges: m.AcoChangeMsg[];

    acoDelta: number;
}

interface PlayerDelta {
    userId: string;
    teamId: string;
    changes: m.AcoChangeMsg[];
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
        aco: constants.Placements.InitialAco,
        acoUnranked: constants.Placements.InitialAco,
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

function playerToDb(p: m.PlayerStatsMsg): db.PlayerStats {
    const result: db.PlayerStats = {
        userHash: p.userHash,
        teamId: p.teamId,
        name: p.name,
        damage: p.damage,
        kills: p.kills,
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

function userRatingToDb(userRating: g.UserRating, loggedIn: boolean): db.UserRating {
    const dbUserRating: db.UserRating = { ...userRating };
    if (loggedIn && userRating.numGames >= constants.Placements.MinGames) {
        dbUserRating.acoExposure = calculateAcoExposure(userRating.aco, userRating.acoGames);
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
        winners: data.stats.winners || [data.stats.winner],
        players: data.stats.players.map(dbToPlayer),
		server: data.stats.server,
    }
}

function dbToPlayer(player: db.PlayerStats): m.PlayerStatsMsg {
    return {
        userId: player.userId,
        userHash: player.userHash,
        teamId: player.teamId,
        name: player.name,
        damage: player.damage,
        kills: player.kills,
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

function dbToUserRating(user: db.User, category: string): g.UserRating {
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

function dbToProfile(userId: string, data: db.User): m.GetProfileResponse {
    if (!data) {
        return null;
    }

    const ratings: m.UserRatingLookup = {};

    if (data.ratings) {
        for (const category in data.ratings) {
            const rating = dbToUserRating(data, category);
            const acoExposure = calculateAcoExposure(rating.aco, rating.acoGames);
            ratings[category] = {
                numGames: rating.numGames,
                damagePerGame: rating.damagePerGame,
                killsPerGame: rating.killsPerGame,
                winRate: rating.winRate,
                aco: rating.aco,
                acoGames: rating.acoGames,
                acoExposure,
                acoPercentile: percentiles.estimatePercentile(acoExposure, category),
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

export async function loadAllGames(callback: (game: m.GameStatsMsg) => void) {
    const firestore = getFirestore();
    let query = firestore.collection(Collections.Game);

    await dbStorage.stream(query, gameDoc => {
        const game = dbToGameStats(gameDoc.id, gameDoc.data() as db.Game);
        callback(game);
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

function leaderboardCacheKey(category: string) {
    return `${category}`;
}

export async function getLeaderboard(category: string): Promise<Buffer> {
    const cached = leaderboardCache.get(leaderboardCacheKey(category));
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

    const query = firestore.collection('user').orderBy(`ratings.${category}.acoExposure`, 'desc').limit(MaxLeaderboardLength);
    
    const now = Date.now();

    const seen = new Set<string>();
    let result = new Array<m.LeaderboardPlayer>();
    while (result.length < MaxLeaderboardLength) {
        let chunk;
        if (result.length > 0) {
            const lowestPlayer = result[result.length - 1];
            const lowest = lowestPlayer.acoExposure;
            chunk = query.where(`ratings.${category}.acoExposure`, '<=', lowest);
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
    return Math.min(30, numGames / 10);
}

export async function decayAco() {
    const firestore = getFirestore();
    const unix = moment().unix() - AcoDecayLength;
    const query = firestore.collection(Collections.AcoDecay).where('unixCeiling', '<=', unix);

    let numAffected = 0;
    await dbStorage.stream(query, async (oldDecayDoc) => {
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
            transaction.delete(oldDecayDoc.ref);
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

async function updateRatingsIfNecessary(gameStats: m.GameStatsMsg, isRankedLookup: Map<string, boolean>): Promise<UpdateRatingsResult> {
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
        const ratingValues = new Map<string, number>();
        userRatings.forEach((userRating, userId) => {
            const isRanked = isRankedLookup.get(userId);
            ratingValues.set(userId, isRanked ? userRating.aco : userRating.acoUnranked);
        });
        const deltas = calculateNewAcoRatings(ratingValues, knownPlayers);

        // Apply changes
        const result: UpdateRatingsResult = {};
        for (const playerDelta of deltas.values()) {
            const isRanked = isRankedLookup.get(playerDelta.userId);
            const initialRating = initialRatings.get(playerDelta.userId);
            const selfRating = userRatings.get(playerDelta.userId);
            if (!selfRating) {
                continue;
            }

            if (isRanked) {
                const initialExposure = calculateAcoExposure(selfRating.aco, selfRating.acoGames);
                for (const change of playerDelta.changes) {
                    selfRating.aco += change.delta;

                    if (selfRating.acoUnranked <= selfRating.aco) {
                        // Don't allow the unranked rating to get too low because then it can be used to destroy other people's rankings
                        selfRating.acoUnranked += change.delta;
                    }
                }
                ++selfRating.acoGames;
                const finalExposure = calculateAcoExposure(selfRating.aco, selfRating.acoGames);

                result[playerDelta.userId] = {
                    isRanked,
                    initialNumGames: initialRating.numGames,
                    initialAco: initialRating.aco,
                    initialAcoGames: initialRating.acoGames,
                    initialAcoExposure: initialExposure,
                    acoChanges: playerDelta.changes,
                    acoDelta: finalExposure - initialExposure,
                };
            } else {
                for (const change of playerDelta.changes) {
                    selfRating.acoUnranked += change.delta;
                }

                result[playerDelta.userId] = {
                    isRanked,
                    initialNumGames: initialRating.numGames,
                    initialAco: initialRating.acoUnranked,
                    initialAcoGames: null,
                    initialAcoExposure: null,
                    acoChanges: [],
                    acoDelta: null,
                };
            }
        }

        // Update stats
        for (const player of knownPlayers) {
            const isRanked = isRankedLookup.get(player.userId);
            if (isRanked) {
                const userRating = userRatings.get(player.userId);
                const isWinner = player.rank === constants.Placements.Rank1;
                calculateNewStats(userRating, player, isWinner);
            }
        }

        // Increment num games
        userRatings.forEach(userRating => {
            ++userRating.numGames;
        });

        // Write update
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

        // Prepare for decay
        for (const player of knownPlayers) {
            const initialRating = initialRatings.get(player.userId);
            const userRating = userRatings.get(player.userId);

            // Update aco decay
            const decay = initialDecays.get(player.userId) || initAcoDecay(player.userId, category, unix);

            decay.acoDelta += userRating.aco - initialRating.aco;
            decay.acoGamesDelta += userRating.acoGames - initialRating.acoGames;

            if (decay.acoDelta || decay.acoGamesDelta) {
                const key = acoDecayKeyString(decay);
                transaction.set(firestore.collection(Collections.AcoDecay).doc(key), decay);
            }
        }

        return result;
    });

    return result;
}

function unixDateFromTimestamp(unixTimestamp: number): number {
    const SecondsPerDay = 86400;
    return Math.floor(unixTimestamp / SecondsPerDay) * SecondsPerDay;
}

function calculateNewAcoRatings(ratingValues: Map<string, number>, players: m.PlayerStatsMsg[]): Map<string, PlayerDelta> {
    const deltas = new Map<string, PlayerDelta>(); // user ID -> PlayerDelta

    if (players.length <= 0) {
        return deltas;
    }

    const ratedPlayers = players.filter(p => ratingValues.has(p.userId));
    if (ratedPlayers.length === 0) {
        return deltas;
    }

    const teams = _.groupBy(ratedPlayers, p => p.teamId || p.userHash);

    const numPlayersPerTeam = _.chain(teams).map(team => team.length).max().value();
    const highestRankPerTeam = _.mapValues(teams, players => _.min(players.map(p => p.rank)));
    const averageRatingPerTeam =
        _.chain(teams)
        .mapValues((players, teamId) => players.filter(p => !!p.userId).map(p => ratingValues.get(p.userId)))
        .mapValues((ratings) => calculateAverageRating(ratings))
        .value()

    const sortedPlayers = _.sortBy(ratedPlayers, p => highestRankPerTeam[p.teamId || p.userHash]);

    // Team games count for less points because you can't control them directly
    const multiplier = numPlayersPerTeam > 1 ? (1 / numPlayersPerTeam) : 1;

    for (let i = 0; i < sortedPlayers.length; ++i) {
        const self = sortedPlayers[i];
        const selfTeamId = self.teamId || self.userHash;
        const selfAco = averageRatingPerTeam[selfTeamId];

        let deltaGain: m.AcoChangeMsg = null;
        let deltaLoss: m.AcoChangeMsg = null;
        for (let j = 0; j < sortedPlayers.length; ++j) {
            if (i == j) {
                continue;
            }

            const other = sortedPlayers[j];
            const otherTeamId = other.teamId || other.userHash;
            if (selfTeamId === otherTeamId) {
                continue; // Can't beat players on same team
            }

            const otherAco = averageRatingPerTeam[otherTeamId];

            const score = i < j ? 1 : 0; // win === 1, loss === 0
            const adjustment = Aco.adjustment(selfAco, otherAco, score, multiplier);
            const change: m.AcoChangeMsg = { delta: adjustment.delta, e: adjustment.e, otherTeamId };
            if (change.delta >= 0) {
                if (!deltaGain || deltaGain.delta < change.delta) { // Largest gain
                    deltaGain = change;
                }
            } else {
                if (!deltaLoss || deltaLoss.delta > change.delta) { // Largest loss
                    deltaLoss = change;
                }
            }
        }

        const changes = new Array<m.AcoChangeMsg>();
        if (deltaGain) {
            changes.push(deltaGain);
        }
        if (deltaLoss) {
            changes.push(deltaLoss);
        }
        deltas.set(self.userId, { userId: self.userId, teamId: selfTeamId, changes });
    }
    return deltas;
}

function calculateAverageRating(ratings: number[]) {
    let product = 1;
    for (const rating of ratings) {
        product *= rating;
    }
    return Math.pow(product, 1 / ratings.length);
}

function calculateNewStats(userRating: g.UserRating, player: m.PlayerStatsMsg, isWinner: boolean) {
    const previousGames = Math.min(constants.MaxGamesToKeep, userRating.numGames);
    userRating.damagePerGame = incrementAverage(userRating.damagePerGame, previousGames, player.damage);
    userRating.killsPerGame = incrementAverage(userRating.killsPerGame, previousGames, player.kills);
    userRating.winRate = incrementAverage(userRating.winRate, previousGames, isWinner ? 1 : 0);
}

function incrementAverage(current: number, count: number, newValue: number) {
    return (current * count + newValue) / (count + 1);
}

function calculateAcoExposure(aco: number, acoGames: number) {
    // Force maximum activity bonus always (we're not using it anymore)
    return aco + constants.Placements.ActivityBonusPerGame * constants.Placements.MaxActivityGames;
}

export async function saveGame(game: g.Game, gameStats: m.GameStatsMsg): Promise<m.GameStatsMsg> {
    try {
        if (gameStats && game.segment === categories.publicSegment()) { // Private games don't count towards ranking
            const updateResult = await updateRatingsIfNecessary(gameStats, game.isRankedLookup);
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
        const update = updateResult[player.userId]; 
        if (update) {
            if (update.isRanked) {
                player.initialNumGames = update.initialNumGames;

                player.initialAco = update.initialAco;
                player.initialAcoGames = update.initialAcoGames;
                player.initialAcoExposure = update.initialAcoExposure;

                player.acoDelta = update.acoDelta;
                player.acoChanges = update.acoChanges;
            } else {
                player.initialNumGames = update.initialNumGames;
                player.initialAco = update.initialAco;
            }
        }
    }
}