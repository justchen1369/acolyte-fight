import _ from 'lodash';
import * as w from '../../game/world.model';
import * as StoreProvider from '../storeProvider';

let onTutorialCompleted = () => { };

export function attachTutorialCompletedListener(callback: () => void) {
    onTutorialCompleted = callback;
}

export function onNotification(notifs: w.Notification[]) {
    if (notifs.some(n => n.type === "win")) {
        const state = StoreProvider.getState();
        const world = state.world;
        if (state.isNewPlayer && world.winner && world.ui.myHeroId && world.winner === world.ui.myHeroId) {
            StoreProvider.dispatch({ type: "clearNewPlayerFlag" });
            onTutorialCompleted();
        }
    }
}