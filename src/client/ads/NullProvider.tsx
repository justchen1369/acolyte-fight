import * as s from '../store.model';
import * as w from '../../game/world.model';

export class NullProvider implements s.AdProvider {
    async init(): Promise<void> {
    }

    gameLoaded() { }

    async commercialBreak() { }

    gameplayStart() { }
    gameplayStop() { }

    onNotification(notifications: w.Notification[]) { }
}

