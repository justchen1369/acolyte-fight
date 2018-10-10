import _ from 'lodash';
import crypto from 'crypto';
import * as db from './db.model';
import * as g from './server.model';
import * as m from '../game/messages.model';
import * as mirroring from './mirroring';
import * as s from './server.model';
import { firestore } from './dbStorage';
import { logger } from './logging';

interface CandidateHash {
    gameStats: m.GameStatsMsg;
    hash: string;
    frequency: number;
}

export async function saveGameStats(gameId: string, gameStats: m.GameStatsMsg) {
    gameStats = untaint(gameStats);
    await firestore.collection('gameStats').doc(gameId).set(gameStats);

    for (const player of gameStats.players) {
        if (player.userId) {
            const data: db.UserGameReference = { gameId, unixTimestamp: gameStats.unixTimestamp };
            await firestore.collection('userStats').doc(player.userId).collection('games').doc(gameId).set(data);
        }
    }
}

export async function saveGame(game: g.Game) {
    try {
        const gameStats = findStats(game);
        if (gameStats) {
            await saveGameStats(game.id, gameStats);
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

 // Don't allow users to inject fields other than the ones requested
function untaint(data: m.GameStatsMsg): m.GameStatsMsg {
	const location = mirroring.getLocation();
	return {
		gameId: data.gameId,
		category: data.category,
		lengthSeconds: data.lengthSeconds,
		unixTimestamp: data.unixTimestamp,
		winner: data.winner,
		players: data.players.map(untaintPlayer),
		server: location.server,
	};
}

function untaintPlayer(p: m.PlayerStatsMsg): m.PlayerStatsMsg {
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