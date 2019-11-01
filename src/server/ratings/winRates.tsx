import _ from 'lodash';
import wu from 'wu';
import * as m from '../../shared/messages.model';
import * as aco from '../core/aco';
import * as accumulatorHelpers from './accumulatorHelpers';
import * as constants from '../../game/constants';
import { logger } from '../status/logging';

const BucketRange = 50;

export interface WinRateCache {
    category: string;
    distribution: aco.ActualWinRate[];
}

interface WinRateBucket {
    minDiff: number;
    maxDiff: number;

    numGames: number;
    numExpected: number;

    weightedGames: number;
    weightedExpected: number;
}

interface WinRateItem {
    aco: number;
    numGames: number;
}

export class WinRateAccumulator {
    private buckets = new Array<WinRateBucket>();

    constructor(public readonly category: string) {
    }

    accept(game: m.GameStatsMsg) {
        if (!accumulatorHelpers.acceptGame(game, this.category)) {
            return;
        }

        const ratings = _.orderBy(game.players.filter(p => p.initialAco && p.initialNumGames && p.rank), p => p.rank).map(p => {
            const result: WinRateItem = {
                aco: p.initialAco,
                numGames: p.initialNumGames,
            };
            return result;
        });
        for (let i = 0; i < ratings.length; ++i) {
            for (let j = i + 1; j < ratings.length; ++j) {
                const winner = ratings[i];
                const loser = ratings[j];

                const weight = Math.log(1 + Math.min(winner.numGames, loser.numGames) / constants.Placements.MinGames);

                const diff = winner.aco - loser.aco;
                const distance = Math.abs(diff);

                const index = Math.floor(distance / BucketRange);
                let bucket = this.buckets[index];
                if (!bucket) {
                    bucket = this.buckets[index] = {
                        minDiff: index * BucketRange,
                        maxDiff: (index + 1) * BucketRange,
                        numGames: 0,
                        numExpected: 0,
                        weightedExpected: 0,
                        weightedGames: 0,
                    };
                }

                ++bucket.numGames;
                bucket.weightedGames += weight;
                if (winner.aco >= loser.aco) {
                    ++bucket.numExpected;
                    bucket.weightedExpected += weight;
                }
            }
        }
    }

    calculate(): WinRateCache {
        const distribution = this.buckets.filter(b => !!b).map(p => ({
            midpoint: (p.maxDiff + p.minDiff) / 2,
            winRate: p.weightedExpected / p.weightedGames,
            numGames: p.numGames,
        } as aco.ActualWinRate));

        return {
            category: this.category,
            distribution,
        };
    }

    log() {
        logger.info(`Calculated win rate distribution ${this.category}: ${formatBuckets(this.buckets)}`);
    }

}

function formatBuckets(buckets: WinRateBucket[]) {
    return buckets.map(b => `${b.maxDiff}:${(100 * (b.weightedExpected / b.weightedGames)).toFixed(1)}%`).join(' ');
}
