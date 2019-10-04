import _ from 'lodash';
import crypto from 'crypto';
import deferred from 'promise-defer';
import moment from 'moment';
import * as Firestore from '@google-cloud/firestore';
import * as categories from '../../shared/segments';
import * as constants from '../../game/constants';
import * as db from '../storage/db.model';
import * as dbStorage from '../storage/dbStorage';
import * as g from '../server.model';
import * as m from '../../shared/messages.model';
import * as mirroring from './mirroring';
import * as s from '../server.model';
import { Collections } from '../storage/db.model';
import { FixedIntegerArray } from '../utils/fixedIntegerArray';
import { logger } from '../status/logging';

interface DbFrequenciesResult {
    frequencies: Map<string, FixedIntegerArray>;
    numGamesToAco: Map<string, FixedIntegerArray>;
    numUsers: number;
}

interface MeanItem {
    total: number;
    count: number;
}

let cumulativeFrequenciesCache = new Map<string, FixedIntegerArray>();
let distributionCache = new Map<string, FixedIntegerArray>();
let numGamesToAcoCache = new Map<string, FixedIntegerArray>();
let numUsersCache: number = 0;

export const ready = deferred<void>();
let isReady = false;

export async function init() {
    refreshCumulativeFrequenciesLoop();
}

function cacheKey(category: string) {
    return `${category}`;
}

function numGamesBin(numGames: number): number {
    return Math.floor(Math.log2(1 + numGames));
}

export function estimatePercentile(ratingLB: number, category: string): number {
    return estimatePercentileFrom(ratingLB, cumulativeFrequenciesCache.get(cacheKey(category)));
}

export function estimateRatingAtPercentile(category: string, percentile: number): number {
    const distribution = distributionCache.get(cacheKey(category));
    if (!distribution) {
        return 0;
    }

    const minRating = distribution.at(Math.floor(percentile));
    return minRating || 0;
}

export function estimateAcoFromNumGames(category: string, numGames: number): number {
    const distribution = numGamesToAcoCache.get(cacheKey(category));
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

export function estimateNumUsers(): number {
    return numUsersCache;
}

async function refreshCumulativeFrequenciesLoop() {
    await refreshCumulativeFrequencies();
    if (!isReady) {
        isReady = true;
        ready.resolve();
    }

    const delayMilliseconds = calculateNextRefresh(numUsersCache);
    setTimeout(() => refreshCumulativeFrequenciesLoop(), delayMilliseconds);
}

export async function refreshCumulativeFrequencies() {
    const start = Date.now();

    const result = await calculateFrequencies();
    numUsersCache = result.numUsers;
    cumulativeFrequenciesCache = calculateCumulativeFrequency(result.frequencies);

    cumulativeFrequenciesCache.forEach((cumulativeFrequency, key) => {
        distributionCache.set(key, calculateDistribution(cumulativeFrequency));
    });

    numGamesToAcoCache = result.numGamesToAco;
    result.numGamesToAco.forEach((distribution, category) => {
        logger.info(`Num games to aco distribution (${category}): ${distribution.toArray().map(v => v.toFixed(0)).join(' ')}`);
    });

    logger.info(`Calculated cumulative frequencies in ${(Date.now() - start).toFixed(0)} ms`);
}

function calculateNextRefresh(numUsers: number) {
    if (!numUsers || numUsers < 100) {
        return 5 * 60 * 1000;
    } else if (numUsers < 1000) {
        return 20 * 60 * 1000;
    } else if (numUsers < 10000) {
        return 60 * 60 * 1000;
    } else {
        return 24 * 60 * 60 * 1000;
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

function getOrCreateDistribution<T>(frequencies: Map<string, T[]>, category: string): T[] {
    const key = cacheKey(category);

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