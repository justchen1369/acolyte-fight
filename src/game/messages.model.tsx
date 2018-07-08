import * as c from './world.model';

export const AuthCookieName = "enigma-auth";

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
    gameId: string | null;
    room: string | null;
    name: string;
    keyBindings: c.KeyBindings;
    observe: boolean;
}

export interface LeaveMsg {
    gameId: string;
}

export interface ProxyRequestMsg {
    server: string;
}

export interface ProxyResponseMsg {
    error?: string;
}

export interface HeroMsg {
    gameId: string;
    heroId: string | null; // null means observer
    room: string | null;
    history: TickMsg[];
    numGames: number;
    numPlayers: number;
}

export interface ServerStats {
    numGames: number;
    numPlayers: number;
    serverLoad: number;
}

export interface GameListMsg {
    games: GameMsg[];
}

export interface GameMsg {
    id: string;
    createdTimestamp: string;
    playerNames: string[];
    numActivePlayers: number;
    joinable: boolean;
    numTicks: number;
}

export interface LocationMsg {
    currentRegion: string;
    targetRegion: string;

    targetServer: string;
    currentServer: string;
}