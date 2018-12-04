import * as notifications from './notifications';
import * as s from '../store.model';
import * as StoreProvider from '../storeProvider';
import { FacebookProvider } from '../ads/FacebookProvider';
import { NullProvider } from '../ads/NullProvider';
import { PokiProvider } from '../ads/PokiProvider';

let provider: s.AdProvider = new NullProvider();

export async function init(source: string) {
    if (source === "poki") {
        console.log("Initializing PokiSDK...");
        provider = await PokiProvider.create();
    }

    if (source === "fb") {
        console.log("Initializing Facebook Instant...");
        provider = await FacebookProvider.create();
    }
    
    if (provider) {
        await provider.init();
        StoreProvider.dispatch({ type: "updateAds", ads: provider.name });
        notifications.attachListener((notifications) => provider.onNotification(notifications));
    }
}

export function getProvider() {
    return provider;
}