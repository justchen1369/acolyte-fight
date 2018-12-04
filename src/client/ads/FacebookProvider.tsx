import * as s from '../store.model';
import * as w from '../../game/world.model';
import * as util from './util';

export class FacebookProvider implements s.AdProvider {
    name = "fb";
    linkedAccount = true;
    noExternalLinks = true;
    noScrolling = true;
    noMenu = true;

    static async create(): Promise<FacebookProvider> {
        return new FacebookProvider();
    }

    async init(): Promise<void> {
    }

    gameLoaded() { }

    async commercialBreak() { }

    gameplayStart() { }
    gameplayStop() { }

    onNotification(notifications: w.Notification[]) { }
}
