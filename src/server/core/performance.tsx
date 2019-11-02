import * as constants from '../../game/constants';
import * as m from '../../shared/messages.model';
import { logger } from '../status/logging';

export const UnknownLag = 99;

const HistoryLengthMilliseconds = constants.PerformanceStats.MaxHistoryLengthMilliseconds;
const SliceLengthMilliseconds = 5000;
const MaxSlices = Math.ceil(HistoryLengthMilliseconds / SliceLengthMilliseconds);

let average = initialPerformanceStats();
let current = initialPerformanceStats();
let history = new Array<m.PerformanceStatsMsg>();
let nextLogTime = Date.now();

function initialPerformanceStats(): m.PerformanceStatsMsg {
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

export function receivePerformanceStats(performance: m.PerformanceStatsMsg) {
    accumulate(current, performance);
    accumulate(average, performance);
}

export function getPerformanceStats() {
    return average;
}

function aggregate(items: m.PerformanceStatsMsg[]): m.PerformanceStatsMsg {
    const result = initialPerformanceStats();
    items.forEach(item => accumulate(result, item));
    return result;
}

function accumulate(accumulator: m.PerformanceStatsMsg, performance: m.PerformanceStatsMsg) {
    accumulator.cpuLag = Math.min(accumulator.cpuLag, performance.cpuLag);
    accumulator.gpuLag = Math.min(accumulator.gpuLag, performance.gpuLag);
    accumulator.networkLag = Math.min(accumulator.networkLag, performance.networkLag);
}

function log(performance: m.PerformanceStatsMsg) {
    if (performance.cpuLag < UnknownLag && performance.gpuLag < UnknownLag && performance.networkLag < UnknownLag) {
        logger.info(`Performance: CPU=${performance.cpuLag.toFixed(2)} GPU=${performance.gpuLag.toFixed(2)} Network=${performance.networkLag.toFixed(2)}`);
    }
}