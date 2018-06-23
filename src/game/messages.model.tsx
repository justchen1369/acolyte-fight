import * as c from './world.model';

export namespace ActionType {
    export const Join = "join";
	export const Leave = "leave";
	export const GameAction = "game";
	export const CloseGame = "close";
}

export type ActionMsg = JoinActionMsg | LeaveActionMsg | CloseGameMsg | GameActionMsg;

export interface ActionMsgBase {
    actionType: string;
    heroId: string;
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

export interface HeroMsg {
    gameId: string;
    heroId: string;
    history: TickMsg[];
}

export interface WatchMsg {
    gameId: string;
    name: string;
}

export interface WatchResponseMsg {
    gameId: string;
    history: TickMsg[];
}