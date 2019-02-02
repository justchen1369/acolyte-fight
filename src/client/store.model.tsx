import * as d from './stats.model';
import * as e from '../client/modding/editor.model';
import * as m from '../game/messages.model';
import * as w from '../game/world.model';

export interface State {
    current: PathElements;
    ads?: string;

    userId?: string;
    loggedIn: boolean;
    isNewPlayer: boolean;
    showingHelp: boolean;
    playerName: string;
    keyBindings: KeyBindings;
    rebindings: KeyBindings;
    options: GameOptions;

    aiCode: string;

    codeTree?: e.CodeTree;

    socketId: string;
    party: PartyState;
    server: string;
    region: string;
    room: RoomState;
    world: w.World;
    items: NotificationItem[];

    profile: m.GetProfileResponse;
    allGameStats: Map<string, d.GameStats>; // gameId -> gameStats
    hasReplayLookup: Map<string, string>; // gameId -> url to replay data
}

export interface GameOptions {
    wheelOnRight?: boolean;
    noTargetingIndicator?: boolean;
    mute?: boolean;
    unranked?: boolean;
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

    gclid?: string;
}

export type Action =
    DisconnectedAction
    | ServerPreparingToShutdownAction
    | UpdateAdsAction
    | UpdateUserIdAction
    | LogoutAction
    | UpdatePlayerNameAction
    | UpdateKeyBindingsAction
    | UpdateOptionsAction
    | UpdateUrlAction
    | UpdateHashAction
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
    | UpdateCodeTreeAction
    | UpdateCodeTreeItemAction
    | DeleteCodeTreeItemAction

export interface JoinMatchAction {
    type: "joinMatch";
    world: w.World;
}

export interface LeaveMatchAction {
    type: "leaveMatch";
}

export interface ServerPreparingToShutdownAction {
    type: "serverPreparingToShutdown";
}

export interface DisconnectedAction {
    type: "disconnected";
}

export interface UpdateAdsAction {
    type: "updateAds";
    ads: string;
}

export interface UpdateUserIdAction {
    type: "updateUserId";
    userId: string;
    loggedIn: boolean;
}

export interface LogoutAction {
    type: "logout";
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

export interface UpdateHashAction {
    type: "updateHash";
    hash: string;
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
    hasReplayLookup: Map<string, string>;
}

export interface UpdateCodeTreeAction {
    type: "updateCodeTree";
    codeTree: e.CodeTree;
}

export interface UpdateCodeTreeSectionAction {
    type: "updateCodeSection";
    sectionKey: string;
    section: e.CodeSection;
}

export interface UpdateCodeTreeItemAction {
    type: "updateCodeItem";
    sectionKey: string;
    itemId: string;
    code: string;
}

export interface DeleteCodeTreeItemAction {
    type: "deleteCodeItem";
    sectionKey: string;
    itemId: string;
}



export interface OptionsProvider {
    source?: string;
    noLogin?: boolean;
    noExternalLinks?: boolean;
    noScrolling?: boolean;
    noMenu?: boolean;
    noAdvanced?: boolean;
    noDiscordAd?: boolean;
    noPartyLink?: boolean;

    playerName?: string;
    authToken?: string;

    init(): Promise<void>;
    commercialBreak(): Promise<void>;
    onNotification(notifications: w.Notification[]): void;
}
