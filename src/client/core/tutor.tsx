import _ from 'lodash';
import * as analytics from './analytics';
import * as m from '../../shared/messages.model';
import * as matches from './matches';
import * as s from '../store.model';
import * as storage from '../storage';
import * as w from '../../game/world.model';
import * as StoreProvider from '../storeProvider';

export function needsTutorial(state: s.State): boolean {
    return state.isNewPlayer && state.room.id === m.DefaultRoomId && !state.party;
}

export function tutorialSettings(): matches.JoinParams {
    return {
        locked: m.LockType.Tutorial,
        numBots: 1,
    };
}

export function exitTutorial() {
    StoreProvider.dispatch({ type: "clearNewPlayerFlag" });
    trackTutorialExit(); // Don't await
}

async function trackTutorialExit() {
    const numGames = await storage.getNumGames() || 0;
    analytics.send("exitTutorial", numGames);
}