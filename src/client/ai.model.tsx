import * as w from "../game/world.model";

export type Message =
    ActionMessage
    | WorldMessage;

export interface ActionMessage {
    type: "action";
    gameId: string;
    heroId: string;
    action: w.Action;
}

export interface WorldMessage {
    type: "world";
    gameId: string;
    heroId: string;
    state: WorldContract;
    cooldowns: CooldownsContract;
}