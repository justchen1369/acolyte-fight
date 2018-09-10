export namespace GameCategory {
    export const PvP = "PvP";
    export const PvAI = "PvAI";
    export const AIvAI = "AIvAI";
}

export interface GameStats {
    id: string;
    category: string;
    timestamp: string;
    self: string; // user hash
    winner?: string; // User hash
    lengthSeconds?: number;
    players: PlayerStatsLookup;
    server?: string;
}

export interface PlayerStatsLookup {
    [userHash: string]: PlayerStats;
}

export interface PlayerStats {
    userHash: string;
    name: string;
    kills: number;
    damage: number;
}