import moment from 'moment';
import * as m from '../../game/messages.model';

export interface Stats {
    games: number;
    wins: number;
    kills: number;
    damage: number;
}

export interface GameRow {
    id: string;
    category: string;
    server: string;
    createdTimestamp: moment.Moment;

    self: string;
    winner: string;
    players: Map<string, PlayerStats>;

    lengthSeconds: number;
}

export interface PlayerStats extends Stats {
    name: string;
    userId?: string;
    userHash: string;
    teamId?: string;

    initialNumGames?: number;
    initialAco?: number;
    initialAcoGames?: number;
    initialAcoExposure?: number;
    acoChanges?: m.AcoChangeMsg[];
    acoDelta?: number;
}
