import _ from 'lodash';
import wu from 'wu';
import * as aco from './aco';
import * as g from '../server.model';
import * as games from './games';
import * as m from '../../shared/messages.model';
import * as percentilesProvider from '../ratings/percentilesProvider';
import * as segments from '../../shared/segments';
import * as statsStorage from '../storage/statsStorage';
import * as winRateProvider from '../ratings/winRateProvider';
import { getStore } from '../serverStore';
import { logger } from '../status/logging';

export interface SocketTeam {
    socketId: string;
    team?: number;
}

export interface RatedPlayer {
    socketId: string;
    aco: number;
}

interface SplitCandidate extends CandidateBase {
    type: "split";
    threshold: number;
    splits: RatedPlayer[][];
}

interface TeamPlayer {
    heroId: string;
    aco: number;
}

interface TeamsCandidate extends CandidateBase {
    type: "teams";
    teams: TeamPlayer[][];
}

interface NoopCandidate extends CandidateBase {
    type: "noop";
    all: RatedPlayer[];
}

type Candidate =
    NoopCandidate
    | SplitCandidate
    | TeamsCandidate

interface CandidateBase {
    type: string;
    avgWinProbability: number;
}

export async function retrieveRating(userId: string, numGames: number, category: string, unranked: boolean): Promise<number> {
    if (userId) {
        const userRating = await retrieveUserRatingOrDefault(userId, category);
        if (unranked) {
            return userRating.acoUnranked;
        } else {
            return userRating.aco;
        }
    } else {
        return percentilesProvider.estimateAcoFromNumGames(category, numGames);
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
		} else {
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

    const choice = chooseCandidate(candidates, game.matchmaking);
    
    const splitSocketIds = choice.splits.map(s => s.map(p => p.socketId));
    const forks = games.splitGame(game, splitSocketIds);
    games.emitForks(forks);

    logger.info(`Game [${game.id}]: ${formatCandidate(choice)}`);

    const index = choice.splits.findIndex(split => split.some(player => player === newPlayer));
    return forks[index];
}

function chooseCandidate<T extends Candidate>(candidates: T[], matchmaking: MatchmakingSettings): T {
    if (candidates.length <= 0) {
        return undefined;
    }

    const weightings = candidates.map(candidate => weightCandidate(candidate, matchmaking));
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

function weightCandidate(candidate: Candidate, matchmaking: MatchmakingSettings): number {
    let weight = Math.pow(candidate.avgWinProbability, matchmaking.RatingPower);

    let numOdd = 0;
    if (candidate.type === "noop") {
        numOdd = isOdd(candidate.all.length) ? 1 : 0;
    } else if (candidate.type === "split") {
        numOdd = candidate.splits.filter(s => isOdd(s.length)).length;
    } else if (candidate.type === "teams") {
        numOdd = isOdd(_(candidate.teams).map(t => t.length).sum()) ? 1 : 0;
    }
    weight *= Math.pow(matchmaking.OddPenalty, numOdd);

    return weight;
}

function isOdd(value: number) {
    return value % 2 !== 0;
}

function extractSplitRatings(game: g.Game, newPlayers?: RatedPlayer[]) {
    const ratings = wu(game.active.values()).map(p => ({ aco: p.aco, socketId: p.socketId } as RatedPlayer)).toArray();
    if (newPlayers) {
        ratings.push(...newPlayers);
    }
    return _.orderBy(ratings, p => p.aco);
}

function generateSplitCandidates(game: g.Game, newPlayers?: RatedPlayer[]): SplitCandidate[] {
    const ratings = extractSplitRatings(game, newPlayers);
    return generateSubSplitCandidates([ratings]);
}

function generateSubSplitCandidates(partitions: RatedPlayer[][]): SplitCandidate[] {
    const minPlayers = 2;
    const maxCandidates = 5; // If the max players is modded, don't increase search beyond this limit

    const candidates = new Array<SplitCandidate>();

    for (let partition = 0; partition < partitions.length; ++partition) {
        const sortedRatings = _.orderBy(partitions[partition], p => p.aco);

        let start = minPlayers;
        let end = sortedRatings.length - minPlayers;
        if (end < start) {
            continue;
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

        const otherPartitions = [...partitions];
        otherPartitions.splice(partition, 1);

        for (let i = start; i <= end; ++i) {
            const splits = [
                ...otherPartitions,
                sortedRatings.slice(0, i),
                sortedRatings.slice(i),
            ];

            let total = 0;
            let count = 0;
            for (let j = 0; j < splits.length; ++j) {
                const split = splits[j];
                const winProbability = evaluateWinProbability(split.map(p => p.aco));
                total += split.length * winProbability;
                count += split.length;
            }
            const avgWinProbability = count > 0 ? total / count : 0;

            candidates.push({
                type: "split",
                threshold: sortedRatings[i].aco,
                splits,
                avgWinProbability,
            });
        }

    }
    return candidates;
}

function evaluateWinProbability(acoList: number[]) {
    if (acoList.length >= 2) {
        const sorted = _.sortBy(acoList, x => -x);

        const best = sorted[0];
        let total = 0;
        let count = 0;
        for (let i = 1; i < sorted.length; ++i) { // Compare everyone else against the best
            const diff = aco.AcoRanked.calculateDiff(sorted[i], best);
            const winProbability = aco.AcoRanked.estimateWinProbability(diff, winRateProvider.getWinRateDistribution(m.GameCategory.PvP));
            total += winProbability;
            count++;
        }

        const avgWinProbability = total / count;
        return avgWinProbability;
    } else {
        // Single player - bound to win
        return 1;
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
	return Math.min(totalPlayers, Math.min(maxPlayers, Math.ceil(averagePlayersPerGame(totalPlayers, maxPlayers) / 2) * 2));
}

export function minPerGame(totalPlayers: number, maxPlayers: number) {
	return Math.floor(averagePlayersPerGame(totalPlayers, maxPlayers));
}

export function averagePlayersPerGame(totalPlayers: number, maxPlayers: number) {
	const maxGames = Math.ceil(totalPlayers / maxPlayers);
	return totalPlayers / maxGames;
}

export function forceTeams(game: g.Game, socketTeams: SocketTeam[]) {
    if (game.matched) {
        return;
    }
    game.matched = true; // Don't allow normal matchmaking to run

    const [withTeams, withoutTeams] = _.partition(socketTeams, x => !!x.team);
    if (withTeams.length === 0) {
        // Nothing to do
        return;
    }

    const teams =
        _(withTeams)
        .groupBy(p => p.team)
        .map(group => findTeam(game, group))
        .value();

    withoutTeams.forEach(socketTeam => {
        teams.push(findTeam(game, [socketTeam]));
    });

    games.queueControlMessage(game, {
        type: m.ActionType.Teams,
        teams,
    });
}

function findTeam(game: g.Game, socketTeams: SocketTeam[]) {
    return socketTeams.map(socketTeam => {
        const player = game.active.get(socketTeam.socketId);
        return player && player.heroId;
    }).filter(x => !!x);
}

export function finalizeMatchupIfNecessary(game: g.Game) {
    if (game.matched) {
        return;
    }

    if (game.joinable || game.tick < game.closeTick) {
        return;
    }

    game.matched = true;

    finalizeMatchmaking(game);
}

function finalizeMatchmaking(initial: g.Game) {
    if (initial.locked) {
        // Private game, don't do any matchmaking
        return;
    }

    const queue = [initial];
    const allForks = new Array<g.Game>();
    while (queue.length > 0) {
        const game = queue.shift();

        const noopCandidate = generateNoopCandidate(game);
        let candidates: Candidate[] = [
            noopCandidate,
            ...generateSplitCandidates(game),
            ...generateTeamCandidates(game)
        ];

        const choice = chooseCandidate(candidates, initial.matchmaking);

        if (choice.type === "split") {
            const splitSocketIds = choice.splits.map(s => s.map(p => p.socketId));
            const forks = games.splitGame(game, splitSocketIds);
            allForks.push(...forks); // Ensure to emit the forks
            queue.push(...forks); // Perhaps may split further
        } else if (choice.type === "teams") {
            games.queueControlMessage(game, {
                type: m.ActionType.Teams,
                teams: choice.teams.map(team => team.map(p => p.heroId)),
            });
        }

        logger.info(`Game [${game.id}]: ${formatPercent(noopCandidate.avgWinProbability)} -> ${formatCandidate(choice)}`);
    }

    games.emitForks(allForks);
}

function formatCandidate(choice: Candidate) {
    if (choice.type === "split") {
        return `split (${formatPercent(choice.avgWinProbability)}): ${choice.splits.map(s => s.map(p => p.aco.toFixed(0)).join(' ')).join(' | ')}`;
    } else if (choice.type === "teams") {
        return `teams (${formatPercent(choice.avgWinProbability)}): ${choice.teams.map(t => t.map(p => p.aco.toFixed(0)).join(' ')).join(' | ')}`;
    } else {
        return `noop (${formatPercent(choice.avgWinProbability)}): ${choice.all.map(p => p.aco.toFixed(0)).join(' ')}`;
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
    const ratings = extractSplitRatings(game);
    return {
        type: "noop",
        all: ratings,
        avgWinProbability: evaluateWinProbability(ratings.map(p => p.aco)),
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
        avgWinProbability: evaluateTeamCandidate(teams),
    };
}

function evaluateTeamCandidate(teams: TeamPlayer[][]): number {
    const averageRatings = teams.map(team => _(team).map(p => p.aco).mean());
    return evaluateWinProbability(averageRatings);
}

function extractTeamPlayers(game: g.Game): TeamPlayer[] {
    const teamPlayers = new Array<TeamPlayer>();
    game.active.forEach(player => {
        teamPlayers.push({ heroId: player.heroId, aco: player.aco });
    });
    if (game.matchmaking.AllowBotTeams) {
        game.bots.forEach((socketId, heroId) => {
            teamPlayers.push({ heroId, aco: game.matchmaking.BotRating });
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