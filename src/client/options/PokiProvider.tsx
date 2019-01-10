import * as s from '../store.model';
import * as w from '../../game/world.model';

export class PokiProvider implements s.OptionsProvider {
    source = "poki";
    noLogin = true;
    noExternalLinks = true;
    noAdvanced = true;
    noDiscordAd = false;

    private sdk: Poki.SDK;
    private inGame = false;
    
    constructor(sdk: Poki.SDK) {
        this.sdk = sdk;
    }

    async init() {
        const hostname = window.location.hostname;
        if (hostname === "localhost" || hostname === "dev.acolytefight.io") {
            this.sdk.setDebug(true);
        }

        this.sdk.gameLoadingProgress({ percentageDone: 100 });
        this.sdk.gameLoadingFinished();
    }

    async commercialBreak() {
        await this.sdk.commercialBreak();
    }

    private gameplayStart() {
        if (!this.inGame) {
            this.inGame = true;
            this.sdk.gameplayStart();
        }
    }

    private gameplayStop() {
        if (this.inGame) {
            this.inGame = false;
            this.sdk.gameplayStop();
        }
    }

    onNotification(notifications: w.Notification[]) {
        for (const n of notifications) {
            if (n.type === "new") {
                this.gameplayStart();
            }
            if (n.type === "win"
                || (n.type === "kill" && n.killed.heroId === n.myHeroId)
                || n.type === "exit") {
                this.gameplayStop();
            }

            if (n.type === "win" && n.winner.heroId === n.myHeroId) {
                this.sdk.happyTime();
            }
        }
    }
}
