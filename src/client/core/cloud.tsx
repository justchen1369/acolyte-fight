import moment from 'moment';
import msgpack from 'msgpack-lite';
import * as constants from '../../game/constants';
import * as d from '../stats.model';
import * as m from '../../game/messages.model';
import * as w from '../../game/world.model';
import * as credentials from './credentials';
import * as notifications from './notifications';
import * as stats from './stats';
import * as storage from '../storage';
import * as StoreProvider from '../storeProvider';
import { base } from '../url';

export function attachListener() {
    notifications.attachListener(notifs => onNotification(notifs));
}

function onNotification(notifs: w.Notification[]) {
    if (notifs.some(n => n.type === "win")) {
        loginAnonymouslyIfNecessary(); // Don't care that this is async
    }
}

export async function loginAnonymouslyIfNecessary(): Promise<void> {
    const state = StoreProvider.getState();
    if (state.userId) {
        // Already logged in
        return;
    }

    const numGames = await storage.getNumGames();
    if (numGames >= constants.Placements.VerificationGames) {
        downloadSettings();
    }
}

export async function downloadSettings(): Promise<void> {
    const numGames = await storage.getNumGames();

    let url = `${base}/api/settings?cachebuster=${Date.now()}`;
    if (numGames >= constants.Placements.VerificationGames) {
        url += "&create=1";
    }

    const res = await fetch(url, {
        headers: credentials.headers(),
        credentials: "same-origin",
        cache: "no-store",
    });
    if (res.status === 200) {
        const json: m.GetUserSettingsResponse = await res.json();

        let upload = false;
        StoreProvider.dispatch({ type: "updateUserId", userId: json.userId, loggedIn: json.loggedIn });
        if (json.name && json.name.length > 0) {
            StoreProvider.dispatch({ type: "updatePlayerName", playerName: json.name });
        } else {
            upload = true;
        }

        if (json.buttons) {
            StoreProvider.dispatch({ type: "updateKeyBindings", keyBindings: json.buttons });
        } else {
            upload = true;
        }

        if (json.rebindings) {
            StoreProvider.dispatch({ type: "updateRebindings", rebindings: json.rebindings });
        } else {
            upload = true;
        }

        if (json.options) {
            StoreProvider.dispatch({ type: "updateOptions", options: json.options });
        } else {
            upload = true;
        }

        console.log(`Logged in as ${json.userId} - ${json.name}`);

        if (upload) {
            await uploadSettings();
        }
    } else {
        // This user is not logged in
        StoreProvider.dispatch({ type: "updateUserId", userId: null, loggedIn: false });
    }
}

export async function uploadSettings(): Promise<void> {
    const state = StoreProvider.getState();
    if (!state.userId) {
        // Can't upload if no user ID
        return;
    }

    const input: m.UpdateUserSettingsRequest = {
        name: state.playerName,
        buttons: state.keyBindings,
        rebindings: state.rebindings,
        options: state.options,
    };

    const res = await fetch(`${base}/api/settings`, {
        credentials: "same-origin",
        method: "POST",
        headers: {
            ...credentials.headers(),
            'Content-Type': 'application/json',
        },
        body: JSON.stringify(input),
    });
    if (res.status === 200) {
        console.log(`Updated cloud settings - name=${state.playerName}`);
    } else {
        console.error(`Failed to update cloud: ${res.status} - ${await res.text()}`);
    }
}

export async function downloadGameStats(): Promise<void> {
    const state = StoreProvider.getState();
    const userId = state.userId;

    if (!(state.loggedIn && userId)) {
        // Can't download if not logged in
        return;
    }

    const allGameStats = new Array<d.GameStats>();
    const until = await storage.getStatsLoadedUntil() || moment.unix(0);
    const limit = 10;
    let newestLoaded = until;
    let oldestLoaded = moment();
    while (allGameStats.length < constants.MaxGamesToKeep) {
        const res = await fetch(`${base}/api/gameStats?after=${oldestLoaded.unix()}&before=${until.unix()}&limit=${limit}`, {
            headers: { ...credentials.headers() },
            credentials: "same-origin",
        });
        const json: m.GetGameStatsResponse = msgpack.decode(new Uint8Array(await res.arrayBuffer()));

        for (const gameStatsMsg of json.stats) {
            const gameStats = stats.messageToGameStats(gameStatsMsg, userId);
            allGameStats.push(gameStats);
            await storage.saveGameStats(gameStats);

            const timestamp = moment(gameStats.timestamp);
            if (timestamp.isBefore(oldestLoaded)) {
                oldestLoaded = timestamp;
            }
            if (timestamp.isAfter(newestLoaded)) {
                newestLoaded = timestamp;
            }
        }

        if (json.stats.length === 0 || json.stats.length < limit) {
            // Reached the end
            break;
        }
    }
    await storage.setStatsLoadedUntil(newestLoaded);
    StoreProvider.dispatch({ type: "updateGameStats", allGameStats });
}

export async function logout(): Promise<void> {
    await fetch(`${base}/api/logout`, {
        headers: { ...credentials.headers() },
        credentials: "same-origin",
    });
    StoreProvider.dispatch({ type: "updateUserId", userId: null, loggedIn: false });
    storage.resetNumGames();
}