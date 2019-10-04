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
import * as decaying from './decaying';
import * as statsStorage from '../storage/statsStorage';
import * as userStorage from '../storage/userStorage';
import * as winRates from './winRates';
import { Collections, Singleton } from '../storage/db.model';
import { getFirestore } from '../storage/dbStorage';
import { logger } from '../status/logging';

interface PlayerDelta {
    userId: string;
    teamId: string;
    changes: m.AcoChangeMsg[];
}

interface UpdateRatingsResult {
    [userId: string]: PlayerRatingUpdate;
}

interface PlayerRatingUpdate {
    isRanked: boolean;

    initialNumGames: number;

    initialAco: number;
    initialAcoGames: number;
    initialAcoDeflate: number;
    initialAcoExposure: number;

    acoChanges: m.AcoChangeMsg[];

    acoDelta: number;
}

export async function saveGame(game: g.Game, gameStats: m.GameStatsMsg): Promise<m.GameStatsMsg> {
    try {
        if (gameStats && game.segment === categories.publicSegment()) { // Private games don't count towards ranking
            const updateResult = await updateRatingsIfNecessary(gameStats, game.isRankedLookup);
            if (updateResult) {
                applyRatingDeltas(gameStats, updateResult);
            }
            await statsStorage.saveGameStats(gameStats);
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

            const initialRating = statsStorage.dbToUserRating(data, category);
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
                .doc(decaying.acoDecayKeyString(decaying.acoDecayKey(p.userId, category, unix))))
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
        const deltas = calculateNewAcoRatings(ratingValues, knownPlayers, category);

        // Apply changes
        const result: UpdateRatingsResult = {};
        for (const playerDelta of wu(deltas.values()).toArray()) {
            const isRanked = isRankedLookup.get(playerDelta.userId);
            const initialRating = initialRatings.get(playerDelta.userId);
            const selfRating = userRatings.get(playerDelta.userId);
            if (!selfRating) {
                continue;
            }

            if (isRanked) {
                const changes = [...playerDelta.changes];

                const initialExposure = statsStorage.calculateAcoExposure(selfRating.aco, selfRating.acoGames, selfRating.acoDeflate);

                for (const change of playerDelta.changes) {
                    selfRating.aco += change.delta;

                    if (selfRating.acoUnranked <= selfRating.aco) {
                        // Don't allow the unranked rating to get too low because then it can be used to destroy other people's rankings
                        selfRating.acoUnranked += change.delta;
                    }
                }

                if (selfRating.acoDeflate > 0) {
                    const inflate = Math.min(selfRating.acoDeflate, constants.Placements.AcoInflatePerGame);
                    selfRating.acoDeflate -= inflate;

                    changes.push({ delta: inflate });
                }

                ++selfRating.acoGames;

                const finalExposure = statsStorage.calculateAcoExposure(selfRating.aco, selfRating.acoGames, selfRating.acoDeflate);

                result[playerDelta.userId] = {
                    isRanked,
                    initialNumGames: initialRating.numGames,
                    initialAco: initialRating.aco,
                    initialAcoGames: initialRating.acoGames,
                    initialAcoDeflate: initialRating.acoDeflate,
                    initialAcoExposure: initialExposure,
                    acoChanges: changes,
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
                    initialAcoDeflate: null,
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
            const dbUserRating = statsStorage.userRatingToDb(userRatings.get(doc.id), loggedIn);

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
            const decay = initialDecays.get(player.userId) || decaying.initAcoDecay(player.userId, category, unix);

            decay.acoDelta += userRating.aco - initialRating.aco;
            decay.acoGamesDelta += userRating.acoGames - initialRating.acoGames;

            if (decay.acoDelta || decay.acoGamesDelta) {
                const key = decaying.acoDecayKeyString(decay);
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

function calculateNewAcoRatings(ratingValues: Map<string, number>, players: m.PlayerStatsMsg[], category: string): Map<string, PlayerDelta> {
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
            const diff = aco.AcoRanked.calculateDiff(selfAco, otherAco);
            const winProbability = aco.AcoRanked.estimateWinProbability(diff, winRates.getWinRateDistribution(category) || []);
            const adjustment = aco.AcoRanked.adjustment(winProbability, score, multiplier);
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
    return _.mean(ratings);
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