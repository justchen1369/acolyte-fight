import * as audio from './audio';
import * as w from '../../game/world.model';
import { Sounds } from '../../game/sounds';

export function onNotification(notifs: w.Notification[]) {
    if (notifs.some(n => n.type === "text")) {
        audio.playUnattached("message", Sounds);
    }
}