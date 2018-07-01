import * as moment from 'moment';
import * as m from '../game/messages.model';

export interface ServerStore {
    nextGameId: 0;
    activeGames: Map<string, Game>; // id -> game
    inactiveGames: Map<string, Game>; // id -> game
}

export interface Game {
    id: string;
    created: moment.Moment;
    active: Map<string, Player>; // socketId -> Player
    playerNames: string[];
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
