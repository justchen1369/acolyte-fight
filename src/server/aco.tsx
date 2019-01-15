export class Aco {
    k: number;
    power: number;

    constructor(k: number, power: number) {
        this.k = k;
        this.power = power;
    }

    adjustment(selfRating: number, otherRating: number, score: number) {
        const diff = selfRating - otherRating;
        const e = 1 / (1 + Math.pow(10, -diff / 400));
        const learnRate = Math.pow(1 - e, this.power);
        return this.k * (score - e) * learnRate;
    }
}