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
import { firestore } from './dbStorage';
import { logger } from './logging';

let cumulativeFrequenciesCache: Map<string, number[]> = new Map<string, number[]>();

export async function init() {
    refreshCumulativeFrequenciesLoop();
}

export function estimatePercentile(ratingLB: number, category: string): number {
    return estimatePercentileFrom(ratingLB, cumulativeFrequenciesCache.get(category));
}

async function refreshCumulativeFrequenciesLoop() {
    cumulativeFrequenciesCache = await calculateCumulativeFrequency();
    const delayMilliseconds = calculateNextRefresh(cumulativeFrequenciesCache);

    setTimeout(() => refreshCumulativeFrequenciesLoop(), delayMilliseconds);
}

function calculateNextRefresh(cumulativeFrequencies: Map<string, number[]>) {
    const numUsers = _.max([...cumulativeFrequencies.values()].map(cumulativeFrequency => _.last(cumulativeFrequency)));
    if (numUsers < 100) {
        return 5 * 60 * 1000;
    } else {
        return 60 * 60 * 1000;
    }
}

async function calculateCumulativeFrequency(): Promise<Map<string, number[]>> {
    const start = Date.now();

    const query = firestore.collection(db.Collections.User).select('ratings');

    const frequencies = new Map<string, number[]>();
    await dbStorage.stream(query, doc => {
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

    logger.info(`Calculated cumulative frequencies in ${(Date.now() - start).toFixed(0)} ms`);

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