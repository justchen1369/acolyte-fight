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
    timestamp: Firestore.Timestamp;
}