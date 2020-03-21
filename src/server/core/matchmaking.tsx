import _ from 'lodash';
import stringHash from 'string-hash';
import wu from 'wu';
import * as aco from './aco';
import * as acoUpdater from '../ratings/acoUpdater';
import * as auth from '../auth/auth';
import * as categories from '../../shared/segments';
import * as g from '../server.model';
import * as games from './games';
import * as m from '../../shared/messages.model';
import * as segments from '../../shared/segments';
import * as statsProvider from '../ratings/statsProvider';
import * as statsStorage from '../storage/statsStorage';
import { getStore } from '../serverStore';
import { logger } from '../status/logging';
import TimedCache from '../../utils/timedCache';

const BotSocketId = "Bot";
const MatchmakingExpiryMilliseconds = 20 * 60 * 1000;
const RepeatMatchupExpiryMilliseconds = 5 * 60 * 1000;

export interface SocketTeam {
    socketId: string;
    team?: number;
}

export interface RatedPlayer {
    socketId: string;
    aco: number;
}

interface Matchup {
    teams: string[][]; // socketIds, grouped by team
}

interface SplitCandidate extends CandidateBase {
    type: "split";
    threshold: number;
    splits: RatedPlayer[][];
}

interface TeamPlayer {
    socketId: string;
    heroId: string;
    aco: number;
    isBot?: boolean;
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
    weight: number;
}

const matchmakingRatings = new TimedCache<string, number>(MatchmakingExpiryMilliseconds); // userId -> aco
const previousMatchups = new TimedCache<string, number>(RepeatMatchupExpiryMilliseconds); // socketId -> matchup hash

export function init() {
    games.attachFinishedGameListener(onGameFinished);
}

export function cleanup() {
    const cleanedRatings = matchmakingRatings.cleanup();
    const cleanedMatchups = previousMatchups.cleanup();
    if (cleanedRatings > 0 || cleanedMatchups > 0) {
        logger.info(`Cleaned ${cleanedRatings} matchmaking ratings and ${cleanedMatchups} previous matchups`);
    }
}

export async function getRating(userId: string, numGames: number, category: string): Promise<number> {
    let aco = matchmakingRatings.get(userId);
    if (!aco) {
        aco = await retrieveRating(userId, numGames, category);
        matchmakingRatings.set(userId, aco);
    }

    return aco;
}

export async function retrieveRating(userId: string, numGames: number, category: string): Promise<number> {
    if (userId) {
        const userRating = await retrieveUserRatingOrDefault(userId, category);
        return Math.max(userRating.aco, userRating.acoUnranked);
    } else {
        return statsProvider.estimateAcoFromNumGames(category, numGames);
    }
}

async function retrieveUserRatingOrDefault(userId: string, category: string): Promise<g.UserRating> {
    if (!userId) {
        return statsStorage.initialRating();
    }

    const userRating = await statsStorage.getUserRating(userId, category);
    return userRating || statsStorage.initialRating();
}

function onGameFinished(game: g.Game, gameStats: m.GameStatsMsg): void {
    try {
        updateRatingsIfNecessary(game, gameStats);
    } catch (error) {
        logger.error("Unable to update matchmaking ratings:");
        logger.error(error);
        return null;
    }
}

async function updateRatingsIfNecessary(game: g.Game, gameStats: m.GameStatsMsg) {
    if (!(gameStats && game.segment === categories.publicSegment())) { // Private games don't count towards ranking
        return;
    }

    const ratingValues = new Map<string, number>(); // userId -> aco
    for (const player of gameStats.players) {
        if (player.userId) {
            const aco = await getRating(player.userId, player.initialNumGames || 0, gameStats.category);
            ratingValues.set(player.userId, aco);
        }
    }

    const deltas = acoUpdater.calculateNewAcoRatings(ratingValues, gameStats.players, gameStats.category, aco.AcoMatchmaking);

    deltas.forEach(delta => {
        let aco = matchmakingRatings.get(delta.userId);
        if (aco) {
            const change = _(delta.changes).map(c => c.delta).sum();
            aco += change;
        }
        matchmakingRatings.set(delta.userId, aco);
    });
}

export function findNewGame(version: string, room: g.Room, partyId: string | null, newPlayer: RatedPlayer): g.Game {
	const roomId = room ? room.id : null;
	const segment = segments.calculateSegment(version, roomId, partyId);

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

    const previousHashes = findPreviousMatchHashes(game);
    const choice = chooseCandidate(candidates, game.matchmaking, previousHashes);
    
    const splitSocketIds = choice.splits.map(s => s.map(p => p.socketId));
    const forks = games.splitGame(game, splitSocketIds);
    games.emitForks(forks);

    logger.info(`Game [${game.id}]: ${formatCandidate(choice)}`);

    const index = choice.splits.findIndex(split => split.some(player => player === newPlayer));
    return forks[index];
}

function chooseCandidate<T extends Candidate>(candidates: T[], matchmaking: MatchmakingSettings, previousHashes: Set<number>): T {
    if (candidates.length <= 0) {
        return undefined;
    }

    const weightings = candidates.map(candidate => weightCandidate(candidate, matchmaking, previousHashes));
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

function weightCandidate(candidate: Candidate, matchmaking: MatchmakingSettings, previousHashes: Set<number>): number {
    let weight = Math.pow(candidate.avgWinProbability, matchmaking.RatingPower);

    let numOdd = 0;
    let minSize = matchmaking.MaxPlayers;
    if (candidate.type === "noop") {
        numOdd = isOdd(candidate.all.length) ? 1 : 0;
        minSize = Math.min(minSize, candidate.all.length);
    } else if (candidate.type === "split") {
        numOdd = candidate.splits.filter(s => isOdd(s.length)).length;
        minSize = Math.min(minSize, _(candidate.splits).map(s => s.length).min());
    } else if (candidate.type === "teams") {
        const numPlayers = _(candidate.teams).map(t => t.length).sum();
        numOdd = isOdd(numPlayers) ? 1 : 0;
        minSize = Math.min(minSize, numPlayers);

        const intraWinProbability = _(candidate.teams).map(t => evaluateWinProbability(t.map(p => p.aco))).mean();
        const teamWeight = Math.pow(
            Math.min(1, intraWinProbability * 2), // *2 because the win probability is 0-0.5 and we want 0.0-1.0
            matchmaking.TeamPenaltyPower) || 0; // || 0 because we might get NaN
        weight *= teamWeight;
    }
    weight *= Math.pow(matchmaking.OddPenalty, numOdd);

    const largeAlpha = minSize / Math.max(1, matchmaking.MaxPlayers);
    weight *= 1 * largeAlpha + matchmaking.SmallPenalty * (1 - largeAlpha);

    const numSame = countSameMatchups(candidate, previousHashes);
    weight *= Math.pow(matchmaking.SamePenalty, numSame);

    return weight;
}

function findPreviousMatchHashes(game: g.Game): Set<number> {
    return new Set<number>(wu(game.active.values()).map(p => previousMatchups.get(p.socketId)).filter(_.isNumber));
}

function countSameMatchups(candidate: Candidate, previousHashes: Set<number>): number {
    const matchups = extractMatchups(candidate);
    return matchups.filter(matchup => previousHashes.has(hashMatchup(matchup))).length;
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

function generateSplitCandidates(game: g.Game, newPlayers?: RatedPlayer[], weight: number = 1): SplitCandidate[] {
    const ratings = extractSplitRatings(game, newPlayers);
    return generateSubSplitCandidates([ratings], weight);
}

function generateSubSplitCandidates(partitions: RatedPlayer[][], weight: number = 1): SplitCandidate[] {
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
                weight,
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
            const winProbability = aco.AcoRanked.estimateWinProbability(diff, statsProvider.getWinRateDistribution(m.GameCategory.PvP));
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
	const segment = segments.calculateSegment(version, roomId, partyId);
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

    const Matchmaking = initial.matchmaking;

    const previousHashes = findPreviousMatchHashes(initial);
    const queue = [initial];
    const allForks = new Array<g.Game>();
    const allMatchups = new Array<Matchup>();
    while (queue.length > 0) {
        const game = queue.shift();

        const noopCandidate = generateNoopCandidate(game);
        const candidates = new Array<Candidate>();

        if (Matchmaking.EnableTeams) {
            candidates.push(...generateTeamCandidates(game));
        }

        if (initial.matchmaking.EnableSplitting) {
            candidates.push(...generateSplitCandidates(game));
        }

        if (initial.matchmaking.EnableSingles || candidates.length === 0) {
            candidates.push(noopCandidate);
        }

        const choice = chooseCandidate(candidates, initial.matchmaking, previousHashes);

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

        const matchups = extractMatchups(choice);
        allMatchups.push(...matchups); // Don't register the matchups yet because it the intermediate matchups will affect final matchups

        logger.info(`Game [${game.id}]: ${formatPercent(noopCandidate.avgWinProbability)} -> ${formatCandidate(choice)}`);
    }

    games.emitForks(allForks);
    allMatchups.forEach(matchup => registerMatchup(matchup));
}

function extractMatchups(choice: Candidate): Matchup[] {
    if (choice.type === "split") {
        return choice.splits.map(split => (
            { teams: split.map(p => [p.socketId]) }
        ));
    } else if (choice.type === "teams") {
        return [
            { teams: choice.teams.map(team => team.map(p => p.socketId)) },
        ];
    } else if (choice.type === "noop") {
        return [
            { teams: choice.all.map(p => [p.socketId]) },
        ];
    } else {
        return [];
    }
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
    const Matchmaking = game.matchmaking;
    if (!((game.bots.size === 0 || Matchmaking.AllowBotTeams)
        && wu(game.active.values()).every(x =>
            (!!x.userId || !Matchmaking.TeamsMinGames) // If minimum team games is zero, create teams regardless
            && x.numGames >= Matchmaking.TeamsMinGames
            && (x.numActionMessages > 0 || !!game.partyId || !!game.locked)))) { // In private matches, don't check whether the players are active
        // Everyone must be logged in to activate team mode
        // Also everyone must be active and have played the minimum number of games
        return [];
    }

    const sortedRatings = extractTeamPlayers(game);

    const candidates = new Array<TeamsCandidate>();
    if (Matchmaking.PvE) {
        const pve = generatePvECandidate(sortedRatings);
        if (pve) {
            candidates.push(pve);
        }
    } else {
        const shuffledRatings = _.shuffle(sortedRatings);
        const potentialNumTeams = calculatePotentialNumTeams(sortedRatings.length, Matchmaking.AllowUnevenTeams);
        const teamCandidateWeight = 1.0 / 2; // Half weight because we generate twice as many options, so don't artificially increase chance of teams
        candidates.push(...potentialNumTeams.map(numTeams => generateTeamCandidate(sortedRatings, numTeams, teamCandidateWeight)));
        candidates.push(...potentialNumTeams.map(numTeams => generateTeamCandidate(shuffledRatings, numTeams, teamCandidateWeight)));
    }

    return candidates;
}

function generateNoopCandidate(game: g.Game, weight: number = 1): NoopCandidate {
    const ratings = extractSplitRatings(game);
    return {
        type: "noop",
        all: ratings,
        avgWinProbability: evaluateWinProbability(ratings.map(p => p.aco)),
        weight,
    };
}

function generateTeamCandidate(playerSequence: TeamPlayer[], numTeams: number, weight: number = 1): TeamsCandidate {
    const teams = new Array<TeamPlayer[]>();
    for (let i = 0; i < numTeams; ++i) {
        teams.push([]);
    }

    for (let i = 0; i < playerSequence.length; ++i) {
        const round = Math.floor(i / numTeams);
        const offset = i % numTeams;
        const even = round % 2 === 0;

        // Assign in this repeating pattern: 0, 1, 2, 2, 1, 0, etc
        const team = even ? offset : (numTeams - offset - 1);
        teams[team].push(playerSequence[i]);
    }

    return {
        type: "teams",
        teams,
        avgWinProbability: evaluateTeamCandidate(teams),
        weight,
    };
}

function generatePvECandidate(playerSequence: TeamPlayer[]): TeamsCandidate {
    const humans = playerSequence.filter(p => !p.isBot);
    const bots = playerSequence.filter(p => p.isBot);
    if (humans.length === 0 || bots.length === 0) {
        return null;
    }

    const teams = new Array<TeamPlayer[]>();
    teams.push(humans);
    teams.push(bots);

    return {
        type: "teams",
        teams,
        avgWinProbability: evaluateTeamCandidate(teams),
        weight: 1,
    };
}

function evaluateTeamCandidate(teams: TeamPlayer[][]): number {
    const averageRatings = teams.map(team => _(team).map(p => p.aco).mean());
    return evaluateWinProbability(averageRatings);
}

function extractTeamPlayers(game: g.Game): TeamPlayer[] {
    const teamPlayers = new Array<TeamPlayer>();
    game.active.forEach(player => {
        teamPlayers.push({ heroId: player.heroId, aco: player.aco, socketId: player.socketId });
    });
    if (game.matchmaking.AllowBotTeams) {
        game.bots.forEach((socketId, heroId) => {
            teamPlayers.push({ heroId, aco: game.matchmaking.BotRating, socketId: BotSocketId, isBot: true });
        });
    }

    return _.orderBy(teamPlayers, p => p.aco);
}

function calculatePotentialNumTeams(numPlayers: number, allowUneven: boolean = false): number[] {
    if (numPlayers >= 3) {
        const candidates = new Array<number>();
        const maxTeams = Math.ceil(numPlayers / 2);
        for (let candidateTeams = 2; candidateTeams <= maxTeams; ++candidateTeams) {
            if (allowUneven || (numPlayers % candidateTeams) === 0) {
                candidates.push(candidateTeams);
            }
        }
        return candidates;
    } else {
        return [];
    }
}

function registerMatchup(matchup: Matchup) {
    const allSocketIds = _.flatten(matchup.teams);
    const matchHash = hashMatchup(matchup);
    for (const socketId of allSocketIds) {
        if (socketId !== BotSocketId) {
            previousMatchups.set(socketId, matchHash);
        }
    }
}

function matchupKey(matchup: Matchup) {
    return matchup.teams.map(t => [...t].sort().join(' ')).sort().join('|');
}

function hashMatchup(matchup: Matchup) {
    return stringHash(matchupKey(matchup));
}