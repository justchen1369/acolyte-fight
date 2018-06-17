export interface ActionMsg {
    heroId: string;
    actionType: string;
    targetX?: number;
    targetY?: number;
    playerName?: string;
}

export interface TickMsg {
    gameId: string;
    tick: number;
    actions: ActionMsg[];
}

export interface JoinMsg {
    name: string;
}

export interface HeroMsg {
    gameId: string;
    heroId: string;
    numPlayers: number;
    history: TickMsg[];
}