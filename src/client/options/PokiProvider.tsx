import * as s from '../store.model';
import * as w from '../../game/world.model';

export class PokiProvider implements s.OptionsProvider {
    source = "poki";
    noLogin = true;
    noExternalLinks = true;
    noAdvanced = true;

    private sdk: Poki.SDK;
    
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

    gameplayStart() {
        this.sdk.gameplayStart();
    }

    gameplayStop() {
        this.sdk.gameplayStop();
    }

    onNotification(notifications: w.Notification[]) {
        for (const n of notifications) {
            if (n.type === "win" && n.winner.heroId === n.myHeroId) {
                this.sdk.happyTime();
            }
        }
    }
}
