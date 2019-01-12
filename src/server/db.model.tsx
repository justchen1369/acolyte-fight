import * as Firestore from '@google-cloud/firestore';
import * as m from '../game/messages.model';

export namespace Collections {
    export const User = 'user';
    export const UserRatingHistory = 'ratingHistory';
    export const AcoDecay = 'acoDecay';
    export const Game = 'game';
    export const GlobalMod = 'mod';
}

export interface GlobalMod {
    json: string;
}

export interface RatingDecaySingleton {
    updated: Firestore.Timestamp;
}

export interface User {
    accessed: Firestore.Timestamp;
    loggedIn: boolean;
    accessKeys: string[];
    settings: UserSettings;
    ratings: UserRatingLookup;
}
export interface UserSettings {
    name: string;
    buttons: KeyBindings;
    rebindings: KeyBindings;
    options: m.GameOptions;
}
export interface UserRatingLookup {
    [category: string]: UserRating;
}
export interface UserRating {
    rating: number;
    rd: number;
    lowerBound?: number;
    acoExposure?: number;
    aco?: number;
    acoGames?: number;
    numGames: number;
    killsPerGame: number;
    damagePerGame: number;
    winRate: number;
}

export interface UserRatingHistoryItem {
    unixDate: number;
    ratings: UserRatingLookup;
}

export interface AcoDecayKey {
    userId: string;
    category: string;
    unixCeiling: number;
}
export interface AcoDecay extends AcoDecayKey {
    acoDelta: number;
    acoGamesDelta: number;
}

export interface Game {
    unixTimestamp: number;
    userIds: string[];
    partyId: string;
    stats: GameStats;
}
export interface GameStats {
    category: string;
    winner: string; // userHash
    winnerUserId?: string;
    lengthSeconds: number;
    players: PlayerStats[];
    server: string;
}
export interface PlayerStats {
    userId?: string;
    userHash: string;
    name: string;
    kills: number;
    damage: number;
    ticks: number;
    rank: number;
    ratingDelta?: number;
}

