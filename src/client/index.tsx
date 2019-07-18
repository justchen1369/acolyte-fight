import _ from 'lodash';

import * as React from 'react';
import * as ReactDOM from 'react-dom';
import { Provider } from 'react-redux';

import * as m from '../game/messages.model';
import * as s from './store.model';
import * as w from '../game/world.model';

import * as ai from './core/ai';
import * as audio from './core/audio';
import * as audioCues from './core/audioCues';
import * as cloud from './core/cloud';
import * as loader from './core/loader';
import * as matches from './core/matches';
import * as notifications from './core/notifications';
import * as online from './core/online';
import * as options from './options';
import * as pages from './core/pages';
import * as parties from './core/parties';
import * as rankings from './core/rankings';
import * as replays from './core/replays';
import * as rooms from './core/rooms';
import * as seen from './core/seen';
import * as sockets from './core/sockets';
import * as stats from './core/stats';
import * as storage from './storage';
import * as StoreProvider from './storeProvider';
import * as ticker from './core/ticker';
import * as tutor from './core/tutor';
import * as tracker from './core/tracker';
import * as url from './url';
import * as userAgent from './core/userAgent';

import { base } from './url';
import Root from './ui/root';

export async function initialize() {
    await loadDependencies();

    StoreProvider.init();
    audio.init();

    await options.init();

    notifications.attachListener(n => options.getProvider().onNotification(n));
    notifications.attachListener(n => audioCues.onNotification(n));
    notifications.attachListener(n => cloud.onNotification(n));
    notifications.attachListener(n => stats.onNotification(n));
    notifications.attachListener(n => rankings.onNotification(n));
    notifications.attachListener(n => tutor.onNotification(n));

    sockets.listeners.onGameMsg = stats.onGameMsg;
    sockets.listeners.onHeroMsg = matches.onHeroMsg;
    sockets.listeners.onPartyMsg = parties.onPartyMsg;
    sockets.listeners.onRoomMsg = rooms.onRoomMsg;
    sockets.listeners.onTickMsg = ticker.onTickMsg;
    sockets.listeners.onOnlineMsg = online.onOnlineMsg;
    sockets.listeners.onReconnect = onReconnect;
    sockets.listeners.onDisconnect = onDisconnect;

    window.onpopstate = (ev) => {
        const elems: s.PathElements = ev.state;
        if (elems) {
            pages.go(elems);
        }
    }

    ai.startTimers();
    notifications.startTimers();

    loader.setLoadedPromise(start());

    render();

    seen.loadSeenVersion(); // Don't bother awaiting
    storage.cleanupGameStats();
}

async function loadDependencies() {
    await loadCSS(`${base}/static/main.css`);
}

function loadCSS(href: string): Promise<void> {
    return new Promise((resolve, reject) => {
        const linkTag = document.createElement("link");
        linkTag.rel = "stylesheet";
        linkTag.href = href;
        linkTag.addEventListener('load', (ev) => {
            resolve();
        });
        document.head.appendChild(linkTag);
    });
}

async function loginAsync() {
    const userId = await cloud.downloadSettings();
    if (userId) {
        StoreProvider.dispatch({ type: "clearNewPlayerFlag" }); // This user is not new
        tracker.setUserId(userId);
        await parties.updatePartyAsync();
    }
}

async function start() {
    const a = options.getProvider();

    const query = url.parseLocation(window.location);
    console.log("Initial location", query);

    if (query.page === a.source) {
        query.page = ""; // Handle ads being initiated by path name
    }

    let current: s.PathElements = {
        ...query,
        party: null, // Remove the party ID from the URL so that people can't stream snipe their way into the party
        server: null,
        hash: null,
    };
    StoreProvider.dispatch({ type: "updateUrl", current });

    if (a.playerName) {
        // Load the player name from the ad account system
        StoreProvider.dispatch({ type: "updatePlayerName", playerName: a.playerName });
    }

    try {
        await sockets.connect(base, a.authToken);

        if (query.party) {
            await parties.joinPartyAsync(query.party);
        } else {
            await rooms.joinRoomAsync(rooms.DefaultRoom);
        }
    } catch(error) {
        console.error(error)
    }

    try {
        await loginAsync();
    } catch (error) {
        console.error(error);
    }

    try {
        if (query.hash === "#join" || query.page === "join") {
            // Return to the home page when we exit
            StoreProvider.dispatch({ type: "updatePage", page: "" });
            await matches.joinNewGame({});
        } else if (query.hash === "#watch" || query.page === "watch") {
            await matches.watchLiveGame();
        } else if (query.gameId) {
            await replays.watch(query.gameId);
        }
    } catch (error) {
        console.error(error);
    }
}

async function onReconnect(socket: SocketIOClient.Socket) {
    await matches.reconnectToGame();
    online.rejoin();
}

async function onDisconnect() {
    parties.leavePartyAsync(); // Don't await, it'll probably never return
}

function render() {
    ReactDOM.render(
        <Provider store={StoreProvider.getStore()}>
            <Root />
        </Provider>,
        document.getElementById("root"));
}

(window as any).acolyteInitialize = initialize;
(window as any).acolyteGo = pages.changePage;