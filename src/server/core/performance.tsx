import * as constants from '../../game/constants';
import * as m from '../../shared/messages.model';
import { logger } from '../status/logging';

export interface PerformanceStats {
    cpuLag: number;
    gpuLag: number;
    networkLag: number;
}

export const UnknownLag = 99;

const HistoryLengthMilliseconds = constants.PerformanceStats.MaxHistoryLengthMilliseconds;
const SliceLengthMilliseconds = 5000;
const MaxSlices = Math.ceil(HistoryLengthMilliseconds / SliceLengthMilliseconds);

let average = initialPerformanceStats();
let current = initialPerformanceStats();
let history = new Array<PerformanceStats>();
let nextLogTime = Date.now();

function initialPerformanceStats(): PerformanceStats {
    return {
        cpuLag: UnknownLag,
        gpuLag: UnknownLag,
        networkLag: UnknownLag,
    };
}

export function startLoop() {
    setInterval(tick, SliceLengthMilliseconds);
}

function tick() {
    history.push(current);
    while (history.length > MaxSlices) {
        history.shift();
    }

    current = initialPerformanceStats();

    average = aggregate(history);

    const now = Date.now();
    if (now > nextLogTime) {
        nextLogTime = now + HistoryLengthMilliseconds;
        log(average);
    }
}

export function receivePerformanceStats(performance: PerformanceStats) {
    accumulate(current, performance);
    accumulate(average, performance);
}

export function getPerformanceStats() {
    return average;
}

function aggregate(items: PerformanceStats[]): PerformanceStats {
    const result = initialPerformanceStats();
    items.forEach(item => accumulate(result, item));
    return result;
}

function accumulate(accumulator: PerformanceStats, performance: PerformanceStats) {
    accumulator.cpuLag = Math.min(accumulator.cpuLag, performance.cpuLag);
    accumulator.gpuLag = Math.min(accumulator.gpuLag, performance.gpuLag);
    accumulator.networkLag = Math.min(accumulator.networkLag, performance.networkLag);
}

function log(performance: PerformanceStats) {
    if (performance.cpuLag < UnknownLag && performance.gpuLag < UnknownLag && performance.networkLag < UnknownLag) {
        logger.info(`Performance: CPU=${performance.cpuLag.toFixed(2)} GPU=${performance.gpuLag.toFixed(2)} Network=${performance.networkLag.toFixed(2)}`);
    }
}