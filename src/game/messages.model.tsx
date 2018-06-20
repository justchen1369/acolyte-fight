import * as c from './constants.model';

export interface ActionMsg {
    heroId: string;
    actionType: string;
    targetX?: number;
    targetY?: number;
    playerName?: string;
    keyBindings?: c.KeyBindings;
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
    numPlayers: number;
    history: TickMsg[];
}