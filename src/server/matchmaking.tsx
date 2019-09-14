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
const OddPenalty = 0.6;

export interface RatedPlayer {
    socketId: string;
    aco: number;
}

interface SplitCandidate extends CandidateBase {
    type: "split";
    threshold: number;
    lower: RatedPlayer[];
    upper: RatedPlayer[];
}

interface TeamPlayer {
    heroId: string;
    aco: number;
}

type CandidatePlayer = RatedPlayer | TeamPlayer;

interface TeamsCandidate extends CandidateBase {
    type: "teams";
    teams: TeamPlayer[][];
}

interface NoopCandidate extends CandidateBase {
    type: "noop";
}

type Candidate =
    NoopCandidate
    | SplitCandidate
    | TeamsCandidate

interface CandidateBase {
    type: string;
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
    const candidates = generateSplitCandidates(game, [newPlayer]);
    if (candidates.length === 0) {
        return game;
    }

    const choice = chooseCandidate(candidates);
    
    const prime = choice.lower.some(p => p === newPlayer) ? choice.lower : choice.upper;
    const splitSocketIds = new Set<string>(wu(prime).map(p => p.socketId));
    const [split, remainder] = games.splitGame(game, splitSocketIds);

    logger.info(`Game [${game.id}]: split (${(choice.worstWinProbability * 100).toFixed(1)}%): ${choice.lower.map(p => p.aco.toFixed(0)).join(' ')} | ${choice.upper.map(p => p.aco.toFixed(0)).join(' ')}`);
    return split;
}

function chooseCandidate<T extends Candidate>(candidates: T[]): T {
    if (candidates.length <= 0) {
        return undefined;
    }

    const weightings = candidates.map(weightCandidate);
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

function weightCandidate(candidate: Candidate): number {
    let weight = Math.pow(candidate.worstWinProbability, ChoicePower);
    if (candidate.type === "split") {
        if (candidate.lower.length % 2 !== 0 || candidate.upper.length % 2 !== 0) {
            weight *= OddPenalty;
        }
    }
    return weight;
}

function extractSplitRatings(game: g.Game, newPlayers?: RatedPlayer[]) {
    const ratings = wu(game.active.values()).map(p => ({ aco: p.aco, socketId: p.socketId } as RatedPlayer)).toArray();
    if (newPlayers) {
        ratings.push(...newPlayers);
    }
    return _.orderBy(ratings, p => p.aco);
}

function generateSplitCandidates(game: g.Game, newPlayers?: RatedPlayer[]): SplitCandidate[] {
    const minPlayers = 2;
    const maxCandidates = 9; // If the max players is modded, don't increase search beyond this limit

    const sortedRatings = extractSplitRatings(game, newPlayers);


	let start = minPlayers;
	let end = sortedRatings.length - minPlayers;
	if (end < start) {
		return [];
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
            type: "split",
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

export function apportionPerGame(totalPlayers: number, maxPlayers: number) {
	// Round up to nearest even number
	return Math.min(maxPlayers, Math.ceil(averagePlayersPerGame(totalPlayers, maxPlayers) / 2) * 2);
}

export function minPerGame(totalPlayers: number, maxPlayers: number) {
	return Math.floor(averagePlayersPerGame(totalPlayers, maxPlayers));
}

export function averagePlayersPerGame(totalPlayers: number, maxPlayers: number) {
	const maxGames = Math.ceil(totalPlayers / maxPlayers);
	return totalPlayers / maxGames;
}

export function finalizeMatchmaking(game: g.Game) {
    const noopCandidate = generateNoopCandidate(game);
    const candidates: Candidate[] = [
        noopCandidate,
        ...generateSplitCandidates(game),
        ...generateTeamCandidates(game)
    ];

    // TODO: Remove
    candidates.forEach(candidate => {
        logger.info(`Game [${game.id}]: candidate ${formatCandidate(candidate)}`);
    });

    const choice = chooseCandidate(candidates);

    if (choice.type === "split") {
        const splitSocketIds = new Set<string>(choice.lower.map(p => p.socketId));
        games.splitGame(game, splitSocketIds);
    } else if (choice.type === "teams") {
		games.queueControlMessage(game, {
            type: m.ActionType.Teams,
            teams: choice.teams.map(team => team.map(p => p.heroId)),
        });
    }

    logger.info(`Game [${game.id}]: ${formatPercent(noopCandidate.worstWinProbability)} -> ${formatCandidate(choice)}`);
}

function formatCandidate(choice: Candidate) {
    if (choice.type === "split") {
        return `split (${formatPercent(choice.worstWinProbability)}): ${choice.lower.map(p => p.aco.toFixed(0)).join(' ')} | ${choice.upper.map(p => p.aco.toFixed(0)).join(' ')}`;
    } else if (choice.type === "teams") {
        return `teams (${formatPercent(choice.worstWinProbability)}): ${choice.teams.map(t => t.map(p => p.aco.toFixed(0)).join(' ')).join(' | ')}`;
    } else {
        return `noop (${formatPercent(choice.worstWinProbability)})`;
    }
}

function formatPercent(proportion: number) {
    return (proportion * 100).toFixed(1) + '%';
}

function generateTeamCandidates(game: g.Game): TeamsCandidate[] {
    if (!((game.bots.size === 0 || game.matchmaking.AllowBotTeams) && wu(game.active.values()).every(x => !!x.userId))) {
        // Everyone must be logged in to activate team mode
        return [];
    }

    const sortedRatings = extractTeamPlayers(game);

    const potentialNumTeams = calculatePotentialNumTeams(sortedRatings.length);
    if (potentialNumTeams.length <= 0) {
        return [];
    }

    const shuffledRatings = _.shuffle(sortedRatings);

    const candidates = new Array<TeamsCandidate>();
    candidates.push(...potentialNumTeams.map(numTeams => generateTeamCandidate(sortedRatings, numTeams)));
    candidates.push(...potentialNumTeams.map(numTeams => generateTeamCandidate(shuffledRatings, numTeams)));
    return candidates;
}

function generateNoopCandidate(game: g.Game): NoopCandidate {
    const ratings = wu(game.active.values()).map(p => p.aco).toArray();
    const diff = aco.AcoRanked.calculateDiff(
        _.min(ratings),
        _.max(ratings));
    return {
        type: "noop",
        worstWinProbability: aco.AcoRanked.estimateWinProbability(diff, statsStorage.getWinRateDistribution(m.GameCategory.PvP)),
    };
}

function generateTeamCandidate(sortedRatings: TeamPlayer[], numTeams: number): TeamsCandidate {
    const teams = new Array<TeamPlayer[]>();
    for (let i = 0; i < numTeams; ++i) {
        teams.push([]);
    }

    for (let i = 0; i < sortedRatings.length; ++i) {
        const round = Math.floor(i / numTeams);
        const offset = i % numTeams;
        const even = round % 2 === 0;

        // Assign in this repeating pattern: 0, 1, 2, 2, 1, 0, etc
        const team = even ? offset : (numTeams - offset - 1);
        teams[team].push(sortedRatings[i]);
    }

    return {
        type: "teams",
        teams,
        worstWinProbability: evaluateTeamCandidate(teams),
    };
}

function evaluateTeamCandidate(teams: TeamPlayer[][]): number {
    const averageRatings = teams.map(team => _(team).map(p => p.aco).mean());
    const diff = aco.AcoRanked.calculateDiff(
        _.min(averageRatings),
        _.max(averageRatings));
    return aco.AcoRanked.estimateWinProbability(diff, statsStorage.getWinRateDistribution(m.GameCategory.PvP));
}

function extractTeamPlayers(game: g.Game): TeamPlayer[] {
    const teamPlayers = new Array<TeamPlayer>();
    game.active.forEach(player => {
        teamPlayers.push({ heroId: player.heroId, aco: player.aco });
    });
    if (game.matchmaking.AllowBotTeams) {
        let botRating = game.matchmaking.BotRating;
        if (!_.isInteger(botRating)) {
            // Since this is moddable, ensure this doesn't crash the server
            botRating = 0;
        }

        game.bots.forEach((socketId, heroId) => {
            teamPlayers.push({ heroId, aco: botRating });
        });
    }

    return _.orderBy(teamPlayers, p => p.aco);
}

function calculatePotentialNumTeams(numPlayers: number): number[] {
    if (numPlayers >= 4) {
        const candidates = new Array<number>();
        for (let candidateTeams = 2; candidateTeams <= numPlayers / 2; ++candidateTeams) {
            if ((numPlayers % candidateTeams) === 0) {
                candidates.push(candidateTeams);
            }
        }
        return candidates;
    } else {
        return [];
    }
}