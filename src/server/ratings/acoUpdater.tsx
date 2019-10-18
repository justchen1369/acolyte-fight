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

export interface PlayerDelta {
    userId: string;
    teamId: string;
    changes: m.AcoChangeMsg[];
}

export function calculateNewAcoRatings(ratingValues: Map<string, number>, players: m.PlayerStatsMsg[], category: string, system: aco.Aco): Map<string, PlayerDelta> {
    const deltas = new Map<string, PlayerDelta>(); // user ID -> PlayerDelta

    if (players.length <= 0) {
        return deltas;
    }

    const ratedPlayers = players.filter(p => ratingValues.has(p.userId));
    if (ratedPlayers.length === 0) {
        return deltas;
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

    // Team games count for less points because you can't control them directly
    const multiplier = numPlayersPerTeam > 1 ? (1 / numPlayersPerTeam) : 1;

    for (let i = 0; i < sortedPlayers.length; ++i) {
        const self = sortedPlayers[i];
        const selfTeamId = self.teamId || self.userHash;
        const selfAco = averageRatingPerTeam[selfTeamId];

        let deltaGain: m.AcoChangeMsg = null;
        let deltaLoss: m.AcoChangeMsg = null;
        for (let j = 0; j < sortedPlayers.length; ++j) {
            if (i == j) {
                continue;
            }

            const other = sortedPlayers[j];
            const otherTeamId = other.teamId || other.userHash;
            if (selfTeamId === otherTeamId) {
                continue; // Can't beat players on same team
            }

            const otherAco = averageRatingPerTeam[otherTeamId];

            const score = i < j ? 1 : 0; // win === 1, loss === 0
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
        deltas.set(self.userId, { userId: self.userId, teamId: selfTeamId, changes });
    }
    return deltas;
}

function calculateAverageRating(ratings: number[]) {
    return _.mean(ratings);
}
