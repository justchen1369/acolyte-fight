import * as w from '../game/world.model';

export interface Store {
    socketId: string;
    party: PartyState;
    world: w.World;
    items: NotificationItem[];
}

export interface NotificationItem {
    key: string;
    notification: w.Notification;
    expiryTime: number;
}

export interface PartyState {
    id: string;
    members: w.PartyMemberState[];
    ready: boolean;
}

export interface RoomState {
    id: string;
    mod: Object;
    allowBots: boolean;
}