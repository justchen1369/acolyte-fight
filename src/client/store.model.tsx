import Immutable from 'immutable';
import * as d from './stats.model';
import * as e from '../client/modding/editor.model';
import * as m from '../shared/messages.model';
import * as w from '../game/world.model';

export interface State {
    current: PathElements;
    customizing: boolean;
    iconsLoaded?: boolean;

    touched?: boolean;

    seen: number;
    userId?: string;
    loggedIn: boolean;
    tutorialLevel: number;
    showingHelp?: boolean;
    playerName: string;
    keyBindings: KeyBindings;
    rebindings: KeyBindings;
    options: m.GameOptions;
    graphics?: number;

    codeTree?: e.CodeTree;

    modBuiltFrom?: e.CodeTree; // This just signals if mod is not compiled for the current code tree
    mod?: ModTree;
    modErrors: e.ErrorTree;

    socketId: string;
    party: PartyState;
    server: string;
    region: string;
    room: RoomState;
    world: w.World;
    items: NotificationItem[];
    silenced: Set<string>;

    profile: m.GetProfileResponse;
    leaderboard?: m.LeaderboardPlayer[];
    leagues: m.League[];
    allGameStats: Map<string, d.GameStats>; // gameId -> gameStats
    hasReplayLookup: Map<string, string>; // gameId -> url to replay data

    online: Immutable.Map<string, m.OnlinePlayerMsg>;
    onlineSegment: string;
}

export namespace ScoreboardMetric {
    export const Kills = "kills";
    export const Outlasts = "outlasts";
    export const Damage = "damage";
    export const Wins = "wins";
    export const Games = "games";
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
    isLocked: boolean;
    initialObserver: boolean;
    waitForPlayers: boolean;
    members: PartyMemberState[];
}

export interface PartyMemberState {
	socketId: string;
	name: string;
	ready: boolean;
    isObserver: boolean;
    isLeader: boolean;
}

export interface RoomState {
    id: string;
    mod: ModTree;
    settings: AcolyteFightSettings;
}

export interface PathElements {
    path?: string;
    page?: string;
    gameId?: string;
    recordId?: string;
    party?: string;
    server?: string;
    hash?: string;
    profileId?: string;

    gclid?: string;
}

export type Action =
    DisconnectedAction
    | ServerPreparingToShutdownAction
    | UpdateLoadedAction
    | UpdateSeenAction
    | UpdateUserIdAction
    | LogoutAction
    | UpdatePlayerNameAction
    | UpdateKeyBindingsAction
    | UpdateCustomizingAction
    | UpdateOptionsAction
    | UpdateGraphicsAction
    | UpdateUrlAction
    | UpdateHashAction
    | UpdatePageAction
    | UpdateOnlineAction
    | UpdateOnlineSegmentAction
    | JoinMatchAction
    | LeaveMatchAction
    | UpdateNotificationsAction
    | UpdateSilencedAction
    | UpdateRoomAction
    | JoinPartyAction
    | UpdatePartyAction
    | UpdateObservingPartyAction
    | LeavePartyAction
    | ClearNewPlayerFlagAction
    | UpdateShowingHelpAction
    | UpdateToolbarAction
    | UpdateRebindingsAction
    | UpdateServerAction
    | UpdateProfileAction
    | UpdateLeaderboardAction
    | UpdateLeaguesAction
    | UpdateGameStatsAction
    | UpdateHasReplayAction
    | UpdateCodeTreeAction
    | UpdateCodeTreeItemAction
    | DeleteCodeTreeItemAction
    | UpdateModTreeAction
    | InvalidateModTreeAction

export interface UpdateCustomizingAction {
    type: "customizing";
    customizing: boolean;
}

export interface UpdateOnlineAction {
    type: "online";
    all?: boolean;
    joined?: m.OnlinePlayerMsg[];
    left?: string[];
}

export interface UpdateOnlineSegmentAction {
    type: "onlineSegment";
    segment: string;
}

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

export interface UpdateLoadedAction {
    type: "updateLoaded";
    iconsLoaded?: boolean;
}

export interface UpdateSeenAction {
    type: "seen";
    seen: number;
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
    options: Partial<m.GameOptions>;
}

export interface UpdateGraphicsAction {
    type: "graphics";
    graphics: number;
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

export interface UpdateSilencedAction {
    type: "updateSilence";
    add?: string[];
    remove?: string[];
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
    isLocked: boolean;
    initialObserver: boolean;
    waitForPlayers: boolean;
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

export interface ClearNewPlayerFlagAction {
    type: "tutorial";
    tutorialLevel: number;
}

export interface UpdateShowingHelpAction {
    type: "updateShowingHelp";
    showingHelp: boolean;
}

export interface UpdateHoverSpellAction {
    type: "updateHoverSpell";
    hoverSpellId: string;
    hoverBtn: string;
}

export interface UpdateToolbarAction {
    type: "updateToolbar";
    toolbar: Partial<w.ToolbarState>;
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

export interface UpdateLeaderboardAction {
    type: "updateLeaderboard";
    leaderboard: m.LeaderboardPlayer[];
}

export interface UpdateLeaguesAction {
    type: "updateLeagues";
    leagues: m.League[];
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

export interface UpdateModTreeAction {
    type: "updateModTree";
    modBuiltFrom: e.CodeTree;
    mod: ModTree;
    modErrors: e.ErrorTree;
}

export interface InvalidateModTreeAction {
    type: "invalidateModTree";
}

