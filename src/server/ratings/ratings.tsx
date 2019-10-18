import _ from 'lodash';
import moment from 'moment';
import wu from 'wu';
import * as db from '../storage/db.model';
import * as g from '../server.model';
import * as m from '../../shared/messages.model';
import * as aco from '../core/aco';
import * as acoUpdater from './acoUpdater';
import * as categories from '../../shared/segments';
import * as constants from '../../game/constants';
import * as decaying from './decaying';
import * as statsProvider from './statsProvider';
import * as statsStorage from '../storage/statsStorage';
import * as userStorage from '../storage/userStorage';
import { Collections, Singleton } from '../storage/db.model';
import { getFirestore } from '../storage/dbStorage';
import { logger } from '../status/logging';

interface UpdateRatingsSnapshot {
    unix: number;
    category: string;

    knownPlayers: m.PlayerStatsMsg[];
    docs: FirebaseFirestore.DocumentSnapshot[];

    initialRatings: Map<string, g.UserRating>,
    userRatings: Map<string, g.UserRating>,

    loggedInUsers: Set<string>,
    isRankedLookup: Map<string, boolean>,

    initialDecays: Map<string, db.AcoDecay>,
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
        const snapshot = await readSnapshot(transaction, knownPlayers, isRankedLookup, category, unix);

        // Calculate changes
        const deltas = calculateDeltas(snapshot);

        // Apply changes
        const result: UpdateRatingsResult = applyDeltas(deltas, snapshot);
        updateStats(snapshot);
        incrementNumGames(snapshot);

        // Write update
        await writeUsers(snapshot, transaction);
        await writeDecay(snapshot, transaction);

        return result;
    });

    return result;
}

async function readSnapshot(
    transaction: FirebaseFirestore.Transaction,
    knownPlayers: m.PlayerStatsMsg[],
    isRankedLookup: Map<string, boolean>,
    category: string,
    unix: number): Promise<UpdateRatingsSnapshot> {

    const firestore = getFirestore();

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
    const initialDecays = await loadDecays(transaction, knownPlayers, category, unix);

    return {
        category,
        unix,
        knownPlayers,
        docs,
        initialRatings,
        userRatings,
        loggedInUsers,
        isRankedLookup,
        initialDecays,
    };
}

async function loadDecays(transaction: FirebaseFirestore.Transaction, knownPlayers: m.PlayerStatsMsg[], category: string, unix: number) {
    const firestore = getFirestore();

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

    return initialDecays;
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

function calculateDeltas(snapshot: UpdateRatingsSnapshot) {
    const ratingValues = new Map<string, number>();
    snapshot.userRatings.forEach((userRating, userId) => {
        const isRanked = snapshot.isRankedLookup.get(userId);
        ratingValues.set(userId, isRanked ? userRating.aco : userRating.acoUnranked);
    });
    const deltas = acoUpdater.calculateNewAcoRatings(ratingValues, snapshot.knownPlayers, snapshot.category, aco.AcoRanked);
    return deltas;
}

function applyDeltas(
    deltas: Map<string, acoUpdater.PlayerDelta>,
    snapshot: UpdateRatingsSnapshot) {

    const result: UpdateRatingsResult = {};
    for (const playerDelta of wu(deltas.values()).toArray()) {
        const isRanked = snapshot.isRankedLookup.get(playerDelta.userId);
        const initialRating = snapshot.initialRatings.get(playerDelta.userId);
        const selfRating = snapshot.userRatings.get(playerDelta.userId);

        if (selfRating) {
            result[playerDelta.userId] =
                isRanked
                ? applyRanked(playerDelta, initialRating, selfRating)
                : applyUnranked(playerDelta, initialRating, selfRating);
        }
    }
    return result;
}

function applyRanked(playerDelta: acoUpdater.PlayerDelta, initialRating: g.UserRating, selfRating: g.UserRating): PlayerRatingUpdate {
    const changes = [...playerDelta.changes];

    const initialExposure = statsStorage.calculateAcoExposure(selfRating.aco, selfRating.acoGames, selfRating.acoDeflate);

    for (const change of changes) {
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

    return {
        isRanked: true,
        initialNumGames: initialRating.numGames,
        initialAco: initialRating.aco,
        initialAcoGames: initialRating.acoGames,
        initialAcoDeflate: initialRating.acoDeflate,
        initialAcoExposure: initialExposure,
        acoChanges: changes,
        acoDelta: finalExposure - initialExposure,
    };
}

function applyUnranked(playerDelta: acoUpdater.PlayerDelta, initialRating: g.UserRating, selfRating: g.UserRating): PlayerRatingUpdate {
    for (const change of playerDelta.changes) {
        selfRating.acoUnranked += change.delta;
    }

    return {
        isRanked: false,
        initialNumGames: initialRating.numGames,
        initialAco: initialRating.acoUnranked,
        initialAcoDeflate: null,
        initialAcoGames: null,
        initialAcoExposure: null,
        acoChanges: [],
        acoDelta: null,
    };
}

function updateStats(snapshot: UpdateRatingsSnapshot) {
    for (const player of snapshot.knownPlayers) {
        const isRanked = snapshot.isRankedLookup.get(player.userId);
        if (isRanked) {
            const userRating = snapshot.userRatings.get(player.userId);
            const isWinner = player.rank === constants.Placements.Rank1;
            calculateNewStats(userRating, player, isWinner);
        }
    }
}

function incrementNumGames(snapshot: UpdateRatingsSnapshot) {
    snapshot.userRatings.forEach(userRating => {
        ++userRating.numGames;
    });
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

async function writeUsers(snapshot: UpdateRatingsSnapshot, transaction: FirebaseFirestore.Transaction) {
    for (const doc of snapshot.docs) {
        const loggedIn = snapshot.loggedInUsers.has(doc.id);
        const dbUserRating = statsStorage.userRatingToDb(snapshot.userRatings.get(doc.id), loggedIn);

        // Save rating
        const delta: Partial<db.User> = {
            ratings: { [snapshot.category]: dbUserRating },
        };
        transaction.update(doc.ref, delta);

        // Save rating to history
        if (loggedIn) {
            const unixDate = unixDateFromTimestamp(snapshot.unix);
            const historyItem: db.UserRatingHistoryItem = {
                unixDate,
                ratings: { [snapshot.category]: dbUserRating },
            };
            const historyId = moment.unix(unixDate).format("YYYY-MM-DD");
            transaction.set(doc.ref.collection(Collections.UserRatingHistory).doc(historyId), historyItem);
        }
    }
}

async function writeDecay(snapshot: UpdateRatingsSnapshot, transaction: FirebaseFirestore.Transaction) {
    const firestore = getFirestore();

    // Prepare for decay
    for (const player of snapshot.knownPlayers) {
        const initialRating = snapshot.initialRatings.get(player.userId);
        const userRating = snapshot.userRatings.get(player.userId);

        // Update aco decay
        const decay = snapshot.initialDecays.get(player.userId) || decaying.initAcoDecay(player.userId, snapshot.category, snapshot.unix);

        decay.acoDelta += userRating.aco - initialRating.aco;
        decay.acoGamesDelta += userRating.acoGames - initialRating.acoGames;

        if (decay.acoDelta || decay.acoGamesDelta) {
            const key = decaying.acoDecayKeyString(decay);
            transaction.set(firestore.collection(Collections.AcoDecay).doc(key), decay);
        }
    }
}