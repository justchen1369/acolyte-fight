import Immutable from 'immutable';
import * as d from './stats.model';
import * as e from '../client/modding/editor.model';
import * as m from '../shared/messages.model';
import * as w from '../game/world.model';

export interface State {
    current: PathElements;

    customizing: boolean;
	customizingBtn?: string;
    iconsLoaded?: boolean;

    touched?: boolean;

    seen: number;
    userHash?: string;
    userId?: string;
    loggedIn: boolean;
    tutorialLevel: number;
    showingHelp?: boolean;

    playerName: string;

    keyBindings: KeyBindings;
    rebindings: KeyBindings;
    options: m.GameOptions;
    loadouts: m.Loadout[];

    graphics?: number;
    showingPerformance?: PerformanceTab;
    showingChat?: boolean;

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
    messages: MessageItem[];
    silenced: Set<string>;

    performance: PerformanceState;
    globalPerformance: PerformanceState;

    profile: m.GetProfileResponse;
    leaderboard?: m.LeaderboardPlayer[];
    leagues: m.League[];
    allGameStats: Map<string, d.GameStats>; // gameId -> gameStats
    hasReplayLookup: Map<string, string>; // gameId -> url to replay data

    online: Immutable.Map<string, m.OnlinePlayerMsg>;
    onlineSegment: string;
}

export enum PerformanceTab {
    None = "None",
    CPU = "CPU",
    GPU = "GPU",
    Network = "Network",
}

export namespace ScoreboardMetric {
    export const Kills = "kills";
    export const Outlasts = "outlasts";
    export const Damage = "damage";
    export const Wins = "wins";
    export const Games = "games";
}

export interface MessageItem {
    key: string;
    message: Message;
    duration: number;
    expiryTime: number;
}

export interface PerformanceState {
    cpuLag: number;
    gpuLag: number;
    networkLag: number;
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
    team: number;
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

export type Message =
    TextMessage
    | WinMessage
    | JoinMessage
    | LeaveMessage
    | SplitMessage
    | KillMessage
    | StartingMessage
    | TeamsMessage
    | RatingMessage
    | ReminderMessage
    | DisconnectedMessage

export interface MessageBase {
    type: string;
    gameId?: string; // Only display this message if currently in this game
}

export interface JoinMessage extends MessageBase {
	type: "join";
	players: w.Player[];
}

export interface LeaveMessage extends MessageBase {
	type: "leave";
	players: w.Player[];
}

export interface SplitMessage extends MessageBase {
	type: "split";
	players: w.Player[];
}

export interface KillMessage extends MessageBase {
	type: "kill";
	myHeroId: number;
	killed: w.Player;
	killer: w.Player | null;
}

export interface StartingMessage extends MessageBase {
	type: "starting";
	ticksUntilClose: number;
	message: string;
}

export interface TeamsMessage extends MessageBase {
	type: "teams";
	teamSizes?: number[];
}

export interface WinMessage extends MessageBase {
	type: "win";
	myHeroId: number;
	winners: w.Player[];

	mostDamage: w.Player;
	mostDamageAmount: number;

	mostKills: w.Player;
	mostKillsCount: number;
}

export interface TextMessage extends MessageBase {
	type: "text";
	userHash: string;
	name: string;
	text: string;
}

export interface ReminderMessage extends MessageBase {
    type: "reminder";
    reminder: string;
}

export interface RatingMessage extends MessageBase {
	type: "ratingAdjustment";
	gameId: string;
	initialNumGames: number;
	initialAco: number;
	initialAcoExposure: number;
	acoDelta: number;
    category: string;
}

export interface DisconnectedMessage extends MessageBase {
	type: "disconnected";
}

export type Action =
    DisconnectedAction
    | ServerPreparingToShutdownAction
    | UpdateLoadedAction
    | UpdateSeenAction
    | UpdateUserIdAction
    | LogoutAction
    | UpdateTouchedAction
    | UpdatePlayerNameAction
    | UpdateKeyBindingsAction
    | UpdateCustomizingAction
    | UpdateCustomizingBtnAction
    | UpdateOptionsAction
    | UpdateLoadoutsAction
    | UpdateGraphicsAction
    | UpdateUrlAction
    | UpdateHashAction
    | UpdatePageAction
    | UpdateOnlineAction
    | UpdateOnlineSegmentAction
    | JoinMatchAction
    | LeaveMatchAction
    | UpdatePerformanceAction
    | UpdateGlobalPerformanceAction
    | UpdateShowingPerformanceAction
    | UpdateShowingChatAction
    | UpdateMessagesAction
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

export interface UpdateCustomizingBtnAction {
    type: "customizingBtn";
    customizingBtn: string;
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

export interface UpdatePerformanceAction {
    type: "performance";
    performance?: PerformanceState;
}

export interface UpdateGlobalPerformanceAction {
    type: "globalPerformance";
    globalPerformance?: PerformanceState;
}

export interface UpdateShowingPerformanceAction {
    type: "showingPerformance";
    showingPerformance: PerformanceTab;
}

export interface UpdateShowingChatAction {
    type: "showingChat";
    showingChat: boolean;
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
    userHash: string;
    userId: string;
    loggedIn: boolean;
}

export interface LogoutAction {
    type: "logout";
}

export interface UpdateTouchedAction {
    type: "touched";
    touched: boolean;
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

export interface UpdateLoadoutsAction {
    type: "loadouts";
    loadouts: m.Loadout[];
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

export interface UpdateMessagesAction {
    type: "messages";
    messages: MessageItem[];
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

