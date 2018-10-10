declare module "glicko2" {
    class Glicko2 {
        constructor(settings: Settings);
        makePlayer(rating?: number, rd?: number, vol?: number): Player;
        makeRace(placings: Player[][]): Race;
        updateRatings(race: Race): void;
    }

    interface Settings {
        tau: number;
        rating: number;
        rd: number;
        vol: number;
    }

    class Player {
        getRating(): number;
        getRd(): number;
        getVol(): number;
    }

    class Race {
    }
}
