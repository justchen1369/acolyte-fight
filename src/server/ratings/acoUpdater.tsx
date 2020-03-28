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

export interface PlayerDeltaInput {
    players: m.PlayerStatsMsg[];
    averageRatingPerTeam: { [teamId: string]: number };
    numPlayersPerTeam: number;
}

export interface PlayerDelta {
    userId: string;
    teamId: string;
    changes: m.AcoChangeMsg[];
}

function noSortedPlayers(): PlayerDeltaInput {
    return {
        players: [],
        averageRatingPerTeam: {},
        numPlayersPerTeam: 0,
    };
}

export function prepareDeltas(ratingValues: Map<string, number>, players: m.PlayerStatsMsg[]): PlayerDeltaInput {
    if (players.length <= 0) {
        return noSortedPlayers();
    }

    const ratedPlayers = players.filter(p => ratingValues.has(p.userId));
    if (ratedPlayers.length === 0) {
        return noSortedPlayers();
    }

    const teams = _.groupBy(ratedPlayers, p => p.teamId || p.userHash);

    const numPlayersPerTeam = _.chain(teams).map(team => team.length).max().value();
    const highestRankPerTeam = _.mapValues(teams, players => _.min(players.map(p => p.rank)));
    const averageRatingPerTeam =
        _.chain(teams)
        .mapValues((players, teamId) => players.filter(p => !!p.userId).map(p => ratingValues.get(p.userId)))
        .mapValues((ratings) => calculateAverageRating(ratings))
        .value()

    const sortedPlayers = _.sortBy(ratedPlayers, p => highestRankPerTeam[p.teamId || p.userHash]);

    return {
        players: sortedPlayers,
        averageRatingPerTeam,
        numPlayersPerTeam,
    }
}

export function calculateDelta(input: PlayerDeltaInput, selfIndex: number, category: string, system: aco.Aco): PlayerDelta {
    const sortedPlayers = input.players;
    const self = input.players[selfIndex];

    // Team games count for less points because you can't control them directly
    const multiplier = input.numPlayersPerTeam > 1 ? (1 / input.numPlayersPerTeam) : 1;

    const selfTeamId = self.teamId || self.userHash;
    const selfAco = input.averageRatingPerTeam[selfTeamId];

    let deltaGain: m.AcoChangeMsg = null;
    let deltaLoss: m.AcoChangeMsg = null;
    for (let otherIndex = 0; otherIndex < sortedPlayers.length; ++otherIndex) {
        const other = sortedPlayers[otherIndex];
        if (other === self) {
            continue;
        }

        const otherTeamId = other.teamId || other.userHash;
        if (selfTeamId === otherTeamId) {
            continue; // Can't beat players on same team
        }

        const otherAco = input.averageRatingPerTeam[otherTeamId];

        const score = selfIndex < otherIndex ? 1 : 0; // win === 1, loss === 0
        const diff = system.calculateDiff(selfAco, otherAco);
        const winProbability = system.estimateWinProbability(diff, statsProvider.getWinRateDistribution(category) || []);
        const adjustment = system.adjustment(winProbability, score, multiplier);
        const change: m.AcoChangeMsg = { delta: adjustment.delta, e: adjustment.e, otherTeamId };
        if (change.delta >= 0) {
            if (!deltaGain || deltaGain.delta < change.delta) { // Largest gain
                deltaGain = change;
            }
        } else {
            if (!deltaLoss || deltaLoss.delta > change.delta) { // Largest loss
                deltaLoss = change;
            }
        }
    }

    const changes = new Array<m.AcoChangeMsg>();
    if (deltaGain) {
        changes.push(deltaGain);
    }
    if (deltaLoss) {
        changes.push(deltaLoss);
    }
    return { userId: self.userId, teamId: selfTeamId, changes };
}

function calculateAverageRating(ratings: number[]) {
    return _.mean(ratings);
}
