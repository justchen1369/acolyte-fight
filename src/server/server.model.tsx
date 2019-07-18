import * as moment from 'moment';
import * as m from '../game/messages.model';

export interface ServerStore {
    nextGameId: 0;
    nextPartyId: 0;
    numConnections: number;
    scoreboards: Map<string, Scoreboard>; // partyId.gameCategory -> OnlineList
    rooms: Map<string, Room>; // id -> room
    parties: Map<string, Party>; // id -> party
    joinableGames: Set<string>; // game ids
    activeGames: Map<string, Game>; // id -> game
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

export interface Replay {
    id: string;
    segment: string;

    roomId: string | null;
    partyId: string | null;
    isPrivate: boolean;
    locked: string | null;

    mod: Object;

    numPlayers: number;
	history: m.TickMsg[];
}

export interface Game extends Replay {
    created: moment.Moment;

    active: Map<string, Player>; // socketId -> Player
    bots: Map<string, string>; // heroId -> socketId
    reconnectKeys: Map<string, string>; // key -> heroId
    playerNames: string[];
    isRankedLookup: Map<string, boolean>; // userId -> boolean
    socketIds: Set<string>;

    tick: number;
    winTick: number | null;

    scores: Map<string, m.GameStatsMsg>; // socketId -> final score
    joinable: boolean;
    activeTick: number;
    closeTick: number;
    ranked: boolean;

    actions: Map<string, m.ActionMsg>; // heroId -> actionData

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

    numActionMessages: number;
}

export interface Room {
    id: string;
    created: moment.Moment;
    accessed: moment.Moment;
    mod: ModTree;
    isCustom: boolean;
}

export interface Party extends PartyStatus {
    id: string;
    created: moment.Moment;
    modified: moment.Moment;
    active: Map<string, PartyMember>; // socketId -> party member
}

export interface PartyStatus {
    roomId: string;
    isPrivate: boolean;
    waitForPlayers: boolean;
    isLocked: boolean;
    initialObserver: boolean;
}

export interface PartyMember extends JoinParameters, PartyMemberStatus {
}

export interface JoinParameters {
    socketId: string;
    userHash: string;
    partyHash?: string;
    name: string;
    authToken: string;
    keyBindings: KeyBindings;
    isMobile: boolean;
    unranked: boolean;
    version: string;
    reconnectKey?: string;
}

export interface PartyMemberStatus {
    ready: boolean;
    isObserver: boolean;
    isLeader: boolean;
}

export interface PartyGameAssignment {
	partyMember: PartyMember;
	game: Game;
    heroId: string;
    reconnectKey: string;
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