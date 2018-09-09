export interface GameStats {
    id: string;
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