import _ from 'lodash';
import crypto from 'crypto';
import moment from 'moment';
import * as Firestore from '@google-cloud/firestore';
import * as categories from './categories';
import * as constants from '../game/constants';
import * as db from './db.model';
import * as dbStorage from './dbStorage';
import * as g from './server.model';
import * as m from '../game/messages.model';
import * as mirroring from './mirroring';
import * as s from './server.model';
import { Collections } from './db.model';
import { logger } from './logging';

interface DbFrequenciesResult {
    frequencies: Map<string, number[]>;
    numUsers: number;
}

let cumulativeFrequenciesCache: Map<string, number[]> = new Map<string, number[]>();
let distributionCache: Map<string, number[]> = new Map<string, number[]>();
let numUsersCache: number = 0;

export async function init() {
    refreshCumulativeFrequenciesLoop();
}

export function estimatePercentile(ratingLB: number, category: string): number {
    return estimatePercentileFrom(ratingLB, cumulativeFrequenciesCache.get(category));
}

export function estimateDistributions(): m.GetDistributionsResponse {
    const result: m.GetDistributionsResponse = {};
    for (const category of distributionCache.keys()) {
        result[category] = distributionCache.get(category);
    }
    return result;
}
export function estimateDistribution(category: string): number[] {
    return distributionCache.get(category);
}

export function estimateNumUsers(category: string): number {
    return numUsersCache;
}

async function refreshCumulativeFrequenciesLoop() {
    const start = Date.now();

    const result = await calculateFrequencies();
    numUsersCache = result.numUsers;
    cumulativeFrequenciesCache = calculateCumulativeFrequency(result.frequencies);

    for (const category of cumulativeFrequenciesCache.keys()) {
        distributionCache.set(category, calculateDistribution(cumulativeFrequenciesCache.get(category)));
    }

    logger.info(`Calculated cumulative frequencies in ${(Date.now() - start).toFixed(0)} ms`);

    const delayMilliseconds = calculateNextRefresh(cumulativeFrequenciesCache);

    setTimeout(() => refreshCumulativeFrequenciesLoop(), delayMilliseconds);
}

function calculateNextRefresh(cumulativeFrequencies: Map<string, number[]>) {
    const numUsers = _.max([...cumulativeFrequencies.values()].map(cumulativeFrequency => _.last(cumulativeFrequency)));
    if (!numUsers || numUsers < 100) {
        return 5 * 60 * 1000;
    } else if (numUsers < 1000) {
        return 20 * 60 * 1000;
    } else {
        return 60 * 60 * 1000;
    }
}

// Returns the rating required to reach each percentile
function calculateDistribution(cumulativeFrequency: number[]): number[] {
    if (!cumulativeFrequency || cumulativeFrequency.length === 0) {
        return [];
    }

    const distribution = new Array<number>();
    const numUsers = cumulativeFrequency[cumulativeFrequency.length - 1];
    for (let rating = 0; rating < cumulativeFrequency.length; ++rating) {
        const percentile = 100 * cumulativeFrequency[rating] / numUsers;
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

    return distribution;
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

            const lowerBound = userRating.lowerBound;
            const bin = Math.ceil(lowerBound);

            let frequency = frequencies.get(category);
            if (!frequency) {
                frequency = [];
                frequencies.set(category, frequency);
            }
            frequency[bin] = (frequency[bin] || 0) + 1;
        }
    });

    return { frequencies, numUsers };
}

function calculateCumulativeFrequency(frequencies: Map<string, number[]>): Map<string, number[]> {
    const cumulativeFrequencies = new Map<string, number[]>();
    frequencies.forEach((frequency, category) => {
        const cumulativeFrequency = new Array<number>();

        let total = 0;
        for (let i = 0; i < frequency.length; ++i) {
            total += (frequency[i] || 0);
            cumulativeFrequency.push(total);
        }

        cumulativeFrequencies.set(category, cumulativeFrequency);
    });

    return cumulativeFrequencies;
}

function estimatePercentileFrom(ratingLB: number, cumulativeFrequency: number[]): number {
    if (!cumulativeFrequency || cumulativeFrequency.length <= 0) {
        return 100;
    }

    const numUsers = cumulativeFrequency[cumulativeFrequency.length - 1];

    const index = Math.ceil(ratingLB);
    const above = clampRead(index, cumulativeFrequency) / numUsers;
    const below = clampRead(index - 1, cumulativeFrequency) / numUsers;

    const alpha = index - ratingLB;

    return 100.0 * (below * alpha + above * (1 - alpha));
}

function clampRead(index: number, array: number[]): number {
    if (array.length === 0) {
        return undefined;
    } else {
        index = Math.max(0, Math.min(array.length - 1, index));
        return array[index];
    }
}