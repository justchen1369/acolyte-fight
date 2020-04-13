import _ from 'lodash';
import moment from 'moment';
import wu from 'wu';
import deferred from 'promise-defer';
import * as Firestore from '@google-cloud/firestore';
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
import * as spellFrequencies from './spellFrequencies';
import * as statsStorage from '../storage/statsStorage';
import * as winRates from './winRates';
import { logger } from '../status/logging';
import { RatingAtPercentile } from './ratings.model';

interface SpellFrequencySpec {
    category: string;
    league: string;
    minAco: number;
}

const IncrementalUpdateInterval = 60 * 1000;
const FullUpdateInterval = 24 * 60 * 60 * 1000;

let nextFullUpdate = 0;

class GameAccumulator {
    readonly spellFrequencyCaches = new Map<string, spellFrequencies.SpellFrequencyCache[]>();
    readonly winRateCaches = new Map<string, winRates.WinRateCache>();

    private latestGameUnix = 0;
    private spellFrequencyAccumulators = new Array<spellFrequencies.SpellUsageAccumulator>();
    private winRateAccumulator = new winRates.WinRateAccumulator(m.GameCategory.PvP);

    constructor(spellFrequencySpecs: SpellFrequencySpec[]) {
        spellFrequencySpecs.forEach(spec => {
            this.spellFrequencyAccumulators.push(new spellFrequencies.SpellUsageAccumulator(spec.category, spec.league, spec.minAco));
        });
    }

    // performs incremental update
    async update() {
        const start = Date.now();

        // Calculate win rate distribution
        await statsStorage.streamAllGamesAfter(this.latestGameUnix, game => {
            this.winRateAccumulator.accept(game);
        });
        const winRateCache = this.winRateAccumulator.calculate();
        this.winRateCaches.set(winRateCache.category, winRateCache);

        const distribution = winRateCache.distribution; // Assume the category of the winRateDistribution is the same for the spellFrequencyDistribution

        // Calculate spell frequencies
        let numGames = 0;
        await statsStorage.streamAllGamesAfter(this.latestGameUnix, game => {
            this.spellFrequencyAccumulators.forEach(accumulator => accumulator.accept(game, distribution));

            ++numGames;
            if (game.unixTimestamp) {
                this.latestGameUnix = Math.max(this.latestGameUnix, game.unixTimestamp);
            }
        });

        const spellFrequencyGroups =
            _(this.spellFrequencyAccumulators)
            .map(accumulator => accumulator.calculate())
            .groupBy(cache => cache.category).value();
        for (const category in spellFrequencyGroups) {
            this.spellFrequencyCaches.set(category, spellFrequencyGroups[category]);
        }

        const elapsed = Date.now() - start;
        logger.info(`Processed ${numGames} games in ${elapsed.toFixed(0)} ms`);
    }

    log() {
        this.winRateAccumulator.log();
        this.spellFrequencyAccumulators.forEach(accumulator => accumulator.log());
    }
}

class UserAccumulator {
    acoEstimatorCaches = new Map<string, acoEstimator.AcoEstimatorCache>();
    percentileCaches = new Map<string, percentiles.PercentilesCache>();
    populationCache: population.PopulationCache = null;

    // performs non-incremental update
    async update() {
        const start = Date.now();

        const populationAccumulator = new population.NumUsersAccumulator();
        const percentileAccumulator = new percentiles.PercentilesAccumulator(m.GameCategory.PvP);
        const acoEstimationAccumulator = new acoEstimator.NumGamesToAcoAccumulator(m.GameCategory.PvP);

        let numUsers = 0;
        const cutoff = new Firestore.Timestamp(moment().subtract(constants.Placements.PercentilesMaxAgeDays, 'd').unix(), 0);
        await statsStorage.streamAllUserRatingsAfter(cutoff, user => {
            populationAccumulator.accept(user);
            percentileAccumulator.accept(user);
            acoEstimationAccumulator.accept(user);

            ++numUsers;
        });

        this.populationCache = populationAccumulator.finish();

        const acoEstimatorCache = acoEstimationAccumulator.finish();
        this.acoEstimatorCaches.set(acoEstimatorCache.category, acoEstimatorCache);

        const percentileCache = percentileAccumulator.finish();
        this.percentileCaches.set(percentileCache.category, percentileCache);

        const elapsed = Date.now() - start;
        logger.info(`Processed ${numUsers} users in ${elapsed.toFixed(0)} ms`);
    }

    log() {
    }
}

export async function startUpdateLoop() {
    await update();
    ready.resolve();
    updateLoop();
}

function updateLoop() {
    setTimeout(async () => {
        await update();
        updateLoop();
    }, IncrementalUpdateInterval);
}

async function update() {
    try {
        if (Date.now() < nextFullUpdate) {
            await gameAccumulator.update(); // Performs incremental update

            // Don't update users because that is non-incremental
        } else {
            nextFullUpdate = Date.now() + FullUpdateInterval;

            const newUserAccumulator = new UserAccumulator();
            await newUserAccumulator.update();
            userAccumulator = newUserAccumulator;

            const category = m.GameCategory.PvP;
            const percentileCache = userAccumulator.percentileCaches.get(category);
            const spellFrequencySpecs: SpellFrequencySpec[] = constants.SpellFrequencies.MinAcoPercentiles.map(percentile => ({
                category,
                league: `p${percentile}`,
                minAco: percentiles.estimateRatingAtPercentile(percentile, percentileCache).aco,
            }));

            const newGameAccumulator = new GameAccumulator(spellFrequencySpecs);
            await newGameAccumulator.update();
            gameAccumulator = newGameAccumulator;

            userAccumulator.log();
            gameAccumulator.log();
        }
    } catch (exception) {
        logger.error("statsProvider failed to update", exception);
    }
}

export function estimateAcoFromNumGames(category: string, numGames: number): number {
    const cache = userAccumulator.acoEstimatorCaches.get(category);
    if (cache) {
        return acoEstimator.estimateAcoFromNumGames(numGames, cache);
    } else {
        return constants.Placements.InitialAco;
    }
}

export function estimatePercentile(ratingLB: number, category: string): number {
    const cache = userAccumulator.percentileCaches.get(category);
    if (cache) {
        return percentiles.estimatePercentile(ratingLB, cache);
    } else {
        return 100;
    }
}

export function estimateRatingAtPercentile(category: string, percentile: number): RatingAtPercentile {
    const cache = userAccumulator.percentileCaches.get(category);
    if (cache) {
        return percentiles.estimateRatingAtPercentile(percentile, cache);
    } else {
        return { exposure: 0, aco: 0 };
    }
}

export function estimateNumUsers(): number {
    const cache = userAccumulator.populationCache;
    if (cache) {
        return population.estimateNumUsers(cache);
    } else {
        return 0;
    }
}

export function getWinRateDistribution(category: string) {
    const cache = gameAccumulator.winRateCaches.get(category);
    if (cache) {
        return cache.distribution;
    } else {
        return [];
    }
}

export function getSpellFrequencies(category: string, minAco: number): m.SpellFrequency[] {
    const caches = gameAccumulator.spellFrequencyCaches.get(category);
    if (caches) {
        // Find closest cache
        const cache = _.minBy(caches, cache => Math.abs(minAco - cache.minAco));
        if (cache) {
            return wu(cache.distribution.values()).toArray() as m.SpellFrequency[];
        } else {
            return [];
        }
    } else {
        return [];
    }
}

export const ready = deferred<void>();

let gameAccumulator = new GameAccumulator([]);
let userAccumulator = new UserAccumulator();