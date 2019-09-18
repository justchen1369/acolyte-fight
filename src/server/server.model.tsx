import * as moment from 'moment';
import * as m from '../shared/messages.model';

export interface ServerStore {
    nextGameId: 0;
    nextPartyId: 0;
    numConnections: number;
    scoreboards: Map<string, Scoreboard>; // partyId.gameCategory -> OnlineList
    rooms: Map<string, Room>; // id -> room
    parties: Map<string, Party>; // id -> party
    joinableGames: Set<string>; // game ids
    activeGames: Map<string, Game>; // id -> game
    assignments: Map<string, string>; // socketId -> gameId
    storedGameIds: Set<string>;
    recentTickMilliseconds: number[];
}

export interface LocationStore {
    region: string;
    server: string;
    upstreamSuffix: string;
}

export interface User {
    userId: string;
    loggedIn: boolean;
    settings: UserSettings;
}

export interface UserSettings {
    name: string;
    buttons: KeyBindings;
    rebindings: KeyBindings;
    options: m.GameOptions;
}

export interface UserRatingLookup {
    [category: string]: UserRating;
}

export interface UserRating {
    aco: number;
    acoGames: number;
    acoUnranked: number;
    acoDeflate: number;

    numGames: number;
    killsPerGame: number;
    damagePerGame: number;
    winRate: number;
}

// Don't forget to deep clone in games.cloneGame(...)
export interface Game extends m.Replay {
    created: moment.Moment;

    matchmaking: MatchmakingSettings;

    active: Map<string, Player>; // socketId -> Player
    bots: Map<string, string>; // heroId -> socketId
    controlKeys: Map<number, string>; // controlKey -> heroId
    reconnectKeys: Map<string, string>; // key -> heroId
    isRankedLookup: Map<string, boolean>; // userId -> boolean
    socketIds: Set<string>;
    observers: Map<string, Observer>; // socketIds
    nextPlayerId: number;

    tick: number;
    winTick: number | null;
    finished?: boolean;

    scores: Map<string, m.GameStatsMsg>; // socketId -> final score
    joinable: boolean;
    activeTick: number;
    closeTick: number;
    ranked: boolean;

    matched?: boolean;

    actions: Map<string, m.ActionMsg>; // heroId -> actionData
    controlMessages: m.ControlMsg[];
    syncMessage: m.SyncMsg;

    splits: m.SplitMsg[];
    syncTick: number;
}

export interface Player {
    socketId: string;
    partyId: string;
    heroId: string;
    userHash: string;
    userId?: string;
    name: string;
    unranked: boolean;
    autoJoin?: boolean;
    aco: number;

    controlKey: number;
    numActionMessages: number;
}

export interface Observer {
    socketId: string;
    partyId: string;
    userHash: string;
    userId?: string;
    name: string;
    autoJoin?: boolean;
}

export interface Correlation {
    id: number;
    socketId: string;
    gameId: string;
}

export interface Room {
    id: string;
    created: moment.Moment;
    accessed: moment.Moment;
    mod: ModTree;
    isCustom: boolean;

    Matchmaking: MatchmakingSettings;
}

export interface Party extends PartyStatus {
    id: string;
    created: moment.Moment;
    modified: moment.Moment;
    active: Map<string, PartyMember>; // socketId -> party member
}

export interface PartyStatus {
    roomId: string;
    waitForPlayers: boolean;
    isLocked: boolean;
    initialObserver: boolean;
}

export interface PartyMember extends JoinParameters, PartyMemberStatus {
}

export interface JoinParameters {
    socketId: string;
    userHash: string;
    name: string;
    authToken: string;
    keyBindings: KeyBindings;
    isMobile: boolean;
    unranked: boolean;
    version: string;
    reconnectKey?: string;
    autoJoin?: boolean;
    live?: boolean;
    numGames: number;
}

export interface PartyMemberStatus {
    ready: boolean;
    isObserver: boolean;
    isLeader: boolean;
}

export interface JoinResult {
	socketId: string;
	game: m.Replay;
	live: boolean;

    heroId?: string;
    controlKey?: number;
	reconnectKey?: string;
    autoJoin?: boolean;
    splits?: m.SplitMsg[];
}

export interface Scoreboard {
    segment: string;
    online: Map<string, OnlinePlayer>; // userHash -> OnlinePlayer
    scores: Map<string, PlayerScore>; // userHash -> Score
    messages: TextMessage[];
}

export interface TextMessage {
    timestamp: number; // Date.now()
    msg: m.TextMsg;
}

export interface OnlinePlayer {
    userHash: string; // or socket id
    userId?: string;
    name: string;
}

export interface PlayerScore {
    userHash: string;
    userId?: string;
    name: string;
    outlasts: number;
    wins: number;
    kills: number;
    damage: number;
    games: number;
    expiry: number; // unix timestamp
}