import * as constants from '../../game/constants';
import * as m from '../../shared/messages.model';
import * as s from '../store.model';
import * as sockets from '../core/sockets';
import * as StoreProvider from '../storeProvider';
import { TicksPerSecond } from '../../game/constants';

export interface PerformanceSlice {
    stalls: number;
    total: number;
}

export interface PerformanceCounters {
    network: PerformanceSlice;
    graphics: PerformanceSlice;
    calculation: PerformanceSlice;
}

const SlowMultiplier = 2.0; // 2x late => slow
const SliceMilliseconds = 1000;
const MaxHistoryLength = constants.PerformanceStats.MaxHistoryLengthMilliseconds / SliceMilliseconds;

const interval = Math.floor(1000 / TicksPerSecond);
const SlowInterval = interval * SlowMultiplier;

let nextSlice = Date.now() + SliceMilliseconds;
let current = initCounters();
let history = new Array<PerformanceCounters>();

export function tick() {
    const now = Date.now();
    if (now < nextSlice) {
        return;
    }
    nextSlice = now + SliceMilliseconds;

    history.push(current);
    current = initCounters();
    if (history.length > MaxHistoryLength) {
        history.shift();
    }

    const performance = calculate();
    // console.log(formatPerformance(performance));
    const message = flatten(performance);

    StoreProvider.dispatch({
        type: "performance",
        performance: message,
    });

    send(message);
}

export function calculate() {
    return aggregate(history);
}

function flatten(performance: PerformanceCounters): m.PerformanceStatsMsg {
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

function send(data: m.PerformanceStatsMsg) {
    const socket = sockets.getSocket();
    socket.emit('performance', data);
}