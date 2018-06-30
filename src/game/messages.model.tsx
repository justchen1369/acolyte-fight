import * as c from './world.model';

export namespace ActionType {
    export const Environment = "environment";
    export const Join = "join";
	export const Leave = "leave";
	export const GameAction = "game";
	export const CloseGame = "close";
}

export type ActionMsg =
    EnvironmentMsg
    | JoinActionMsg
    | LeaveActionMsg
    | CloseGameMsg
    | GameActionMsg;

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
    playerName: string;
    keyBindings: c.KeyBindings;
}

export interface LeaveActionMsg extends ActionMsgBase {
    actionType: "leave";
}

export interface CloseGameMsg extends ActionMsgBase {
    actionType: "close";
    closeTick: number;
}

export interface GameActionMsg extends ActionMsgBase {
    actionType: "game";
    spellId: string;
    targetX: number;
    targetY: number;
}

export interface TickMsg {
    gameId: string;
    tick: number;
    actions: ActionMsg[];
}

export interface JoinMsg {
    name: string;
    keyBindings: c.KeyBindings;
}

export interface LeaveMsg {
    gameId: string;
}

export interface HeroMsg {
    gameId: string;
    heroId: string;
    history: TickMsg[];
    serverStats: ServerStats;
}

export interface WatchMsg {
    gameId: string;
    name: string;
}

export interface WatchResponseMsg {
    gameId: string;
    history: TickMsg[];
    serverStats: ServerStats;
}

export interface ServerStats {
    numGames: number;
    numPlayers: number;
}