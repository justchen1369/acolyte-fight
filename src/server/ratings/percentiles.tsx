import _ from 'lodash';
import deferred from 'promise-defer';
import moment from 'moment';
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

export interface PercentilesCache {
    frequencies: Map<string, FixedIntegerArray>;
    cumulativeFrequencies: Map<string, FixedIntegerArray>;
    distributions: Map<string, FixedIntegerArray>;
    numGamesToAco: Map<string, FixedIntegerArray>;
    numUsers: number;
}

interface DbFrequenciesResult {
    frequencies: Map<string, FixedIntegerArray>;
    numGamesToAco: Map<string, FixedIntegerArray>;
    numUsers: number;
}

interface MeanItem {
    total: number;
    count: number;
}

export function emptyCache(): PercentilesCache {
    return {
        frequencies: new Map<string, FixedIntegerArray>(),
        cumulativeFrequencies: new Map<string, FixedIntegerArray>(),
        distributions: new Map<string, FixedIntegerArray>(),
        numGamesToAco: new Map<string, FixedIntegerArray>(),
        numUsers: 0,
    };
}

export function numGamesBin(numGames: number): number {
    return Math.floor(Math.log2(1 + numGames));
}

export async function calculatePercentiles(): Promise<PercentilesCache> {
    const result = await calculateFrequencies();
    const cumulativeFrequencies = calculateCumulativeFrequency(result.frequencies);

    const distributions = new Map<string, FixedIntegerArray>();
    cumulativeFrequencies.forEach((cumulativeFrequency, key) => {
        distributions.set(key, calculateDistribution(cumulativeFrequency));
    });

    return {
        frequencies: result.frequencies,
        cumulativeFrequencies,
        distributions,
        numGamesToAco: result.numGamesToAco,
        numUsers: result.numUsers,
    };
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

async function calculateFrequencies(): Promise<DbFrequenciesResult> {
    const query = dbStorage.getFirestore().collection(db.Collections.User).select('ratings');

    let numUsers = 0;
    const frequencies = new Map<string, number[]>();
    const numGamesToAco = new Map<string, MeanItem[]>();
    await dbStorage.stream(query, doc => {
        ++numUsers;

        const user = doc.data() as db.User;
        if (!(user && user.ratings)) {
            return
        }

        for (const category in user.ratings) {
            const userRating = user.ratings[category];
            if (userRating.numGames < constants.Placements.MinGames) {
                continue;
            }

            if (userRating.aco) {
                const acoExposure = userRating.aco + constants.Placements.ActivityBonusPerGame * constants.Placements.MaxActivityGames;

                // Count acoExposure frequency
                {
                    const bin = Math.ceil(acoExposure);
                    const frequency = getOrCreateDistribution<number>(frequencies, category);
                    frequency[bin] = (frequency[bin] || 0) + 1;
                }

                // Count numGamesToAco
                {
                    const bin = numGamesBin(userRating.numGames);
                    const distribution = getOrCreateDistribution<MeanItem>(numGamesToAco, category);
                    incrementMeanItem(distribution, bin, userRating.aco);
                }
            }
        }
    });

    return {
        frequencies: fixDistribution(frequencies),
        numGamesToAco: meanDistribution(numGamesToAco, constants.Placements.InitialAco),
        numUsers,
    };
}

function getOrCreateDistribution<T>(frequencies: Map<string, T[]>, key: string): T[] {
    let frequency = frequencies.get(key);
    if (!frequency) {
        frequency = [];
        frequencies.set(key, frequency);
    }
    return frequency;
}

function incrementMeanItem(distribution: MeanItem[], bin: number, value: number) {
    let item = distribution[bin];
    if (!item) {
        item = distribution[bin] = { total: 0, count: 0 };
    }
    item.total += value;
    item.count++;
}

function fixDistribution(frequencies: Map<string, number[]>): Map<string, FixedIntegerArray> {
    const frequenciesFixed = new Map<string, FixedIntegerArray>();
    frequencies.forEach((frequency, key) => {
        frequenciesFixed.set(key, new FixedIntegerArray(frequency));
    });
    return frequenciesFixed;
}

function meanDistribution(frequencies: Map<string, MeanItem[]>, defaultValue: number): Map<string, FixedIntegerArray> {
    const frequenciesFixed = new Map<string, FixedIntegerArray>();
    frequencies.forEach((frequency, key) => {
        const means = new Array<number>();
        for (let i = 0; i < frequency.length; ++i) {
            const item = frequency[i];
            if (item) {
                means[i] = item.total / item.count;
            } else {
                means[i] = defaultValue;
            }
        }
        frequenciesFixed.set(key, new FixedIntegerArray(means));
    });
    return frequenciesFixed;
}

function calculateCumulativeFrequency(frequencies: Map<string, FixedIntegerArray>): Map<string, FixedIntegerArray> {
    const cumulativeFrequencies = new Map<string, FixedIntegerArray>();
    frequencies.forEach((frequency, key) => {
        const cumulativeFrequency = new Array<number>();

        let total = 0;
        for (let i = 0; i < frequency.length; ++i) {
            total += (frequency.at(i) || 0);
            cumulativeFrequency.push(total);
        }

        cumulativeFrequencies.set(key, new FixedIntegerArray(cumulativeFrequency));
    });

    return cumulativeFrequencies;
}

export function estimatePercentile(ratingLB: number, category: string, cache: PercentilesCache): number {
    return estimatePercentileFrom(ratingLB, cache.cumulativeFrequencies.get(category));
}

function estimatePercentileFrom(ratingLB: number, cumulativeFrequency: FixedIntegerArray): number {
    if (!cumulativeFrequency || cumulativeFrequency.length <= 0) {
        return 100;
    }

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

export function estimateRatingAtPercentile(category: string, percentile: number, cache: PercentilesCache): number {
    const distribution = cache.distributions.get(category);
    if (!distribution) {
        return 0;
    }

    const minRating = distribution.at(Math.floor(percentile));
    return minRating || 0;
}

export function estimateAcoFromNumGames(category: string, numGames: number, cache: PercentilesCache): number {
    const distribution = cache.numGamesToAco.get(category);
    if (!distribution) {
        return constants.Placements.InitialAco;
    }

    const bin = numGamesBin(numGames);
    if (bin >= distribution.length) {
        return distribution.length > 0 ? distribution.at(distribution.length - 1) : 0;
    } else {
        return distribution.at(bin) || constants.Placements.InitialAco;
    }
}

export function estimateNumUsers(cache: PercentilesCache): number {
    return cache.numUsers;
}
