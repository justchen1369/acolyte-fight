import _ from 'lodash';
import wu from 'wu';
import * as auth from './auth';
import * as g from './server.model';
import * as games from './games';
import * as segments from '../shared/segments';
import * as statsStorage from './statsStorage';
import { getStore } from './serverStore';
import { logger } from './logging';

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

export function findNewGame(version: string, room: g.Room, partyId: string | null, newAco: number): g.Game {
	const roomId = room ? room.id : null;
	const segment = segments.calculateSegment(roomId, partyId);

	const numJoining = 1;
	const openGames = findJoinableGames(segment);

	let game: g.Game = null;
	if (openGames.length > 0) {
		// TODO: Choose game with closest skill level
		game = _.minBy(openGames, game => game.active.size);

	}

	if (game && game.active.size + numJoining > game.matchmaking.MaxPlayers) {
		// Game too full to add one more player, split it
		game = autoSplitGame(game, newAco);
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

function autoSplitGame(game: g.Game, newAco: number): g.Game {
	const minPlayers = 1; // TODO: Change to 2

	const ratings = wu(game.active.values()).map(p => p.aco).toArray();
	ratings.push(newAco);
	ratings.sort();

	const threshold = calculateSplitThreshold(ratings, minPlayers);
	if (threshold === null) {
		// Cannot split
		return game;
	}

	const primeIsBelow = newAco < threshold;

	logger.info(formatSplit(ratings, threshold));

	const primeSocketIds = new Set<string>();
	game.active.forEach(player => {
		const playerIsBelow = player.aco < threshold;
		const isPrime = playerIsBelow == primeIsBelow;
		if (isPrime) {
			primeSocketIds.add(player.socketId);
		}
	});

	return games.splitGame(game, primeSocketIds);
}

function formatSplit(ratings: number[], threshold: number) {
	let result = `Split (${threshold.toFixed(0)}): `;
	let reachedThreshold = false;
	for (let i = 0; i < ratings.length; ++i) {
		const rating = ratings[i];
		if (i > 0) {
			result += ' ';
		}
		if (!reachedThreshold && rating >= threshold) {
			reachedThreshold = true;
			result += '| ';
		}
		result += rating.toFixed(0);
	}
	return result;
}

function calculateSplitThreshold(sortedRatings: number[], minPlayers: number) {
	minPlayers = Math.max(1, minPlayers);

	const start = minPlayers;
	const end = sortedRatings.length - minPlayers;
	if (end < start) {
		return null;
	}

	let maxDistance = 0;
	let bestSplit = start;
	for (let i = start; i <= end; ++i) {
		const splitDistance = sortedRatings[i] - sortedRatings[i-1];
		if (splitDistance > maxDistance) {
			maxDistance = splitDistance;
			bestSplit = i;
		}
	}

	const threshold = sortedRatings[bestSplit];
	return threshold;
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