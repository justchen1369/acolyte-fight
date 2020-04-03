import _ from 'lodash';
import moment from 'moment';
import wu from 'wu';
import * as db from '../storage/db.model';
import * as g from '../server.model';
import * as m from '../../shared/messages.model';
import * as aco from '../core/aco';
import * as categories from '../../shared/segments';
import * as constants from '../../game/constants';
import * as statsProvider from './statsProvider';
import { Collections, Singleton } from '../storage/db.model';
import { getFirestore } from '../storage/dbStorage';
import { logger } from '../status/logging';

export interface TeamRating {
    teamId: string;
    averageRating: number;
    players: m.PlayerStatsMsg[];
}

export interface PlayerDelta {
    userId: string;
    teamId: string;
    changes: m.AcoChangeMsg[];
}

interface Duel {
    otherTeamId: string;
    otherAco: number;
    diff: number;
    winProbability: number;
    learningRate: number;
    score: number;
}

export function prepareDeltas(ratingValues: Map<string, number>, players: m.PlayerStatsMsg[]): TeamRating[] {
    if (players.length <= 0) {
        return [];
    }

    const ratedPlayers = players.filter(p => ratingValues.has(p.userId));
    if (ratedPlayers.length === 0) {
        return [];
    }

    const teams = _.groupBy(ratedPlayers, p => p.teamId || p.userHash);
    const teamRatings = new Array<TeamRating>();
    for (const teamId of Object.keys(teams)) {
        const teamPlayers = teams[teamId];
        const averageRating = calculateAverageRating(teamPlayers.map(p => ratingValues.get(p.userId)));
        teamRatings.push({
            teamId,
            averageRating,
            players: teamPlayers,
        });
    }

    const highestRankPerTeam = _.mapValues(teams, players => _.min(players.map(p => p.rank)));
    const sortedTeamRatings = _.sortBy(teamRatings, x => highestRankPerTeam[x.teamId]);

    return sortedTeamRatings;
}

export function calculateDelta(teams: TeamRating[], self: m.PlayerStatsMsg, category: string, system: aco.Aco): PlayerDelta {
    const selfIndex = teams.findIndex(team => team.players.some(p => p === self));
    if (selfIndex === -1) {
        return { userId: self.userId, teamId: self.userHash, changes: [] };
    }

    const selfTeam = teams[selfIndex];

    const duels = new Array<Duel>();
    for (let otherIndex = 0; otherIndex < teams.length; ++otherIndex) {
        const otherTeam = teams[otherIndex];
        if (otherTeam === selfTeam) {
            continue;
        }

        const score = selfIndex < otherIndex ? 1 : 0; // win === 1, loss === 0
        const diff = system.calculateDiff(selfTeam.averageRating, otherTeam.averageRating);
        const winProbability = system.estimateWinProbability(diff, statsProvider.getWinRateDistribution(category) || []);
        const learningRate = system.calculateLearningRate(winProbability);

        duels.push({
            otherTeamId: otherTeam.teamId,
            otherAco: otherTeam.averageRating,
            score,
            diff,
            winProbability,
            learningRate,
        });
    }

    // Don't scale learning linearly with number of players because then it would be 6x larger with 7 players
    let multiplier = 1;
    const totalLearningRate = _(duels).map(x => x.learningRate).sum();
    if (totalLearningRate > system.learningRateCap) {
        multiplier *= system.learningRateCap / totalLearningRate;
    }

    const changes = new Array<m.AcoChangeMsg>();
    for (const duel of duels) {
        const adjustment = system.adjustment(duel.winProbability, duel.score, multiplier);
        const change: m.AcoChangeMsg = { delta: adjustment.delta, e: adjustment.e, otherTeamId: duel.otherTeamId };
        changes.push(change);
    }

    return { userId: self.userId, teamId: selfTeam.teamId, changes };
}

function calculateAverageRating(ratings: number[]) {
    return _.mean(ratings);
}
