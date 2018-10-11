import * as Firestore from '@google-cloud/firestore';

export interface UserSettingsData {
    name: string;
    buttons: KeyBindings;
    rebindings: KeyBindings;
}

export interface AccessKeyUserData {
    userId: string;
}

export interface UserGameReference {
    unixTimestamp: number;
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

