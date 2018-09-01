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
    server: string;
    roomId: string;
    isPrivate: boolean;
    members: w.PartyMemberState[];
    ready: boolean;
    observing: boolean;
}

export interface RoomState {
    id: string;
    mod: Object;
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
    | UpdateObservingPartyAction
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
}

export interface UpdatePartyAction {
    type: "updateParty";
    partyId: string;
    roomId: string;
    members: w.PartyMemberState[];
    isPrivate: boolean;
}

export interface UpdateObservingPartyAction {
    type: "updateObservingParty";
    partyId: string;
    observing: boolean;
}

export interface LeavePartyAction {
    type: "leaveParty";
    partyId: string;
}

export interface UpdateAiCodeAction {
    type: "updateAiCode";
    aiCode: string;
}