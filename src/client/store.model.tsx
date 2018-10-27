import * as d from './stats.model';
import * as w from '../game/world.model';

export interface State {
    current: PathElements;

    userId?: string;
    loggedIn: boolean;
    isNewPlayer: boolean;
    playerName: string;
    keyBindings: KeyBindings;
    rebindings: KeyBindings;
    options: GameOptions;

    aiCode: string;

    socketId: string;
    party: PartyState;
    server: string;
    room: RoomState;
    world: w.World;
    items: NotificationItem[];

    allGameStats: Map<string, d.GameStats>; // gameId -> gameStats
    hasReplayLookup: Map<string, boolean>; // gameId -> hasReplay
}

export interface GameOptions {
    wheelOnRight?: boolean;
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
    isLocked: boolean;
    members: PartyMemberState[];
}

export interface PartyMemberState {
	socketId: string;
	name: string;
	ready: boolean;
	isBot: boolean;
    isObserver: boolean;
    isLeader: boolean;
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
    hash?: string;
    profileId?: string;
}

export type Action =
    UpdateSocketAction
    | DisconnectedAction
    | UpdateUserIdAction
    | UpdatePlayerNameAction
    | UpdateKeyBindingsAction
    | UpdateOptionsAction
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
    | ClearNewPlayerFlagAction
    | UpdateHoverSpellAction
    | UpdateRebindingsAction
    | UpdateServerAction
    | UpdateGameStatsAction
    | UpdateHasReplayAction

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

export interface UpdateUserIdAction {
    type: "updateUserId";
    userId: string;
    loggedIn: boolean;
}

export interface UpdatePlayerNameAction {
    type: "updatePlayerName";
    playerName: string;
}

export interface UpdateKeyBindingsAction {
    type: "updateKeyBindings";
    keyBindings: KeyBindings;
}

export interface UpdateOptionsAction {
    type: "updateOptions";
    options: Partial<GameOptions>;
}

export interface UpdateUrlAction {
    type: "updateUrl";
    current: PathElements;
}

export interface UpdatePageAction {
    type: "updatePage";
    page: string;
    profileId?: string;
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
    members: PartyMemberState[];
    isPrivate: boolean;
    isLocked: boolean;
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

export interface ClearNewPlayerFlagAction {
    type: "clearNewPlayerFlag";
}

export interface UpdateHoverSpellAction {
    type: "updateHoverSpell";
    hoverSpellId: string;
}

export interface UpdateRebindingsAction {
    type: "updateRebindings";
    rebindings: KeyBindings;
}

export interface UpdateServerAction {
    type: "updateServer";
    server: string;
}

export interface UpdateGameStatsAction {
    type: "updateGameStats";
    allGameStats: d.GameStats[];
}

export interface UpdateHasReplayAction {
    type: "updateHasReplay";
    hasReplayLookup: Map<string, boolean>;
}