let provider: AdProvider = null;

interface AdProvider {
    init(): Promise<void>;
    commercialBreak(): Promise<void>;
    gameplayStart(): void;
    gameplayStop(): void;
}

class PokiProvider implements AdProvider {
    private sdk: Poki.SDK;
    
    constructor(sdk: Poki.SDK) {
        this.sdk = sdk;
    }

    static create(): Promise<PokiProvider> {
        return new Promise<PokiProvider>((resolve, reject) => {
            const scriptTag = document.createElement("script");
            scriptTag.src = "//game-cdn.poki.com/scripts/v2/poki-sdk.js";
            scriptTag.addEventListener('load', (ev) => {
                const sdk = (window as any).PokiSDK;
                if (sdk) {
                    console.log("PokiSDK loaded");
                    resolve(sdk);
                } else {
                    console.error("Failed to load PokiSDK");
                    reject("PokiSDK failed to load");
                }
            });
            scriptTag.addEventListener('error', () => {
                console.error("Error loading PokiSDK");
                reject("Error loading PokiSDK")
            });
            document.head.appendChild(scriptTag);
        });
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