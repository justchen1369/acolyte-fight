declare namespace Poki {
    interface SDK {
        init(): Promise<void>;
        gameLoadingStart(): void;
        gameLoadingProgress(progress: Progress): void;
        gameLoadingFinished(): void;
        setDebug(state: boolean): void;
        commercialBreak(): Promise<void>;
        gameplayStart(): void;
        gameplayStop(): void;
        happyTime(): void;
    }

    interface Progress {
        percentageDone: number;
    }
}