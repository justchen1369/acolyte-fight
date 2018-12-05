import * as notifications from './notifications';
import * as s from '../store.model';
import * as StoreProvider from '../storeProvider';
import { FacebookProvider } from '../ads/FacebookProvider';
import { NullProvider } from '../ads/NullProvider';
import { PokiProvider } from '../ads/PokiProvider';

let provider: s.AdProvider = new NullProvider();

export async function init() {
    const poki: Poki.SDK = (window as any).PokiSDK;
    if (poki) {
        provider = new PokiProvider(poki);
    }
    
    if (provider) {
        console.log("Initializing ads...", provider.name);
        StoreProvider.dispatch({ type: "updateAds", ads: provider.name });

        await provider.init();
        notifications.attachListener((notifications) => provider.onNotification(notifications));
    }
}

export function getProvider() {
    return provider;
}