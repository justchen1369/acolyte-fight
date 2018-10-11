import * as Firestore from '@google-cloud/firestore';

export namespace Collections {
    export const UserSettings = 'userSettings';
    export const UserRating = 'userRating';
    export const GameStats = 'gameStats';
}

export interface UserSettings {
    accessKeys: string[];

    name: string;
    buttons: KeyBindings;
    rebindings: KeyBindings;
}
export interface UserRating {
    rating: number;
    rd: number;
}

export interface GameStats {
    category: string;
    unixTimestamp: number;
    winner: string; // userHash
    lengthSeconds: number;
    players: PlayerStats[];
    userIds: string[];
    server: string;
}
export interface PlayerStats {
    userId?: string;
    userHash: string;
    name: string;
    kills: number;
    damage: number;
}

