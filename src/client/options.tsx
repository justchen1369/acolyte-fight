import * as o from './options/options.model';
import { FacebookProvider } from './options/FacebookProvider';
import { NullProvider } from './options/NullProvider';
import { PokiProvider } from './options/PokiProvider';
import { KongregateProvider } from './options/KongregateProvider';

let provider: o.OptionsProvider = new NullProvider();

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
        await provider.init();
    }
}

export function getProvider() {
    return provider;
}