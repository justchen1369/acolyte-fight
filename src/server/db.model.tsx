export interface UserSettingsData {
    name: string;
    buttons: KeyBindings;
    rebindings: KeyBindings;
}

export interface AccessKeyUserData {
    userId: string;
}

export interface UserGameReference {
    gameId: string;
    unixTimestamp: number;
}