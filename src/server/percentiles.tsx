import _ from 'lodash';
import crypto from 'crypto';
import moment from 'moment';
import * as Firestore from '@google-cloud/firestore';
import * as categories from './segments';
import * as constants from '../game/constants';
import * as db from './db.model';
import * as dbStorage from './dbStorage';
import * as g from './server.model';
import * as m from '../game/messages.model';
import * as mirroring from './mirroring';
import * as s from './server.model';
import { Collections } from './db.model';
import { FixedIntegerArray } from './fixedIntegerArray';
import { logger } from './logging';

const ratingSystems = [m.RatingSystem.Glicko, m.RatingSystem.Aco];

interface DbFrequenciesResult {
    frequencies: Map<string, FixedIntegerArray>;
    numUsers: number;
}

let cumulativeFrequenciesCache: Map<string, FixedIntegerArray> = new Map<string, FixedIntegerArray>();
let distributionCache: Map<string, FixedIntegerArray> = new Map<string, FixedIntegerArray>();
let numUsersCache: number = 0;

export async function init() {
    refreshCumulativeFrequenciesLoop();
}

function cacheKey(category: string, system: string) {
    return `${category}.${system}`;
}

export function estimatePercentile(ratingLB: number, category: string, system: string): number {
    return estimatePercentileFrom(ratingLB, cumulativeFrequenciesCache.get(cacheKey(category, system)));
}

export function estimateRatingAtPercentile(category: string, system: string, percentile: number): number {
    const distribution = distributionCache.get(cacheKey(category, system));
    if (!distribution) {
        return 0;
    }

    const minRating = distribution.at(Math.floor(percentile));
    return minRating || 0;
}

export function estimateNumUsers(): number {
    return numUsersCache;
}

async function refreshCumulativeFrequenciesLoop() {
    const start = Date.now();

    const result = await calculateFrequencies();
    numUsersCache = result.numUsers;
    cumulativeFrequenciesCache = calculateCumulativeFrequency(result.frequencies);

    for (const key of cumulativeFrequenciesCache.keys()) {
        distributionCache.set(key, calculateDistribution(cumulativeFrequenciesCache.get(key)));
    }

    logger.info(`Calculated cumulative frequencies in ${(Date.now() - start).toFixed(0)} ms`);

    const delayMilliseconds = calculateNextRefresh(numUsersCache);

    setTimeout(() => refreshCumulativeFrequenciesLoop(), delayMilliseconds);
}

function calculateNextRefresh(numUsers: number) {
    if (!numUsers || numUsers < 100) {
        return 5 * 60 * 1000;
    } else if (numUsers < 1000) {
        return 20 * 60 * 1000;
    } else {
        return 60 * 60 * 1000;
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

            for (const system of ratingSystems) {
                let value: number = null;
                if (system === m.RatingSystem.Aco) {
                    if (userRating.aco) {
                        value = userRating.aco + constants.Placements.ActivityBonusPerGame * constants.Placements.MaxActivityGames;
                    }
                } else if (system === m.RatingSystem.Glicko) {
                    value = userRating.lowerBound;
                }
                if (!value) {
                    continue;
                }
                const bin = Math.ceil(value);

                const key = cacheKey(category, system);
                let frequency = frequencies.get(key);
                if (!frequency) {
                    frequency = [];
                    frequencies.set(key, frequency);
                }
                frequency[bin] = (frequency[bin] || 0) + 1;
            }
        }
    });

    const frequenciesFixed = new Map<string, FixedIntegerArray>();
    frequencies.forEach((frequency, key) => {
        frequenciesFixed.set(key, new FixedIntegerArray(frequency));
    });
    return { frequencies: frequenciesFixed, numUsers };
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