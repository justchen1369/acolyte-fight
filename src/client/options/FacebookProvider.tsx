import * as s from '../store.model';
import * as w from '../../game/world.model';

export class FacebookProvider implements s.OptionsProvider {
    source = "fb";
    noLogin = true;
    noExternalLinks = true;
    noScrolling = true;
    noMenu = true;
    noAdvanced = true;

    static async create(): Promise<FacebookProvider> {
        return new FacebookProvider();
    }

    async init() { }

    loadingProgress() { }

    async commercialBreak() { }

    gameplayStart() { }
    gameplayStop() { }

    onNotification(notifications: w.Notification[]) { }
}
