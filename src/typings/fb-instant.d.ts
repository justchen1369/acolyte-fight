declare namespace FBInstant {
    interface SDK {
        initializeAsync(): Promise<void>;
        setLoadingProgress(percentage: number): void;
        startGameAsync(): Promise<void>;

        player: Player;
    }

    interface Player {
        getID(): string;
        getName(): string;
        getSignedPlayerInfoAsync(requestPayload?: string): Promise<SignedPlayerInfo>;
    }

    interface SignedPlayerInfo {
        getPlayerID(): string;
        getSignature(): string;
    }
}