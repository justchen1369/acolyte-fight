import * as moment from 'moment';
import * as m from '../game/messages.model';

export interface ServerStore {
    nextGameId: 0;
    numConnections: number;
    activeGames: Map<string, Game>; // id -> game
    inactiveGames: Map<string, Game>; // id -> game
    recentTickMilliseconds: number[];
}

export interface Game {
    id: string;
    room: string | null;
    created: moment.Moment;
    active: Map<string, Player>; // socketId -> Player
    playerNames: string[];
    accessTokens: Set<string>;
    numPlayers: number;
    tick: number;
    joinable: boolean;
    activeTick: number;
	closeTick: number;
	actions: Map<string, m.ActionMsg>; // heroId -> actionData
	history: m.TickMsg[];
}

export interface Player {
	socketId: string;
	heroId: string;
	name: string;
}