import _ from 'lodash';
import * as analytics from './analytics';
import * as storage from '../storage';
import * as w from '../../game/world.model';
import * as StoreProvider from '../storeProvider';

export function onNotification(notifs: w.Notification[]) {
    if (notifs.some(n => n.type === "win")) {
        const state = StoreProvider.getState();
        const world = state.world;
        if (state.isNewPlayer && world.winner && world.ui.myHeroId && world.winner === world.ui.myHeroId) {
            StoreProvider.dispatch({ type: "clearNewPlayerFlag" });
            trackTutorialExit(true); // Don't await
        }
    }
}

export function exitTutorial() {
    StoreProvider.dispatch({ type: "clearNewPlayerFlag" });
    trackTutorialExit(false); // Don't await
}

async function trackTutorialExit(completed: boolean) {
    const numGames = await storage.getNumGames();
    if (completed) {
        analytics.send("exitTutorial", numGames);
    } else {
        analytics.send("completedTutorial", numGames);
    }
}