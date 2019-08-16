import * as o from './options.model';
import * as w from '../../game/world.model';

export class NullProvider implements o.OptionsProvider {
    async init() { }

    loadingProgress() { }

    async commercialBreak() { }

    onNotification(notifications: w.Notification[]) { }
}

