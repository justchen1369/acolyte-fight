export interface AcoConfig {
    k: number;
    r: number;
    power: number;
    numGamesConfidence: number;
    lossCap: number;
}

export interface ActualWinRate {
    midpoint: number;
    winRate: number;
    numGames: number;
}

function calculateEloWinRate(diff: number, r: number) {
    return 1 / (1 + Math.pow(10, -diff / r));
}

export class Aco {
    k: number;
    r: number;
    power: number;
    numGamesConfidence: number;
    lossCap: number;

    constructor(config: AcoConfig) {
        this.k = config.k;
        this.r = config.r;
        this.power = config.power;
        this.numGamesConfidence = config.numGamesConfidence;
        this.lossCap = config.lossCap;
    }

    calculateLearningRate(winProbability: number) {
        return Math.pow(1 - winProbability, this.power);
    }

    adjustment(winProbability: number, score: number): number {
        return this.k * (score - winProbability);
    }

    calculateDiff(selfRating: number, otherRating: number): number { 
        return selfRating - otherRating;
    }

    // IMPORTANT: dataPoints must be sorted!
    estimateWinProbability(diff: number, dataPoints: ActualWinRate[] = []) {
        const acoWinRate = calculateEloWinRate(diff, this.r)

        let winRate = acoWinRate;

        const actualWinRate = this.calculateActualWinRateIfPossible(diff, dataPoints);
        if (actualWinRate) {
            const alpha = Math.exp(-actualWinRate.numGames / this.numGamesConfidence);
            winRate = acoWinRate * alpha + actualWinRate.winRate * (1 - alpha);
        }

        return winRate;
    }

    private calculateActualWinRateIfPossible(diff: number, dataPoints: ActualWinRate[]): ActualWinRate | null {
        const match = this.interpolate(Math.abs(diff), dataPoints); // Actuals are symmetrical above zero, so apply abs
        if (!match) {
            return null;
        }

        if (diff >= 0) {
            // expected to win, bucket will match
            return match;
        } else {
            // expected to lose, bucket needs to be inverted
            return {
                midpoint: -match.midpoint,
                winRate: 1 - match.winRate,
                numGames: match.numGames,
            };
        }
    }

    private interpolate(absDiff: number, dataPoints: ActualWinRate[]): ActualWinRate | null {
        let below: ActualWinRate = { midpoint: 0, winRate: 0.5, numGames: 0 };
        let above: ActualWinRate = null;

        for (const point of dataPoints) {
            if (point.midpoint <= absDiff) {
                below = point;
            }
            if (point.midpoint >= absDiff) {
                above = point;
                break; // Stop immediately so we keep the lowest point above
            }
        }

        if (!(above && below)) {
            return null;
        } else if (above.midpoint === below.midpoint) {
            return below;
        } else {
            // Linearly interpolate
            const alpha = (absDiff - below.midpoint) / (above.midpoint - below.midpoint);
            return {
                midpoint: absDiff,
                winRate: above.winRate * alpha + below.winRate * (1 - alpha),
                numGames: above.numGames * alpha + below.numGames * (1 - alpha),
            };
        }
    }
}

export const AcoRanked = new Aco({
    k: 10,
    r: 800,
    power: 1,
    numGamesConfidence: 1000,
    lossCap: 2.5,
});

export const AcoUnranked = new Aco({
    k: 10,
    r: 800,
    power: 0,
    numGamesConfidence: 1000,
    lossCap: 2.5,
});

export const AcoMatchmaking = new Aco({
    k: 100,
    r: 800,
    power: 1,
    numGamesConfidence: 1000,
    lossCap: 25,
});