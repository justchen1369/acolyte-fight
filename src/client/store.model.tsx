import * as w from '../game/world.model';

export interface State {
    current: PathElements;

    isNewPlayer: boolean;
    playerName: string;
    keyBindings: KeyBindings;

    socketId: string;
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
    ready: boolean; // TODO: Reselect this out of members[].ready
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
    | DisconnectedAction
    | UpdatePlayerNameAction
    | UpdateUrlAction
    | UpdatePageAction
    | JoinMatchAction
    | LeaveMatchAction
    | UpdateNotificationsAction
    | JoinPartyAction
    | UpdatePartyAction
    | LeavePartyAction

export interface JoinMatchAction {
    type: "joinMatch";
    world: w.World;
}

export interface LeaveMatchAction {
    type: "leaveMatch";
}

export interface UpdateSocketAction {
    type: "updateSocket";
    socketId: string;
}

export interface DisconnectedAction {
    type: "disconnected";
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

export interface UpdateNotificationsAction {
    type: "updateNotifications";
    items: NotificationItem[];
}

export interface JoinPartyAction {
    type: "joinParty";
    party: PartyState;
    server: string;
}

export interface UpdatePartyAction {
    type: "updateParty";
    partyId: string;
    members: w.PartyMemberState[];
}

export interface LeavePartyAction {
    type: "leaveParty";
    partyId: string;
}