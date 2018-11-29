import * as StoreProvider from '../storeProvider';

let provider: AdProvider = null;

interface AdProvider {
    init(): Promise<void>;
    commercialBreak(): Promise<void>;
    gameplayStart(): void;
    gameplayStop(): void;
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

        const sdk = (window as any).PokiSDK;
        if (sdk) {
            return sdk;
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
    }

    async commercialBreak() {
        this.sdk.commercialBreak();
    }

    async gameplayStart() {
        this.sdk.gameplayStart();
    }

    async gameplayStop() {
        this.sdk.gameplayStop();
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
        provider.gameplayStart();
    }
}

export function gameplayStop() {
    if (provider) {
        provider.gameplayStop();
    }
}