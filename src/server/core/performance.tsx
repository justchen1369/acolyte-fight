import * as constants from '../../game/constants';
import * as m from '../../shared/messages.model';
import { logger } from '../status/logging';
import TimedCache from '../../utils/timedCache';

export interface PerformanceListener {
    (stats: PerformanceStats): void;
}

export interface PerformanceStats {
    cpuLag: number;
    gpuLag: number;
    networkLag: number;
}

export const UnknownLag = 99;

const HistoryLengthMilliseconds = constants.PerformanceStats.MaxHistoryLengthMilliseconds;
const SliceLengthMilliseconds = 5000;

let current = new TimedCache<string, PerformanceStats>(HistoryLengthMilliseconds);
let average = initialPerformanceStats();

let nextLogTime = Date.now();

let emitPerformance: PerformanceListener = () => {};

function initialPerformanceStats(value: number = 0): PerformanceStats {
    return {
        cpuLag: value,
        gpuLag: value,
        networkLag: value,
    };
}

export function attachPerformanceEmitter(listener: PerformanceListener) {
    emitPerformance = listener;
}

export function startLoop() {
    setInterval(tick, SliceLengthMilliseconds);
}

function tick() {
    // Reset average
    average = aggregate();
    if (isKnown(average)) {
        // Send to clients
        emitPerformance(average);

        // Log
        const now = Date.now();
        if (now > nextLogTime) {
            nextLogTime = now + HistoryLengthMilliseconds;
            log(average);
        }
    }
}

export function receivePerformanceStats(socketId: string, performance: PerformanceStats) {
    current.set(socketId, performance);
}

export function getPerformanceStats() {
    return average;
}

function aggregate(): PerformanceStats {
    const result = initialPerformanceStats(UnknownLag);
    current.forEach(item => {
        accumulate(result, item);
    });

    if (isKnown(result)) {
        return result;
    } else {
        // No connections, no lag
        return initialPerformanceStats(0);
    }
}

function accumulate(accumulator: PerformanceStats, performance: PerformanceStats) {
    accumulator.cpuLag = Math.min(accumulator.cpuLag, performance.cpuLag);
    accumulator.gpuLag = Math.min(accumulator.gpuLag, performance.gpuLag);
    accumulator.networkLag = Math.min(accumulator.networkLag, performance.networkLag);
}

function isKnown(performance: PerformanceStats) {
    return performance.cpuLag < UnknownLag && performance.gpuLag < UnknownLag && performance.networkLag < UnknownLag;
}

function log(performance: PerformanceStats) {
    logger.info(`Performance: CPU=${performance.cpuLag.toFixed(2)} GPU=${performance.gpuLag.toFixed(2)} Network=${performance.networkLag.toFixed(2)}`);
}