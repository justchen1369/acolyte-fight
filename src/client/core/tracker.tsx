import * as analytics from './analytics';
import * as storage from '../storage';

export async function onTutorialCompleted() {
    const numGames = await storage.getNumGames();
    analytics.send("completedTutorial", numGames);
}