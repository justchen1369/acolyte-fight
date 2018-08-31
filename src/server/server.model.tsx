import * as moment from 'moment';
import * as m from '../game/messages.model';

export interface ServerStore {
    nextGameId: 0;
    nextPartyId: 0;
    numConnections: number;
    rooms: Map<string, Room>; // id -> room
    parties: Map<string, Party>; // id -> party
    activeGames: Map<string, Game>; // id -> game
    inactiveGames: Map<string, Game>; // id -> game
    recentTickMilliseconds: number[];
}

export interface LocationStore {
    server: string;
    upstreamSuffix: string;
}

export interface Game {
    id: string;
    roomId: string | null;
    created: moment.Moment;

    mod: Object;
    allowBots: boolean;

    active: Map<string, Player>; // socketId -> Player
    bots: Map<string, string>; // heroId -> socketId
    playerNames: string[];
    accessTokens: Set<string>;
    numPlayers: number;

    tick: number;

    startManually?: boolean;
    joinable: boolean;
    activeTick: number;
    closeTick: number;

	actions: Map<string, m.ActionMsg>; // heroId -> actionData
	history: m.TickMsg[];
}

export interface Player {
    socketId: string;
    partyId: string;
	heroId: string;
    name: string;
}

export interface Room {
    id: string;
    created: moment.Moment;
    accessed: moment.Moment;
    mod: Object;
    allowBots: boolean;
}

export interface Party {
    id: string;
    roomId: string;
    created: moment.Moment;
    modified: moment.Moment;
    active: Map<string, PartyMember>; // socketId -> party member
    isPrivate: boolean;
}

export interface PartyMember {
    socketId: string;
    name: string;
    authToken: string;
    keyBindings: KeyBindings;
    isBot: boolean;
    isMobile: boolean;
    ready: boolean;
}