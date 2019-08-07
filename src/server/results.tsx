import crypto from 'crypto';
import msgpack from 'msgpack-lite';
import wu from 'wu';
import * as g from './server.model';
import * as m from '../shared/messages.model';
import * as categories from '../shared/segments';

interface HashValues {
    gameId: string;
    players: PlayerValues[];
}

interface PlayerValues {
    userId?: string;
    userHash: string;
    rank: number;
}

interface CandidateHash {
    gameStats: m.GameStatsMsg;
    hash: string;
    frequency: number;
}

export function calculateResult(game: g.Game) {
    const gameStats = findStats(game);
    if (gameStats && validateGameStats(gameStats, game)) {
        return gameStats;
    } else {
        return null;
    }
}

function findStats(game: g.Game): m.GameStatsMsg {
    const Majority = 0.51;
    const corroborateThreshold = Math.max(1, Math.ceil(game.scores.size * Majority));
    const candidates = new Map<string, CandidateHash>();
    for (const gameStats of wu(game.scores.values()).toArray()) {
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

function validateGameStats(gameStats: m.GameStatsMsg, game: g.Game) {
    const requiredCategory = calculateGameCategory(game);
    return (!requiredCategory || gameStats.category === requiredCategory)
        && gameStats.players.some(p => p.userHash === gameStats.winner)
        && gameStats.players.every(p => !p.userId || game.isRankedLookup.has(p.userId))
        && gameStats.partyId === game.partyId;
}


function hashStats(gameStats: m.GameStatsMsg): string {
    const values = extractValues(gameStats);
    return crypto.createHash('md5').update(msgpack.encode(values)).digest('hex');
} 

function extractValues(gameStats: m.GameStatsMsg): HashValues {
    return {
        gameId: gameStats.gameId,
        players: gameStats.players.map(player => ({
            userId: player.userId,
            userHash: player.userHash,
            rank: player.rank,
        })),
    };
}

function calculateGameCategory(game: g.Game) {
    if (game.segment === categories.publicSegment()) {
        return m.GameCategory.PvP;
    } else {
        return null;
    }
}