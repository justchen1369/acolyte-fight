import * as c from './world.model';

export const AuthCookieName = "enigma-auth";

export namespace GameCategory {
    export const PvP = "PvP";
    export const PvAI = "PvAI";
    export const AIvAI = "AIvAI";
    export const Mods = "Mods";

    export const All = [
        PvP,
        PvAI,
        AIvAI,
        Mods,
    ];
}

export namespace ActionType {
    export const Environment = "environment";
    export const Join = "join";
    export const Bot = "bot";
	export const Leave = "leave";
	export const GameAction = "game";
	export const CloseGame = "close";
	export const Text = "text";
}

export interface GetUserSettingsRequest {
}

export interface GetUserSettingsResponse {
    userId: string;
    loggedIn: boolean;
    name: string;
    buttons: KeyBindings;
    rebindings: KeyBindings;
}

export interface UpdateUserSettingsRequest {
    name: string;
    buttons: KeyBindings;
    rebindings: KeyBindings;
}

export interface UpdateUserSettingsResponse {
}

export type ActionMsg =
    EnvironmentMsg
    | JoinActionMsg
    | BotActionMsg
    | LeaveActionMsg
    | CloseGameMsg
    | GameActionMsg
    | TextMsg

export interface ActionMsgBase {
    actionType: string;
    gameId: string;
    heroId: string;
}

export interface EnvironmentMsg extends ActionMsgBase {
    actionType: "environment";
    seed: number;
}

export interface JoinActionMsg extends ActionMsgBase {
    actionType: "join";
    userId: string | null;
    userHash: string | null;
    playerName: string;
    keyBindings: KeyBindings;
    isBot: boolean;
    isMobile: boolean;
}

export interface BotActionMsg extends ActionMsgBase {
    actionType: "bot";
    keyBindings: KeyBindings;
}

export interface LeaveActionMsg extends ActionMsgBase {
    actionType: "leave";
}

export interface CloseGameMsg extends ActionMsgBase {
    actionType: "close";
    closeTick: number;
    waitPeriod: number;
}

export interface GameActionMsg extends ActionMsgBase {
    actionType: "game";
    spellId: string;
    targetX: number;
    targetY: number;
}

export interface TextMsg extends ActionMsgBase {
    actionType: "text";
    text: string;
}

export interface TickMsg {
    gameId: string;
    tick: number;
    actions: ActionMsg[];
}

export interface JoinMsg {
    gameId: string | null;
    privatePartyId: string | null;
    room: string | null;
    name: string;
    keyBindings: KeyBindings;
    isBot: boolean;
    isMobile: boolean;
    observe: boolean;
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

export interface ErrorResponseMsg {
    success: false;
    error: string;
}

export interface ProxyRequestMsg {
    server: string;
}

export interface ProxyResponse {
    success: true;
    server: string;
}

export type ProxyResponseMsg = ProxyResponse | ErrorResponseMsg;


export interface ServerInstanceRequest {
}
export interface ServerInstanceResponse {
    success: true;
    instanceId: string;
    server: string;
}
export type ServerInstanceResponseMsg = ServerInstanceResponse | ErrorResponseMsg;


export interface JoinRoomRequest {
    roomId: string;
}

export interface JoinRoomResponse {
    success: true;
    roomId: string;
    mod: Object;
}

export type JoinRoomResponseMsg = JoinRoomResponse | ErrorResponseMsg;

export interface HeroMsg {
    gameId: string;
    heroId: string | null; // null means observer
    isPrivate: boolean;
    privatePartyId: string | null;
    room: string | null;

    mod: Object;
    allowBots: boolean;

    history: TickMsg[];
    numPlayersPublic: number;
    numPlayersInCategory: number;
}

export interface CreatePartyRequest {
    roomId: string;
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
    isBot: boolean;
    isMobile: boolean;
    isObserver: boolean;
    ready: boolean;
}
export interface PartyResponse {
    success: true;
    partyId: string;
    members: PartyMemberMsg[];
    roomId: string;
    server: string;
    isPrivate: boolean;
}
export type PartyResponseMsg = PartyResponse | ErrorResponseMsg;


export interface PartySettingsRequest {
    partyId: string;
    roomId?: string;
    isPrivate?: boolean;
}
export interface PartySettingsResponse {
    success: true;
    partyId: string;
    roomId: string;
    isPrivate: boolean;
}
export type PartySettingsResponseMsg = PartySettingsResponse | ErrorResponseMsg;


export interface LeavePartyRequest {
    partyId: string;
}
export interface LeavePartyResponse {
    success: true;
    partyId: string;
}
export type LeavePartyResponseMsg = LeavePartyResponse | ErrorResponseMsg;


export interface PartyMsg {
    partyId: string;
    roomId: string;
    members: PartyMemberMsg[];
    isPrivate: boolean;
}

export interface PartyMemberMsg {
    socketId: string;
    name: string;
    ready: boolean;
    isBot: boolean;
    isObserver: boolean;
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
    breakdown: Object;
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
    mod: Object;
}
export interface CreateRoomResponse {
    success: true;
    roomId: string;
    server: string;
}
export type CreateRoomResponseMsg = CreateRoomResponse | ErrorResponseMsg;


export interface GameStatsMsg {
    gameId: string;
    category: string;
    unixTimestamp: number;
    winner: string; // userHash
    lengthSeconds: number;
    players: PlayerStatsMsg[];
    server: string;
}
export interface PlayerStatsMsg {
    userId?: string;
    userHash: string;
    name: string;
    kills: number;
    damage: number;
    ratingDelta?: number;
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
    rating: number;
    rd: number;
    lowerBound: number;
    numGames: number;
}

export interface GetDistributionsResponse {
    [category: string]: number[];
}

export interface GetProfileResponse {
    userId: string;
    name: string;
    ratings: UserRatingLookup;
}

export interface UserRatingLookup {
    [category: string]: UserRating;
}

export interface UserRating {
    rating: number;
    rd: number;
    lowerBound: number;
    numGames: number;
    damagePerGame: number;
    killsPerGame: number;
    winRate: number;
    percentile: number;
}