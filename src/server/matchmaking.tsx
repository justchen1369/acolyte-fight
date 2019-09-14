import _ from 'lodash';
import wu from 'wu';
import * as aco from './aco';
import * as g from './server.model';
import * as games from './games';
import * as m from '../shared/messages.model';
import * as segments from '../shared/segments';
import * as statsStorage from './statsStorage';
import { getStore } from './serverStore';
import { logger } from './logging';

const ChoicePower = 2;

export interface RatedPlayer {
    socketId: string;
    aco: number;
}

interface SplitCandidate {
    threshold: number;
    lower: RatedPlayer[];
    upper: RatedPlayer[];
    worstWinProbability: number;
}

export async function retrieveRating(userId: string, category: string, unranked: boolean): Promise<number> {
    const userRating = await retrieveUserRatingOrDefault(userId, category);
    if (unranked) {
        return userRating.acoUnranked;
    } else {
        return userRating.aco;
    }
}

async function retrieveUserRatingOrDefault(userId: string, category: string): Promise<g.UserRating> {
    if (!userId) {
        return statsStorage.initialRating();
    }

    const userRating = await statsStorage.getUserRating(userId, category);
    return userRating || statsStorage.initialRating();
}

export function findNewGame(version: string, room: g.Room, partyId: string | null, newPlayer: RatedPlayer): g.Game {
	const roomId = room ? room.id : null;
	const segment = segments.calculateSegment(roomId, partyId);

	const numJoining = 1;
	const openGames = findJoinableGames(segment);

	let game: g.Game = null;
	if (openGames.length > 0) {
        // Choose game with closest skill level
		game = _.minBy(openGames, game => evaluateJoinDistance(game, newPlayer));

	}

	if (game && game.active.size + numJoining > game.matchmaking.MaxPlayers) {
		// Game too full to add one more player, split it
		game = splitGameForNewPlayer(game, newPlayer);
	}

	if (game && game.active.size + numJoining > game.matchmaking.MaxPlayers) {
		// Still too big
		game = null;
	}

	if (!game) {
		game = games.initGame(version, room, partyId);
	}
	return game;
}

function evaluateJoinDistance(game: g.Game, newPlayer: RatedPlayer): number {
    return _(wu(game.active.values()).toArray()).map(p => Math.abs(newPlayer.aco - p.aco)).min();
}

function findJoinableGames(segment: string) {
	const store = getStore();

	const openGames = new Array<g.Game>();
	store.joinableGames.forEach(gameId => {
		const g = store.activeGames.get(gameId);
		if (g && g.joinable) {
			if (g.segment === segment) {
				openGames.push(g);
			}
		}
		else {
			// This entry shouldn't be in here - perhaps it was terminated before it could be removed
			store.joinableGames.delete(gameId);
		}
	});
	return openGames;
}

function splitGameForNewPlayer(game: g.Game, newPlayer: RatedPlayer): g.Game {
    const ratings = extractRatings(game);
    ratings.push(newPlayer);
    ratings.sort();

    const candidates = generateSplitCandidates(ratings);
    const choice = chooseCandidate(candidates);
    
    const prime = choice.lower.some(p => p === newPlayer) ? choice.lower : choice.upper;
    const splitSocketIds = new Set<string>(wu(prime).map(p => p.socketId));
    const [split, remainder] = games.splitGame(game, splitSocketIds);

    logger.info(`Split (${choice.threshold.toFixed(0)}): ${choice.lower.map(p => p.aco.toFixed(0)).join(' ')} | ${choice.upper.map(p => p.aco.toFixed(0)).join(' ')}`);
    return split;
}

function chooseCandidate(candidates: SplitCandidate[]): SplitCandidate {
    if (candidates.length <= 0) {
        return undefined;
    }

    const weightings = candidates.map(p => Math.pow(p.worstWinProbability, ChoicePower));
    const total = _(weightings).sum();
    const selector = total * Math.random();

    let progress = 0;
    for (let i = 0; i < weightings.length; ++i) {
        progress += weightings[i];
        if (selector < progress) {
            return candidates[i];
        }
    }

    // Should never get here
    return candidates[candidates.length - 1];
}

function extractRatings(game: g.Game) {
    return wu(game.active.values()).map(p => ({ aco: p.aco, socketId: p.socketId } as RatedPlayer)).toArray();
}

function generateSplitCandidates(sortedRatings: RatedPlayer[]): SplitCandidate[] {
    const minPlayers = 1; // TODO: Change to 2
    const maxCandidates = 9; // If the max players is modded, don't increase search beyond this limit

	let start = minPlayers;
	let end = sortedRatings.length - minPlayers;
	if (end < start) {
		return null;
	}

    // Find best split
	let maxDistance = 0;
	let bestSplit = start;
	for (let i = start; i <= end; ++i) {
		const splitDistance = sortedRatings[i].aco - sortedRatings[i-1].aco;
		if (splitDistance > maxDistance) {
			maxDistance = splitDistance;
			bestSplit = i;
		}
    }
    
    // Search around the best split
    const searchRadius = Math.floor(maxCandidates / 2);
    start = Math.max(start, bestSplit - searchRadius);
    end = Math.min(end, bestSplit + searchRadius);

    const candidates = new Array<SplitCandidate>();
	for (let i = start; i <= end; ++i) {
        const lower = sortedRatings.slice(0, i);
        const upper = sortedRatings.slice(i);

        const worstWinProbability = Math.min(
            evaluateWinProbability(lower),
            evaluateWinProbability(upper));

        candidates.push({
            threshold: sortedRatings[i].aco,
            lower,
            upper,
            worstWinProbability,
        });
    }

    return candidates;
}

function evaluateWinProbability(ratings: RatedPlayer[]) {
    if (ratings.length > 0) {
        const diff = aco.AcoRanked.calculateDiff(
            _(ratings).map(p => p.aco).min(),
            _(ratings).map(p => p.aco).max());
        return aco.AcoRanked.estimateWinProbability(diff, statsStorage.getWinRateDistribution(m.GameCategory.PvP));
    } else {
        return 0;
    }
}

export function findExistingGame(version: string, room: g.Room | null, partyId: string | null): g.Game {
	const roomId = room ? room.id : null;
	const segment = segments.calculateSegment(roomId, partyId);
	const store = getStore();

	const candidates = wu(store.activeGames.values()).filter(x => x.segment === segment && games.isGameRunning(x)).toArray();
	if (candidates.length === 0) {
		return null;
	}

	return _.maxBy(candidates, x => watchPriority(x));
}

function watchPriority(game: g.Game): number {
	if (!(game.active.size && games.isGameRunning(game))) {
		// Discourage watching finished game
		return 0;
	} else if (game.locked) {
		// Discourage watching locked games
		return game.active.size;
	} else if (game.winTick) {
		// Discourage watching a game which is not live
		return game.active.size;
	} else if (!game.joinable) {
		// Encourage watching a game in-progress
		return 1000 + game.active.size;
	} else {
		// Watch a game that is only starting
		return 100 + game.active.size;
	}
}