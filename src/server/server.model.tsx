import * as m from '../game/messages.model';

export interface ServerStore {
    nextGameId: 0;
    activeGames: Map<string, Game>; // id -> game
    inactiveGames: Map<string, Game>; // id -> game
}

export interface Game {
    id: string;
    active: Map<string, Player>; // socketId -> Player
    started: boolean;
    numPlayers: number;
    tick: number;
	joinable: boolean;
	closeTick: number;
	actions: Map<string, m.ActionMsg>; // heroId -> actionData
	history: m.TickMsg[];
}

export interface Player {
	socketId: string;
	heroId: string;
	name: string;
}
