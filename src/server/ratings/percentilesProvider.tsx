import _ from 'lodash';
import deferred from 'promise-defer';
import moment from 'moment';
import * as categories from '../../shared/segments';
import * as constants from '../../game/constants';
import * as g from '../server.model';
import * as m from '../../shared/messages.model';
import * as s from '../server.model';
import * as percentiles from './percentiles';
import { logger } from '../status/logging';

let cache: percentiles.PercentilesCache = percentiles.emptyCache();

export const ready = deferred<void>();

export async function init() {
    await refreshCumulativeFrequencies();
    ready.resolve();
}

export async function update() {
    await refreshCumulativeFrequencies();
}

export function estimatePercentile(ratingLB: number, category: string): number {
    return percentiles.estimatePercentile(ratingLB, category, cache);
}

export function estimateRatingAtPercentile(category: string, percentile: number): number {
    return percentiles.estimateRatingAtPercentile(category, percentile, cache);
}

export function estimateAcoFromNumGames(category: string, numGames: number): number {
    return percentiles.estimateAcoFromNumGames(category, numGames, cache);
}

export function estimateNumUsers(): number {
    return percentiles.estimateNumUsers(cache);
}

export async function refreshCumulativeFrequencies() {
    const start = Date.now();

    cache = await percentiles.calculatePercentiles();
    cache.numGamesToAco.forEach((distribution, category) => {
        logger.info(`Num games to aco distribution (${category}): ${distribution.toArray().map(v => v.toFixed(0)).join(' ')}`);
    });

    logger.info(`Calculated cumulative frequencies in ${(Date.now() - start).toFixed(0)} ms`);
}
