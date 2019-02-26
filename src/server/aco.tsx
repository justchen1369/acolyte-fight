const EloWinRateCap = 0.76;
const EloR = 400;
const AcoK = 10;
const AcoR = 800;
const AcoPower = 1;

function calculateWinRate(diff: number, r: number) {
    return 1 / (1 + Math.pow(10, -diff / r));
}

export class Aco {
    adjustment(selfRating: number, otherRating: number, score: number, weight: number = 1): AcoAdjustment {
        const diff = selfRating - otherRating;
        const eloWinRate = calculateWinRate(diff, EloR)
        const acoWinRate = calculateWinRate(diff, AcoR)
        const winRate = Math.max(Math.min(eloWinRate, EloWinRateCap), acoWinRate);
        const learnRate = Math.pow(1 - winRate, AcoPower) * weight;
        const delta = AcoK * (score - winRate) * learnRate;

        return { delta, e: winRate, learnRate };
    }
}

export interface AcoAdjustment {
    delta: number;
    e: number;
    learnRate: number;
}