import * as s from '../store.model';
import * as StoreProvider from '../storeProvider';
import { TicksPerSecond } from '../../game/constants';

export interface PerformanceSlice {
    stalls: number;
    total: number;
}

export interface PerformanceCounters {
    start: number;
    network: PerformanceSlice;
    graphics: PerformanceSlice;
    calculation: PerformanceSlice;
}

const MaxHistoryLength = 10;
const SlowMultiplier = 2.0; // 2x late => slow
const SliceMilliseconds = 1000;

export const MaxHistorySeconds = MaxHistoryLength * SliceMilliseconds / 1000;

const interval = Math.floor(1000 / TicksPerSecond);
const SlowInterval = interval * SlowMultiplier;

let current = initCounters();
let history = new Array<PerformanceCounters>();

export function tick() {
    const elapsed = Date.now() - current.start;
    if (elapsed >= SliceMilliseconds) {
        history.push(current);
        current = initCounters();
        if (history.length > MaxHistoryLength) {
            history.shift();
        }

        const performance = calculate();
        // console.log(formatPerformance(performance));

        StoreProvider.dispatch({
            type: "performance",
            performance: flatten(performance),
        });
    }
}

export function calculate() {
    return aggregate(history);
}

function flatten(performance: PerformanceCounters): s.PerformanceState {
    return {
        cpuLag: flattenSlice(performance.calculation),
        gpuLag: flattenSlice(performance.graphics),
        networkLag: flattenSlice(performance.network),
    };
}

function flattenSlice(slice: PerformanceSlice): number {
    return slice.stalls / Math.max(1, slice.total);
}

function initCounters(): PerformanceCounters {
    return {
        start: Date.now(),
        network: { stalls: 0, total: 0 },
        graphics: { stalls: 0, total: 0 },
        calculation: { stalls: 0, total: 0 },
    };
}

function formatPerformance(performance: PerformanceCounters) {
    return `network=${formatSlice(performance.network)} calculation=${formatSlice(performance.calculation)} graphics=${formatSlice(performance.graphics)}`;
}

function formatSlice(slice: PerformanceSlice) {
    return `${(100 * (slice.stalls / slice.total)).toFixed(0)}%`;
}

function aggregate(items: PerformanceCounters[]): PerformanceCounters {
    const accumulator = initCounters();
    for (let i = 0; i < items.length; ++i) {
        accumulate(accumulator, items[i]);
    }
    return accumulator;
}

function accumulate(accumulator: PerformanceCounters, item: PerformanceCounters) {
    accumulator.start = Math.min(accumulator.start, item.start);
    accumulateSlice(accumulator.network, item.network);
    accumulateSlice(accumulator.calculation, item.calculation);
    accumulateSlice(accumulator.graphics, item.graphics);
}

function accumulateSlice(accumulator: PerformanceSlice, item: PerformanceSlice) {
    accumulator.stalls += item.stalls;
    accumulator.total += item.total;
}

export function recordNetwork(success: boolean) {
    record(current.network, success);
}

export function recordCalculation(calculationMilliseconds: number) {
    record(current.calculation, calculationMilliseconds < SlowInterval);
}

export function recordGraphics(renderingMilliseconds: number) {
    record(current.graphics, renderingMilliseconds < SlowInterval);
}

function record(slice: PerformanceSlice, success: boolean) {
    if (!success) {
        ++slice.stalls;
    }
    ++slice.total;
}