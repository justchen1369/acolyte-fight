import * as s from '../store.model';
import * as w from '../../game/world.model';

export class PokiProvider implements s.OptionsProvider {
    source = "poki";
    noLogin = true;
    noExternalLinks = true;
    noAdvanced = true;

    private sdk: Poki.SDK;
    private loadingFinished: boolean = false;
    
    constructor(sdk: Poki.SDK) {
        this.sdk = sdk;
    }

    async init() {
        const hostname = window.location.hostname;
        if (hostname === "localhost" || hostname === "dev.acolytefight.io") {
            this.sdk.setDebug(true);
        }
    }

    loadingProgress(proportion: number) {
        this.sdk.gameLoadingProgress({ percentageDone: 100 * proportion });

        if (proportion >= 1 && !this.loadingFinished) {
            this.loadingFinished = true;
            this.sdk.gameLoadingFinished();
        }
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
