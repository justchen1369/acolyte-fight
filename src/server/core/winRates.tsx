import _ from 'lodash';
import wu from 'wu';
import * as aco from '../core/aco';
import * as constants from '../../game/constants';
import * as statsStorage from '../storage/statsStorage';
import { Collections, Singleton } from '../storage/db.model';
import { getFirestore } from '../storage/dbStorage';
import { logger } from '../status/logging';

export interface WinRateBucket {
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

const winRates = new Map<string, aco.ActualWinRate[]>();

export function getWinRateDistribution(category: string) {
    return winRates.get(category);
}

export async function updateWinRateDistribution(category: string) {
    const distribution = await calculateWinRateDistribution(category);
    const dataPoints: aco.ActualWinRate[] = distribution.map(p => ({
        midpoint: (p.maxDiff + p.minDiff) / 2,
        winRate: p.weightedExpected / p.weightedGames,
        numGames: p.numGames,
    }));
    winRates.set(category, dataPoints);
}

export async function calculateWinRateDistribution(category: string) {
    const BucketRange = 50;

    const start = Date.now();
    const buckets = new Array<WinRateBucket>();
    await statsStorage.loadAllGames(category, game => {
        if (game.partyId) {
            return; // Ignore private games
        }

        if (game.winners && game.winners.length > 1) {
            return; // Ignore team games
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
                let bucket = buckets[index];
                if (!bucket) {
                    bucket = buckets[index] = {
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
    });
    const elapsed = Date.now() - start;
    logger.info(`Calculated win rate distribution in ${elapsed} ms: ${formatBuckets(buckets)}`);

    return buckets.filter(b => !!b);
}

function formatBuckets(buckets: WinRateBucket[]) {
    return buckets.map(b => `${b.maxDiff}:${(100 * (b.weightedExpected / b.weightedGames)).toFixed(1)}%`).join(' ');
}
