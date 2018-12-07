import * as s from './store.model';
import * as StoreProvider from './storeProvider';
import { FacebookProvider } from './options/FacebookProvider';
import { NullProvider } from './options/NullProvider';
import { PokiProvider } from './options/PokiProvider';
import { KongregateProvider } from './options/KongregateProvider';

let provider: s.OptionsProvider = new NullProvider();

export async function init() {
    const poki: Poki.SDK = (window as any).PokiSDK;
    if (poki) {
        provider = new PokiProvider(poki);
    }

    const kongregate: Kongregate.SDK = (window as any).kongregate;
    if (kongregate) {
        provider = new KongregateProvider(kongregate);
    }

    const facebook: FBInstant.SDK = (window as any).FBInstant;
    if (facebook) {
        provider = new FacebookProvider(facebook);
    }
    
    if (provider) {
        console.log("Initializing ads...", provider.source);
        StoreProvider.dispatch({ type: "updateAds", ads: provider.source });

        await provider.init();
    }
}

export function getProvider() {
    return provider;
}