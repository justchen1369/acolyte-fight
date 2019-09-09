import * as c from '../game/networking.model';
export * from '../game/networking.model';

export const AuthHeader = "x-enigma-auth";
export const AuthCookieName = "enigma-auth";

export const DefaultRoomId = "r-default";
export const UpdateModMinutes = 24 * 60;

export namespace GameCategory {
    export const PvP = "PvP";
    export const PvAI = "PvAI";
    export const AIvAI = "AIvAI";
    export const Mods = "Mods";

    export const AllCategory = "All";

    export const All = [
        PvP,
        PvAI,
        AIvAI,
        Mods,
    ];
}

export namespace LockType {
    export const ModPreview = "mod-preview";
    export const Tutorial = "tutorial";
    export const Blocked = "blocked";
}

export interface GetUserSettingsRequest {
}

export interface GetUserSettingsResponse {
    userId: string;
    loggedIn: boolean;
    name: string;
    buttons: KeyBindings;
    rebindings: KeyBindings;
    options: GameOptions;
}

export interface UpdateUserSettingsRequest {
    name: string;
    buttons: KeyBindings;
    rebindings: KeyBindings;
    options: GameOptions;
}

export interface UpdateUserSettingsResponse {
}

export interface GameOptions {
    wheelOnRight?: boolean;
    noTargetingIndicator?: boolean;
    noCameraFollow?: boolean;
    noRightClickChangeSpells?: boolean;
    noAutoJoin?: boolean;
    mute?: boolean;
    unranked?: boolean;
    graphics?: number;
    touchSurfacePixels?: number;
}

export interface ActionMsgPacket {
    a: c.ActionMsg;
    c: number; // control key
}

export interface SyncMsgPacket {
    g: string;
    s: c.SyncMsg;
}

export interface JoinMsg {
    server: string;
    gameId: string | null;
    room: string | null;
    name: string;
    keyBindings: KeyBindings;
    isMobile: boolean;
    observe: boolean;
    live: boolean;
    autoJoin: boolean;
    locked: string;
    version: string;
    unranked: boolean;
    reconnectKey?: string;
    numBots?: number;
}

export interface JoinResponse {
    success: true;
}
export type JoinResponseMsg = JoinResponse | ErrorResponseMsg;

export interface BotMsg {
    gameId: string;
}

export interface LeaveMsg {
    gameId: string;
}

export interface OnlineControlMsg {
    refresh?: string;
    join?: string;
    leave?: string;
}

export interface OnlineMsg {
    segment: string;
    all?: OnlinePlayerMsg[];
    joined?: OnlinePlayerMsg[];
    changed?: OnlinePlayerMsg[];
    texts?: TextMsg[];
    left?: string[];
}

export interface OnlinePlayerMsg {
    userHash: string;
    userId?: string;
    name: string;

    wins: number;
    damage: number;
    outlasts: number;
    kills: number;
    games: number;
}

export interface SendTextMsg {
    segment: string;
    name: string;
    text: string;
}

export interface TextMsg {
    userHash: string;
    name: string;
    text: string;
}


export interface ErrorResponseMsg {
    success: false;
    error: string;
}

export interface ProxyRequestMsg {
    server: string;
}

export interface ProxyResponse {
    success: true;
    socketId: string;
    server: string;
    region: string;
}

export type ProxyResponseMsg = ProxyResponse | ErrorResponseMsg;


export interface ServerInstanceRequest {
}
export interface ServerInstanceResponse {
    success: true;
    instanceId: string;
    server: string;
    region: string;
}
export type ServerInstanceResponseMsg = ServerInstanceResponse | ErrorResponseMsg;


export interface JoinRoomRequest {
    roomId: string;
}

export interface JoinRoomResponse {
    roomId: string;
    mod: ModTree;
    success: true;
}

export type JoinRoomResponseMsg = JoinRoomResponse | ErrorResponseMsg;

export interface HeroMsg {
    gameId: string;
    universeId: number;
    heroId: string | null; // null means observer
    reconnectKey: string | null; // Use this to reconnect to the same hero ID
    userHash: string | null;

    partyId: string;
    room: string | null;
    locked: string | null;
    autoJoin?: boolean;

    mod: Object;

    live: boolean;
    history: c.TickMsg[];

    splits?: c.SplitMsg[];
}

export interface CreatePartyRequest {
    roomId: string;

    playerName: string;
    keyBindings: KeyBindings;
    isMobile: boolean;
    unranked: boolean;
    version: string;
}
export interface CreatePartyResponse {
    success: true;
    partyId: string;
    roomId: string;
    server: string;
}
export type CreatePartyResponseMsg = CreatePartyResponse | ErrorResponseMsg;


export interface PartyRequest {
    joining: boolean;
    partyId: string;
    playerName: string;
    keyBindings: KeyBindings;
    isMobile: boolean;
    unranked: boolean;
    version: string;
}
export interface PartyResponse extends PartyMsg {
    success: true;
    partyId: string;
    server: string;
    region: string;
}
export type PartyResponseMsg = PartyResponse | ErrorResponseMsg;


export interface PartyStatusRequest {
    partyId: string;
    memberId?: string;
    isLeader?: boolean;
    isObserver?: boolean;
    isReady?: boolean;
    kick?: boolean;
}
export interface PartyStatusResponse {
    success: true;
}
export type PartyStatusResponseMsg = PartyStatusResponse | ErrorResponseMsg;


export interface PartySettingsRequest {
    partyId: string;
    roomId?: string;
    isLocked?: boolean;
    waitForPlayers?: boolean;

    initialObserver?: boolean;
}
export interface PartySettingsResponse {
    success: true;
    partyId: string;
    roomId: string;
    waitForPlayers: boolean;
}
export type PartySettingsResponseMsg = PartySettingsResponse | ErrorResponseMsg;


export interface PartyMsg {
    partyId: string;
    roomId: string;
    members: PartyMemberMsg[];
    isLocked: boolean;
    initialObserver: boolean;
    waitForPlayers: boolean;
}

export interface PartyMemberMsg {
    socketId: string;
    name: string;
    ready: boolean;
    isObserver: boolean;
    isLeader: boolean;
}

export interface ExternalStatus {
    region: string;
    host: string;
    numPlayers: number;
}

export interface InternalStatus {
    region: string;
    host: string;
    numUsers: number;
    numGames: number;
    numPlayers: number;
    numConnections: number;
    serverLoad: number;
}

export interface GameListRequest {
    ids: string[];
}
export interface GameListResponse {
    success: true;
    ids: string[];
}
export type GameListResponseMsg = GameListResponse | ErrorResponseMsg;


export interface CreateRoomRequest {
    mod: ModTree;
}
export interface CreateRoomResponse {
    success: true;
    roomId: string;
    server: string;
}
export type CreateRoomResponseMsg = CreateRoomResponse | ErrorResponseMsg;


export interface GameStatsMsg {
    gameId: string;
    partyId: string;
    category: string;
    unixTimestamp: number;
    winner: string; // userHash
    winners: string[]; // user hashes
    lengthSeconds: number;
    players: PlayerStatsMsg[];
    server: string;
}
export interface PlayerStatsMsg {
    userId?: string;
    userHash: string;
    teamId?: string;
    name: string;
    kills: number;
    outlasts: number;
    damage: number;
    rank: number;
    ticks: number;
    
    initialNumGames?: number;
    initialAco?: number;
    initialAcoGames?: number;
    initialAcoExposure?: number;

    acoDelta?: number;
    acoChanges?: AcoChangeMsg[];
}

export interface AcoChangeMsg {
    otherTeamId?: string;
    delta: number;
    e?: number;
}


export interface GetGameStatsResponse {
    stats: GameStatsMsg[];
}


export interface GetLeaderboardResponse {
    leaderboard: LeaderboardPlayer[];
}
export interface LeaderboardPlayer {
    userId: string;
    name: string;

    aco: number;
    acoGames: number;
    acoExposure: number;

    numGames: number;

    winRate: number;
    damagePerGame: number;
    killsPerGame: number;
}

export interface GetRatingAtPercentileResponse {
    rating: number;
}

export interface GetLeaguesResponse {
    leagues: League[];
}
export interface League {
    name: string;
    minPercentile: number;
    minRating: number;
}

export interface GetProfileResponse {
    userId: string;
    name: string;
    ratings: UserRatingLookup;
    bindings: KeyBindings;
}

export interface UserRatingLookup {
    [category: string]: UserRating;
}

export interface UserRating {
    aco: number;
    acoGames: number;
    acoExposure: number;
    acoPercentile: number;

    numGames: number;
    damagePerGame: number;
    killsPerGame: number;
    winRate: number;
}

export interface FacebookLoginRequest {
    signature: string;
}

export interface FacebookLoginResponse {
    authToken: string;
}

export interface KongregateLoginRequest {
    kongregateId: number;
    signature: string;
}

export interface KongregateLoginResponse {
    authToken: string;
    name: string;
}