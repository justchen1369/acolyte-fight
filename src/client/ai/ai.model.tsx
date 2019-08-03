import * as C from './ai.contracts';
export * from './ai.contracts';

export type MsgContract =
	InitMsgContract
    | StateMsgContract
	| ResponseMsgContract

export interface InitMsgContract {
	type: "init";
    settings: AcolyteFightSettings;
    code: string;
}

export interface StateMsgContract {
	type: "state";
	heroId: string;
    state: C.World;
    cooldowns: C.CooldownsRemaining;
}

export interface ResponseMsgContract {
    type: "response";
    tick: number;
    output: C.OutputContract;
}