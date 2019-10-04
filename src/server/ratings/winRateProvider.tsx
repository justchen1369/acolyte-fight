import * as aco from '../core/aco';
import * as m from '../../shared/messages.model';
import * as winRates from './winRates';

const winRateCache = new Map<string, aco.ActualWinRate[]>();

export async function init() {
    await updateWinRateDistribution(m.GameCategory.PvP);
}

export async function update() {
    await updateWinRateDistribution(m.GameCategory.PvP);
}

export function getWinRateDistribution(category: string) {
    return winRateCache.get(category);
}

export async function updateWinRateDistribution(category: string) {
    const dataPoints = await winRates.calculateWinRateDistribution(category);
    winRateCache.set(category, dataPoints);
}