import * as C from './contract.model';
export * from './contract.model';

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
    state: C.WorldContract;
    cooldowns: C.CooldownsRemainingContract;
}

export interface ResponseMsgContract {
    type: "response";
    tick: number;
    output: C.OutputContract;
}