import * as w from '../game/world.model';

export interface State {
    current: PathElements;
    socketId: string;
    preferredColors: Map<string, string>; // player name -> color
    party: PartyState;
    room: RoomState;
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

export interface PathElements {
    page?: string;
    gameId?: string;
    party?: string;
    server?: string;
}