export namespace ActionType {
    export const Environment = "environment";
    export const Join = "join";
    export const Bot = "bot";
	export const Leave = "leave";
	export const GameAction = "game";
    export const CloseGame = "close";
    export const Finish = "finish";
    export const Spells = "spells";
    export const Sync = "sync";
}

export interface TickMsg {
    g: string;
    t: number;
    a?: ActionMsg[];
    c?: ControlMsg[];
    s?: SyncMsg;
}

export type ActionMsg =
    | GameActionMsg
    | SpellsMsg

export interface ActionMsgBase {
    type: string;
    h: string;
}

export type ControlMsg =
    EnvironmentMsg
    | JoinActionMsg
    | BotActionMsg
    | LeaveActionMsg
    | CloseGameMsg
    | FinishGameMsg

export interface ControlMsgBase {
    type: string;
}

export interface EnvironmentMsg extends ControlMsgBase {
    type: "environment";
    seed: number;
    layoutId?: string;
}

export interface JoinActionMsg extends ControlMsgBase {
    type: "join";
    heroId: string;
    controlKey: number;
    userId: string | null;
    userHash: string | null;
    partyHash?: string;
    playerName: string;
    keyBindings: KeyBindings;
    isMobile: boolean;
}

export interface BotActionMsg extends ControlMsgBase {
    type: "bot";
    heroId: string;
    controlKey: number;
    keyBindings: KeyBindings;
}

export interface LeaveActionMsg extends ControlMsgBase {
    type: "leave";
    heroId: string;
    controlKey: number; // control key for the bot that is left behind
}

export interface CloseGameMsg extends ControlMsgBase {
    type: "close";
    closeTick: number;
    waitPeriod: number;
    numTeams?: number;
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
