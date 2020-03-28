export namespace ActionType {
    export const Environment = "environment";
    export const Join = "join";
    export const Bot = "bot";
	export const Leave = "leave";
	export const GameAction = "game";
    export const CloseGame = "close";
    export const Teams = "teams";
    export const Finish = "finish";
    export const Spells = "spells";
    export const Sync = "sync";
}

export interface TickMsg {
    u: number; // universe ID
    t: number; // tick
    a?: ActionMsg[];
    c?: ControlMsg[];
    s?: SyncMsg;
}

export type ActionMsg =
    | GameActionMsg
    | SpellsMsg

export interface ActionMsgBase {
    type: string;
    c: number; // controlKey
}

export type ControlMsg =
    EnvironmentMsg
    | JoinActionMsg
    | BotActionMsg
    | LeaveActionMsg
    | CloseGameMsg
    | TeamsMsg
    | FinishGameMsg

export interface ControlMsgBase {
    type: string;
}

export interface EnvironmentMsg extends ControlMsgBase {
    type: "environment";
    seed: number;
}

export interface JoinActionMsg extends ControlMsgBase {
    type: "join";
    heroId: string;
    controlKey: number;
    userId: string | null;
    userHash: string | null;
    playerName: string;
    keyBindings: KeyBindings;
    isMobile: boolean;
    numGames: number;
}

export interface BotActionMsg extends ControlMsgBase {
    type: "bot";
    heroId: string;
    controlKey: number;
    difficulty: number;
}

export interface LeaveActionMsg extends ControlMsgBase {
    type: "leave";
    heroId: string;
    controlKey: number | null; // control key for the bot that is left behind, or null if should remove player
    split?: boolean;
}

export interface CloseGameMsg extends ControlMsgBase {
    type: "close";
    closeTick: number;
    waitPeriod: number;
}

export interface TeamsMsg extends ControlMsgBase {
    type: "teams";
    teams?: string[][]; // heroIds
}

export interface FinishGameMsg extends ControlMsgBase {
    type: "finish";
}

export interface GameActionMsg extends ActionMsgBase {
    type: "game";
    s: string; // spell ID
    x: number;
    y: number;
    r?: boolean; // is this a button release?
}

export interface SpellsMsg extends ActionMsgBase {
    type: "spells";
    keyBindings: KeyBindings;
}

export interface SyncMsg {
    t: number;
    o: ObjectSyncMsg[];
}

export interface ObjectSyncMsg {
    id: string; // id
    x: number;
    y: number;
    h: number;
}

export interface SplitMsg {
    gameId: string;
    tick: number;
}