import _ from 'lodash';
import * as analytics from './analytics';
import * as m from '../../shared/messages.model';
import * as matches from './matches';
import * as s from '../store.model';
import * as storage from '../storage';
import * as w from '../../game/world.model';
import * as StoreProvider from '../storeProvider';

export function onNotification(notifs: w.Notification[]) {
    if (notifs.some(n => n.type === "win")) {
        const state = StoreProvider.getState();
        const world = state.world;
        if (state.tutorialLevel && world.winner && world.ui.myHeroId && world.winner === world.ui.myHeroId) {
            StoreProvider.dispatch({ type: "tutorial", tutorialLevel: state.tutorialLevel + 1 });
        }
    }
}

export function needsTutorial(state: s.State): boolean {
    return state.tutorialLevel && state.room.id === m.DefaultRoomId && !state.party;
}

export function tutorialSettings(): matches.JoinParams {
    const state = StoreProvider.getState();
    return {
        locked: m.LockType.Tutorial,
        numBots: Math.min(3, state.tutorialLevel || 1),
    };
}

export function exitTutorial() {
    StoreProvider.dispatch({ type: "tutorial", tutorialLevel: null });
    trackTutorialExit(); // Don't await
}

async function trackTutorialExit() {
    const numGames = await storage.getNumGames();
    analytics.send("exitTutorial", numGames);
}