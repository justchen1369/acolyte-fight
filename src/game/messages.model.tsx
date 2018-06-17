export interface ActionMsg {
    heroId: string;
    actionType: string;
    targetX?: number;
    targetY?: number;
}

export interface TickMsg {
    gameId: string;
    tick: number;
    actions: ActionMsg[];
}

export interface JoinMsg {
}

export interface HeroMsg {
    gameId: string;
    heroId: string;
    numPlayers: number;
    history: TickMsg[];
}