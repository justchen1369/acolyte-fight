export class Aco {
    k: number;

    constructor(k: number) {
        this.k = k;
    }

    adjustment(selfRating: number, otherRating: number, score: number) {
        const diff = selfRating - otherRating;
        const e = 1 / (1 + Math.pow(10, -diff / 400));
        return this.k * (score - e) * (1 - e);
    }
}