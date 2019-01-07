import _ from 'lodash';

import * as React from 'react';
import * as ReactDOM from 'react-dom';
import { Provider } from 'react-redux';

import * as m from '../game/messages.model';
import * as s from './store.model';
import * as w from '../game/world.model';

import * as ai from './core/ai';
import * as audio from './core/audio';
import * as cloud from './core/cloud';
import * as loader from './core/loader';
import * as matches from './core/matches';
import * as notifications from './core/notifications';
import * as options from './options';
import * as pages from './core/pages';
import * as parties from './core/parties';
import * as rankings from './core/rankings';
import * as rooms from './core/rooms';
import * as sockets from './core/sockets';
import * as stats from './core/stats';
import * as storage from './storage';
import * as StoreProvider from './storeProvider';
import * as ticker from './core/ticker';
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
    notifications.attachListener(n => cloud.onNotification(n));
    notifications.attachListener(n => stats.onNotification(n));
    notifications.attachListener(n => rankings.onNotification(n));

    sockets.listeners.onGameMsg = stats.onGameMsg;
    sockets.listeners.onHeroMsg = matches.onHeroMsg;
    sockets.listeners.onPartyMsg = parties.onPartyMsg;
    sockets.listeners.onRoomMsg = rooms.onRoomMsg;
    sockets.listeners.onTickMsg = ticker.onTickMsg;

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
        tracker.setUserId(userId);
        await parties.updatePartyAsync();
        rankings.retrieveUserStatsAsync(userId); // Don't bother awaiting this
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

    await new Promise<void>(resolve => {
        sockets.connect(base, a.authToken, async (socket) => {
            // on connect
            await sockets.connectToServer(query.server)

            if (query.party) {
                await parties.joinPartyAsync(query.party);
            } else {
                await rooms.joinRoomAsync(rooms.DefaultRoom);
                await parties.movePartyAsync(rooms.DefaultRoom); // In case user is so fast they create a party before default room loaded
            }

            await loginAsync();

            try {
                if (query.hash === "#join") {
                    // Return to the home page when we exit
                    StoreProvider.dispatch({ type: "updatePage", page: "" });
                    await matches.joinNewGame({ });
                } else if (query.hash === "#watch" || query.page === "watch") {
                    await matches.watchLiveGame();
                } else if (query.gameId) {
                    matches.joinNewGame({ gameId: query.gameId, observe: true });
                }
            } catch(error) {
                console.error(error)
                socket.disconnect();
                StoreProvider.dispatch({ type: "disconnected" });

                if (query.party || query.server) {
                    // Failed to join party/server, try without server
                    window.location.href = url.getPath({ ...query, party: null, server: null, hash: null });
                }
            }
            resolve();
        },
        async (socket) => {
            // Reconnect
            await sockets.connectToServer(query.server);
            await matches.reconnectToGame();
        },
        async () => {
            // Disconnect
            parties.leavePartyAsync(); // Don't await, it'll probably never return
        });
    });
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