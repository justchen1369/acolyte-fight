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
            exitTutorial(true);
        }
    }
}

export function needsTutorial(state: s.State): boolean {
    return state.tutorialLevel && state.room.id === m.DefaultRoomId && !state.party;
}

export function tutorialSettings(): matches.JoinParams {
    return {
        locked: m.LockType.Tutorial,
        numBots: 1,
    };
}

export function exitTutorial(completed: boolean = false) {
    StoreProvider.dispatch({ type: "tutorial", tutorialLevel: null });
    trackTutorialExit(completed); // Don't await
}

async function trackTutorialExit(completed: boolean) {
    const numGames = await storage.getNumGames();
    if (completed) {
        analytics.send("completedTutorial", numGames);	
    } else {	
        analytics.send("exitTutorial", numGames);
    }
}