import moment from 'moment';
import * as db from './db.model';
import * as dbStorage from './dbStorage';
import * as g from './server.model';
import * as m from '../game/messages.model';
import * as mirroring from './mirroring';
import { getFirestore } from './dbStorage';
import { logger } from './logging';

const CutoffMinutes = 20;

let updateListener: LeaderboardUpdatedHandler = null;

export interface LeaderboardUpdatedHandler {
	(category: string, entries: m.SessionLeaderboardEntry[]): void;
}

export function attachUpdateListener(listener: LeaderboardUpdatedHandler) {
	updateListener = listener;
}

function sendUpdate(category: string, entries: m.SessionLeaderboardEntry[]) {
    if (updateListener && entries.length > 0) {
        updateListener(category, entries);
    }
}

export async function retrieveLeaderboard(category: string): Promise<m.SessionLeaderboardEntry[]> {
    const firestore = getFirestore();
    const location = mirroring.getLocation();

    const query =
        firestore
        .collection(db.Collections.SessionLeaderboard)
        .where('region', '==', location.region)
        .where('category', '==', category)
        .orderBy(`outlasts`, 'desc');

    const leaderboard = new Array<m.SessionLeaderboardEntry>();
    await dbStorage.stream(query, doc => {
        const entry = doc.data() as db.SessionLeaderboardEntry;
        leaderboard.push(dbToSessionEntry(entry));
    });

    return leaderboard;
}

export async function incrementStats(gameStats: m.GameStatsMsg) {
    if (!gameStats.category) {
        return;
    }

    const updated = new Array<m.SessionLeaderboardEntry>();

    const location = mirroring.getLocation();
    const winners = new Set<string>(gameStats.winners);
    for (const player of gameStats.players) {
        if (!player.userHash) {
            continue;
        }

        const outlasts = gameStats.players.length - player.rank;
        const newData = await incrementPlayer(player, winners.has(player.userHash), outlasts, gameStats.category, location.region);
        const newEntry = dbToSessionEntry(newData);

        updated.push(newEntry);
    }

    sendUpdate(gameStats.category, updated);
}

async function incrementPlayer(playerStats: m.PlayerStatsMsg, winner: boolean, outlasts: number, category: string, region: string) {
    const firestore = getFirestore();

    const increment: db.SessionLeaderboardEntry = {
        userHash: playerStats.userHash || null,
        name: playerStats.name,
        category,
        region,
        userId: playerStats.userId || null,
        wins: (winner ? 1 : 0),
        kills: playerStats.kills,
        damage: playerStats.damage,
        outlasts: outlasts,
        games: 1,
        unixTimestamp: moment().unix(),
    };

    const newData = await firestore.runTransaction(async (t) => {
        const key = entryKey(playerStats.userHash, category, region);
        const doc = await t.get(firestore.collection(db.Collections.SessionLeaderboard).doc(key));
        let newData: db.SessionLeaderboardEntry = increment;
        if (doc.exists) {
            const data = doc.data() as db.SessionLeaderboardEntry;
            newData = {
                ...increment,
                wins: data.wins + increment.wins,
                kills: data.kills + increment.kills,
                damage: data.damage + increment.outlasts,
                outlasts: data.outlasts + increment.outlasts,
                games: data.games + increment.games,
            };
        }
        doc.ref.set(newData);
        return newData;
    });

    return newData;
}

function entryKey(userHash: string, category: string, region: string) {
    return `${userHash}/${category}/${region}`;
}

function dbToSessionEntry(data: db.SessionLeaderboardEntry): m.SessionLeaderboardEntry {
    return {
        userHash: data.userHash,
        userId: data.userId,
        outlasts: data.outlasts,
        games: data.games,
    };
}

export async function cleanupEntries() {
    const firestore = getFirestore();
    const cutoff = moment().subtract(CutoffMinutes, 'minutes').unix();
    const query = firestore.collection(db.Collections.SessionLeaderboard).where('unixTimestamp', '<', cutoff);

    let numDeleted = 0;
    await dbStorage.stream(query, doc => {
        ++numDeleted;
        doc.ref.delete();
    });

    if (numDeleted > 0) {
        logger.info(`Deleted ${numDeleted} sessions from database`);
    }
}