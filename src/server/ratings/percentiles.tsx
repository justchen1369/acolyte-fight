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
import { RatingAtPercentile } from './ratings.model';
import { logger } from '../status/logging';

export interface PercentilesCache {
    category: string;
    cumulativeFrequency: FixedIntegerArray;
    distribution: FixedIntegerArray;
}

function acoToExposure(aco: number): number {
    // There is no longer an activity bonus - everyone gets the maximum all the time
    return aco + constants.Placements.MaxBonus;
}

function exposureToAco(exposure: number): number {
    // There is no longer an activity bonus - everyone gets the maximum all the time
    return exposure - constants.Placements.MaxBonus;
}

export class PercentilesAccumulator {
    private frequency = new Array<number>();

    constructor(public readonly category: string) {
    }

    accept(user: db.User) {
        const userRating = accumulatorHelpers.getUserRating(user, this.category);
        if (userRating && userRating.numGames >= constants.Placements.PercentilesMinGames) {
            const acoExposure = acoToExposure(userRating.aco);
            const bin = Math.ceil(acoExposure);
            this.frequency[bin] = (this.frequency[bin] || 0) + 1;
        }
    }

    finish(): PercentilesCache {
        const frequency = new FixedIntegerArray(this.frequency);
        const cumulativeFrequency = calculateCumulativeFrequency(frequency);
        const distribution = calculateDistribution(cumulativeFrequency);

        const cache: PercentilesCache = {
            category: this.category,
            cumulativeFrequency,
            distribution,
        };

        this.log(cache);

        return cache;
    }

    private log(cache: PercentilesCache) {
        const Placements = constants.Placements;
        logger.info(this.formatLeague("Grandmaster", Placements.Grandmaster, cache));
        logger.info(this.formatLeague("Master", Placements.Master, cache));
        logger.info(this.formatLeague("Diamond", Placements.Diamond, cache));
        logger.info(this.formatLeague("Platinum", Placements.Platinum, cache));
        logger.info(this.formatLeague("Gold", Placements.Gold, cache));
        logger.info(this.formatLeague("Silver", Placements.Silver, cache));
        logger.info(this.formatLeague("Bronze", Placements.Bronze, cache));
        logger.info(this.formatLeague("Wood", Placements.Wood, cache));
    }

    private formatLeague(name: string, percentile: number, cache: PercentilesCache) {
        const exposure = estimateRatingAtPercentile(percentile, cache).exposure;
        return `League: category=${this.category} league=${name} percentile=${percentile} exposure=${exposure}`;
    }
}

// Returns the rating required to reach each percentile
function calculateDistribution(cumulativeFrequency: FixedIntegerArray): FixedIntegerArray {
    if (!cumulativeFrequency || cumulativeFrequency.length === 0) {
        return new FixedIntegerArray([]);
    }

    const distribution = new Array<number>();
    const numUsers = cumulativeFrequency.at(cumulativeFrequency.length - 1);
    for (let rating = 0; rating < cumulativeFrequency.length; ++rating) {
        const percentile = 100 * cumulativeFrequency.at(rating) / numUsers;
        while (true) {
            const nextPercentile = distribution.length;
            if (percentile >= nextPercentile) {
                distribution.push(rating);
            } else {
                break;
            }
        }
    }

    const maxRating = cumulativeFrequency.length;
    while (distribution.length < 101) { // 101 because we want the max value to be 100
        distribution.push(maxRating);
    }

    return new FixedIntegerArray(distribution);
}

function calculateCumulativeFrequency(frequency: FixedIntegerArray): FixedIntegerArray {
    const cumulativeFrequency = new Array<number>();

    let total = 0;
    for (let i = 0; i < frequency.length; ++i) {
        total += (frequency.at(i) || 0);
        cumulativeFrequency.push(total);
    }

    return new FixedIntegerArray(cumulativeFrequency);
}

export function estimatePercentile(ratingLB: number, cache: PercentilesCache): number {
    return estimatePercentileFrom(ratingLB, cache.cumulativeFrequency);
}

function estimatePercentileFrom(ratingLB: number, cumulativeFrequency: FixedIntegerArray): number {
    const numUsers = cumulativeFrequency.at(cumulativeFrequency.length - 1);

    const index = Math.ceil(ratingLB);
    const above = clampRead(index, cumulativeFrequency) / numUsers;
    const below = clampRead(index - 1, cumulativeFrequency) / numUsers;

    const alpha = index - ratingLB;

    return 100.0 * (below * alpha + above * (1 - alpha));
}

function clampRead(index: number, array: FixedIntegerArray): number {
    if (array.length === 0) {
        return undefined;
    } else {
        index = Math.max(0, Math.min(array.length - 1, index));
        return array.at(index);
    }
}

export function estimateRatingAtPercentile(percentile: number, cache: PercentilesCache): RatingAtPercentile {
    const distribution = cache.distribution;
    const minExposure = distribution.at(Math.floor(percentile)) || 0;
    const minAco = exposureToAco(minExposure);
    return {
        exposure: minExposure,
        aco: minAco,
    };
}