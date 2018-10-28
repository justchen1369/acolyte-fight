import crypto from 'crypto';
import msgpack from 'msgpack-lite';
import * as g from './server.model';
import * as m from '../game/messages.model';
import * as categories from './categories';

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
    if (game.scores.size <= 1) { // Only store multiplayer games because people can fake stats otherwise
        return null;
    }


    const corroborateThreshold = game.scores.size; // Unaninmous agreement
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

function validateGameStats(gameStats: m.GameStatsMsg, game: g.Game) {
    const requiredCategory = calculateGameCategory(game);
    return (!requiredCategory || gameStats.category === requiredCategory)
        && gameStats.players.some(p => p.userHash === gameStats.winner)
        && gameStats.players.every(p => !p.userId || game.userIds.has(p.userId))
        && gameStats.partyId === game.partyId;
}


function hashStats(gameStats: m.GameStatsMsg): string {
    return crypto.createHash('md5').update(msgpack.encode(gameStats)).digest('hex');
} 

function calculateGameCategory(game: g.Game) {
    if (game.category === categories.publicCategory()) {
        return m.GameCategory.PvP;
    } else if (game.category === categories.publicCategory(true)) {
        return m.GameCategory.AIvAI;
    } else {
        return null;
    }
}