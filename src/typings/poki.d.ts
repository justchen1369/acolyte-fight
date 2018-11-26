declare namespace Poki {
    interface SDK {
        init(): Promise<void>;
        setDebug(state: boolean): void;
        commercialBreak(): Promise<void>;
        gameplayStart(): void;
        gameplayStop(): void;
    }
}