import * as d from './stats.model';
import * as m from '../game/messages.model';
import * as w from '../game/world.model';

export interface State {
    current: PathElements;

    userId?: string;
    loggedIn: boolean;
    isNewPlayer: boolean;
    showingHelp: boolean;
    playerName: string;
    keyBindings: KeyBindings;
    rebindings: KeyBindings;
    options: GameOptions;

    aiCode: string;

    socketId: string;
    party: PartyState;
    server: string;
    region: string;
    room: RoomState;
    world: w.World;
    items: NotificationItem[];

    profile: m.GetProfileResponse;
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
    region: string;
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
    path?: string;
    page?: string;
    gameId?: string;
    party?: string;
    server?: string;
    hash?: string;
    profileId?: string;
}

export type Action =
    DisconnectedAction
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
    | UpdateShowingHelpAction
    | CustomizeBtnAction
    | UpdateHoverSpellAction
    | UpdateRebindingsAction
    | UpdateServerAction
    | UpdateProfileAction
    | UpdateGameStatsAction
    | UpdateHasReplayAction

export interface JoinMatchAction {
    type: "joinMatch";
    world: w.World;
}

export interface LeaveMatchAction {
    type: "leaveMatch";
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

export interface UpdateShowingHelpAction {
    type: "updateShowingHelp";
    showingHelp: boolean;
}

export interface CustomizeBtnAction {
    type: "customizeBtn";
    customizingBtn: string;
}

export interface UpdateHoverSpellAction {
    type: "updateHoverSpell";
    hoverSpellId: string;
    hoverBtn: string;
}

export interface UpdateRebindingsAction {
    type: "updateRebindings";
    rebindings: KeyBindings;
}

export interface UpdateServerAction {
    type: "updateServer";
    server: string;
    region: string;
    socketId: string;
}

export interface UpdateProfileAction {
    type: "updateProfile";
    profile: m.GetProfileResponse;
}

export interface UpdateGameStatsAction {
    type: "updateGameStats";
    allGameStats: d.GameStats[];
}

export interface UpdateHasReplayAction {
    type: "updateHasReplay";
    hasReplayLookup: Map<string, boolean>;
}