import * as notifications from './notifications';
import * as s from '../store.model';
import * as StoreProvider from '../storeProvider';
import { NullProvider } from '../ads/NullProvider';
import { PokiProvider } from '../ads/PokiProvider';

let provider: s.AdProvider = new NullProvider();

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

export function getProvider() {
    return provider;
}