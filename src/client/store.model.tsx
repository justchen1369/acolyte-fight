import * as w from '../game/world.model';

export interface State {
    current: PathElements;

    isNewPlayer: boolean;
    playerName: string;
    keyBindings: KeyBindings;

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

export type Action =
    UpdateSocketAction
    | UpdatePlayerNameAction
    | UpdateUrlAction
    | UpdatePageAction
    | UpdateServerAction
    | UpdateWorldAction
    | UpdateNotificationsAction

export interface UpdateWorldAction {
    type: "updateWorld";
    world: w.World;
}

export interface UpdateSocketAction {
    type: "updateSocket";
    socketId: string;
}

export interface UpdatePlayerNameAction {
    type: "updatePlayerName";
    playerName: string;
}

export interface UpdateUrlAction {
    type: "updateUrl";
    current: PathElements;
}

export interface UpdatePageAction {
    type: "updatePage";
    page: string;
}

export interface UpdateServerAction {
    type: "updateServer";
    server: string;
}

export interface UpdateNotificationsAction {
    type: "updateNotifications";
    items: NotificationItem[];
}