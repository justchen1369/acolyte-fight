import * as C from './contract.model';
export * from './contract.model';

export type MsgContract =
	InitMsgContract
    | StateMsgContract
	| ActionMsgContract

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

export interface ActionMsgContract {
    type: "action";
    tick: number;
    action: C.ActionContract;
}