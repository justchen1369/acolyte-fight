import * as w from '../../game/world.model';

export interface OptionsProvider {
    source?: string;
    noLogin?: boolean;
    noExternalLinks?: boolean;
    noMenu?: boolean;
    noModding?: boolean;
    noDiscordAd?: boolean;
    noPartyLink?: boolean;

    playerName?: string;
    authToken?: string;

    init(): Promise<void>;
    commercialBreak(): Promise<void>;
    onNotification(notifications: w.Notification[]): void;
}