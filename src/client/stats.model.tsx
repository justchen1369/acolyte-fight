export interface GameStats {
    id: string;
    partyId: string;
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
    userId?: string;
    userHash: string;
    name: string;
    kills: number;
    damage: number;
    rank: number;
    ticks: number;
    ratingDelta?: number;
    acoDelta?: number;
}