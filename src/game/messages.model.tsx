import * as c from './model';

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