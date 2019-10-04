import _ from 'lodash';
import deferred from 'promise-defer';
import moment from 'moment';
import * as db from '../storage/db.model';
import * as g from '../server.model';
import * as m from '../../shared/messages.model';
import * as s from '../server.model';
import * as aco from '../core/aco';
import * as acoEstimator from './acoEstimator';
import * as categories from '../../shared/segments';
import * as constants from '../../game/constants';
import * as percentiles from './percentiles';
import * as population from './population';
import * as statsStorage from '../storage/statsStorage';
import * as winRates from './winRates';
import { logger } from '../status/logging';

export const ready = deferred<void>();

const acoEstimatorCaches = new Map<string, acoEstimator.AcoEstimatorCache>();
const percentileCaches = new Map<string, percentiles.PercentilesCache>();
const winRateCaches = new Map<string, winRates.WinRateCache>();
let populationCache: population.PopulationCache = null;

export async function init() {
    await update();
    ready.resolve();
}

export async function update() {
    await updateFromUsers();
    await updateFromGames();
}

async function updateFromUsers() {
    const start = Date.now();

    const populationAccumulator = new population.NumUsersAccumulator();
    const percentileAccumulator = new percentiles.PercentilesAccumulator(m.GameCategory.PvP);
    const acoEstimationAccumulator = new acoEstimator.NumGamesToAcoAccumulator(m.GameCategory.PvP);

    let numUsers = 0;
    await statsStorage.loadAllUserRatings(user => {
        populationAccumulator.accept(user);
        percentileAccumulator.accept(user);
        acoEstimationAccumulator.accept(user);

        ++numUsers;
    });

    populationCache = populationAccumulator.finish();

    const acoEstimatorCache = acoEstimationAccumulator.finish();
    acoEstimatorCaches.set(acoEstimatorCache.category, acoEstimatorCache);

    const percentileCache = percentileAccumulator.finish();
    percentileCaches.set(percentileCache.category, percentileCache);

    const elapsed = Date.now() - start;
    logger.info(`Processed ${numUsers} users in ${elapsed.toFixed(0)} ms`);
}

async function updateFromGames() {
    const start = Date.now();
    const category = m.GameCategory.PvP;

    const winRateAccumulator = new winRates.WinRateAccumulator(category);

    let numGames = 0;
    await statsStorage.loadAllGames(category, game => {
        winRateAccumulator.accept(game);

        ++numGames;
    });

    const winRateCache = winRateAccumulator.finish();
    winRateCaches.set(winRateCache.category, winRateCache);

    const elapsed = Date.now() - start;
    logger.info(`Processed ${numGames} games in ${elapsed.toFixed(0)} ms`);
}

export function estimateAcoFromNumGames(category: string, numGames: number): number {
    const cache = acoEstimatorCaches.get(category);
    if (cache) {
        return acoEstimator.estimateAcoFromNumGames(numGames, cache);
    } else {
        return constants.Placements.InitialAco;
    }
}

export function estimatePercentile(ratingLB: number, category: string): number {
    const cache = percentileCaches.get(category);
    if (cache) {
        return percentiles.estimatePercentile(ratingLB, cache);
    } else {
        return 100;
    }
}

export function estimateRatingAtPercentile(category: string, percentile: number): number {
    const cache = percentileCaches.get(category);
    if (cache) {
        return percentiles.estimateRatingAtPercentile(percentile, cache);
    } else {
        return 0;
    }
}

export function estimateNumUsers(): number {
    const cache = populationCache;
    if (cache) {
        return population.estimateNumUsers(cache);
    } else {
        return 0;
    }
}

export function getWinRateDistribution(category: string) {
    const cache = winRateCaches.get(category);
    if (cache) {
        return cache.distribution;
    } else {
        return [];
    }
}