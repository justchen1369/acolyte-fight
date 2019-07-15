import * as storage from '../storage';
import * as StoreProvider from '../storeProvider';

export async function loadSeenVersion() {
    const seen = await storage.getSeenVersion();
    StoreProvider.dispatch({ type: "seen", seen });
}

export async function saveSeenVersion(seen: number) {
    StoreProvider.dispatch({ type: "seen", seen });
    await storage.setSeenVersion(seen);
}