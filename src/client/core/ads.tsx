import * as notifications from './notifications';
import * as w from '../../game/world.model';
import * as StoreProvider from '../storeProvider';

let provider: AdProvider = null;

interface AdProvider {
    init(): Promise<void>;
    gameLoaded(): void;
    commercialBreak(): Promise<void>;
    gameplayStart(): void;
    gameplayStop(): void;
    onNotification(notifications: w.Notification[]): void;
}

function loadScript(src: string) {
    return new Promise<PokiProvider>((resolve, reject) => {
        const scriptTag = document.createElement("script");
        scriptTag.src = src;
        scriptTag.addEventListener('load', (ev) => {
            resolve();
        });
        scriptTag.addEventListener('error', () => {
            console.error("Error loading script", src);
            reject();
        });
        document.head.appendChild(scriptTag);
    });
}

class PokiProvider implements AdProvider {
    private sdk: Poki.SDK;
    
    constructor(sdk: Poki.SDK) {
        this.sdk = sdk;
    }

    static async create(): Promise<PokiProvider> {
        await loadScript("//game-cdn.poki.com/scripts/v2/poki-sdk.js");

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

export async function init(source: string) {
    if (source === "poki") {
        console.log("Initializing PokiSDK...");
        StoreProvider.dispatch({ type: "updateAds", ads: "poki" });

        provider = await PokiProvider.create();
    }
    
    if (provider) {
        await provider.init();
        notifications.attachListener((notifications) => provider.onNotification(notifications));
    }
}

export function gameLoaded() {
    if (provider) {
        console.log("Game loaded.");
        provider.gameLoaded();
    }
}

export async function commercialBreak(): Promise<void> {
    if (provider) {
        console.log("Commercial break starting...");
        await provider.commercialBreak();
        console.log("Commercial break finished.");
    }
}

export function gameplayStart() {
    if (provider) {
        console.log("Gameplay started.");
        provider.gameplayStart();
    }
}

export function gameplayStop() {
    if (provider) {
        console.log("Gameplay stopped.");
        provider.gameplayStop();
    }
}