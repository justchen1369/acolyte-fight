import * as Firestore from '@google-cloud/firestore';

export namespace Collections {
    export const User = 'user';
    export const Game = 'game';
}

export interface User {
    accessKeys: string[];
    settings: UserSettings;
    ratings: UserRatingLookup;
}
export interface UserSettings {
    name: string;
    buttons: KeyBindings;
    rebindings: KeyBindings;
}
export interface UserRatingLookup {
    [category: string]: UserRating;
}
export interface UserRating {
    rating: number;
    rd: number;
    lowerBound: number;
}

export interface Game {
    unixTimestamp: number;
    userIds: string[];
    stats: GameStats;
}
export interface GameStats {
    category: string;
    winner: string; // userHash
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
}

