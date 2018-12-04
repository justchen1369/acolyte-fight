import * as s from '../store.model';
import * as w from '../../game/world.model';
import * as util from './util';

export class PokiProvider implements s.AdProvider {
    private sdk: Poki.SDK;
    
    constructor(sdk: Poki.SDK) {
        this.sdk = sdk;
    }

    static async create(): Promise<PokiProvider> {
        await util.loadScript("//game-cdn.poki.com/scripts/v2/poki-sdk.js");

        const sdk: Poki.SDK = (window as any).PokiSDK;
        if (sdk) {
            return new PokiProvider(sdk);
        } else {
            throw "PokiSDK failed to load";
        }
    }

    async init() {
        await this.sdk.init()
        console.log("PokiSDK initialized");

        const hostname = window.location.hostname;
        if (hostname === "localhost" || hostname === "dev.acolytefight.io") {
            this.sdk.setDebug(true);
        }

        this.sdk.gameLoadingStart();
    }

    gameLoaded() {
        this.sdk.gameLoadingProgress({ percentageDone: 100.0 });
        this.sdk.gameLoadingFinished();
    }

    async commercialBreak() {
        this.sdk.commercialBreak();
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
