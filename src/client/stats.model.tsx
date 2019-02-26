export interface GameStats {
    id: string;
    partyId: string;
    category: string;
    timestamp: string;
    self: string; // user hash
    winner?: string; // User hash
    winners?: string[]; // user hashes
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
    teamId?: string;
    name: string;
    kills: number;
    damage: number;
    rank: number;
    ticks: number;
    
    initialNumGames?: number;

    initialAco?: number;
    initialAcoGames?: number;
    initialAcoExposure?: number;

    acoDelta?: number;
    acoChanges?: AcoChangeMsg[];
}

export interface AcoChangeMsg {
    otherTeamId?: string;
    delta: number;
    e?: number;
}