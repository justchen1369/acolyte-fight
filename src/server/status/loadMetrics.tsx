import _ from 'lodash';
import process from 'process';

const HistoryLength = 3;
const BucketLengthMilliseconds = 30 * 1000;

export interface HRTime {
    [0]: number; // seconds
    [1]: number; // milliseconds
}

interface LoadStats {
    start: HRTime;
    stallMilliseconds: number;
    processingMilliseconds: number;
    totalMilliseconds: number;
}

interface AverageStats {
    stallProportion: number;
    processingProportion: number;
}

export function getNow(): HRTime {
    return process.hrtime();
}

export function diffMilliseconds(to: HRTime, from: HRTime): number {
    const milliseconds = 1e3 * (to[0] - from[0]) + 1e-6 * (to[1] - from[1]);
    return milliseconds;
}

function initLoadStats(): LoadStats {
    return {
        start: getNow(),
        stallMilliseconds: 0,
        processingMilliseconds: 0,
        totalMilliseconds: 0,
    };
}

export class LoadTracker {
    private previous: HRTime = getNow();
    private current: LoadStats = initLoadStats();
    private history = [this.current];

    track(processingMilliseconds: number, intervalMilliseconds: number, first: boolean = true) {
        const now = getNow();

        if (!first) {
            const millisecondsSinceLast = diffMilliseconds(now, this.previous);
            this.current.stallMilliseconds += Math.max(0, millisecondsSinceLast - intervalMilliseconds);
        }
        this.previous = now;

        this.current.processingMilliseconds += processingMilliseconds;
        this.current.totalMilliseconds += intervalMilliseconds;

        const duration = diffMilliseconds(now, this.current.start);
        if (duration >= BucketLengthMilliseconds) {
            this.current = initLoadStats();
            this.history.push(this.current);

            if (this.history.length > HistoryLength) {
                this.history.splice(0, this.history.length - HistoryLength);
            }
        }
    }

    average(): AverageStats {
        let processing = 0;
        let stall = 0;
        let total = 0;
        for (const stat of this.history) {
            processing += stat.processingMilliseconds;
            stall += stat.stallMilliseconds;
            total += stat.totalMilliseconds;
        }
        total = Math.max(1, total); // Avoid divide-by-zero errors
        return {
            processingProportion: processing / total,
            stallProportion: stall / total,
        };
    }
}

export const tracker = new LoadTracker();