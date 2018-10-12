import _ from 'lodash';
import crypto from 'crypto';
import glicko from 'glicko2';
import stream from 'stream';
import * as Firestore from '@google-cloud/firestore';
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

const glickoSettings: glicko.Settings = {
    tau: 0.2,
    rating: 1100,
    rd: 50,
    vol: 0.06,
};

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
    const result: m.PlayerStatsMsg = {
        userHash: p.userHash,
        name: p.name,
        damage: p.damage,
        kills: p.kills,
    };

    if (p.userId) {
        // Don't store userId in database unless it is actually set
        result.userId = p.userId;
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

async function saveUpdatedRatings(category: string, winnerId: string, loserIds: string[]) {
    const users = firestore.collection(Collections.User);
    const userIds = [winnerId, ...loserIds];

    firestore.runTransaction(async (transaction) => {
        const ratings = new glicko.Glicko2(glickoSettings);

        const docs = await transaction.getAll(...userIds.map(userId => users.doc(userId)));

        const players = new Array<glicko.Player>();
        for (const doc of docs) {
            const data = doc.data() as db.User;
            const userRatings = data && data.ratings && data.ratings[category];
            players.push(userRatings ? ratings.makePlayer(userRatings.rating, userRatings.rd) : ratings.makePlayer());
        }

        const race = ratings.makeRace([
            [players[0]],
            players.slice(1),
        ]);
        ratings.updateRatings(race);

        for (let i = 0; i < players.length; ++i) {
            const doc = docs[i];
            const player = players[i];

            const delta: Partial<db.User> = {
                ratings: {
                    [category]: {
                        rating: player.getRating(),
                        rd: player.getRd(),
                        lowerBound: player.getRating() - 2 * player.getRd(),
                    }
                },
            };
            transaction.update(doc.ref, delta);
        }
    });
}

async function updateRatings(gameStats: m.GameStatsMsg) {
    const knownPlayers = gameStats.players.filter(p => !!p.userId);
    if (knownPlayers.length <= 1) {
        // No one to rerate
        return;
    }

    let winningPlayer: m.PlayerStatsMsg = knownPlayers.find(p => p.userHash === gameStats.winner);
    if (!winningPlayer) {
        // Can't update if winner is unranked
    }

    await saveUpdatedRatings(
        gameStats.category,
        winningPlayer.userId,
        knownPlayers.map(p => p.userId).filter(userId => userId !== winningPlayer.userId)
    );
}

export async function saveGame(game: g.Game) {
    try {
        const gameStats = findStats(game);
        if (gameStats) {
            // TODO: Validate players are actually in the game
            await saveGameStats(gameStats);
            await updateRatings(gameStats);
        }
    } catch (error) {
        logger.error("Unable to save game stats:");
        logger.error(error);
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