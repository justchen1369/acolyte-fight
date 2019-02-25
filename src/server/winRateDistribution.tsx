import _ from 'lodash';
import * as constants from '../game/constants';
import * as statsStorage from './statsStorage';

export interface Bucket {
    distance: number;
    numGames: number;
    numExpected: number;
}

export async function calculateWinRateDistribution() {
    const BucketRange = 50;
    const buckets = new Array<Bucket>();

    await statsStorage.loadAllGames(game => {
        if (game.winners && game.winners.length > 1) {
            return; // Ignore team games
        }

        const ratings = _.orderBy(game.players.filter(p => p.initialAco && p.initialNumGames && p.rank), p => p.rank).map(p => p.initialAco);
        for (let i = 0; i < ratings.length; ++i) {
            for (let j = i + 1; j < ratings.length; ++j) {
                const winner = ratings[i];
                const loser = ratings[j];

                const diff = winner - loser;
                const distance = Math.abs(diff);

                const index = Math.floor(distance / BucketRange);
                let bucket = buckets[index];
                if (!bucket) {
                    bucket = buckets[index] = {
                        distance: index * BucketRange,
                        numGames: 0,
                        numExpected: 0,
                    };
                }

                ++bucket.numGames;

                if (winner >= loser) {
                    ++bucket.numExpected;
                }
            }
        }
    });

    return buckets.filter(b => !!b);
}