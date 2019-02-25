import _ from 'lodash';
import * as constants from '../game/constants';
import * as statsStorage from './statsStorage';

export interface Bucket {
    distance: number;

    numGames: number;
    numExpected: number;

    weightedGames: number;
    weightedExpected: number;
}

interface Rank {
    aco: number;
    numGames: number;
}

export async function calculateWinRateDistribution() {
    const BucketRange = 50;
    const buckets = new Array<Bucket>();

    await statsStorage.loadAllGames(game => {
        if (game.winners && game.winners.length > 1) {
            return; // Ignore team games
        }

        const ratings = _.orderBy(game.players.filter(p => p.initialAco && p.initialNumGames && p.rank), p => p.rank).map(p => {
            const result: Rank = {
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
                        distance: index * BucketRange,
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

    return buckets.filter(b => !!b);
}