import _ from 'lodash';
import * as accumulatorHelpers from './accumulatorHelpers';
import * as categories from '../../shared/segments';
import * as constants from '../../game/constants';
import * as db from '../storage/db.model';
import * as dbStorage from '../storage/dbStorage';
import * as g from '../server.model';
import * as m from '../../shared/messages.model';
import * as s from '../server.model';
import { Collections } from '../storage/db.model';
import { FixedIntegerArray } from '../utils/fixedIntegerArray';
import { logger } from '../status/logging';

export interface AcoEstimatorCache {
    category: string;
    distribution: FixedIntegerArray;
}

interface MeanItem {
    total: number;
    count: number;
}

export class NumGamesToAcoAccumulator {
    private distribution = new Array<MeanItem>();

    constructor(public readonly category: string) {
    }

    accept(user: db.User) {
        const userRating = accumulatorHelpers.getUserRating(user, this.category);
        if (userRating) {
            const bin = numGamesBin(userRating.numGames);
            incrementMeanItem(this.distribution, bin, userRating.aco);
        }
    }

    finish(): AcoEstimatorCache {
        const distribution = meanDistribution(this.distribution, constants.Placements.InitialAco);
        logger.info(`Num games to aco distribution: ${distribution.toArray().map(v => v.toFixed(0)).join(' ')}`);

        return {
            category: this.category,
            distribution,
        }
    }
}

export function numGamesBin(numGames: number): number {
    return Math.floor(Math.log2(1 + numGames));
}

function incrementMeanItem(distribution: MeanItem[], bin: number, value: number) {
    let item = distribution[bin];
    if (!item) {
        item = distribution[bin] = { total: 0, count: 0 };
    }
    item.total += value;
    item.count++;
}

function meanDistribution(frequency: MeanItem[], defaultValue: number): FixedIntegerArray {
    const means = new Array<number>();
    for (let i = 0; i < frequency.length; ++i) {
        const item = frequency[i];
        if (item) {
            means[i] = item.total / item.count;
        } else {
            means[i] = defaultValue;
        }
    }
    return new FixedIntegerArray(means);
}

export function estimateAcoFromNumGames(numGames: number, cache: AcoEstimatorCache): number {
    if (!cache) {
        return constants.Placements.InitialAco;
    }

    const distribution = cache.distribution;
    const bin = numGamesBin(numGames);
    if (bin >= distribution.length) {
        return distribution.length > 0 ? distribution.at(distribution.length - 1) : 0;
    } else {
        return distribution.at(bin) || constants.Placements.InitialAco;
    }
}