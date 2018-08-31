import * as w from '../game/world.model';

export interface State {
    current: PathElements;

    isNewPlayer: boolean;
    playerName: string;
    keyBindings: KeyBindings;

    aiCode: string;

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
    roomId: string;
    members: w.PartyMemberState[];
    ready: boolean; // TODO: Reselect this out of members[].ready
}

export interface RoomState {
    id: string;
    mod: Object;
    allowBots: boolean;
    settings: AcolyteFightSettings;
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
    | UpdateKeyBindingsAction
    | UpdateUrlAction
    | UpdatePageAction
    | JoinMatchAction
    | LeaveMatchAction
    | UpdateNotificationsAction
    | UpdateRoomAction
    | JoinPartyAction
    | UpdatePartyAction
    | LeavePartyAction
    | UpdateAiCodeAction

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

export interface UpdateKeyBindingsAction {
    type: "updateKeyBindings";
    keyBindings: KeyBindings;
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

export interface UpdateRoomAction {
    type: "updateRoom";
    room: RoomState;
}

export interface JoinPartyAction {
    type: "joinParty";
    party: PartyState;
    server: string;
}

export interface UpdatePartyAction {
    type: "updateParty";
    partyId: string;
    roomId: string;
    members: w.PartyMemberState[];
}

export interface LeavePartyAction {
    type: "leaveParty";
    partyId: string;
}

export interface UpdateAiCodeAction {
    type: "updateAiCode";
    aiCode: string;
}