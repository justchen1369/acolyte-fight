import * as s from '../store.model';
import * as w from '../../game/world.model';

export class NullProvider implements s.OptionsProvider {
    init() {
    }

    loadingProgress() { }

    async commercialBreak() { }

    gameplayStart() { }
    gameplayStop() { }

    onNotification(notifications: w.Notification[]) { }
}

