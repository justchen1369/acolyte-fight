import _ from 'lodash';
import moment from 'moment';
import * as d from '../stats.model';
import * as m from '../../shared/messages.model';
import * as s from '../store.model';
import * as w from '../../game/world.model';
import * as constants from '../../game/constants';
import * as StoreProvider from '../storeProvider';

export function onNotification(notifs: w.Notification[]) {
    if (notifs.some(n => n.type === "win")) {
        const state = StoreProvider.getState();
        const world = state.world;
        if (state.isNewPlayer && world.winner && world.ui.myHeroId && world.winner === world.ui.myHeroId) {
            StoreProvider.dispatch({ type: "clearNewPlayerFlag" });
        }
    }
}