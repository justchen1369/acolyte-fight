export class Aco {
    k: number;
    power: number;

    constructor(k: number, power: number) {
        this.k = k;
        this.power = power;
    }

    adjustment(selfRating: number, otherRating: number, score: number, weight: number = 1): AcoAdjustment {
        const diff = selfRating - otherRating;
        const e = 1 / (1 + Math.pow(10, -diff / 400));
        const learnRate = Math.pow(1 - e, this.power) * weight;
        const delta = this.k * (score - e) * learnRate;

        return { delta, e, learnRate };
    }
}

export interface AcoAdjustment {
    delta: number;
    e: number;
    learnRate: number;
}